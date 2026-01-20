#!/usr/bin/env python3
"""
测试 Gemini Flash OCR 功能

使用方法：
python3 test_gemini_ocr.py /path/to/insurance.pdf
"""

import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.gemini_service import ocr_pdf_with_gemini


def test_ocr(pdf_path):
    """测试OCR识别功能"""
    print(f"\n{'='*80}")
    print(f"📄 测试 Gemini Flash OCR 识别")
    print(f"{'='*80}\n")

    print(f"📂 PDF文件路径: {pdf_path}")

    # 检查文件是否存在
    if not os.path.exists(pdf_path):
        print(f"❌ 错误：文件不存在: {pdf_path}")
        return

    # 检查文件大小
    file_size_mb = os.path.getsize(pdf_path) / (1024 * 1024)
    print(f"📊 文件大小: {file_size_mb:.2f} MB")

    # 调用OCR
    print(f"\n🚀 开始OCR识别...\n")
    result = ocr_pdf_with_gemini(pdf_path)

    # 显示结果
    if result['success']:
        content = result['content']
        print(f"\n{'='*80}")
        print(f"✅ OCR识别成功")
        print(f"{'='*80}\n")
        print(f"📝 识别内容长度: {len(content)} 字符")
        print(f"\n📄 内容预览 (前500字符):")
        print(f"{'-'*80}")
        print(content[:500])
        print(f"{'-'*80}")

        # 检查是否包含表格
        if '<table>' in content:
            print(f"\n✅ 检测到表格标签")
            table_count = content.count('<table>')
            print(f"📊 表格数量: {table_count}")
        else:
            print(f"\n⚠️ 未检测到表格标签")

        # 保存完整结果到文件
        output_file = f"{os.path.basename(pdf_path)}_gemini_ocr_result.txt"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n💾 完整结果已保存到: {output_file}")

    else:
        print(f"\n❌ OCR识别失败")
        print(f"错误信息: {result.get('error', '未知错误')}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("❌ 错误：缺少PDF文件路径参数")
        print(f"\n使用方法:")
        print(f"  python3 {sys.argv[0]} /path/to/insurance.pdf")
        print(f"\n示例:")
        print(f"  python3 {sys.argv[0]} ./media/plan_documents/test.pdf")
        sys.exit(1)

    pdf_path = sys.argv[1]
    test_ocr(pdf_path)
