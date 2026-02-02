"""
AI智能咨询服务
使用Google Gemini AI分析客户需求并推荐合适的保险产品
"""

import os
import json
import logging
from google import genai
from google.genai import types
from django.conf import settings

logger = logging.getLogger(__name__)


class ConsultationService:
    """AI智能咨询服务类"""

    def __init__(self):
        """初始化Gemini客户端"""
        api_key = os.environ.get('GEMINI_API_KEY') or settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY未配置")

        self.client = genai.Client(api_key=api_key)
        self.model_name = 'gemini-2.0-flash-exp'  # 使用最新的Gemini模型

    def analyze_customer_needs(self, customer_info, available_products):
        """
        分析客户需求并推荐保险产品

        Args:
            customer_info (dict): 客户信息
                {
                    'age': int,  # 年龄
                    'gender': str,  # 性别
                    'annual_income': float,  # 年收入（港币）
                    'life_stage': str,  # 人生阶段
                    'family_status': str,  # 家庭状况
                    'has_children': bool,  # 是否有子女
                    'children_count': int,  # 子女数量
                    'main_concerns': list,  # 主要关注点
                    'budget': float,  # 预算（年缴保费）
                }
            available_products (list): 可用的保险产品列表
                [{
                    'id': int,
                    'product_name': str,
                    'company_name': str,
                    'coverage_type': str,
                    'target_age_min': int,
                    'target_age_max': int,
                    'target_life_stage': str,
                    'min_annual_income': float,
                    'annual_premium': float,
                    'payment_period': int,
                    'features': list,
                    'description': str,
                    'ai_recommendation_prompt': str,
                }, ...]

        Returns:
            dict: AI分析结果
                {
                    'analysis': str,  # 客户需求分析
                    'recommendations': [  # 推荐的产品列表（最多3个）
                        {
                            'product_id': int,
                            'product_name': str,
                            'company_name': str,
                            'reason': str,  # 推荐理由
                            'priority': int,  # 优先级（1-3）
                            'suitability_score': float,  # 适配度评分（0-100）
                        }
                    ],
                    'advice': str,  # 专业建议
                    'warnings': list,  # 注意事项
                }
        """
        try:
            # 构建提示词
            prompt = self._build_consultation_prompt(customer_info, available_products)

            # 调用Gemini API
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)]
                )]
            )

            # 解析响应
            result_text = response.text
            logger.info(f"Gemini API响应: {result_text[:500]}...")

            # 尝试解析JSON
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                # 如果不是标准JSON，尝试提取JSON部分
                import re
                json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    raise ValueError("无法解析AI响应为JSON格式")

            return result

        except Exception as e:
            logger.error(f"AI咨询服务错误: {str(e)}", exc_info=True)
            raise

    def _build_consultation_prompt(self, customer_info, available_products):
        """构建咨询提示词"""

        # 格式化产品信息
        products_info = []
        for idx, product in enumerate(available_products, 1):
            product_str = f"""
产品{idx}：
- ID: {product['id']}
- 产品名称: {product['product_name']}
- 保险公司: {product['company_name']}
- 保障类型: {product.get('coverage_type', '未指定')}
- 适合年龄: {product.get('target_age_min', '不限')}-{product.get('target_age_max', '不限')}岁
- 适合人生阶段: {product.get('target_life_stage', '不限')}
- 建议年收入: {product.get('min_annual_income', 0):,.0f} 港币以上
- 年缴保费: {product.get('annual_premium', 0):,.0f} 港币
- 缴费年期: {product.get('payment_period', 0)} 年
- 产品特点: {', '.join(product.get('features', []))}
- 产品描述: {product.get('description', '')}
"""
            if product.get('ai_recommendation_prompt'):
                product_str += f"- AI推荐参考: {product['ai_recommendation_prompt']}\n"

            products_info.append(product_str)

        products_text = '\n'.join(products_info)

        # 格式化客户信息
        customer_text = f"""
客户基本信息：
- 年龄: {customer_info.get('age', '未提供')} 岁
- 性别: {customer_info.get('gender', '未提供')}
- 年收入: {customer_info.get('annual_income', 0):,.0f} 港币
- 人生阶段: {customer_info.get('life_stage', '未提供')}
- 家庭状况: {customer_info.get('family_status', '未提供')}
- 是否有子女: {'是' if customer_info.get('has_children') else '否'}
"""
        if customer_info.get('has_children'):
            customer_text += f"- 子女数量: {customer_info.get('children_count', 0)} 人\n"

        if customer_info.get('main_concerns'):
            customer_text += f"- 主要关注: {', '.join(customer_info['main_concerns'])}\n"

        if customer_info.get('budget'):
            customer_text += f"- 年缴保费预算: {customer_info['budget']:,.0f} 港币\n"

        # 构建完整提示词
        prompt = f"""
你是一位专业的保险顾问，需要根据客户的个人情况，从以下保险产品中推荐最合适的方案。

{customer_text}

可选保险产品：
{products_text}

请分析客户的需求，并按以下JSON格式返回推荐结果（只返回JSON，不要有其他说明文字）：

{{
    "analysis": "对客户需求的详细分析（200-300字）",
    "recommendations": [
        {{
            "product_id": 产品ID,
            "product_name": "产品名称",
            "company_name": "保险公司名称",
            "reason": "推荐理由（150-200字，说明为什么这个产品适合客户）",
            "priority": 1,
            "suitability_score": 95.5
        }},
        // 最多推荐3个产品，按优先级排序
    ],
    "advice": "针对客户情况的专业建议（200-300字）",
    "warnings": [
        "注意事项1",
        "注意事项2",
        // 3-5个注意事项
    ]
}}

注意事项：
1. 必须严格按照上述JSON格式返回
2. recommendations数组按优先级排序，priority为1-3，1为最高优先级
3. suitability_score为适配度评分，范围0-100
4. 推荐产品时要考虑客户的年龄、收入、家庭状况、预算等因素
5. 分析要专业、详细、有针对性
6. 建议要实用、可行
7. 注意事项要提醒客户关注的重要点
8. 如果客户预算不足，可以建议调整缴费年期或选择较低保额的产品
9. 如果没有完全匹配的产品，选择最接近的产品并说明原因
"""

        return prompt


def get_consultation_service():
    """获取咨询服务实例"""
    return ConsultationService()
