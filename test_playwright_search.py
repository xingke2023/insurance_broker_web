#!/usr/bin/env python3
"""
测试 Playwright Google 搜索功能
"""
import sys
sys.path.append('/var/www/harry-insurance2')

from api.playwright_scraper_service import PlaywrightScraperService


def test_search():
    """测试搜索功能"""
    print("\n" + "="*70)
    print("  测试 Playwright + Google 搜索")
    print("="*70 + "\n")

    print("正在启动Chrome浏览器（无头模式）...\n")

    with PlaywrightScraperService(headless=True) as scraper:

        # 测试1: 搜索宏利官网
        print("【测试1】搜索宏利官网")
        print("-"*70)
        url = scraper.search_company_url("宏利", "Manulife")

        if url:
            print(f"\n✅ 成功找到官网: {url}")

            # 验证URL
            print("   验证URL可访问性...")
            if scraper.verify_url(url):
                print("   ✅ URL可访问\n")
            else:
                print("   ❌ URL无法访问\n")
        else:
            print("\n❌ 未找到官网\n")

        # 测试2: 搜索产品URL
        print("\n【测试2】搜索宏摯傳承保障計劃")
        print("-"*70)
        url = scraper.search_product_url("宏利", "宏摯傳承保障計劃")

        if url:
            print(f"\n✅ 成功找到产品页: {url}")

            # 验证URL
            print("   验证URL可访问性...")
            if scraper.verify_url(url):
                print("   ✅ URL可访问\n")
            else:
                print("   ❌ URL无法访问\n")
        else:
            print("\n❌ 未找到产品页\n")

    print("="*70)
    print("  ✅ 测试完成")
    print("="*70 + "\n")


if __name__ == '__main__':
    try:
        test_search()
    except KeyboardInterrupt:
        print("\n\n⚠️  用户中断\n")
    except Exception as e:
        print(f"\n❌ 错误: {str(e)}\n")
        import traceback
        traceback.print_exc()
