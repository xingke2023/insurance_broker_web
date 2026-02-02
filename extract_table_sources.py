#!/usr/bin/env python3
"""
步骤1.5: 提取每个表格的HTML源代码
从OCR内容中提取每个表格对应的<table>标签内容
"""
import os
import sys
import re


def extract_all_tables_html(content):
    """
    从OCR内容中提取所有<table>标签

    Args:
        content: OCR识别的完整内容

    Returns:
        list: [{'index': 1, 'html': '<table>...</table>', 'rows': 20}, ...]
    """
    # 使用正则提取所有<table>标签
    table_pattern = re.compile(r'<table[^>]*>(.*?)</table>', re.DOTALL | re.IGNORECASE)
    matches = table_pattern.finditer(content)

    tables = []
    for i, match in enumerate(matches, 1):
        table_html = match.group(0)  # 完整的<table>...</table>

        # 统计<tr>数量（行数）
        tr_count = len(re.findall(r'<tr[^>]*>', table_html, re.IGNORECASE))

        tables.append({
            'index': i,
            'html': table_html,
            'rows': tr_count,
            'start_pos': match.start(),
            'end_pos': match.end()
        })

    return tables


def find_table_title(content, table_start_pos):
    """
    查找表格前的标题

    Args:
        content: 完整内容
        table_start_pos: 表格起始位置

    Returns:
        str: 表格标题（可能为空）
    """
    # 往前查找最多500个字符
    search_start = max(0, table_start_pos - 500)
    before_table = content[search_start:table_start_pos]

    # 按行分割，找最后一个非空、非HTML标签的行
    lines = before_table.split('\n')
    for line in reversed(lines):
        line = line.strip()
        # 跳过空行、HTML标签、纯数字
        if line and not line.startswith('<') and not line.endswith('>') and len(line) > 5:
            # 可能是标题
            return line

    return ""


def match_table_to_summary(tables_html, summary_tables):
    """
    将提取的HTML表格与概要中的表格匹配

    Args:
        tables_html: 提取的HTML表格列表
        summary_tables: 表格概要列表（来自步骤1）

    Returns:
        dict: {概要表格编号: HTML表格索引}
    """
    matches = {}

    # 简单策略：按顺序匹配（假设OCR中的表格顺序与概要一致）
    # 更复杂的策略可以根据标题、行数等特征匹配

    for i, summary_table in enumerate(summary_tables, 1):
        if i <= len(tables_html):
            matches[i] = tables_html[i - 1]

    return matches


def parse_tablesummary(summary_file):
    """解析表格概要文件"""
    try:
        with open(summary_file, 'r', encoding='utf-8') as f:
            summary = f.read()
    except FileNotFoundError:
        return None

    tables = []
    current_table = {}

    lines = summary.strip().split('\n')
    table_number = 0

    for line in lines:
        line = line.strip()

        if line and line[0].isdigit() and line[1:3] in ['.', '、', '：']:
            if current_table and current_table.get('name'):
                tables.append(current_table)

            table_number += 1
            current_table = {
                'number': table_number,
                'name': '',
                'rows': '',
                'fields': ''
            }

        elif line.startswith('表名：') or line.startswith('表名:'):
            current_table['name'] = line.replace('表名：', '').replace('表名:', '').strip()

        elif line.startswith('行数：') or line.startswith('行数:') or line.startswith('行數：') or line.startswith('行數:'):
            current_table['rows'] = line.replace('行数：', '').replace('行数:', '').replace('行數：', '').replace('行數:', '').strip()

        elif line.startswith('基本字段：') or line.startswith('基本字段:'):
            current_table['fields'] = line.replace('基本字段：', '').replace('基本字段:', '').strip()

    if current_table and current_table.get('name'):
        tables.append(current_table)

    return tables


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("=" * 80)
        print("步骤1.5: 提取表格HTML源代码")
        print("=" * 80)
        print()
        print("用法：python3 extract_table_sources.py <OCR文本文件路径>")
        print()
        print("功能：")
        print("  1. 从OCR内容中提取所有<table>标签")
        print("  2. 与步骤1的表格概要匹配")
        print("  3. 保存每个表格的HTML源代码")
        print()
        print("示例：")
        print("  python3 extract_table_sources.py '中銀集團人壽 保險有限公司.txt'")
        print()
        print("输出：")
        print("  - *_table1_source.html   (表格1的HTML源代码)")
        print("  - *_table2_source.html   (表格2的HTML源代码)")
        print("  - ...")
        print()
        print("⚠️  前置步骤：需要先运行 test_extract_tablesummary.py")
        print()
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"❌ 错误：文件不存在: {file_path}")
        sys.exit(1)

    # 读取OCR内容
    print(f"📄 读取文件: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ 读取文件失败: {e}")
        sys.exit(1)

    print(f"✅ 文件读取成功，内容长度: {len(content):,} 字符")
    print()

    # 读取表格概要
    base_filename = os.path.splitext(file_path)[0]
    summary_file = f"{base_filename}_tablesummary.txt"

    if not os.path.exists(summary_file):
        print(f"❌ 未找到表格概要文件: {summary_file}")
        print()
        print("请先运行步骤1：")
        print(f"  python3 test_extract_tablesummary.py '{file_path}'")
        sys.exit(1)

    print(f"📋 读取表格概要: {summary_file}")
    summary_tables = parse_tablesummary(summary_file)

    if not summary_tables:
        print("❌ 表格概要解析失败")
        sys.exit(1)

    print(f"✅ 概要中识别到 {len(summary_tables)} 个表格")
    print()

    # 提取所有<table>标签
    print("🔍 从OCR内容中提取所有<table>标签...")
    tables_html = extract_all_tables_html(content)

    print(f"✅ 提取到 {len(tables_html)} 个<table>标签")
    print()

    # 显示HTML表格信息
    print("=" * 80)
    print("OCR中的<table>标签分析：")
    print("=" * 80)
    for table in tables_html:
        # 查找标题
        title = find_table_title(content, table['start_pos'])
        print(f"表格 #{table['index']}:")
        print(f"  行数: {table['rows']}")
        print(f"  HTML长度: {len(table['html']):,} 字符")
        print(f"  可能的标题: {title[:50]}..." if title else "  可能的标题: (未找到)")
        print()

    # 匹配概要与HTML
    print("=" * 80)
    print("匹配概要与HTML表格：")
    print("=" * 80)

    if len(tables_html) < len(summary_tables):
        print(f"⚠️  警告：HTML表格数({len(tables_html)}) < 概要表格数({len(summary_tables)})")
        print("   可能原因：某些表格未被OCR识别为<table>标签")
        print()

    # 简单匹配：按顺序一一对应
    saved_count = 0
    for i, summary_table in enumerate(summary_tables, 1):
        if i <= len(tables_html):
            html_table = tables_html[i - 1]

            # 保存HTML源代码
            output_file = f"{base_filename}_table{i}_source.html"

            with open(output_file, 'w', encoding='utf-8') as f:
                # 添加标题注释
                f.write(f"<!-- 表格 {i}: {summary_table['name']} -->\n")
                f.write(f"<!-- 预期行数: {summary_table['rows']} -->\n")
                f.write(f"<!-- 实际HTML行数: {html_table['rows']} -->\n")
                f.write(f"<!-- 字段: {summary_table['fields']} -->\n\n")
                f.write(html_table['html'])

            print(f"✅ 表格 {i}: {summary_table['name']}")
            print(f"   概要行数: {summary_table['rows']}")
            print(f"   HTML行数: {html_table['rows']}")
            print(f"   已保存: {output_file}")
            print()

            saved_count += 1
        else:
            print(f"⚠️  表格 {i}: {summary_table['name']}")
            print(f"   未找到对应的HTML表格（OCR可能未识别）")
            print()

    print("=" * 80)
    print(f"✅ 完成！成功保存 {saved_count} 个表格的HTML源代码")
    print("=" * 80)
    print()
    print("生成的文件：")
    for i in range(1, saved_count + 1):
        print(f"  - {base_filename}_table{i}_source.html")
    print()
    print("下一步：")
    print(f"  python3 extract_table_data_from_html.py '{file_path}'")
    print()


if __name__ == '__main__':
    main()
