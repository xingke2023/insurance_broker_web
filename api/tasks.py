"""
Celery异步任务定义
处理保险文档OCR结果的三个核心任务（按执行顺序）：

步骤0: OCR识别 (ocr_document_task)
  - 调用Google Gemini 3 Flash Preview API识别PDF文档
  - 提取Markdown格式的文本内容（包含HTML表格）
  - 存入数据库content字段
  - 自动触发步骤1

步骤1: 提取表格源代码 (extract_tablecontent_task)
  - 以 --- 为分页符拆分content
  - 从每页提取所有<table>标签
  - 过滤：只保留包含"保单年度终结/保單年度終結"的表格
  - 删除不包含关键词的表格（table级过滤，不是页面级）
  - 存入tablecontent字段
  - 自动触发步骤2（auto_trigger_next=True）或标记完成（auto_trigger_next=False）

步骤2: 提取表格概要 (extract_tablesummary_task)
  - 调用DeepSeek API分析tablecontent中的表格结构
  - 识别独立的逻辑表格（从年度1开始 = 新表，跨页表格自动合并）
  - 存入tablesummary字段（文本格式概要）
  - 从tablecontent提取所有包含"保单年度终结"的<table>标签
  - 使用手动解析（非正则），处理复杂表格和嵌套结构
  - 自动分组合并跨页表格
  - 存入PlanTable数据库（每个逻辑表格一条记录）
  - 标记为已完成

注意事项：
- 所有关键词检测都会移除换行符（避免OCR把"保單年度終結"识别为"保單年度\n終結"）
- 表头识别支持多行表头（跳过所有包含表头关键词的行）
- 年度1检测：检查第一个数据行的第一个单元格是否为"1"
"""
import logging
import time
import re
import json
import os
import requests
from celery import shared_task
from django.utils import timezone
from openai import OpenAI
from .models import PlanDocument
from .deepseek_service import extract_plan_data_from_text, analyze_insurance_table, extract_plan_summary, extract_table_summary
from .gemini_service import ocr_pdf_with_gemini

logger = logging.getLogger(__name__)


# ========== 表格提取辅助函数（来自 extract_tables_by_year.py） ==========

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


def extract_all_tables(content):
    """
    提取所有<table>标签（不过滤）

    使用手动解析代替正则，避免复杂表格匹配失败
    """
    all_tables = []

    # 手动查找所有<table>标签的起始和结束位置
    pos = 0
    content_lower = content.lower()

    while True:
        # 查找下一个<table>标签的起始位置
        table_start = content_lower.find('<table', pos)
        if table_start == -1:
            break

        # 查找对应的</table>结束标签（处理嵌套）
        search_pos = table_start + 6  # 跳过"<table"
        depth = 1
        table_end = -1

        while depth > 0 and search_pos < len(content_lower):
            next_open = content_lower.find('<table', search_pos)
            next_close = content_lower.find('</table>', search_pos)

            if next_close == -1:
                # 没有找到闭合标签，跳过这个表格
                break

            if next_open != -1 and next_open < next_close:
                # 遇到嵌套的<table>
                depth += 1
                search_pos = next_open + 6
            else:
                # 遇到</table>
                depth -= 1
                if depth == 0:
                    table_end = next_close + 8  # 包含</table>
                else:
                    search_pos = next_close + 8

        if table_end == -1:
            # 没有找到匹配的结束标签，跳过
            pos = table_start + 6
            continue

        # 提取完整的表格HTML
        table_html = content[table_start:table_end]

        # 统计行数
        row_count = len(re.findall(r'<tr[^>]*>', table_html, re.IGNORECASE))

        all_tables.append({
            'html': table_html,
            'row_count': row_count,
            'start_pos': table_start,
            'end_pos': table_end
        })

        # 继续搜索下一个表格
        pos = table_end

    return all_tables


def extract_tables_with_year_column(content):
    """
    提取所有包含"保单年度终结"列的<table>标签

    改进版：使用手动解析代替正则，避免复杂表格匹配失败
    """
    year_keywords = [
        '保单年度终结',
        '保單年度終結'
    ]

    all_tables = extract_all_tables(content)
    tables_with_year = []

    for table_info in all_tables:
        table_html = table_info['html']

        # 检查表格是否包含关键词（移除换行符后检查，避免OCR换行问题）
        table_html_cleaned = table_html.replace('\n', '').replace('\r', '')
        if not any(keyword in table_html_cleaned for keyword in year_keywords):
            continue

        # 进一步检查：提取表格的第一行（表头）
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
                # 移除内部HTML标签和换行符
                text = re.sub(r'<[^>]+>', '', cell).strip()
                # 移除换行符（避免OCR把"保單年度終結"识别为"保單年度\n終結"）
                text_cleaned = text.replace('\n', '').replace('\r', '')
                header_texts.append(text_cleaned)

            # 检查表头单元格中是否包含"保单年度终结"列
            has_year_column = any(
                any(keyword in header_text for keyword in year_keywords)
                for header_text in header_texts
            )

            if has_year_column:
                tables_with_year.append(table_info)

    return tables_with_year


def find_table_title(content, table_start_pos, search_range=500):
    """
    查找表格前的标题（改进版：智能过滤产品名称）

    策略：
    1. 搜索表格前500字符
    2. 反向查找有意义的标题文本
    3. 跳过产品名称（通常包含保险公司全名、产品代码等特征）
    4. 优先选择距离表格最近的描述性标题
    """
    search_start = max(0, table_start_pos - search_range)
    before_table = content[search_start:table_start_pos]

    lines = before_table.split('\n')

    # 产品名称特征（用于排除）
    product_name_patterns = [
        r'\([A-Z0-9]+\)',  # 包含产品代码，如 (C508A)
        r'保險計劃',
        r'保险计划',
        r'多元貨幣',
        r'多元货币',
    ]

    for line in reversed(lines):
        line = line.strip()

        # 跳过空行
        if not line:
            continue

        # 跳过HTML标签行
        if line.startswith('<') or line.endswith('>'):
            continue

        # 移除Markdown标题标记（#）
        if line.startswith('#'):
            line = line.lstrip('#').strip()

        # 跳过分隔线（如 ---, ===）
        if re.match(r'^[-=*]{3,}$', line):
            continue

        # 长度检查：5-100字符
        if not (5 < len(line) < 100):
            continue

        # 排除产品名称：检查是否包含产品名称特征
        is_product_name = any(re.search(pattern, line) for pattern in product_name_patterns)
        if is_product_name:
            continue

        # 找到有效标题
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
        cell_text = re.sub(r'\s+', '', cell_text)  # 移除所有空白字符（包括换行符、空格）
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


def check_year_column_has_valid_format(table_html):
    """
    检查表格的"保单年度终结"列的第一个数据值是否为有效格式

    有效格式：
    - 纯数字（1, 2, 3...）
    - 数字+歲/岁（1歲, 70岁）

    检查逻辑：
    1. "保单年度终结"可能在第1列或第2列
    2. 找到第一个数据行（跳过<th>行）
    3. 检查对应列的值是否为有效格式

    Returns:
        bool: True表示有效格式，False表示无效（需要过滤）
    """
    # 提取所有<tr>行
    tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
    rows = tr_pattern.findall(table_html)

    if len(rows) < 2:
        return False

    # 提取单元格
    cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.DOTALL | re.IGNORECASE)

    # 找到"保单年度终结"所在的列索引和该行的单元格数量
    year_column_index = None
    header_cell_count = None

    for row in rows[:5]:  # 检查前5行（可能有多行表头）
        cells = cell_pattern.findall(row)
        for idx, cell in enumerate(cells):
            cell_text = re.sub(r'<[^>]+>', '', cell).strip()
            # 移除所有空白字符（包括换行、空格）后匹配
            cell_text_cleaned = re.sub(r'\s+', '', cell_text)
            if '保单年度终结' in cell_text_cleaned or '保單年度終結' in cell_text_cleaned:
                year_column_index = idx
                header_cell_count = len(cells)  # 记录表头行的单元格数量
                break
        if year_column_index is not None:
            break

    if year_column_index is None:
        return False  # 未找到"保单年度终结"列

    # 找到第一个数据行，检查该列的值
    # 策略：找到单元格数量最多的数据行（这行包含所有列的真实数据，不受rowspan影响）

    # 先找出所有非<th>行中单元格数量的最大值
    max_cell_count = 0
    for row in rows:
        if '<th' in row.lower():
            continue
        cells = cell_pattern.findall(row)
        if len(cells) > max_cell_count:
            max_cell_count = len(cells)

    # 然后只检查单元格数量等于max_cell_count的行
    for row in rows:
        # 跳过<th>标签行
        if '<th' in row.lower():
            continue

        cells = cell_pattern.findall(row)

        # 只检查单元格数量最多的行（完整的数据行）
        if len(cells) < max_cell_count:
            continue

        # 提取"保单年度终结"列的值
        year_cell = re.sub(r'<[^>]+>', '', cells[year_column_index]).strip()
        # 移除所有空白字符和逗号
        year_cell_cleaned = re.sub(r'\s+', '', year_cell).replace(',', '')

        # 如果提取的值还是"保单年度终结"（表头行），跳过
        if '保单年度终结' in year_cell_cleaned or '保單年度終結' in year_cell_cleaned:
            continue

        # 检查是否为有效格式
        is_pure_digit = year_cell_cleaned.isdigit()
        is_age_format = re.match(r'^\d+[歲岁]$', year_cell_cleaned)

        if is_pure_digit or is_age_format:
            return True  # 有效格式
        else:
            return False  # 无效格式（如"年繳"、"文字描述"等）

    return False


def check_first_year_in_table(table_html):
    """
    检查表格中"保单年度终结"列的第一个数据行是否为1

    改进版：基于列位置查找（支持"保单年度终结"在任意列）

    策略：
    1. 查找"保单年度终结"列的索引位置（可以在任何列）
    2. 跳过<th>标签行（HTML语义标记）
    3. 检查该列的第一个数据值是否为1（纯数字）或1歲/1岁（年龄格式）

    Returns:
        bool: True表示从1开始（新表格），False表示不是从1开始（续表）
    """
    # 提取所有<tr>行
    tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
    rows = tr_pattern.findall(table_html)

    if len(rows) < 2:  # 至少需要表头+1行数据
        return False

    # 提取单元格的正则
    cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.DOTALL | re.IGNORECASE)

    # 步骤1: 找到"保单年度终结"列的索引位置
    year_column_index = None

    for row in rows[:5]:  # 在前5行中查找表头
        cells = cell_pattern.findall(row)
        for idx, cell in enumerate(cells):
            cell_text = re.sub(r'<[^>]+>', '', cell).strip()
            cell_text_cleaned = re.sub(r'\s+', '', cell_text)  # 移除所有空白字符

            if '保单年度终结' in cell_text_cleaned or '保單年度終結' in cell_text_cleaned:
                year_column_index = idx
                break

        if year_column_index is not None:
            break

    if year_column_index is None:
        return False  # 未找到"保单年度终结"列

    # 步骤2: 在该列中找到第一个数据行的值
    for row in rows:
        # 跳过<th>标签行（HTML语义标记）
        if '<th' in row.lower():
            continue

        # 提取单元格
        cells = cell_pattern.findall(row)
        if len(cells) <= year_column_index:
            continue  # 该行单元格数不足

        # 提取该列的值
        year_cell = re.sub(r'<[^>]+>', '', cells[year_column_index]).strip()
        year_cell_cleaned = re.sub(r'\s+', '', year_cell).replace(',', '')

        # 跳过表头行（值为"保单年度终结"本身）
        if '保单年度终结' in year_cell_cleaned or '保單年度終結' in year_cell_cleaned:
            continue

        # 检查是否为有效年度值
        is_pure_digit = year_cell_cleaned.isdigit()
        is_age_format = re.match(r'^\d+[歲岁]$', year_cell_cleaned)

        if not (is_pure_digit or is_age_format):
            continue  # 不是有效年度值 → 跳过该行

        # 找到第一个数据行，判断年度值是否为1
        if is_pure_digit:
            year = int(year_cell_cleaned)
            return year == 1
        elif year_cell_cleaned in ['1歲', '1岁']:
            return True
        else:
            return False  # 其他年龄格式（如70歲），不是从1开始

    return False


def check_year_continuity(table_html):
    """
    检查表格中"保单年度终结"列的年度是否连续

    策略：
    1. 提取所有数据行的年度值
    2. 检查年度是否连续递增（允许跨度为1）
    3. 如果有缺失年度（如1,2,3,5,6...），返回False

    Returns:
        bool: True表示年度连续，False表示年度不连续
    """
    # 提取所有<tr>行
    tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
    rows = tr_pattern.findall(table_html)

    if len(rows) < 2:  # 至少需要表头+1行数据
        return False

    # 提取单元格的正则
    cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.DOTALL | re.IGNORECASE)

    # 提取所有数据行的年度值
    years = []
    for row in rows:
        # 跳过<th>标签行
        if '<th' in row.lower():
            continue

        # 提取单元格
        cells = cell_pattern.findall(row)
        if not cells:
            continue

        # 清理第一个单元格的内容
        first_cell = re.sub(r'<[^>]+>', '', cells[0]).strip()
        first_cell_cleaned = first_cell.replace('\n', '').replace('\r', '').replace(',', '')

        # 只处理纯数字
        if first_cell_cleaned.isdigit():
            years.append(int(first_cell_cleaned))

    # 如果没有年度数据或只有1行，认为连续
    if len(years) <= 1:
        return True

    # 检查年度是否连续递增
    for i in range(1, len(years)):
        if years[i] != years[i-1] + 1:
            # 发现年度不连续
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"⚠️ 年度不连续：第{i}行年度为{years[i]}，上一行为{years[i-1]}")
            return False

    return True


def group_tables_by_title(table_tags, content):
    """
    根据表格特征自动分组（改进版）

    判断规则（优先级从高到低）：
    1. **保单年度=1** → 一定是新表格的开始
    2. **表头不同**（第一行td内容不同）→ 一定是不同的表格
    3. **保单年度≠1 且 表头相同** → 上一个表格的续表

    Args:
        table_tags: 包含"保单年度终结"的<table>标签列表
        content: 表格页面内容

    Returns:
        list: 分组后的表格，每组包含多个需要合并的<table>标签
    """
    if not table_tags:
        return []

    # 为每个表格提取信息
    for table_tag in table_tags:
        title = find_table_title(content, table_tag['start_pos'])
        table_tag['title'] = title
        table_tag['normalized_title'] = normalize_table_title(title)
        table_tag['headers'] = extract_table_headers(table_tag['html'])
        table_tag['starts_from_one'] = check_first_year_in_table(table_tag['html'])

    # 分组逻辑
    grouped = []
    current_group = None
    current_headers = None

    for i, table_tag in enumerate(table_tags):
        headers = table_tag['headers']
        starts_from_one = table_tag['starts_from_one']

        # 规则1：如果保单年度从1开始 → 新表格的开始
        if starts_from_one:
            # 保存上一个分组
            if current_group:
                grouped.append(current_group)
            # 开始新分组
            current_group = [table_tag]
            current_headers = headers
            continue

        # 规则2：如果不从1开始，必须接续前一个表格
        if current_group is None:
            # 第一个表格就不从1开始 → 这是孤立的续表，跳过或警告
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"⚠️ 跳过孤立续表：第{i+1}个表格不从年度1开始，且前面没有可接续的表格")
            continue

        # 规则3：表头不同 → 不同的表格（开始新组）
        if not headers_are_similar(headers, current_headers, threshold=0.9):
            # 表头差异较大 → 这是一个新的逻辑表格（即使不从年度1开始）
            if current_group:
                grouped.append(current_group)
            # 开始新分组
            current_group = [table_tag]
            current_headers = headers
            continue

        # 规则4：保单年度≠1 且 表头相同 → 续表
        current_group.append(table_tag)

    # 保存最后一个分组
    if current_group:
        grouped.append(current_group)

    return grouped


def group_tables_by_summary(table_tags, summary_tables, content):
    """根据概要和表格标题，将<table>标签分组"""
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


# ========== Celery 异步任务 ==========

@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def ocr_document_task(self, document_id):
    """
    步骤0：OCR识别文档
    调用Google Gemini 3 Flash Preview API识别PDF文档，提取markdown格式文本（包含HTML表格）
    将识别结果存入数据库的content字段

    Args:
        document_id: PlanDocument的ID

    Returns:
        dict: {'success': bool, 'error': str (if failed)}
    """
    try:
        logger.info("=" * 80)
        logger.info(f"📄 Celery任务开始 - 步骤0/3: OCR识别文档 - 文档ID: {document_id}")
        logger.info(f"   重试次数: {self.request.retries}/{self.max_retries}")

        # 加载文档
        try:
            doc = PlanDocument.objects.get(id=document_id)
        except PlanDocument.DoesNotExist:
            error_msg = f"文档 {document_id} 不存在"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}

        # 更新状态
        doc.processing_stage = 'ocr_processing'
        doc.last_processed_at = timezone.now()
        doc.save(update_fields=['processing_stage', 'last_processed_at'])

        # 检查文件是否存在
        if not doc.file_path or not os.path.exists(doc.file_path.path):
            error_msg = "PDF文件不存在"
            logger.error(f"❌ {error_msg}: {doc.file_path}")
            doc.processing_stage = 'error'
            doc.error_message = error_msg
            doc.status = 'failed'
            doc.save()
            return {'success': False, 'error': error_msg}

        # 调用 Gemini Flash API 进行 OCR 识别
        logger.info(f"📤 开始调用 Gemini Flash OCR: {doc.file_path.path}")

        try:
            # 调用 Gemini OCR 服务
            result = ocr_pdf_with_gemini(doc.file_path.path)

            if result['success']:
                ocr_content = result['content']
                logger.info(f"✅ Gemini OCR识别成功，内容长度: {len(ocr_content)}")

                if not ocr_content or not ocr_content.strip():
                    raise Exception("OCR返回内容为空")

                # 保存OCR内容到数据库
                doc.content = ocr_content
                doc.processing_stage = 'ocr_completed'
                doc.last_processed_at = timezone.now()
                doc.save(update_fields=['content', 'processing_stage', 'last_processed_at'])

                logger.info("✅ 步骤0完成: Gemini OCR识别成功")

                # 自动触发下一个任务：提取表格源代码
                extract_tablecontent_task.apply_async(args=[document_id], countdown=2)

                return {'success': True}

            else:
                error_msg = f"Gemini OCR识别失败: {result.get('error', '未知错误')}"
                raise Exception(error_msg)

        except Exception as e:
            error_msg = f"OCR识别失败: {str(e)}"
            logger.error(f"❌ {error_msg}")
            raise Exception(error_msg)

    except Exception as e:
        error_msg = f"OCR识别失败: {str(e)}"
        logger.error(error_msg)

        # 重试机制
        if self.request.retries < self.max_retries:
            logger.warning(f"⏳ 将在60秒后重试 ({self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=Exception(error_msg))

        # 达到最大重试次数后，标记失败
        logger.error(f"❌ 已达最大重试次数，OCR识别失败")
        doc.processing_stage = 'error'
        doc.error_message = f"OCR识别失败（已重试{self.max_retries}次）: {error_msg}"
        doc.status = 'failed'
        doc.save()

        return {'success': False, 'error': error_msg}


# 已删除的任务：extract_basic_info_task, extract_table_task, extract_wellness_table_task, extract_summary_task


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def extract_tablecontent_task(self, document_id, auto_trigger_next=True):
    """
    步骤1：提取表格源代码（table级过滤）

    核心逻辑：
    1. 以 --- 为分页符拆分OCR内容
    2. 对每页提取所有<table>标签（使用手动解析，避免正则失败）
    3. 过滤每个表格：
       - 移除换行符后检查是否包含"保单年度终结/保單年度終結"
       - 保留包含关键词的表格 ✅
       - 删除不包含关键词的表格 ❌
    4. 重建页面（只包含保留的表格）
    5. 保存过滤后的页面内容到tablecontent字段

    关键特性：
    - table级过滤，不是页面级（页面有多个table时，只删除不符合的table）
    - 移除换行符检测（避免OCR把"保單年度終結"识别为"保單年度\n終結"）
    - 手动解析<table>标签（支持嵌套表格、超大表格）

    Args:
        document_id: PlanDocument的ID
        auto_trigger_next: 是否自动触发步骤2（默认True）
                          True - 自动触发步骤2，状态设为tablecontent_completed
                          False - 标记为已完成，状态设为all_completed

    Returns:
        dict: {'success': bool, 'error': str (if failed)}
    """
    try:
        logger.info("=" * 80)
        logger.info(f"📊 Celery任务开始 - 步骤1/3: 提取表格源代码 - 文档ID: {document_id}")

        # 加载文档
        try:
            doc = PlanDocument.objects.get(id=document_id)
        except PlanDocument.DoesNotExist:
            error_msg = f"文档 {document_id} 不存在"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}

        # 检查OCR是否成功（前置条件）
        if doc.status == 'failed' or doc.processing_stage == 'error':
            error_msg = f"OCR识别失败，跳过后续任务: {doc.error_message}"
            logger.error(f"❌ {error_msg}")
            return {'success': False, 'error': error_msg}

        if not doc.content:
            error_msg = "OCR内容为空，无法继续处理"
            logger.error(f"❌ {error_msg}")
            doc.processing_stage = 'error'
            doc.status = 'failed'
            doc.error_message = error_msg
            doc.save()
            return {'success': False, 'error': error_msg}

        # 更新状态：开始提取表格源代码
        doc.processing_stage = 'extracting_tablecontent'
        doc.last_processed_at = timezone.now()
        doc.save(update_fields=['processing_stage', 'last_processed_at'])
        logger.info("📊 状态更新: 按分页符过滤表格...")

        # 以 --- 为分页符拆分内容
        pages = doc.content.split('---')
        logger.info(f"📄 共拆分出 {len(pages)} 页")

        # 关键词
        year_keywords = ['保单年度终结', '保單年度終結']
        valid_pages = []
        total_tables_removed = 0
        total_tables_kept = 0

        for page_num, page in enumerate(pages, 1):
            # 检查是否包含<table>标签
            if '<table' not in page.lower():
                continue

            # 从页面中提取所有表格
            page_tables = extract_all_tables(page)

            if not page_tables:
                continue

            # 过滤：只保留"保单年度终结"列值为有效格式的表格（包括表格前的文字）
            filtered_segments = []  # 每个元素包含：表格前的文字 + 表格HTML

            for idx, table_info in enumerate(page_tables):
                table_html = table_info['html']
                table_start = table_info['start_pos']

                # 步骤1：检查是否包含"保单年度终结"关键词
                table_html_cleaned = table_html.replace('\n', '').replace('\r', '')
                has_keyword = any(keyword in table_html_cleaned for keyword in year_keywords)

                if not has_keyword:
                    # 不包含关键词，直接过滤
                    total_tables_removed += 1
                    continue

                # 步骤2：检查"保单年度终结"列的值是否为有效格式（纯数字或数字+歲/岁）
                has_valid_format = check_year_column_has_valid_format(table_html)

                if has_valid_format:
                    # 确定表格前文字的起始位置
                    if idx == 0:
                        # 第一个表格：从页面开头到表格开始
                        segment_start = 0
                    else:
                        # 后续表格：从上一个表格结束位置到当前表格开始
                        prev_table_end = page_tables[idx - 1]['end_pos']
                        segment_start = prev_table_end

                    # 提取表格前的文字
                    text_before_table = page[segment_start:table_start]

                    # 保存：表格前的文字 + 表格HTML
                    filtered_segments.append(text_before_table + table_html)
                    total_tables_kept += 1
                else:
                    # 表格被过滤（"保单年度终结"列值无效，如"年繳"），同时删除它前面的文字
                    total_tables_removed += 1

            # 如果页面有至少一个包含关键词的表格，保留该页面
            if filtered_segments:
                # 合并所有片段
                filtered_page = ''.join(filtered_segments)
                valid_pages.append(filtered_page)
                logger.info(f"   ✅ 第 {page_num} 页: 保留 {len(filtered_segments)}/{len(page_tables)} 个表格")

        if valid_pages:
            # 合并所有有效页面，使用 --- 分隔
            tablecontent = '\n---\n'.join(valid_pages)
            doc.tablecontent = tablecontent

            logger.info(f"✅ 提取到 {len(valid_pages)} 个包含有效表格的页面")
            logger.info(f"   - 保留表格: {total_tables_kept} 个")
            logger.info(f"   - 移除表格: {total_tables_removed} 个")
            logger.info(f"   - 总长度: {len(tablecontent)} 字符")

            # 更新状态：表格源代码提取完成
            # 手动模式下直接标记为all_completed，自动模式下标记为tablecontent_completed
            if auto_trigger_next:
                doc.processing_stage = 'tablecontent_completed'
            else:
                doc.processing_stage = 'all_completed'
                doc.status = 'completed'

            doc.last_processed_at = timezone.now()

            if auto_trigger_next:
                doc.save(update_fields=['tablecontent', 'processing_stage', 'last_processed_at'])
            else:
                doc.save(update_fields=['tablecontent', 'processing_stage', 'status', 'last_processed_at'])

            logger.info("✅ 步骤1完成: 表格页面过滤成功")
            logger.info("=" * 80)

            # 根据auto_trigger_next参数决定是否自动触发步骤2
            if auto_trigger_next:
                extract_tablesummary_task.apply_async(args=[document_id], countdown=2)
                logger.info("🔄 自动触发步骤2: 提取表格概要")
            else:
                logger.info("⏸️ 手动模式: 不自动触发步骤2，标记为已完成")

            return {'success': True}
        else:
            # 未找到包含有效表格的页面
            error_msg = "未找到包含'保单年度终结'的表格"
            logger.warning(f"⚠️ {error_msg}")
            doc.tablecontent = ''
            doc.processing_stage = 'tablecontent_completed'
            doc.status = 'completed'
            doc.save(update_fields=['tablecontent', 'processing_stage', 'status'])

            # 根据auto_trigger_next参数决定是否触发步骤2
            if auto_trigger_next:
                extract_tablesummary_task.apply_async(args=[document_id], countdown=2)
                logger.info("🔄 自动触发步骤2: 提取表格概要")
            else:
                logger.info("⏸️ 手动模式: 未找到有效表格，不触发步骤2")

            return {'success': True, 'message': error_msg}

    except Exception as e:
        error_msg = f"提取表格源代码时发生异常: {str(e)}"
        logger.error(f"❌ {error_msg}")
        import traceback
        logger.error(traceback.format_exc())

        try:
            doc = PlanDocument.objects.get(id=document_id)
            doc.tablecontent = ''
            doc.processing_stage = 'error'
            doc.status = 'failed'
            doc.error_message = error_msg
            doc.save()
        except Exception as save_error:
            logger.error(f"保存错误状态失败: {save_error}")

        logger.info("⛔ 任务链已终止：表格提取异常")
        return {'success': False, 'error': error_msg, 'terminate': True}


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def extract_tablesummary_task(self, document_id):
    """
    步骤2：提取表格概要并保存到PlanTable

    核心逻辑：
    1. 调用DeepSeek API分析tablecontent中的表格结构
       - 识别独立的逻辑表格
       - 判断新表 vs 续表（保单年度从1开始 = 新表）
       - 提取表格名称、总行数、基本字段
       - 保存到tablesummary字段（文本格式）

    2. 从tablecontent提取所有包含"保单年度终结"的<table>标签
       - 使用手动解析（extract_all_tables），避免正则失败
       - 移除换行符检测关键词（避免OCR换行问题）
       - 支持嵌套表格、超大表格

    3. 自动分组合并跨页表格
       - 检查第一个数据行是否为年度1（跳过多行表头）
       - 比较表头相似度（相似度>0.9 + 不从1开始 = 续表）
       - 合并同一逻辑表格的多个<table>标签

    4. 保存到PlanTable数据库
       - 每个逻辑表格一条记录
       - 存储表格名称、行数、字段、HTML源代码
       - 清空旧数据后插入新数据

    关键特性：
    - 移除换行符检测（所有关键词匹配都先移除\n\r）
    - 支持多行表头（识别表头关键词，跳过所有表头行）
    - 手动解析HTML（不使用正则，避免复杂表格失败）

    Args:
        document_id: PlanDocument的ID

    Returns:
        dict: {'success': bool, 'error': str (if failed)}
    """
    try:
        logger.info("=" * 80)
        logger.info(f"📋 Celery任务开始 - 步骤2/3: 提取表格概要 - 文档ID: {document_id}")

        # 加载文档
        try:
            doc = PlanDocument.objects.get(id=document_id)
        except PlanDocument.DoesNotExist:
            error_msg = f"文档 {document_id} 不存在"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}

        # 检查OCR是否成功（前置条件）
        if doc.status == 'failed' or doc.processing_stage == 'error':
            error_msg = f"OCR识别失败，跳过后续任务: {doc.error_message}"
            logger.error(f"❌ {error_msg}")
            return {'success': False, 'error': error_msg}

        # 检查tablecontent是否存在（步骤1的输出）
        if not doc.tablecontent:
            error_msg = "表格内容为空，无法分析"
            logger.warning(error_msg)
            # 标记为已完成
            doc.tablesummary = ''
            doc.processing_stage = 'all_completed'
            doc.status = 'completed'
            doc.save(update_fields=['tablesummary', 'processing_stage', 'status'])
            return {'success': False, 'error': error_msg}

        # 更新状态：开始提取表格概要
        doc.processing_stage = 'extracting_tablesummary'
        doc.last_processed_at = timezone.now()
        doc.save(update_fields=['processing_stage', 'last_processed_at'])
        logger.info("📊 状态更新: 分析表格结构中...")

        # 统一使用Gemini API分析表格
        logger.info("📊 使用 Gemini API 分析表格结构")

        # 获取Gemini API密钥
        gemini_api_key = os.getenv('GEMINI_API_KEY')
        if not gemini_api_key:
            error_msg = 'GEMINI_API_KEY环境变量未设置'
            logger.error(f'❌ {error_msg}')
            doc.tablesummary = ''
            doc.processing_stage = 'all_completed'
            doc.status = 'completed'
            doc.save(update_fields=['tablesummary', 'processing_stage', 'status'])
            return {'success': False, 'error': error_msg}

        # 初始化Gemini客户端
        from google import genai
        from google.genai import types

        gemini_client = genai.Client(api_key=gemini_api_key)

        # 构建提示词
        prompt = f"""分析以下保险计划书的表格页面内容，识别所有独立的表格。

**关键判断规则：**
1. **新表格判断**：如果"保单年度终结"列的数值从1开始，表示这是一个新表格的开始
2. **续表判断**：如果"保单年度终结"列的数值不是从1开始（如从21、51等开始），表示这是上一个表格的跨页延续
3. **表格合并**：同一个表格可能跨多个页面，需要识别为同一张表

**输出要求：**
- 只输出独立的表格（从保单年度1开始的）
- 对每个表格提取：表格名称、总行数（包含续表）、基本字段
- 续表的行数需要累加到对应的主表

**输出格式示例：**
1.
表名：詳細說明 - 退保價值 (只根據基本計劃計算)
行数：100行
基本字段：保单年度终结,缴付保费总额,退保价值(保证金额,非保證金額,总额)

2.
表名：身故賠償
行数：50行
基本字段：保单年度终结,身故赔偿(保证金额,非保证金额,总额)

表格页面内容（以---分页）：
{doc.tablecontent}

请直接返回分析结果，不要包含markdown代码块标记。"""

        logger.info("⏳ 开始调用 Gemini API 分析表格结构")
        logger.info(f"   表格页面内容长度: {len(doc.tablecontent)} 字符")

        # 调用Gemini API
        response = gemini_client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=prompt
        )

        content = response.text.strip()
        logger.info(f"📦 Gemini API返回，长度: {len(content)} 字符")

        # 清理可能的代码块标记
        if content.startswith('```'):
            lines = content.split('\n')
            if len(lines) > 2 and lines[-1].strip() == '```':
                content = '\n'.join(lines[1:-1])
            elif len(lines) > 1:
                content = '\n'.join(lines[1:])

        # 保存到数据库
        doc.tablesummary = content
        doc.processing_stage = 'tablesummary_completed'
        doc.last_processed_at = timezone.now()
        doc.save(update_fields=['tablesummary', 'processing_stage', 'last_processed_at'])

        logger.info(f"📋 表格概要已保存到数据库，长度: {len(content)} 字符")

        # 解析表格概要
        summary_tables = parse_summary(content)

        # 更新状态：开始提取表格HTML
        doc.processing_stage = 'extracting_table_html'
        doc.last_processed_at = timezone.now()
        doc.save(update_fields=['processing_stage', 'last_processed_at'])
        logger.info("📊 状态更新: 提取表格HTML中...")

        # ========== 新增：提取并保存各个表格的HTML源代码 ==========
        try:
            logger.info("🔍 开始提取各个表格的HTML源代码...")

            # summary_tables 已在前面的if-else中解析
            logger.info(f"📋 概要识别到 {len(summary_tables)} 个逻辑表格")

            # 从tablecontent提取包含"保单年度终结"的<table>标签
            table_tags = extract_tables_with_year_column(doc.tablecontent)
            logger.info(f"📊 提取到 {len(table_tags)} 个包含'保单年度终结'的<table>标签")

            # 使用改进策略：基于表格标题自动分组（参考extract_tables_complete.py）
            auto_grouped = group_tables_by_title(table_tags, doc.tablecontent)
            logger.info(f"🔄 基于表格标题自动分组: {len(auto_grouped)} 个逻辑表格")

            # 清空旧数据
            from .models import PlanTable
            PlanTable.objects.filter(plan_document=doc).delete()

            # 保存每个表格
            saved_count = 0
            for i, table_group in enumerate(auto_grouped, 1):
                # 合并<table>标签
                merged_html = merge_table_tags(table_group)
                total_rows = sum(tag['row_count'] for tag in table_group)

                # 为每个<table>查找前面的标题
                first_tag = table_group[0]
                table_title = find_table_title(doc.tablecontent, first_tag['start_pos'])

                # 尝试从summary_tables中按标题匹配表格名称和字段
                matched_summary = None
                for summary in summary_tables:
                    summary_name = summary['name']
                    # 标题匹配：移除空格、括号后比较
                    clean_title = re.sub(r'[\s\-\(\)（）]', '', table_title)
                    clean_summary = re.sub(r'[\s\-\(\)（）]', '', summary_name)
                    # 双向匹配：标题包含概要名或概要名包含标题
                    if clean_title and clean_summary and (clean_title in clean_summary or clean_summary in clean_title):
                        matched_summary = summary
                        break

                table_name = matched_summary['name'] if matched_summary else table_title
                fields = matched_summary['fields'] if matched_summary else ''

                # 保存到数据库
                PlanTable.objects.create(
                    plan_document=doc,
                    table_number=i,
                    table_name=table_name,
                    row_count=total_rows,
                    fields=fields,
                    html_source=merged_html
                )

                merge_info = f"合并了{len(table_group)}个<table>" if len(table_group) > 1 else ""
                logger.info(f"   ✅ 表格 {i}: {table_name} ({total_rows}行) {merge_info}")
                saved_count += 1

            logger.info(f"💾 成功保存 {saved_count}/{len(summary_tables)} 个表格到数据库")

        except Exception as table_error:
            logger.warning(f"⚠️ 提取表格HTML失败: {table_error}，但概要已保存")
            import traceback
            logger.error(traceback.format_exc())

        # 更新会员使用统计
        if doc.user:
            from .models import Membership
            try:
                membership = Membership.objects.get(user=doc.user)
                membership.documents_created += 1
                membership.save()
                logger.info(f"📊 会员已创建计划书数: {membership.documents_created}")
            except Membership.DoesNotExist:
                pass

        # 更新状态为已完成（步骤2是最后一个自动步骤）
        doc.processing_stage = 'all_completed'
        doc.status = 'completed'
        doc.last_processed_at = timezone.now()
        doc.save(update_fields=['processing_stage', 'status', 'last_processed_at'])

        logger.info("✅ 步骤2完成: 表格概要提取成功")
        logger.info(f"   - 概要长度: {len(content)} 字符")
        logger.info(f"   - 概要预览: {content[:200]}...")
        logger.info(f"   - 表格数据已保存到PlanTable数据库")
        logger.info("🎉 文档处理完成！")
        logger.info("=" * 80)

        return {'success': True}

    except Exception as e:
        error_msg = f"提取表格概要时发生异常: {str(e)}"
        logger.warning(f"{error_msg}（但其他数据已保存）")
        import traceback
        logger.error(traceback.format_exc())

        # 概要失败也不是致命错误，标记为已完成
        try:
            doc = PlanDocument.objects.get(id=document_id)
            doc.tablesummary = ''
            doc.processing_stage = 'all_completed'
            doc.status = 'completed'
            doc.last_processed_at = timezone.now()
            doc.save(update_fields=['tablesummary', 'processing_stage', 'status', 'last_processed_at'])
        except:
            pass

        return {'success': False, 'error': error_msg}


@shared_task
def process_document_pipeline(document_id):
    """
    完整的文档处理流水线入口
    按顺序触发三个任务：OCR识别 -> 表格源代码 -> 表格概要（存入PlanTable）

    Args:
        document_id: PlanDocument的ID
    """
    logger.info(f"🚀 启动文档处理流水线（3个任务）- 文档ID: {document_id}")

    # 触发第一个任务：OCR识别，后续任务会自动链式触发
    ocr_document_task.apply_async(args=[document_id])

    return {'status': 'pipeline_started', 'document_id': document_id}
