"""
保险公司信息爬虫API视图
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from .insurance_scraper_service import get_scraper_service
from .models import InsuranceCompany, InsuranceProduct


@api_view(['POST'])
@permission_classes([IsAdminUser])
def scrape_company_news(request):
    """
    抓取指定公司的新闻

    POST /api/scraper/company-news/
    Body: {
        "company_id": 1  // 可选，不传则抓取所有公司
    }
    """
    try:
        company_id = request.data.get('company_id')

        if company_id:
            # 抓取单个公司
            try:
                company = InsuranceCompany.objects.get(id=company_id)
            except InsuranceCompany.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': '公司不存在'
                }, status=status.HTTP_404_NOT_FOUND)

            if not company.website_url:
                return Response({
                    'status': 'error',
                    'message': '该公司没有配置官网URL'
                }, status=status.HTTP_400_BAD_REQUEST)

            result = get_scraper_service().scrape_company_news(
                company_id=company.id,
                company_name=company.name,
                company_url=company.website_url
            )

            return Response({
                'status': 'success',
                'data': result
            })

        else:
            # 抓取所有公司
            result = get_scraper_service().scrape_all_companies()

            return Response({
                'status': 'success',
                'data': result
            })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def scrape_product_promotions(request):
    """
    抓取指定产品的推广信息

    POST /api/scraper/product-promotions/
    Body: {
        "product_id": 1,  // 必填
    }
    """
    try:
        product_id = request.data.get('product_id')

        if not product_id:
            return Response({
                'status': 'error',
                'message': '请提供产品ID'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = InsuranceProduct.objects.get(id=product_id)
        except InsuranceProduct.DoesNotExist:
            return Response({
                'status': 'error',
                'message': '产品不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        if not product.url:
            return Response({
                'status': 'error',
                'message': '该产品没有配置官网链接'
            }, status=status.HTTP_400_BAD_REQUEST)

        result = get_scraper_service().scrape_product_promotions(
            product_id=product.id,
            product_name=product.product_name,
            product_url=product.url
        )

        return Response({
            'status': 'success',
            'data': result
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def scrape_company_products(request):
    """
    抓取指定公司的所有产品推广信息

    POST /api/scraper/company-products/
    Body: {
        "company_id": 1  // 必填
    }
    """
    try:
        company_id = request.data.get('company_id')

        if not company_id:
            return Response({
                'status': 'error',
                'message': '请提供公司ID'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            company = InsuranceCompany.objects.get(id=company_id)
        except InsuranceCompany.DoesNotExist:
            return Response({
                'status': 'error',
                'message': '公司不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        # 获取该公司的所有产品
        products = InsuranceProduct.objects.filter(
            company=company,
            is_active=True
        ).exclude(url='')

        if not products.exists():
            return Response({
                'status': 'error',
                'message': '该公司没有配置产品链接'
            }, status=status.HTTP_400_BAD_REQUEST)

        results = []
        for product in products:
            result = get_scraper_service().scrape_product_promotions(
                product_id=product.id,
                product_name=product.product_name,
                product_url=product.url
            )
            results.append({
                'product_name': product.product_name,
                'result': result
            })

        return Response({
            'status': 'success',
            'data': {
                'company_name': company.name,
                'total_products': len(results),
                'results': results
            }
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def find_company_pages(request):
    """
    查找公司的新闻页面和产品页面

    GET /api/scraper/find-pages/?company_id=1
    """
    try:
        company_id = request.query_params.get('company_id')

        if not company_id:
            return Response({
                'status': 'error',
                'message': '请提供公司ID'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            company = InsuranceCompany.objects.get(id=company_id)
        except InsuranceCompany.DoesNotExist:
            return Response({
                'status': 'error',
                'message': '公司不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        if not company.website_url:
            return Response({
                'status': 'error',
                'message': '该公司没有配置官网URL'
            }, status=status.HTTP_400_BAD_REQUEST)

        pages = get_scraper_service().find_company_pages(company.website_url)

        return Response({
            'status': 'success',
            'data': {
                'company_name': company.name,
                'website_url': company.website_url,
                'news_page': pages.get('news_page'),
                'products_page': pages.get('products_page')
            }
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scraper_status(request):
    """
    获取爬虫统计信息

    GET /api/scraper/status/
    """
    try:
        from .models import CompanyNews, ProductPromotion
        from django.db.models import Count

        # 统计公司新闻
        company_news_stats = CompanyNews.objects.filter(is_active=True).values(
            'company__name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')

        # 统计产品推广
        product_promo_stats = ProductPromotion.objects.filter(is_active=True).values(
            'product__company__name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')

        return Response({
            'status': 'success',
            'data': {
                'company_news': {
                    'total': CompanyNews.objects.filter(is_active=True).count(),
                    'by_company': list(company_news_stats)
                },
                'product_promotions': {
                    'total': ProductPromotion.objects.filter(is_active=True).count(),
                    'by_company': list(product_promo_stats)
                }
            }
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
