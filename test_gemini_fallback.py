#!/usr/bin/env python3
"""
测试Gemini API Fallback机制

用法：
    python3 test_gemini_fallback.py
"""

import os
import sys
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 导入Django配置
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.gemini_service import call_gemini_with_fallback
from google.genai import types


def test_simple_call():
    """测试简单的API调用（应该使用主密钥）"""
    print("\n" + "="*60)
    print("测试1: 简单API调用（主密钥）")
    print("="*60)

    try:
        prompt_text = "请回答：1+1等于几？只返回数字。"

        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt_text)]
            )
        ]

        response = call_gemini_with_fallback(
            model='gemini-3-flash-preview',
            contents=contents,
            operation_name="测试API调用"
        )

        print(f"\n✅ 测试成功!")
        print(f"响应内容: {response.text}")
        return True

    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        return False


def test_fallback_scenario():
    """测试备用密钥场景（需要手动触发）"""
    print("\n" + "="*60)
    print("测试2: 备用密钥切换（需要主密钥超额）")
    print("="*60)
    print("\n⚠️ 提示: 这个测试需要主密钥超额才能验证切换机制")
    print("如果主密钥正常，将直接使用主密钥完成调用\n")

    try:
        # 发送一个稍微复杂的请求
        prompt_text = """请生成一个简短的保险产品介绍（20字以内）。"""

        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt_text)]
            )
        ]

        response = call_gemini_with_fallback(
            model='gemini-3-pro-preview',
            contents=contents,
            operation_name="测试备用密钥"
        )

        print(f"\n✅ 测试成功!")
        print(f"响应内容: {response.text}")
        return True

    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        return False


def check_env_configuration():
    """检查环境变量配置"""
    print("\n" + "="*60)
    print("环境变量配置检查")
    print("="*60)

    primary_key = os.getenv('GEMINI_API_KEY')
    fallback_key = os.getenv('GEMINI_API_KEY_FALLBACK')

    print(f"\n主API密钥: {'✅ 已配置' if primary_key else '❌ 未配置'}")
    if primary_key:
        print(f"  前缀: {primary_key[:10]}...")

    print(f"\n备用API密钥: {'✅ 已配置' if fallback_key else '⚠️ 未配置（可选）'}")
    if fallback_key:
        print(f"  前缀: {fallback_key[:10]}...")

    if not primary_key:
        print("\n❌ 错误: 未配置主API密钥，请在.env文件中设置GEMINI_API_KEY")
        return False

    return True


def main():
    """主测试函数"""
    print("\n🔍 Gemini API Fallback机制测试")
    print("=" * 60)

    # 1. 检查配置
    if not check_env_configuration():
        return

    # 2. 测试简单调用
    test_simple_call()

    # 3. 测试备用密钥（如果需要）
    print("\n是否测试备用密钥切换? (y/N): ", end="")
    choice = input().strip().lower()
    if choice == 'y':
        test_fallback_scenario()

    print("\n" + "="*60)
    print("✅ 测试完成!")
    print("="*60)
    print("\n提示:")
    print("- 查看上方日志确认使用的是哪个API密钥")
    print("- 主密钥超额时会自动切换到备用密钥")
    print("- 详细日志可在Django/Celery日志中查看")


if __name__ == '__main__':
    main()
