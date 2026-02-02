#!/usr/bin/env python3
"""
验证工具：检查表格是否被正确合并
分析OCR内容中的表格分布，对比DeepSeek识别结果
"""
import sys
import re


def analyze_ocr_tables(content):
    """
    分析OCR内容中的表格标记
    查找所有 <table> 标签和"保单年度终结"出现的位置
    """
    # 查找所有<table>标签
    table_pattern = re.compile(r'<table[^>]*>(.*?)</table>', re.DOTALL | re.IGNORECASE)
    tables = table_pattern.findall(content)

    print("=" * 80)
    print("📊 OCR内容中的表格分析")
    print("=" * 80)
    print(f"总共检测到 {len(tables)} 个 <table> 标签")
    print()

    # 分析每个表格
    year_keyword = "保单年度终结"
    tables_with_year = []

    for i, table_content in enumerate(tables, 1):
        if year_keyword in table_content or "保單年度終結" in table_content:
            # 计算表格中的行数（<tr>标签数）
            tr_pattern = re.compile(r'<tr[^>]*>', re.IGNORECASE)
            rows = len(tr_pattern.findall(table_content))

            # 尝试提取表格标题（查找表格前的文字）
            table_start = content.find(table_content)
            before_table = content[max(0, table_start - 200):table_start]

            # 查找可能的表格标题
            title_lines = before_table.split('\n')
            possible_title = ""
            for line in reversed(title_lines):
                line = line.strip()
                if line and not line.startswith('<') and len(line) > 5:
                    possible_title = line
                    break

            tables_with_year.append({
                'index': i,
                'rows': rows,
                'title': possible_title,
                'has_year_column': year_keyword in table_content or "保單年度終結" in table_content
            })

            print(f"表格 #{i}:")
            print(f"  行数: {rows}")
            print(f"  可能的标题: {possible_title[:50]}...")
            print(f"  包含'保单年度终结': ✓")
            print()

    print("=" * 80)
    print(f"包含'保单年度终结'的表格数量: {len(tables_with_year)}")
    print("=" * 80)
    print()

    return tables_with_year


def compare_with_summary(ocr_tables, summary_file):
    """
    对比OCR表格数量与DeepSeek识别结果
    """
    try:
        with open(summary_file, 'r', encoding='utf-8') as f:
            summary = f.read()

        # 统计概要中的表格数量
        table_count = 0
        for line in summary.split('\n'):
            line = line.strip()
            if line and line[0].isdigit() and line[1] == '.':
                table_count += 1

        print("=" * 80)
        print("🔍 对比分析")
        print("=" * 80)
        print(f"OCR中包含'保单年度终结'的 <table> 标签数: {len(ocr_tables)}")
        print(f"DeepSeek识别出的表格数: {table_count}")
        print()

        if len(ocr_tables) > table_count:
            print("⚠️  OCR中的表格数量 > DeepSeek识别数量")
            print("   可能原因：DeepSeek正确合并了跨页表格")
            print(f"   预计合并了 {len(ocr_tables) - table_count} 个跨页表格")
        elif len(ocr_tables) == table_count:
            print("✅ OCR中的表格数量 = DeepSeek识别数量")
            print("   可能原因：没有跨页表格，或每个 <table> 都是独立的表格")
        else:
            print("❌ OCR中的表格数量 < DeepSeek识别数量")
            print("   异常：DeepSeek识别的表格比OCR中的多，需要人工检查")

        print("=" * 80)

    except FileNotFoundError:
        print(f"❌ 未找到概要文件: {summary_file}")
        print("   请先运行 test_extract_tablesummary.py 生成概要文件")


def main():
    if len(sys.argv) < 2:
        print("用法：python3 verify_table_merge.py <OCR文本文件>")
        print()
        print("示例：")
        print("  python3 verify_table_merge.py '中銀集團人壽 保險有限公司.txt'")
        print()
        print("功能：")
        print("  1. 分析OCR内容中的表格数量")
        print("  2. 对比DeepSeek识别结果")
        print("  3. 判断是否正确合并跨页表格")
        sys.exit(1)

    ocr_file = sys.argv[1]

    # 读取OCR内容
    try:
        with open(ocr_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ 文件不存在: {ocr_file}")
        sys.exit(1)

    print(f"📄 读取OCR文件: {ocr_file}")
    print(f"   文件大小: {len(content):,} 字符")
    print()

    # 分析OCR表格
    ocr_tables = analyze_ocr_tables(content)

    # 对比概要文件
    import os
    base_name = os.path.splitext(ocr_file)[0]
    summary_file = f"{base_name}_tablesummary.txt"

    if os.path.exists(summary_file):
        compare_with_summary(ocr_tables, summary_file)
    else:
        print()
        print("💡 提示：运行以下命令生成表格概要，以便对比分析：")
        print(f"   python3 test_extract_tablesummary.py '{ocr_file}'")


if __name__ == '__main__':
    main()
