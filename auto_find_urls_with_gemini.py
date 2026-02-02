#!/usr/bin/env python3
"""
使用 Gemini 3 Flash Preview + Google 搜索自动查找保险公司和产品URL
智能配置系统，无需手动输入URL
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
from api.insurance_scraper_service import scraper_service


# 11家保险公司基本信息
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


def auto_find_company_urls():
    """
    使用 Gemini + Google 搜索自动查找所有公司的官网URL
    """
    print("\n" + "="*70)
    print("  🔍 使用 Gemini + Google 搜索自动查找公司官网")
    print("="*70 + "\n")

    success_count = 0
    error_count = 0

    for company_info in COMPANIES:
        try:
            print(f"📦 正在查找: {company_info['name']} ({company_info['name_en']})")

            # 查找或创建公司
            company, created = InsuranceCompany.objects.get_or_create(
                code=company_info['code'],
                defaults={
                    'name': company_info['name'],
                    'name_en': company_info['name_en'],
                    'is_active': True
                }
            )

            if created:
                print(f"   ✅ 创建公司记录")

            # 如果已经有URL，询问是否重新查找
            if company.website_url and not created:
                print(f"   ℹ️  当前官网: {company.website_url}")
                update = input(f"   是否重新查找？(y/n): ").strip().lower()
                if update != 'y':
                    print(f"   ⏭️  跳过\n")
                    continue

            # 使用 Gemini + Google 搜索查找官网
            official_url = scraper_service.search_company_url_with_gemini(
                company_name=company_info['name'],
                company_name_en=company_info['name_en']
            )

            if official_url:
                company.website_url = official_url
                company.name = company_info['name']
                company.name_en = company_info['name_en']
                company.save()

                print(f"   ✅ 保存成功: {official_url}\n")
                success_count += 1
            else:
                print(f"   ❌ 查找失败\n")
                error_count += 1

            # 避免触发API限流
            time.sleep(2)

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


def auto_find_product_urls(company_code: str, limit: int = 5):
    """
    使用 Gemini + Google 搜索自动查找产品URL

    Args:
        company_code: 公司代码（如 'manulife'）
        limit: 最多查找几个产品（避免API限额）
    """
    print("\n" + "="*70)
    print(f"  🔍 使用 Gemini + Google 搜索查找产品URL: {company_code}")
    print("="*70 + "\n")

    try:
        # 获取公司
        company = InsuranceCompany.objects.get(code=company_code)
        print(f"📦 公司: {company.name} ({company.name_en})\n")

        # 获取没有URL的产品
        products = InsuranceProduct.objects.filter(
            company=company,
            is_active=True,
            url=''
        )[:limit]

        if not products.exists():
            print("✅ 所有产品都已配置URL！\n")
            return

        print(f"找到 {products.count()} 个需要配置URL的产品\n")

        success_count = 0
        error_count = 0

        for product in products:
            try:
                print(f"🎯 产品: {product.product_name}")

                # 使用 Gemini + Google 搜索查找产品URL
                product_url = scraper_service.search_product_url_with_gemini(
                    company_name=company.name,
                    product_name=product.product_name
                )

                if product_url:
                    product.url = product_url
                    product.save()
                    print(f"   ✅ 保存成功: {product_url}\n")
                    success_count += 1
                else:
                    print(f"   ❌ 查找失败\n")
                    error_count += 1

                # 避免触发API限流
                time.sleep(2)

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
    except Exception as e:
        print(f"❌ 错误: {str(e)}\n")
        import traceback
        traceback.print_exc()


def auto_find_all_product_urls(limit_per_company: int = 3):
    """
    批量查找所有公司的产品URL

    Args:
        limit_per_company: 每家公司最多查找几个产品
    """
    print("\n" + "="*70)
    print("  🔍 批量查找所有公司的产品URL")
    print("="*70 + "\n")

    for company_info in COMPANIES:
        print(f"\n{'='*70}")
        print(f"  处理: {company_info['name']}")
        print(f"{'='*70}")

        try:
            auto_find_product_urls(company_info['code'], limit=limit_per_company)

            # 询问是否继续
            continue_next = input(f"\n是否继续下一家公司？(y/n): ").strip().lower()
            if continue_next != 'y':
                print("\n⏹️  停止批量处理\n")
                break

        except KeyboardInterrupt:
            print("\n\n⚠️  用户中断")
            break
        except Exception as e:
            print(f"❌ 处理 {company_info['name']} 失败: {str(e)}")
            continue

    print("\n" + "="*70)
    print("  ✅ 批量处理完成")
    print("="*70 + "\n")


def show_status():
    """显示当前配置状态"""
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

            print(f"   产品: {total} 个，已配置URL: {with_url} 个")
            print()

        except InsuranceCompany.DoesNotExist:
            print(f"❌ {company_info['name']} - 公司不存在\n")


def main():
    """主菜单"""
    print("\n" + "="*70)
    print("  🤖 AI智能URL配置系统")
    print("  使用 Gemini 3 Flash Preview + Google 搜索")
    print("="*70)

    while True:
        print("\n请选择操作:")
        print("1. 🔍 自动查找所有公司官网URL")
        print("2. 🎯 自动查找指定公司的产品URL")
        print("3. 🚀 批量查找所有公司的产品URL")
        print("4. 📊 查看当前配置状态")
        print("0. 退出")

        choice = input("\n请输入选项 (0-4): ").strip()

        if choice == '1':
            auto_find_company_urls()

        elif choice == '2':
            company_code = input("\n请输入公司代码 (如 manulife): ").strip()
            if company_code:
                limit = input("最多查找几个产品 (默认5): ").strip()
                limit = int(limit) if limit.isdigit() else 5
                auto_find_product_urls(company_code, limit=limit)

        elif choice == '3':
            limit = input("\n每家公司最多查找几个产品 (默认3): ").strip()
            limit = int(limit) if limit.isdigit() else 3
            auto_find_all_product_urls(limit_per_company=limit)

        elif choice == '4':
            show_status()

        elif choice == '0':
            print("\n👋 再见！\n")
            break

        else:
            print("❌ 无效选项，请重新输入")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  用户中断\n")
    except Exception as e:
        print(f"\n❌ 错误: {str(e)}\n")
        import traceback
        traceback.print_exc()
