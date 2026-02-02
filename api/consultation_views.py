"""
AI智能咨询API视图
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.models import Q

from .models import InsuranceProduct
from .consultation_service import get_consultation_service

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_ai_consultation(request):
    """
    AI智能咨询接口

    接收客户信息，返回AI推荐的保险方案

    Request Body:
        {
            "age": 35,
            "gender": "男",
            "annual_income": 800000,
            "life_stage": "责任高峰期",
            "family_status": "已婚",
            "has_children": true,
            "children_count": 2,
            "main_concerns": ["子女教育", "家庭保障", "退休规划"],
            "budget": 50000
        }

    Response:
        {
            "success": true,
            "data": {
                "analysis": "...",
                "recommendations": [...],
                "advice": "...",
                "warnings": [...]
            }
        }
    """
    try:
        # 获取客户信息
        customer_info = {
            'age': request.data.get('age'),
            'gender': request.data.get('gender'),
            'annual_income': request.data.get('annual_income', 0),
            'life_stage': request.data.get('life_stage', ''),
            'family_status': request.data.get('family_status', ''),
            'has_children': request.data.get('has_children', False),
            'children_count': request.data.get('children_count', 0),
            'main_concerns': request.data.get('main_concerns', []),
            'budget': request.data.get('budget', 0),
        }

        # 验证必填字段
        if not customer_info['age']:
            return Response({
                'success': False,
                'error': '年龄为必填项'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 查询匹配的产品
        # 基本筛选条件：启用的产品
        products_query = InsuranceProduct.objects.filter(is_active=True)

        # 年龄筛选（扩大范围，前后各5岁）
        age = customer_info['age']
        products_query = products_query.filter(
            Q(target_age_min__isnull=True) | Q(target_age_min__lte=age + 5),
            Q(target_age_max__isnull=True) | Q(target_age_max__gte=age - 5)
        )

        # 收入筛选（选择收入要求不高于客户收入的120%的产品）
        annual_income = customer_info['annual_income']
        if annual_income > 0:
            products_query = products_query.filter(
                Q(min_annual_income__isnull=True) | Q(min_annual_income__lte=annual_income * 1.2)
            )

        # 人生阶段筛选（如果产品指定了人生阶段）
        life_stage = customer_info['life_stage']
        if life_stage:
            products_query = products_query.filter(
                Q(target_life_stage__isnull=True) |
                Q(target_life_stage='') |
                Q(target_life_stage__icontains=life_stage)
            )

        # 预算筛选（选择年缴保费不超过预算150%的产品）
        budget = customer_info['budget']
        if budget > 0:
            products_query = products_query.filter(annual_premium__lte=budget * 1.5)

        # 获取产品列表
        products = products_query.select_related('company')[:20]  # 最多选20个产品

        if not products.exists():
            return Response({
                'success': False,
                'error': '暂无匹配的保险产品，请调整筛选条件'
            }, status=status.HTTP_404_NOT_FOUND)

        # 格式化产品数据
        available_products = []
        for product in products:
            available_products.append({
                'id': product.id,
                'product_name': product.product_name,
                'company_name': product.company.name,
                'coverage_type': product.coverage_type,
                'target_age_min': product.target_age_min,
                'target_age_max': product.target_age_max,
                'target_life_stage': product.target_life_stage,
                'min_annual_income': float(product.min_annual_income) if product.min_annual_income else 0,
                'annual_premium': float(product.annual_premium),
                'payment_period': product.payment_period,
                'features': product.features,
                'description': product.description,
                'ai_recommendation_prompt': product.ai_recommendation_prompt,
            })

        # 调用AI服务
        consultation_service = get_consultation_service()
        result = consultation_service.analyze_customer_needs(customer_info, available_products)

        # 返回结果
        return Response({
            'success': True,
            'data': result
        })

    except Exception as e:
        logger.error(f"AI咨询错误: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_customer_cases(request):
    """
    获取客户案例展示数据（从数据库读取）

    返回不同人生阶段的保险配置案例

    Response:
        {
            "success": true,
            "cases": [
                {
                    "life_stage": "扶幼保障期",  # 使用第一个标签作为主标签
                    "age_range": "25-30岁",
                    "description": "...",
                    "example_profile": {...},
                    "recommended_products": [...],
                    "key_points": [...],
                    "all_tags": ["扶幼保障期", "中产家庭", ...]  # 所有标签
                },
                ...
            ]
        }
    """
    try:
        from .models import CustomerCase

        # 从数据库获取所有启用的案例，按排序字段排序
        db_cases = CustomerCase.objects.filter(is_active=True).order_by('sort_order', 'id')

        # 获取所有案例
        cases = []
        for case in db_cases:
            # 解析家庭结构，提取家庭状态和子女信息
            has_children = '子女' in case.family_structure or '孩子' in case.family_structure
            children_count = 0
            if has_children:
                # 尝试从家庭结构中提取子女数量
                import re
                match = re.search(r'(\d+)\s*[个人]?\s*子女', case.family_structure)
                if match:
                    children_count = int(match.group(1))

            # 确定婚姻状况
            if '已婚' in case.family_structure:
                family_status = '已婚'
            elif '单身' in case.family_structure or '未婚' in case.family_structure:
                family_status = '单身'
            else:
                family_status = case.family_structure.split('，')[0] if '，' in case.family_structure else '已婚'

            # 从保险需求中提取关注点
            main_concerns = []
            if case.insurance_needs:
                # 简单提取关键词
                concern_keywords = ['教育', '医疗', '重疾', '养老', '退休', '保障', '储蓄', '财富', '传承', '意外', '寿险']
                for keyword in concern_keywords:
                    if keyword in case.insurance_needs:
                        main_concerns.append(keyword + ('保障' if keyword not in ['教育', '养老', '退休', '储蓄', '财富', '传承'] else '规划'))

            if not main_concerns:
                main_concerns = ['保险规划']

            # 获取年龄范围（从第一个标签推断，如果有人生阶段标签）
            age_ranges = {
                '扶幼保障期': '25-30岁',
                '收入成长期': '31-40岁',
                '责任高峰期': '41-50岁',
                '责任递减期': '51-60岁',
                '退休期': '60岁以上'
            }

            # 使用第一个标签作为主标签（life_stage）
            life_stage = case.tags[0] if case.tags else '综合案例'
            age_range = age_ranges.get(life_stage, f'{case.customer_age}岁')

            # 构建案例数据
            case_data = {
                "id": case.id,  # 添加案例ID
                "title": case.title,  # 添加案例标题
                "life_stage": life_stage,
                "age_range": age_range,
                "description": case.case_description[:200] + '...' if len(case.case_description) > 200 else case.case_description,
                "example_profile": {
                    "age": case.customer_age,
                    "annual_income": int(case.annual_income),
                    "family_status": family_status,
                    "has_children": has_children,
                    "children_count": children_count,
                    "main_concerns": main_concerns[:5]  # 最多5个关注点
                },
                "key_points": case.key_points if case.key_points else [],
                "budget_suggestion": case.budget_suggestion if case.budget_suggestion else f'年缴保费: {int(case.total_annual_premium):,} 港币',
                "all_tags": case.tags  # 添加所有标签
            }

            cases.append(case_data)

        # 如果数据库没有数据，返回默认的静态数据
        if not cases:
            cases = [
                {
                    "life_stage": "扶幼保障期",
                    "age_range": "25-30岁",
                    "description": "刚步入职场或成家不久，收入较低但需要基础保障。重点是高杠杆的保障型产品。",
                    "example_profile": {
                        "age": 28,
                        "annual_income": 500000,
                        "family_status": "已婚",
                        "has_children": False,
                        "main_concerns": ["意外保障", "医疗保障", "家庭责任"]
                    },
                    "key_points": [
                        "保障为主，储蓄为辅",
                        "选择高杠杆的定期寿险",
                        "意外险和医疗险必不可少"
                    ],
                    "budget_suggestion": "年缴保费: 25,000-50,000 港币",
                    "all_tags": ["扶幼保障期"]
                }
            ]

        return Response({
            'success': True,
            'cases': cases
        })

    except Exception as e:
        logger.error(f"获取客户案例错误: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
