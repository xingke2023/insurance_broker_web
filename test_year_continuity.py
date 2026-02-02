#!/usr/bin/env python3
"""
测试年度连续性验证功能
"""
import re

def extract_year_column(table_html):
    """从HTML表格中提取"保单年度终结"列的所有数字"""
    tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
    rows = tr_pattern.findall(table_html)

    if not rows:
        return []

    # 找到"保单年度终结"列的索引
    year_col_index = None
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
            match = re.search(r'\d+', cell_text)
            if match:
                years.append(int(match.group()))

    return years


def validate_year_continuity(table_group, debug=True):
    """验证表格组中"保单年度终结"列的连续性"""
    all_years = []

    for table_tag in table_group:
        years = extract_year_column(table_tag['html'])
        all_years.extend(years)

    if not all_years:
        return True

    # 检查是否有重复年度
    if len(all_years) != len(set(all_years)):
        if debug:
            duplicates = [y for y in set(all_years) if all_years.count(y) > 1]
            print(f"   ⚠️  检测到重复年度: {duplicates}")
        return False

    # 排序并检查连续性
    sorted_years = sorted(all_years)

    # 检查是否连续
    for i in range(len(sorted_years) - 1):
        if sorted_years[i+1] - sorted_years[i] != 1:
            if debug:
                print(f"   ⚠️  年度不连续: {sorted_years[i]} → {sorted_years[i+1]} (跳跃)")
            return False

    if debug:
        print(f"   ✅ 年度连续: {sorted_years[0]}-{sorted_years[-1]} ({len(sorted_years)}个)")

    return True


# ============ 测试用例 ============

print("=" * 80)
print("测试年度连续性验证功能")
print("=" * 80)
print()

# 测试1: 连续的续表
print("测试1: 连续的续表 (年度 1-40)")
table1 = {
    'html': '''<table>
    <tr><th>保单年度终结</th><th>退保价值</th></tr>
    <tr><td>1</td><td>1000</td></tr>
    <tr><td>2</td><td>2000</td></tr>
    <tr><td>3</td><td>3000</td></tr>
    <tr><td>20</td><td>20000</td></tr>
    </table>'''
}

table2 = {
    'html': '''<table>
    <tr><th>保单年度终结</th><th>退保价值</th></tr>
    <tr><td>21</td><td>21000</td></tr>
    <tr><td>22</td><td>22000</td></tr>
    <tr><td>40</td><td>40000</td></tr>
    </table>'''
}

# 模拟连续年度
table1_years = list(range(1, 21))
table2_years = list(range(21, 41))

# 构造完整的HTML
table1['html'] = '<table>\n<tr><th>保单年度终结</th><th>退保价值</th></tr>\n'
for y in table1_years:
    table1['html'] += f'<tr><td>{y}</td><td>{y*1000}</td></tr>\n'
table1['html'] += '</table>'

table2['html'] = '<table>\n<tr><th>保单年度终结</th><th>退保价值</th></tr>\n'
for y in table2_years:
    table2['html'] += f'<tr><td>{y}</td><td>{y*1000}</td></tr>\n'
table2['html'] += '</table>'

result = validate_year_continuity([table1, table2])
print(f"预期: True, 实际: {result}")
print()

# 测试2: 重复的年度
print("测试2: 重复的年度 (两个表都是 1-20)")
table3 = {
    'html': '<table>\n<tr><th>保单年度终结</th><th>退保价值</th></tr>\n'
}
for y in range(1, 21):
    table3['html'] += f'<tr><td>{y}</td><td>{y*1000}</td></tr>\n'
table3['html'] += '</table>'

table4 = {
    'html': '<table>\n<tr><th>保单年度终结</th><th>退保价值</th></tr>\n'
}
for y in range(1, 21):
    table4['html'] += f'<tr><td>{y}</td><td>{y*2000}</td></tr>\n'
table4['html'] += '</table>'

result = validate_year_continuity([table3, table4])
print(f"预期: False, 实际: {result}")
print()

# 测试3: 跳跃的年度
print("测试3: 跳跃的年度 (1-20, 然后跳到25-40)")
table5 = {
    'html': '<table>\n<tr><th>保单年度终结</th><th>退保价值</th></tr>\n'
}
for y in range(1, 21):
    table5['html'] += f'<tr><td>{y}</td><td>{y*1000}</td></tr>\n'
table5['html'] += '</table>'

table6 = {
    'html': '<table>\n<tr><th>保单年度终结</th><th>退保价值</th></tr>\n'
}
for y in range(25, 41):
    table6['html'] += f'<tr><td>{y}</td><td>{y*1000}</td></tr>\n'
table6['html'] += '</table>'

result = validate_year_continuity([table5, table6])
print(f"预期: False, 实际: {result}")
print()

# 测试4: 繁体字列名
print("测试4: 繁体字列名 (保單年度終結)")
table7 = {
    'html': '<table>\n<tr><th>保單年度終結</th><th>退保價值</th></tr>\n'
}
for y in range(1, 11):
    table7['html'] += f'<tr><td>{y}</td><td>{y*1000}</td></tr>\n'
table7['html'] += '</table>'

years = extract_year_column(table7['html'])
print(f"提取到的年度: {years}")
result = validate_year_continuity([table7])
print(f"预期: True, 实际: {result}")
print()

print("=" * 80)
print("✅ 所有测试完成")
print("=" * 80)
