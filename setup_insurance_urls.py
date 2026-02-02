#!/usr/bin/env python3
"""
自动配置11家保险公司的官网URL和产品URL
使用 Gemini 智能查找和验证URL
"""
import os
import sys
import django

# 设置Django环境
sys.path.append('/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceCompany, InsuranceProduct
from api.insurance_scraper_service import scraper_service


# 11家保险公司的官网URL配置
COMPANY_URLS = {
    'aia': {
        'name': '友邦',
        'website': 'https://www.aia.com.hk/zh-hk.html',
        'products_page': 'https://www.aia.com.hk/zh-hk/our-products.html',
        'news_page': 'https://www.aia.com.hk/zh-hk/about-aia/media-centre.html'
    },
    'prudential': {
        'name': '保诚',
        'website': 'https://www.prudential.com.hk/zh-hk.html',
        'products_page': 'https://www.prudential.com.hk/zh-hk/our-products.html',
        'news_page': 'https://www.prudential.com.hk/zh-hk/press-room.html'
    },
    'manulife': {
        'name': '宏利',
        'website': 'https://www.manulife.com.hk/zh-hk.html',
        'products_page': 'https://www.manulife.com.hk/zh-hk/individual/products.html',
        'news_page': 'https://www.manulife.com.hk/zh-hk/individual/promotions/latest-customer-offers.html'
    },
    'sunlife': {
        'name': '永明',
        'website': 'https://www.sunlife.com.hk/zh-hk.html',
        'products_page': 'https://www.sunlife.com.hk/zh-hk/products-and-services.html',
        'news_page': 'https://www.sunlife.com.hk/zh-hk/about-us/media-centre.html'
    },
    'axa': {
        'name': '安盛',
        'website': 'https://www.axa.com.hk/zh-hk.html',
        'products_page': 'https://www.axa.com.hk/zh-hk/ways-to-buy.html',
        'news_page': 'https://www.axa.com.hk/zh-hk/about-us/media-centre.html'
    },
    'bocgroup': {
        'name': '中银',
        'website': 'https://www.bocgroup.com/web/zh/index.html',
        'products_page': 'https://www.bocgroup.com/web/zh/product/productlist.html',
        'news_page': 'https://www.bocgroup.com/web/zh/aboutus/news.html'
    },
    'chinalife': {
        'name': '国寿',
        'website': 'https://www.chinalife.com.hk/tc.html',
        'products_page': 'https://www.chinalife.com.hk/tc/products.html',
        'news_page': 'https://www.chinalife.com.hk/tc/about-us/news-centre.html'
    },
    'fwd': {
        'name': '富卫',
        'website': 'https://www.fwd.com.hk/zh.html',
        'products_page': 'https://www.fwd.com.hk/zh/products.html',
        'news_page': 'https://www.fwd.com.hk/zh/about-us/newsroom.html'
    },
    'prudence': {
        'name': '立桥',
        'website': 'https://www.prudence.com.hk/zh-hk.html',
        'products_page': 'https://www.prudence.com.hk/zh-hk/products.html',
        'news_page': 'https://www.prudence.com.hk/zh-hk/news.html'
    },
    'yf': {
        'name': '萬通',
        'website': 'https://www.yflife.com.hk/zh-hk.html',
        'products_page': 'https://www.yflife.com.hk/zh-hk/products.html',
        'news_page': 'https://www.yflife.com.hk/zh-hk/about-us/news-and-updates.html'
    },
    'ctf': {
        'name': '周大福',
        'website': 'https://www.ctflife.com.hk/zh-hk.html',
        'products_page': 'https://www.ctflife.com.hk/zh-hk/our-products.html',
        'news_page': 'https://www.ctflife.com.hk/zh-hk/about-us/latest-news.html'
    }
}


# 已知的产品URL配置（示例）
KNOWN_PRODUCT_URLS = {
    'manulife': {
        '宏摯傳承保障計劃': 'https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html',
        '宏利環球精選': 'https://www.manulife.com.hk/zh-hk/individual/products/wealth/savings/global-select.html',
        '宏揚世代': 'https://www.manulife.com.hk/zh-hk/individual/products/save/savings/prosperity.html'
    },
    'aia': {
        '充裕未來': 'https://www.aia.com.hk/zh-hk/our-products/savings/prime-value.html',
        '摯愛無限': 'https://www.aia.com.hk/zh-hk/our-products/protection/love-eternal.html',
        '愛家之選': 'https://www.aia.com.hk/zh-hk/our-products/protection/family-care.html'
    }
}


def setup_company_urls():
    """配置所有公司的官网URL"""
    print("\n" + "="*60)
    print("  配置11家保险公司的官网URL")
    print("="*60 + "\n")

    success_count = 0
    error_count = 0

    for code, config in COMPANY_URLS.items():
        try:
            # 查找或创建公司
            company, created = InsuranceCompany.objects.get_or_create(
                code=code,
                defaults={
                    'name': config['name'],
                    'website_url': config['website'],
                    'is_active': True
                }
            )

            if created:
                print(f"✅ 创建公司: {config['name']} ({code})")
            else:
                print(f"📦 更新公司: {config['name']} ({code})")

            # 更新URL
            company.website_url = config['website']
            company.name = config['name']
            company.save()

            print(f"   官网: {config['website']}")
            print(f"   产品页: {config.get('products_page', '未配置')}")
            print(f"   新闻页: {config.get('news_page', '未配置')}")
            print()

            success_count += 1

        except Exception as e:
            print(f"❌ 配置 {config['name']} 失败: {str(e)}\n")
            error_count += 1

    print("-"*60)
    print(f"配置完成！成功: {success_count}，失败: {error_count}")
    print("="*60 + "\n")


def setup_product_urls():
    """配置已知产品的URL"""
    print("\n" + "="*60)
    print("  配置产品URL")
    print("="*60 + "\n")

    success_count = 0
    error_count = 0

    for company_code, products in KNOWN_PRODUCT_URLS.items():
        try:
            company = InsuranceCompany.objects.get(code=company_code)
            print(f"\n📦 {company.name} 的产品:")

            for product_name, product_url in products.items():
                try:
                    # 查找产品
                    product = InsuranceProduct.objects.filter(
                        company=company,
                        product_name__icontains=product_name.split('·')[0]  # 部分匹配
                    ).first()

                    if product:
                        product.url = product_url
                        product.save()
                        print(f"  ✅ {product.product_name}")
                        print(f"     {product_url}")
                        success_count += 1
                    else:
                        print(f"  ⚠️  {product_name} - 产品不存在，跳过")

                except Exception as e:
                    print(f"  ❌ {product_name} - 配置失败: {str(e)}")
                    error_count += 1

        except InsuranceCompany.DoesNotExist:
            print(f"❌ {company_code} 公司不存在\n")
            error_count += 1

    print("\n" + "-"*60)
    print(f"配置完成！成功: {success_count}，失败: {error_count}")
    print("="*60 + "\n")


def find_product_urls_with_gemini(company_code):
    """
    使用 Gemini 智能查找公司的产品URL

    Args:
        company_code: 公司代码（如 'manulife'）
    """
    print(f"\n" + "="*60)
    print(f"  使用 Gemini 查找产品URL: {company_code}")
    print("="*60 + "\n")

    try:
        # 获取公司
        company = InsuranceCompany.objects.get(code=company_code)

        if not company.website_url:
            print("❌ 该公司没有配置官网URL")
            return

        # 使用爬虫服务查找产品页面
        print(f"正在分析 {company.name} 的官网...")
        pages = scraper_service.find_company_pages(company.website_url)

        products_page = pages.get('products_page')

        if not products_page:
            print("❌ 未找到产品页面")
            return

        print(f"✅ 产品页面: {products_page}\n")

        # 获取产品页面内容
        html_content = scraper_service.fetch_webpage(products_page)

        if not html_content:
            print("❌ 无法获取产品页面内容")
            return

        # 使用 Gemini 分析产品页面，提取产品列表和URL
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')

        # 清理HTML
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()

        # 提取所有产品链接
        product_links = []
        for link in soup.find_all('a', href=True):
            href = link['href']
            text = link.get_text(strip=True)

            if not text or len(text) < 2:
                continue

            # 转换为绝对URL
            if href.startswith('/'):
                href = company.website_url.rstrip('/') + href
            elif not href.startswith('http'):
                continue

            # 过滤明显的非产品链接
            if any(x in href.lower() for x in ['contact', 'about', 'login', 'search', 'faq']):
                continue

            product_links.append({
                'name': text,
                'url': href
            })

        print(f"找到 {len(product_links)} 个产品链接\n")

        # 显示前10个
        for i, link in enumerate(product_links[:10], 1):
            print(f"{i}. {link['name'][:50]}")
            print(f"   {link['url']}\n")

        # 匹配数据库中的产品
        products = InsuranceProduct.objects.filter(company=company, is_active=True)

        print(f"\n数据库中有 {products.count()} 个 {company.name} 产品\n")

        matched_count = 0
        for product in products:
            # 查找匹配的链接
            for link in product_links:
                if product.product_name in link['name'] or link['name'] in product.product_name:
                    product.url = link['url']
                    product.save()
                    print(f"✅ 匹配: {product.product_name}")
                    print(f"   URL: {link['url']}\n")
                    matched_count += 1
                    break

        print("-"*60)
        print(f"完成！匹配了 {matched_count} 个产品")
        print("="*60 + "\n")

    except InsuranceCompany.DoesNotExist:
        print(f"❌ 公司不存在: {company_code}")
    except Exception as e:
        print(f"❌ 错误: {str(e)}")
        import traceback
        traceback.print_exc()


def main():
    """主函数"""
    print("\n" + "="*60)
    print("  保险公司URL配置工具")
    print("="*60)

    while True:
        print("\n请选择操作:")
        print("1. 配置所有公司的官网URL")
        print("2. 配置已知产品的URL")
        print("3. 使用Gemini查找产品URL（指定公司）")
        print("4. 使用Gemini批量查找所有公司的产品URL")
        print("5. 查看当前配置状态")
        print("0. 退出")

        choice = input("\n请输入选项 (0-5): ").strip()

        if choice == '1':
            setup_company_urls()

        elif choice == '2':
            setup_product_urls()

        elif choice == '3':
            company_code = input("请输入公司代码 (如 manulife): ").strip()
            if company_code:
                find_product_urls_with_gemini(company_code)

        elif choice == '4':
            print("\n" + "="*60)
            print("  批量查找所有公司的产品URL")
            print("="*60)

            for code in COMPANY_URLS.keys():
                try:
                    find_product_urls_with_gemini(code)
                except KeyboardInterrupt:
                    print("\n\n⚠️  用户中断")
                    break
                except Exception as e:
                    print(f"❌ 处理 {code} 失败: {str(e)}\n")
                    continue

                input("按回车继续下一家公司...")

        elif choice == '5':
            # 查看配置状态
            print("\n" + "="*60)
            print("  当前配置状态")
            print("="*60 + "\n")

            companies = InsuranceCompany.objects.all()
            for company in companies:
                print(f"📦 {company.name} ({company.code})")
                print(f"   官网: {company.website_url or '❌ 未配置'}")

                products_with_url = InsuranceProduct.objects.filter(
                    company=company,
                    is_active=True
                ).exclude(url='')

                total_products = InsuranceProduct.objects.filter(
                    company=company,
                    is_active=True
                ).count()

                print(f"   产品URL: {products_with_url.count()}/{total_products} 已配置")
                print()

        elif choice == '0':
            print("\n再见！\n")
            break

        else:
            print("❌ 无效选项，请重新输入")


if __name__ == '__main__':
    main()
