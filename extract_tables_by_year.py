#!/usr/bin/env python3
"""
一键提取表格：基于"保单年度终结"字段精确匹配
只提取包含"保单年度终结"的<table>标签
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

**核心要求（必须严格遵守）：**
1. **必须包含"保单年度终结"或"保單年度終結"列**：如果表格中没有这个列名，直接跳过，不要输出
2. **检查列标题**：必须在表格的第一行（表头）找到"保单年度终结"或"保單年度終結"这个列名
3. **跨页表格合并**：有些表格可能跨度好几个页面，但只算一张表，请完整识别
4. **续表识别**：如果表格名称包含"(續)"、"(续)"等字样，应合并为同一张表
5. **输出内容**：对每个表格提取：表详细名称、行数（续表需累加）、基本字段

**严格要求：只输出包含"保单年度终结"列的表格，其他表格一律不输出！**

如果没有找到任何包含"保单年度终结"列的表格，请输出"未找到包含保单年度终结的表格"。

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
    """解析表格概要"""
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


def extract_tables_with_year_column(content):
    """
    提取所有包含"保单年度终结"列的<table>标签

    严格检查：必须在表头（第一行）中找到"保单年度终结"或"保單年度終結"列

    Args:
        content: OCR内容

    Returns:
        list: 包含"保单年度终结"列的<table>标签列表
    """
    # 提取所有<table>标签
    table_pattern = re.compile(r'<table[^>]*>(.*?)</table>', re.DOTALL | re.IGNORECASE)
    matches = table_pattern.finditer(content)

    # 只使用完整的关键词（繁简体）
    year_keywords = [
        '保单年度终结',
        '保單年度終結'
    ]

    tables_with_year = []

    for match in matches:
        table_html = match.group(0)

        # 提取表格的第一行（表头）
        first_tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
        first_tr_match = first_tr_pattern.search(table_html)

        if not first_tr_match:
            continue

        first_row = first_tr_match.group(1)

        # 提取第一行中所有<th>或<td>单元格的文本（不包括子元素）
        cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.DOTALL | re.IGNORECASE)
        cells = cell_pattern.findall(first_row)

        # 清理HTML标签，只保留纯文本
        header_texts = []
        for cell in cells:
            # 移除内部HTML标签
            text = re.sub(r'<[^>]+>', '', cell).strip()
            header_texts.append(text)

        # 检查表头单元格中是否包含"保单年度终结"列（完整匹配）
        has_year_column = any(
            any(keyword in header_text for keyword in year_keywords)
            for header_text in header_texts
        )

        if has_year_column:
            # 统计行数
            row_count = len(re.findall(r'<tr[^>]*>', table_html, re.IGNORECASE))

            tables_with_year.append({
                'html': table_html,
                'row_count': row_count,
                'start_pos': match.start(),
                'end_pos': match.end()
            })

    return tables_with_year


def find_table_title(content, table_start_pos, search_range=1000):
    """查找表格前的标题"""
    search_start = max(0, table_start_pos - search_range)
    before_table = content[search_start:table_start_pos]

    lines = before_table.split('\n')
    for line in reversed(lines):
        line = line.strip()
        if line and not line.startswith('<') and not line.endswith('>') and 5 < len(line) < 200:
            return line

    return ""


def extract_table_headers(table_html):
    """
    提取表格的列标题（第一行的所有单元格文本）

    Returns:
        str: 列标题文本的拼接字符串（用于比较）
    """
    # 提取第一个<tr>标签
    first_tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
    first_tr_match = first_tr_pattern.search(table_html)

    if not first_tr_match:
        return ""

    first_tr = first_tr_match.group(1)

    # 提取所有<th>或<td>标签的文本内容
    cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.DOTALL | re.IGNORECASE)
    headers = []
    for cell_match in cell_pattern.finditer(first_tr):
        cell_text = re.sub(r'<[^>]+>', '', cell_match.group(1))  # 移除内部HTML标签
        cell_text = cell_text.strip()
        if cell_text:
            headers.append(cell_text)

    # 返回列标题文本的拼接字符串（忽略属性，只比较文本）
    return '|'.join(headers)


def headers_are_similar(headers1, headers2, threshold=0.8):
    """
    判断两个表头是否相似（允许一定的OCR识别错误）

    Args:
        headers1: 第一个表头字符串
        headers2: 第二个表头字符串
        threshold: 相似度阈值（0-1）

    Returns:
        bool: 是否相似
    """
    if headers1 == headers2:
        return True

    # 如果长度差异太大，直接认为不相似
    if abs(len(headers1) - len(headers2)) / max(len(headers1), len(headers2)) > 0.3:
        return False

    # 计算字符级别的相似度
    matches = sum(c1 == c2 for c1, c2 in zip(headers1, headers2))
    similarity = matches / max(len(headers1), len(headers2))

    return similarity >= threshold


def normalize_table_title(title):
    """标准化表格标题：移除"续"、"待续"等标记"""
    if not title:
        return ""

    # 移除常见的续表标记
    normalized = re.sub(r'\s*[\(（]續[）\)]\s*', '', title)
    normalized = re.sub(r'\s*[\(（]续[）\)]\s*', '', normalized)
    normalized = re.sub(r'\s*待續.*', '', normalized)
    normalized = re.sub(r'\s*待续.*', '', normalized)

    # 移除多余空格
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    return normalized


def group_tables_by_title(table_tags, content):
    """
    根据表格标题自动分组（改进版）

    规则：
    1. 相同的表格标题（忽略"续"标记）合并为一个逻辑表格
    2. 如果没有标题，则根据列标题分组（兼容旧逻辑）

    Args:
        table_tags: 包含"保单年度终结"的<table>标签列表
        content: 完整的OCR内容

    Returns:
        list: 分组后的表格，每组包含多个需要合并的<table>标签
    """
    if not table_tags:
        return []

    # 为每个表格查找标题
    for table_tag in table_tags:
        title = find_table_title(content, table_tag['start_pos'])
        table_tag['title'] = title
        table_tag['normalized_title'] = normalize_table_title(title)
        table_tag['headers'] = extract_table_headers(table_tag['html'])

    # 分组逻辑：基于标准化后的标题 + 列标题相似度
    grouped = []
    current_group = [table_tags[0]]
    current_title = table_tags[0]['normalized_title']
    current_headers = table_tags[0]['headers']

    for i in range(1, len(table_tags)):
        table_tag = table_tags[i]
        normalized_title = table_tag['normalized_title']
        headers = table_tag['headers']

        # 情况1：标题一致 + 列标题相似 → 合并（这是真正的续表）
        if normalized_title and current_title and normalized_title == current_title:
            if headers_are_similar(headers, current_headers):
                current_group.append(table_tag)
            else:
                # 标题相同但列标题不同，不合并（是不同的表格）
                grouped.append(current_group)
                current_group = [table_tag]
                current_title = normalized_title
                current_headers = headers
        # 情况2：都没有标题，使用列标题相似度判断
        elif not normalized_title and not current_title:
            if headers_are_similar(headers, current_headers):
                current_group.append(table_tag)
            else:
                grouped.append(current_group)
                current_group = [table_tag]
                current_title = normalized_title
                current_headers = headers
        else:
            # 标题不同，开始新组
            grouped.append(current_group)
            current_group = [table_tag]
            current_title = normalized_title
            current_headers = headers

    if current_group:
        grouped.append(current_group)

    return grouped


def group_tables_by_summary(table_tags, summary_tables, content):
    """
    根据概要和表格标题，将<table>标签分组（已弃用，使用group_tables_by_headers代替）

    Args:
        table_tags: 包含"保单年度终结"的<table>标签
        summary_tables: 概要表格列表
        content: 完整内容

    Returns:
        dict: {概要表格编号: [对应的<table>标签]}
    """
    # 为每个<table>查找前面的标题
    for table_tag in table_tags:
        table_tag['title'] = find_table_title(content, table_tag['start_pos'])

    grouped = {}

    for summary_table in summary_tables:
        table_number = summary_table['number']
        table_name = summary_table['name']

        # 移除"(續)"标记获取基础名称
        base_name = re.sub(r'\s*[\(（]續[）\)]\s*', '', table_name).strip()

        # 查找匹配的<table>标签
        matching_tags = []

        for table_tag in table_tags:
            title = table_tag['title']

            # 匹配规则：标题包含表格名称
            if base_name and title:
                # 简化后比较
                clean_title = re.sub(r'[\s\(\)（）]', '', title)
                clean_name = re.sub(r'[\s\(\)（）]', '', base_name)

                if clean_name in clean_title or clean_title in clean_name:
                    matching_tags.append(table_tag)

        # 如果没找到匹配，按顺序分配
        if not matching_tags:
            # 简单策略：按顺序一一对应
            if table_number <= len(table_tags):
                matching_tags = [table_tags[table_number - 1]]

        if matching_tags:
            grouped[table_number] = matching_tags

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
            # 表头去重
            if '<th' in row.lower():
                if row not in seen_headers:
                    if i == 0:
                        all_rows.append(row)
                        seen_headers.add(row)
            else:
                # 数据行全部保留
                all_rows.append(row)

    # 重新构建
    merged_html = '<table>\n'
    for row in all_rows:
        merged_html += '  ' + row + '\n'
    merged_html += '</table>'

    return merged_html


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("=" * 80)
        print("一键提取表格：基于'保单年度终结'字段 ⚡")
        print("=" * 80)
        print()
        print("用法：python3 extract_tables_by_year.py <OCR文本文件路径>")
        print()
        print("特点：")
        print("  ✅ 只提取包含'保单年度终结'的表格")
        print("  ✅ 自动分组并合并跨页表格")
        print("  ✅ 精确匹配，避免提取无关表格")
        print()
        print("示例：")
        print("  python3 extract_tables_by_year.py '中銀集團人壽 保險有限公司.txt'")
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

    # 步骤1: 提取表格概要
    summary_text = extract_table_summary(content)

    if not summary_text:
        print("❌ 表格概要提取失败")
        sys.exit(1)

    print(f"✅ 步骤1完成")
    print()

    # 解析概要
    summary_tables = parse_summary(summary_text)
    print(f"📋 概要识别到 {len(summary_tables)} 个逻辑表格：")
    for table in summary_tables:
        print(f"   {table['number']}. {table['name']} ({table['rows']})")
    print()

    # 保存概要
    base_filename = os.path.splitext(file_path)[0]
    summary_file = f"{base_filename}_tablesummary.txt"

    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write(summary_text)

    print(f"💾 概要已保存: {summary_file}")
    print()
    print("=" * 80)

    # 步骤2: 提取包含"保单年度终结"的<table>标签
    print()
    print("⏳ 步骤2: 提取包含'保单年度终结'的<table>标签...")

    table_tags = extract_tables_with_year_column(content)
    print(f"✅ 提取到 {len(table_tags)} 个包含'保单年度终结'的<table>标签")
    print()

    # 显示<table>标签
    print("包含'保单年度终结'的<table>标签：")
    for i, table_tag in enumerate(table_tags, 1):
        title = find_table_title(content, table_tag['start_pos'])
        print(f"   <table> #{i}: {table_tag['row_count']}行")
        print(f"      前面的文本: {title[:60]}...")
    print()

    # 步骤3: 基于表格标题自动分组（改进版）
    print("⏳ 步骤3: 基于表格标题自动分组并合并跨页表格...")
    print()

    auto_grouped = group_tables_by_title(table_tags, content)
    print(f"🔄 基于标题分组结果: {len(auto_grouped)} 个逻辑表格")
    print()

    # 保存结果
    saved_count = 0
    for i, table_group in enumerate(auto_grouped, 1):
        # 合并<table>标签
        merged_html = merge_table_tags(table_group)
        total_rows = sum(tag['row_count'] for tag in table_group)

        # 为每个<table>查找前面的标题
        first_tag = table_group[0]
        table_title = find_table_title(content, first_tag['start_pos'])

        # 尝试从summary_tables中匹配表格名称和字段
        matched_summary = None
        if i <= len(summary_tables):
            matched_summary = summary_tables[i - 1]

        table_name = matched_summary['name'] if matched_summary else table_title
        fields = matched_summary['fields'] if matched_summary else ''
        expected_rows = matched_summary['rows'] if matched_summary else f'{total_rows}行'

        # 保存
        output_file = f"{base_filename}_table{i}_html.txt"

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"<!-- 表格 {i}: {table_name} -->\n")
            if matched_summary:
                f.write(f"<!-- 概要行数: {expected_rows} -->\n")
            f.write(f"<!-- 实际行数: {total_rows} -->\n")
            f.write(f"<!-- 合并数量: {len(table_group)} 个<table> -->\n")
            if fields:
                f.write(f"<!-- 字段: {fields} -->\n")
            f.write('\n')
            f.write(merged_html)

        print(f"✅ 表格 {i}: {table_name}")
        if matched_summary:
            print(f"   概要行数: {expected_rows}")
        print(f"   实际行数: {total_rows}")
        print(f"   <table>数: {len(table_group)}")
        if len(table_group) > 1:
            print(f"   ✨ 已合并 {len(table_group)} 个<table>标签（跨页表格）")
        print(f"   已保存: {output_file}")
        print()

        saved_count += 1

    # 对比概要数量
    if saved_count != len(summary_tables):
        print(f"⚠️  注意：自动分组识别到 {saved_count} 个表格，AI概要识别到 {len(summary_tables)} 个表格")
        if saved_count > len(summary_tables):
            print(f"   可能原因：AI概要将某些跨页表格识别为一个表格")
        else:
            print(f"   可能原因：某些小表格没有被自动分组识别")
        print()

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
