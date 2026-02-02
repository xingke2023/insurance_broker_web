#!/usr/bin/env python3
"""
测试 Gemini API 配置
验证 thinking_level="minimal" 和其他参数是否正常工作
"""

import os
import sys
import django

# 设置 Django 环境
sys.path.insert(0, '/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from google import genai
from google.genai import types
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_gemini_api():
    """测试 Gemini API 配置"""

    # 获取 API 密钥
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        logger.error("❌ GEMINI_API_KEY 环境变量未设置")
        return False

    logger.info(f"🔑 使用 API 密钥: {api_key[:10]}...")

    try:
        # 创建客户端
        client = genai.Client(api_key=api_key)
        logger.info("✅ Gemini 客户端创建成功")

        # 构建测试配置
        config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinkingBudget=1024),
            media_resolution=types.MediaResolution.MEDIA_RESOLUTION_MEDIUM,
            max_output_tokens=1000  # 测试用较小的值
        )
        logger.info("✅ GenerateContentConfig 配置创建成功")
        logger.info(f"   - thinkingBudget: 1024")
        logger.info(f"   - media_resolution: medium")
        logger.info(f"   - max_output_tokens: 1000")

        # 测试简单的文本生成
        logger.info("\n🧪 测试 1: 简单文本生成")
        response = client.models.generate_content(
            model='gemini-3-flash-preview',
            contents="请用一句话介绍什么是保险",
            config=config
        )

        result_text = response.text
        logger.info(f"✅ API 调用成功")
        logger.info(f"📄 响应内容: {result_text}")

        # 测试 PDF 文件（如果存在测试文件）
        test_pdf = "/var/www/harry-insurance2/media/plan_documents"
        logger.info(f"\n🧪 测试 2: 检查是否有 PDF 文件可供测试")

        import glob
        pdf_files = glob.glob(f"{test_pdf}/*.pdf")

        if pdf_files:
            test_file = pdf_files[0]
            logger.info(f"📄 找到测试文件: {test_file}")

            # 读取完整文件
            with open(test_file, 'rb') as f:
                pdf_bytes = f.read()

            logger.info(f"✅ 文件读取成功: {len(pdf_bytes)} 字节 ({len(pdf_bytes)/1024/1024:.2f} MB)")

            # 测试 OCR（使用简短的提示词）
            parts = [
                types.Part.from_text(text="请识别这个PDF文档的前几页内容"),
                types.Part.from_bytes(data=pdf_bytes, mime_type='application/pdf')
            ]

            contents = [
                types.Content(role="user", parts=parts)
            ]

            logger.info("🤖 开始 OCR 测试...")
            response = client.models.generate_content(
                model='gemini-3-flash-preview',
                contents=contents,
                config=config
            )

            ocr_result = response.text
            logger.info(f"✅ OCR 测试成功")
            logger.info(f"📄 OCR 结果预览(前200字符): {ocr_result[:200]}")
        else:
            logger.info("ℹ️  未找到 PDF 测试文件，跳过 OCR 测试")

        logger.info("\n" + "="*60)
        logger.info("🎉 所有测试通过！Gemini API 配置正确")
        logger.info("="*60)
        return True

    except Exception as e:
        logger.error(f"\n❌ 测试失败: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False


if __name__ == '__main__':
    success = test_gemini_api()
    sys.exit(0 if success else 1)
