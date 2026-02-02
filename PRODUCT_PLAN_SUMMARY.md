# ProductPlan 关联表 - 快速总结

## 问题解决

**原问题**: 同一款产品有多个缴费年期（5年、10年、20年），每个年期有不同的年缴金额、退保价值表和身故赔偿表。原来需要创建多条产品记录。

**解决方案**: 创建 `ProductPlan` 关联表，一对多关系。

```
InsuranceProduct (1) ←→ (N) ProductPlan
```

## 数据结构

### ProductPlan 表（新建）

| 字段 | 类型 | 说明 |
|------|------|------|
| product | ForeignKey | 关联产品 |
| plan_name | VARCHAR | 方案名称（自动生成：5年缴费方案） |
| payment_period | Integer | 缴费年期（5、10、20等） |
| annual_premium | Decimal | 年缴金额 |
| total_premium | Decimal | 总保费（自动计算 = 年缴 × 年期） |
| surrender_value_table | TEXT | 退保价值表（JSON） |
| death_benefit_table | TEXT | 身故赔偿表（JSON） |
| irr_rate | Decimal | 内部回报率 IRR % |
| is_recommended | Boolean | 是否推荐方案 |
| is_active | Boolean | 是否启用 |
| sort_order | Integer | 排序 |

**唯一约束**: `(product, payment_period)` - 同一产品不能有重复的缴费年期

### InsuranceProduct 表（更新）

原有的以下字段标记为「已废弃」（保留以向后兼容）：
- `payment_period` → 改用 ProductPlan
- `annual_premium` → 改用 ProductPlan
- `surrender_value_table` → 改用 ProductPlan
- `death_benefit_table` → 改用 ProductPlan

## 使用示例

### Admin 后台

访问产品编辑页面，在底部可以看到「**产品缴费方案**」内联表格，可以直接添加/编辑多个缴费方案。

### Python 代码

```python
from api.models import InsuranceProduct, ProductPlan

# 获取产品
product = InsuranceProduct.objects.get(id=21)

# 创建5年期方案
plan = ProductPlan.objects.create(
    product=product,
    payment_period=5,
    annual_premium=50000,
    surrender_value_table='[{"year": 1, ...}]',
    death_benefit_table='[{"year": 1, ...}]'
)
# 方案名称自动生成：5年缴费方案
# 总保费自动计算：250000

# 查询产品的所有方案
plans = product.plans.all()

# 获取推荐方案
recommended = product.plans.filter(is_recommended=True)
```

### API 响应示例

```json
{
  "product_name": "环宇盈活",
  "company": "友邦",
  "plans": [
    {
      "plan_name": "5年缴费方案",
      "payment_period": 5,
      "annual_premium": 50000,
      "total_premium": 250000,
      "irr_rate": 4.5,
      "is_recommended": true,
      "surrender_value_table": [...],
      "death_benefit_table": [...]
    },
    {
      "plan_name": "10年缴费方案",
      "payment_period": 10,
      "annual_premium": 30000,
      "total_premium": 300000,
      "irr_rate": 5.2,
      "is_recommended": false,
      "surrender_value_table": [...],
      "death_benefit_table": [...]
    }
  ]
}
```

## 已完成的工作

✅ 创建 ProductPlan 模型
✅ 添加数据库索引和唯一约束
✅ 创建数据库迁移并执行
✅ 更新 Admin 配置（独立页面 + 内联编辑）
✅ 标记 InsuranceProduct 旧字段为「已废弃」
✅ 实现自动计算功能（总保费、方案名称）
✅ 创建测试脚本验证功能
✅ 编写完整使用文档

## 快速测试

```bash
python3 test_product_plan.py
```

## 访问地址

- ProductPlan 独立管理: `http://your-domain:8017/admin/api/productplan/`
- 产品编辑页面（含内联方案）: `http://your-domain:8017/admin/api/insuranceproduct/{id}/change/`

## 详细文档

完整使用说明请参阅: `PRODUCT_PLAN_TABLE_GUIDE.md`
