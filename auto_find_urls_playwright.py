#!/usr/bin/env python3
"""
使用 Playwright + Google 搜索自动查找保险公司和产品URL
真实浏览器自动化，更准确的搜索结果
"""
import os
import sys
import django
import time

# 设置Django环境
sys.path.append('/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceCompany, InsuranceProduct
from api.playwright_scraper_service import PlaywrightScraperService


# 11家保险公司
COMPANIES = [
    {'code': 'aia', 'name': '友邦', 'name_en': 'AIA'},
    {'code': 'prudential', 'name': '保诚', 'name_en': 'Prudential'},
    {'code': 'manulife', 'name': '宏利', 'name_en': 'Manulife'},
    {'code': 'sunlife', 'name': '永明', 'name_en': 'Sun Life'},
    {'code': 'axa', 'name': '安盛', 'name_en': 'AXA'},
    {'code': 'bocgroup', 'name': '中银', 'name_en': 'BOC Group'},
    {'code': 'chinalife', 'name': '国寿', 'name_en': 'China Life'},
    {'code': 'fwd', 'name': '富卫', 'name_en': 'FWD'},
    {'code': 'prudence', 'name': '立桥', 'name_en': 'Prudence'},
    {'code': 'yf', 'name': '萬通', 'name_en': 'YF Life'},
    {'code': 'ctf', 'name': '周大福', 'name_en': 'CTF Life'}
]


def auto_find_company_urls(headless: bool = True):
    """
    使用 Playwright 自动查找所有公司官网

    Args:
        headless: 是否无头模式（True=后台运行，False=显示浏览器）
    """
    print("\n" + "="*70)
    print("  🌐 使用 Playwright + Google 搜索查找公司官网")
    print("="*70 + "\n")

    success_count = 0
    error_count = 0

    with PlaywrightScraperService(headless=headless) as scraper:
        for company_info in COMPANIES:
            try:
                print(f"📦 {company_info['name']} ({company_info['name_en']})")

                # 查找或创建公司
                company, created = InsuranceCompany.objects.get_or_create(
                    code=company_info['code'],
                    defaults={
                        'name': company_info['name'],
                        'name_en': company_info['name_en'],
                        'is_active': True
                    }
                )

                # 检查是否已有URL
                if company.website_url and not created:
                    print(f"   ℹ️  当前官网: {company.website_url}")
                    update = input(f"   是否重新查找？(y/n): ").strip().lower()
                    if update != 'y':
                        print(f"   ⏭️  跳过\n")
                        continue

                # 使用 Playwright 搜索官网
                official_url = scraper.search_company_url(
                    company_name=company_info['name'],
                    company_name_en=company_info['name_en']
                )

                if official_url:
                    # 验证URL
                    print(f"   → 验证URL...")
                    if scraper.verify_url(official_url):
                        company.website_url = official_url
                        company.name = company_info['name']
                        company.name_en = company_info['name_en']
                        company.save()

                        print(f"   ✅ 保存成功\n")
                        success_count += 1
                    else:
                        print(f"   ❌ URL无法访问\n")
                        error_count += 1
                else:
                    print(f"   ❌ 未找到官网\n")
                    error_count += 1

                # 避免被Google封禁
                time.sleep(3)

            except KeyboardInterrupt:
                print("\n\n⚠️  用户中断")
                break
            except Exception as e:
                print(f"   ❌ 错误: {str(e)}\n")
                error_count += 1
                continue

    print("-"*70)
    print(f"✅ 完成！成功: {success_count}，失败: {error_count}")
    print("="*70 + "\n")


def auto_find_product_urls(company_code: str, limit: int = 5, headless: bool = True):
    """
    使用 Playwright 自动查找产品URL

    Args:
        company_code: 公司代码
        limit: 最多查找几个产品
        headless: 是否无头模式
    """
    print("\n" + "="*70)
    print(f"  🎯 使用 Playwright 查找产品URL: {company_code}")
    print("="*70 + "\n")

    try:
        company = InsuranceCompany.objects.get(code=company_code)
        print(f"📦 {company.name} ({company.name_en})\n")

        # 获取没有URL的产品
        products = InsuranceProduct.objects.filter(
            company=company,
            is_active=True,
            url=''
        )[:limit]

        if not products.exists():
            print("✅ 所有产品都已配置URL！\n")
            return

        print(f"找到 {products.count()} 个需要配置的产品\n")

        success_count = 0
        error_count = 0

        with PlaywrightScraperService(headless=headless) as scraper:
            for product in products:
                try:
                    print(f"🎯 {product.product_name}")

                    # 搜索产品URL
                    product_url = scraper.search_product_url(
                        company_name=company.name,
                        product_name=product.product_name
                    )

                    if product_url:
                        # 验证URL
                        print(f"   → 验证URL...")
                        if scraper.verify_url(product_url):
                            product.url = product_url
                            product.save()
                            print(f"   ✅ 保存成功\n")
                            success_count += 1
                        else:
                            print(f"   ❌ URL无法访问\n")
                            error_count += 1
                    else:
                        print(f"   ❌ 未找到URL\n")
                        error_count += 1

                    # 避免被Google封禁
                    time.sleep(3)

                except KeyboardInterrupt:
                    print("\n\n⚠️  用户中断")
                    break
                except Exception as e:
                    print(f"   ❌ 错误: {str(e)}\n")
                    error_count += 1
                    continue

        print("-"*70)
        print(f"✅ 完成！成功: {success_count}，失败: {error_count}")
        print("="*70 + "\n")

    except InsuranceCompany.DoesNotExist:
        print(f"❌ 公司不存在: {company_code}\n")


def show_search_example(headless: bool = False):
    """
    演示搜索过程（显示浏览器）

    Args:
        headless: False=显示浏览器，True=后台运行
    """
    print("\n" + "="*70)
    print("  🎬 搜索演示（显示浏览器窗口）")
    print("="*70 + "\n")

    print("将打开Chrome浏览器，演示Google搜索过程...\n")

    with PlaywrightScraperService(headless=headless) as scraper:
        # 演示搜索宏利
        print("示例1: 搜索宏利官网")
        url = scraper.search_company_url("宏利", "Manulife")
        if url:
            print(f"✅ 找到: {url}\n")

        time.sleep(2)

        # 演示搜索产品
        print("示例2: 搜索宏摯傳承保障計劃")
        url = scraper.search_product_url("宏利", "宏摯傳承保障計劃")
        if url:
            print(f"✅ 找到: {url}\n")

    print("演示完成！\n")


def main():
    """主菜单"""
    print("\n" + "="*70)
    print("  🌐 Playwright 智能URL查找工具")
    print("  使用真实浏览器 + Google 搜索")
    print("="*70)

    while True:
        print("\n请选择操作:")
        print("1. 🌐 自动查找所有公司官网（后台运行）")
        print("2. 🎯 自动查找指定公司的产品URL（后台运行）")
        print("3. 🎬 演示搜索过程（显示浏览器）")
        print("4. 📊 查看当前配置状态")
        print("0. 退出")

        choice = input("\n请输入选项 (0-4): ").strip()

        if choice == '1':
            auto_find_company_urls(headless=True)

        elif choice == '2':
            company_code = input("\n请输入公司代码 (如 manulife): ").strip()
            if company_code:
                limit = input("最多查找几个产品 (默认5): ").strip()
                limit = int(limit) if limit.isdigit() else 5
                auto_find_product_urls(company_code, limit=limit, headless=True)

        elif choice == '3':
            show_search_example(headless=False)

        elif choice == '4':
            # 查看配置状态
            print("\n" + "="*70)
            print("  📊 当前配置状态")
            print("="*70 + "\n")

            for company_info in COMPANIES:
                try:
                    company = InsuranceCompany.objects.get(code=company_info['code'])
                    print(f"📦 {company.name} ({company.name_en})")
                    print(f"   官网: {'✅' if company.website_url else '❌'} {company.website_url or '未配置'}")

                    total = InsuranceProduct.objects.filter(
                        company=company,
                        is_active=True
                    ).count()

                    with_url = InsuranceProduct.objects.filter(
                        company=company,
                        is_active=True
                    ).exclude(url='').count()

                    print(f"   产品: {total} 个，已配置URL: {with_url} 个\n")

                except InsuranceCompany.DoesNotExist:
                    print(f"❌ {company_info['name']} - 不存在\n")

        elif choice == '0':
            print("\n👋 再见！\n")
            break

        else:
            print("❌ 无效选项")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  用户中断\n")
    except Exception as e:
        print(f"\n❌ 错误: {str(e)}\n")
        import traceback
        traceback.print_exc()
