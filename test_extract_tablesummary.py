#!/usr/bin/env python3
"""
快速测试：从OCR文本文件提取表格概要
使用DeepSeek API分析保险计划书中的所有表格结构
"""
import os
import sys
from openai import OpenAI
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


def extract_table_summary(content):
    """
    提取表格概要

    Args:
        content: OCR识别的计划书内容

    Returns:
        str: 表格概要结果
    """
    # 获取DeepSeek API密钥
    api_key = os.getenv('DEEPSEEK_API_KEY')
    if not api_key:
        print("❌ 错误：DEEPSEEK_API_KEY环境变量未设置")
        print("   请在.env文件中设置DEEPSEEK_API_KEY")
        sys.exit(1)

    # 初始化DeepSeek客户端
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com"
    )

    # 构建提示词（移除字符限制，使用完整内容）
    prompt = f"""以保单年度终结为坐标，分析以下保险计划书中的所有表格。

要求：
1. 识别所有以"保单年度终结"为坐标的表格
2. 有些表格可能跨度好几个页面，但只算一张表，请完整识别
3. 对每个表格提取：表详细名称、行数、基本字段

只输出结果，不要有任何解释说明。

输出格式示例：
1.
表名：詳細說明 - 退保價值 (只根據基本計劃計算)
行数：100行
基本字段：保单年度终结,缴付保费总额,退保价值(保证金额(保证现金价值),非保證金額(续期红利),总额),累積已支付非保證入息+總退保價值

2.
表名：身故賠償
行数：50行
基本字段：保单年度终结,身故赔偿(保证金额,非保证金额,总额)

计划书内容：
{content}

请直接返回分析结果，不要包含markdown代码块标记。"""

    print("=" * 80)
    print("⏳ 开始调用 DeepSeek API 分析表格结构")
    print(f"   OCR内容长度: {len(content):,} 字符")
    print(f"   使用完整内容（无限制）")
    print("=" * 80)

    # 调用DeepSeek API
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
        max_tokens=2000
    )

    # 提取结果
    result = response.choices[0].message.content.strip()

    # 清理可能的代码块标记
    if result.startswith('```'):
        lines = result.split('\n')
        # 移除第一行（```）和最后一行（```）
        if len(lines) > 2 and lines[-1].strip() == '```':
            result = '\n'.join(lines[1:-1])
        elif len(lines) > 1:
            result = '\n'.join(lines[1:])

    print(f"📦 DeepSeek API返回，长度: {len(result):,} 字符")
    print("=" * 80)

    return result


def parse_and_save_tables(summary, base_filename):
    """
    解析表格概要，将每个表格单独保存

    Args:
        summary: 表格概要文本
        base_filename: 基础文件名（不含扩展名）

    Returns:
        list: 解析出的表格信息列表
    """
    tables = []
    current_table = {}

    lines = summary.strip().split('\n')
    table_number = 0

    for line in lines:
        line = line.strip()

        # 识别表格编号（例如：1. 或 2. 等）
        if line and line[0].isdigit() and line[1:3] in ['.', '、', '：']:
            # 保存上一个表格
            if current_table:
                tables.append(current_table)

            # 开始新表格
            table_number += 1
            current_table = {
                'number': table_number,
                'name': '',
                'rows': '',
                'fields': ''
            }

        # 提取表名
        elif line.startswith('表名：') or line.startswith('表名:'):
            current_table['name'] = line.replace('表名：', '').replace('表名:', '').strip()

        # 提取行数
        elif line.startswith('行数：') or line.startswith('行数:') or line.startswith('行數：') or line.startswith('行數:'):
            current_table['rows'] = line.replace('行数：', '').replace('行数:', '').replace('行數：', '').replace('行數:', '').strip()

        # 提取字段
        elif line.startswith('基本字段：') or line.startswith('基本字段:') or line.startswith('基本欄位：') or line.startswith('基本欄位:'):
            current_table['fields'] = line.replace('基本字段：', '').replace('基本字段:', '').replace('基本欄位：', '').replace('基本欄位:', '').strip()

    # 保存最后一个表格
    if current_table and current_table.get('name'):
        tables.append(current_table)

    # 为每个表格创建单独的文件
    for table in tables:
        table_filename = f"{base_filename}_table{table['number']}.txt"

        table_content = f"""表格 {table['number']}
{'=' * 80}

表名：{table['name']}
行数：{table['rows']}
基本字段：{table['fields']}

{'=' * 80}
"""

        with open(table_filename, 'w', encoding='utf-8') as f:
            f.write(table_content)

        print(f"  📋 表格 {table['number']}: {table_filename}")

    return tables


def main():
    """主函数"""
    # 检查命令行参数
    if len(sys.argv) < 2:
        print("用法：python3 test_extract_tablesummary.py <OCR文本文件路径>")
        print()
        print("示例：")
        print("  python3 test_extract_tablesummary.py '中銀集團人壽 保險有限公司.txt'")
        print("  python3 test_extract_tablesummary.py /path/to/ocr_content.txt")
        sys.exit(1)

    file_path = sys.argv[1]

    # 检查文件是否存在
    if not os.path.exists(file_path):
        print(f"❌ 错误：文件不存在: {file_path}")
        sys.exit(1)

    # 读取OCR内容
    print(f"📄 读取文件: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ 读取文件失败: {e}")
        sys.exit(1)

    if not content.strip():
        print("❌ 错误：文件内容为空")
        sys.exit(1)

    print(f"✅ 文件读取成功，内容长度: {len(content):,} 字符")
    print()

    # 提取表格概要
    try:
        summary = extract_table_summary(content)

        # 输出结果
        print("📋 表格概要分析结果：")
        print("=" * 80)
        print(summary)
        print("=" * 80)

        # 保存完整概要到文件
        base_filename = os.path.splitext(file_path)[0]
        output_file = f"{base_filename}_tablesummary.txt"

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(summary)

        print()
        print(f"✅ 完整概要已保存到: {output_file}")

        # 解析并保存每个表格
        print()
        print("📦 解析并保存每个表格...")
        tables = parse_and_save_tables(summary, base_filename)

        print()
        print(f"✅ 共识别到 {len(tables)} 个表格，已分别保存")

    except Exception as e:
        print(f"❌ 提取失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
