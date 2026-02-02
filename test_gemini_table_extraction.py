#!/usr/bin/env python3
"""
测试Gemini表格提取功能

使用方式：
python test_gemini_table_extraction.py [PDF文件路径]

如果不提供PDF路径，将使用数据库中最新上传的PDF文件
"""

import os
import sys
import django

# 设置Django环境
sys.path.insert(0, '/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import PlanDocument
from api.gemini_service import extract_table_data_from_pdf
import json


def test_gemini_extraction(pdf_path=None):
    """测试Gemini表格提取"""

    print("=" * 80)
    print("🧪 Gemini表格提取测试")
    print("=" * 80)

    # 如果没有提供PDF路径，从数据库获取最新的PDF
    if not pdf_path:
        print("\n📋 未提供PDF路径，从数据库获取最新文档...")
        try:
            latest_doc = PlanDocument.objects.filter(
                file_path__isnull=False
            ).exclude(file_path='').order_by('-created_at').first()

            if not latest_doc:
                print("❌ 数据库中没有找到包含PDF文件的文档")
                return

            pdf_path = latest_doc.file_path.path
            print(f"✅ 找到文档: {latest_doc.file_name} (ID: {latest_doc.id})")
            print(f"   文件路径: {pdf_path}")
        except Exception as e:
            print(f"❌ 从数据库获取文档失败: {e}")
            return

    # 检查文件是否存在
    if not os.path.exists(pdf_path):
        print(f"\n❌ PDF文件不存在: {pdf_path}")
        return

    # 获取文件大小
    file_size = os.path.getsize(pdf_path)
    file_size_mb = file_size / (1024 * 1024)
    print(f"\n📄 PDF文件信息:")
    print(f"   路径: {pdf_path}")
    print(f"   大小: {file_size_mb:.2f} MB ({file_size:,} bytes)")

    # 调用Gemini提取表格数据
    print("\n🤖 开始调用Gemini API提取表格数据...")
    print("-" * 80)

    try:
        result = extract_table_data_from_pdf(pdf_path)

        print("\n" + "=" * 80)
        print("📊 提取结果:")
        print("=" * 80)

        if result.get('success'):
            print("✅ 提取成功!")

            table_data = result.get('table_data', {})

            # 显示表格信息
            print(f"\n表格名称: {table_data.get('table_name', 'N/A')}")
            print(f"总行数: {table_data.get('row_count', 0)}")
            print(f"字段数: {len(table_data.get('fields', []))}")
            print(f"数据行数: {len(table_data.get('data', []))}")

            # 显示字段列表
            fields = table_data.get('fields', [])
            if fields:
                print(f"\n📋 字段列表 ({len(fields)}个):")
                for i, field in enumerate(fields, 1):
                    print(f"   {i}. {field}")

            # 显示前5行数据
            data = table_data.get('data', [])
            if data:
                print(f"\n📊 数据预览 (前5行):")
                print("-" * 80)

                # 打印表头
                if fields:
                    header = " | ".join(str(f)[:15].ljust(15) for f in fields[:6])
                    print(header)
                    print("-" * 80)

                # 打印数据行
                for i, row in enumerate(data[:5], 1):
                    row_str = " | ".join(str(val)[:15].ljust(15) for val in row[:6])
                    print(f"{row_str}...")

            # 保存完整JSON到文件
            output_file = '/tmp/gemini_table_extraction_result.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(table_data, f, ensure_ascii=False, indent=2)
            print(f"\n💾 完整JSON结果已保存到: {output_file}")

            # 显示JSON大小
            json_size = len(json.dumps(table_data, ensure_ascii=False))
            print(f"   JSON大小: {json_size:,} bytes ({json_size/1024:.2f} KB)")

        else:
            print("❌ 提取失败!")
            error = result.get('error', '未知错误')
            print(f"   错误信息: {error}")

        print("\n" + "=" * 80)

    except Exception as e:
        print(f"\n❌ 测试过程中发生异常: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    # 从命令行参数获取PDF路径
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else None

    # 运行测试
    test_gemini_extraction(pdf_path)
