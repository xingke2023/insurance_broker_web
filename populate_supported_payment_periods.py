#!/usr/bin/env python3
"""
根据现有的ProductPlan数据，自动填充supported_payment_periods字段
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceProduct, ProductPlan

print('=' * 80)
print('自动填充支持的缴费年期字段')
print('=' * 80)

products = InsuranceProduct.objects.all()
updated_count = 0

for product in products:
    # 获取该产品的所有缴费方案年期
    plans = ProductPlan.objects.filter(product=product).order_by('payment_period')

    if plans.exists():
        # 提取年期列表
        periods = []
        for plan in plans:
            period = plan.payment_period
            if period == 1:
                periods.append('趸缴')
            else:
                periods.append(f'{period}年')

        # 组合成字符串
        supported_periods = ','.join(periods)

        # 更新产品
        product.supported_payment_periods = supported_periods
        product.save()

        print(f'✅ {product.product_name}')
        print(f'   支持年期: {supported_periods}')
        updated_count += 1
    else:
        print(f'⏭️  {product.product_name} - 没有缴费方案')

print('\n' + '=' * 80)
print(f'✅ 完成！共更新 {updated_count} 个产品')
print('=' * 80)

# 验证结果
print('\n验证结果:')
print('-' * 80)
sample_products = InsuranceProduct.objects.filter(
    supported_payment_periods__isnull=False
).exclude(supported_payment_periods='')[:5]

for p in sample_products:
    print(f'{p.product_name}: {p.supported_payment_periods}')
