#!/usr/bin/env python3
"""
查看需要合并的产品详情
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceProduct, ProductPlan

print('=' * 80)
print('查看需要合并的产品详情')
print('=' * 80)

# 1. 友邦
print('\n友邦:')
products = InsuranceProduct.objects.filter(company__name='友邦')
for p in products:
    if '环宇盈活' in p.product_name:
        plan_count = p.plans.count()
        print(f'  ID:{p.id} | {p.product_name} | 方案数:{plan_count}')
        for plan in p.plans.all():
            print(f'    - {plan.payment_period}年缴: ${plan.annual_premium}')

# 2. 宏利
print('\n宏利:')
products = InsuranceProduct.objects.filter(company__name='宏利')
for p in products:
    if '宏' in p.product_name and '传承' in p.product_name:
        plan_count = p.plans.count()
        print(f'  ID:{p.id} | {p.product_name} | 方案数:{plan_count}')
        for plan in p.plans.all():
            print(f'    - {plan.payment_period}年缴: ${plan.annual_premium}')

# 3. 永明
print('\n永明:')
products = InsuranceProduct.objects.filter(company__name='永明')
for p in products:
    if '万年青' in p.product_name or '萬年青' in p.product_name:
        plan_count = p.plans.count()
        print(f'  ID:{p.id} | {p.product_name} | 方案数:{plan_count}')
        for plan in p.plans.all():
            print(f'    - {plan.payment_period}年缴: ${plan.annual_premium}')

# 4. 中银
print('\n中银:')
products = InsuranceProduct.objects.filter(company__name='中银')
for p in products:
    if '薪火' in p.product_name:
        plan_count = p.plans.count()
        print(f'  ID:{p.id} | {p.product_name} | 方案数:{plan_count}')
        for plan in p.plans.all():
            print(f'    - {plan.payment_period}年缴: ${plan.annual_premium}')

# 5. 富卫
print('\n富卫（所有产品）:')
products = InsuranceProduct.objects.filter(company__name='富卫')
for p in products:
    plan_count = p.plans.count()
    print(f'  ID:{p.id} | {p.product_name} | 方案数:{plan_count}')
    for plan in p.plans.all():
        print(f'    - {plan.payment_period}年缴: ${plan.annual_premium}')

# 6. 萬通保險
print('\n萬通保險（所有产品）:')
products = InsuranceProduct.objects.filter(company__name='萬通保險')
for p in products:
    plan_count = p.plans.count()
    print(f'  ID:{p.id} | {p.product_name} | 方案数:{plan_count}')
    for plan in p.plans.all():
        print(f'    - {plan.payment_period}年缴: ${plan.annual_premium}')

# 7. 周大福
print('\n周大福:')
products = InsuranceProduct.objects.filter(company__name='周大福')
for p in products:
    if '匠心' in p.product_name and '传承' in p.product_name:
        plan_count = p.plans.count()
        print(f'  ID:{p.id} | {p.product_name} | 方案数:{plan_count}')
        for plan in p.plans.all():
            print(f'    - {plan.payment_period}年缴: ${plan.annual_premium}')
