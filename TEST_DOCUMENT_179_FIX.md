# 文档179"重新提取"按钮问题修复报告

## 问题症状

用户点击文档179详情页的"重新提取"按钮后，前端仍然显示"暂无保单价值表数据"。

## 根本原因

### 数据存储层面
- ✅ **后端数据存在**：数据库中确实有42条AnnualValue记录
- ✅ **HTML解析器工作正常**：成功从PlanTable提取数据并保存到AnnualValue模型
- ❌ **API返回数据不完整**：`get_document_detail` API只返回`table1`字段（JSON字符串），未包含AnnualValue数据

### 前端显示层面
- 前端代码检查 `document.table1.data` 是否存在
- 如果 `table1` 为空 → 显示"暂无保单价值表数据"
- 旧的提取流程会更新 `table1` 字段
- 新的HTML解析器只更新 `AnnualValue` 表，不更新 `table1` 字段

## 解决方案

### 修改文件：`api/ocr_views.py`（第332-346行）

**修改前**：
```python
# 解析table1和table2 JSON字符串为对象
table1_data = None
if doc.table1:
    try:
        table1_data = json.loads(doc.table1)
    except (json.JSONDecodeError, TypeError):
        table1_data = None
```

**修改后**：
```python
# 解析table1和table2 JSON字符串为对象
# 优先从AnnualValue数据库获取（HTML解析器存储在这里）
table1_data = None
if doc.annual_values.exists():
    # 从AnnualValue构建table1数据结构
    annual_values = doc.annual_values.all().order_by('policy_year')
    table1_data = {
        'table_name': '保单年度价值表',
        'fields': ['保单年度终结', '保证现金价值', '非保证现金价值', '总现金价值'],
        'data': []
    }
    for av in annual_values:
        table1_data['data'].append([
            av.policy_year,
            str(av.guaranteed_cash_value) if av.guaranteed_cash_value is not None else '-',
            str(av.non_guaranteed_cash_value) if av.non_guaranteed_cash_value is not None else '-',
            str(av.total_cash_value) if av.total_cash_value is not None else '-'
        ])
elif doc.table1:
    # 如果没有AnnualValue，尝试从table1字段获取（旧方式）
    try:
        table1_data = json.loads(doc.table1)
    except (json.JSONDecodeError, TypeError):
        table1_data = None
```

### 修改逻辑

1. **优先级调整**：
   - 第一优先：从 `AnnualValue` 数据库获取（HTML解析器存储位置）
   - 第二优先：从 `table1` 字段获取（旧API存储位置）

2. **数据结构统一**：
   - 构建与前端期望一致的数据格式
   - `table_name`: 表格名称
   - `fields`: 列名数组
   - `data`: 二维数组（行数据）

3. **向后兼容**：
   - 不影响没有使用HTML解析器的旧文档
   - 保留对 `table1` 字段的支持

## 验证结果

### 数据库验证
```python
文档: 12岁女孩万通富饶万家-25000-5年.pdf
AnnualValue记录数: 42

table1数据结构:
  表格名称: 保单年度价值表
  字段: ['保单年度终结', '保证现金价值', '非保证现金价值', '总现金价值']
  数据行数: 42

前3行数据:
    [1, '0.00', '-', '25000.00']
    [2, '0.00', '-', '50000.00']
    [3, '3871.00', '-', '75000.00']
```

### API响应示例
```json
{
  "status": "success",
  "data": {
    "id": 179,
    "table1": {
      "table_name": "保单年度价值表",
      "fields": ["保单年度终结", "保证现金价值", "非保证现金价值", "总现金价值"],
      "data": [
        [1, "0.00", "-", "25000.00"],
        [2, "0.00", "-", "50000.00"],
        [3, "3871.00", "-", "75000.00"],
        ...
        [120, "223128.00", "-", "125000.00"]
      ]
    }
  }
}
```

## 使用方法

### 1. 确认Django服务已重启
```bash
sudo supervisorctl restart harry-insurance:harry-insurance-django
```

### 2. 刷新前端页面
- 打开文档179详情页
- 硬刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）
- 或直接重新打开页面

### 3. 查看结果
- 展开"保单价值表"卡片
- 应该能看到42行数据（年度1-120）
- 包含4列：保单年度终结、保证现金价值、非保证现金价值、总现金价值

### 4. 如果仍然看不到数据
可以点击"重新提取"按钮：
- 这会再次调用HTML解析器
- 更新AnnualValue数据库
- API自动返回最新数据

## 技术要点

### 为什么之前点击"重新提取"无效？

1. **按钮功能正常**：
   - 调用 `reextract_table1` API ✓
   - HTML解析器成功提取数据 ✓
   - 保存到AnnualValue数据库 ✓

2. **前端无法看到数据**：
   - API返回成功状态 ✓
   - 但 `table1` 字段仍为空 ✗
   - 前端刷新后仍然显示"暂无数据" ✗

3. **缺失的环节**：
   - `get_document_detail` 没有从AnnualValue读取数据
   - 只检查了 `doc.table1` 字段（空的）
   - 导致前端收到的 `table1` 为 `null`

### 修复后的工作流程

```
用户点击"重新提取"
    ↓
POST /api/ocr/documents/179/reextract-table1/
    ↓
HTML解析器提取数据
    ↓
保存到AnnualValue表（42条记录）
    ↓
返回成功状态
    ↓
前端轮询状态（等待processing_stage完成）
    ↓
前端调用GET /api/ocr/documents/179/
    ↓
后端检查AnnualValue表 ✓ (新增逻辑)
    ↓
构建table1数据结构
    ↓
返回给前端
    ↓
前端显示42行数据 ✓
```

## 影响范围

### 受益文档
- ✅ 所有通过HTML解析器提取数据的文档（如文档179）
- ✅ 所有有AnnualValue记录但table1为空的文档

### 不受影响文档
- ✅ 已有table1数据的旧文档（向后兼容）
- ✅ 正在处理中的文档

## 相关文件

- **修复文件**：`api/ocr_views.py`（get_document_detail函数）
- **HTML解析器**：`api/html_table_parser.py`
- **数据模型**：`api/models.py`（PlanDocument, AnnualValue）
- **前端组件**：`frontend/src/components/DocumentDetail.jsx`

## 测试检查清单

- [x] Django服务已重启
- [x] 数据库中有42条AnnualValue记录
- [x] API返回包含table1数据
- [x] table1.data包含42行数据
- [x] 数据格式与前端期望一致
- [ ] 前端页面刷新后显示数据（需要用户确认）

---

**修复时间**：2026-01-21
**开发者**：Claude Code
**版本**：1.0.1（HTML解析器集成修复）
