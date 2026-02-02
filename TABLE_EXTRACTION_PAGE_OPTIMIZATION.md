# 表格提取页码优化

## 优化目标

通过在步骤2添加页码范围信息，让步骤3只提取推荐表格所在的页面内容，而不是搜索全部content，提升效率和准确性。

## 修改内容

### 步骤2：提取表格概要 (extract_tablesummary_task)

#### 修改前
Prompt输出格式：
```
表格1：
表名：退保價值表
行数：100行
字段：保单年度终结, 保费, 现金价值
```

#### 修改后
Prompt输出格式（新增页码范围）：
```
表格1：
表名：退保價值表
页码范围：第5-7页          ← 🆕 新增
行数：100行
字段：保单年度终结, 保费, 现金价值
```

**修改位置**: `api/tasks.py` 第1273-1333行

**关键改动**:
1. 任务要求中新增：
   ```python
   - **页码范围**（该表格出现在哪些页面，例如：第5-7页，或第8页）
   ```

2. 输出格式示例中新增：
   ```python
   页码范围：第8-10页
   ```

3. 特别注意中新增：
   ```python
   2. 必须标注每个表格的页码范围（从OCR的分页标记中识别）
   ```

---

### 步骤3：提取退保价值表 (extract_table_from_content_based_on_summary)

#### 修改前
直接使用全部 `content` 字段：
```python
def extract_table_from_content_based_on_summary(content, tablesummary):
    # ...
    prompt = f"""
    **OCR识别内容：**
    {content}  ← 全部content（可能很大）
    """
```

#### 修改后
分3步处理，只使用推荐表格的页面：

```python
def extract_table_from_content_based_on_summary(content, tablesummary):
    """
    优化逻辑：
    1. 从tablesummary中解析推荐表格的页码范围
    2. 只提取对应页面的content（而不是全部content）
    3. 将页面子集发送给Gemini API进行表格提取
    """

    # 步骤1：从tablesummary提取页码范围
    page_match = re.search(r'页码范围[：:]\s*第(\d+)[-到]?(\d+)?页', recommended_section)
    if page_match:
        start_page = int(page_match.group(1))
        end_page = int(page_match.group(2)) if page_match.group(2) else start_page
        page_range = (start_page, end_page)
        # 例如：page_range = (5, 7)

    # 步骤2：根据页码范围提取对应页面
    pages = re.split(r'==Start of OCR for page (\d+)==', content)
    extracted_pages = []
    for i in range(1, len(pages), 2):
        page_num = int(pages[i])
        if page_range[0] <= page_num <= page_range[1]:
            extracted_pages.append(f"==Start of OCR for page {page_num}==\n{page_content}")

    content_subset = '\n'.join(extracted_pages)
    # 只包含第5-7页的内容

    # 步骤3：使用content_subset调用API
    prompt = f"""
    **OCR识别内容（已根据页码范围筛选）：**
    {content_subset}  ← 只包含推荐表格的页面
    """
```

**修改位置**: `api/tasks.py` 第737-870行

---

## 优化效果对比

### 修改前
```
步骤2 → tablesummary (无页码)
    ↓
步骤3 → 搜索全部content (例如50页，200KB)
    ↓
Gemini API 处理全部内容
```

### 修改后
```
步骤2 → tablesummary (包含推荐表格：第5-7页)
    ↓
步骤3 → 只提取第5-7页的content (3页，12KB)
    ↓
Gemini API 只处理相关页面 ✅ 更快更准确
```

## 优势分析

### 1. 性能提升
- **Token使用量减少**: 只发送相关页面（减少80-90%）
- **API响应速度**: 更少的输入 = 更快的响应
- **成本降低**: Token费用大幅减少

### 2. 准确性提升
- **减少干扰**: 不会被其他页面的表格干扰
- **精准定位**: 直接在推荐表格所在页面查找
- **错误率降低**: 减少选错表格的可能性

### 3. 可维护性
- **清晰的逻辑**: 分步骤处理，易于理解
- **易于调试**: 可以看到提取了哪些页面
- **日志完整**: 记录页码范围和content长度变化

---

## 数据流向

```
┌─────────────────────────────────────────────┐
│ 步骤0: OCR识别                               │
│ PDF → content (全部50页)                     │
└─────────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────┐
│ 步骤2: 提取表格概要                          │
│ 分析全部content，输出：                      │
│ - 表格1: 身故赔偿 (第3页)                   │
│ - 表格2: 退保价值 (第5-7页) ✅推荐          │
│ - 表格3: 悲观情景 (第10页)                  │
└─────────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────┐
│ 步骤3: 提取退保价值表                        │
│                                              │
│ 1️⃣ 解析tablesummary                        │
│    找到推荐表格的页码范围: 5-7页            │
│                                              │
│ 2️⃣ 提取对应页面                            │
│    从content中提取第5-7页                    │
│    content: 200KB → content_subset: 12KB   │
│                                              │
│ 3️⃣ 调用Gemini API                          │
│    输入: content_subset (12KB) ✅           │
│    不是: content (200KB) ❌                 │
│    输出: table1 (JSON)                      │
└─────────────────────────────────────────────┘
```

---

## 示例对比

### 场景：50页PDF，推荐表格在第10-12页

#### 修改前
```python
# API请求
content_length = 250,000 字符  # 全部50页
api_tokens = ~62,500 tokens    # 输入token
response_time = ~15秒
cost = $0.15
```

#### 修改后
```python
# API请求
content_subset_length = 15,000 字符  # 只有第10-12页
api_tokens = ~3,750 tokens           # 输入token
response_time = ~3秒
cost = $0.01

# 性能提升
Token减少: 94% ✅
速度提升: 5倍 ✅
成本降低: 93% ✅
```

---

## 日志输出示例

### 步骤3新增日志

```
🔍 步骤1：从tablesummary提取推荐表格的页码范围
   ✅ 找到推荐表格的页码范围: 第8-10页

🔍 步骤2：提取第8-10页的content
   ✅ 成功提取 3 个页面，内容长度: 18234 字符（原长度: 185672）

🔍 步骤3：调用Gemini API提取表格数据
   使用content子集长度: 18234 字符
   表格分析结果长度: 1523 字符
```

---

## 降级策略

如果无法提取页码范围，系统会自动降级到使用全部content：

```python
if page_range:
    # 提取指定页面
    content_subset = extract_pages(content, page_range)
else:
    # 降级：使用全部content
    logger.warning("⚠️ 未找到页码范围信息，将使用全部content")
    content_subset = content
```

这确保了向后兼容性和系统稳定性。

---

## 测试验证

### 测试步骤

1. **上传新文档**
   - 步骤2会在tablesummary中输出页码范围
   - 检查日志确认页码格式正确

2. **查看步骤3日志**
   - 确认页码范围提取成功
   - 确认content_subset长度远小于原content
   - 确认table1数据正确提取

3. **性能对比**
   - 记录修改前后的处理时间
   - 记录Token使用量差异
   - 验证准确性没有下降

---

## 注意事项

### 1. 页码格式兼容性
支持多种格式：
- `页码范围：第5-7页` ✅
- `页码范围:第5-7页` ✅
- `页码范围：第5到7页` ✅
- `页码范围：第5页` ✅（单页）

### 2. 跨页表格处理
- 如果表格跨3页（5-7页），会提取这3页的全部内容
- Gemini API会自动合并跨页数据
- 不需要手动处理表格拼接

### 3. OCR分页标记
依赖OCR结果中的分页标记：
```
==Start of OCR for page 1==
[页面1内容]
==Start of OCR for page 2==
[页面2内容]
```

如果OCR结果没有分页标记，会降级到使用全部content。

---

## 未来改进方向

1. **智能缓存**
   - 缓存已提取的页面内容
   - 避免重复提取相同页面

2. **并行处理**
   - 步骤2和步骤3可以并行处理其他表格
   - 进一步提升整体速度

3. **更细粒度的定位**
   - 不仅定位到页面，还定位到页面内的具体位置
   - 例如：第5页的第3个表格

---

## 相关文件

- `api/tasks.py` (第737-1395行) - 核心修改
- `CELERY_TASK_DATA_FLOW.md` - 任务数据流文档
- `OCR_PROGRESS_FEATURE.md` - OCR进度显示文档

---

## 总结

通过在步骤2添加页码范围信息，步骤3实现了**精准页面提取**，大幅提升了性能和准确性。这是一个典型的**以空间换时间**的优化策略，通过在步骤2多输出一点信息（页码范围），让步骤3节省大量的API调用成本和时间。
