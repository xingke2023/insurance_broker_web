#!/usr/bin/env python3
"""诊断document 168表格过滤问题"""

import os
import sys
import django
import re

# 设置Django环境
sys.path.insert(0, '/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import PlanDocument

def check_year_column_has_valid_format(table_html):
    """检查表格的"保单年度终结"列的第一个数据值是否为有效格式"""
    tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
    rows = tr_pattern.findall(table_html)

    if not rows:
        return False, "无行数据"

    cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.DOTALL | re.IGNORECASE)

    # 1. 找到"保单年度终结"列的索引位置
    year_column_index = None
    header_cell_count = None

    for row_idx, row in enumerate(rows[:5]):
        cells = cell_pattern.findall(row)
        for idx, cell in enumerate(cells):
            cell_text = re.sub(r'<[^>]+>', '', cell).strip()
            cell_text_cleaned = re.sub(r'\s+', '', cell_text)

            if '保单年度终结' in cell_text_cleaned or '保單年度終結' in cell_text_cleaned:
                year_column_index = idx
                header_cell_count = len(cells)
                break

        if year_column_index is not None:
            break

    if year_column_index is None:
        return False, "未找到'保单年度终结'列"

    # 2. 找到单元格数量最多的数据行（完整数据行，不受rowspan影响）
    max_cell_count = 0
    for row in rows:
        if '<th' in row.lower():
            continue
        cells = cell_pattern.findall(row)
        if len(cells) > max_cell_count:
            max_cell_count = len(cells)

    if max_cell_count == 0:
        return False, "无数据行"

    # 3. 在完整数据行中检查该列的值
    for row_idx, row in enumerate(rows):
        if '<th' in row.lower():
            continue

        cells = cell_pattern.findall(row)

        if len(cells) < max_cell_count:
            continue

        if year_column_index >= len(cells):
            continue

        year_cell = re.sub(r'<[^>]+>', '', cells[year_column_index]).strip()
        year_cell_cleaned = re.sub(r'\s+', '', year_cell).replace(',', '')

        if '保单年度终结' in year_cell_cleaned or '保單年度終結' in year_cell_cleaned:
            continue

        is_pure_digit = year_cell_cleaned.isdigit()
        is_age_format = re.match(r'^\d+[歲岁]$', year_cell_cleaned) is not None

        if is_pure_digit or is_age_format:
            return True, f"有效值: {year_cell_cleaned}"
        else:
            return False, f"无效值: {year_cell_cleaned}"

    return False, "未找到数据行"


def main():
    doc = PlanDocument.objects.get(id=168)

    # 提取所有table标签
    table_pattern = re.compile(r'<table[^>]*>.*?</table>', re.DOTALL | re.IGNORECASE)
    tables = table_pattern.findall(doc.tablecontent)

    print(f"=" * 80)
    print(f"文档168诊断报告")
    print(f"=" * 80)
    print(f"文件名: {doc.file_name}")
    print(f"tablecontent中总表格数: {len(tables)}")
    print(f"数据库中保存的表格数: 4")
    print(f"=" * 80)
    print()

    year_keywords = ['保单年度终结', '保單年度終結']

    for i, table_html in enumerate(tables, 1):
        print(f"\n{'='*80}")
        print(f"表格 {i}")
        print(f"{'='*80}")

        # 检查是否包含关键词
        table_cleaned = table_html.replace('\n', '').replace('\r', '')
        has_keyword = any(keyword in table_cleaned for keyword in year_keywords)

        print(f"✓ 包含'保单年度终结'关键词: {has_keyword}")

        if has_keyword:
            # 检查值格式
            is_valid, reason = check_year_column_has_valid_format(table_html)
            print(f"✓ 值格式有效: {is_valid} ({reason})")

            if not is_valid:
                # 显示表格预览
                preview = table_cleaned[:300].replace('<', '\n<')
                print(f"\n表格预览:")
                print(preview)
        else:
            print(f"✗ 不包含关键词，跳过")

        # 提取表头信息
        tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
        rows = tr_pattern.findall(table_html)
        if rows:
            first_row = rows[0]
            cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.DOTALL | re.IGNORECASE)
            cells = cell_pattern.findall(first_row)
            headers = [re.sub(r'<[^>]+>', '', cell).strip().replace('\n', '') for cell in cells[:5]]
            print(f"\n前5列表头: {headers}")


if __name__ == '__main__':
    main()
