#!/usr/bin/env python3
"""
重新处理现有文档以提取表格数据
适用于新功能上线前已存在的文档
"""
import os
import sys
import django

# 设置Django环境
sys.path.insert(0, '/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import PlanDocument, PlanTable
from api.tasks import extract_tablesummary_task

def reprocess_documents():
    """重新处理所有没有表格数据的文档"""

    # 查找所有状态为completed且有tablesummary但没有plan_tables的文档
    documents = PlanDocument.objects.filter(
        status='completed'
    ).exclude(
        tablesummary=''
    )

    print(f"📋 找到 {documents.count()} 个已完成的文档")
    print()

    # 筛选出没有表格数据的文档
    docs_without_tables = []
    for doc in documents:
        if doc.plan_tables.count() == 0:
            docs_without_tables.append(doc)

    print(f"🔍 其中 {len(docs_without_tables)} 个文档缺少表格数据")
    print()

    if len(docs_without_tables) == 0:
        print("✅ 所有文档都已有表格数据，无需重新处理")
        return

    # 询问用户是否继续
    print("将对以下文档重新提取表格数据：")
    for i, doc in enumerate(docs_without_tables[:5], 1):
        print(f"  {i}. ID:{doc.id} - {doc.file_name}")

    if len(docs_without_tables) > 5:
        print(f"  ... 还有 {len(docs_without_tables) - 5} 个文档")

    print()
    response = input("是否继续？(y/n): ")

    if response.lower() != 'y':
        print("❌ 已取消")
        return

    print()
    print("=" * 80)
    print("开始重新处理文档...")
    print("=" * 80)
    print()

    # 对每个文档重新提取表格
    success_count = 0
    error_count = 0

    for i, doc in enumerate(docs_without_tables, 1):
        print(f"[{i}/{len(docs_without_tables)}] 处理文档 ID:{doc.id} - {doc.file_name}")

        try:
            # 调用表格提取逻辑（从tasks.py复制）
            from api.tasks import (
                parse_summary,
                extract_tables_with_year_column,
                group_tables_by_summary,
                merge_table_tags
            )

            if not doc.tablesummary:
                print(f"  ⚠️  跳过：没有表格概要")
                continue

            if not doc.content:
                print(f"  ⚠️  跳过：没有OCR内容")
                continue

            # 解析表格概要
            summary_tables = parse_summary(doc.tablesummary)
            print(f"  📋 概要识别到 {len(summary_tables)} 个逻辑表格")

            # 提取包含"保单年度终结"的<table>标签
            table_tags = extract_tables_with_year_column(doc.content)
            print(f"  📊 提取到 {len(table_tags)} 个包含'保单年度终结'的<table>标签")

            if len(table_tags) == 0:
                print(f"  ⚠️  跳过：没有找到相关表格")
                continue

            # 根据概要分组并合并
            grouped = group_tables_by_summary(table_tags, summary_tables, doc.content)

            # 清空旧数据（如果有）
            PlanTable.objects.filter(plan_document=doc).delete()

            # 保存每个表格
            saved_count = 0
            for table_number, tags in grouped.items():
                if table_number > len(summary_tables):
                    continue

                summary_table = summary_tables[table_number - 1]

                # 合并<table>标签
                merged_html = merge_table_tags(tags)
                total_rows = sum(tag['row_count'] for tag in tags)

                # 保存到数据库
                PlanTable.objects.create(
                    plan_document=doc,
                    table_number=table_number,
                    table_name=summary_table['name'],
                    row_count=total_rows,
                    fields=summary_table['fields'],
                    html_source=merged_html
                )

                saved_count += 1

            print(f"  ✅ 成功保存 {saved_count} 个表格")
            success_count += 1

        except Exception as e:
            print(f"  ❌ 处理失败: {e}")
            error_count += 1
            import traceback
            traceback.print_exc()

        print()

    print("=" * 80)
    print("处理完成！")
    print("=" * 80)
    print(f"✅ 成功: {success_count} 个文档")
    print(f"❌ 失败: {error_count} 个文档")
    print()


if __name__ == '__main__':
    reprocess_documents()
