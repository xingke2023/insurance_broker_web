#!/usr/bin/env python3
"""
迁移现有 InsuranceProduct 数据到 ProductPlan 关联表

功能说明：
1. 扫描所有 InsuranceProduct 记录
2. 如果产品有缴费数据（payment_period 和 annual_premium 不为空）
3. 创建对应的 ProductPlan 记录
4. 保留原始数据不变（向后兼容）
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceProduct, ProductPlan
from django.db.models import Q

print("=" * 80)
print("InsuranceProduct 数据迁移到 ProductPlan")
print("=" * 80)

# 统计信息
total_products = InsuranceProduct.objects.count()
old_data_products = InsuranceProduct.objects.filter(
    Q(payment_period__isnull=False) & Q(annual_premium__isnull=False)
)
old_data_count = old_data_products.count()

print(f"\n📊 数据统计:")
print(f"   总产品数: {total_products}")
print(f"   有旧缴费数据的产品: {old_data_count}")
print(f"   已存在的缴费方案: {ProductPlan.objects.count()}")

if old_data_count == 0:
    print("\n✅ 没有需要迁移的数据（所有产品的 payment_period/annual_premium 都为空）")
    exit(0)

print("\n" + "=" * 80)
print("预览需要迁移的数据")
print("=" * 80)

print(f"\n{'产品ID':<10} {'产品名称':<30} {'缴费年期':<10} {'年缴金额':<15} {'状态'}")
print("-" * 80)

for product in old_data_products[:10]:  # 只预览前10条
    existing = ProductPlan.objects.filter(
        product=product,
        payment_period=product.payment_period
    ).exists()
    status = "✅ 已迁移" if existing else "⏳ 待迁移"
    print(f"{product.id:<10} {product.product_name[:28]:<30} {product.payment_period:<10} ${product.annual_premium:<14,.0f} {status}")

if old_data_count > 10:
    print(f"... 还有 {old_data_count - 10} 条数据")

print("\n" + "=" * 80)
print("开始迁移")
print("=" * 80)

# 确认是否继续
print(f"\n⚠️  将为 {old_data_count} 个产品创建 ProductPlan 记录")
print("   原始数据不会被删除或修改")
print("\n是否继续? (y/N): ", end="")
response = input().strip().lower()

if response != 'y':
    print("❌ 取消迁移")
    exit(0)

# 开始迁移
migrated_count = 0
skipped_count = 0
error_count = 0

print("\n开始迁移数据...")
print("-" * 80)

for product in old_data_products:
    try:
        # 检查是否已经迁移
        existing_plan = ProductPlan.objects.filter(
            product=product,
            payment_period=product.payment_period
        ).first()

        if existing_plan:
            print(f"⏭️  跳过: {product.product_name} - {product.payment_period}年期方案已存在 (ID: {existing_plan.id})")
            skipped_count += 1
            continue

        # 创建新的缴费方案
        plan = ProductPlan.objects.create(
            product=product,
            payment_period=product.payment_period,
            annual_premium=product.annual_premium,
            surrender_value_table=product.surrender_value_table or '',
            death_benefit_table=product.death_benefit_table or '',
            is_active=product.is_active,
            # 自动生成 plan_name 和 total_premium
        )

        print(f"✅ 迁移: {product.product_name} → {plan.plan_name} (年缴: ${plan.annual_premium:,.0f})")
        migrated_count += 1

    except Exception as e:
        print(f"❌ 错误: {product.product_name} - {str(e)}")
        error_count += 1

print("\n" + "=" * 80)
print("迁移完成！")
print("=" * 80)

print(f"\n📊 迁移统计:")
print(f"   ✅ 成功迁移: {migrated_count} 个方案")
print(f"   ⏭️  跳过已存在: {skipped_count} 个方案")
print(f"   ❌ 迁移失败: {error_count} 个方案")
print(f"   📦 总缴费方案数: {ProductPlan.objects.count()}")

if migrated_count > 0:
    print("\n" + "=" * 80)
    print("验证迁移结果")
    print("=" * 80)

    # 随机抽取几个验证
    sample_plans = ProductPlan.objects.order_by('?')[:3]

    for plan in sample_plans:
        print(f"\n📋 {plan.product.product_name}")
        print(f"   方案: {plan.plan_name}")
        print(f"   缴费年期: {plan.payment_period} 年")
        print(f"   年缴金额: ${plan.annual_premium:,.0f}")
        print(f"   总保费: ${plan.total_premium:,.0f}")
        print(f"   退保价值表: {'✅ 有数据' if plan.surrender_value_table else '❌ 无数据'}")
        print(f"   身故赔偿表: {'✅ 有数据' if plan.death_benefit_table else '❌ 无数据'}")

print("\n" + "=" * 80)
print("下一步操作建议")
print("=" * 80)

print("""
1. ✅ 访问Admin后台验证迁移结果
   http://your-domain:8017/admin/api/productplan/

2. ✅ 在产品编辑页面查看缴费方案
   http://your-domain:8017/admin/api/insuranceproduct/

3. ⚠️  原始数据保留（向后兼容）
   - InsuranceProduct 的 payment_period、annual_premium 等字段仍保留
   - 已标记为「已废弃」
   - 可以选择清空（见下方）

4. 📝 更新前端代码
   - 修改API返回数据结构，包含 plans 数组
   - 更新产品展示组件，支持多个缴费方案选择

5. 🔄 可选：清空旧字段数据
""")

if migrated_count > 0:
    print("\n是否清空已迁移产品的旧字段数据？(y/N): ", end="")
    response = input().strip().lower()

    if response == 'y':
        print("\n清空旧字段数据...")
        updated = InsuranceProduct.objects.filter(
            id__in=[p.product_id for p in ProductPlan.objects.all()]
        ).update(
            payment_period=None,
            annual_premium=None,
            surrender_value_table='',
            death_benefit_table=''
        )
        print(f"✅ 已清空 {updated} 个产品的旧字段数据")
        print("   （数据已完全迁移到 ProductPlan 表）")
    else:
        print("✅ 保留旧字段数据（向后兼容）")

print("\n" + "=" * 80)
print("✅ 迁移流程结束")
print("=" * 80)
