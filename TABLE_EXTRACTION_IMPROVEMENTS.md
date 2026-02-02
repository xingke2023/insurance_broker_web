# 表格提取逻辑改进说明

## 更新时间
2026-01-20

## 改进内容

参考 `extract_tables_complete.py` 的实现逻辑，对 Celery 任务中的表格提取功能进行了以下改进：

### 1. 更严格的"保单年度终结"列检查

**之前的逻辑**（tasks.py 旧版）：
```python
# 检查整个表格HTML中是否包含"保单年度终结"字符串
has_year_column = any(keyword in table_html for keyword in year_keywords)
```

**问题**：
- 可能匹配到表格内容中的"保单年度终结"文字，而非列名
- 无法确保该字段是表头列

**改进后的逻辑**（参考 extract_tables_complete.py）：
```python
# 1. 提取表格第一行（表头）
first_tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
first_tr_match = first_tr_pattern.search(table_html)

# 2. 提取表头中所有单元格的纯文本
cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.DOTALL | re.IGNORECASE)
cells = cell_pattern.findall(first_row)

# 3. 清理HTML标签
header_texts = [re.sub(r'<[^>]+>', '', cell).strip() for cell in cells]

# 4. 检查表头单元格中是否包含"保单年度终结"
has_year_column = any(
    any(keyword in header_text for keyword in year_keywords)
    for header_text in header_texts
)
```

**优势**：
- ✅ 只检查表头行，避免误匹配
- ✅ 确保"保单年度终结"是一个列名
- ✅ 更准确地识别有效表格

### 2. 智能表格分组：基于标题而非仅列标题

**之前的逻辑**（tasks.py 旧版）：
```python
# 仅根据列标题相似度分组
def group_tables_by_headers(table_tags):
    # 如果连续的表格列标题相似，则合并
    if headers_are_similar(headers, current_headers):
        current_group.append(table_tag)
```

**问题**：
- 可能错误合并列标题相似但实际是不同表格的情况
- 无法识别通过标题标记的续表（如"表格(續)"）

**改进后的逻辑**（参考 extract_tables_complete.py）：
```python
def group_tables_by_title(table_tags, content):
    # 1. 为每个表格查找前面的标题
    title = find_table_title(content, table_tag['start_pos'])

    # 2. 标准化标题（移除"续"、"待续"等标记）
    normalized_title = normalize_table_title(title)

    # 3. 基于标准化标题 + 列标题相似度分组
    if normalized_title and current_title and normalized_title == current_title:
        if headers_are_similar(headers, current_headers):
            current_group.append(table_tag)  # 合并续表
```

**优势**：
- ✅ 通过标题识别续表（"表格名(續)" → "表格名"）
- ✅ 标题相同 + 列标题相似 → 确认是续表
- ✅ 标题相同但列标题不同 → 不合并（是不同的表格）
- ✅ 没有标题时回退到列标题分组

### 3. 标题标准化函数

新增 `normalize_table_title()` 函数：

```python
def normalize_table_title(title):
    """标准化表格标题：移除"续"、"待续"等标记"""
    # 移除 (續)、(续)
    normalized = re.sub(r'\s*[\(（]續[）\)]\s*', '', title)
    normalized = re.sub(r'\s*[\(（]续[）\)]\s*', '', normalized)

    # 移除 待續、待续
    normalized = re.sub(r'\s*待續.*', '', normalized)
    normalized = re.sub(r'\s*待续.*', '', normalized)

    return normalized.strip()
```

**处理示例**：
- `"退保價值 (續)"` → `"退保價值"`
- `"身故賠償(续)"` → `"身故賠償"`
- `"详细说明 待續"` → `"详细说明"`

### 4. 更严格的AI提示词

**改进前**：
```
要求：
1. **只识别包含"保单年度终结"或"保單年度終結"字段的表格**
2. 如果表格中没有"保单年度终结"或"保單年度終結"列，请直接跳过该表格，不要输出
```

**改进后**（与 extract_tables_complete.py 一致）：
```
**核心要求（必须严格遵守）：**
1. **必须包含"保单年度终结"或"保單年度終結"列**：如果表格中没有这个列名，直接跳过，不要输出
2. **检查列标题**：必须在表格的第一行（表头）找到"保单年度终结"或"保單年度終結"这个列名
3. **跨页表格合并**：有些表格可能跨度好几个页面，但只算一张表，请完整识别
4. **续表识别**：如果表格名称包含"(續)"、"(续)"等字样，应合并为同一张表
5. **输出内容**：对每个表格提取：表详细名称、行数（续表需累加）、基本字段

**严格要求：只输出包含"保单年度终结"列的表格，其他表格一律不输出！**
```

**优势**：
- ✅ 更明确的指令，减少AI误判
- ✅ 强调检查表头而非整个表格
- ✅ 明确续表的识别和合并要求

## 修改的文件

### api/tasks.py

**修改的函数**：

1. `extract_tables_with_year_column(content)`
   - 改进：严格检查表头中是否包含"保单年度终结"列

2. `group_tables_by_headers()` → `group_tables_by_title(table_tags, content)`
   - 改名：更准确反映功能
   - 改进：基于标题 + 列标题相似度分组

3. **新增** `normalize_table_title(title)`
   - 功能：标准化表格标题，移除续表标记

4. `extract_tablesummary_task()`
   - 更新：调用 `group_tables_by_title()` 而非 `group_tables_by_headers()`
   - 更新：使用更严格的AI提示词

## 预期效果

### 问题1：误识别表格
**之前**：可能将不包含"保单年度终结"列的表格误识别为有效表格
**现在**：严格检查表头，只提取真正包含该列的表格

### 问题2：续表未合并
**之前**：续表可能被识别为独立的表格
**现在**：通过标题标准化自动识别并合并续表

### 问题3：错误合并不同表格
**之前**：列标题相似的不同表格可能被错误合并
**现在**：标题 + 列标题双重检查，更准确判断是否是同一表格

## 测试建议

1. **测试包含续表的文档**
   - 上传一个有"详细说明(續)"的PDF
   - 检查是否正确合并为一个表格

2. **测试列标题相似但内容不同的表格**
   - 检查是否正确分为多个独立表格

3. **测试不包含"保单年度终结"列的表格**
   - 检查是否正确过滤掉无关表格

## 兼容性说明

- ✅ 完全向后兼容：旧的 `group_tables_by_summary()` 函数保留
- ✅ 数据库模型无需修改
- ✅ API接口无需修改
- ✅ 只需重启Celery Worker即可生效

## 下一步

1. 重启Celery Worker
   ```bash
   cd /var/www/harry-insurance2
   ./stop_celery.sh
   ./start_celery.sh
   ```

2. 测试新流程
   ```bash
   # 查看日志确认使用新逻辑
   tail -f logs/celery.log
   ```

3. 对比测试
   - 使用同一个PDF文件，对比改进前后的提取结果
   - 检查 PlanTable 表中的数据是否更准确

## 参考文件

- `/var/www/harry-insurance2/extract_tables_complete.py` - 参考实现
- `/var/www/harry-insurance2/api/tasks.py` - Celery任务定义
- `/var/www/harry-insurance2/CELERY_WORKFLOW_SIMPLIFIED.md` - Celery流程说明
