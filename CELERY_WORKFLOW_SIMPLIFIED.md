# Celery任务流程简化说明

## 修改日期
2026-01-19

## 修改内容

### 原有流程（7个步骤）
```
步骤0: OCR识别 (ocr_document_task)
  ↓
步骤1: 提取表格源代码 (extract_tablecontent_task)
  ↓
步骤2: 提取基本信息 (extract_basic_info_task) ❌ 已删除
  ↓
步骤3: 提取表格概要 (extract_tablesummary_task)
  ↓
步骤4: 提取退保价值表 (extract_table_task) ❌ 已删除
  ↓
步骤5: 提取无忧选退保价值表 (extract_wellness_table_task) ❌ 已删除
  ↓
步骤6: 提取计划书概要 (extract_summary_task) ❌ 已删除
```

### 新流程（3个步骤）
```
步骤0: OCR识别 (ocr_document_task)
  → 识别PDF并存入数据库content字段
  ↓
步骤1: 提取表格源代码 (extract_tablecontent_task)
  → 提取所有<table>标签并存入tablecontent字段
  ↓
步骤2: 提取表格概要 (extract_tablesummary_task)
  → 分析表格结构并存入tablesummary字段
  → 将每个表格的HTML源代码存入PlanTable数据库表
  → 标记文档为completed状态
```

## 数据库字段使用

### PlanDocument表
- `content`: OCR识别的完整内容（步骤0写入）
- `tablecontent`: 所有<table>标签源代码（步骤1写入）
- `tablesummary`: 表格概要文本（步骤2写入）
- `status`: 文档状态（completed/processing/failed）
- `processing_stage`: 处理阶段标识

### PlanTable表（新增数据）
每个计划书的表格会单独保存一条记录：
- `plan_document`: 关联的PlanDocument ID
- `table_number`: 表格编号（1, 2, 3...）
- `table_name`: 表格名称
- `row_count`: 行数
- `fields`: 基本字段列表
- `html_source`: 表格完整的HTML源代码

## 已删除的功能

### 1. 删除的Celery任务
- `extract_basic_info_task` - 提取受保人、保险产品等基本信息
- `extract_table_task` - 提取退保价值表（table1字段）
- `extract_wellness_table_task` - 提取无忧选退保价值表（table2字段）
- `extract_summary_task` - 生成计划书概要

### 2. 删除的API端点
- `POST /api/ocr/documents/<id>/extract-basic-info/` - 手动提取基本信息
- `POST /api/ocr/documents/<id>/extract-summary/` - 手动提取概要

### 3. 修改的API端点
- `POST /api/ocr/documents/<id>/retry/`
  - 原来支持：`retry_stage=all|basic_info|table|summary`
  - 现在仅支持：`retry_stage=all` （重新执行完整流程）

## 未删除的数据库字段

以下字段保留在PlanDocument模型中，但不再自动填充：
- `insured_name` - 受保人姓名
- `insured_age` - 受保人年龄
- `insured_gender` - 性别
- `insurance_product` - 保险产品
- `insurance_company` - 保险公司
- `annual_premium` - 年缴保费
- `payment_years` - 缴费年数
- `sum_assured` - 基本保额
- `extracted_data` - AI提取的完整数据（JSON）
- `table1` - 基本计划退保价值表（longtext）
- `table2` - 无忧选退保价值表（longtext）
- `summary` - 计划书概要

这些字段可以在未来需要时，通过其他方式手动填充或使用新的任务处理。

## 核心优势

1. **简化流程**：从7步减少到3步，处理速度更快
2. **结构化存储**：每个表格单独存储在PlanTable表，便于查询和展示
3. **降低成本**：减少了4次DeepSeek API调用
4. **专注核心**：只保留表格提取这个核心功能

## 任务触发方式

### 自动触发
上传PDF后自动触发3步流程：
```python
# api/ocr_views.py (save_ocr_result函数)
from api.tasks import ocr_document_task
ocr_document_task.apply_async(args=[plan_doc.id], countdown=1)
```

### 手动重试
如果处理失败，可以通过API手动重试：
```bash
POST /api/ocr/documents/{document_id}/retry/
Body: {"retry_stage": "all"}
```

## 相关文件修改清单

### 修改的文件
1. `api/tasks.py`
   - 删除了4个任务函数
   - 更新了步骤编号和日志

2. `api/ocr_views.py`
   - 修改了任务触发逻辑
   - 删除了2个手动触发视图函数
   - 简化了retry功能

3. `api/urls.py`
   - 删除了2个URL路由
   - 更新了import语句

### 未修改的文件
- `api/models.py` - 保留所有字段定义
- `api/deepseek_service.py` - 保留所有函数（可能在其他地方使用）
- `backend/celery.py` - Celery配置无需改动

## 下一步建议

1. **重启服务**
   ```bash
   # 重启Django
   sudo supervisorctl restart harry-insurance:harry-insurance-django

   # 重启Celery Worker
   ./stop_celery.sh
   ./start_celery.sh
   ```

2. **测试流程**
   - 上传一个新的PDF文件
   - 查看日志确认只执行了3个步骤
   - 检查PlanTable表是否正确存储了表格数据

3. **清理历史数据（可选）**
   - 如果需要，可以清空之前处理的文档数据重新处理
   - 新流程会自动填充PlanTable表

## 监控命令

```bash
# 查看Celery日志
tail -f logs/celery.log

# 查看最近处理的文档
mysql -u root -p insurancetools -e "SELECT id, file_name, status, processing_stage FROM plan_documents ORDER BY created_at DESC LIMIT 10;"

# 查看表格数据
mysql -u root -p insurancetools -e "SELECT * FROM plan_tables WHERE plan_document_id = YOUR_DOC_ID;"
```
