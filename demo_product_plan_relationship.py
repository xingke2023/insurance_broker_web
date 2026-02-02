#!/usr/bin/env python3
"""
演示 InsuranceProduct 和 ProductPlan 的关系
产品品种 vs 缴费方案
"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceProduct, ProductPlan, InsuranceCompany

print("=" * 80)
print("产品品种（InsuranceProduct）和 缴费方案（ProductPlan）关系演示")
print("=" * 80)

# 获取或创建一个产品
product = InsuranceProduct.objects.first()

if not product:
    print("\n⚠️  数据库中没有产品，无法演示")
    exit(1)

# 清理旧的测试数据
ProductPlan.objects.filter(product=product, payment_period__in=[1, 2, 5]).delete()

print(f"\n📦 产品品种: {product.product_name}")
print(f"   保险公司: {product.company.name}")
print(f"   产品分类: {product.product_category or '未分类'}")
print(f"   产品ID: {product.id}")

print("\n" + "-" * 80)
print("为这个产品品种创建不同的缴费方案...")
print("-" * 80)

# 创建1年缴方案
plan_1 = ProductPlan.objects.create(
    product=product,
    payment_period=1,
    annual_premium=100000,
    irr_rate=3.5,
    plan_description="一次性缴清，保费最低",
    is_recommended=False
)

# 创建2年缴方案
plan_2 = ProductPlan.objects.create(
    product=product,
    payment_period=2,
    annual_premium=55000,
    irr_rate=4.2,
    plan_description="短期缴费，资金压力适中",
    is_recommended=True
)

# 创建5年缴方案
plan_5 = ProductPlan.objects.create(
    product=product,
    payment_period=5,
    annual_premium=25000,
    irr_rate=4.8,
    plan_description="长期缴费，年缴金额最低",
    is_recommended=False
)

print("\n✅ 已创建 3 个缴费方案:")
print(f"   1. {plan_1.plan_name} - 年缴: ${plan_1.annual_premium:,.0f}, 总保费: ${plan_1.total_premium:,.0f}")
print(f"   2. {plan_2.plan_name} - 年缴: ${plan_2.annual_premium:,.0f}, 总保费: ${plan_2.total_premium:,.0f} ⭐ (推荐)")
print(f"   3. {plan_5.plan_name} - 年缴: ${plan_5.annual_premium:,.0f}, 总保费: ${plan_5.total_premium:,.0f}")

print("\n" + "=" * 80)
print("数据库关系展示")
print("=" * 80)

print(f"""
┌────────────────────────────────────────────────────────┐
│ InsuranceProduct (产品品种表)                           │
├────────────────────────────────────────────────────────┤
│ ID: {product.id:<50} │
│ 产品名称: {product.product_name:<42} │
│ 公司: {product.company.name:<48} │
│ 分类: {(product.product_category or '未分类'):<48} │
└────────────────────────────────────────────────────────┘
                        │
                        │ (一对多关系)
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ ProductPlan 1 │ │ ProductPlan 2 │ │ ProductPlan 3 │
├───────────────┤ ├───────────────┤ ├───────────────┤
│ 1年缴费方案    │ │ 2年缴费方案    │ │ 5年缴费方案    │
│ 年缴: $100K   │ │ 年缴: $55K    │ │ 年缴: $25K    │
│ 总保费: $100K │ │ 总保费: $110K │ │ 总保费: $125K │
│ IRR: 3.5%     │ │ IRR: 4.2% ⭐  │ │ IRR: 4.8%     │
└───────────────┘ └───────────────┘ └───────────────┘
""")

print("\n" + "=" * 80)
print("通过代码访问关系")
print("=" * 80)

print("\n# 方法1: 从产品获取所有缴费方案")
print(f"product = InsuranceProduct.objects.get(id={product.id})")
print("plans = product.plans.all()")
print(f"\n查询结果: 找到 {product.plans.count()} 个缴费方案")

for plan in product.plans.all():
    tag = "⭐ 推荐" if plan.is_recommended else ""
    print(f"  - {plan.plan_name}: {plan.payment_period}年缴, 年缴${plan.annual_premium:,.0f} {tag}")

print("\n# 方法2: 从缴费方案反向查询产品")
print(f"plan = ProductPlan.objects.get(id={plan_2.id})")
print("product = plan.product")
print(f"\n查询结果: 该方案属于产品「{plan_2.product.product_name}」")

print("\n# 方法3: 筛选推荐方案")
print(f"recommended = product.plans.filter(is_recommended=True)")
recommended_plans = product.plans.filter(is_recommended=True)
print(f"\n查询结果: 找到 {recommended_plans.count()} 个推荐方案")
for plan in recommended_plans:
    print(f"  - {plan.plan_name}")

print("\n" + "=" * 80)
print("实际应用场景")
print("=" * 80)

print("""
场景1: 用户浏览产品
-------------------------------
用户看到: "盛御守护重疾保障计划"

系统展示:
  📦 产品: 盛御守护重疾保障计划
  🏢 公司: 友邦

  可选缴费方案:
  ┌─────────────────────────────┐
  │ ○ 1年缴费方案                │
  │   年缴: $100,000            │
  │   总保费: $100,000          │
  │   一次性缴清，保费最低        │
  ├─────────────────────────────┤
  │ ● 2年缴费方案 ⭐ (推荐)      │
  │   年缴: $55,000             │
  │   总保费: $110,000          │
  │   短期缴费，资金压力适中      │
  ├─────────────────────────────┤
  │ ○ 5年缴费方案                │
  │   年缴: $25,000             │
  │   总保费: $125,000          │
  │   长期缴费，年缴金额最低      │
  └─────────────────────────────┘

场景2: 产品对比
-------------------------------
对比三个不同的产品品种：
- 友邦 盛御守护 (3个缴费方案)
- 保诚 守护宝 (4个缴费方案)
- 宏利 康健保 (2个缴费方案)

每个产品可以选择不同的缴费年期进行对比

场景3: 管理后台
-------------------------------
1. 创建新产品品种: "盛御守护重疾保障计划"
2. 为该产品添加缴费方案:
   - 添加 1年缴方案
   - 添加 2年缴方案
   - 添加 5年缴方案
   - 标记 2年缴为推荐方案
""")

print("\n" + "=" * 80)
print("✅ 演示完成！")
print("=" * 80)

print("\n📊 数据统计:")
total_products = InsuranceProduct.objects.count()
total_plans = ProductPlan.objects.count()
print(f"   系统中共有: {total_products} 个产品品种")
print(f"   系统中共有: {total_plans} 个缴费方案")
print(f"   平均每个产品有: {total_plans/total_products:.1f} 个缴费方案")

print("\n💡 设计优势:")
print("   ✅ 产品品种信息只存储一次（公司、名称、描述等）")
print("   ✅ 缴费方案独立管理，易于添加/修改/删除")
print("   ✅ 同一产品可以有任意多个缴费年期选择")
print("   ✅ 支持标记推荐方案，引导用户选择")
print("   ✅ 每个方案有独立的退保价值表和身故赔偿表")

print("\n🔗 访问后台管理:")
print(f"   产品列表: http://your-domain:8017/admin/api/insuranceproduct/")
print(f"   编辑产品: http://your-domain:8017/admin/api/insuranceproduct/{product.id}/change/")
print(f"   缴费方案: http://your-domain:8017/admin/api/productplan/")

# 清理测试数据
print("\n是否清理测试数据? (y/N): ", end="")
response = input().strip().lower()
if response == 'y':
    ProductPlan.objects.filter(product=product, payment_period__in=[1, 2, 5]).delete()
    print("✅ 测试数据已清理")
else:
    print("✅ 测试数据保留（可在Admin后台查看）")
