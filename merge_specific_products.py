#!/usr/bin/env python3
"""
合并指定的重复产品
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceProduct, ProductPlan

print('=' * 80)
print('合并重复的保险产品')
print('=' * 80)

# 定义合并规则：[保留的主产品ID, 要合并的产品ID列表]
merge_rules = [
    {
        'company': '友邦',
        'keep_id': 21,  # 环宇盈活（保留，因为有更多方案）
        'merge_ids': [1],  # 环宇盈活储蓄寿险计划
        'final_name': '环宇盈活储蓄寿险计划'
    },
    {
        'company': '宏利',
        'keep_id': 17,  # 宏挚传承
        'merge_ids': [],  # 没有找到"宏摯傳承"，可能已经合并过
        'final_name': '宏挚传承'
    },
    {
        'company': '永明',
        'keep_id': 15,  # 万年青2星河尊享（保留ID较小的）
        'merge_ids': [4],  # 万年青星河尊享计划II
        'final_name': '万年青星河尊享计划II'
    },
    {
        'company': '中银',
        'keep_id': 6,  # 薪火传承环球终身寿险计划（保留ID较小的）
        'merge_ids': [14],  # 薪火相传
        'final_name': '薪火传承环球终身寿险计划'
    },
    {
        'company': '富卫',
        'keep_id': 8,  # 盈聚天下II（保留，因为有更多方案）
        'merge_ids': [24],  # 盈聚‧天下
        'final_name': '盈聚天下II'
    },
    {
        'company': '萬通保險',
        'keep_id': 26,  # 富饶万家储蓄保险计划 (2年缴付)（保留ID较小的）
        'merge_ids': [27],  # 富饶万家储蓄保险计划 (5年缴付)
        'final_name': '富饶万家储蓄保险计划'
    },
    {
        'company': '周大福',
        'keep_id': 9,  # 「匠心·传承」储蓄寿险计划2
        'merge_ids': [],  # 没有找到"匠心 · 傳承2"
        'final_name': '「匠心·传承」储蓄寿险计划2'
    },
]

print('\n⚠️  合并策略:')
print('   1. 保留指定的主产品记录')
print('   2. 将其他产品的缴费方案迁移到主产品')
print('   3. 删除被合并的产品记录')
print('   4. 更新主产品名称（如需要）')
print('\n开始执行...')

merged_count = 0
plan_migrated_count = 0
deleted_count = 0

for rule in merge_rules:
    company = rule['company']
    keep_id = rule['keep_id']
    merge_ids = rule['merge_ids']
    final_name = rule['final_name']

    if not merge_ids:
        print(f'\n⏭️  跳过 {company}: 没有需要合并的产品')
        continue

    try:
        master_product = InsuranceProduct.objects.get(id=keep_id)
    except InsuranceProduct.DoesNotExist:
        print(f'\n❌ 错误 {company}: 主产品ID {keep_id} 不存在')
        continue

    print(f'\n📦 处理 {company}: {master_product.product_name}')
    print(f'   主产品ID: {master_product.id}')

    for merge_id in merge_ids:
        try:
            merge_product = InsuranceProduct.objects.get(id=merge_id)
        except InsuranceProduct.DoesNotExist:
            print(f'   ⚠️  产品ID {merge_id} 不存在，跳过')
            continue

        print(f'   合并产品: ID {merge_product.id} - {merge_product.product_name}')

        # 迁移缴费方案
        plans = ProductPlan.objects.filter(product=merge_product)
        plan_count = plans.count()

        if plan_count > 0:
            print(f'   迁移方案: {plan_count} 个')

            for plan in plans:
                # 检查主产品是否已有相同年期的方案
                existing = ProductPlan.objects.filter(
                    product=master_product,
                    payment_period=plan.payment_period
                ).first()

                if existing:
                    print(f'      ⏭️  跳过: {plan.payment_period}年缴方案已存在 (${existing.annual_premium} vs ${plan.annual_premium})')
                    # 如果金额不同，可能需要手动检查
                    if existing.annual_premium != plan.annual_premium:
                        print(f'         ⚠️  警告: 金额不同！')
                else:
                    # 迁移方案到主产品
                    plan.product = master_product
                    plan.save()
                    plan_migrated_count += 1
                    print(f'      ✅ 迁移: {plan.payment_period}年缴, ${plan.annual_premium}')

        # 删除被合并的产品
        merge_product.delete()
        deleted_count += 1
        print(f'   🗑️  删除: ID {merge_id}')

    # 更新主产品名称
    if master_product.product_name != final_name:
        old_name = master_product.product_name
        master_product.product_name = final_name
        master_product.save()
        print(f'   ✏️  更新名称: {old_name} → {final_name}')

    merged_count += 1

print('\n' + '=' * 80)
print('合并完成！')
print('=' * 80)

print(f'\n📊 合并统计:')
print(f'   ✅ 处理产品组: {merged_count} 个')
print(f'   📋 迁移方案: {plan_migrated_count} 个')
print(f'   🗑️  删除产品: {deleted_count} 个')

# 最终统计
total_products = InsuranceProduct.objects.count()
total_plans = ProductPlan.objects.count()

print(f'\n📊 最终状态:')
print(f'   产品品种数: {total_products}')
print(f'   缴费方案数: {total_plans}')
print(f'   平均每个产品: {total_plans/total_products:.1f} 个方案')

# 验证各公司产品数
from django.db.models import Count
company_stats = InsuranceProduct.objects.values('company__name').annotate(
    count=Count('id')
).order_by('-count')

print(f'\n📊 各保险公司产品数:')
for stat in company_stats:
    company_name = stat['company__name'] or '未分配'
    count = stat['count']
    print(f'   {company_name}: {count} 个')
