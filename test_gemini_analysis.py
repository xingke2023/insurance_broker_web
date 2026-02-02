#!/usr/bin/env python3
"""
测试 Gemini 分析功能

使用方法：
python3 test_gemini_analysis.py
"""

import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.gemini_analysis_service import (
    extract_plan_data_from_text,
    analyze_insurance_table,
    extract_table_summary
)


def test_basic_info_extraction():
    """测试基本信息提取"""
    print("\n" + "="*80)
    print("测试1: 基本信息提取")
    print("="*80)

    sample_text = """
保险计划书

基本資料
擬受保人: 張三
性別: 男
年齡: 35歲

計劃詳情
基本計劃: 法國安盛盛利II至尊
保險公司: AXA安盛
名義金額: USD 50,000
投保時每年保費: USD 10,000
保費繳付年期: 5年
保障年期: 終身
"""

    print("\n📝 输入文本:")
    print("-"*80)
    print(sample_text)
    print("-"*80)

    result = extract_plan_data_from_text(sample_text)

    if result['success']:
        print("\n✅ 提取成功！")
        print("\n提取的数据:")
        import json
        print(json.dumps(result['data'], indent=2, ensure_ascii=False))
    else:
        print(f"\n❌ 提取失败: {result.get('error')}")


def test_table_analysis():
    """测试表格分析"""
    print("\n" + "="*80)
    print("测试2: 年度价值表分析")
    print("="*80)

    sample_table = """
<table>
<tr>
  <th>保單年度終結</th>
  <th>保證現金價值</th>
  <th>非保證現金價值</th>
  <th>總現金價值</th>
</tr>
<tr>
  <td>1</td>
  <td>5,000</td>
  <td>1,000</td>
  <td>6,000</td>
</tr>
<tr>
  <td>2</td>
  <td>10,500</td>
  <td>2,200</td>
  <td>12,700</td>
</tr>
<tr>
  <td>3</td>
  <td>16,200</td>
  <td>3,500</td>
  <td>19,700</td>
</tr>
<tr>
  <td>5</td>
  <td>28,500</td>
  <td>6,000</td>
  <td>34,500</td>
</tr>
<tr>
  <td>10</td>
  <td>62,000</td>
  <td>13,000</td>
  <td>75,000</td>
</tr>
</table>
"""

    print("\n📊 输入表格HTML:")
    print("-"*80)
    print(sample_table[:300] + "...")
    print("-"*80)

    result = analyze_insurance_table(sample_table)

    if result:
        print("\n✅ 分析成功！")
        print(f"\n提取到 {len(result.get('years', []))} 条记录:")
        import json
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("\n❌ 分析失败")


def test_table_summary():
    """测试表格概要提取"""
    print("\n" + "="*80)
    print("测试3: 表格概要提取")
    print("="*80)

    sample_content = """
保单年度终结价值表

<table>
<tr><th>保單年度終結</th><th>保證現金價值</th><th>非保證現金價值</th></tr>
<tr><td>1</td><td>5,000</td><td>1,000</td></tr>
<tr><td>2</td><td>10,500</td><td>2,200</td></tr>
</table>

无忧选退保价值表

<table>
<tr><th>保單年度終結</th><th>提取金額</th><th>累計提取</th></tr>
<tr><td>1</td><td>500</td><td>500</td></tr>
<tr><td>2</td><td>1,000</td><td>1,500</td></tr>
</table>
"""

    print("\n📋 输入内容:")
    print("-"*80)
    print(sample_content[:400] + "...")
    print("-"*80)

    result = extract_table_summary(sample_content)

    if result:
        print("\n✅ 提取成功！")
        print("\n表格概要:")
        print("-"*80)
        print(result)
        print("-"*80)
    else:
        print("\n❌ 提取失败")


def main():
    print("\n" + "="*80)
    print("🤖 Gemini 分析功能测试")
    print("="*80)

    # 检查API密钥
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("\n❌ 错误: GEMINI_API_KEY 环境变量未设置")
        print("请在 .env 文件中配置 API 密钥")
        return

    print(f"\n✅ API密钥已配置: {api_key[:20]}...")

    # 运行测试
    try:
        test_basic_info_extraction()
        test_table_analysis()
        test_table_summary()

        print("\n" + "="*80)
        print("✅ 所有测试完成！")
        print("="*80 + "\n")

    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
