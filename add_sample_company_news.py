#!/usr/bin/env python3
"""
添加示例公司新闻数据

使用方法:
    python3 add_sample_company_news.py
"""

import os
import django
import sys
from datetime import date, timedelta

# 设置Django环境
sys.path.append('/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceCompany, CompanyNews


def add_sample_news():
    """添加示例新闻"""
    print("=" * 60)
    print("添加示例公司新闻")
    print("=" * 60)

    # 获取所有启用的公司
    companies = InsuranceCompany.objects.filter(is_active=True)

    if not companies.exists():
        print("\n❌ 错误: 没有找到启用的保险公司")
        return

    print(f"\n找到 {companies.count()} 家启用的保险公司\n")

    sample_news = [
        {
            'title': '推出全新储蓄保险产品',
            'content_type': 'news',
            'description': '公司最新推出的储蓄保险产品将为客户提供更优厚的回报率和更灵活的提取选项。',
            'is_featured': True,
            'days_ago': 1,
        },
        {
            'title': '2026年第一季度业绩公告',
            'content_type': 'announcement',
            'description': '公司公布2026年第一季度财务业绩，总保费收入同比增长15%。',
            'is_featured': False,
            'days_ago': 3,
        },
        {
            'title': '客户服务优化通知',
            'content_type': 'announcement',
            'description': '为提升客户体验，我们将在2月15日起实施新的客户服务流程。',
            'is_featured': False,
            'days_ago': 7,
        },
        {
            'title': '年度产品说明会邀请函',
            'content_type': 'article',
            'description': '诚邀您参加我们的年度产品说明会，了解最新的保险产品和市场趋势。',
            'is_featured': True,
            'days_ago': 10,
        },
    ]

    created_count = 0

    # 为前5家公司各添加2-3条新闻
    for i, company in enumerate(companies[:5]):
        print(f"为 {company.name} 添加新闻...")

        # 每家公司添加2-3条新闻
        news_to_add = sample_news[:3] if i % 2 == 0 else sample_news[:2]

        for news_data in news_to_add:
            news = CompanyNews.objects.create(
                company=company,
                title=f"{company.name}{news_data['title']}",
                content_type=news_data['content_type'],
                description=news_data['description'],
                content=f"""
                <div>
                    <h2>{company.name}{news_data['title']}</h2>
                    <p>{news_data['description']}</p>
                    <p>详细信息请访问公司官网或联系我们的客户服务团队。</p>
                </div>
                """,
                url=company.website_url if company.website_url else f"https://example.com/news/{company.code}",
                published_date=date.today() - timedelta(days=news_data['days_ago']),
                is_active=True,
                is_featured=news_data['is_featured'],
                sort_order=0 if news_data['is_featured'] else 10,
            )
            created_count += 1
            print(f"  ✅ 创建: {news.title}")

        print()

    print("=" * 60)
    print(f"✅ 成功创建 {created_count} 条新闻")
    print("=" * 60)

    # 显示统计
    print(f"\n最新统计：")
    print(f"  总新闻数: {CompanyNews.objects.count()}")
    print(f"  启用新闻: {CompanyNews.objects.filter(is_active=True).count()}")
    print(f"  精选新闻: {CompanyNews.objects.filter(is_featured=True, is_active=True).count()}")


if __name__ == '__main__':
    try:
        add_sample_news()
    except Exception as e:
        print(f"\n❌ 错误: {str(e)}")
        import traceback
        traceback.print_exc()
