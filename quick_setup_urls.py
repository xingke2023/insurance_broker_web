#!/usr/bin/env python3
"""
一键配置保险公司和产品URL
"""
import os
import sys
import django

# 设置Django环境
sys.path.append('/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceCompany, InsuranceProduct


def quick_setup():
    """一键配置所有URL"""

    print("\n" + "="*70)
    print("  🚀 一键配置保险公司官网URL和产品URL")
    print("="*70 + "\n")

    # 11家保险公司配置
    companies_config = {
        'aia': {
            'name': '友邦',
            'website': 'https://www.aia.com.hk/zh-hk.html',
            'name_en': 'AIA'
        },
        'prudential': {
            'name': '保诚',
            'website': 'https://www.prudential.com.hk/zh-hk.html',
            'name_en': 'Prudential'
        },
        'manulife': {
            'name': '宏利',
            'website': 'https://www.manulife.com.hk/zh-hk.html',
            'name_en': 'Manulife'
        },
        'sunlife': {
            'name': '永明',
            'website': 'https://www.sunlife.com.hk/zh-hk.html',
            'name_en': 'Sun Life'
        },
        'axa': {
            'name': '安盛',
            'website': 'https://www.axa.com.hk/zh-hk.html',
            'name_en': 'AXA'
        },
        'bocgroup': {
            'name': '中银',
            'website': 'https://www.bocgroup.com/web/zh/index.html',
            'name_en': 'BOC Group'
        },
        'chinalife': {
            'name': '国寿',
            'website': 'https://www.chinalife.com.hk/tc.html',
            'name_en': 'China Life'
        },
        'fwd': {
            'name': '富卫',
            'website': 'https://www.fwd.com.hk/zh.html',
            'name_en': 'FWD'
        },
        'prudence': {
            'name': '立桥',
            'website': 'https://www.prudence.com.hk/zh-hk.html',
            'name_en': 'Prudence'
        },
        'yf': {
            'name': '萬通',
            'website': 'https://www.yflife.com.hk/zh-hk.html',
            'name_en': 'YF Life'
        },
        'ctf': {
            'name': '周大福',
            'website': 'https://www.ctflife.com.hk/zh-hk.html',
            'name_en': 'CTF Life'
        }
    }

    # 示例产品URL配置（宏利）
    sample_product_urls = {
        '宏摯傳承保障計劃': 'https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html',
        '宏利環球精選': 'https://www.manulife.com.hk/zh-hk/individual/products/wealth/savings/global-select.html',
        '宏揚世代': 'https://www.manulife.com.hk/zh-hk/individual/products/save/savings/prosperity.html'
    }

    # 配置公司
    print("📦 第1步: 配置保险公司官网URL\n")
    company_count = 0

    for code, config in companies_config.items():
        try:
            company, created = InsuranceCompany.objects.get_or_create(
                code=code,
                defaults={
                    'name': config['name'],
                    'name_en': config['name_en'],
                    'website_url': config['website'],
                    'is_active': True,
                    'sort_order': company_count
                }
            )

            # 更新URL（即使已存在）
            company.website_url = config['website']
            company.name = config['name']
            company.name_en = config['name_en']
            company.save()

            status = "✅ 创建" if created else "🔄 更新"
            print(f"{status} {config['name']} ({config['name_en']})")
            print(f"     官网: {config['website']}")
            company_count += 1

        except Exception as e:
            print(f"❌ {config['name']} 配置失败: {str(e)}")

    print(f"\n{'─'*70}")
    print(f"✅ 完成！已配置 {company_count} 家保险公司")
    print(f"{'─'*70}\n")

    # 配置示例产品URL
    print("🎯 第2步: 配置示例产品URL（宏利）\n")

    try:
        manulife = InsuranceCompany.objects.get(code='manulife')
        product_count = 0

        for product_name, product_url in sample_product_urls.items():
            # 查找匹配的产品
            product = InsuranceProduct.objects.filter(
                company=manulife,
                product_name__icontains=product_name.split('·')[0]
            ).first()

            if product:
                product.url = product_url
                product.save()
                print(f"✅ {product.product_name}")
                print(f"   {product_url}")
                product_count += 1
            else:
                print(f"⚠️  {product_name} - 产品不存在，跳过")

        print(f"\n{'─'*70}")
        print(f"✅ 完成！已配置 {product_count} 个产品URL")
        print(f"{'─'*70}\n")

    except InsuranceCompany.DoesNotExist:
        print("❌ 宏利公司不存在\n")

    # 显示统计信息
    print("📊 第3步: 配置统计\n")

    for company in InsuranceCompany.objects.all().order_by('sort_order'):
        total = InsuranceProduct.objects.filter(company=company, is_active=True).count()
        with_url = InsuranceProduct.objects.filter(
            company=company,
            is_active=True
        ).exclude(url='').count()

        print(f"📦 {company.name} ({company.name_en})")
        print(f"   官网: {'✅' if company.website_url else '❌'} {company.website_url or '未配置'}")
        print(f"   产品: {total} 个，已配置URL: {with_url} 个")
        print()

    print("="*70)
    print("  ✅ 配置完成！")
    print("="*70)
    print("\n💡 下一步:")
    print("1. 运行测试: python3 test_scraper.py")
    print("2. 抓取新闻: curl -X POST http://localhost:8017/api/scraper/company-news/")
    print("3. 使用 setup_insurance_urls.py 为更多产品配置URL")
    print("\n")


if __name__ == '__main__':
    try:
        quick_setup()
    except KeyboardInterrupt:
        print("\n\n⚠️  用户中断\n")
    except Exception as e:
        print(f"\n❌ 错误: {str(e)}\n")
        import traceback
        traceback.print_exc()
