#!/usr/bin/env python3
"""
测试保险公司信息爬虫
"""
import os
import sys
import django

# 设置Django环境
sys.path.append('/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.insurance_scraper_service import scraper_service
from api.models import InsuranceCompany, InsuranceProduct


def test_find_pages():
    """测试查找公司页面"""
    print("\n" + "="*60)
    print("测试1: 查找公司页面")
    print("="*60)

    # 宏利官网
    company_url = "https://www.manulife.com.hk/zh-hk.html"
    print(f"\n公司官网: {company_url}")

    pages = scraper_service.find_company_pages(company_url)

    print(f"\n📰 新闻页面: {pages.get('news_page')}")
    print(f"📦 产品页面: {pages.get('products_page')}")


def test_scrape_company_news():
    """测试抓取公司新闻"""
    print("\n" + "="*60)
    print("测试2: 抓取公司新闻")
    print("="*60)

    # 获取宏利公司
    company = InsuranceCompany.objects.filter(code='manulife').first()

    if not company:
        print("❌ 找不到宏利公司，请先创建")
        return

    if not company.website_url:
        print("⚠️  宏利公司没有配置官网URL，设置默认值")
        company.website_url = "https://www.manulife.com.hk/zh-hk.html"
        company.save()

    result = scraper_service.scrape_company_news(
        company_id=company.id,
        company_name=company.name,
        company_url=company.website_url
    )

    print(f"\n结果:")
    print(f"  成功: {result.get('success')}")
    if result.get('success'):
        print(f"  新增: {result.get('created')} 条")
        print(f"  更新: {result.get('updated')} 条")
        print(f"  总计: {result.get('total')} 条")
    else:
        print(f"  错误: {result.get('error')}")


def test_scrape_product_promotion():
    """测试抓取产品推广信息"""
    print("\n" + "="*60)
    print("测试3: 抓取产品推广信息")
    print("="*60)

    # 宏摯傳承保障計劃
    product_url = "https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html"

    # 查找或创建产品
    company = InsuranceCompany.objects.filter(code='manulife').first()
    if not company:
        print("❌ 找不到宏利公司")
        return

    product, created = InsuranceProduct.objects.get_or_create(
        company=company,
        product_name="宏摯傳承保障計劃",
        defaults={
            'url': product_url,
            'is_active': True
        }
    )

    if created:
        print(f"✅ 创建产品: {product.product_name}")
    else:
        print(f"📦 使用现有产品: {product.product_name}")

    # 确保产品有URL
    if not product.url:
        product.url = product_url
        product.save()

    result = scraper_service.scrape_product_promotions(
        product_id=product.id,
        product_name=product.product_name,
        product_url=product.url
    )

    print(f"\n结果:")
    print(f"  成功: {result.get('success')}")
    if result.get('success'):
        print(f"  新增: {result.get('created')} 条")
        print(f"  更新: {result.get('updated')} 条")
        print(f"  总计: {result.get('total')} 条")
    else:
        print(f"  错误: {result.get('error')}")


def test_analyze_webpage():
    """测试网页分析"""
    print("\n" + "="*60)
    print("测试4: Gemini网页分析")
    print("="*60)

    # 宏利优惠页面
    url = "https://www.manulife.com.hk/zh-hk/individual/promotions/latest-customer-offers.html"
    print(f"\n分析页面: {url}")

    html_content = scraper_service.fetch_webpage(url)

    if not html_content:
        print("❌ 无法获取网页内容")
        return

    print(f"✅ 网页内容大小: {len(html_content)} 字节")

    result = scraper_service.analyze_webpage_with_gemini(
        url=url,
        html_content=html_content,
        analysis_type='company_news'
    )

    print(f"\n分析结果:")
    print(f"  成功: {result.get('success')}")

    if result.get('success'):
        items = result['data'].get('items', [])
        print(f"  提取项目数: {len(items)}")

        for i, item in enumerate(items[:3], 1):
            print(f"\n  [{i}] {item.get('title')}")
            print(f"      类型: {item.get('content_type')}")
            print(f"      链接: {item.get('url', '')[:60]}...")
    else:
        print(f"  错误: {result.get('error')}")


def main():
    """主函数"""
    print("\n" + "="*60)
    print("  保险公司信息爬虫 - 测试脚本")
    print("="*60)

    # 运行所有测试
    tests = [
        ("查找公司页面", test_find_pages),
        ("网页分析", test_analyze_webpage),
        ("抓取公司新闻", test_scrape_company_news),
        ("抓取产品推广", test_scrape_product_promotion),
    ]

    for name, test_func in tests:
        try:
            test_func()
        except KeyboardInterrupt:
            print("\n\n⚠️  用户中断")
            break
        except Exception as e:
            print(f"\n❌ {name} 测试失败: {str(e)}")
            import traceback
            traceback.print_exc()

        print("\n" + "-"*60)
        input("按回车继续下一个测试...")

    print("\n" + "="*60)
    print("  测试完成")
    print("="*60 + "\n")


if __name__ == '__main__':
    main()
