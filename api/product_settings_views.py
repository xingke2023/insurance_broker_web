from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from django.contrib.auth.models import User
from .models import InsuranceProduct, UserProductSettings


@api_view(['GET'])
@authentication_classes([])  # 禁用认证
@permission_classes([AllowAny])  # 改为允许所有人访问
def get_all_products(request):
    """
    获取所有保险产品列表，按年期分组
    """
    try:
        # 获取所有启用的产品，按缴费年期和公司排序
        products = InsuranceProduct.objects.filter(is_active=True).select_related('company').order_by('payment_period', 'company__name', 'product_name')

        # 按年期分组
        products_by_period = {}
        for product in products:
            period = product.payment_period
            if period not in products_by_period:
                products_by_period[period] = []

            products_by_period[period].append({
                'id': product.id,
                'product_name': product.product_name,
                'company_name': product.company.name,
                'company_code': product.company.code,
                'payment_period': product.payment_period,
                'annual_premium': float(product.annual_premium),
            })

        # 转换为列表格式，按年期排序
        grouped_products = [
            {
                'payment_period': period,
                'products': products_list
            }
            for period, products_list in sorted(products_by_period.items())
        ]

        return Response({
            'status': 'success',
            'grouped_products': grouped_products
        })
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=500)


@api_view(['GET', 'POST'])
@authentication_classes([])  # 禁用自动认证，手动处理
@permission_classes([AllowAny])  # 改为允许所有人访问
def manage_user_product_settings(request):
    """
    管理用户的产品对比设置
    GET: 获取用户设置（未登录用户返回空列表）
    POST: 保存用户设置（需要登录）
    """
    try:
        # 对于 POST 请求，检查是否已登录
        if request.method == 'POST' and not request.user.is_authenticated:
            return Response({
                'status': 'error',
                'message': '保存设置需要登录'
            }, status=401)

        user = request.user

        if request.method == 'GET':
            # 获取用户设置
            # 如果用户未登录，返回空列表
            if not user.is_authenticated:
                return Response({
                    'status': 'success',
                    'selected_products': []
                })

            try:
                settings = UserProductSettings.objects.get(user=user)
                selected_products = settings.selected_product_ids or []
            except UserProductSettings.DoesNotExist:
                # 如果没有设置，返回空列表
                selected_products = []

            return Response({
                'status': 'success',
                'selected_products': selected_products
            })

        elif request.method == 'POST':
            # 保存用户设置
            selected_products = request.data.get('selected_products', [])

            # 更新或创建用户设置
            settings, created = UserProductSettings.objects.update_or_create(
                user=user,
                defaults={'selected_product_ids': selected_products}
            )

            return Response({
                'status': 'success',
                'message': '设置已保存'
            })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=500)
