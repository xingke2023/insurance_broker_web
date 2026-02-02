# Celery 任务处理流程详解

## 当前任务链配置

### 📊 完整流程（6个步骤）

```
用户上传PDF
    ↓
[步骤1] 提取表格源代码 (extract_tablecontent_task)
    ↓ 自动触发（已禁用）
    ↓
[步骤2] 提取基本信息 (extract_basic_info_task) ⚠️ 手动触发
    ↓ 手动触发
    ↓
[步骤3] 提取表格概要 (extract_tablesummary_task) ⚠️ 手动触发
    ↓ 自动触发
    ↓
[步骤4] 提取退保价值表 (extract_table_task)
    ↓ 自动触发
    ↓
[步骤5] 提取无忧选退保价值表 (extract_wellness_table_task)
    ↓ 已禁用
    ↓
[步骤6] 提取计划书概要 (extract_summary_task) ⚠️ 手动触发
    ↓
处理完成 ✅
```

## 各步骤详细说明

### 步骤0：OCR识别文档（可选）
**任务名**: `ocr_document_task`
**触发方式**: 手动（从前端调用）
**功能**:
- 调用PaddleLayout API进行OCR识别
- 提取PDF文档为markdown格式文本
- 保存到`content`字段

**处理阶段**:
- 开始: `processing`
- 完成: `ocr_completed`

**下一步**: 自动触发步骤1（提取表格源代码）

---

### 步骤1：提取表格源代码 ⭐ 当前入口
**任务名**: `extract_tablecontent_task`
**触发方式**:
- 自动（从步骤0触发）
- 或作为整个流水线的入口

**功能**:
- 从OCR内容中提取所有`<table>`标签
- 保存HTML源代码到`tablecontent`字段
- 统计表格数量

**关键代码**: `api/tasks.py:720-817`

**处理阶段**:
- 开始: `extracting_tablecontent`
- 完成: `ocr_completed` + `status='completed'`

**下一步**:
- ~~自动触发步骤2（已禁用）~~
- 流程在此终止，标记为已完成
- 后续步骤需要手动触发

**日志示例**:
```
📊 Celery任务开始 - 步骤1/6: 提取表格源代码 - 文档ID: 145
⏳ 正在提取表格源代码...
✅ 提取到 16 个表格
   - 总长度: 125,832 字符
✅ 步骤1完成: 表格源代码提取成功
```

---

### 步骤2：提取基本信息 ⚠️ 手动触发
**任务名**: `extract_basic_info_task`
**触发方式**: ⚠️ **手动触发**（从前端调用）

**功能**:
- 使用通义千问AI提取受保人信息
  - 姓名、年龄、性别
- 提取保险产品信息
  - 保险公司、产品名称
- 提取保费信息
  - 年缴保费、缴费年数、总保费
- 提取保额和保险期限

**关键代码**: `api/tasks.py:316-437`

**处理阶段**:
- 开始: `extracting_basic_info`
- 完成: `basic_info_completed`

**下一步**: 不自动触发

**API端点**:
```
POST /api/ocr/documents/{document_id}/extract-basic-info/
```

**日志示例**:
```
📋 Celery任务开始 - 步骤2/6: 提取基本信息 - 文档ID: 145
⏳ 调用通义千问API提取基本信息...
✅ 步骤2完成: 基本信息提取成功
   - 受保人: 张三, 30岁, 男性
   - 保险公司: 法国安盛
   - 年缴保费: 50,000
```

---

### 步骤3：提取表格概要 ⭐ 核心步骤
**任务名**: `extract_tablesummary_task`
**触发方式**: ⚠️ **手动触发**（从前端调用）

**功能**:
1. **调用DeepSeek AI分析表格结构**
   - 识别所有以"保单年度终结"为坐标的表格
   - 提取表格名称、行数、字段信息
   - 处理跨页表格合并
   - 保存概要到`tablesummary`字段

2. **⭐ 提取各个表格的HTML源代码（新功能）**
   - 解析表格概要
   - 提取包含"保单年度终结"的`<table>`标签
   - 智能匹配和分组
   - 合并跨页表格
   - 保存到`PlanTable`数据库表

**关键代码**: `api/tasks.py:820-1043`

**处理阶段**:
- 开始: `extracting_tablesummary`
- 完成: `tablesummary_completed`

**下一步**: 自动触发步骤4（提取退保价值表）

**API端点**:
```
POST /api/content-editor/{document_id}/update-tablesummary/
```

**日志示例**:
```
📋 Celery任务开始 - 步骤3/6: 提取表格概要 - 文档ID: 145
⏳ 开始调用 DeepSeek API 分析表格结构
   OCR内容长度: 98,456 字符
📦 DeepSeek API返回，长度: 1,234 字符
📋 表格概要已保存到数据库

🔍 开始提取各个表格的HTML源代码...
📋 概要识别到 7 个逻辑表格
📊 提取到 16 个包含'保单年度终结'的<table>标签
   ✅ 表格 1: 詳細說明 - 退保價值 (101行)
   ✅ 表格 2: 身故賠償 (101行)
   ... (共7个表格)
💾 成功保存 7/7 个表格到数据库

✅ 步骤3完成: 表格概要提取成功
```

---

### 步骤4：提取退保价值表
**任务名**: `extract_table_task`
**触发方式**: 自动（从步骤3触发）

**功能**:
- 从表格概要中提取退保价值表数据
- 解析保证现金价值、非保证现金价值
- 保存到`table1`字段（JSON格式）
- 保存到`AnnualValue`数据库表

**关键代码**: `api/tasks.py:442-520`

**处理阶段**:
- 开始: `extracting_table`
- 完成: `table_completed`

**下一步**: 自动触发步骤5（提取无忧选退保价值表）

**日志示例**:
```
📊 Celery任务开始 - 步骤4/6: 提取退保价值表 - 文档ID: 145
⏳ 正在提取退保价值表...
✅ 步骤4完成: 退保价值表提取成功
   - 提取到 101 条年度数据
```

---

### 步骤5：提取无忧选退保价值表
**任务名**: `extract_wellness_table_task`
**触发方式**: 自动（从步骤4触发）

**功能**:
- 判断是否存在"入息"/"提取"/"无忧选"字段
- 如果存在，提取相关数据
- 保存到`table2`字段（JSON格式）

**关键代码**: `api/tasks.py:522-608`

**处理阶段**:
- 开始: `extracting_wellness_table`
- 完成: `wellness_table_completed` → `all_completed`

**下一步**:
- 标记为`all_completed`
- 不自动触发步骤6

**日志示例**:
```
💰 Celery任务开始 - 步骤5/6: 提取无忧选退保价值表 - 文档ID: 145
⏳ 正在提取无忧选退保价值表...
✅ 步骤5完成: 无忧选退保价值表提取成功
   或
⚠️ 步骤5完成: 未找到无忧选退保价值表
```

---

### 步骤6：提取计划书概要 ⚠️ 手动触发
**任务名**: `extract_summary_task`
**触发方式**: ⚠️ **手动触发**（从前端调用）

**功能**:
- 使用DeepSeek AI生成计划书Markdown总结
- 包含受保人信息、产品信息、保障详情
- 保存到`summary`字段

**关键代码**: `api/tasks.py:604-716`

**处理阶段**:
- 开始: `extracting_summary`
- 完成: `summary_completed`

**下一步**: 无

**API端点**:
```
POST /api/ocr/documents/{document_id}/extract-summary/
```

**日志示例**:
```
📝 Celery任务开始 - 步骤6/6: 提取计划书概要 - 文档ID: 145
⏳ 调用DeepSeek API生成概要...
✅ 步骤6完成: 计划书概要提取成功
   - 概要长度: 3,456 字符
```

---

## 自动任务链 vs 手动触发

### 🔄 自动执行的步骤
```
步骤1 → 步骤3 → 步骤4 → 步骤5
```

**说明**:
- 步骤1执行后自动标记完成，不触发步骤2
- 步骤3（手动触发后）会自动触发步骤4
- 步骤4自动触发步骤5
- 步骤5执行后标记为`all_completed`

### ⚠️ 需要手动触发的步骤
```
步骤2 - 提取基本信息
步骤3 - 提取表格概要（触发后会启动自动链）
步骤6 - 提取计划书概要
```

**原因**:
- 这些步骤调用AI API，成本较高
- 允许用户按需提取
- 避免自动消耗API配额

---

## 任务触发入口

### 1. 完整流水线入口
**函数**: `process_document_pipeline(document_id)`
**触发**: 从`ocr_views.py:save_ocr_result`

```python
# 用户上传PDF后自动触发
process_document_pipeline(document_id)
```

**执行路径**:
```
process_document_pipeline
    ↓
extract_tablecontent_task (步骤1)
    ↓ (已终止)
处理完成
```

### 2. 手动触发API端点

| 步骤 | API端点 | 方法 |
|------|---------|------|
| 步骤2 | `/api/ocr/documents/{id}/extract-basic-info/` | POST |
| 步骤3 | `/api/content-editor/{id}/update-tablesummary/` | POST |
| 步骤4 | `/api/content-editor/{id}/update-surrender-value/` | POST |
| 步骤5 | `/api/content-editor/{id}/update-wellness-table/` | POST |
| 步骤6 | `/api/ocr/documents/{id}/extract-summary/` | POST |

---

## 任务状态追踪

### processing_stage 字段值

| 阶段值 | 说明 |
|--------|------|
| `pending` | 待处理 |
| `processing` | OCR处理中 |
| `ocr_completed` | OCR完成（步骤1完成）|
| `extracting_basic_info` | 提取基本信息中 |
| `basic_info_completed` | 基本信息完成 |
| `extracting_tablesummary` | 提取表格概要中 |
| `tablesummary_completed` | 表格概要完成 |
| `extracting_table` | 提取退保价值表中 |
| `table_completed` | 退保价值表完成 |
| `extracting_wellness_table` | 提取无忧选表中 |
| `wellness_table_completed` | 无忧选表完成 |
| `all_completed` | 全部完成（步骤5完成）|
| `extracting_summary` | 提取概要中 |
| `summary_completed` | 概要完成 |
| `error` | 处理出错 |

### status 字段值

| 状态值 | 说明 |
|--------|------|
| `uploaded` | 已上传 |
| `processing` | 处理中 |
| `completed` | 已完成 |
| `failed` | 失败 |

---

## 任务重试机制

所有任务都配置了重试：
```python
@shared_task(bind=True, max_retries=2, default_retry_delay=60)
```

- **最大重试次数**: 2次
- **重试间隔**: 60秒
- **重试条件**: 捕获到异常时

---

## 查看任务日志

### Celery日志
```bash
tail -f logs/celery.log
```

### Django日志
```bash
tail -f logs/django.log
```

### 实时监控
```bash
# 查看Celery worker状态
./check_celery.sh

# 或
celery -A backend inspect active
```

---

## 典型处理时间

| 步骤 | 平均耗时 | 说明 |
|------|----------|------|
| 步骤0 | 30-60秒 | OCR识别，取决于PDF页数 |
| 步骤1 | 1-3秒 | 正则提取，速度快 |
| 步骤2 | 5-10秒 | 调用通义千问API |
| 步骤3 | 10-20秒 | 调用DeepSeek + 表格提取 |
| 步骤4 | 5-10秒 | DeepSeek提取数据 |
| 步骤5 | 3-8秒 | DeepSeek判断和提取 |
| 步骤6 | 8-15秒 | DeepSeek生成概要 |

**总计**:
- 自动步骤（1→3→4→5）: 约 20-40秒
- 全部步骤: 约 60-120秒

---

## 常见问题

### Q1: 为什么步骤2不自动执行？
**A**: 为了节省API成本和给用户选择权。基本信息提取需要调用通义千问API，用户可能不需要这些信息，所以改为手动触发。

### Q2: 如何查看任务是否在执行？
**A**:
```bash
# 方法1: 查看日志
tail -f logs/celery.log

# 方法2: 检查processing_stage
curl http://localhost:8007/api/ocr/documents/{id}/status/

# 方法3: Celery命令
celery -A backend inspect active
```

### Q3: 任务卡住了怎么办？
**A**:
```bash
# 1. 重启Celery
sudo supervisorctl restart harry-insurance:harry-insurance-celery

# 2. 清空任务队列
celery -A backend purge

# 3. 手动重试
curl -X POST http://localhost:8007/api/ocr/documents/{id}/retry/
```

### Q4: 如何跳过某个步骤？
**A**: 不能跳过自动执行的步骤（3→4→5），但可以不触发手动步骤（2、6）。

### Q5: 新上传的PDF会自动执行哪些步骤？
**A**:
```
自动: 步骤1（提取表格源代码）
手动: 步骤2、3、4、5、6（需要用户在前端点击触发）
```

---

## 任务流程图（ASCII）

```
┌─────────────────────────────────────────────────────────┐
│                    用户上传PDF                          │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌───────────────────────────────────────────────────────┐
│  步骤1: 提取表格源代码 (extract_tablecontent_task)  │
│  - 提取所有<table>标签                                │
│  - 保存到tablecontent字段                            │
│  - 标记为completed                                    │
└───────────────────┬───────────────────────────────────┘
                    ↓ (终止，不自动触发)
┌───────────────────────────────────────────────────────┐
│         处理完成（status: completed）                 │
│         用户可手动触发后续步骤                        │
└───────────────────────────────────────────────────────┘

        ⚠️ 手动触发步骤2 ⚠️
                    ↓
┌───────────────────────────────────────────────────────┐
│  步骤2: 提取基本信息 (extract_basic_info_task)       │
│  - 受保人信息、保险产品、保费等                      │
│  - 调用通义千问API                                    │
└───────────────────────────────────────────────────────┘

        ⚠️ 手动触发步骤3 ⚠️
                    ↓
┌───────────────────────────────────────────────────────┐
│  步骤3: 提取表格概要 (extract_tablesummary_task)     │
│  - 调用DeepSeek分析表格结构                          │
│  - ⭐ 提取并保存各个表格HTML到PlanTable表           │
└───────────────────┬───────────────────────────────────┘
                    ↓ (自动触发)
┌───────────────────────────────────────────────────────┐
│  步骤4: 提取退保价值表 (extract_table_task)          │
│  - 提取保证/非保证现金价值                           │
│  - 保存到table1和AnnualValue表                       │
└───────────────────┬───────────────────────────────────┘
                    ↓ (自动触发)
┌───────────────────────────────────────────────────────┐
│  步骤5: 提取无忧选表 (extract_wellness_table_task)   │
│  - 判断是否有无忧选字段                              │
│  - 提取相关数据到table2                              │
│  - 标记为all_completed                               │
└───────────────────────────────────────────────────────┘

        ⚠️ 手动触发步骤6 ⚠️
                    ↓
┌───────────────────────────────────────────────────────┐
│  步骤6: 提取计划书概要 (extract_summary_task)        │
│  - 调用DeepSeek生成Markdown总结                      │
│  - 保存到summary字段                                  │
└───────────────────────────────────────────────────────┘
```

---

**文档版本**: v2.0
**最后更新**: 2024-01-19
**包含新功能**: ✅ 步骤3自动提取表格HTML到PlanTable表
