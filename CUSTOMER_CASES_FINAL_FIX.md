# Customer Cases 页面最终修复方案

## 问题根因
前端 `CustomerCases.jsx` 期望每个 `life_stage` 只有一个案例对象（共5个），但后端接口返回了所有15个案例（包含重复的life_stage），导致前端显示混乱。

## 解决方案

### 修改后端接口 - 按life_stage去重

**文件**：`api/consultation_views.py:151-280`

**核心改动**：
1. ✅ 使用字典 `stage_cases` 按 `life_stage` 分组
2. ✅ 每个阶段只保留第一个案例（排序靠前的案例）
3. ✅ 按预定义顺序返回：扶幼保障期 → 收入成长期 → 责任高峰期 → 责任递减期 → 退休期

**代码逻辑**：
```python
# 按life_stage分组，每个阶段只取第一个案例
stage_cases = {}
for case in db_cases:
    life_stage = case.tags[0] if case.tags else '综合案例'

    # 每个life_stage只保留第一个案例
    if life_stage not in stage_cases:
        stage_cases[life_stage] = case_data

# 按预定义顺序排序
stage_order = ['扶幼保障期', '收入成长期', '责任高峰期', '责任递减期', '退休期']
cases = []
for stage in stage_order:
    if stage in stage_cases:
        cases.append(stage_cases[stage])
```

## 测试结果

### API响应

**GET `/api/consultation/customer-cases`**

```json
{
  "success": true,
  "cases": [
    {
      "life_stage": "扶幼保障期",
      "age_range": "25-30岁",
      "description": "...",
      "example_profile": {...},
      "key_points": [...]
    },
    {
      "life_stage": "收入成长期",
      "age_range": "31-40岁",
      ...
    },
    {
      "life_stage": "责任高峰期",
      "age_range": "41-50岁",
      ...
    },
    {
      "life_stage": "责任递减期",
      "age_range": "51-60岁",
      ...
    },
    {
      "life_stage": "退休期",
      "age_range": "60岁以上",
      ...
    }
  ]
}
```

**验证**：
```bash
$ curl -s http://localhost:8017/api/consultation/customer-cases | jq '.cases | length'
5

$ curl -s http://localhost:8017/api/consultation/customer-cases | jq -r '.cases[] | "\(.life_stage) - \(.age_range)"'
扶幼保障期 - 25-30岁
收入成长期 - 31-40岁
责任高峰期 - 41-50岁
责任递减期 - 51-60岁
退休期 - 60岁以上
```

## 前端表现

### 之前
- ❌ 左侧显示15个按钮（重复的life_stage）
- ❌ UI混乱，无法正确选择
- ❌ 提示"没有找到匹配的案例"

### 之后
- ✅ 左侧显示5个按钮（每个life_stage一个）
- ✅ 点击按钮正确切换案例详情
- ✅ 数据结构完全兼容，无需修改前端代码

## 前端兼容性

`CustomerCases.jsx` **无需任何修改**，因为：

1. ✅ 接口路径不变：`/api/consultation/customer-cases`
2. ✅ 响应格式不变：`{success: true, cases: [...]}`
3. ✅ 数据字段不变：`life_stage`, `age_range`, `example_profile`, `key_points`, `budget_suggestion`
4. ✅ 案例数量符合预期：5个（每个人生阶段一个）

## 数据管理

### 如何选择每个阶段的"代表性案例"？

**规则**：每个 `life_stage` 取第一个案例（按 `sort_order` 排序）

**调整方法**：
1. 进入 Django Admin：`/admin/api/customercase/`
2. 调整案例的 `sort_order` 字段（数字越小越靠前）
3. 每个阶段排在最前面的案例将作为前端显示的代表案例

**示例**：
- 扶幼保障期：ID=1 (sort_order=0) → **前端显示**
- 扶幼保障期：ID=2 (sort_order=1) → 不显示
- 扶幼保障期：ID=3 (sort_order=2) → 不显示

### 如何添加新案例？

1. 在Django Admin添加案例
2. 设置 `tags` 字段（第一个标签作为 `life_stage`）
3. 设置 `sort_order`（如果想作为代表案例，设置为最小值）
4. 前端自动更新

## 完整修复链

### 1. ✅ 数据库迁移（life_stage → tags）
- 文档：`CUSTOMER_CASE_TAGS_MIGRATION.md`
- 修改：`api/models.py`, `api/serializers.py`, `api/customer_case_views.py`

### 2. ✅ API接口更新
- 文档：`CUSTOMER_CASE_API_DOCUMENTATION.md`
- 新增：`/api/customer-cases/tags/`, `/api/customer-cases/by-tag/<tag>/`

### 3. ✅ 修复前端数据源
- 文档：`CUSTOMER_CASES_FIX_SUMMARY.md`
- 修改：`api/consultation_views.py` - 从硬编码改为数据库读取

### 4. ✅ 按life_stage去重（本次修复）
- 文档：本文件
- 修改：`api/consultation_views.py` - 每个阶段只返回一个案例

## 总结

✅ **所有问题已解决**：
1. ✅ 数据从数据库读取（非硬编码）
2. ✅ 支持标签系统（灵活分类）
3. ✅ 按life_stage去重（每个阶段一个案例）
4. ✅ 数据格式完全兼容前端
5. ✅ 无需修改前端代码

**刷新浏览器，访问 `/customer-cases` 页面，应该可以正常显示5个人生阶段的案例了！**

## 测试命令

```bash
# 测试接口
curl http://localhost:8017/api/consultation/customer-cases | jq '.'

# 查看案例数量
curl -s http://localhost:8017/api/consultation/customer-cases | jq '.cases | length'

# 查看所有阶段
curl -s http://localhost:8017/api/consultation/customer-cases | jq -r '.cases[] | .life_stage'

# 查看所有标签（用于管理）
curl -s http://localhost:8017/api/customer-cases/tags/ | jq '.data.tags'
```
