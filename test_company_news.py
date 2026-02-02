#!/usr/bin/env python3
"""
测试公司新闻功能

使用方法:
    python3 test_company_news.py
"""

import os
import django
import sys

# 设置Django环境
sys.path.append('/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceCompany, CompanyNews
from datetime import date


def test_company_website_url():
    """测试公司官网字段"""
    print("=" * 60)
    print("测试1: 保险公司官网字段")
    print("=" * 60)

    companies = InsuranceCompany.objects.filter(is_active=True)[:5]

    print(f"\n查询到 {companies.count()} 家启用的保险公司：\n")

    for company in companies:
        print(f"公司: {company.name}")
        print(f"  代码: {company.code}")
        print(f"  官网: {company.website_url or '(未设置)'}")
        print(f"  产品数: {company.products.count()}")
        print()


def test_company_news_model():
    """测试公司新闻模型"""
    print("=" * 60)
    print("测试2: 公司新闻模型")
    print("=" * 60)

    news_count = CompanyNews.objects.count()
    active_news = CompanyNews.objects.filter(is_active=True).count()
    featured_news = CompanyNews.objects.filter(is_featured=True, is_active=True).count()

    print(f"\n新闻统计：")
    print(f"  总新闻数: {news_count}")
    print(f"  启用新闻: {active_news}")
    print(f"  精选新闻: {featured_news}")

    if news_count > 0:
        print(f"\n最近5条新闻：\n")
        recent_news = CompanyNews.objects.filter(is_active=True).order_by('-created_at')[:5]
        for news in recent_news:
            print(f"标题: {news.title}")
            print(f"  公司: {news.company.name}")
            print(f"  类型: {news.get_content_type_display()}")
            print(f"  发布日期: {news.published_date or '未设置'}")
            print(f"  浏览次数: {news.view_count}")
            print(f"  是否精选: {'是' if news.is_featured else '否'}")
            print()


def create_sample_news():
    """创建示例新闻数据"""
    print("=" * 60)
    print("测试3: 创建示例新闻")
    print("=" * 60)

    # 获取第一家公司
    company = InsuranceCompany.objects.filter(is_active=True).first()

    if not company:
        print("\n❌ 错误: 没有找到启用的保险公司")
        return

    print(f"\n为公司 {company.name} 创建示例新闻...\n")

    # 创建新闻
    news = CompanyNews.objects.create(
        company=company,
        title=f"{company.name}推出创新保险产品",
        content_type='news',
        description="公司最新推出的保险产品将为客户提供更全面的保障",
        content="""
        <h2>产品亮点</h2>
        <ul>
            <li>保障范围更广</li>
            <li>保费更优惠</li>
            <li>理赔流程更简化</li>
        </ul>
        """,
        url=company.website_url if company.website_url else "https://example.com",
        published_date=date.today(),
        is_active=True,
        is_featured=True,
        sort_order=0
    )

    print(f"✅ 成功创建新闻: {news.title}")
    print(f"   ID: {news.id}")
    print(f"   类型: {news.get_content_type_display()}")
    print(f"   是否精选: {'是' if news.is_featured else '否'}")

    return news


def test_news_api_logic():
    """测试新闻API逻辑"""
    print("=" * 60)
    print("测试4: 新闻API逻辑")
    print("=" * 60)

    # 获取所有公司的新闻统计
    companies = InsuranceCompany.objects.filter(is_active=True)

    print(f"\n各公司新闻统计：\n")

    for company in companies[:10]:  # 只显示前10家
        news_count = company.news.filter(is_active=True).count()
        featured_count = company.news.filter(is_active=True, is_featured=True).count()

        if news_count > 0:
            print(f"{company.name}:")
            print(f"  总新闻: {news_count}")
            print(f"  精选: {featured_count}")


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("公司新闻功能测试")
    print("=" * 60 + "\n")

    try:
        # 测试1: 公司官网字段
        test_company_website_url()

        # 测试2: 新闻模型
        test_company_news_model()

        # 测试3: 创建示例数据（可选）
        create_sample = input("\n是否创建示例新闻？(y/n): ").lower()
        if create_sample == 'y':
            create_sample_news()

        # 测试4: API逻辑
        test_news_api_logic()

        print("\n" + "=" * 60)
        print("✅ 所有测试完成")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
