#!/usr/bin/env python3
"""
诊断工具：检查为什么某些表格没有被提取
"""
import os
import sys
import re
from dotenv import load_dotenv

load_dotenv()


def analyze_all_tables(content):
    """分析所有表格，无论是否包含"保单年度终结"列"""

    table_pattern = re.compile(r'<table[^>]*>(.*?)</table>', re.DOTALL | re.IGNORECASE)
    matches = list(table_pattern.finditer(content))

    year_keywords = ['保单年度终结', '保單年度終結']

    print("=" * 80)
    print(f"文档中共有 {len(matches)} 个<table>标签")
    print("=" * 80)
    print()

    tables_with_year = []
    tables_without_year = []

    for idx, match in enumerate(matches, 1):
        table_html = match.group(0)

        # 提取表格的第一行（表头）
        first_tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
        first_tr_match = first_tr_pattern.search(table_html)

        if not first_tr_match:
            continue

        first_row = first_tr_match.group(1)
        row_count = len(re.findall(r'<tr[^>]*>', table_html, re.IGNORECASE))

        # 提取第一行中所有<th>或<td>单元格的文本
        cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.DOTALL | re.IGNORECASE)
        cells = cell_pattern.findall(first_row)

        # 清理HTML标签，只保留纯文本
        header_texts = []
        for cell in cells:
            text = re.sub(r'<[^>]+>', '', cell).strip()
            header_texts.append(text)

        # 生成表头预览
        header_text = '|'.join(header_texts)

        # 查找表格标题
        search_start = max(0, match.start() - 500)
        before_table = content[search_start:match.start()]
        lines = before_table.split('\n')
        title = ""
        for line in reversed(lines):
            line = line.strip()
            if line and not line.startswith('<') and not line.endswith('>') and 5 < len(line) < 200:
                title = line
                break

        # 检查表头单元格中是否包含"保单年度终结"列（更严格）
        has_year_column = any(
            any(keyword in header_text for keyword in year_keywords)
            for header_text in header_texts
        )

        table_info = {
            'index': idx,
            'row_count': row_count,
            'title': title[:80] if title else '(无标题)',
            'header': header_text[:100],
            'has_year_column': has_year_column,
            'start_pos': match.start()
        }

        if has_year_column:
            tables_with_year.append(table_info)
        else:
            tables_without_year.append(table_info)

    # 显示包含"保单年度终结"列的表格
    print(f"✅ 包含'保单年度终结'列的表格：{len(tables_with_year)} 个")
    print("-" * 80)
    for t in tables_with_year:
        print(f"表格 #{t['index']} ({t['row_count']}行)")
        print(f"  标题: {t['title']}")
        print(f"  表头: {t['header'][:80]}...")
        print()

    print("=" * 80)

    # 显示不包含"保单年度终结"列的表格
    print(f"❌ 不包含'保单年度终结'列的表格：{len(tables_without_year)} 个")
    print("-" * 80)
    for t in tables_without_year:
        print(f"表格 #{t['index']} ({t['row_count']}行)")
        print(f"  标题: {t['title']}")
        print(f"  表头: {t['header'][:80]}...")
        print()

    return tables_with_year, tables_without_year


def check_table_by_title(content, target_title):
    """根据标题查找特定表格"""

    table_pattern = re.compile(r'<table[^>]*>(.*?)</table>', re.DOTALL | re.IGNORECASE)
    matches = list(table_pattern.finditer(content))

    print("=" * 80)
    print(f"搜索标题包含: {target_title}")
    print("=" * 80)
    print()

    for idx, match in enumerate(matches, 1):
        table_html = match.group(0)

        # 查找表格标题
        search_start = max(0, match.start() - 500)
        before_table = content[search_start:match.start()]
        lines = before_table.split('\n')
        title = ""
        for line in reversed(lines):
            line = line.strip()
            if line and not line.startswith('<') and not line.endswith('>') and 5 < len(line) < 200:
                title = line
                break

        if target_title in title:
            # 提取表头
            first_tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
            first_tr_match = first_tr_pattern.search(table_html)

            if first_tr_match:
                first_row = first_tr_match.group(1)

                # 提取第一行中所有<th>或<td>单元格的文本
                cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.DOTALL | re.IGNORECASE)
                cells = cell_pattern.findall(first_row)

                # 清理HTML标签，只保留纯文本
                header_texts = []
                for cell in cells:
                    text = re.sub(r'<[^>]+>', '', cell).strip()
                    header_texts.append(text)

                header_text = '|'.join(header_texts)
                row_count = len(re.findall(r'<tr[^>]*>', table_html, re.IGNORECASE))

                year_keywords = ['保单年度终结', '保單年度終結']
                has_year_column = any(
                    any(keyword in header_text for keyword in year_keywords)
                    for header_text in header_texts
                )

                print(f"✅ 找到匹配的表格 #{idx}")
                print(f"  完整标题: {title}")
                print(f"  行数: {row_count}")
                print(f"  表头: {header_text}")
                print(f"  是否包含'保单年度终结'列: {'是' if has_year_column else '否'}")
                print()

                if not has_year_column:
                    print("⚠️  问题诊断：")
                    print("  该表格的表头中没有'保单年度终结'或'保單年度終結'列")
                    print("  因此被过滤规则排除了")
                    print()
                    print("  可能的原因：")
                    print("  1. OCR识别错误，列名被识别成其他文字")
                    print("  2. 该表格确实不包含年度数据")
                    print("  3. 列名使用了不同的写法（如'保單年度'、'年度'等）")
                    print()

                return True

    print(f"❌ 未找到标题包含'{target_title}'的表格")
    return False


def main():
    if len(sys.argv) < 2:
        print("=" * 80)
        print("诊断工具：检查为什么某些表格没有被提取 🔍")
        print("=" * 80)
        print()
        print("用法1：分析所有表格")
        print("  python3 diagnose_missing_table.py <OCR文本文件路径>")
        print()
        print("用法2：检查特定标题的表格")
        print("  python3 diagnose_missing_table.py <OCR文本文件路径> <表格标题关键词>")
        print()
        print("示例：")
        print("  python3 diagnose_missing_table.py '文件.txt'")
        print("  python3 diagnose_missing_table.py '文件.txt' '補充說明'")
        print()
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"❌ 错误：文件不存在: {file_path}")
        sys.exit(1)

    # 读取文件
    print(f"📄 读取OCR文件: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ 读取文件失败: {e}")
        sys.exit(1)

    print(f"✅ 文件读取成功，内容长度: {len(content):,} 字符")
    print()

    # 如果提供了标题关键词，进行精确查找
    if len(sys.argv) >= 3:
        target_title = sys.argv[2]
        check_table_by_title(content, target_title)
    else:
        # 分析所有表格
        analyze_all_tables(content)


if __name__ == '__main__':
    main()
