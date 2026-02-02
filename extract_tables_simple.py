#!/usr/bin/env python3
"""
一键提取表格：概要 + HTML内容（简化版）
按步骤1分析出的表格顺序，直接提取对应的<table>标签
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
    """
    api_key = os.getenv('DEEPSEEK_API_KEY')
    if not api_key:
        print("❌ 错误：DEEPSEEK_API_KEY环境变量未设置")
        return None

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com"
    )

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

    print("⏳ 步骤1: 调用DeepSeek API分析表格...")

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

        # 清理代码块标记
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
    解析表格概要
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
    提取所有<table>标签（按出现顺序）
    """
    table_pattern = re.compile(r'<table[^>]*>(.*?)</table>', re.DOTALL | re.IGNORECASE)
    matches = table_pattern.finditer(content)

    tables = []
    for i, match in enumerate(matches, 1):
        table_html = match.group(0)
        row_count = len(re.findall(r'<tr[^>]*>', table_html, re.IGNORECASE))

        tables.append({
            'index': i,
            'html': table_html,
            'row_count': row_count,
            'start_pos': match.start()
        })

    return tables


def group_tables_by_summary(table_tags, summary_tables):
    """
    根据步骤1的表格数量，将<table>标签分组

    逻辑：
    - 如果有N个概要表格，M个<table>标签
    - 假设前面的<table>标签对应概要表格1，依此类推
    - 如果M > N，说明有跨页表格，需要合并

    Args:
        table_tags: 所有<table>标签列表
        summary_tables: 概要表格列表

    Returns:
        dict: {概要表格编号: [对应的<table>标签列表]}
    """
    grouped = {}
    n_summary = len(summary_tables)
    n_tags = len(table_tags)

    if n_tags == n_summary:
        # 1对1映射
        for i, summary_table in enumerate(summary_tables, 1):
            grouped[i] = [table_tags[i - 1]]

    elif n_tags > n_summary:
        # 有跨页表格，平均分配
        tags_per_table = n_tags // n_summary
        remainder = n_tags % n_summary

        current_index = 0
        for i, summary_table in enumerate(summary_tables, 1):
            # 每个概要表格分配 tags_per_table 个<table>标签
            # 如果有余数，前面几个多分配一个
            count = tags_per_table + (1 if i <= remainder else 0)
            grouped[i] = table_tags[current_index:current_index + count]
            current_index += count

    else:
        # n_tags < n_summary，部分概要表格没有对应的<table>
        for i in range(n_tags):
            grouped[i + 1] = [table_tags[i]]

    return grouped


def merge_table_tags(table_tags):
    """
    合并多个<table>标签为一个
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
            # 表头去重（只保留第一次出现的）
            if '<th' in row.lower():
                if row not in seen_headers:
                    if i == 0:  # 只保留第一个表格的表头
                        all_rows.append(row)
                        seen_headers.add(row)
            else:
                # 数据行全部保留
                all_rows.append(row)

    # 重新构建<table>
    merged_html = '<table>\n'
    for row in all_rows:
        merged_html += '  ' + row + '\n'
    merged_html += '</table>'

    return merged_html


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("=" * 80)
        print("一键提取表格：概要 + HTML内容 ⚡")
        print("=" * 80)
        print()
        print("用法：python3 extract_tables_simple.py <OCR文本文件路径>")
        print()
        print("功能：")
        print("  ✅ 步骤1: 提取表格概要（调用DeepSeek API）")
        print("  ✅ 步骤2: 按顺序提取<table>标签")
        print("  ✅ 自动分组并合并跨页表格")
        print()
        print("示例：")
        print("  python3 extract_tables_simple.py '中銀集團人壽 保險有限公司.txt'")
        print()
        print("输出：")
        print("  - *_tablesummary.txt      (表格概要)")
        print("  - *_table1_html.txt       (表格1 HTML)")
        print("  - *_table2_html.txt       (表格2 HTML)")
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
    print(f"📋 识别到 {len(summary_tables)} 个逻辑表格")
    for table in summary_tables:
        print(f"   表格 {table['number']}: {table['name']} ({table['rows']})")
    print()

    # 保存概要
    base_filename = os.path.splitext(file_path)[0]
    summary_file = f"{base_filename}_tablesummary.txt"

    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write(summary_text)

    print(f"💾 概要已保存: {summary_file}")
    print()
    print("=" * 80)

    # ========== 步骤2: 提取<table>标签 ==========
    print()
    print("⏳ 步骤2: 提取所有<table>标签...")

    table_tags = extract_all_table_tags(content)
    print(f"✅ 提取到 {len(table_tags)} 个<table>标签")
    print()

    # 显示<table>标签
    print("OCR中的<table>标签：")
    for table_tag in table_tags:
        print(f"   <table> #{table_tag['index']}: {table_tag['row_count']}行")
    print()

    # ========== 步骤3: 分组并合并 ==========
    print("⏳ 步骤3: 根据概要分组并合并<table>标签...")
    print()

    grouped = group_tables_by_summary(table_tags, summary_tables)

    # 保存结果
    saved_count = 0
    for table_number, tags in grouped.items():
        if table_number > len(summary_tables):
            continue

        summary_table = summary_tables[table_number - 1]

        # 合并<table>标签
        merged_html = merge_table_tags(tags)

        # 计算总行数
        total_rows = sum(tag['row_count'] for tag in tags)

        # 保存
        output_file = f"{base_filename}_table{table_number}_html.txt"

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"<!-- 表格 {table_number}: {summary_table['name']} -->\n")
            f.write(f"<!-- 概要预期行数: {summary_table['rows']} -->\n")
            f.write(f"<!-- 实际合并行数: {total_rows} -->\n")
            f.write(f"<!-- 合并的<table>数: {len(tags)} -->\n")
            f.write(f"<!-- 字段: {summary_table['fields']} -->\n\n")
            f.write(merged_html)

        print(f"✅ 表格 {table_number}: {summary_table['name']}")
        print(f"   概要行数: {summary_table['rows']}")
        print(f"   实际行数: {total_rows}")
        print(f"   <table>数: {len(tags)}")
        if len(tags) > 1:
            print(f"   ✨ 已合并 {len(tags)} 个<table>标签")
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
        print(f"  📊 {base_filename}_table{i}_html.txt")
    print()


if __name__ == '__main__':
    main()
