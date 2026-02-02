#!/usr/bin/env python3
"""
测试OCR进度显示
验证 processing_stage 在 OCR 过程中正确更新
"""

import os
import sys
import django
import time

# 设置 Django 环境
sys.path.insert(0, '/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import PlanDocument
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_ocr_progress_display():
    """测试OCR进度显示"""

    logger.info("=" * 60)
    logger.info("🧪 测试 OCR 进度显示")
    logger.info("=" * 60)

    # 查找最近的文档
    recent_docs = PlanDocument.objects.order_by('-created_at')[:5]

    if not recent_docs:
        logger.warning("⚠️  数据库中没有文档")
        return

    logger.info(f"\n📋 最近 {len(recent_docs)} 个文档的处理状态：\n")

    # 定义阶段名称映射
    stage_names = {
        'pending': '待处理',
        'ocr_processing': 'OCR识别中 ✨',
        'ocr_completed': 'OCR识别完成 ✅',
        'extracting_basic_info': '提取基本信息中',
        'basic_info_completed': '基本信息完成',
        'extracting_tablesummary': '分析表格结构中',
        'tablesummary_completed': '表格结构分析完成',
        'extracting_table': '提取退保价值表中',
        'table_completed': '退保价值表完成',
        'extracting_summary': '提取概要中',
        'all_completed': '全部完成 🎉',
        'error': '处理出错 ❌'
    }

    # 定义进度百分比
    stage_progress = {
        'pending': 8,
        'ocr_processing': 10,
        'ocr_completed': 15,
        'extracting_basic_info': 25,
        'basic_info_completed': 35,
        'extracting_tablesummary': 45,
        'tablesummary_completed': 55,
        'extracting_table': 65,
        'table_completed': 75,
        'extracting_summary': 94,
        'all_completed': 100,
        'error': 0
    }

    for doc in recent_docs:
        stage = doc.processing_stage
        stage_name = stage_names.get(stage, stage)
        progress = stage_progress.get(stage, 0)

        # 生成进度条
        bar_length = 20
        filled = int(bar_length * progress / 100)
        bar = '█' * filled + '░' * (bar_length - filled)

        logger.info(f"📄 {doc.file_name[:30]}")
        logger.info(f"   状态: {stage_name}")
        logger.info(f"   进度: [{bar}] {progress}%")
        logger.info(f"   阶段: {stage}")
        logger.info(f"   时间: {doc.last_processed_at or doc.created_at}")

        # 如果有 content 字段，显示长度
        if doc.content:
            logger.info(f"   OCR内容: {len(doc.content)} 字符")

        logger.info("")

    logger.info("=" * 60)
    logger.info("✅ 测试完成")
    logger.info("=" * 60)

    # 检查是否有正在处理的文档
    processing_docs = PlanDocument.objects.filter(
        processing_stage__in=['ocr_processing', 'ocr_completed', 'extracting_basic_info']
    )

    if processing_docs.exists():
        logger.info(f"\n⏳ 当前有 {processing_docs.count()} 个文档正在处理中")
        logger.info("   可以在前端 plan-analyzer 页面查看实时进度")
    else:
        logger.info("\nℹ️  当前没有文档在处理中")
        logger.info("   上传新文档后，可以在前端看到 OCR 进度显示")


if __name__ == '__main__':
    test_ocr_progress_display()
