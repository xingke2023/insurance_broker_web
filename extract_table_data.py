#!/usr/bin/env python3
"""
提取表格完整数据工具
从OCR识别的保险计划书中提取每个表格的所有行和列数据
"""
import os
import sys
import re
import json
from openai import OpenAI
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


def extract_single_table_data(content, table_info):
    """
    提取单个表格的完整数据

    Args:
        content: OCR识别的完整内容
        table_info: 表格信息 {'name': '表名', 'rows': '行数', 'fields': '字段'}

    Returns:
        dict: 表格数据
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
    prompt = f"""从计划书内容中提取以下表格的完整数据。

表格名称：{table_info['name']}
预期行数：{table_info['rows']}
基本字段：{table_info['fields']}

要求：
1. 提取表格的所有行和所有列数据
2. 保单年度终结不一定是纯数字，可能是"65岁"、"65歲"等，请转换成纯数字（第几年）
3. 数值类型的字段请保留为数字，不要加单位
4. 以JSON格式返回，格式如下：

{{
  "table_name": "表格名称",
  "columns": ["列名1", "列名2", "列名3"],
  "rows": [
    {{"列名1": 值1, "列名2": 值2, "列名3": 值3}},
    {{"列名1": 值4, "列名2": 值5, "列名3": 值6}}
  ]
}}

计划书内容：
{content}

请直接返回JSON格式数据，不要包含任何其他文字或markdown标记。"""

    print(f"⏳ 正在提取表格数据: {table_info['name']}")
    print(f"   预期行数: {table_info['rows']}")

    try:
        # 调用DeepSeek API
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "system",
                    "content": "你是一个专业的保险文档数据提取助手，擅长从文档中提取结构化的表格数据。你必须返回严格符合要求的JSON格式数据。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            max_tokens=8192  # DeepSeek API上限为8192
        )

        # 提取结果
        result = response.choices[0].message.content.strip()

        # 清理可能的markdown标记
        if result.startswith('```'):
            lines = result.split('\n')
            if lines[0].startswith('```'):
                result = '\n'.join(lines[1:])
            if lines[-1].strip() == '```':
                result = '\n'.join(result.split('\n')[:-1])

        # 解析JSON
        try:
            table_data = json.loads(result)
            print(f"✅ 提取成功，实际行数: {len(table_data.get('rows', []))}")
            return table_data
        except json.JSONDecodeError as e:
            print(f"❌ JSON解析失败: {e}")
            print(f"   返回内容: {result[:200]}...")
            return None

    except Exception as e:
        print(f"❌ API调用失败: {e}")
        return None


def parse_tablesummary(summary_file):
    """
    解析表格概要文件，提取每个表格的信息

    Args:
        summary_file: 表格概要文件路径

    Returns:
        list: 表格信息列表
    """
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

        # 识别表格编号
        if line and line[0].isdigit() and line[1:3] in ['.', '、', '：']:
            # 保存上一个表格
            if current_table and current_table.get('name'):
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

    return tables


def save_table_data(table_data, output_file):
    """
    保存表格数据到文件（同时保存JSON和可读格式）

    Args:
        table_data: 表格数据字典
        output_file: 输出文件路径（不含扩展名）
    """
    if not table_data:
        return

    # 保存JSON格式
    json_file = f"{output_file}.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(table_data, f, ensure_ascii=False, indent=2)

    print(f"  💾 JSON数据: {json_file}")

    # 保存可读格式（CSV风格）
    txt_file = f"{output_file}.txt"
    with open(txt_file, 'w', encoding='utf-8') as f:
        f.write(f"表格名称: {table_data.get('table_name', 'N/A')}\n")
        f.write("=" * 80 + "\n\n")

        columns = table_data.get('columns', [])
        rows = table_data.get('rows', [])

        # 写入表头
        f.write("\t".join(columns) + "\n")
        f.write("-" * 80 + "\n")

        # 写入数据行
        for row in rows:
            values = [str(row.get(col, '')) for col in columns]
            f.write("\t".join(values) + "\n")

        f.write("\n")
        f.write(f"总行数: {len(rows)}\n")

    print(f"  📄 可读格式: {txt_file}")


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("=" * 80)
        print("提取表格完整数据工具")
        print("=" * 80)
        print()
        print("用法：python3 extract_table_data.py <OCR文本文件路径>")
        print()
        print("⚠️  重要：此工具依赖步骤1的输出，请按顺序执行：")
        print()
        print("步骤1（必需）：先提取表格概要")
        print("  python3 test_extract_tablesummary.py '中銀集團人壽 保險有限公司.txt'")
        print()
        print("步骤2（可选）：验证表格合并")
        print("  python3 verify_table_merge.py '中銀集團人壽 保險有限公司.txt'")
        print()
        print("步骤3（本工具）：提取表格完整数据")
        print("  python3 extract_table_data.py '中銀集團人壽 保險有限公司.txt'")
        print()
        print("=" * 80)
        print()
        print("功能：")
        print("  ✅ 读取步骤1生成的表格概要")
        print("  ✅ 提取每个表格的完整数据（所有行、所有列）")
        print("  ✅ 保存为JSON和可读文本格式")
        print()
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

    print(f"✅ 文件读取成功，内容长度: {len(content):,} 字符")
    print()

    # 读取表格概要
    base_filename = os.path.splitext(file_path)[0]
    summary_file = f"{base_filename}_tablesummary.txt"

    if not os.path.exists(summary_file):
        print("=" * 80)
        print("❌ 错误：未找到表格概要文件")
        print("=" * 80)
        print()
        print(f"缺少文件: {summary_file}")
        print()
        print("⚠️  步骤3依赖步骤1的输出，请先执行步骤1：")
        print()
        print("步骤1（必需）：")
        print(f"  python3 test_extract_tablesummary.py '{file_path}'")
        print()
        print("完成步骤1后，会生成以下文件：")
        print(f"  ✅ {summary_file}")
        print(f"  ✅ {base_filename}_table1.txt")
        print(f"  ✅ {base_filename}_table2.txt")
        print()
        print("然后再执行步骤3：")
        print(f"  python3 extract_table_data.py '{file_path}'")
        print()
        print("=" * 80)
        sys.exit(1)

    print(f"📋 读取表格概要: {summary_file}")
    tables = parse_tablesummary(summary_file)

    if not tables:
        print("❌ 表格概要解析失败")
        sys.exit(1)

    print(f"✅ 识别到 {len(tables)} 个表格")
    print()
    print("=" * 80)

    # 提取每个表格的数据
    for table_info in tables:
        print()
        print(f"📊 表格 {table_info['number']}: {table_info['name']}")
        print("-" * 80)

        table_data = extract_single_table_data(content, table_info)

        if table_data:
            output_file = f"{base_filename}_table{table_info['number']}_data"
            save_table_data(table_data, output_file)
        else:
            print(f"⚠️  表格 {table_info['number']} 数据提取失败")

        print()

    print("=" * 80)
    print("✅ 所有表格数据提取完成！")
    print()
    print("生成的文件：")
    print(f"  - {base_filename}_table1_data.json  (JSON格式)")
    print(f"  - {base_filename}_table1_data.txt   (可读格式)")
    print(f"  - {base_filename}_table2_data.json")
    print(f"  - {base_filename}_table2_data.txt")
    print("  ...")


if __name__ == '__main__':
    main()
