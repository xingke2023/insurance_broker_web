#!/usr/bin/env python3
"""
测试保险产品PDF上传功能

这个脚本测试在InsuranceProduct admin页面上传PDF并解析的功能
"""

import os
import django
import sys

# 设置Django环境
sys.path.insert(0, '/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.gemini_service import ocr_pdf_with_gemini


def test_pdf_parsing():
    """测试PDF解析功能"""
    print("=" * 80)
    print("测试保险产品PDF上传功能")
    print("=" * 80)

    # 查找一个测试PDF文件
    test_pdf_paths = [
        '/var/www/harry-insurance2/media/plan_documents/',  # 计划书目录
    ]

    test_pdf = None
    for path in test_pdf_paths:
        if os.path.exists(path):
            files = [f for f in os.listdir(path) if f.endswith('.pdf')]
            if files:
                test_pdf = os.path.join(path, files[0])
                break

    if not test_pdf:
        print("❌ 未找到测试PDF文件")
        print("请将PDF文件放在以下目录之一：")
        for path in test_pdf_paths:
            print(f"  - {path}")
        return

    print(f"📄 测试文件: {test_pdf}")
    print(f"📏 文件大小: {os.path.getsize(test_pdf) / (1024*1024):.2f} MB")
    print()

    print("🤖 开始使用Gemini 3 Flash Preview解析PDF...")
    result = ocr_pdf_with_gemini(test_pdf)

    if result.get('success'):
        content = result.get('content', '')
        print("✅ PDF解析成功！")
        print(f"📝 内容长度: {len(content)} 字符")
        print()
        print("📄 内容预览（前500字符）：")
        print("-" * 80)
        print(content[:500])
        print("-" * 80)
        print()
        print("✨ 测试通过！PDF上传功能工作正常。")
    else:
        error = result.get('error', '未知错误')
        print(f"❌ PDF解析失败: {error}")


if __name__ == '__main__':
    test_pdf_parsing()
