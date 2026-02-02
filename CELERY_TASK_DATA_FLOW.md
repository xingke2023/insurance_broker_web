# Celery 任务数据流向图

## 核心原则

**OCR识别是唯一一次调用外部API进行文档识别，所有后续任务都基于已识别的 `content` 字段进行数据提取和分析。**

## 数据流向

```
┌─────────────────────────────────────────────────────────────┐
│                      PDF 文件 (file_path)                    │
│              存储路径: media/plan_documents/                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ 【唯一一次OCR调用】
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  步骤0: ocr_document_task                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  调用: Gemini 3 Flash Preview API                           │
│  输入: PDF 文件字节流                                        │
│  输出: Markdown + HTML表格                                   │
│  处理: ocr_pdf_with_gemini(doc.file_path.path)              │
│  状态: ocr_processing → ocr_completed                        │
│  进度: 10% → 15%                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ 保存到数据库
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               content 字段 (数据源 - 所有任务的基础)          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  类型: TextField                                             │
│  内容: OCR识别的完整文档内容                                 │
│       - Markdown格式文本                                     │
│       - HTML <table>标签                                     │
│       - 分页标记: ==Start of OCR for page X==               │
│  特点: 永久保存，不会再次OCR                                 │
└─────────────────────────────────────────────────────────────┘
          ↓              ↓              ↓              ↓
          ↓              ↓              ↓              ↓
    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
    │ 步骤1   │   │ 步骤2   │   │ 步骤3   │   │ 步骤4   │
    │ 表格源码 │   │ 表格分析 │   │ 退保价值 │   │ 基本信息│
    └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

## 详细任务数据依赖

### 步骤0: OCR识别文档 (ocr_document_task)

**唯一调用OCR API的步骤**

```python
# 输入数据
input: doc.file_path.path  # PDF文件路径

# 处理过程
result = ocr_pdf_with_gemini(doc.file_path.path)
# ↑ 调用 Gemini 3 Flash Preview API
# ↑ 这是唯一一次OCR识别

# 输出数据
output: doc.content  # 保存识别结果
```

**数据检查**：
```python
✅ 前置条件: PDF文件存在
✅ 输出验证: content字段非空
✅ 后续触发: extract_tablecontent_task
```

---

### 步骤1: 提取表格源代码 (extract_tablecontent_task)

**基于 content 字段，不再访问PDF**

```python
# 输入数据
input: doc.content  # ✅ 从OCR结果读取，不访问PDF

# 前置检查
if not doc.content:
    error_msg = "OCR内容为空，无法继续处理"
    return {'success': False, 'error': error_msg}

# 处理过程
pages = re.split(r'==End of OCR for page \d+==...', doc.content)
# ↑ 按分页符拆分
# ↑ 提取所有<table>标签
# ↑ 过滤：只保留包含"保单年度终结"的表格

# 输出数据
output: doc.tablecontent  # 过滤后的表格HTML
```

**数据检查**：
```python
✅ 前置条件: doc.content 非空
✅ 输出验证: tablecontent 包含过滤后的表格
✅ 后续触发: extract_tablesummary_task
```

---

### 步骤2: 提取表格概要 (extract_tablesummary_task)

**基于 tablecontent 字段**

```python
# 输入数据
input: doc.tablecontent  # ✅ 从步骤1的结果读取

# 前置检查
if not doc.content:
    error_msg = "OCR内容为空"
    return {'success': False, 'error': error_msg}

# 处理过程（两阶段）
# 阶段1: 调用 Gemini API 生成表格概要文本
summary = extract_table_summary(doc.tablecontent)
# ↑ 基于HTML表格，不是PDF

# 阶段2: 解析HTML并保存到PlanTable数据库
tables = extract_tables_from_html(doc.tablecontent)
group_tables_by_title(tables)
# ↑ 识别逻辑表格，合并跨页表格

# 输出数据
output:
  - doc.tablesummary  # 表格概要文本
  - PlanTable记录    # 每个逻辑表格一条记录
```

**数据检查**：
```python
✅ 前置条件: doc.content 非空
✅ 输出验证: tablesummary 和 PlanTable 创建成功
✅ 后续触发: extract_table1_task
```

---

### 步骤3: 提取退保价值表 (extract_table1_task)

**基于 content + tablesummary**

```python
# 输入数据
input:
  - doc.content       # ✅ OCR识别结果
  - doc.tablesummary  # ✅ 步骤2生成的表格概要

# 前置检查
if not doc.content:
    error_msg = "OCR内容为空"
    return {'success': False, 'error': error_msg}

# 处理过程
# 调用 Gemini API 基于概要选择最佳表格
table1_json = extract_table_from_content_based_on_summary(
    doc.content,      # ✅ 从content读取
    doc.tablesummary  # ✅ 从tablesummary读取
)
# ↑ 基于已有数据，不访问PDF

# 输出数据
output: doc.table1  # JSON格式的退保价值表
```

**数据检查**：
```python
✅ 前置条件: doc.content 和 doc.tablesummary 非空
✅ 输出验证: table1 包含有效的JSON数据
✅ 后续触发: 标记为 all_completed
```

---

## 已废弃的任务（参考）

以下任务已从当前流程中移除，但它们的逻辑也是基于 `content` 字段：

### extract_basic_info_task (已废弃)
```python
# 输入: doc.content
# 处理: 调用 Gemini API 提取基本信息
# 输出: doc.extracted_data (JSON)
```

### extract_table_data_task (已废弃)
```python
# 输入: doc.content (表格HTML)
# 处理: 调用 Gemini API 解析表格数据
# 输出: AnnualValue 数据库记录
```

### extract_summary_task (已废弃)
```python
# 输入: doc.content
# 处理: 调用 Gemini API 生成概要
# 输出: doc.summary (Markdown)
```

---

## 关键设计原则

### 1. 单次OCR原则
**只在步骤0调用OCR API，所有后续任务基于 `content` 字段。**

```python
# ✅ 正确：只有步骤0调用OCR
def ocr_document_task():
    result = ocr_pdf_with_gemini(pdf_path)  # 唯一的OCR调用
    doc.content = result['content']
    doc.save()

# ❌ 错误：其他任务不应再调用OCR
def extract_tablecontent_task():
    # 不要这样做！
    result = ocr_pdf_with_gemini(pdf_path)  # ❌ 重复OCR
```

### 2. 数据持久化原则
**OCR结果永久保存，即使PDF删除也能继续处理。**

```python
# ✅ content 字段是永久数据源
if doc.content:
    # 可以重新提取数据，不需要重新OCR
    extract_tablecontent_task.apply_async([doc.id])
```

### 3. 前置条件检查
**所有后续任务都必须检查 content 是否存在。**

```python
# ✅ 所有任务的标准检查
if not doc.content:
    error_msg = "OCR内容为空，无法继续处理"
    logger.error(error_msg)
    return {'success': False, 'error': error_msg}
```

### 4. 任务依赖链
**任务按顺序执行，每个任务依赖前一个任务的输出。**

```python
步骤0 → content
步骤1 → tablecontent (依赖 content)
步骤2 → tablesummary + PlanTable (依赖 tablecontent)
步骤3 → table1 (依赖 content + tablesummary)
```

---

## 数据库字段映射

| 字段名 | 类型 | 来源任务 | 数据内容 | 是否调用API |
|--------|------|----------|----------|------------|
| `content` | TextField | 步骤0 | OCR识别的完整文档内容 | ✅ Gemini OCR API |
| `tablecontent` | TextField | 步骤1 | 过滤后的表格HTML | ❌ 基于 content |
| `tablesummary` | TextField | 步骤2 | 表格概要文本 | ✅ Gemini Analysis API (基于HTML) |
| `table1` | JSONField | 步骤3 | 退保价值表JSON | ✅ Gemini Analysis API (基于content+summary) |
| `extracted_data` | JSONField | (已废弃) | 基本信息JSON | ✅ Gemini Analysis API (基于content) |
| `summary` | TextField | (已废弃) | 计划书概要 | ✅ Gemini Analysis API (基于content) |

---

## 成本和性能分析

### API调用统计

**Gemini OCR API (高成本)**
- 步骤0: 1次 - 识别整个PDF文档
- 输入: PDF文件字节流 (通常 1-5MB)
- 耗时: 10-30秒（取决于文件大小）

**Gemini Analysis API (低成本)**
- 步骤2: 1次 - 分析表格HTML生成概要
- 步骤3: 1次 - 基于概要选择最佳表格
- 输入: 文本/HTML (通常 10-50KB)
- 耗时: 2-5秒

### 优势

1. **成本优化**
   - OCR只调用一次，节省API费用
   - 后续任务处理本地数据

2. **速度优化**
   - content 字段本地访问，无网络延迟
   - 可以并行执行多个分析任务

3. **可靠性**
   - OCR结果持久化，任务失败可重试
   - 不需要重新上传PDF

4. **可扩展性**
   - 可以随时添加新的分析任务
   - 基于 content 字段即可，不影响OCR

---

## 错误处理和重试机制

### OCR失败处理
```python
# 步骤0失败：标记为error，不触发后续任务
if ocr_failed:
    doc.processing_stage = 'error'
    doc.status = 'failed'
    doc.save()
    # 不触发步骤1
```

### 后续任务失败处理
```python
# 步骤1-3失败：可以重试，因为content字段已存在
if task_failed:
    # 重试时直接从content读取，不需要重新OCR
    if self.request.retries < self.max_retries:
        raise self.retry(exc=Exception(error_msg))
```

---

## 总结

✅ **OCR识别 (步骤0) 是唯一调用外部OCR API的步骤**
✅ **content 字段是所有后续任务的数据基础**
✅ **所有分析任务基于已识别的内容，不再访问PDF**
✅ **这种设计节省成本、提高速度、增强可靠性**

这就是为什么 OCR 识别的进度显示如此重要 - 因为它是整个处理流程的**前提条件**和**数据基础**！
