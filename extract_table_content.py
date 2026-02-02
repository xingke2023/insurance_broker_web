#!/usr/bin/env python3
"""
步骤1.5: 提取每个表格对应的OCR内容
从完整OCR内容中，根据表格名称定位并提取该表格的文本内容
"""
import os
import sys
import re


def find_table_content(full_content, table_name, next_table_name=None):
    """
    从完整OCR内容中查找并提取某个表格的内容

    Args:
        full_content: 完整的OCR文本
        table_name: 当前表格名称
        next_table_name: 下一个表格名称（用于确定边界）

    Returns:
        str: 该表格的内容文本
    """
    # 查找表格名称的位置
    start_pos = full_content.find(table_name)

    if start_pos == -1:
        # 找不到，尝试模糊匹配
        # 移除空格、括号等特殊字符再匹配
        simplified_name = re.sub(r'[\s()（）]', '', table_name)
        simplified_content = re.sub(r'[\s()（）]', '', full_content)

        match_pos = simplified_content.find(simplified_name)
        if match_pos != -1:
            # 反向映射到原文位置（近似）
            start_pos = match_pos
        else:
            return f"# 未找到表格: {table_name}\n"

    # 确定结束位置
    if next_table_name:
        end_pos = full_content.find(next_table_name, start_pos + len(table_name))
        if end_pos == -1:
            # 找不到下一个表格，取到文档末尾
            end_pos = len(full_content)
    else:
        # 最后一个表格，取到末尾
        end_pos = len(full_content)

    # 提取内容
    table_content = full_content[start_pos:end_pos]

    return table_content.strip()


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
        print("步骤1.5: 提取每个表格的OCR内容")
        print("=" * 80)
        print()
        print("用法：python3 extract_table_content.py <OCR文本文件路径>")
        print()
        print("功能：")
        print("  从完整OCR内容中，提取每个表格对应的文本内容并保存")
        print()
        print("示例：")
        print("  python3 extract_table_content.py '中銀集團人壽 保險有限公司.txt'")
        print()
        print("输出：")
        print("  - *_table1_content.txt   (表格1的OCR文本内容)")
        print("  - *_table2_content.txt   (表格2的OCR文本内容)")
        print("  - ...")
        print()
        print("⚠️  前置步骤：需要先运行 test_extract_tablesummary.py")
        print()
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"❌ 错误：文件不存在: {file_path}")
        sys.exit(1)

    # 读取完整OCR内容
    print(f"📄 读取OCR文件: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            full_content = f.read()
    except Exception as e:
        print(f"❌ 读取文件失败: {e}")
        sys.exit(1)

    print(f"✅ 文件读取成功，内容长度: {len(full_content):,} 字符")
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
    tables = parse_tablesummary(summary_file)

    if not tables:
        print("❌ 表格概要解析失败")
        sys.exit(1)

    print(f"✅ 识别到 {len(tables)} 个表格")
    print()
    print("=" * 80)

    # 提取每个表格的内容
    for i, table_info in enumerate(tables):
        # 确定下一个表格的名称（用于确定当前表格的结束位置）
        next_table_name = tables[i + 1]['name'] if i + 1 < len(tables) else None

        # 提取该表格的内容
        table_content = find_table_content(full_content, table_info['name'], next_table_name)

        # 保存到文件
        output_file = f"{base_filename}_table{table_info['number']}_content.txt"

        with open(output_file, 'w', encoding='utf-8') as f:
            # 添加注释头部
            f.write(f"# 表格 {table_info['number']}: {table_info['name']}\n")
            f.write(f"# 预期行数: {table_info['rows']}\n")
            f.write(f"# 基本字段: {table_info['fields']}\n")
            f.write("#" + "=" * 78 + "\n\n")
            f.write(table_content)

        content_length = len(table_content)
        print(f"✅ 表格 {table_info['number']}: {table_info['name']}")
        print(f"   内容长度: {content_length:,} 字符")
        print(f"   已保存: {output_file}")
        print()

    print("=" * 80)
    print(f"✅ 完成！成功提取 {len(tables)} 个表格的内容")
    print("=" * 80)
    print()
    print("生成的文件：")
    for i in range(1, len(tables) + 1):
        print(f"  - {base_filename}_table{i}_content.txt")
    print()
    print("下一步（可选）：")
    print("  可以手动查看这些文件，或用它们进行进一步分析")
    print()


if __name__ == '__main__':
    main()
