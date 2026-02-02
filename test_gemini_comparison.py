"""
测试 Gemini PDF 对比分析功能
"""

import os
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.gemini_comparison_service import GeminiComparisonService


def test_comparison_service():
    """测试Gemini对比服务（仅测试服务初始化）"""
    print("=" * 50)
    print("测试 Gemini 对比分析服务")
    print("=" * 50)

    try:
        # 初始化服务
        service = GeminiComparisonService()
        print("✅ Gemini服务初始化成功")
        print(f"   模型: {service.model}")
        print(f"   API Key: {'已配置' if service.client else '未配置'}")

    except Exception as e:
        print(f"❌ 服务初始化失败: {str(e)}")
        return

    print("\n" + "=" * 50)
    print("提示词测试")
    print("=" * 50)

    try:
        # 测试提示词生成
        file_names = ['计划书1.pdf', '计划书2.pdf', '计划书3.pdf']
        prompt = service._build_comparison_prompt(3, file_names)

        print("✅ 提示词生成成功")
        print(f"   提示词长度: {len(prompt)} 字符")
        print(f"   包含文件: {len(file_names)} 份")
        print("\n提示词预览（前500字符）:")
        print("-" * 50)
        print(prompt[:500])
        print("-" * 50)

    except Exception as e:
        print(f"❌ 提示词生成失败: {str(e)}")

    print("\n" + "=" * 50)
    print("数据库模型测试")
    print("=" * 50)

    try:
        from api.models import ComparisonReport
        from django.contrib.auth.models import User

        # 获取或创建测试用户
        user, created = User.objects.get_or_create(
            username='test_user',
            defaults={'email': 'test@example.com'}
        )

        if created:
            print("✅ 创建测试用户")
        else:
            print("✅ 使用现有测试用户")

        # 测试创建对比报告（不保存）
        report = ComparisonReport(
            user=user,
            comparison_title='测试对比报告',
            pdf1_base64='test_base64_1',
            pdf1_filename='test1.pdf',
            pdf2_base64='test_base64_2',
            pdf2_filename='test2.pdf',
            pdf3_base64='test_base64_3',
            pdf3_filename='test3.pdf',
            comparison_summary='测试报告内容',
            report_format='markdown',
            status='completed'
        )

        print("✅ ComparisonReport 模型测试通过")
        print(f"   用户: {report.user.username}")
        print(f"   标题: {report.comparison_title}")
        print(f"   文件: {report.pdf1_filename}, {report.pdf2_filename}, {report.pdf3_filename}")
        print(f"   格式: {report.report_format}")

    except Exception as e:
        print(f"❌ 数据库模型测试失败: {str(e)}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 50)
    print("API路由检查")
    print("=" * 50)

    try:
        from django.urls import reverse

        urls = [
            ('gemini-compare-plans', {}),
            ('gemini-compare-plans-stream', {}),
            ('get-comparison-history', {}),
        ]

        for url_name, kwargs in urls:
            try:
                url = reverse(url_name, kwargs=kwargs)
                print(f"✅ {url_name:<30} → {url}")
            except Exception as e:
                print(f"❌ {url_name:<30} → 路由不存在")

    except Exception as e:
        print(f"❌ 路由检查失败: {str(e)}")

    print("\n" + "=" * 50)
    print("✅ 所有测试完成！")
    print("=" * 50)


if __name__ == '__main__':
    test_comparison_service()
