#!/usr/bin/env python3
"""
一键提取并解析表格：完整版
1. 提取表格概要（AI分析）
2. 提取并合并HTML表格
3. 解析每个表格的数据为JSON格式
"""
import os
import sys
import re
import json
import time
from openai import OpenAI
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

# 加载环境变量
load_dotenv()


def get_deepseek_client():
    """获取DeepSeek客户端"""
    api_key = os.getenv('DEEPSEEK_API_KEY')
    if not api_key:
        print("❌ 错误：DEEPSEEK_API_KEY环境变量未设置")
        return None

    return OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com"
    )


# ==================== 步骤1: 提取表格概要 ====================

def extract_table_summary(content):
    """
    步骤1: 提取表格概要
    """
    client = get_deepseek_client()
    if not client:
        return None

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

    print("⏳ 步骤1/3: 调用DeepSeek API分析表格概要...")

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


# ==================== 步骤2: 提取并合并HTML表格 ====================

def extract_tables_with_year_column(content, debug=False):
    """
    提取所有包含"保单年度终结"列的<table>标签

    严格检查：必须在表头（第一行）中找到"保单年度终结"或"保單年度終結"列
    """
    table_pattern = re.compile(r'<table[^>]*>(.*?)</table>', re.DOTALL | re.IGNORECASE)
    matches = table_pattern.finditer(content)

    year_keywords = [
        '保单年度终结',
        '保單年度終結'
    ]

    tables_with_year = []
    skipped_tables = []

    for idx, match in enumerate(matches, 1):
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
            row_count = len(re.findall(r'<tr[^>]*>', table_html, re.IGNORECASE))

            tables_with_year.append({
                'html': table_html,
                'row_count': row_count,
                'start_pos': match.start(),
                'end_pos': match.end()
            })
        elif debug:
            # 记录被跳过的表格
            row_count = len(re.findall(r'<tr[^>]*>', table_html, re.IGNORECASE))
            # 提取表头文本预览
            header_preview = re.sub(r'<[^>]+>', '', first_row)[:100]
            skipped_tables.append({
                'index': idx,
                'row_count': row_count,
                'header_preview': header_preview.strip()
            })

    if debug and skipped_tables:
        print(f"\n⚠️  跳过了 {len(skipped_tables)} 个不包含'保单年度终结'列的表格：")
        for skipped in skipped_tables[:5]:  # 只显示前5个
            print(f"   表格#{skipped['index']} ({skipped['row_count']}行): {skipped['header_preview'][:60]}...")
        if len(skipped_tables) > 5:
            print(f"   ... 还有 {len(skipped_tables) - 5} 个表格被跳过")
        print()

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
    """提取表格的列标题"""
    first_tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
    first_tr_match = first_tr_pattern.search(table_html)

    if not first_tr_match:
        return ""

    first_tr = first_tr_match.group(1)

    cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.DOTALL | re.IGNORECASE)
    headers = []
    for cell_match in cell_pattern.finditer(first_tr):
        cell_text = re.sub(r'<[^>]+>', '', cell_match.group(1))
        cell_text = cell_text.strip()
        if cell_text:
            headers.append(cell_text)

    return '|'.join(headers)


def headers_are_similar(headers1, headers2, threshold=0.8):
    """判断两个表头是否相似"""
    if headers1 == headers2:
        return True

    if abs(len(headers1) - len(headers2)) / max(len(headers1), len(headers2)) > 0.3:
        return False

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


def extract_year_column(table_html):
    """
    从HTML表格中提取"保单年度终结"列的所有数字

    返回: [1, 2, 3, ..., 20]
    """
    # 解析HTML表格的所有行
    tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
    rows = tr_pattern.findall(table_html)

    if not rows:
        return []

    # 找到"保单年度终结"列的索引
    year_col_index = None

    # 解析第一行（表头）
    first_row = rows[0]
    cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.DOTALL | re.IGNORECASE)
    headers = cell_pattern.findall(first_row)

    for idx, header in enumerate(headers):
        text = re.sub(r'<[^>]+>', '', header).strip()
        if '保单年度终结' in text or '保單年度終結' in text:
            year_col_index = idx
            break

    if year_col_index is None:
        return []

    # 提取该列的所有数字
    years = []
    for row in rows[1:]:  # 跳过表头
        cells = cell_pattern.findall(row)
        if len(cells) > year_col_index:
            cell_text = re.sub(r'<[^>]+>', '', cells[year_col_index]).strip()
            # 提取数字 (移除"岁"、"歲"等单位)
            match = re.search(r'\d+', cell_text)
            if match:
                years.append(int(match.group()))

    return years


def validate_year_continuity(table_group, debug=False):
    """
    验证表格组中"保单年度终结"列的连续性

    返回:
    - True: 数字连续 (如 1-20, 21-40)
    - False: 数字不连续或重复
    """
    all_years = []

    for table_tag in table_group:
        years = extract_year_column(table_tag['html'])
        all_years.extend(years)

    # 空数据，无法验证
    if not all_years:
        return True  # 允许合并，后续步骤会处理

    # 检查是否有重复年度
    if len(all_years) != len(set(all_years)):
        if debug:
            duplicates = [y for y in set(all_years) if all_years.count(y) > 1]
            print(f"   ⚠️  检测到重复年度: {duplicates}")
        return False

    # 排序并检查连续性
    sorted_years = sorted(all_years)

    # 检查是否连续：差值应全为1
    for i in range(len(sorted_years) - 1):
        if sorted_years[i+1] - sorted_years[i] != 1:
            if debug:
                print(f"   ⚠️  年度不连续: {sorted_years[i]} → {sorted_years[i+1]} (跳跃)")
            return False

    if debug:
        print(f"   ✅ 年度连续: {sorted_years[0]}-{sorted_years[-1]} ({len(sorted_years)}个)")

    return True


def group_tables_by_title(table_tags, content, validate_continuity=True):
    """
    根据表格标题自动分组（改进版 + 年度连续性验证）

    规则：
    1. 相同的表格标题（忽略"续"标记）+ 列标题相似 → 合并为一个逻辑表格
    2. 标题相同但列标题不同 → 不合并（是不同的表格）
    3. 如果没有标题，则根据列标题分组（兼容旧逻辑）
    4. 合并前验证"保单年度终结"列的连续性（可选）

    参数：
    - validate_continuity: 是否验证年度连续性（默认True）
    """
    if not table_tags:
        return []

    # 为每个表格查找标题
    for table_tag in table_tags:
        title = find_table_title(content, table_tag['start_pos'])
        table_tag['title'] = title
        table_tag['normalized_title'] = normalize_table_title(title)
        table_tag['headers'] = extract_table_headers(table_tag['html'])

    # 分组逻辑：基于标准化后的标题 + 列标题相似度 + 年度连续性
    grouped = []
    current_group = [table_tags[0]]
    current_title = table_tags[0]['normalized_title']
    current_headers = table_tags[0]['headers']

    for i in range(1, len(table_tags)):
        table_tag = table_tags[i]
        normalized_title = table_tag['normalized_title']
        headers = table_tag['headers']

        # 情况1：标题一致 + 列标题相似 → 尝试合并
        if normalized_title and current_title and normalized_title == current_title:
            if headers_are_similar(headers, current_headers):
                # 新增：验证年度连续性
                test_group = current_group + [table_tag]
                if not validate_continuity or validate_year_continuity(test_group, debug=False):
                    # 连续性验证通过，合并
                    current_group.append(table_tag)
                else:
                    # 连续性验证失败，可能是不同的表格（重新计数）
                    print(f"   ⚠️  跳过合并: 标题相同但年度不连续，疑似不同表格")
                    grouped.append(current_group)
                    current_group = [table_tag]
                    current_title = normalized_title
                    current_headers = headers
            else:
                # 标题相同但列标题不同，不合并（是不同的表格）
                grouped.append(current_group)
                current_group = [table_tag]
                current_title = normalized_title
                current_headers = headers
        # 情况2：都没有标题，使用列标题相似度判断
        elif not normalized_title and not current_title:
            if headers_are_similar(headers, current_headers):
                # 新增：验证年度连续性
                test_group = current_group + [table_tag]
                if not validate_continuity or validate_year_continuity(test_group, debug=False):
                    current_group.append(table_tag)
                else:
                    print(f"   ⚠️  跳过合并: 列相似但年度不连续，疑似不同表格")
                    grouped.append(current_group)
                    current_group = [table_tag]
                    current_title = normalized_title
                    current_headers = headers
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


def merge_table_tags(table_tags):
    """合并多个<table>标签为一个"""
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


# ==================== 步骤3: 解析表格数据 ====================

def extract_data_from_html(table_html, table_info):
    """
    从HTML表格源代码提取数据
    """
    client = get_deepseek_client()
    if not client:
        return {'error': 'DeepSeek客户端初始化失败'}

    prompt = f"""从以下HTML表格中提取完整数据。

表格名称：{table_info['name']}
预期行数：{table_info['rows']}
基本字段：{table_info['fields']}

要求：
1. 解析HTML表格的所有<tr>行和<td>/<th>单元格
2. 提取所有行的所有列数据
3. 保单年度终结转换成纯数字（去掉"岁"、"歲"等）
4. 数值类型去掉单位和逗号
5. 以JSON格式返回：

{{
  "table_name": "表格名称",
  "columns": ["列名1", "列名2", "列名3"],
  "rows": [
    {{"列名1": 值1, "列名2": 值2, "列名3": 值3}},
    {{"列名1": 值4, "列名2": 值5, "列名3": 值6}}
  ]
}}

HTML表格：
{table_html}

请直接返回JSON格式数据，不要包含任何其他文字或markdown标记。"""

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "system",
                    "content": "你是一个专业的HTML表格数据提取助手，擅长解析HTML表格结构并提取结构化数据。你必须返回严格符合要求的JSON格式数据。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            max_tokens=8192
        )

        result = response.choices[0].message.content.strip()

        # 清理markdown标记
        if result.startswith('```'):
            lines = result.split('\n')
            if lines[0].startswith('```'):
                result = '\n'.join(lines[1:])
            if lines[-1].strip() == '```':
                result = '\n'.join(result.split('\n')[:-1])

        # 解析JSON
        table_data = json.loads(result)
        return table_data

    except json.JSONDecodeError as e:
        return {'error': f'JSON解析失败: {e}'}
    except Exception as e:
        return {'error': str(e)}


# ==================== 保存结果 ====================

def save_table_data(table_data, output_file):
    """保存表格数据为JSON和TXT格式"""
    if not table_data or 'error' in table_data:
        return

    # 保存JSON格式
    json_file = f"{output_file}.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(table_data, f, ensure_ascii=False, indent=2)

    # 保存可读格式
    txt_file = f"{output_file}.txt"
    with open(txt_file, 'w', encoding='utf-8') as f:
        f.write(f"表格名称: {table_data.get('table_name', 'N/A')}\n")
        f.write("=" * 80 + "\n\n")

        columns = table_data.get('columns', [])
        rows = table_data.get('rows', [])

        f.write("\t".join(columns) + "\n")
        f.write("-" * 80 + "\n")

        for row in rows:
            values = [str(row.get(col, '')) for col in columns]
            f.write("\t".join(values) + "\n")

        f.write("\n")
        f.write(f"总行数: {len(rows)}\n")


# ==================== 主函数 ====================

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("=" * 80)
        print("一键提取并解析表格：完整版 ⚡")
        print("=" * 80)
        print()
        print("用法：python3 extract_tables_complete.py <OCR文本文件路径>")
        print()
        print("功能：")
        print("  ✅ 步骤1: AI分析表格概要")
        print("  ✅ 步骤2: 提取并合并HTML表格")
        print("  ✅ 步骤3: 解析表格数据为JSON格式")
        print("  ✅ 并行处理，3个并发")
        print()
        print("示例：")
        print("  python3 extract_tables_complete.py '中銀集團人壽 保險有限公司.txt'")
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

    # ==================== 步骤1: 提取表格概要 ====================
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

    # ==================== 步骤2: 提取并合并HTML表格 ====================
    print()
    print("⏳ 步骤2/3: 提取并合并HTML表格...")

    table_tags = extract_tables_with_year_column(content, debug=True)
    print(f"✅ 提取到 {len(table_tags)} 个包含'保单年度终结'的<table>标签")
    print()

    # 基于表格标题自动分组（改进版 + 年度连续性验证）
    print("🔍 开始分组并验证年度连续性...")
    auto_grouped = group_tables_by_title(table_tags, content, validate_continuity=True)
    print(f"✅ 分组完成: {len(auto_grouped)} 个逻辑表格")
    print()

    # 显示详细分组结果
    for idx, group in enumerate(auto_grouped, 1):
        first_tag = group[0]
        title = first_tag['normalized_title'] or '(无标题)'
        total_rows = sum(tag['row_count'] for tag in group)

        # 提取年度范围
        all_years = []
        for tag in group:
            years = extract_year_column(tag['html'])
            all_years.extend(years)

        if all_years:
            year_range = f"{min(all_years)}-{max(all_years)}"
            print(f"   表格组 {idx}: {title}")
            print(f"      包含 {len(group)} 个<table>标签, 共 {total_rows} 行")
            print(f"      年度范围: {year_range} ({len(all_years)}个年度)")
        else:
            print(f"   表格组 {idx}: {title}")
            print(f"      包含 {len(group)} 个<table>标签, 共 {total_rows} 行")
            print(f"      (未找到年度数据)")
    print()

    # 对比诊断
    if len(auto_grouped) != len(summary_tables):
        print(f"⚠️  数量不匹配：")
        print(f"   AI概要识别: {len(summary_tables)} 个表格")
        print(f"   HTML提取到: {len(table_tags)} 个<table>标签")
        print(f"   自动分组后: {len(auto_grouped)} 个逻辑表格")
        print()

        if len(auto_grouped) < len(summary_tables):
            print(f"⚠️  缺少 {len(summary_tables) - len(auto_grouped)} 个表格，可能原因：")
            print(f"   1. HTML中该表格的表头没有'保单年度终结'列")
            print(f"   2. 表格被OCR识别为纯文本而非<table>标签")
            print(f"   3. 表格被错误地合并到其他表格中")
            print()
            print(f"   AI概要中的表格列表：")
            for idx, t in enumerate(summary_tables, 1):
                print(f"   {idx}. {t['name']}")
            print()
    else:
        print(f"✅ 数量匹配：AI概要和HTML提取结果一致")
        print()

    # 保存合并后的HTML表格
    merged_tables = []
    for i, table_group in enumerate(auto_grouped, 1):
        merged_html = merge_table_tags(table_group)
        total_rows = sum(tag['row_count'] for tag in table_group)

        first_tag = table_group[0]
        table_title = find_table_title(content, first_tag['start_pos'])

        matched_summary = None
        if i <= len(summary_tables):
            matched_summary = summary_tables[i - 1]

        table_name = matched_summary['name'] if matched_summary else table_title
        fields = matched_summary['fields'] if matched_summary else ''
        expected_rows = matched_summary['rows'] if matched_summary else f'{total_rows}行'

        # 保存HTML
        html_file = f"{base_filename}_table{i}_html.txt"
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(f"<!-- 表格 {i}: {table_name} -->\n")
            if matched_summary:
                f.write(f"<!-- 概要行数: {expected_rows} -->\n")
            f.write(f"<!-- 实际行数: {total_rows} -->\n")
            f.write(f"<!-- 合并数量: {len(table_group)} 个<table> -->\n")
            if fields:
                f.write(f"<!-- 字段: {fields} -->\n")
            f.write('\n')
            f.write(merged_html)

        merged_tables.append({
            'number': i,
            'html': merged_html,
            'info': matched_summary if matched_summary else {
                'number': i,
                'name': table_name,
                'rows': expected_rows,
                'fields': fields
            }
        })

        print(f"✅ 表格 {i}: {table_name}")
        print(f"   HTML已保存: {html_file}")

    print()
    print(f"💾 已保存 {len(merged_tables)} 个合并后的HTML表格")
    print()
    print("=" * 80)

    # ==================== 步骤3: 解析表格数据 ====================
    print()
    print("⏳ 步骤3/3: 解析表格数据为JSON格式...")
    print(f"⚡ 使用 3 个并发线程加速")
    print()

    start_time = time.time()
    completed = 0
    failed = 0

    def process_table(table):
        """处理单个表格"""
        return extract_data_from_html(table['html'], table['info'])

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(process_table, table): table
            for table in merged_tables
        }

        for future in as_completed(futures):
            table = futures[future]
            completed += 1

            try:
                table_data = future.result()

                if 'error' in table_data:
                    failed += 1
                    print(f"❌ [{completed}/{len(merged_tables)}] 表格 {table['number']} 失败")
                    print(f"   错误: {table_data['error']}")
                else:
                    # 保存数据
                    output_file = f"{base_filename}_table{table['number']}_data"
                    save_table_data(table_data, output_file)

                    progress = completed / len(merged_tables) * 100
                    elapsed = time.time() - start_time
                    avg_time = elapsed / completed
                    remaining = avg_time * (len(merged_tables) - completed)

                    actual_rows = len(table_data.get('rows', []))

                    print(f"✅ [{completed}/{len(merged_tables)}] 表格 {table['number']}: {table['info']['name']}")
                    print(f"   提取行数: {actual_rows} | 进度: {progress:.1f}%")
                    if remaining > 0:
                        print(f"   已用: {elapsed:.0f}秒 | 预计剩余: {remaining:.0f}秒")

            except Exception as e:
                failed += 1
                print(f"❌ [{completed}/{len(merged_tables)}] 表格 {table['number']} 异常: {e}")

    total_time = time.time() - start_time

    print()
    print("=" * 80)
    print("✅ 全部完成！")
    print("=" * 80)
    print(f"⏱️  总耗时: {total_time:.1f}秒")
    print(f"📊 成功: {len(merged_tables) - failed} | 失败: {failed}")
    if len(merged_tables) > 0:
        print(f"⚡ 平均每表: {total_time/len(merged_tables):.1f}秒")
    print()
    print("生成的文件：")
    print(f"  📋 {summary_file}")
    for i in range(1, len(merged_tables) + 1):
        print(f"  📊 {base_filename}_table{i}_html.txt (HTML表格)")
        print(f"  📊 {base_filename}_table{i}_data.json (JSON数据)")
        print(f"  📊 {base_filename}_table{i}_data.txt (可读格式)")
    print()


if __name__ == '__main__':
    main()
