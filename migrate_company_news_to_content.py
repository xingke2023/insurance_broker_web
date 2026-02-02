#!/usr/bin/env python3
"""
迁移旧公司新闻数据：将case_description迁移到content字段
"""
import os
import sys
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import CustomerCase

def migrate_old_company_news():
    """将旧的公司新闻从case_description迁移到content字段"""
    print("🔄 开始迁移旧公司新闻数据...\n")

    # 查找所有公司新闻中content为空但case_description有内容的记录
    old_news = CustomerCase.objects.filter(
        category='公司新闻',
        content='',
        case_description__isnull=False
    ).exclude(case_description='')

    count = old_news.count()
    print(f"📋 找到 {count} 条需要迁移的记录\n")

    if count == 0:
        print("✅ 没有需要迁移的记录")
        return

    # 执行迁移
    migrated = 0
    for news in old_news:
        print(f"迁移记录 ID: {news.id}")
        print(f"  标题: {news.title}")
        print(f"  原case_description长度: {len(news.case_description)} 字符")

        # 将case_description的内容复制到content
        news.content = news.case_description
        # 清空case_description（可选）
        # news.case_description = ''
        news.save()

        print(f"  ✅ 已迁移到content字段 ({len(news.content)} 字符)\n")
        migrated += 1

    print(f"🎉 迁移完成！共处理 {migrated} 条记录")

    # 验证迁移结果
    print("\n📊 迁移后的数据统计：")
    all_news = CustomerCase.objects.filter(category='公司新闻')
    with_content = all_news.exclude(content='').count()
    print(f"  总记录数: {all_news.count()}")
    print(f"  使用content字段: {with_content}")
    print(f"  迁移成功率: {with_content}/{all_news.count()}")

if __name__ == "__main__":
    migrate_old_company_news()
