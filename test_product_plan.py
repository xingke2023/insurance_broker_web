#!/usr/bin/env python3
"""
测试 ProductPlan（产品缴费方案）功能
"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceProduct, ProductPlan

print("=" * 80)
print("测试 ProductPlan（产品缴费方案）功能")
print("=" * 80)

# 获取一个产品
product = InsuranceProduct.objects.first()

if not product:
    print("\n⚠️  数据库中没有产品数据，请先在Admin后台创建产品")
    exit(1)

print(f"\n✅ 测试产品: {product.product_name}")
print(f"   公司: {product.company.name}")
print(f"   产品ID: {product.id}")

# 创建测试方案
print("\n" + "=" * 80)
print("1. 创建缴费方案")
print("=" * 80)

# 删除旧的测试数据
ProductPlan.objects.filter(product=product, payment_period__in=[5, 10, 20]).delete()

# 创建5年期方案
plan_5 = ProductPlan.objects.create(
    product=product,
    payment_period=5,
    annual_premium=50000,
    irr_rate=4.5,
    surrender_value_table=json.dumps([
        {"year": 1, "guaranteed": 0, "non_guaranteed": 0, "total": 0, "premiums_paid": 50000},
        {"year": 5, "guaranteed": 200000, "non_guaranteed": 50000, "total": 250000, "premiums_paid": 250000},
        {"year": 10, "guaranteed": 300000, "non_guaranteed": 100000, "total": 400000, "premiums_paid": 250000},
    ]),
    death_benefit_table=json.dumps([
        {"year": 1, "benefit": 100000},
        {"year": 5, "benefit": 250000},
        {"year": 10, "benefit": 400000},
    ]),
    is_recommended=True
)
print(f"✅ 创建5年期方案: {plan_5.plan_name}")
print(f"   年缴: ${plan_5.annual_premium:,.0f}")
print(f"   总保费: ${plan_5.total_premium:,.0f} (自动计算)")
print(f"   IRR: {plan_5.irr_rate}%")

# 创建10年期方案
plan_10 = ProductPlan.objects.create(
    product=product,
    payment_period=10,
    annual_premium=30000,
    irr_rate=5.2,
    surrender_value_table=json.dumps([
        {"year": 1, "guaranteed": 0, "non_guaranteed": 0, "total": 0, "premiums_paid": 30000},
        {"year": 10, "guaranteed": 250000, "non_guaranteed": 80000, "total": 330000, "premiums_paid": 300000},
        {"year": 20, "guaranteed": 400000, "non_guaranteed": 150000, "total": 550000, "premiums_paid": 300000},
    ]),
    death_benefit_table=json.dumps([
        {"year": 1, "benefit": 80000},
        {"year": 10, "benefit": 330000},
        {"year": 20, "benefit": 550000},
    ])
)
print(f"✅ 创建10年期方案: {plan_10.plan_name}")
print(f"   年缴: ${plan_10.annual_premium:,.0f}")
print(f"   总保费: ${plan_10.total_premium:,.0f} (自动计算)")
print(f"   IRR: {plan_10.irr_rate}%")

# 创建20年期方案
plan_20 = ProductPlan.objects.create(
    product=product,
    payment_period=20,
    annual_premium=20000,
    irr_rate=5.8,
    surrender_value_table=json.dumps([
        {"year": 1, "guaranteed": 0, "non_guaranteed": 0, "total": 0, "premiums_paid": 20000},
        {"year": 20, "guaranteed": 350000, "non_guaranteed": 100000, "total": 450000, "premiums_paid": 400000},
        {"year": 30, "guaranteed": 500000, "non_guaranteed": 200000, "total": 700000, "premiums_paid": 400000},
    ]),
    death_benefit_table=json.dumps([
        {"year": 1, "benefit": 60000},
        {"year": 20, "benefit": 450000},
        {"year": 30, "benefit": 700000},
    ])
)
print(f"✅ 创建20年期方案: {plan_20.plan_name}")
print(f"   年缴: ${plan_20.annual_premium:,.0f}")
print(f"   总保费: ${plan_20.total_premium:,.0f} (自动计算)")
print(f"   IRR: {plan_20.irr_rate}%")

# 查询产品的所有方案
print("\n" + "=" * 80)
print("2. 查询产品的所有缴费方案")
print("=" * 80)

plans = product.plans.all()
print(f"\n{product.product_name} 共有 {plans.count()} 个缴费方案：")

for plan in plans:
    print(f"\n  📋 {plan.plan_name}")
    print(f"     - 缴费年期: {plan.payment_period}年")
    print(f"     - 年缴金额: ${plan.annual_premium:,.0f}")
    print(f"     - 总保费: ${plan.total_premium:,.0f}")
    if plan.irr_rate:
        print(f"     - IRR: {plan.irr_rate}%")
    print(f"     - 推荐方案: {'✅ 是' if plan.is_recommended else '否'}")

# 测试唯一约束
print("\n" + "=" * 80)
print("3. 测试唯一约束（同一产品不能有重复的缴费年期）")
print("=" * 80)

try:
    duplicate = ProductPlan.objects.create(
        product=product,
        payment_period=5,
        annual_premium=60000
    )
    print("❌ 错误：应该抛出唯一约束错误")
except Exception as e:
    print(f"✅ 唯一约束生效: {type(e).__name__}")

# 测试数据解析
print("\n" + "=" * 80)
print("4. 测试JSON数据解析")
print("=" * 80)

plan = plans.first()
if plan and plan.surrender_value_table:
    surrender_data = json.loads(plan.surrender_value_table)
    print(f"\n{plan.plan_name} 的退保价值表:")
    print(f"{'年度':<10} {'保证现金价值':<15} {'非保证价值':<15} {'总价值':<15}")
    print("-" * 60)
    for item in surrender_data[:3]:  # 只显示前3年
        print(f"{item['year']:<10} ${item['guaranteed']:<14,} ${item['non_guaranteed']:<14,} ${item['total']:<14,}")

print("\n" + "=" * 80)
print("✅ 所有测试完成！")
print("=" * 80)

print("\n📝 使用说明:")
print("   1. Admin后台访问: http://your-domain:8017/admin/api/productplan/")
print("   2. 在产品编辑页面底部可以看到「产品缴费方案」内联表格")
print("   3. 可以直接在产品页面添加/编辑/删除缴费方案")
print("   4. 总保费会自动计算（年缴金额 × 缴费年期）")
print("   5. 方案名称会自动生成（如：5年缴费方案）")
print()

# 清理测试数据
print("是否清理测试数据? (y/N): ", end="")
response = input().strip().lower()
if response == 'y':
    ProductPlan.objects.filter(product=product, payment_period__in=[5, 10, 20]).delete()
    print("✅ 测试数据已清理")
else:
    print("✅ 测试数据保留")
