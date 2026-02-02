# ProductPlan（产品缴费方案）关联表说明

## 概述

为了更好地管理同一保险产品的不同缴费年期方案，我们创建了 `ProductPlan` 关联表。这样可以避免为每个缴费年期创建重复的产品记录，符合数据库规范化设计原则。

## 设计原理

### 问题背景
原来的设计中，`InsuranceProduct` 表直接包含：
- `payment_period` - 缴费年期
- `annual_premium` - 年缴金额
- `surrender_value_table` - 退保价值表
- `death_benefit_table` - 身故赔偿表

这导致：
1. ❌ 同一产品的5年期、10年期、20年期需要创建3条产品记录
2. ❌ 产品名称、描述等基本信息重复存储
3. ❌ 数据维护困难，修改产品信息需要更新多条记录
4. ❌ 查询和统计复杂

### 新的设计

```
InsuranceProduct (产品主表)
    ├── product_name: 环宇盈活
    ├── company: 友邦
    ├── description: 产品描述
    └── plans (关联表) ──┐
                         │
    ┌────────────────────┘
    │
    ├── ProductPlan (5年期方案)
    │   ├── payment_period: 5
    │   ├── annual_premium: 50000
    │   ├── total_premium: 250000
    │   ├── surrender_value_table: {...}
    │   └── death_benefit_table: {...}
    │
    ├── ProductPlan (10年期方案)
    │   ├── payment_period: 10
    │   ├── annual_premium: 30000
    │   ├── total_premium: 300000
    │   ├── surrender_value_table: {...}
    │   └── death_benefit_table: {...}
    │
    └── ProductPlan (20年期方案)
        ├── payment_period: 20
        ├── annual_premium: 20000
        ├── total_premium: 400000
        ├── surrender_value_table: {...}
        └── death_benefit_table: {...}
```

## 数据库结构

### ProductPlan 表字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | BigInt | 主键 |
| `product_id` | ForeignKey | 关联产品ID |
| `plan_name` | VARCHAR(100) | 方案名称（自动生成） |
| `payment_period` | Integer | 缴费年期（5、10、20等） |
| `annual_premium` | Decimal(15,2) | 年缴金额 |
| `total_premium` | Decimal(15,2) | 总保费（自动计算） |
| `surrender_value_table` | TEXT | 退保价值表（JSON格式） |
| `death_benefit_table` | TEXT | 身故赔偿表（JSON格式） |
| `irr_rate` | Decimal(6,2) | 内部回报率（IRR %） |
| `plan_description` | TEXT | 方案说明 |
| `is_recommended` | Boolean | 是否推荐方案 |
| `is_active` | Boolean | 是否启用 |
| `sort_order` | Integer | 排序 |
| `created_at` | DateTime | 创建时间 |
| `updated_at` | DateTime | 更新时间 |

### 约束和索引

```sql
-- 唯一约束：同一产品不能有重复的缴费年期
UNIQUE (product_id, payment_period)

-- 索引
INDEX idx_product_is_active (product_id, is_active)
INDEX idx_product_payment_period (product_id, payment_period)
```

## 使用方法

### 1. Admin 后台管理

#### 方式1：在产品页面管理（推荐）

访问产品编辑页面：
```
http://your-domain:8017/admin/api/insuranceproduct/{product_id}/change/
```

在页面底部可以看到「**产品缴费方案**」内联表格：

| 方案名称 | 缴费年期 | 年缴金额 | 总保费 | IRR | 推荐 | 启用 | 排序 |
|---------|---------|---------|-------|-----|------|------|------|
| 5年缴费方案 | 5 | 50000 | 250000 | 4.5 | ✅ | ✅ | 0 |
| 10年缴费方案 | 10 | 30000 | 300000 | 5.2 | - | ✅ | 0 |

点击「添加另一个 产品缴费方案」即可新增。

#### 方式2：独立管理页面

访问缴费方案列表：
```
http://your-domain:8017/admin/api/productplan/
```

可以查看、搜索、筛选所有产品的缴费方案。

### 2. Python 代码操作

#### 创建缴费方案

```python
from api.models import InsuranceProduct, ProductPlan
import json

# 获取产品
product = InsuranceProduct.objects.get(id=21)

# 创建5年期方案
plan_5 = ProductPlan.objects.create(
    product=product,
    payment_period=5,
    annual_premium=50000,
    irr_rate=4.5,
    surrender_value_table=json.dumps([
        {"year": 1, "guaranteed": 0, "non_guaranteed": 0, "total": 0, "premiums_paid": 50000},
        {"year": 5, "guaranteed": 200000, "non_guaranteed": 50000, "total": 250000, "premiums_paid": 250000},
        {"year": 10, "guaranteed": 300000, "non_guaranteed": 100000, "total": 400000, "premiums_paid": 250000}
    ]),
    death_benefit_table=json.dumps([
        {"year": 1, "benefit": 100000},
        {"year": 5, "benefit": 250000},
        {"year": 10, "benefit": 400000}
    ]),
    is_recommended=True
)

# 总保费和方案名称会自动生成
print(f"方案名称: {plan_5.plan_name}")  # 5年缴费方案
print(f"总保费: {plan_5.total_premium}")  # 250000
```

#### 查询产品的所有方案

```python
# 获取产品的所有方案
product = InsuranceProduct.objects.get(id=21)
plans = product.plans.all()

for plan in plans:
    print(f"{plan.plan_name}: 年缴${plan.annual_premium:,.0f}")

# 获取推荐方案
recommended_plans = product.plans.filter(is_recommended=True)

# 获取特定年期的方案
plan_10 = product.plans.get(payment_period=10)
```

#### 更新方案

```python
plan = ProductPlan.objects.get(id=1)
plan.annual_premium = 55000
plan.irr_rate = 4.8
plan.save()  # 总保费会自动重新计算
```

#### 删除方案

```python
ProductPlan.objects.filter(product_id=21, payment_period=5).delete()
```

### 3. API 接口设计建议

#### 获取产品详情（包含所有缴费方案）

```python
# views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from api.models import InsuranceProduct
import json

@api_view(['GET'])
def get_product_with_plans(request, product_id):
    product = InsuranceProduct.objects.get(id=product_id)

    plans_data = []
    for plan in product.plans.filter(is_active=True).order_by('sort_order', 'payment_period'):
        plans_data.append({
            'id': plan.id,
            'plan_name': plan.plan_name,
            'payment_period': plan.payment_period,
            'annual_premium': float(plan.annual_premium),
            'total_premium': float(plan.total_premium) if plan.total_premium else None,
            'irr_rate': float(plan.irr_rate) if plan.irr_rate else None,
            'surrender_value_table': json.loads(plan.surrender_value_table) if plan.surrender_value_table else [],
            'death_benefit_table': json.loads(plan.death_benefit_table) if plan.death_benefit_table else [],
            'plan_description': plan.plan_description,
            'is_recommended': plan.is_recommended
        })

    return Response({
        'status': 'success',
        'data': {
            'product_id': product.id,
            'product_name': product.product_name,
            'company': product.company.name,
            'description': product.description,
            'plans': plans_data
        }
    })
```

#### 前端调用示例

```javascript
// 获取产品和所有缴费方案
const response = await fetch(`/api/products/${productId}/with-plans/`);
const data = await response.json();

// 显示所有缴费方案
data.data.plans.forEach(plan => {
    console.log(`${plan.plan_name}: 年缴${plan.annual_premium}元`);
    console.log(`推荐: ${plan.is_recommended ? '是' : '否'}`);

    // 显示退保价值表
    plan.surrender_value_table.forEach(item => {
        console.log(`第${item.year}年: 总价值${item.total}元`);
    });
});

// 筛选推荐方案
const recommendedPlans = data.data.plans.filter(p => p.is_recommended);
```

## JSON 数据格式

### surrender_value_table（退保价值表）

```json
[
  {
    "year": 1,
    "guaranteed": 0,
    "non_guaranteed": 0,
    "total": 0,
    "premiums_paid": 50000
  },
  {
    "year": 5,
    "guaranteed": 200000,
    "non_guaranteed": 50000,
    "total": 250000,
    "premiums_paid": 250000
  },
  {
    "year": 10,
    "guaranteed": 300000,
    "non_guaranteed": 100000,
    "total": 400000,
    "premiums_paid": 250000
  }
]
```

**字段说明**：
- `year`: 保单年度
- `guaranteed`: 保证现金价值
- `non_guaranteed`: 非保证现金价值
- `total`: 总现金价值（预期价值）
- `premiums_paid`: 已缴保费（累计）

### death_benefit_table（身故赔偿表）

```json
[
  {
    "year": 1,
    "benefit": 100000
  },
  {
    "year": 5,
    "benefit": 250000
  },
  {
    "year": 10,
    "benefit": 400000
  }
]
```

**字段说明**：
- `year`: 保单年度
- `benefit`: 身故赔偿金额

## 自动计算功能

ProductPlan 模型重写了 `save()` 方法，提供以下自动计算功能：

### 1. 自动计算总保费

```python
# 保存前自动计算
total_premium = annual_premium × payment_period
```

示例：
- 年缴 $50,000 × 5年 = 总保费 $250,000

### 2. 自动生成方案名称

如果 `plan_name` 为空，自动生成：

```python
plan_name = f"{payment_period}年缴费方案"
```

示例：
- `payment_period = 5` → `plan_name = "5年缴费方案"`
- `payment_period = 10` → `plan_name = "10年缴费方案"`

## 数据迁移指南

### 从旧结构迁移到新结构

如果您已有的数据使用旧的 `InsuranceProduct` 字段，可以使用以下脚本迁移：

```python
from api.models import InsuranceProduct, ProductPlan

# 获取所有有缴费数据的旧产品
old_products = InsuranceProduct.objects.exclude(
    payment_period__isnull=True
).exclude(
    annual_premium__isnull=True
)

for old_product in old_products:
    # 检查是否已经迁移
    if ProductPlan.objects.filter(
        product=old_product,
        payment_period=old_product.payment_period
    ).exists():
        print(f"⚠️  {old_product.product_name} 的 {old_product.payment_period}年期方案已存在，跳过")
        continue

    # 创建新的缴费方案
    plan = ProductPlan.objects.create(
        product=old_product,
        payment_period=old_product.payment_period,
        annual_premium=old_product.annual_premium,
        surrender_value_table=old_product.surrender_value_table,
        death_benefit_table=old_product.death_benefit_table,
        is_active=old_product.is_active
    )

    print(f"✅ 迁移完成: {old_product.product_name} - {plan.plan_name}")

print("\n✅ 数据迁移完成！")
print("⚠️  注意：旧字段已标记为「已废弃」，但数据仍保留以保证向后兼容")
```

### 清理旧数据（可选）

迁移完成并验证无误后，可以清空旧字段：

```python
InsuranceProduct.objects.update(
    payment_period=None,
    annual_premium=None,
    surrender_value_table='',
    death_benefit_table=''
)
```

## 向后兼容性

为了保证平滑过渡，`InsuranceProduct` 的旧字段仍然保留，但已标记为「已废弃」：

- ✅ 旧数据不会丢失
- ✅ 旧的API调用仍然有效
- ✅ 可以逐步迁移到新结构
- ⚠️ 新数据建议直接使用 ProductPlan

## 最佳实践

### 1. 推荐方案标记

建议为每个产品标记1-2个推荐方案：

```python
# 设置推荐方案
product.plans.filter(payment_period=10).update(is_recommended=True)

# 前端优先显示推荐方案
recommended = product.plans.filter(is_recommended=True)
```

### 2. IRR 计算

虽然模型中有 `irr_rate` 字段，但建议：
- 保险公司提供的IRR直接存储
- 自己计算的IRR可以使用Python的 `numpy.irr()` 函数

### 3. 排序策略

默认排序：`product` → `sort_order` → `payment_period`

自定义排序：
```python
# 按IRR降序
plans = product.plans.order_by('-irr_rate')

# 推荐方案优先
plans = product.plans.order_by('-is_recommended', 'payment_period')
```

### 4. 前端展示建议

```
产品名称：环宇盈活

可选缴费方案：
┌─────────────────────────────────────────┐
│ ⭐ 5年期方案（推荐）                      │
│    年缴：$50,000                         │
│    总保费：$250,000                      │
│    IRR：4.5%                             │
│    [查看详情] [选择此方案]                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 10年期方案                               │
│    年缴：$30,000                         │
│    总保费：$300,000                      │
│    IRR：5.2%                             │
│    [查看详情] [选择此方案]                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 20年期方案                               │
│    年缴：$20,000                         │
│    总保费：$400,000                      │
│    IRR：5.8%（最高回报）                 │
│    [查看详情] [选择此方案]                │
└─────────────────────────────────────────┘
```

## 常见问题

### Q1: 为什么不直接删除旧字段？

A: 为了向后兼容，避免影响现有数据和代码。旧字段标记为「已废弃」，但仍然保留。

### Q2: 如何处理同一产品的不同保额？

A: 如果同一产品、同一缴费年期有不同保额选项，建议：
- 方案1：在 `plan_description` 中说明保额
- 方案2：创建新产品（如：环宇盈活-50万保额、环宇盈活-100万保额）

### Q3: 退保价值表的年度范围是多少？

A: 建议存储关键年份的数据（如1、5、10、20、30年），前端可以通过插值计算中间年份。

### Q4: 如何批量导入缴费方案？

A: 可以使用Django的 `bulk_create()`:

```python
plans = [
    ProductPlan(product=product, payment_period=5, annual_premium=50000, ...),
    ProductPlan(product=product, payment_period=10, annual_premium=30000, ...),
    ProductPlan(product=product, payment_period=20, annual_premium=20000, ...)
]
ProductPlan.objects.bulk_create(plans)
```

## 相关文件

- 模型定义: `api/models.py` (ProductPlan class)
- Admin配置: `api/admin.py` (ProductPlanAdmin, ProductPlanInline)
- 迁移文件: `api/migrations/0057_create_product_plan_table.py`
- 测试脚本: `test_product_plan.py`

## 总结

ProductPlan 关联表的优势：

✅ **数据规范化**: 产品基本信息只存储一次
✅ **易于维护**: 修改产品描述不影响缴费方案
✅ **扩展性强**: 可以轻松添加新的缴费年期
✅ **查询高效**: 通过外键关系快速查询
✅ **唯一约束**: 避免重复数据
✅ **自动计算**: 总保费和方案名称自动生成
✅ **推荐标记**: 支持标记推荐方案
✅ **向后兼容**: 保留旧字段，平滑迁移

开始使用新的关联表结构，让您的保险产品管理更加规范和高效！
