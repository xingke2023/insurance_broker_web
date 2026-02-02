"""
HTML表格解析器
用于从PlanTable的HTML源代码中提取年度价值数据
"""

import re
import logging
from decimal import Decimal, InvalidOperation
from django.db import transaction

logger = logging.getLogger(__name__)


def clean_number(value_str):
    """
    清理数字字符串，转换为Decimal

    处理：
    - 移除逗号分隔符: "1,000" -> "1000"
    - 移除空格: " 1000 " -> "1000"
    - 处理空值、"-"、"N/A"等 -> None
    - 处理百分比: "5%" -> "5"

    Args:
        value_str: 原始字符串

    Returns:
        Decimal 或 None
    """
    if not value_str or not isinstance(value_str, str):
        return None

    # 移除空格和换行
    value_str = value_str.strip().replace('\n', '').replace('\r', '')

    # 处理空值
    if value_str in ['', '-', 'N/A', 'n/a', '—', '–']:
        return None

    # 移除逗号和其他非数字字符（保留小数点和负号）
    value_str = value_str.replace(',', '')
    value_str = re.sub(r'[^\d\.\-]', '', value_str)

    try:
        return Decimal(value_str)
    except (InvalidOperation, ValueError):
        return None


def extract_table_rows(html_source):
    """
    从HTML源代码中提取所有表格行

    Args:
        html_source: HTML字符串

    Returns:
        list: 每行是一个包含单元格文本的列表 [["cell1", "cell2"], ["cell3", "cell4"]]
    """
    rows = []

    # 提取所有<tr>标签（忽略换行）
    html_cleaned = html_source.replace('\n', ' ').replace('\r', ' ')
    tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.IGNORECASE | re.DOTALL)
    tr_matches = tr_pattern.findall(html_cleaned)

    for tr_content in tr_matches:
        # 提取该行所有单元格（<th>或<td>）
        cell_pattern = re.compile(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', re.IGNORECASE | re.DOTALL)
        cells = cell_pattern.findall(tr_content)

        # 清理每个单元格的文本（移除HTML标签）
        cleaned_cells = []
        for cell in cells:
            # 移除内部HTML标签
            text = re.sub(r'<[^>]+>', '', cell)
            # 移除多余空格
            text = ' '.join(text.split())
            cleaned_cells.append(text)

        if cleaned_cells:  # 只保留非空行
            rows.append(cleaned_cells)

    return rows


def identify_column_indices(header_row):
    """
    识别关键列的索引位置

    查找：
    - 保单年度终结/保單年度終結
    - 保证现金价值/保證現金價值/保证金额/保證金額
    - 非保证现金价值/非保證現金價值
    - 总现金价值/总额/總額/退保价值总额

    Args:
        header_row: 表头行（字符串列表）

    Returns:
        dict: {
            'policy_year': 年度列索引,
            'guaranteed': 保证现金价值列索引,
            'non_guaranteed': 非保证现金价值列索引,
            'total': 总额列索引
        }
    """
    indices = {
        'policy_year': None,
        'guaranteed': None,
        'non_guaranteed': None,
        'total': None
    }

    # 清理表头（移除换行，统一简繁体）
    cleaned_headers = []
    for header in header_row:
        h = header.replace('\n', '').replace('\r', '')
        # 统一简繁体关键词
        h = h.replace('保單年度終結', '保单年度终结')
        h = h.replace('保證', '保证')
        h = h.replace('總額', '总额')
        h = h.replace('現金價值', '现金价值')
        cleaned_headers.append(h)

    for i, header in enumerate(cleaned_headers):
        # 保单年度
        if '保单年度终结' in header or '保单年度' in header:
            indices['policy_year'] = i

        # 保证现金价值/保证金额
        elif ('保证' in header and ('现金价值' in header or '金额' in header)) and '非' not in header:
            if indices['guaranteed'] is None:  # 只取第一个匹配
                indices['guaranteed'] = i

        # 非保证现金价值
        elif '非保证' in header and '现金价值' in header:
            if indices['non_guaranteed'] is None:
                indices['non_guaranteed'] = i

        # 总额/总现金价值
        elif ('总额' in header or '总现金价值' in header or '退保价值总额' in header) and '非保证' not in header:
            if indices['total'] is None:
                indices['total'] = i

    return indices


def parse_policy_year(year_str):
    """
    解析保单年度字符串

    支持格式：
    - "1", "2", "100" -> 1, 2, 100
    - "65岁", "70歲" -> 65, 70
    - "65 岁" -> 65

    Args:
        year_str: 年度字符串

    Returns:
        int 或 None
    """
    if not year_str:
        return None

    # 移除空格
    year_str = year_str.strip()

    # 尝试直接转换为数字
    if year_str.isdigit():
        return int(year_str)

    # 提取年龄中的数字（如"65岁" -> 65）
    match = re.search(r'(\d+)', year_str)
    if match:
        return int(match.group(1))

    return None


def extract_annual_values_from_html(html_source, table_name=''):
    """
    从HTML表格中提取年度价值数据

    Args:
        html_source: HTML源代码
        table_name: 表格名称（用于日志）

    Returns:
        list: [
            {
                'policy_year': 1,
                'guaranteed_cash_value': Decimal('1000.00'),
                'non_guaranteed_cash_value': Decimal('500.00'),
                'total_cash_value': Decimal('1500.00')
            },
            ...
        ]
    """
    logger.info(f"📊 开始解析HTML表格: {table_name}")

    # 提取所有行
    rows = extract_table_rows(html_source)
    logger.info(f"   提取到 {len(rows)} 行数据")

    if not rows:
        logger.warning("   ⚠️ 未提取到任何行数据")
        return []

    # 识别表头行（通常是第一行或包含最多关键词的行）
    header_row = None
    data_start_index = 1

    # 检查前3行，找到包含"保单年度"的行作为表头
    for i in range(min(3, len(rows))):
        row_text = ' '.join(rows[i])
        if '保单年度' in row_text or '保單年度' in row_text:
            header_row = rows[i]
            data_start_index = i + 1
            logger.info(f"   找到表头行（第{i+1}行）")
            break

    if not header_row:
        # 如果前3行都没有表头，假设第一行是表头
        header_row = rows[0]
        logger.warning("   未找到明确的表头行，使用第一行作为表头")

    # 识别列索引
    indices = identify_column_indices(header_row)
    logger.info(f"   列索引: {indices}")

    if indices['policy_year'] is None:
        logger.error("   ❌ 未找到'保单年度终结'列")
        return []

    # 提取数据行
    annual_values = []
    skipped_rows = 0

    for row in rows[data_start_index:]:
        # 跳过列数不匹配的行
        if len(row) <= max(i for i in indices.values() if i is not None):
            skipped_rows += 1
            continue

        # 解析保单年度
        policy_year = parse_policy_year(row[indices['policy_year']])
        if policy_year is None:
            skipped_rows += 1
            continue

        # 解析保证现金价值
        guaranteed = None
        if indices['guaranteed'] is not None:
            guaranteed = clean_number(row[indices['guaranteed']])

        # 解析非保证现金价值
        non_guaranteed = None
        if indices['non_guaranteed'] is not None:
            non_guaranteed = clean_number(row[indices['non_guaranteed']])

        # 解析总现金价值
        total = None
        if indices['total'] is not None:
            total = clean_number(row[indices['total']])

        # 如果没有总额，尝试计算
        if total is None and guaranteed is not None:
            if non_guaranteed is not None:
                total = guaranteed + non_guaranteed
            else:
                total = guaranteed

        annual_values.append({
            'policy_year': policy_year,
            'guaranteed_cash_value': guaranteed,
            'non_guaranteed_cash_value': non_guaranteed,
            'total_cash_value': total
        })

    logger.info(f"   ✅ 成功提取 {len(annual_values)} 条年度数据")
    if skipped_rows > 0:
        logger.info(f"   ⏭️ 跳过 {skipped_rows} 行（非数据行或格式不匹配）")

    return annual_values


def merge_annual_values(values_list):
    """
    合并多个表格的年度价值数据（去重、排序）

    如果同一年度有多个值，优先选择有完整数据的记录

    Args:
        values_list: [[value1, value2], [value3, value4]] 多个表格的数据列表

    Returns:
        list: 合并后的年度数据（按年度排序）
    """
    merged = {}

    for values in values_list:
        for item in values:
            year = item['policy_year']

            # 如果该年度还没有记录，直接添加
            if year not in merged:
                merged[year] = item
            else:
                # 如果已有记录，选择数据更完整的
                existing = merged[year]

                # 比较哪个记录更完整（有更多非空字段）
                existing_count = sum(1 for v in [
                    existing['guaranteed_cash_value'],
                    existing['non_guaranteed_cash_value'],
                    existing['total_cash_value']
                ] if v is not None)

                new_count = sum(1 for v in [
                    item['guaranteed_cash_value'],
                    item['non_guaranteed_cash_value'],
                    item['total_cash_value']
                ] if v is not None)

                # 如果新记录更完整，替换旧记录
                if new_count > existing_count:
                    merged[year] = item

    # 按年度排序
    sorted_values = sorted(merged.values(), key=lambda x: x['policy_year'])

    return sorted_values


def select_best_table_for_extraction(plan_tables):
    """
    从多个PlanTable中选择最适合提取年度价值数据的表格

    选择标准（优先级从高到低）：
    1. 排除"悲观"、"乐观"、"身故赔偿"等不相关表格
    2. 优先选择行数最多的表格（完整年度数据）
    3. 优先选择包含"退保价值"、"现金价值"关键词的表格
    4. 优先选择从年度1开始的表格

    Args:
        plan_tables: QuerySet 或 list of PlanTable对象

    Returns:
        list: 选中的PlanTable对象列表（按优先级排序）
    """
    if not plan_tables:
        return []

    candidates = []

    for table in plan_tables:
        # 排除规则
        exclude_keywords = ['悲观', '乐观', '悲觀', '樂觀', '身故赔偿', '身故賠償']
        if any(keyword in table.table_name for keyword in exclude_keywords):
            logger.info(f"   ⏭️ 跳过表格{table.table_number}: {table.table_name}（包含排除关键词）")
            continue

        # 必须包含"保单年度"相关字段
        if '保单年度' not in table.fields and '保單年度' not in table.fields:
            logger.info(f"   ⏭️ 跳过表格{table.table_number}: {table.table_name}（不包含年度字段）")
            continue

        # 计算优先级分数
        score = 0

        # 分数1: 行数（越多越好）
        score += table.row_count * 10

        # 分数2: 包含关键词
        priority_keywords = ['退保价值', '退保價值', '现金价值', '現金價值', '说明摘要', '說明摘要']
        for keyword in priority_keywords:
            if keyword in table.table_name:
                score += 1000
                break

        # 分数3: 字段完整性（包含保证、非保证、总额）
        field_keywords = ['保证', '保證', '非保证', '非保證', '总额', '總額']
        matching_fields = sum(1 for keyword in field_keywords if keyword in table.fields)
        score += matching_fields * 100

        candidates.append({
            'table': table,
            'score': score
        })

        logger.info(f"   📊 表格{table.table_number}: {table.table_name} (行数:{table.row_count}, 得分:{score})")

    # 按分数排序
    candidates.sort(key=lambda x: x['score'], reverse=True)

    # 返回前3个最佳表格
    selected = [c['table'] for c in candidates[:3]]

    if selected:
        logger.info(f"   ✅ 选中 {len(selected)} 个表格用于数据提取")
        for table in selected:
            logger.info(f"      - 表格{table.table_number}: {table.table_name} ({table.row_count}行)")
    else:
        logger.warning("   ⚠️ 未找到合适的表格")

    return selected


def extract_annual_values_from_document(document):
    """
    从文档的tablecontent或PlanTable中提取年度价值数据

    策略：
    1. 优先从tablecontent提取（包含完整的跨页表格）
    2. 如果tablecontent为空，再从PlanTable提取

    Args:
        document: PlanDocument对象

    Returns:
        list: 年度价值数据列表（已排序、去重）
    """
    logger.info(f"🔍 开始从文档 {document.id} 提取年度价值数据")

    all_values = []

    # 策略1：优先从tablecontent提取（包含完整的跨页表格）
    if document.tablecontent:
        logger.info(f"   📄 从tablecontent提取（长度: {len(document.tablecontent)} 字符）")

        import re
        # 提取所有<table>标签
        table_pattern = r'<table[^>]*>(.*?)</table>'
        tables = re.findall(table_pattern, document.tablecontent, re.DOTALL | re.IGNORECASE)
        logger.info(f"   找到 {len(tables)} 个表格")

        # 过滤：只保留包含"保单年度"的表格
        for i, table_html in enumerate(tables, 1):
            full_table_html = f"<table>{table_html}</table>"

            # 检查是否包含"保单年度"关键词
            if '保单年度' not in full_table_html and '保單年度' not in full_table_html:
                continue

            # 排除悲观/乐观情景表
            exclude_keywords = ['悲观', '乐观', '悲觀', '樂觀', '身故赔偿', '身故賠償']
            if any(keyword in full_table_html for keyword in exclude_keywords):
                continue

            # 提取数据
            values = extract_annual_values_from_html(full_table_html, f"tablecontent表格{i}")
            if values:
                all_values.append(values)
                logger.info(f"   ✅ tablecontent表格{i}提取到 {len(values)} 条数据")

    # 策略2：如果tablecontent没有数据，从PlanTable提取
    if not all_values:
        logger.info(f"   📊 从PlanTable提取")

        plan_tables = document.plan_tables.all()
        logger.info(f"   文档共有 {plan_tables.count()} 个PlanTable")

        if not plan_tables:
            logger.warning("   ⚠️ 文档没有PlanTable记录")
            return []

        # 选择最佳表格
        selected_tables = select_best_table_for_extraction(plan_tables)

        if not selected_tables:
            logger.warning("   ⚠️ 未找到合适的表格用于提取")
            return []

        # 从每个选中的表格提取数据
        for table in selected_tables:
            values = extract_annual_values_from_html(table.html_source, table.table_name)
            if values:
                all_values.append(values)
                logger.info(f"   ✅ 表格{table.table_number}提取到 {len(values)} 条数据")

    if not all_values:
        logger.warning("   ⚠️ 所有表格都未提取到有效数据")
        return []

    # 合并所有表格的数据
    merged_values = merge_annual_values(all_values)
    logger.info(f"   ✅ 合并后共 {len(merged_values)} 条年度数据")

    return merged_values


def save_annual_values_to_database(document, annual_values):
    """
    将年度价值数据保存到AnnualValue数据库

    使用事务确保数据一致性：
    - 先删除该文档的所有旧记录
    - 批量插入新记录

    Args:
        document: PlanDocument对象
        annual_values: 年度价值数据列表

    Returns:
        int: 保存的记录数
    """
    from .models import AnnualValue

    logger.info(f"💾 开始保存年度价值数据到数据库")
    logger.info(f"   文档ID: {document.id}")
    logger.info(f"   待保存记录数: {len(annual_values)}")

    if not annual_values:
        logger.warning("   ⚠️ 没有数据需要保存")
        return 0

    try:
        with transaction.atomic():
            # 删除旧记录
            old_count = AnnualValue.objects.filter(plan_document=document).count()
            if old_count > 0:
                AnnualValue.objects.filter(plan_document=document).delete()
                logger.info(f"   🗑️ 已删除 {old_count} 条旧记录")

            # 批量创建新记录
            annual_value_objects = []
            for item in annual_values:
                annual_value_objects.append(
                    AnnualValue(
                        plan_document=document,
                        policy_year=item['policy_year'],
                        guaranteed_cash_value=item['guaranteed_cash_value'],
                        non_guaranteed_cash_value=item['non_guaranteed_cash_value'],
                        total_cash_value=item['total_cash_value']
                    )
                )

            # 批量插入
            AnnualValue.objects.bulk_create(annual_value_objects)
            logger.info(f"   ✅ 成功保存 {len(annual_value_objects)} 条新记录")

            return len(annual_value_objects)

    except Exception as e:
        logger.error(f"   ❌ 保存失败: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise


def extract_and_save_annual_values(document):
    """
    完整流程：从PlanTable提取年度价值数据并保存到AnnualValue

    Args:
        document: PlanDocument对象

    Returns:
        dict: {
            'success': bool,
            'count': int,  # 保存的记录数
            'message': str,
            'error': str (if failed)
        }
    """
    try:
        logger.info("=" * 80)
        logger.info(f"🚀 开始提取并保存年度价值数据 - 文档ID: {document.id}")
        logger.info("=" * 80)

        # 提取数据
        annual_values = extract_annual_values_from_document(document)

        if not annual_values:
            return {
                'success': False,
                'count': 0,
                'message': '未能从PlanTable中提取到有效的年度价值数据',
                'error': '提取失败：可能是表格格式不符合预期，或没有合适的表格'
            }

        # 保存到数据库
        count = save_annual_values_to_database(document, annual_values)

        logger.info("=" * 80)
        logger.info(f"✅ 年度价值数据提取和保存完成")
        logger.info(f"   总记录数: {count}")
        logger.info(f"   年度范围: {annual_values[0]['policy_year']} - {annual_values[-1]['policy_year']}")
        logger.info("=" * 80)

        return {
            'success': True,
            'count': count,
            'message': f'成功提取并保存 {count} 条年度价值数据',
            'year_range': f"{annual_values[0]['policy_year']}-{annual_values[-1]['policy_year']}"
        }

    except Exception as e:
        logger.error(f"❌ 提取和保存失败: {e}")
        import traceback
        logger.error(traceback.format_exc())

        return {
            'success': False,
            'count': 0,
            'message': '提取和保存失败',
            'error': str(e)
        }
