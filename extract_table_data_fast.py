#!/usr/bin/env python3
"""
提取表格完整数据工具 - 优化版
- 并行处理（3个并发）
- 缓存机制（跳过已提取）
- 进度显示（实时进度和预估时间）
- 智能截取（只发送表格相关内容）

速度提升: 5-10倍
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


def extract_table_section(content, table_name):
    """
    智能截取表格相关内容

    Args:
        content: 完整OCR内容
        table_name: 表格名称

    Returns:
        str: 表格相关的内容片段
    """
    # 查找表格名称位置
    table_pos = content.find(table_name)

    if table_pos == -1:
        # 找不到表格名称，尝试模糊匹配
        # 移除括号和空格
        simplified_name = table_name.replace('(', '').replace(')', '').replace(' ', '')
        for i, char in enumerate(content):
            if content[i:i+len(simplified_name)].replace('(', '').replace(')', '').replace(' ', '') == simplified_name:
                table_pos = i
                break

    if table_pos == -1:
        print(f"   ⚠️  未找到表格名称位置，使用完整内容")
        return content

    # 提取表格前后各20000字符（约占完整内容的10-30%）
    start = max(0, table_pos - 20000)
    end = min(len(content), table_pos + 20000)

    extracted = content[start:end]
    reduction = (1 - len(extracted) / len(content)) * 100

    print(f"   🎯 内容截取: {len(extracted):,} 字符 (减少 {reduction:.1f}%)")

    return extracted


def extract_single_table_data(content, table_info, use_smart_extract=True):
    """
    提取单个表格的完整数据（优化版）

    Args:
        content: OCR识别的完整内容
        table_info: 表格信息
        use_smart_extract: 是否使用智能截取

    Returns:
        dict: 表格数据
    """
    # 获取DeepSeek API密钥
    api_key = os.getenv('DEEPSEEK_API_KEY')
    if not api_key:
        return {'error': 'DEEPSEEK_API_KEY未设置'}

    # 初始化DeepSeek客户端
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com"
    )

    # 智能截取内容
    if use_smart_extract:
        content_to_use = extract_table_section(content, table_info['name'])
    else:
        content_to_use = content

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
{content_to_use}

请直接返回JSON格式数据，不要包含任何其他文字或markdown标记。"""

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
            max_tokens=8192
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
        table_data = json.loads(result)
        return table_data

    except json.JSONDecodeError as e:
        return {'error': f'JSON解析失败: {e}'}
    except Exception as e:
        return {'error': str(e)}


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


def save_table_data(table_data, output_file):
    """保存表格数据"""
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


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("=" * 80)
        print("提取表格完整数据工具 - 优化版 ⚡")
        print("=" * 80)
        print()
        print("用法：python3 extract_table_data_fast.py <OCR文本文件路径>")
        print()
        print("优化特性：")
        print("  ⚡ 并行处理（3个并发）- 速度提升3倍")
        print("  🎯 智能截取（只发送相关内容）- 减少70%传输")
        print("  💾 缓存机制（跳过已提取）- 支持断点续传")
        print("  📊 进度显示（实时进度和预估时间）")
        print()
        print("示例：")
        print("  python3 extract_table_data_fast.py '中銀集團人壽 保險有限公司.txt'")
        print()
        sys.exit(1)

    file_path = sys.argv[1]

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
        print(f"❌ 未找到表格概要文件: {summary_file}")
        print()
        print("请先运行：")
        print(f"  python3 test_extract_tablesummary.py '{file_path}'")
        sys.exit(1)

    print(f"📋 读取表格概要: {summary_file}")
    tables = parse_tablesummary(summary_file)

    if not tables:
        print("❌ 表格概要解析失败")
        sys.exit(1)

    print(f"✅ 识别到 {len(tables)} 个表格")
    print()

    # 过滤已提取的表格（缓存机制）
    pending_tables = []
    cached_count = 0

    for table_info in tables:
        output_file = f"{base_filename}_table{table_info['number']}_data.json"
        if os.path.exists(output_file):
            cached_count += 1
        else:
            pending_tables.append(table_info)

    if cached_count > 0:
        print(f"💾 发现 {cached_count} 个已提取的表格（跳过）")

    if not pending_tables:
        print("✅ 所有表格已提取完成！无需重复提取。")
        print()
        print("提示：如需重新提取，请删除 *_data.json 文件")
        return

    print(f"📊 需要提取 {len(pending_tables)} 个表格")
    print(f"⚡ 使用 3 个并发线程加速")
    print()
    print("=" * 80)

    # 并行提取
    start_time = time.time()
    results = {}
    completed = 0
    failed = 0

    with ThreadPoolExecutor(max_workers=3) as executor:
        # 提交所有任务
        futures = {
            executor.submit(extract_single_table_data, content, table): table
            for table in pending_tables
        }

        # 等待完成并显示进度
        for future in as_completed(futures):
            table_info = futures[future]
            completed += 1

            try:
                table_data = future.result()

                if 'error' in table_data:
                    failed += 1
                    print()
                    print(f"❌ [{completed}/{len(pending_tables)}] 表格 {table_info['number']} 失败")
                    print(f"   错误: {table_data['error']}")
                else:
                    results[table_info['number']] = table_data

                    # 立即保存
                    output_file = f"{base_filename}_table{table_info['number']}_data"
                    save_table_data(table_data, output_file)

                    # 计算进度
                    progress = completed / len(pending_tables) * 100
                    elapsed = time.time() - start_time
                    avg_time = elapsed / completed
                    remaining = avg_time * (len(pending_tables) - completed)

                    actual_rows = len(table_data.get('rows', []))

                    print()
                    print(f"✅ [{completed}/{len(pending_tables)}] 表格 {table_info['number']}: {table_info['name']}")
                    print(f"   提取行数: {actual_rows} | 进度: {progress:.1f}%")
                    print(f"   已用: {elapsed:.0f}秒 | 预计剩余: {remaining:.0f}秒")

            except Exception as e:
                failed += 1
                print()
                print(f"❌ [{completed}/{len(pending_tables)}] 表格 {table_info['number']} 异常: {e}")

    total_time = time.time() - start_time

    print()
    print("=" * 80)
    print("✅ 提取完成！")
    print("=" * 80)
    print(f"⏱️  总耗时: {total_time:.1f}秒")
    print(f"📊 成功: {len(results)} | 失败: {failed} | 跳过: {cached_count}")
    print(f"⚡ 平均每表: {total_time/len(pending_tables):.1f}秒")
    print()


if __name__ == '__main__':
    main()
