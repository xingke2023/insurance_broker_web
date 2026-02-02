#!/usr/bin/env python3
"""
一键提取：表格概要 + HTML内容
一次性完成步骤1和步骤1.5
"""
import os
import sys
import re
from openai import OpenAI
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


def extract_table_summary(content):
    """
    步骤1: 提取表格概要

    Args:
        content: OCR内容

    Returns:
        str: 表格概要文本
    """
    # 获取DeepSeek API密钥
    api_key = os.getenv('DEEPSEEK_API_KEY')
    if not api_key:
        print("❌ 错误：DEEPSEEK_API_KEY环境变量未设置")
        return None

    # 初始化DeepSeek客户端
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com"
    )

    # 构建提示词
    prompt = f"""以保单年度终结为坐标，分析以下保险计划书中的所有表格。

要求：
1. 识别所有以"保单年度终结"为坐标的表格
2. 有些表格可能跨度好几个页面，但只算一张表，请完整识别
3. 特别注意：如果表格名称包含"(續)"、"(续)"等字样，应合并为同一张表
4. 对每个表格提取：表详细名称、行数（续表需累加）、基本字段

只输出结果，不要有任何解释说明。

输出格式示例：
1.
表名：詳細說明 - 退保價值 (只根據基本計劃計算)
行数：100行
基本字段：保单年度终结,缴付保费总额,退保价值(保证金额,非保證金額,总额)

2.
表名：身故賠償
行数：50行
基本字段：保单年度终结,身故赔偿(保证金额,非保证金额,总额)

计划书内容：
{content}

请直接返回分析结果，不要包含markdown代码块标记。"""

    print("⏳ 步骤1: 调用DeepSeek API提取表格概要...")

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "system",
                    "content": "你是一个专业的保险文档分析助手，擅长识别和分析表格结构。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=8192
        )

        result = response.choices[0].message.content.strip()

        # 清理可能的代码块标记
        if result.startswith('```'):
            lines = result.split('\n')
            if len(lines) > 2 and lines[-1].strip() == '```':
                result = '\n'.join(lines[1:-1])
            elif len(lines) > 1:
                result = '\n'.join(lines[1:])

        return result

    except Exception as e:
        print(f"❌ API调用失败: {e}")
        return None


def parse_summary(summary_text):
    """
    解析表格概要文本

    Args:
        summary_text: 概要文本

    Returns:
        list: 表格信息列表
    """
    tables = []
    current_table = {}

    lines = summary_text.strip().split('\n')
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


def extract_all_table_tags(content):
    """
    步骤1.5: 提取所有<table>标签

    Args:
        content: OCR内容

    Returns:
        list: <table>标签列表
    """
    table_pattern = re.compile(r'<table[^>]*>(.*?)</table>', re.DOTALL | re.IGNORECASE)
    matches = table_pattern.finditer(content)

    tables = []
    for match in matches:
        table_html = match.group(0)
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
    查找表格前的标题

    Args:
        content: 完整内容
        table_start_pos: 表格起始位置
        search_range: 搜索范围

    Returns:
        str: 标题文本
    """
    search_start = max(0, table_start_pos - search_range)
    before_table = content[search_start:table_start_pos]

    lines = before_table.split('\n')
    for line in reversed(lines):
        line = line.strip()
        if line and not line.startswith('<') and not line.endswith('>') and 5 < len(line) < 200:
            return line

    return ""


def merge_table_tags(table_tags):
    """
    合并多个<table>标签

    Args:
        table_tags: <table>标签列表

    Returns:
        str: 合并后的HTML
    """
    if len(table_tags) == 1:
        return table_tags[0]['html']

    all_rows = []
    seen_headers = set()

    for i, table_tag in enumerate(table_tags):
        html = table_tag['html']

        tr_pattern = re.compile(r'<tr[^>]*>.*?</tr>', re.DOTALL | re.IGNORECASE)
        rows = tr_pattern.findall(html)

        for row in rows:
            if '<th' in row.lower():
                if row not in seen_headers:
                    if i == 0:
                        all_rows.append(row)
                        seen_headers.add(row)
            else:
                all_rows.append(row)

    merged_html = '<table>\n'
    for row in all_rows:
        merged_html += '  ' + row + '\n'
    merged_html += '</table>'

    return merged_html


def match_and_merge_tables(table_tags, summary_tables, content):
    """
    匹配并合并表格

    Args:
        table_tags: <table>标签列表
        summary_tables: 概要表格列表
        content: 完整内容

    Returns:
        dict: {表格编号: 合并后的HTML}
    """
    # 为每个<table>找标题
    for table_tag in table_tags:
        table_tag['title'] = find_table_title(content, table_tag['start_pos'])

    matched = {}

    for summary_table in summary_tables:
        table_number = summary_table['number']
        table_name = summary_table['name']

        # 移除"(續)"标记
        base_name = re.sub(r'\s*[\(（]續[）\)]\s*', '', table_name).strip()

        # 查找匹配的<table>标签
        matching_tags = []

        for table_tag in table_tags:
            title = table_tag['title']

            if base_name in title or table_name in title:
                matching_tags.append(table_tag)
            elif title and base_name:
                clean_title = re.sub(r'[\s\(\)（）]', '', title)
                clean_name = re.sub(r'[\s\(\)（）]', '', base_name)
                if clean_name in clean_title or clean_title in clean_name:
                    matching_tags.append(table_tag)

        # 降级方案：按顺序匹配
        if not matching_tags and table_number <= len(table_tags):
            matching_tags = [table_tags[table_number - 1]]

        # 合并
        if matching_tags:
            merged_html = merge_table_tags(matching_tags)
            matched[table_number] = {
                'html': merged_html,
                'tag_count': len(matching_tags),
                'total_rows': sum(tag['row_count'] for tag in matching_tags)
            }

    return matched


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("=" * 80)
        print("一键提取：表格概要 + HTML内容 ⚡")
        print("=" * 80)
        print()
        print("用法：python3 extract_tables_all.py <OCR文本文件路径>")
        print()
        print("功能：")
        print("  ✅ 步骤1: 自动提取表格概要（调用DeepSeek API）")
        print("  ✅ 步骤1.5: 自动提取并合并表格HTML内容")
        print("  ✅ 一次性完成所有操作")
        print()
        print("示例：")
        print("  python3 extract_tables_all.py '中銀集團人壽 保險有限公司.txt'")
        print()
        print("输出：")
        print("  - *_tablesummary.txt      (表格概要)")
        print("  - *_table1.txt            (表格1概要)")
        print("  - *_table1_html.txt       (表格1 HTML，已合并)")
        print("  - *_table2_html.txt       (表格2 HTML，已合并)")
        print("  - ...")
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
    print("=" * 80)

    # ========== 步骤1: 提取表格概要 ==========
    summary_text = extract_table_summary(content)

    if not summary_text:
        print("❌ 表格概要提取失败")
        sys.exit(1)

    print(f"✅ 步骤1完成: 表格概要提取成功")
    print()

    # 解析概要
    summary_tables = parse_summary(summary_text)
    print(f"📋 识别到 {len(summary_tables)} 个表格")
    print()

    # 保存概要
    base_filename = os.path.splitext(file_path)[0]
    summary_file = f"{base_filename}_tablesummary.txt"

    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write(summary_text)

    print(f"💾 概要已保存: {summary_file}")
    print()

    # 保存每个表格的概要
    for table in summary_tables:
        table_summary_file = f"{base_filename}_table{table['number']}.txt"
        with open(table_summary_file, 'w', encoding='utf-8') as f:
            f.write(f"表格 {table['number']}\n")
            f.write("=" * 80 + "\n\n")
            f.write(f"表名：{table['name']}\n")
            f.write(f"行数：{table['rows']}\n")
            f.write(f"基本字段：{table['fields']}\n\n")
            f.write("=" * 80 + "\n")

    print("=" * 80)

    # ========== 步骤1.5: 提取并合并表格HTML ==========
    print()
    print("⏳ 步骤1.5: 提取并合并表格HTML内容...")

    # 提取所有<table>标签
    table_tags = extract_all_table_tags(content)
    print(f"✅ 提取到 {len(table_tags)} 个<table>标签")
    print()

    # 显示<table>信息
    print("OCR中的<table>标签：")
    for i, table_tag in enumerate(table_tags, 1):
        title = find_table_title(content, table_tag['start_pos'])
        print(f"  <table> #{i}: {table_tag['row_count']}行, 前面文本: {title[:50]}...")

    print()
    print("匹配并合并表格...")
    print()

    # 匹配并合并
    matched_tables = match_and_merge_tables(table_tags, summary_tables, content)

    # 保存HTML
    saved_count = 0
    for table_number, table_data in matched_tables.items():
        summary_table = summary_tables[table_number - 1]

        output_file = f"{base_filename}_table{table_number}_html.txt"

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"<!-- 表格 {table_number}: {summary_table['name']} -->\n")
            f.write(f"<!-- 概要行数: {summary_table['rows']} -->\n")
            f.write(f"<!-- 实际行数: {table_data['total_rows']} -->\n")
            f.write(f"<!-- 合并数量: {table_data['tag_count']} 个<table>标签 -->\n")
            f.write(f"<!-- 字段: {summary_table['fields']} -->\n\n")
            f.write(table_data['html'])

        print(f"✅ 表格 {table_number}: {summary_table['name']}")
        print(f"   概要行数: {summary_table['rows']}")
        print(f"   实际行数: {table_data['total_rows']}")
        print(f"   合并数量: {table_data['tag_count']} 个<table>")
        if table_data['tag_count'] > 1:
            print(f"   ✨ 跨页表格已自动合并")
        print(f"   已保存: {output_file}")
        print()

        saved_count += 1

    print("=" * 80)
    print(f"✅ 全部完成！成功处理 {saved_count}/{len(summary_tables)} 个表格")
    print("=" * 80)
    print()
    print("生成的文件：")
    print(f"  📋 {summary_file}")
    for i in range(1, saved_count + 1):
        print(f"  📄 {base_filename}_table{i}.txt")
        print(f"  📊 {base_filename}_table{i}_html.txt")
    print()


if __name__ == '__main__':
    main()
