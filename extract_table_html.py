#!/usr/bin/env python3
"""
步骤1.5: 提取并合并表格的HTML内容
从OCR内容中提取每个表格对应的<table>标签，跨页表格自动合并
"""
import os
import sys
import re


def extract_all_table_tags(content):
    """
    从OCR内容中提取所有<table>标签

    Args:
        content: 完整OCR内容

    Returns:
        list: [{'html': '<table>...</table>', 'start_pos': 100, 'row_count': 20}, ...]
    """
    table_pattern = re.compile(r'<table[^>]*>(.*?)</table>', re.DOTALL | re.IGNORECASE)
    matches = table_pattern.finditer(content)

    tables = []
    for match in matches:
        table_html = match.group(0)

        # 统计<tr>行数
        row_count = len(re.findall(r'<tr[^>]*>', table_html, re.IGNORECASE))

        tables.append({
            'html': table_html,
            'start_pos': match.start(),
            'end_pos': match.end(),
            'row_count': row_count
        })

    return tables


def find_table_title(content, table_start_pos, search_range=1000):
    """
    查找表格前面的标题文本

    Args:
        content: 完整内容
        table_start_pos: 表格起始位置
        search_range: 向前搜索的字符数

    Returns:
        str: 标题文本
    """
    search_start = max(0, table_start_pos - search_range)
    before_table = content[search_start:table_start_pos]

    # 按行分割，找最后一个看起来像标题的行
    lines = before_table.split('\n')
    for line in reversed(lines):
        line = line.strip()
        # 过滤条件：非空、非HTML、长度适中
        if line and not line.startswith('<') and not line.endswith('>') and 5 < len(line) < 200:
            return line

    return ""


def match_tables_to_summary(table_tags, summary_tables, content):
    """
    将<table>标签与概要中的表格匹配，并合并跨页表格

    策略：
    1. 根据表格前的标题文本进行匹配
    2. 如果多个<table>标签对应同一个概要表格，则合并

    Args:
        table_tags: 提取的<table>标签列表
        summary_tables: 概要表格列表
        content: 完整OCR内容

    Returns:
        dict: {概要表格编号: 合并后的HTML内容}
    """
    # 为每个<table>标签找到对应的标题
    for table_tag in table_tags:
        table_tag['title'] = find_table_title(content, table_tag['start_pos'])

    # 匹配逻辑
    matched = {}

    for summary_table in summary_tables:
        table_number = summary_table['number']
        table_name = summary_table['name']

        # 移除"(續)"等标记，获取基础表名
        base_name = re.sub(r'\s*[\(（]續[）\)]\s*', '', table_name).strip()

        # 查找所有匹配这个表格名称的<table>标签
        matching_tags = []

        for table_tag in table_tags:
            title = table_tag['title']

            # 匹配规则：标题包含表格名称或基础名称
            if base_name in title or table_name in title:
                matching_tags.append(table_tag)
            # 或者标题相似度高（简单的包含判断）
            elif title and base_name:
                # 移除空格和特殊字符后比较
                clean_title = re.sub(r'[\s\(\)（）]', '', title)
                clean_name = re.sub(r'[\s\(\)（）]', '', base_name)
                if clean_name in clean_title or clean_title in clean_name:
                    matching_tags.append(table_tag)

        if not matching_tags:
            # 没找到匹配，使用位置顺序作为降级方案
            # 假设OCR中的<table>顺序与概要表格顺序一致
            if table_number <= len(table_tags):
                matching_tags = [table_tags[table_number - 1]]

        # 合并匹配的<table>标签
        if matching_tags:
            merged_html = merge_table_tags(matching_tags)
            matched[table_number] = {
                'html': merged_html,
                'tag_count': len(matching_tags),
                'total_rows': sum(tag['row_count'] for tag in matching_tags)
            }

    return matched


def merge_table_tags(table_tags):
    """
    合并多个<table>标签为一个

    Args:
        table_tags: <table>标签列表

    Returns:
        str: 合并后的<table> HTML
    """
    if len(table_tags) == 1:
        return table_tags[0]['html']

    # 提取所有<tr>行（去掉重复的表头）
    all_rows = []
    seen_headers = set()

    for i, table_tag in enumerate(table_tags):
        html = table_tag['html']

        # 提取所有<tr>标签
        tr_pattern = re.compile(r'<tr[^>]*>.*?</tr>', re.DOTALL | re.IGNORECASE)
        rows = tr_pattern.findall(html)

        for row in rows:
            # 检查是否是表头（包含<th>标签）
            if '<th' in row.lower():
                # 表头去重
                if row not in seen_headers:
                    if i == 0:  # 只保留第一个表格的表头
                        all_rows.append(row)
                        seen_headers.add(row)
            else:
                # 数据行，全部保留
                all_rows.append(row)

    # 重新构建<table>
    merged_html = '<table>\n'
    for row in all_rows:
        merged_html += '  ' + row + '\n'
    merged_html += '</table>'

    return merged_html


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
        print("步骤1.5: 提取并合并表格的HTML内容")
        print("=" * 80)
        print()
        print("用法：python3 extract_table_html.py <OCR文本文件路径>")
        print()
        print("功能：")
        print("  1. 从OCR内容中提取所有<table>标签")
        print("  2. 根据表格概要匹配并识别每个逻辑表格")
        print("  3. 自动合并跨页表格（多个<table>标签合并为一个）")
        print("  4. 保存每个表格的完整HTML内容")
        print()
        print("示例：")
        print("  python3 extract_table_html.py '中銀集團人壽 保險有限公司.txt'")
        print()
        print("输出：")
        print("  - *_table1_html.txt   (表格1的HTML，已合并跨页)")
        print("  - *_table2_html.txt   (表格2的HTML，已合并跨页)")
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
    print(f"📄 读取OCR文件: {file_path}")
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
    table_tags = extract_all_table_tags(content)

    print(f"✅ 提取到 {len(table_tags)} 个<table>标签")
    print()

    # 显示<table>标签信息
    print("=" * 80)
    print("OCR中的<table>标签分析：")
    print("=" * 80)
    for i, table_tag in enumerate(table_tags, 1):
        title = find_table_title(content, table_tag['start_pos'])
        print(f"<table> #{i}:")
        print(f"  行数: {table_tag['row_count']}")
        print(f"  HTML长度: {len(table_tag['html']):,} 字符")
        print(f"  前面的文本: {title[:60]}..." if title else "  前面的文本: (未找到)")
        print()

    # 匹配并合并表格
    print("=" * 80)
    print("匹配并合并表格：")
    print("=" * 80)
    matched_tables = match_tables_to_summary(table_tags, summary_tables, content)

    # 保存结果
    saved_count = 0
    for table_number, table_data in matched_tables.items():
        summary_table = summary_tables[table_number - 1]

        # 保存HTML
        output_file = f"{base_filename}_table{table_number}_html.txt"

        with open(output_file, 'w', encoding='utf-8') as f:
            # 添加注释头部
            f.write(f"<!-- 表格 {table_number}: {summary_table['name']} -->\n")
            f.write(f"<!-- 概要预期行数: {summary_table['rows']} -->\n")
            f.write(f"<!-- 实际合并行数: {table_data['total_rows']} -->\n")
            f.write(f"<!-- 合并的<table>标签数: {table_data['tag_count']} -->\n")
            f.write(f"<!-- 字段: {summary_table['fields']} -->\n\n")
            f.write(table_data['html'])

        print(f"✅ 表格 {table_number}: {summary_table['name']}")
        print(f"   概要行数: {summary_table['rows']}")
        print(f"   实际行数: {table_data['total_rows']}")
        print(f"   合并数量: {table_data['tag_count']} 个<table>标签")
        if table_data['tag_count'] > 1:
            print(f"   ✨ 跨页表格已自动合并")
        print(f"   已保存: {output_file}")
        print()

        saved_count += 1

    # 检查未匹配的表格
    if saved_count < len(summary_tables):
        print("⚠️  以下表格未找到对应的<table>标签：")
        for i, summary_table in enumerate(summary_tables, 1):
            if i not in matched_tables:
                print(f"   - 表格 {i}: {summary_table['name']}")
        print()

    print("=" * 80)
    print(f"✅ 完成！成功保存 {saved_count}/{len(summary_tables)} 个表格")
    print("=" * 80)
    print()
    print("生成的文件：")
    for i in range(1, saved_count + 1):
        print(f"  - {base_filename}_table{i}_html.txt")
    print()
    print("下一步：")
    print("  可以用这些HTML文件进行数据分析")
    print()


if __name__ == '__main__':
    main()
