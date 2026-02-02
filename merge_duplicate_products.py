#!/usr/bin/env python3
"""
合并重复的产品品种记录

功能：
1. 识别重复的产品名称
2. 保留ID最小的记录作为主记录
3. 将其他记录的 ProductPlan 迁移到主记录
4. 删除重复记录
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceProduct, ProductPlan
from django.db.models import Count

print("=" * 80)
print("合并重复的产品品种记录")
print("=" * 80)

# 查找重复的产品名称
duplicate_products = InsuranceProduct.objects.values('product_name').annotate(
    count=Count('id')
).filter(count__gt=1).order_by('product_name')

if not duplicate_products.exists():
    print("\n✅ 没有发现重复的产品记录")
    exit(0)

print(f"\n发现 {duplicate_products.count()} 个重复的产品名称:")
print("-" * 80)

for item in duplicate_products:
    product_name = item['product_name']
    count = item['count']

    products = InsuranceProduct.objects.filter(
        product_name=product_name
    ).order_by('id')

    print(f"\n📦 产品: {product_name} ({count} 条记录)")
    for p in products:
        plan_count = p.plans.count()
        print(f"   ID:{p.id} | 公司:{p.company.name} | 年期:{p.payment_period or '无'} | 方案数:{plan_count}")

print("\n" + "=" * 80)
print("开始合并")
print("=" * 80)

print("\n⚠️  合并策略:")
print("   1. 保留ID最小的记录作为主记录")
print("   2. 将其他记录的缴费方案迁移到主记录")
print("   3. 删除重复记录")
print("   4. 清空主记录的旧字段数据")

print("\n是否继续? (y/N): ", end="")
response = input().strip().lower()

if response != 'y':
    print("❌ 取消合并")
    exit(0)

merged_count = 0
deleted_count = 0

for item in duplicate_products:
    product_name = item['product_name']

    # 获取所有重复记录，按ID排序
    products = InsuranceProduct.objects.filter(
        product_name=product_name
    ).order_by('id')

    # 第一个作为主记录
    master_product = products.first()
    duplicate_records = products[1:]

    print(f"\n📦 处理: {product_name}")
    print(f"   主记录: ID {master_product.id}")

    # 迁移其他记录的缴费方案到主记录
    for dup in duplicate_records:
        plans = ProductPlan.objects.filter(product=dup)
        plan_count = plans.count()

        if plan_count > 0:
            print(f"   迁移: ID {dup.id} 的 {plan_count} 个方案 → ID {master_product.id}")

            for plan in plans:
                # 检查主记录是否已有相同年期的方案
                existing = ProductPlan.objects.filter(
                    product=master_product,
                    payment_period=plan.payment_period
                ).exists()

                if existing:
                    print(f"      ⏭️  跳过: {plan.payment_period}年期方案已存在")
                else:
                    # 迁移方案到主记录
                    plan.product = master_product
                    plan.save()
                    print(f"      ✅ 迁移: {plan.payment_period}年期方案")

        # 删除重复记录
        print(f"   删除: ID {dup.id}")
        dup.delete()
        deleted_count += 1

    # 清空主记录的旧字段数据
    if master_product.payment_period is not None:
        master_product.payment_period = None
        master_product.annual_premium = None
        master_product.surrender_value_table = ''
        master_product.death_benefit_table = ''
        master_product.save()
        print(f"   清空: ID {master_product.id} 的旧字段数据")

    merged_count += 1

print("\n" + "=" * 80)
print("合并完成！")
print("=" * 80)

print(f"\n📊 合并统计:")
print(f"   ✅ 已处理产品: {merged_count} 个")
print(f"   🗑️  删除记录: {deleted_count} 条")

# 最终统计
total_products = InsuranceProduct.objects.count()
total_plans = ProductPlan.objects.count()

print(f"\n📊 最终状态:")
print(f"   产品品种数: {total_products}")
print(f"   缴费方案数: {total_plans}")
print(f"   平均每个产品: {total_plans/total_products:.1f} 个方案")

# 验证是否还有重复
remaining_duplicates = InsuranceProduct.objects.values('product_name').annotate(
    count=Count('id')
).filter(count__gt=1).count()

if remaining_duplicates == 0:
    print(f"\n✅ 所有重复记录已合并")
else:
    print(f"\n⚠️  还有 {remaining_duplicates} 个重复记录")
