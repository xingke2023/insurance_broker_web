# 计划书表格提取功能实现总结

## 概述

已成功实现计划书各个表格的自动提取和存储功能，现在系统能够：
1. 自动识别OCR内容中包含"保单年度终结"的所有表格
2. 根据DeepSeek AI分析的表格概要进行智能匹配和分组
3. 自动合并跨页表格
4. 将每个表格的HTML源代码存储到数据库
5. 通过API查看每个表格的详细信息

## 数据库模型

### PlanTable 模型
位置：`api/models.py:154-179`

```python
class PlanTable(models.Model):
    """计划书表格 - 存储每个计划书的各个表格"""
    plan_document = models.ForeignKey(PlanDocument, on_delete=models.CASCADE, related_name='plan_tables')
    table_number = models.IntegerField(verbose_name='表格编号')
    table_name = models.CharField(max_length=500, verbose_name='表格名称')
    row_count = models.IntegerField(verbose_name='行数', default=0)
    fields = models.TextField(verbose_name='基本字段', blank=True, default='')
    html_source = models.TextField(verbose_name='HTML源代码', blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**字段说明：**
- `plan_document`: 关联的计划书文档（外键）
- `table_number`: 表格编号（1, 2, 3...）
- `table_name`: 表格名称（如："詳細說明 - 退保價值"）
- `row_count`: 表格总行数（合并后）
- `fields`: 基本字段列表（如："保单年度终结,缴付保费总额,退保价值"）
- `html_source`: 完整的HTML `<table>` 标签内容

## 核心功能实现

### 1. 表格提取辅助函数
位置：`api/tasks.py:27-190`

**parse_summary(summary_text)**
- 解析DeepSeek返回的表格概要文本
- 提取每个表格的：编号、名称、行数、字段

**extract_tables_with_year_column(content)**
- 从OCR内容中提取所有包含"保单年度终结"的 `<table>` 标签
- 支持多种关键词：保单年度终结、保單年度終結、保单年度、保單年度等
- 返回每个表格的：HTML内容、行数、位置

**find_table_title(content, table_start_pos)**
- 查找 `<table>` 标签前面的标题文本
- 用于智能匹配表格名称

**group_tables_by_summary(table_tags, summary_tables, content)**
- 根据表格概要和标题，将 `<table>` 标签分组
- 处理跨页表格（多个 `<table>` 对应一个逻辑表格）
- 智能匹配算法：
  1. 优先根据标题文本匹配
  2. 移除"(續)"标记进行基础名称匹配
  3. 降级方案：按顺序一一对应

**merge_table_tags(table_tags)**
- 合并多个 `<table>` 标签为一个
- 去除重复的表头（只保留第一个表格的表头）
- 保留所有数据行

### 2. Celery任务集成
位置：`api/tasks.py:788-837`

在 `extract_tablesummary_task` 任务中新增：

```python
# 步骤3：提取表格概要后，自动提取各个表格的HTML
try:
    logger.info("🔍 开始提取各个表格的HTML源代码...")

    # 解析表格概要
    summary_tables = parse_summary(content)

    # 提取包含"保单年度终结"的<table>标签
    table_tags = extract_tables_with_year_column(doc.content)

    # 根据概要分组并合并
    grouped = group_tables_by_summary(table_tags, summary_tables, doc.content)

    # 清空旧数据
    PlanTable.objects.filter(plan_document=doc).delete()

    # 保存每个表格
    for table_number, tags in grouped.items():
        summary_table = summary_tables[table_number - 1]
        merged_html = merge_table_tags(tags)
        total_rows = sum(tag['row_count'] for tag in tags)

        PlanTable.objects.create(
            plan_document=doc,
            table_number=table_number,
            table_name=summary_table['name'],
            row_count=total_rows,
            fields=summary_table['fields'],
            html_source=merged_html
        )
```

**特点：**
- 自动在表格概要提取后执行
- 失败不会影响后续任务
- 记录详细日志便于调试

### 3. API接口

#### 3.1 获取文档详情（包含表格列表）
**端点：** `GET /api/ocr/documents/<document_id>/`

**响应新增字段：** `plan_tables`
```json
{
  "status": "success",
  "data": {
    "id": 123,
    "file_name": "xxx.pdf",
    "plan_tables": [
      {
        "id": 1,
        "table_number": 1,
        "table_name": "詳細說明 - 退保價值",
        "row_count": 101,
        "fields": "保单年度终结,缴付保费总额,退保价值",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### 3.2 获取单个表格详情（包含HTML源代码）
**端点：** `GET /api/ocr/tables/<table_id>/`

**响应示例：**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "table_number": 1,
    "table_name": "詳細說明 - 退保價值",
    "row_count": 101,
    "fields": "保单年度终结,缴付保费总额,退保价值",
    "html_source": "<table>\n  <tr><th>保单年度终结</th>...</tr>\n  ...\n</table>",
    "plan_document": {
      "id": 123,
      "file_name": "xxx.pdf"
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 4. Admin后台管理
位置：`api/admin.py:75-117`

**功能：**
- 列表显示：表格编号、名称、行数、字段预览
- 详情页：完整查看HTML源代码
- 搜索：支持按计划书、表格名称、字段搜索
- 过滤：按计划书、创建时间过滤
- 排序：按计划书和表格编号排序

## 技术特性

### 1. 智能匹配算法
- 支持跨页表格自动识别和合并
- 处理"(續)"、"(续)"等续表标记
- 基于标题相似度的智能匹配
- 降级方案确保数据不丢失

### 2. 数据完整性
- 使用 `unique_together` 约束确保同一计划书的表格编号唯一
- 级联删除：删除计划书时自动删除关联表格
- 事务安全：提取失败不影响概要数据

### 3. 性能优化
- 使用正则表达式高效提取 `<table>` 标签
- 只提取包含"保单年度终结"的表格，避免无关数据
- 批量创建，减少数据库操作

### 4. 错误处理
- 表格提取失败不影响整体流程
- 详细的错误日志记录
- 降级策略确保部分数据可用

## 使用流程

### 用户上传PDF后：
1. **OCR识别** → 提取markdown格式文本
2. **提取表格源代码** → 提取所有 `<table>` 标签
3. **提取基本信息** → 受保人、保险产品、保费等
4. **提取表格概要** → DeepSeek分析表格结构
   - ✨ **新功能：同时提取各个表格的HTML源代码**
   - 解析概要，识别逻辑表格
   - 提取包含"保单年度终结"的 `<table>` 标签
   - 智能匹配和合并跨页表格
   - 保存到 `PlanTable` 数据库表
5. **提取退保价值表** → 详细数据提取
6. **提取无忧选退保价值表** → 特殊字段提取
7. **提取计划书概要** → 生成markdown总结

## 测试验证

### 1. 数据库迁移
```bash
python3 manage.py makemigrations
# Migrations for 'api':
#   api/migrations/0045_plantable.py
#     + Create model PlanTable

python3 manage.py migrate
# Applying api.0045_plantable... OK
```

### 2. 测试流程
1. 上传一个保险计划书PDF
2. 等待Celery任务链完成
3. 查看文档详情API，检查 `plan_tables` 字段
4. 调用表格详情API，查看HTML源代码
5. 在Admin后台查看 PlanTable 记录

### 3. 预期结果
- 每个计划书应该有2-7个表格记录
- 每个表格应包含完整的HTML源代码
- 跨页表格应正确合并
- 表格编号应连续且唯一

## 文件修改清单

1. **api/models.py**
   - 新增 `PlanTable` 模型

2. **api/tasks.py**
   - 新增5个表格提取辅助函数
   - 修改 `extract_tablesummary_task` 集成表格提取逻辑

3. **api/serializers.py**
   - 新增 `PlanTableSerializer`

4. **api/admin.py**
   - 新增 `PlanTableAdmin` 后台管理

5. **api/ocr_views.py**
   - 修改 `get_document_detail` 添加 `plan_tables` 字段
   - 新增 `get_table_detail` 视图函数

6. **api/urls.py**
   - 新增 `/api/ocr/tables/<table_id>/` 路由

## 后续优化建议

1. **前端UI**
   - 在文档详情页添加"表格列表"展示
   - 点击表格可查看HTML预览
   - 支持导出表格数据为CSV/Excel

2. **数据分析**
   - 基于表格HTML解析具体数据
   - 支持跨表格数据对比
   - 生成可视化图表

3. **性能优化**
   - 对大型表格（>1000行）添加分页
   - HTML源代码压缩存储
   - 添加缓存机制

4. **功能扩展**
   - 支持手动编辑表格数据
   - 表格版本历史记录
   - 表格差异对比

## 相关文档

- 原型脚本：`extract_tables_by_year.py`
- 表格提取优化指南：`TABLE_EXTRACTION_OPTIMIZATION.md`
- 跨页表格处理说明：`CROSS_PAGE_TABLE_HANDLING.md`
- Celery任务系统：`CELERY_SETUP.md`

## 总结

该功能成功将独立脚本 `extract_tables_by_year.py` 的逻辑集成到生产系统中，实现了：
- ✅ 自动化表格提取（无需手动操作）
- ✅ 数据持久化存储（数据库存储）
- ✅ API接口访问（前端可调用）
- ✅ 后台管理界面（方便查看和管理）
- ✅ 智能匹配和合并（处理复杂情况）
- ✅ 错误处理和日志（便于调试）

现在系统能够完整保存每个计划书的所有表格数据，为后续的数据分析和展示提供了坚实基础。
