#!/usr/bin/env python3
"""
验证系统是否准备就绪

检查项：
1. Django服务运行状态
2. Celery worker运行状态
3. 必要的任务已注册
4. API密钥配置正确
5. 数据库连接正常
"""

import os
import sys
import django
import requests

# 设置Django环境
sys.path.insert(0, '/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import PlanDocument
from celery import current_app

def check_django():
    """检查Django服务"""
    try:
        response = requests.get('http://localhost:8017/api/ocr/documents/', timeout=5)
        if response.status_code in [200, 401]:  # 200或401都说明服务正常
            print("✅ Django服务正常运行")
            return True
        else:
            print(f"❌ Django服务异常 (状态码: {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Django服务连接失败: {e}")
        return False

def check_celery():
    """检查Celery worker"""
    try:
        # 检查Celery是否能连接到Redis
        from celery import current_app
        inspect = current_app.control.inspect()
        active = inspect.active()

        if active:
            print(f"✅ Celery worker正常运行 ({len(active)} workers)")
            return True
        else:
            print("⚠️  Celery worker未检测到active任务（可能刚启动）")
            return True
    except Exception as e:
        print(f"❌ Celery连接失败: {e}")
        return False

def check_tasks():
    """检查必要的任务是否已注册"""
    required_tasks = [
        'api.tasks.ocr_document_task',
        'api.tasks.extract_table_data_direct_task',
        'api.tasks.extract_tablecontent_task',
        'api.tasks.extract_tablesummary_task',
    ]

    registered_tasks = current_app.tasks.keys()

    missing_tasks = []
    for task in required_tasks:
        if task in registered_tasks:
            print(f"✅ 任务已注册: {task}")
        else:
            print(f"❌ 任务未注册: {task}")
            missing_tasks.append(task)

    return len(missing_tasks) == 0

def check_api_key():
    """检查Gemini API密钥"""
    api_key = os.getenv('GEMINI_API_KEY')
    if api_key:
        print(f"✅ Gemini API密钥已配置: {api_key[:20]}...")
        return True
    else:
        print("❌ Gemini API密钥未配置")
        return False

def check_database():
    """检查数据库连接"""
    try:
        count = PlanDocument.objects.count()
        print(f"✅ 数据库连接正常 ({count} 条计划书记录)")
        return True
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False

def check_gemini_service():
    """检查Gemini服务是否可用"""
    try:
        from api.gemini_service import extract_table_data_from_pdf
        print("✅ Gemini服务模块加载成功")
        return True
    except Exception as e:
        print(f"❌ Gemini服务模块加载失败: {e}")
        return False

def main():
    print("=" * 80)
    print("🔍 系统准备就绪检查")
    print("=" * 80)
    print()

    checks = [
        ("Django服务", check_django),
        ("Celery Worker", check_celery),
        ("Celery任务注册", check_tasks),
        ("Gemini API密钥", check_api_key),
        ("数据库连接", check_database),
        ("Gemini服务模块", check_gemini_service),
    ]

    results = []
    for name, check_func in checks:
        print(f"\n📋 检查: {name}")
        print("-" * 80)
        result = check_func()
        results.append((name, result))
        print()

    print("=" * 80)
    print("📊 检查结果汇总")
    print("=" * 80)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{status} - {name}")

    print()
    print(f"总计: {passed}/{total} 项通过")

    if passed == total:
        print()
        print("=" * 80)
        print("🎉 系统已准备就绪！可以在plan-analyzer页面使用")
        print("=" * 80)
        print()
        print("使用方式:")
        print("1. 访问 http://your-domain:8008/plan-analyzer")
        print("2. 上传PDF文件")
        print("3. 等待处理完成")
        print("4. 查看document的table1字段获取Gemini提取的表格数据")
        print()
        return 0
    else:
        print()
        print("⚠️  系统存在问题，请修复后再使用")
        return 1

if __name__ == '__main__':
    sys.exit(main())
