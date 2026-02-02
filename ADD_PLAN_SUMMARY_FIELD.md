# InsuranceProduct 新增字段：plan_summary (计划书产品概要)

## 更新时间
2026-01-26

## 变更内容

为 `InsuranceProduct` 模型新增 **plan_summary** 字段，用于存储产品在计划书中的概要描述。

## 字段详情

### plan_summary (计划书产品概要)

- **类型**: TextField
- **中文名**: 计划书产品概要
- **必填**: 否 (blank=True)
- **默认值**: 空字符串
- **最大长度**: 无限制
- **用途**: 产品在计划书中的概要描述，用于快速了解产品核心信息

### 数据结构建议

```text
【产品名称】XXX储蓄寿险计划

【产品特点】
• 特点1：说明
• 特点2：说明
• 特点3：说明
• 特点4：说明

【适合人群】
• 人群1
• 人群2
• 人群3

【核心优势】
1. 优势1
2. 优势2
3. 优势3
```

### 示例数据

```text
【产品名称】环宇盈活储蓄寿险计划

【产品特点】
• 灵活缴费：1年期/5年期可选
• 稳健增值：保证现金价值 + 非保证红利
• 货币选择：支持美元/港币
• 传承规划：可指定受益人，财富传承

【适合人群】
• 25-50岁中高收入人士
• 希望进行长期财富规划
• 为子女教育、退休养老做准备

【核心优势】
1. 友邦集团百年品牌，信誉保证
2. 现金价值持续增长，保障财富增值
3. 灵活提取，满足不同人生阶段需求
```

## 数据库变更

### 迁移文件
- 文件名: `0053_add_plan_summary_to_product.py`
- 路径: `api/migrations/0053_add_plan_summary_to_product.py`

### SQL 语句（自动执行）
```sql
ALTER TABLE `insurance_products`
ADD COLUMN `plan_summary` longtext NOT NULL DEFAULT '';
```

## 模型变更

### 文件位置
`api/models.py:900-905`

### 代码
```python
# 计划书产品概要
plan_summary = models.TextField(
    verbose_name='计划书产品概要',
    blank=True,
    help_text='产品在计划书中的概要描述，用于快速了解产品核心信息'
)
```

## Admin 后台变更

### 文件位置
`api/admin.py:917`

### 变更内容
在 "基本信息" 字段组中添加 `plan_summary` 字段：

```python
('基本信息', {
    'fields': ('company', 'product_name', 'description', 'plan_summary'),
    'description': '产品的基本信息'
}),
```

## 使用场景

### 1. 产品详情页展示
```python
from api.models import InsuranceProduct

product = InsuranceProduct.objects.get(id=1)
print(product.plan_summary)
```

### 2. API 返回
```json
{
  "id": 1,
  "product_name": "环宇盈活储蓄寿险计划",
  "company": "友邦",
  "plan_summary": "【产品名称】环宇盈活储蓄寿险计划\n\n【产品特点】\n• 灵活缴费：1年期/5年期可选\n..."
}
```

### 3. 计划书生成
在生成保险计划书PDF时，可以直接引用 `plan_summary` 作为产品介绍部分。

### 4. 产品对比
在 Company Comparison 页面中，可以显示产品概要，帮助用户快速了解产品特点。

## 数据填充建议

### 优先级：中

建议为以下产品优先填充 `plan_summary`：

1. **旗舰产品**（每家公司的主推产品）
2. **5年期产品**（最常见的缴费年期）
3. **高年缴保费产品**（≥ HK$50,000）

### 内容来源

1. **产品官方手册** - 提取核心特点
2. **营销资料** - 产品亮点、卖点
3. **AI生成** - 基于产品数据自动生成概要
4. **人工编写** - 理财顾问专业描述

### 批量填充脚本示例

```python
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceProduct

# 为所有友邦产品添加概要
aia_products = InsuranceProduct.objects.filter(
    company__code='aia',
    is_active=True
)

for product in aia_products:
    if not product.plan_summary:
        product.plan_summary = f'''
【产品名称】{product.product_name}

【产品特点】
• 缴费年期：{product.payment_period}年
• 年缴保费：HK${product.annual_premium:,.0f}
• 保险公司：{product.company.name}

【核心优势】
待补充...
'''
        product.save()
        print(f'✅ {product.product_name} - 概要已添加')
```

## API 扩展建议

### 1. 产品详情API
```python
# api/views.py
@api_view(['GET'])
def get_product_detail(request, product_id):
    product = InsuranceProduct.objects.get(id=product_id)
    return Response({
        'id': product.id,
        'product_name': product.product_name,
        'company': product.company.name,
        'plan_summary': product.plan_summary,  # 新增
        'payment_period': product.payment_period,
        'annual_premium': str(product.annual_premium)
    })
```

### 2. Company Comparison API
可以在对比表格中添加"产品概要"列：

```javascript
// frontend/src/components/CompanyComparison.jsx
<td className="p-2 text-sm">
  <details>
    <summary className="cursor-pointer text-blue-600">
      查看产品概要
    </summary>
    <div className="mt-2 text-gray-700 whitespace-pre-line">
      {product.plan_summary}
    </div>
  </details>
</td>
```

## 字段统计

### 更新前
- 总字段数：18个
- AI推荐字段：7个（0%完整度）
- 产品描述字段：1个（description，~20%完整度）

### 更新后
- **总字段数：19个** ✅
- AI推荐字段：7个（0%完整度）
- **产品描述字段：2个** ✅
  - `description` - 简短描述（~20%完整度）
  - `plan_summary` - 计划书概要（0%完整度，待填充）

## 完整字段列表（更新后）

```
📦 InsuranceProduct (19个字段)
├── 🏢 关联字段 (1个)
│   └── company
├── 📝 基本信息 (5个) ⬆️
│   ├── product_name
│   ├── payment_period
│   ├── annual_premium
│   ├── description
│   └── plan_summary ✨ NEW
├── 📊 数据表格 (2个)
│   ├── surrender_value_table
│   └── death_benefit_table
├── 🎯 AI推荐元数据 (7个)
│   ├── target_age_min
│   ├── target_age_max
│   ├── target_life_stage
│   ├── coverage_type
│   ├── min_annual_income
│   ├── features
│   └── ai_recommendation_prompt
├── ⚙️ 产品特性 (2个)
│   ├── is_withdrawal
│   └── is_active
└── 📅 系统字段 (3个)
    ├── sort_order
    ├── created_at
    └── updated_at
```

## 测试验证

### 验证步骤

1. ✅ 检查字段是否添加成功
```bash
python3 manage.py shell
>>> from api.models import InsuranceProduct
>>> product = InsuranceProduct.objects.first()
>>> hasattr(product, 'plan_summary')
True
```

2. ✅ 测试字段读写
```python
product.plan_summary = "测试内容"
product.save()
print(product.plan_summary)  # 输出: 测试内容
```

3. ✅ 检查Admin后台
访问 `/admin/api/insuranceproduct/` 查看是否显示新字段

4. ✅ 测试示例数据
```python
product = InsuranceProduct.objects.get(id=21)
print(product.plan_summary)
# 输出完整的计划书概要
```

## 回滚方案

如果需要回滚此变更：

```bash
# 回滚迁移
python3 manage.py migrate api 0052_change_life_stage_to_tags

# 或手动删除字段
python3 manage.py dbshell
mysql> ALTER TABLE insurance_products DROP COLUMN plan_summary;
```

## 相关文件

- ✅ 模型定义: `api/models.py`
- ✅ 迁移文件: `api/migrations/0053_add_plan_summary_to_product.py`
- ✅ Admin配置: `api/admin.py`
- ✅ 字段文档: `INSURANCE_PRODUCT_FIELDS.md` (需更新)

## 下一步工作

1. ⚪ 为所有27个产品填充 `plan_summary`
2. ⚪ 更新 API 返回 `plan_summary` 字段
3. ⚪ 在前端产品详情页显示概要
4. ⚪ 在 Company Comparison 添加"产品概要"展示
5. ⚪ 更新 `INSURANCE_PRODUCT_FIELDS.md` 文档

## 总结

✅ 成功为 `InsuranceProduct` 模型添加 `plan_summary` 字段
✅ 数据库迁移已完成
✅ Admin 后台已配置
✅ 字段测试通过

**新字段总数**: 19个（从18个增加到19个）

**建议下一步**: 为旗舰产品填充 `plan_summary` 数据，提升产品展示的完整性。
