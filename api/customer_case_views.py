"""
客户案例API视图
提供客户保险配置案例的查询接口
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import CustomerCase
from .serializers import CustomerCaseSerializer


class CustomerCasePagination(PageNumberPagination):
    """客户案例分页配置"""
    page_size = 10  # 每页默认10条
    page_size_query_param = 'page_size'  # 允许客户端自定义每页数量
    max_page_size = 500  # 最大每页500条（支持显示所有案例）


@api_view(['GET'])
@permission_classes([AllowAny])
def get_customer_cases(request):
    """
    获取客户案例列表

    查询参数:
        - tags: 标签筛选（可选，多个标签用逗号分隔，如：扶幼保障期,高收入）
        - category: 分类筛选（可选，如：基础认知、重疾保障、理财储蓄、理赔售后、港险问答等）
        - is_active: 是否启用（默认True）
        - search: 搜索关键词（标题、描述、家庭结构、保险需求）
        - page: 页码（默认1）
        - page_size: 每页数量（默认10，最大50）
        - ordering: 排序字段（默认: sort_order）

    返回:
        {
            "success": true,
            "data": {
                "count": 总数,
                "next": 下一页URL,
                "previous": 上一页URL,
                "results": [案例列表]
            }
        }
    """
    try:
        # 基础查询集（默认只返回启用的案例）
        is_active = request.query_params.get('is_active', 'true').lower() == 'true'
        queryset = CustomerCase.objects.filter(is_active=is_active)

        # 按分类筛选
        category = request.query_params.get('category')
        if category:
            # 支持多分类筛选（用逗号分隔）
            if ',' in category:
                categories = [c.strip() for c in category.split(',') if c.strip()]
                queryset = queryset.filter(category__in=categories)
            else:
                queryset = queryset.filter(category=category)

        # 按标签筛选（支持多标签，用逗号分隔）
        tags_param = request.query_params.get('tags')
        if tags_param:
            # 分割标签
            tag_list = [tag.strip() for tag in tags_param.split(',') if tag.strip()]
            # 筛选包含任一标签的案例
            for tag in tag_list:
                queryset = queryset.filter(tags__contains=tag)

        # 搜索功能
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(case_description__icontains=search) |
                Q(family_structure__icontains=search) |
                Q(insurance_needs__icontains=search)
            )

        # 排序（默认按创建时间倒序，最新的在最上面）
        ordering = request.query_params.get('ordering', '-id')
        if ordering:
            # 支持多字段排序，用逗号分隔
            ordering_fields = [field.strip() for field in ordering.split(',')]
            queryset = queryset.order_by(*ordering_fields)

        # 分页
        paginator = CustomerCasePagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)

        # 序列化
        serializer = CustomerCaseSerializer(paginated_queryset, many=True)

        # 返回分页结果
        return Response({
            'success': True,
            'data': {
                'count': queryset.count(),
                'next': paginator.get_next_link(),
                'previous': paginator.get_previous_link(),
                'results': serializer.data
            }
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'message': '获取客户案例列表失败'
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_customer_case_detail(request, case_id):
    """
    获取单个客户案例详情

    路径参数:
        - case_id: 案例ID

    返回:
        {
            "success": true,
            "data": {案例详细信息}
        }
    """
    try:
        # 获取案例（只返回启用的案例）
        case = get_object_or_404(CustomerCase, id=case_id, is_active=True)

        # 序列化
        serializer = CustomerCaseSerializer(case)

        return Response({
            'success': True,
            'data': serializer.data
        })

    except CustomerCase.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Case not found',
            'message': f'未找到ID为{case_id}的案例，或该案例未启用'
        }, status=404)

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'message': '获取客户案例详情失败'
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_cases_by_tag(request, tag):
    """
    按标签获取客户案例列表

    路径参数:
        - tag: 标签名称（如：扶幼保障期、高收入、海外资产配置等）

    查询参数:
        - page: 页码（默认1）
        - page_size: 每页数量（默认10，最大50）

    返回:
        {
            "success": true,
            "data": {
                "tag": "标签名称",
                "count": 总数,
                "cases": [案例列表]
            }
        }
    """
    try:
        # 查询包含该标签的所有启用案例
        queryset = CustomerCase.objects.filter(
            tags__contains=tag,
            is_active=True
        ).order_by('sort_order', 'id')

        # 分页
        paginator = CustomerCasePagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)

        # 序列化
        serializer = CustomerCaseSerializer(paginated_queryset, many=True)

        # 返回结果
        return Response({
            'success': True,
            'data': {
                'tag': tag,
                'count': queryset.count(),
                'cases': serializer.data
            }
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'message': f'获取标签"{tag}"的案例失败'
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_tags(request):
    """
    获取所有使用过的标签及其统计

    返回:
        {
            "success": true,
            "data": {
                "tags": [
                    {
                        "name": "扶幼保障期",
                        "count": 案例数量
                    },
                    ...
                ]
            }
        }
    """
    try:
        # 获取所有启用的案例
        cases = CustomerCase.objects.filter(is_active=True)

        # 统计所有标签
        tag_counts = {}
        for case in cases:
            if case.tags:
                for tag in case.tags:
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1

        # 转换为列表并按计数排序
        tag_list = [
            {'name': tag, 'count': count}
            for tag, count in tag_counts.items()
        ]
        tag_list.sort(key=lambda x: x['count'], reverse=True)

        return Response({
            'success': True,
            'data': {
                'tags': tag_list,
                'total': len(tag_list)
            }
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'message': '获取标签列表失败'
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_case_statistics(request):
    """
    获取客户案例统计信息

    返回:
        {
            "success": true,
            "data": {
                "total_cases": 总案例数,
                "active_cases": 启用案例数,
                "total_tags": 标签总数,
                "by_tag": {
                    "扶幼保障期": 数量,
                    "高收入": 数量,
                    ...
                },
                "avg_income": 平均年收入,
                "avg_premium": 平均年缴保费
            }
        }
    """
    try:
        from django.db.models import Avg

        # 总案例数
        total_cases = CustomerCase.objects.count()
        active_cases = CustomerCase.objects.filter(is_active=True).count()

        # 按标签统计
        cases = CustomerCase.objects.filter(is_active=True)
        tag_counts = {}
        for case in cases:
            if case.tags:
                for tag in case.tags:
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1

        # 平均值统计（只统计启用的案例）
        stats = cases.aggregate(
            avg_income=Avg('annual_income'),
            avg_premium=Avg('total_annual_premium')
        )

        return Response({
            'success': True,
            'data': {
                'total_cases': total_cases,
                'active_cases': active_cases,
                'total_tags': len(tag_counts),
                'by_tag': tag_counts,
                'avg_income': round(float(stats['avg_income']) if stats['avg_income'] else 0, 2),
                'avg_premium': round(float(stats['avg_premium']) if stats['avg_premium'] else 0, 2)
            }
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'message': '获取统计信息失败'
        }, status=500)
