"""
AI保险顾问视图
提供高级AI咨询服务的API端点
"""

import logging
from datetime import datetime, timedelta
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django.core.cache import cache
from django.db.models import Q

from .models import InsuranceProduct
from .ai_consultant_service import get_ai_consultant_service

logger = logging.getLogger(__name__)


class AIConsultationThrottle(AnonRateThrottle):
    """
    AI咨询请求频率限制（基于IP）
    - 每个IP每分钟最多3次请求
    - 每小时最多20次请求
    """
    rate = '3/min'  # 每分钟3次


class AIConsultationHourlyThrottle(AnonRateThrottle):
    """AI咨询小时级别的频率限制（基于IP）"""
    rate = '20/hour'  # 每小时20次


@api_view(['POST'])
@throttle_classes([AIConsultationThrottle, AIConsultationHourlyThrottle])
def ai_consult_view(request):
    """
    AI智能咨询接口（高级版）

    使用完整的产品匹配引擎和深度AI分析

    Request Body:
    {
        // 基本信息（必填）
        "age": 35,
        "gender": "男",
        "annual_income": 800000,

        // 人生阶段（必填）
        "life_stage": "责任高峰期",

        // 家庭状况（必填）
        "family_status": "已婚有子女",
        "has_children": true,
        "children_count": 2,
        "children_ages": [5, 8],  // 可选

        // 保险需求（必填）
        "main_concerns": ["子女教育", "家庭保障", "重疾保障"],
        "budget": 100000,

        // 可选字段
        "existing_coverage": {  // 现有保障
            "重疾": 500000,
            "寿险": 1000000
        },
        "assets": 2000000,  // 资产总额
        "liabilities": 500000,  // 负债总额
        "health_status": "健康",  // 健康/亚健康/有既往病史
        "has_chronic_disease": false,
        "occupation": "软件工程师",
        "risk_tolerance": "中等"  // 低/中等/高
    }

    Response:
    {
        "success": true,
        "data": {
            "customer_analysis": "客户需求深度分析...",
            "risk_assessment": "风险评估...",
            "coverage_gap": {
                "寿险": "缺口分析...",
                "重疾": "缺口分析...",
                "医疗": "缺口分析...",
                "意外": "缺口分析..."
            },
            "recommended_products": [
                {
                    "product_id": 1,
                    "product_name": "产品名称",
                    "company_name": "保险公司",
                    "annual_premium": 80000,
                    "reason": "推荐理由...",
                    "priority": 1,
                    "suitability_score": 92.5,
                    "coverage_highlights": ["亮点1", "亮点2"],
                    "estimated_coverage": "预估保障额度"
                }
            ],
            "alternative_products": [...],
            "professional_advice": "专业建议...",
            "budget_planning": {
                "recommended_total": 95000,
                "breakdown": {...},
                "budget_ratio": "11.9%",
                "payment_strategy": "缴费策略建议"
            },
            "warnings": ["注意事项1", "注意事项2", ...],
            "total_annual_premium": 95000,
            "total_coverage_amount": 15000000,
            "protection_plan": {
                "immediate_protection": "立即保障...",
                "medium_term_plan": "中期规划...",
                "long_term_plan": "长期规划..."
            },
            "matched_products_detail": [
                {
                    "product_id": 1,
                    "product_name": "产品名称",
                    "company_name": "保险公司",
                    "match_score": 92.5,
                    "age_match_score": 95.0,
                    "income_match_score": 90.0,
                    "need_match_score": 95.0,
                    "budget_match_score": 95.0,
                    "life_stage_match_score": 100.0
                }
            ]
        }
    }
    """
    try:
        # 验证必填字段
        required_fields = ['age', 'gender', 'annual_income', 'life_stage', 'family_status']
        missing_fields = [field for field in required_fields if field not in request.data]

        if missing_fields:
            return Response({
                'success': False,
                'error': f'缺少必填字段: {", ".join(missing_fields)}'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 验证年龄范围
        age = request.data.get('age')
        if not (18 <= age <= 100):
            return Response({
                'success': False,
                'error': '年龄必须在18-100岁之间'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 验证年收入
        annual_income = request.data.get('annual_income', 0)
        if annual_income < 0:
            return Response({
                'success': False,
                'error': '年收入不能为负数'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 获取客户信息
        customer_info = {
            'age': int(request.data.get('age')),
            'gender': request.data.get('gender'),
            'annual_income': float(request.data.get('annual_income')),
            'life_stage': request.data.get('life_stage'),
            'family_status': request.data.get('family_status'),
            'has_children': request.data.get('has_children', False),
            'children_count': int(request.data.get('children_count', 0)),
            'children_ages': request.data.get('children_ages', []),
            'main_concerns': request.data.get('main_concerns', []),
            'existing_coverage': request.data.get('existing_coverage', {}),
            'budget': float(request.data.get('budget', 0)),
            'assets': float(request.data.get('assets', 0)),
            'liabilities': float(request.data.get('liabilities', 0)),
            'health_status': request.data.get('health_status', '健康'),
            'has_chronic_disease': request.data.get('has_chronic_disease', False),
            'occupation': request.data.get('occupation', ''),
            'risk_tolerance': request.data.get('risk_tolerance', '中等'),
        }

        # 获取客户端IP（用于日志和缓存）
        client_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', 'unknown'))
        if ',' in client_ip:
            client_ip = client_ip.split(',')[0].strip()

        logger.info(f"客户端 {client_ip} 发起AI咨询，年龄: {customer_info['age']}, "
                   f"收入: {customer_info['annual_income']}, 阶段: {customer_info['life_stage']}")

        # 检查缓存（相同请求1小时内返回缓存结果）
        cache_key = f"ai_consult_{client_ip}_{hash(str(sorted(customer_info.items())))}"
        cached_result = cache.get(cache_key)

        if cached_result:
            logger.info(f"返回缓存的咨询结果 (cache_key: {cache_key})")
            return Response({
                'success': True,
                'data': cached_result,
                'cached': True
            })

        # 查询并筛选产品
        products_query = InsuranceProduct.objects.filter(is_active=True).select_related('company')

        # 预筛选：年龄范围（±10岁）
        age = customer_info['age']
        products_query = products_query.filter(
            Q(target_age_min__isnull=True) | Q(target_age_min__lte=age + 10),
            Q(target_age_max__isnull=True) | Q(target_age_max__gte=age - 10)
        )

        # 预筛选：收入范围（200%）
        annual_income = customer_info['annual_income']
        if annual_income > 0:
            products_query = products_query.filter(
                Q(min_annual_income__isnull=True) | Q(min_annual_income__lte=annual_income * 2.0)
            )

        # 预筛选：预算范围（200%）
        budget = customer_info['budget']
        if budget > 0:
            products_query = products_query.filter(annual_premium__lte=budget * 2.0)

        # 获取产品列表（最多50个）
        products = products_query[:50]

        if not products.exists():
            return Response({
                'success': False,
                'error': '未找到匹配的保险产品，请尝试调整筛选条件'
            }, status=status.HTTP_404_NOT_FOUND)

        logger.info(f"找到 {products.count()} 个匹配产品")

        # 格式化产品数据
        products_list = []
        for product in products:
            products_list.append({
                'id': product.id,
                'product_name': product.product_name,
                'company_name': product.company.name,
                'annual_premium': float(product.annual_premium),
                'payment_period': product.payment_period,
                'coverage_type': product.coverage_type or '',
                'target_age_min': product.target_age_min,
                'target_age_max': product.target_age_max,
                'target_life_stage': product.target_life_stage or '',
                'min_annual_income': float(product.min_annual_income) if product.min_annual_income else 0,
                'features': product.features or [],
                'description': product.description or '',
                'ai_recommendation_prompt': product.ai_recommendation_prompt or '',
                'plan_summary': product.plan_summary or '',
                'plan_details': product.plan_details or '',
            })

        # 调用AI顾问服务
        service = get_ai_consultant_service()
        result = service.consult(customer_info, products_list)

        # 缓存结果（1小时）
        cache.set(cache_key, result, 3600)

        logger.info(f"AI咨询完成，推荐 {len(result.get('recommended_products', []))} 个产品")

        # 记录咨询历史（可选：保存到数据库）
        # ConsultationHistory.objects.create(
        #     user=request.user,
        #     customer_info=customer_info,
        #     result=result
        # )

        return Response({
            'success': True,
            'data': result,
            'cached': False
        })

    except ValueError as e:
        logger.error(f"数据验证错误: {str(e)}")
        return Response({
            'success': False,
            'error': f'数据验证失败: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"AI咨询错误: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': '服务器内部错误，请稍后重试'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommended_products(request):
    """
    获取可推荐的产品列表

    支持筛选参数：
    - age: 年龄
    - annual_income: 年收入
    - budget: 预算
    - life_stage: 人生阶段
    - coverage_type: 保障类型
    - limit: 返回数量限制（默认20）

    Response:
    {
        "success": true,
        "count": 15,
        "products": [
            {
                "id": 1,
                "product_name": "产品名称",
                "company_name": "保险公司名称",
                "company_icon": "🏦",
                "annual_premium": 50000,
                "payment_period": 10,
                "total_premium": 500000,
                "coverage_type": "储蓄,重疾",
                "target_age_range": "25-45岁",
                "target_life_stage": "收入成长期,责任高峰期",
                "min_annual_income": 500000,
                "features": ["特点1", "特点2", "特点3"],
                "description": "产品描述...",
                "is_withdrawal": false,
                "created_at": "2024-01-01T00:00:00Z"
            }
        ]
    }
    """
    try:
        # 获取筛选参数
        age = request.query_params.get('age')
        annual_income = request.query_params.get('annual_income')
        budget = request.query_params.get('budget')
        life_stage = request.query_params.get('life_stage')
        coverage_type = request.query_params.get('coverage_type')
        limit = int(request.query_params.get('limit', 20))

        # 限制最大返回数量
        limit = min(limit, 50)

        # 基础查询
        products_query = InsuranceProduct.objects.filter(
            is_active=True
        ).select_related('company').order_by('sort_order', '-created_at')

        # 年龄筛选
        if age:
            try:
                age = int(age)
                products_query = products_query.filter(
                    Q(target_age_min__isnull=True) | Q(target_age_min__lte=age),
                    Q(target_age_max__isnull=True) | Q(target_age_max__gte=age)
                )
            except ValueError:
                pass

        # 收入筛选
        if annual_income:
            try:
                annual_income = float(annual_income)
                products_query = products_query.filter(
                    Q(min_annual_income__isnull=True) | Q(min_annual_income__lte=annual_income)
                )
            except ValueError:
                pass

        # 预算筛选
        if budget:
            try:
                budget = float(budget)
                products_query = products_query.filter(annual_premium__lte=budget * 1.2)
            except ValueError:
                pass

        # 人生阶段筛选
        if life_stage:
            products_query = products_query.filter(
                Q(target_life_stage__isnull=True) |
                Q(target_life_stage='') |
                Q(target_life_stage__icontains=life_stage)
            )

        # 保障类型筛选
        if coverage_type:
            products_query = products_query.filter(coverage_type__icontains=coverage_type)

        # 获取产品列表
        products = products_query[:limit]

        # 格式化返回数据
        products_data = []
        for product in products:
            # 格式化年龄范围
            if product.target_age_min and product.target_age_max:
                age_range = f"{product.target_age_min}-{product.target_age_max}岁"
            elif product.target_age_min:
                age_range = f"{product.target_age_min}岁以上"
            elif product.target_age_max:
                age_range = f"{product.target_age_max}岁以下"
            else:
                age_range = "不限"

            products_data.append({
                'id': product.id,
                'product_name': product.product_name,
                'company_name': product.company.name,
                'company_icon': product.company.icon or '🏦',
                'annual_premium': float(product.annual_premium),
                'payment_period': product.payment_period,
                'total_premium': float(product.annual_premium * product.payment_period),
                'coverage_type': product.coverage_type or '',
                'target_age_range': age_range,
                'target_life_stage': product.target_life_stage or '',
                'min_annual_income': float(product.min_annual_income) if product.min_annual_income else 0,
                'features': product.features or [],
                'description': product.description or '',
                'is_withdrawal': product.is_withdrawal,
                'created_at': product.created_at.isoformat(),
            })

        logger.info(f"返回 {len(products_data)} 个产品")

        return Response({
            'success': True,
            'count': len(products_data),
            'products': products_data
        })

    except Exception as e:
        logger.error(f"获取产品列表错误: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': '服务器内部错误'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_consultation_stats(request):
    """
    获取用户的咨询统计信息

    Response:
    {
        "success": true,
        "stats": {
            "total_consultations": 5,  // 总咨询次数
            "today_consultations": 2,  // 今日咨询次数
            "remaining_quota": 18,  // 今日剩余次数
            "last_consultation_time": "2024-01-01T10:00:00Z",
            "popular_concerns": [  // 常见关注点
                {"concern": "家庭保障", "count": 3},
                {"concern": "重疾保障", "count": 2}
            ]
        }
    }
    """
    try:
        user = request.user

        # 获取今日咨询次数（从缓存）
        today_key = f"ai_consult_count_{user.id}_{datetime.now().date()}"
        today_count = cache.get(today_key, 0)

        # 计算剩余配额（每小时20次）
        hour_key = f"ai_consult_hour_{user.id}_{datetime.now().strftime('%Y%m%d%H')}"
        hour_count = cache.get(hour_key, 0)
        remaining_quota = max(0, 20 - hour_count)

        # TODO: 如果需要，可以从数据库查询历史咨询记录
        # consultations = ConsultationHistory.objects.filter(user=user)
        # total_count = consultations.count()
        # last_consultation = consultations.order_by('-created_at').first()

        return Response({
            'success': True,
            'stats': {
                'total_consultations': 0,  # 需要实现历史记录功能
                'today_consultations': today_count,
                'remaining_quota': remaining_quota,
                'last_consultation_time': None,
                'popular_concerns': []
            }
        })

    except Exception as e:
        logger.error(f"获取统计信息错误: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': '服务器内部错误'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
