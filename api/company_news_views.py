"""
公司新闻与宣传材料 API 视图
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import F
from .models import CompanyNews
from .serializers import CompanyNewsSerializer


class CompanyNewsViewSet(viewsets.ModelViewSet):
    """
    公司新闻与宣传材料视图集

    提供CRUD操作和自定义查询功能
    """
    queryset = CompanyNews.objects.all()
    serializer_class = CompanyNewsSerializer
    permission_classes = [AllowAny]  # 允许公开访问（新闻是公开信息）

    def get_queryset(self):
        """
        自定义查询集，支持按公司、内容类型、是否精选筛选
        """
        queryset = CompanyNews.objects.filter(is_active=True).select_related('company')

        # 按公司筛选
        company_id = self.request.query_params.get('company', None)
        if company_id:
            queryset = queryset.filter(company_id=company_id)

        # 按内容类型筛选
        content_type = self.request.query_params.get('content_type', None)
        if content_type:
            queryset = queryset.filter(content_type=content_type)

        # 只显示精选
        is_featured = self.request.query_params.get('is_featured', None)
        if is_featured == 'true':
            queryset = queryset.filter(is_featured=True)

        return queryset.order_by('-is_featured', 'sort_order', '-published_date')

    @action(detail=True, methods=['post'])
    def increment_view(self, request, pk=None):
        """
        增加浏览次数

        POST /api/company-news/{id}/increment-view/
        """
        news = self.get_object()
        news.view_count = F('view_count') + 1
        news.save(update_fields=['view_count'])
        news.refresh_from_db()

        serializer = self.get_serializer(news)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """
        获取所有精选新闻

        GET /api/company-news/featured/
        """
        featured_news = CompanyNews.objects.filter(
            is_active=True,
            is_featured=True
        ).select_related('company').order_by('sort_order', '-published_date')

        serializer = self.get_serializer(featured_news, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_company(self, request):
        """
        按公司分组获取新闻

        GET /api/company-news/by-company/?company={company_id}&limit={limit}
        """
        company_id = request.query_params.get('company')
        limit = int(request.query_params.get('limit', 10))

        if not company_id:
            return Response(
                {'error': '缺少company参数'},
                status=status.HTTP_400_BAD_REQUEST
            )

        news = CompanyNews.objects.filter(
            company_id=company_id,
            is_active=True
        ).select_related('company').order_by('-is_featured', 'sort_order', '-published_date')[:limit]

        serializer = self.get_serializer(news, many=True)
        return Response(serializer.data)
