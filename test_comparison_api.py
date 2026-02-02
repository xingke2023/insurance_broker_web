#!/usr/bin/env python3
"""
测试对比API端点
"""
import os
import sys
import django

# 设置Django环境
sys.path.insert(0, '/var/www/harry-insurance2')
os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import User
from api.comparison_views import direct_compare_stream
from rest_framework.test import force_authenticate

# 创建测试请求
factory = RequestFactory()

# 获取或创建测试用户
try:
    user = User.objects.first()
    if not user:
        print("❌ 没有用户，请先创建用户")
        sys.exit(1)

    print(f"✅ 使用用户: {user.username}")

    # 创建POST请求（不带文件）
    request = factory.post('/api/comparison/direct-compare-stream/')
    force_authenticate(request, user=user)

    # 调用视图
    print("📤 测试API端点...")
    response = direct_compare_stream(request)

    print(f"✅ 响应状态码: {response.status_code}")
    print(f"   响应类型: {type(response)}")

except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()
