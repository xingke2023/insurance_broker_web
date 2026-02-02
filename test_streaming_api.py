#!/usr/bin/env python3
"""
测试流式对比API
"""
import requests
import os

# 测试用PDF文件路径（需要实际存在的PDF）
test_pdf_1 = "/var/www/harry-insurance2/media/plan_documents/test1.pdf"
test_pdf_2 = "/var/www/harry-insurance2/media/plan_documents/test2.pdf"

# 创建测试PDF文件（如果不存在）
if not os.path.exists(test_pdf_1):
    with open(test_pdf_1, 'wb') as f:
        f.write(b'%PDF-1.4\nTest PDF content')

if not os.path.exists(test_pdf_2):
    with open(test_pdf_2, 'wb') as f:
        f.write(b'%PDF-1.4\nTest PDF content')

# 测试API
url = 'http://localhost:8017/api/comparison/direct-compare-stream/'

# 获取token（需要先登录）
login_url = 'http://localhost:8017/api/auth/login/'
login_data = {'username': 'admin', 'password': 'admin'}  # 替换为实际的用户名密码

try:
    print("🔐 登录获取token...")
    login_response = requests.post(login_url, json=login_data)
    print(f"   登录状态码: {login_response.status_code}")

    if login_response.status_code == 200:
        token = login_response.json()['access']
        print(f"   ✅ Token获取成功")

        # 准备文件
        files = {
            'pdf_1': ('test1.pdf', open(test_pdf_1, 'rb'), 'application/pdf'),
            'pdf_2': ('test2.pdf', open(test_pdf_2, 'rb'), 'application/pdf'),
        }

        data = {
            'file_name_1': 'test1.pdf',
            'file_name_2': 'test2.pdf',
            'file_count': '2',
            'title': '测试对比'
        }

        headers = {
            'Authorization': f'Bearer {token}'
        }

        print("\n📤 发送流式对比请求...")
        response = requests.post(url, files=files, data=data, headers=headers, stream=True)

        print(f"   响应状态码: {response.status_code}")
        print(f"   响应头: {dict(response.headers)}")

        if response.status_code == 200:
            print("\n✅ 开始接收流式数据:")
            for line in response.iter_lines():
                if line:
                    print(f"   {line.decode('utf-8')}")
        else:
            print(f"\n❌ 错误响应:")
            print(f"   {response.text}")
    else:
        print(f"   ❌ 登录失败: {login_response.text}")

except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()
