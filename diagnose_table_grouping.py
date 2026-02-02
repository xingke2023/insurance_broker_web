#!/usr/bin/env python3
"""
诊断脚本：检查表格分组是否正确
"""
import os
import sys
import django

# 设置Django环境
sys.path.insert(0, '/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import PlanDocument
from api.tasks import extract_tables_with_year_column, group_tables_by_title

def diagnose_document(document_id):
    """诊断指定文档的表格提取和分组"""
    try:
        doc = PlanDocument.objects.get(id=document_id)
    except PlanDocument.DoesNotExist:
        print(f"❌ 文档 {document_id} 不存在")
        return

    print(f"📄 文档: {doc.file_name}")
    print(f"📊 tablecontent长度: {len(doc.tablecontent) if doc.tablecontent else 0} 字符")
    print("=" * 80)

    if not doc.tablecontent:
        print("⚠️ tablecontent为空，请先运行'重新提取'")
        return

    # 步骤1：提取所有包含"保单年度终结"的<table>标签
    print("\n🔍 步骤1: 提取包含'保单年度终结'的<table>标签")
    table_tags = extract_tables_with_year_column(doc.tablecontent)
    print(f"   提取到 {len(table_tags)} 个<table>标签\n")

    # 显示每个表格的详细信息
    for i, tag in enumerate(table_tags, 1):
        from api.tasks import find_table_title, extract_table_headers, check_first_year_in_table

        title = find_table_title(doc.tablecontent, tag['start_pos'])
        headers = extract_table_headers(tag['html'])
        starts_from_one = check_first_year_in_table(tag['html'])

        print(f"   表格 {i}:")
        print(f"      标题: {title or '(无标题)'}")
        print(f"      表头: {headers[:100]}..." if len(headers) > 100 else f"      表头: {headers}")
        print(f"      行数: {tag['row_count']}")
        print(f"      从年度1开始: {'✅ 是' if starts_from_one else '❌ 否'}")
        print()

    # 步骤2：分组
    print("\n🔄 步骤2: 自动分组（合并跨页表格）")
    grouped = group_tables_by_title(table_tags, doc.tablecontent)
    print(f"   分组后: {len(grouped)} 个逻辑表格\n")

    for i, group in enumerate(grouped, 1):
        print(f"   逻辑表格 {i}: 包含 {len(group)} 个<table>标签")
        for j, tag in enumerate(group, 1):
            title = tag.get('title', '(无)')
            starts = '从1开始' if tag.get('starts_from_one') else '续表'
            print(f"      - <table> {j}: {title} ({starts}, {tag['row_count']}行)")
        print()

    print("=" * 80)
    print(f"📊 总结:")
    print(f"   原始<table>标签数: {len(table_tags)}")
    print(f"   分组后逻辑表格数: {len(grouped)}")
    print(f"   数据库中PlanTable记录数: {doc.plantable_set.count()}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python diagnose_table_grouping.py <document_id>")
        print("示例: python diagnose_table_grouping.py 159")
        sys.exit(1)

    document_id = int(sys.argv[1])
    diagnose_document(document_id)
