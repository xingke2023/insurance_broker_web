"""
Playwright产品爬虫API视图 - 支持外部调用
"""
import os
import subprocess
import json
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import InsuranceProduct, ProductPromotion


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def scrape_product_playwright(request):
    """
    使用Playwright爬取产品推广材料（支持外部调用）

    POST /api/playwright-scraper/scrape-product/

    请求体:
    {
        "url": "https://www.manulife.com.hk/...",  // 必填：产品页面URL
        "product_id": 29,                           // 可选：产品ID（用于保存到数据库）
        "product_name": "宏摯傳承保障計劃",          // 可选：产品名称（用于自动查找ID）
        "use_gemini": true,                         // 可选：是否使用Gemini分析（默认true）
        "save_to_db": true,                         // 可选：是否保存到数据库（默认true）
        "custom_requirements": "重点提取产品小册子"  // 可选：自定义分析要求
    }

    响应:
    {
        "status": "success",
        "data": {
            "analysis_method": "gemini-enhanced",
            "url": "https://...",
            "promotions": [
                {
                    "title": "产品小册子",
                    "content_type": "brochure",
                    "description": "详细介绍产品特点",
                    "url": "https://.../brochure.pdf",
                    "is_important": true
                }
            ],
            "stats": {
                "created": 2,
                "updated": 0,
                "skipped": 0
            }
        }
    }
    """
    try:
        # 获取参数
        product_url = request.data.get('url')
        product_id = request.data.get('product_id')
        product_name = request.data.get('product_name')
        use_gemini = request.data.get('use_gemini', True)
        save_to_db = request.data.get('save_to_db', True)
        custom_requirements = request.data.get('custom_requirements')

        # 验证必填参数
        if not product_url:
            return Response({
                'status': 'error',
                'message': '缺少必填参数: url'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 如果提供了产品名称但没有ID，尝试查找
        if not product_id and product_name:
            try:
                product = InsuranceProduct.objects.get(product_name=product_name)
                product_id = product.id
            except InsuranceProduct.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': f'未找到产品: {product_name}'
                }, status=status.HTTP_404_NOT_FOUND)
            except InsuranceProduct.MultipleObjectsReturned:
                return Response({
                    'status': 'error',
                    'message': f'找到多个同名产品: {product_name}，请使用product_id指定'
                }, status=status.HTTP_400_BAD_REQUEST)

        # 如果需要保存到数据库，必须提供product_id
        if save_to_db and not product_id:
            return Response({
                'status': 'error',
                'message': '保存到数据库需要提供 product_id 或 product_name'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 验证产品是否存在
        if product_id:
            try:
                product = InsuranceProduct.objects.get(id=product_id)
            except InsuranceProduct.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': f'产品不存在: ID={product_id}'
                }, status=status.HTTP_404_NOT_FOUND)

        # 调用Playwright爬虫
        result = run_playwright_scraper(
            product_url=product_url,
            product_id=product_id,
            use_gemini=use_gemini,
            custom_requirements=custom_requirements
        )

        # 如果需要保存到数据库
        stats = {'created': 0, 'updated': 0, 'skipped': 0}
        if save_to_db and product_id:
            stats = save_to_database(product_id, result)

        return Response({
            'status': 'success',
            'data': {
                'analysis_method': result.get('analysis_method'),
                'url': result.get('url'),
                'promotions': result.get('promotions', []),
                'stats': stats
            }
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def run_playwright_scraper(product_url: str, product_id: int = None,
                           use_gemini: bool = True, custom_requirements: str = None) -> dict:
    """
    运行Playwright爬虫脚本
    """
    # 脚本路径
    playwright_skill_dir = "/home/ubuntu/.claude/skills/playwright-skill"
    project_root = settings.BASE_DIR
    scraper_script = os.path.join(project_root, "scripts/playwright/product-scraper.js")

    # 检查脚本是否存在
    if not os.path.exists(scraper_script):
        raise FileNotFoundError(f"Playwright脚本不存在: {scraper_script}")

    # 生成任务ID
    from datetime import datetime
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    task_id = f"{product_id or 'temp'}_{timestamp}"

    # 运行Playwright脚本
    cmd = [
        'node',
        os.path.join(playwright_skill_dir, 'run.js'),
        scraper_script
    ]

    # 设置环境变量
    env = os.environ.copy()
    env['PRODUCT_URL'] = product_url
    env['PRODUCT_ID'] = str(product_id or 'temp')
    env['USE_GEMINI'] = 'true' if use_gemini else 'false'
    env['OUTPUT_DIR'] = os.path.join(project_root, 'temp_files/playwright_output')

    # 如果使用Gemini，需要传递API Key
    if use_gemini:
        gemini_api_key = os.getenv('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
        if not gemini_api_key:
            raise ValueError("使用Gemini模式需要配置 GEMINI_API_KEY")
        env['GEMINI_API_KEY'] = gemini_api_key

        if custom_requirements:
            env['CUSTOM_REQUIREMENTS'] = custom_requirements

    # 执行Playwright
    result = subprocess.run(
        cmd,
        cwd=playwright_skill_dir,
        env=env,
        capture_output=True,
        text=True,
        timeout=90
    )

    if result.returncode != 0:
        raise RuntimeError(f"Playwright执行失败: {result.stderr}")

    # 读取结果文件
    output_file = os.path.join(env['OUTPUT_DIR'], f"product-scrape-{product_id or 'temp'}.json")
    if not os.path.exists(output_file):
        raise FileNotFoundError(f"未找到结果文件: {output_file}")

    with open(output_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    return data


def save_to_database(product_id: int, scraped_data: dict) -> dict:
    """
    将爬取的数据保存到数据库
    """
    try:
        product = InsuranceProduct.objects.get(id=product_id)
    except InsuranceProduct.DoesNotExist:
        raise ValueError(f"产品不存在: ID={product_id}")

    created_count = 0
    updated_count = 0
    skipped_count = 0

    promotions = scraped_data.get('promotions', [])

    for promo in promotions:
        url = promo.get('url', '')
        title = promo.get('title', '')
        content_type = promo.get('content_type', 'other')
        description = promo.get('description', '')
        is_important = promo.get('is_important', False)

        if not url or not title:
            skipped_count += 1
            continue

        # 检查是否已存在
        existing = ProductPromotion.objects.filter(
            product=product,
            url=url
        ).first()

        if existing:
            # 更新现有记录
            existing.title = title
            existing.content_type = content_type
            existing.description = description
            existing.is_important = is_important
            existing.save()
            updated_count += 1
        else:
            # 创建新记录
            ProductPromotion.objects.create(
                product=product,
                title=title,
                content_type=content_type,
                description=description,
                url=url,
                is_important=is_important
            )
            created_count += 1

    return {
        'created': created_count,
        'updated': updated_count,
        'skipped': skipped_count
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_product_promotions(request, product_id):
    """
    获取产品的所有推广材料

    GET /api/playwright-scraper/products/{product_id}/promotions/
    """
    try:
        product = InsuranceProduct.objects.get(id=product_id)
        promotions = ProductPromotion.objects.filter(
            product=product,
            is_active=True
        ).order_by('-is_important', '-created_at')

        data = []
        for promo in promotions:
            data.append({
                'id': promo.id,
                'title': promo.title,
                'content_type': promo.content_type,
                'description': promo.description,
                'url': promo.url,
                'is_important': promo.is_important,
                'created_at': promo.created_at
            })

        return Response({
            'status': 'success',
            'data': {
                'product_id': product.id,
                'product_name': product.product_name,
                'promotions': data
            }
        })

    except InsuranceProduct.DoesNotExist:
        return Response({
            'status': 'error',
            'message': f'产品不存在: ID={product_id}'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
