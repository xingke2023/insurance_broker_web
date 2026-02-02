"""
AI顾问API测试脚本
测试高级版API的各个功能
"""

import requests
import json
from pprint import pprint

# 配置
BASE_URL = 'http://localhost:8007/api'
USERNAME = 'admin'  # 替换为实际用户名
PASSWORD = 'admin'  # 替换为实际密码


def get_token():
    """获取JWT Token"""
    print("=" * 60)
    print("1. 获取JWT Token")
    print("=" * 60)

    response = requests.post(
        f'{BASE_URL}/auth/login/',
        json={
            'username': USERNAME,
            'password': PASSWORD
        }
    )

    if response.status_code == 200:
        data = response.json()
        token = data.get('access')
        print(f"✅ Token获取成功")
        return token
    else:
        print(f"❌ Token获取失败: {response.status_code}")
        print(response.text)
        return None


def test_get_products(token):
    """测试获取产品列表"""
    print("\n" + "=" * 60)
    print("2. 测试获取产品列表")
    print("=" * 60)

    headers = {
        'Authorization': f'Bearer {token}'
    }

    response = requests.get(
        f'{BASE_URL}/ai-consultant/products',
        headers=headers,
        params={
            'age': 35,
            'annual_income': 800000,
            'budget': 100000,
            'limit': 5
        }
    )

    print(f"状态码: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        if data['success']:
            print(f"✅ 成功获取 {data['count']} 个产品")
            if data['products']:
                print("\n前3个产品:")
                for i, product in enumerate(data['products'][:3], 1):
                    print(f"\n产品{i}: {product['product_name']}")
                    print(f"  - 公司: {product['company_name']}")
                    print(f"  - 年缴: {product['annual_premium']:,.0f} 港币")
                    print(f"  - 缴费期: {product['payment_period']} 年")
                    print(f"  - 保障类型: {product['coverage_type']}")
        else:
            print(f"❌ 失败: {data.get('error')}")
    else:
        print(f"❌ 请求失败: {response.status_code}")
        print(response.text)


def test_ai_consultation(token):
    """测试AI咨询"""
    print("\n" + "=" * 60)
    print("3. 测试AI智能咨询（高级版）")
    print("=" * 60)

    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    consultation_data = {
        # 基本信息
        'age': 35,
        'gender': '男',
        'annual_income': 800000,

        # 人生阶段
        'life_stage': '责任高峰期',

        # 家庭状况
        'family_status': '已婚有子女',
        'has_children': True,
        'children_count': 2,
        'children_ages': [5, 8],

        # 保险需求
        'main_concerns': ['子女教育', '家庭保障', '重疾保障'],
        'budget': 100000,

        # 可选字段
        'health_status': '健康',
        'occupation': '软件工程师',
        'risk_tolerance': '中等',
    }

    print("\n发送咨询请求...")
    print(f"客户信息: {consultation_data['age']}岁, {consultation_data['life_stage']}, "
          f"年收入{consultation_data['annual_income']:,}, 预算{consultation_data['budget']:,}")

    response = requests.post(
        f'{BASE_URL}/ai-consultant/consult',
        headers=headers,
        json=consultation_data
    )

    print(f"\n状态码: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        if data['success']:
            print(f"✅ AI咨询成功")
            print(f"缓存结果: {'是' if data.get('cached') else '否'}")

            result = data['data']

            # 显示客户分析
            print("\n" + "-" * 60)
            print("📊 客户分析:")
            print("-" * 60)
            print(result['customer_analysis'][:200] + "...")

            # 显示推荐产品
            print("\n" + "-" * 60)
            print("🎯 推荐产品:")
            print("-" * 60)
            for i, product in enumerate(result['recommended_products'], 1):
                print(f"\n{i}. {product['product_name']} ({product['company_name']})")
                print(f"   年缴: {product['annual_premium']:,.0f} 港币")
                print(f"   适配度: {product['suitability_score']}")
                print(f"   推荐理由: {product['reason'][:100]}...")

            # 显示预算规划
            print("\n" + "-" * 60)
            print("💰 预算规划:")
            print("-" * 60)
            budget = result['budget_planning']
            print(f"建议总保费: {budget['recommended_total']:,.0f} 港币")
            print(f"占收入比例: {budget['budget_ratio']}")
            print("分类明细:")
            for category, amount in budget['breakdown'].items():
                print(f"  - {category}: {amount:,.0f} 港币")

            # 显示匹配详情
            print("\n" + "-" * 60)
            print("📈 产品匹配评分详情:")
            print("-" * 60)
            for detail in result['matched_products_detail'][:3]:
                print(f"\n{detail['product_name']}:")
                print(f"  总分: {detail['match_score']:.1f}")
                print(f"  - 年龄: {detail['age_match_score']:.1f}")
                print(f"  - 收入: {detail['income_match_score']:.1f}")
                print(f"  - 需求: {detail['need_match_score']:.1f}")
                print(f"  - 预算: {detail['budget_match_score']:.1f}")
                print(f"  - 阶段: {detail['life_stage_match_score']:.1f}")

            # 显示注意事项
            print("\n" + "-" * 60)
            print("⚠️  注意事项:")
            print("-" * 60)
            for warning in result['warnings'][:3]:
                print(f"• {warning}")

        else:
            print(f"❌ 失败: {data.get('error')}")
    else:
        print(f"❌ 请求失败: {response.status_code}")
        if response.status_code == 429:
            print("超过频率限制，请等待后重试")
        print(response.text)


def test_consultation_stats(token):
    """测试咨询统计"""
    print("\n" + "=" * 60)
    print("4. 测试咨询统计")
    print("=" * 60)

    headers = {
        'Authorization': f'Bearer {token}'
    }

    response = requests.get(
        f'{BASE_URL}/ai-consultant/stats',
        headers=headers
    )

    print(f"状态码: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        if data['success']:
            print("✅ 统计信息获取成功")
            stats = data['stats']
            print(f"\n今日咨询次数: {stats['today_consultations']}")
            print(f"剩余配额: {stats['remaining_quota']}")
        else:
            print(f"❌ 失败: {data.get('error')}")
    else:
        print(f"❌ 请求失败: {response.status_code}")
        print(response.text)


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("AI保险顾问API测试")
    print("=" * 60)

    # 1. 获取Token
    token = get_token()
    if not token:
        print("\n❌ 无法获取Token，测试终止")
        return

    # 2. 测试获取产品列表
    test_get_products(token)

    # 3. 测试AI咨询
    test_ai_consultation(token)

    # 4. 测试咨询统计
    test_consultation_stats(token)

    print("\n" + "=" * 60)
    print("✅ 所有测试完成")
    print("=" * 60)


if __name__ == '__main__':
    main()
