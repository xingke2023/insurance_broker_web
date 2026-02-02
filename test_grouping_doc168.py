#!/usr/bin/env python3
"""测试document 168的表格分组逻辑"""

import os
import sys
import django
import re

# 设置Django环境
sys.path.insert(0, '/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import PlanDocument
from api.tasks import (
    group_tables_by_title,
    find_table_title,
    extract_table_headers,
    check_first_year_in_table
)

def main():
    doc = PlanDocument.objects.get(id=168)

    # 提取所有table标签
    table_pattern = re.compile(r'<table[^>]*>.*?</table>', re.DOTALL | re.IGNORECASE)
    all_tables = table_pattern.findall(doc.tablecontent)

    print(f"=" * 80)
    print(f"Document 168 表格分组测试")
    print(f"=" * 80)
    print(f"总表格数: {len(all_tables)}\n")

    # 构建table_tags结构
    table_tags = []
    current_pos = 0

    for i, table_html in enumerate(all_tables, 1):
        start_pos = doc.tablecontent.find(table_html, current_pos)
        end_pos = start_pos + len(table_html)

        # 提取行数
        tr_pattern = re.compile(r'<tr[^>]*>.*?</tr>', re.DOTALL | re.IGNORECASE)
        rows = tr_pattern.findall(table_html)
        row_count = len(rows)

        table_tags.append({
            'html': table_html,
            'start_pos': start_pos,
            'end_pos': end_pos,
            'row_count': row_count
        })

        current_pos = end_pos

    # 调用分组函数
    print("正在调用 group_tables_by_title...")
    grouped = group_tables_by_title(table_tags, doc.tablecontent)

    print(f"\n分组结果: {len(grouped)} 个逻辑表格\n")
    print(f"=" * 80)

    # 显示每组的详细信息
    for i, group in enumerate(grouped, 1):
        print(f"\n逻辑表格 {i}:")
        print(f"  包含 {len(group)} 个<table>标签")

        first_table = group[0]
        title = first_table.get('title', '')
        headers = first_table.get('headers', [])
        starts_from_one = first_table.get('starts_from_one', False)

        print(f"  标题: {title}")
        print(f"  从年度1开始: {starts_from_one}")
        print(f"  表头: {headers[:5]}")

        # 显示组内每个表格的年度起始值
        for j, table in enumerate(group):
            # 提取第一个数据行的年度值
            tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
            rows = tr_pattern.findall(table['html'])
            cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.DOTALL | re.IGNORECASE)

            first_year = "?"
            for row in rows[:10]:
                if '<th' in row.lower():
                    continue
                cells = cell_pattern.findall(row)
                for cell in cells[:3]:
                    cell_text = re.sub(r'<[^>]+>', '', cell).strip()
                    cell_text = re.sub(r'\s+', '', cell_text).replace(',', '')
                    if cell_text.isdigit():
                        first_year = cell_text
                        break
                if first_year != "?":
                    break

            print(f"    - 表{j+1}: 起始年度={first_year}, 行数={table['row_count']}")

    print(f"\n{'='*80}")
    print(f"总结:")
    print(f"  - tablecontent中的表格数: {len(all_tables)}")
    print(f"  - 分组后的逻辑表格数: {len(grouped)}")
    print(f"  - 数据库中保存的表格数: 4")
    print(f"  - 未分组的表格数: {len(all_tables) - sum(len(g) for g in grouped)}")

if __name__ == '__main__':
    main()
