#!/usr/bin/env python3
"""
测试下载单页PDF API
"""
import requests
import json
import os

# API配置
BASE_URL = "http://localhost:8017"
API_ENDPOINT = f"{BASE_URL}/api/pdf/download-clean-document"

# 测试参数
DOCUMENT_ID = 254

def test_clean_pdf_download():
    """测试下载去除页眉页脚的PDF"""
    print(f"\n📄 测试下载单页PDF API")
    print(f"   文档ID: {DOCUMENT_ID}")
    print(f"   API端点: {API_ENDPOINT}")

    # 准备请求数据
    data = {
        "document_id": DOCUMENT_ID
    }

    try:
        # 发送POST请求（不需要认证，因为我们直接从服务器测试）
        print(f"\n🔄 发送请求...")
        response = requests.post(
            API_ENDPOINT,
            json=data,
            headers={
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'  # 这里需要有效的token
            }
        )

        print(f"   响应状态码: {response.status_code}")
        print(f"   响应类型: {response.headers.get('content-type')}")

        if response.status_code == 200:
            # 检查是否为PDF
            content_type = response.headers.get('content-type')
            if 'application/pdf' in content_type:
                # 保存PDF文件
                output_file = f'/tmp/test_clean_document_{DOCUMENT_ID}.pdf'
                with open(output_file, 'wb') as f:
                    f.write(response.content)

                file_size = os.path.getsize(output_file)
                print(f"\n✅ 下载成功!")
                print(f"   文件保存到: {output_file}")
                print(f"   文件大小: {file_size} bytes ({file_size / 1024 / 1024:.2f} MB)")
            else:
                print(f"\n❌ 返回类型错误: {content_type}")
                print(f"   响应内容: {response.text[:200]}")
        else:
            # 打印错误信息
            print(f"\n❌ 请求失败")
            try:
                error_data = response.json()
                print(f"   错误信息: {error_data}")
            except:
                print(f"   响应内容: {response.text[:200]}")

    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_clean_pdf_download()
