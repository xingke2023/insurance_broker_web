"""
Gemini AI 分析服务
使用 Google Gemini 3 Flash Preview 替代 DeepSeek API
用于保险计划书的数据提取和分析
"""

import os
import json
import logging
from google import genai
from google.genai import types

# 导入fallback支持函数
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from gemini_service import call_gemini_with_fallback

logger = logging.getLogger(__name__)


def extract_plan_data_from_text(text_content):
    """
    使用 Gemini API 从 PDF 文本中提取结构化数据

    Args:
        text_content: OCR识别的文本内容

    Returns:
        dict: {
            'success': True/False,
            'data': {...提取的结构化数据},
            'error': '错误信息（如果失败）'
        }
    """
    try:
        # 构建提示词
        prompt = f"""
请分析以下保险计划书内容，提取关键信息并以JSON格式返回。

需要提取的字段：
- insured_name: 擬受保人（被保人姓名）
- insured_age: 擬受保人年龄（数字）
- insured_gender: 擬受保人性别（男/女）
- insurance_product: 保险产品名称（基本計劃）
- insurance_company: 保险公司名称
- sum_assured: 名義金額（保额）（数字）
- annual_premium: 投保時每年保费（数字）
- payment_years: 保費繳付年期（如：20年、终身等）
- insurance_period: 保障至年齡、保障年期（如：终身、至70岁等）

注意事项：
1. 投保時每年總保費可能会有折扣，这只是第一年的折扣，请提取投保時每年保费的原始金额作为annual_premium
2. 如果某个字段无法从文本中提取，请设置为null
3. 直接返回JSON，不要包含markdown代码块标记

计划书内容：
{text_content[:4000]}

请直接返回纯JSON格式，不要包含```json等标记。
"""

        logger.info("🤖 开始调用 Gemini API 提取基本信息...")

        # 使用支持fallback的API调用
        response = call_gemini_with_fallback(
            model='gemini-2.0-flash-exp',
            contents=[types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )],
            operation_name="提取基本信息"
        )

        # 获取响应内容
        content = response.text.strip()
        logger.info(f"📥 Gemini 返回内容长度: {len(content)} 字符")

        # 清理可能的markdown标记
        if content.startswith('```json'):
            content = content[7:]
        if content.startswith('```'):
            content = content[3:]
        if content.endswith('```'):
            content = content[:-3]
        content = content.strip()

        # 解析JSON
        extracted_data = json.loads(content)
        logger.info(f"✅ 基本信息提取成功")

        return {
            'success': True,
            'data': extracted_data,
            'raw_response': response.text
        }

    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON解析失败: {str(e)}")
        return {
            'success': False,
            'error': f'JSON解析失败: {str(e)}',
            'raw_response': content if 'content' in locals() else None
        }
    except Exception as e:
        logger.error(f"❌ Gemini API调用失败: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            'success': False,
            'error': f'API调用失败: {str(e)}'
        }


def analyze_insurance_table(table_html):
    """
    使用 Gemini API 分析保险表格，提取年度价值数据

    Args:
        table_html: 表格的HTML源代码

    Returns:
        dict: {
            "years": [
                {
                    "policy_year": 1,
                    "guaranteed_cash_value": 1000.00,
                    "total": 1500.00
                },
                ...
            ]
        }
        如果失败返回 None
    """
    try:
        # 构建提示词
        prompt = f"""
请分析以下保险计划书的表格HTML代码，提取保单年度价值数据。

要求提取的字段：
1. 保單年度終結 (policy_year) - 文本（可能是数字，也可能是年龄如"65歲"）
2. 保證現金價值 或 保證金額 (guaranteed_cash_value) - 数字（整数或小数）
3. 退保價值總額 或 總現金價值 (total) - 数字（整数或小数）

注意事项：
- 提取表格中所有行的数据
- 按年度顺序排列
- 如果某个值不存在或无法识别，使用 null
- 数字中的逗号分隔符要去除（如 "10,000" → 10000）
- 直接返回纯JSON格式，不要包含markdown代码块标记

输出格式：
{{
    "years": [
        {{
            "policy_year": "1",
            "guaranteed_cash_value": 1000.00,
            "total": 1500.00
        }},
        {{
            "policy_year": "65歲",
            "guaranteed_cash_value": 2100.00,
            "total": 3150.00
        }}
    ]
}}

表格HTML代码：
{table_html}

请直接返回纯JSON格式。
"""

        logger.info("⏳ 开始调用 Gemini API 分析年度价值表")
        logger.info(f"📤 发送内容长度: {len(table_html)} 字符")

        import time
        start_time = time.time()

        # 使用支持fallback的API调用
        response = call_gemini_with_fallback(
            model='gemini-2.0-flash-exp',
            contents=[types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )],
            operation_name="分析年度价值表"
        )

        elapsed_time = time.time() - start_time
        logger.info(f"⏱️ API调用耗时: {elapsed_time:.2f} 秒")

        # 获取响应内容
        content = response.text.strip()
        logger.info(f"📥 Gemini API 返回内容长度: {len(content)} 字符")
        logger.info(f"📥 返回内容预览: {content[:300]}...")

        # 清理markdown标记
        if content.startswith('```json'):
            content = content[7:]
        if content.startswith('```'):
            content = content[3:]
        if content.endswith('```'):
            content = content[:-3]
        content = content.strip()

        # 解析JSON
        table_data = json.loads(content)
        logger.info(f"✅ 成功解析年度价值表，共 {len(table_data.get('years', []))} 条记录")
        return table_data

    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON解析失败: {e}")
        logger.error(f"原始内容长度: {len(content) if 'content' in locals() else 0}")
        logger.error(f"原始内容(最后500字符): ...{content[-500:] if 'content' in locals() else 'N/A'}")
        return None
    except Exception as e:
        logger.error(f"❌ 调用 Gemini API 时发生错误:")
        logger.error(f"错误类型: {type(e).__name__}")
        logger.error(f"错误信息: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None


def extract_table_summary(ocr_content):
    """
    使用 Gemini API 提取表格概要

    Args:
        ocr_content: OCR识别的文本内容

    Returns:
        str: 表格概要文本，格式如下：
        1. 保单年度终结价值表
           表名：保单年度终结价值表
           行数：30行
           基本字段：保单年度终结、保证现金价值、非保证现金价值、总现金价值

        2. 无忧选退保价值表
           ...
    """
    try:
        prompt = f"""
请分析以下保险计划书内容，识别其中的所有表格并生成概要。

对于每个表格，请提取：
1. 表名（表格的标题或主题）
2. 行数（数据行的数量，不包括表头）
3. 基本字段（表格的列名，用逗号分隔）

输出格式：
1. 表格1标题
   表名：XXX
   行数：XX行
   基本字段：字段1、字段2、字段3

2. 表格2标题
   表名：YYY
   行数：YY行
   基本字段：字段1、字段2

注意：
- 只分析包含数据的表格，忽略纯文本内容
- 按表格在文档中的顺序排列
- 表名要准确反映表格内容

文档内容：
{ocr_content[:8000]}

请返回纯文本格式的表格概要。
"""

        logger.info("🤖 开始调用 Gemini API 提取表格概要...")

        response = call_gemini_with_fallback(
            model='gemini-2.0-flash-exp',
            contents=[types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )],
            operation_name="提取表格概要"
        )

        summary = response.text.strip()
        logger.info(f"✅ 表格概要提取成功，长度: {len(summary)} 字符")
        return summary

    except Exception as e:
        logger.error(f"❌ 提取表格概要失败: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return ""


def extract_plan_summary(ocr_content, table1_data=None, annual_premium=None, payment_years=None, table2_data=None, insured_age=None):
    """
    使用 Gemini 提取计划书概要（纯文本Markdown格式）

    Args:
        ocr_content: OCR识别的文本内容
        table1_data: 退保价值表数据（dict）
        annual_premium: 年保费
        payment_years: 缴费年期
        table2_data: 无忧选退保价值表（dict）
        insured_age: 被保人当前年龄

    Returns:
        str: Markdown格式的计划书概要
    """
    try:
        # 构建上下文信息
        context = ""
        if table1_data and annual_premium and payment_years:
            context += f"\n\n## 退保价值表数据\n年保费: {annual_premium}\n缴费年期: {payment_years}\n"
            context += f"数据条数: {len(table1_data.get('years', []))}\n"

        if table2_data:
            context += f"\n## 无忧选退保价值表数据\n数据条数: {len(table2_data.get('years', []))}\n"

        if insured_age:
            context += f"\n被保人年龄: {insured_age}\n"

        prompt = f"""
请根据以下保险计划书内容生成一份简洁的计划书概要（Markdown格式）。

概要应包含以下部分：
1. **产品信息**：产品名称、保险公司
2. **被保人信息**：年龄、性别
3. **保障内容**：保额、保障期限
4. **保费信息**：年保费、缴费年期、总保费
5. **主要特点**：3-5个要点

要求：
- 使用Markdown格式
- 简洁明了，突出重点
- 不要包含表格
- 每个部分用二级标题（##）

{context}

文档内容：
{ocr_content[:6000]}

请返回Markdown格式的概要。
"""

        logger.info("🤖 开始调用 Gemini API 提取计划书概要...")

        response = call_gemini_with_fallback(
            model='gemini-2.0-flash-exp',
            contents=[types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )],
            operation_name="提取计划书概要"
        )

        summary = response.text.strip()
        logger.info(f"✅ 计划书概要提取成功，长度: {len(summary)} 字符")
        return summary

    except Exception as e:
        logger.error(f"❌ 提取计划书概要失败: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return "概要提取失败"


def check_wellness_table_exists(table_summary):
    """
    使用 Gemini 判断是否存在包含"入息"/"提取"/"无忧选"字段的表格

    Args:
        table_summary: 表格概要文本

    Returns:
        bool: True表示存在，False表示不存在
    """
    try:
        prompt = f"""
请判断以下表格概要中，是否存在包含"入息"、"提取"或"无忧选"字段的表格。

判断规则：
- 查找表格的"基本字段"列表
- 如果字段中包含"入息"、"提取"、"无忧选"等关键词，返回 true
- 否则返回 false

表格概要：
{table_summary}

请只返回 true 或 false，不要其他内容。
"""

        response = call_gemini_with_fallback(
            model='gemini-2.0-flash-exp',
            contents=[types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )],
            operation_name="判断无忧选表格存在"
        )

        result = response.text.strip().lower()
        exists = result == 'true'
        logger.info(f"📋 无忧选表格存在判断: {exists}")
        return exists

    except Exception as e:
        logger.error(f"❌ 判断失败: {str(e)}")
        return False


def extract_surrender_value_table(tablecontent):
    """
    使用 Gemini 提取退保价值表（基本计划表）

    Args:
        tablecontent: 表格源代码内容（包含所有<table>标签）

    Returns:
        str: 退保价值表的JSON格式数据（字符串）
        如果失败返回空字符串
    """
    try:
        # 构建提示词
        prompt = f"""
请分析以下HTML表格内容，找到并返回退保价值表的数据。

## 任务要求：

1. **识别所有包含"保单年度终结"的表格**
   - 统计每个表格的名称和行数
   - 有些表格可能会跨页，但属于同一个逻辑表格

2. **选择正确的退保价值表**
   - 排除条件：
     * 不是"悲观"或"乐观"或"不同投资回报"
     * 不是"身故赔偿"表
   - 选择条件（优先级从高到低）：
     * 如果是退保表：优先选择"提取"表，如果没有就选"退保"表
     * 连续保单年度终结数据（所有保单年度），不是抽样年份展示
     * 跨页总行数较多的表格

3. **返回格式**
   - 返回选中表格的所有行数据
   - JSON格式，包含字段：
     * table_name: 表格名称
     * row_count: 总行数
     * data: 数组，每行一个对象，包含所有列的数据

4. **注意事项**
   - 保留所有列的原始字段名
   - 数字去除逗号分隔符
   - 如果某个值为空或"-"，使用null

## 返回格式示例：
{{
  "table_name": "退保价值表",
  "row_count": 30,
  "data": [
    {{"保单年度终结": "1", "保证现金价值": 5000, "非保证现金价值": 1000, "总现金价值": 6000}},
    {{"保单年度终结": "2", "保证现金价值": 10500, "非保证现金价值": 2200, "总现金价值": 12700}}
  ]
}}

## 表格HTML内容：
{tablecontent[:200000]}

请直接返回JSON格式，不要包含markdown代码块标记。
"""

        logger.info("🔍 开始调用 Gemini API 提取退保价值表...")
        logger.info(f"📤 发送内容长度: {len(tablecontent)} 字符")

        import time
        start_time = time.time()

        # 调用 Gemini API
        response = call_gemini_with_fallback(
            model='gemini-2.0-flash-exp',
            contents=[types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )],
            operation_name="提取退保价值表"
        )

        elapsed_time = time.time() - start_time
        logger.info(f"⏱️ API调用耗时: {elapsed_time:.2f} 秒")

        # 获取响应内容
        content = response.text.strip()
        logger.info(f"📥 Gemini API 返回内容长度: {len(content)} 字符")
        logger.info(f"📥 返回内容预览: {content[:300]}...")

        # 清理markdown标记
        if content.startswith('```json'):
            content = content[7:]
        if content.startswith('```'):
            content = content[3:]
        if content.endswith('```'):
            content = content[:-3]
        content = content.strip()

        # 验证JSON格式
        table_data = json.loads(content)
        logger.info(f"✅ 成功提取退保价值表: {table_data.get('table_name')}")
        logger.info(f"📊 表格行数: {table_data.get('row_count')}")
        logger.info(f"📊 数据条数: {len(table_data.get('data', []))}")

        # 返回JSON字符串
        return json.dumps(table_data, ensure_ascii=False, indent=2)

    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON解析失败: {e}")
        logger.error(f"原始内容长度: {len(content) if 'content' in locals() else 0}")
        logger.error(f"原始内容(最后500字符): ...{content[-500:] if 'content' in locals() else 'N/A'}")
        return ""
    except Exception as e:
        logger.error(f"❌ 提取退保价值表失败:")
        logger.error(f"错误类型: {type(e).__name__}")
        logger.error(f"错误信息: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return ""
