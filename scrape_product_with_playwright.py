#!/usr/bin/env python3
"""
使用Playwright爬取保险产品信息的Django脚本

使用方法：
python3 scrape_product_with_playwright.py --url "https://www.manulife.com.hk/..." --product-id 1

或者使用产品名称自动查找：
python3 scrape_product_with_playwright.py --url "https://www.manulife.com.hk/..." --product-name "宏摯傳承保障計劃"
"""

import os
import sys
import json
import subprocess
import argparse
from datetime import datetime

# Django设置
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from django.conf import settings
from api.models import InsuranceProduct, ProductPromotion


def run_playwright_scraper(product_url: str, product_id: int, use_gemini: bool = False, custom_requirements: str = None) -> dict:
    """
    运行Playwright爬虫脚本（混合模式）

    Args:
        product_url: 产品页面URL
        product_id: 产品ID
        use_gemini: 是否启用Gemini增强（默认False）
                   - False: 仅使用DOM提取
                   - True: DOM提取 + Gemini智能分类
        custom_requirements: 自定义爬取要求（提示词）

    Returns:
        爬取的数据字典
    """
    print(f"\n🚀 启动Playwright爬虫（混合模式）...")
    print(f"   产品URL: {product_url}")
    print(f"   产品ID: {product_id}")
    print(f"   Gemini增强: {'✅ 启用（DOM + AI分类）' if use_gemini else '❌ 未启用（仅DOM）'}")
    if custom_requirements:
        print(f"   自定义要求: {custom_requirements[:100]}...")

    # Playwright脚本路径（统一使用混合模式脚本）
    playwright_skill_dir = "/home/ubuntu/.claude/skills/playwright-skill"
    scraper_script = "/tmp/playwright-scraper-product-hybrid.js"

    # 检查脚本是否存在
    if not os.path.exists(scraper_script):
        raise FileNotFoundError(f"Playwright脚本不存在: {scraper_script}")

    # 运行Playwright脚本（通过环境变量传递参数）
    cmd = [
        'node',
        os.path.join(playwright_skill_dir, 'run.js'),
        scraper_script
    ]

    # 设置环境变量
    env = os.environ.copy()
    env['PRODUCT_URL'] = product_url
    env['PRODUCT_ID'] = str(product_id)
    env['USE_GEMINI'] = 'true' if use_gemini else 'false'

    # 如果使用Gemini，需要传递API Key
    if use_gemini:
        gemini_api_key = os.getenv('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
        if not gemini_api_key:
            raise ValueError("使用Gemini模式需要配置 GEMINI_API_KEY")
        env['GEMINI_API_KEY'] = gemini_api_key

        # 传递自定义要求
        if custom_requirements:
            env['CUSTOM_REQUIREMENTS'] = custom_requirements

    print(f"\n📝 执行命令: {' '.join(cmd)}")
    print(f"   环境变量: PRODUCT_URL={product_url}")
    print(f"   环境变量: PRODUCT_ID={product_id}")
    print(f"   环境变量: USE_GEMINI={use_gemini}")
    if use_gemini:
        print(f"   环境变量: GEMINI_API_KEY=***{gemini_api_key[-6:]}")
        if custom_requirements:
            print(f"   环境变量: CUSTOM_REQUIREMENTS={custom_requirements[:80]}...")

    try:
        result = subprocess.run(
            cmd,
            cwd=playwright_skill_dir,
            env=env,
            capture_output=True,
            text=True,
            timeout=60
        )

        # 输出Playwright的日志
        print("\n📋 Playwright输出:")
        print(result.stdout)

        if result.stderr:
            print("\n⚠️  Playwright错误:")
            print(result.stderr)

        if result.returncode != 0:
            raise RuntimeError(f"Playwright脚本执行失败，返回码: {result.returncode}")

        # 读取爬取结果
        output_file = f"/tmp/product-scrape-{product_id}.json"
        if not os.path.exists(output_file):
            raise FileNotFoundError(f"未找到爬取结果文件: {output_file}")

        with open(output_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return data

    except subprocess.TimeoutExpired:
        raise RuntimeError("Playwright脚本执行超时（60秒）")
    except Exception as e:
        raise RuntimeError(f"Playwright脚本执行失败: {str(e)}")


def save_to_database(product_id: int, scraped_data: dict) -> dict:
    """
    将爬取的数据保存到数据库（支持混合模式）

    Args:
        product_id: 产品ID
        scraped_data: 爬取的数据
                     - 基础DOM模式：包含 pdfs, videos 字段
                     - Gemini增强模式：包含 promotions 字段

    Returns:
        保存结果统计
    """
    print("\n💾 保存数据到数据库...")

    try:
        product = InsuranceProduct.objects.get(id=product_id)
        print(f"   产品: {product.product_name}")
        print(f"   公司: {product.company.name}")

    except InsuranceProduct.DoesNotExist:
        raise ValueError(f"产品不存在: ID={product_id}")

    created_count = 0
    updated_count = 0
    skipped_count = 0

    # 检测数据格式
    analysis_method = scraped_data.get('analysis_method', 'unknown')
    print(f"   分析方法: {analysis_method}")

    # 如果包含promotions字段，说明经过Gemini增强
    if 'promotions' in scraped_data:
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
                # 更新
                existing.title = title
                existing.content_type = content_type
                existing.description = description
                existing.updated_at = datetime.now()
                existing.save()
                updated_count += 1
                icon = '⭐' if is_important else '↻'
                print(f"   {icon} 更新: {title}")
            else:
                # 创建
                ProductPromotion.objects.create(
                    product=product,
                    title=title,
                    content_type=content_type,
                    description=description,
                    url=url,
                    is_active=True,
                    sort_order=1 if is_important else 10  # 重要资料排前面
                )
                created_count += 1
                icon = '⭐' if is_important else '✓'
                print(f"   {icon} 新增: {title}")

    else:
        # 基础模式：处理PDF文件
        for pdf in scraped_data.get('pdfs', []):
            url = pdf.get('url', '')
            title = pdf.get('title', '')

            if not url or not title:
                skipped_count += 1
                continue

            # 检查是否已存在
            existing = ProductPromotion.objects.filter(
                product=product,
                url=url
            ).first()

            if existing:
                # 更新
                existing.title = title
                existing.content_type = 'brochure'
                existing.updated_at = datetime.now()
                existing.save()
                updated_count += 1
                print(f"   ↻ 更新: {title}")
            else:
                # 创建
                ProductPromotion.objects.create(
                    product=product,
                    title=title,
                    content_type='brochure',
                    url=url,
                    is_active=True
                )
                created_count += 1
                print(f"   ✓ 新增: {title}")

            # 处理视频
        for video in scraped_data.get('videos', []):
            url = video.get('url', '')
            title = video.get('title', '')

            if not url or not title:
                skipped_count += 1
                continue

            # 检查是否已存在
            existing = ProductPromotion.objects.filter(
                product=product,
                url=url
            ).first()

            if existing:
                # 更新
                existing.title = title
                existing.content_type = 'video'
                existing.updated_at = datetime.now()
                existing.save()
                updated_count += 1
                print(f"   ↻ 更新: {title}")
            else:
                # 创建
                ProductPromotion.objects.create(
                    product=product,
                    title=title,
                    content_type='video',
                    url=url,
                    is_active=True
                )
                created_count += 1
                print(f"   ✓ 新增: {title}")

    print(f"\n✅ 保存完成！")
    print(f"   新增: {created_count} 条")
    print(f"   更新: {updated_count} 条")
    print(f"   跳过: {skipped_count} 条")

    return {
        'created': created_count,
        'updated': updated_count,
        'skipped': skipped_count
    }


def main():
    parser = argparse.ArgumentParser(description='使用Playwright爬取保险产品信息')
    parser.add_argument('--url', required=True, help='产品页面URL')
    parser.add_argument('--product-id', type=int, help='产品ID（数据库中的ID）')
    parser.add_argument('--product-name', help='产品名称（用于查找产品ID）')
    parser.add_argument('--company-name', help='公司名称（配合产品名称使用）')
    parser.add_argument('--gemini', action='store_true', help='启用Gemini增强分析（默认仅DOM提取，启用后在DOM基础上进行智能分类和描述）')
    parser.add_argument('--requirements', '--req', help='自定义分析要求（需配合--gemini使用），例如："重点关注产品小册子" 或 "标注中文/英文资料"')

    args = parser.parse_args()

    use_gemini = args.gemini
    custom_requirements = args.requirements

    # 确定产品ID
    product_id = args.product_id

    if not product_id:
        if not args.product_name:
            print("❌ 错误：必须提供 --product-id 或 --product-name")
            sys.exit(1)

        # 通过产品名称查找
        print(f"🔍 查找产品: {args.product_name}")

        if args.company_name:
            product = InsuranceProduct.objects.filter(
                product_name__icontains=args.product_name,
                company__name__icontains=args.company_name
            ).first()
        else:
            product = InsuranceProduct.objects.filter(
                product_name__icontains=args.product_name
            ).first()

        if not product:
            print(f"❌ 错误：未找到产品 '{args.product_name}'")
            sys.exit(1)

        product_id = product.id
        print(f"✅ 找到产品: {product.product_name} (ID: {product_id})")

    try:
        # 1. 运行Playwright爬虫
        scraped_data = run_playwright_scraper(args.url, product_id, use_gemini, custom_requirements)

        # 2. 保存到数据库
        result = save_to_database(product_id, scraped_data)

        print("\n" + "="*60)
        print("🎉 任务完成！")
        print("="*60)

    except Exception as e:
        print(f"\n❌ 错误: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()
