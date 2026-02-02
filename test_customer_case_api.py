#!/usr/bin/env python3
"""
客户案例API测试脚本
"""

import requests
import json
from typing import Dict, Any

# API基础URL
API_BASE_URL = 'http://localhost:8017/api'

# 颜色输出
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_success(message: str):
    print(f"{Colors.GREEN}✓ {message}{Colors.RESET}")

def print_error(message: str):
    print(f"{Colors.RED}✗ {message}{Colors.RESET}")

def print_info(message: str):
    print(f"{Colors.BLUE}ℹ {message}{Colors.RESET}")

def print_warning(message: str):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.RESET}")

def print_divider():
    print(f"{Colors.BLUE}{'=' * 80}{Colors.RESET}")

def test_api(name: str, method: str, url: str, params: Dict[str, Any] = None) -> bool:
    """测试单个API端点"""
    print_info(f"测试: {name}")
    print_info(f"请求: {method} {url}")
    if params:
        print_info(f"参数: {json.dumps(params, ensure_ascii=False)}")

    try:
        if method == 'GET':
            response = requests.get(url, params=params, timeout=10)
        else:
            print_error(f"不支持的HTTP方法: {method}")
            return False

        print_info(f"状态码: {response.status_code}")

        if response.status_code == 200:
            data = response.json()

            # 检查响应格式
            if 'success' in data and data['success']:
                print_success("API响应成功")

                # 打印部分数据
                if 'data' in data:
                    if isinstance(data['data'], dict):
                        if 'count' in data['data']:
                            print_info(f"数据总数: {data['data']['count']}")
                        if 'results' in data['data']:
                            print_info(f"返回记录数: {len(data['data']['results'])}")
                        elif 'cases' in data['data']:
                            print_info(f"返回案例数: {len(data['data']['cases'])}")
                    elif isinstance(data['data'], list):
                        print_info(f"返回记录数: {len(data['data'])}")

                # 打印格式化的JSON（前500个字符）
                json_str = json.dumps(data, indent=2, ensure_ascii=False)
                if len(json_str) > 500:
                    print_info(f"响应数据（前500字符）:\n{json_str[:500]}...")
                else:
                    print_info(f"响应数据:\n{json_str}")

                return True
            else:
                print_error(f"API返回失败: {data.get('message', '未知错误')}")
                return False
        else:
            print_error(f"HTTP错误: {response.status_code}")
            try:
                error_data = response.json()
                print_error(f"错误信息: {json.dumps(error_data, indent=2, ensure_ascii=False)}")
            except:
                print_error(f"响应内容: {response.text[:200]}")
            return False

    except requests.exceptions.ConnectionError:
        print_error("连接失败: 无法连接到API服务器")
        print_warning("请确保Django服务正在运行 (http://localhost:8017)")
        return False
    except requests.exceptions.Timeout:
        print_error("请求超时")
        return False
    except Exception as e:
        print_error(f"测试失败: {str(e)}")
        return False

def main():
    """运行所有API测试"""
    print_divider()
    print(f"{Colors.BLUE}客户案例API测试{Colors.RESET}")
    print_divider()
    print()

    test_results = []

    # 测试1: 获取所有案例（无参数）
    print_divider()
    result = test_api(
        name="获取所有案例（默认参数）",
        method="GET",
        url=f"{API_BASE_URL}/customer-cases/"
    )
    test_results.append(("获取所有案例", result))
    print()

    # 测试2: 按人生阶段筛选
    print_divider()
    result = test_api(
        name="按人生阶段筛选（责任高峰期）",
        method="GET",
        url=f"{API_BASE_URL}/customer-cases/",
        params={"life_stage": "责任高峰期"}
    )
    test_results.append(("按人生阶段筛选", result))
    print()

    # 测试3: 搜索案例
    print_divider()
    result = test_api(
        name="搜索案例（关键词：医疗）",
        method="GET",
        url=f"{API_BASE_URL}/customer-cases/",
        params={"search": "医疗"}
    )
    test_results.append(("搜索案例", result))
    print()

    # 测试4: 分页查询
    print_divider()
    result = test_api(
        name="分页查询（第1页，每页5条）",
        method="GET",
        url=f"{API_BASE_URL}/customer-cases/",
        params={"page": 1, "page_size": 5}
    )
    test_results.append(("分页查询", result))
    print()

    # 测试5: 排序查询
    print_divider()
    result = test_api(
        name="排序查询（按年收入倒序）",
        method="GET",
        url=f"{API_BASE_URL}/customer-cases/",
        params={"ordering": "-annual_income"}
    )
    test_results.append(("排序查询", result))
    print()

    # 测试6: 获取人生阶段列表
    print_divider()
    result = test_api(
        name="获取人生阶段列表",
        method="GET",
        url=f"{API_BASE_URL}/customer-cases/life-stages/"
    )
    test_results.append(("获取人生阶段列表", result))
    print()

    # 测试7: 获取统计信息
    print_divider()
    result = test_api(
        name="获取统计信息",
        method="GET",
        url=f"{API_BASE_URL}/customer-cases/statistics/"
    )
    test_results.append(("获取统计信息", result))
    print()

    # 测试8: 按人生阶段获取案例
    print_divider()
    result = test_api(
        name="按人生阶段获取案例（收入成长期）",
        method="GET",
        url=f"{API_BASE_URL}/customer-cases/by-stage/收入成长期/"
    )
    test_results.append(("按人生阶段获取案例", result))
    print()

    # 测试9: 获取单个案例详情（假设ID为1）
    print_divider()
    print_warning("测试获取单个案例详情（ID=1）")
    print_warning("如果数据库中没有案例，此测试会失败（预期行为）")
    result = test_api(
        name="获取单个案例详情（ID=1）",
        method="GET",
        url=f"{API_BASE_URL}/customer-cases/1/"
    )
    test_results.append(("获取单个案例详情", result))
    print()

    # 测试10: 无效的人生阶段（应该返回400错误）
    print_divider()
    print_warning("测试无效的人生阶段（预期会返回400错误）")
    result = test_api(
        name="无效的人生阶段（错误测试）",
        method="GET",
        url=f"{API_BASE_URL}/customer-cases/by-stage/无效阶段/"
    )
    # 这个测试预期会失败，所以反转结果
    test_results.append(("无效阶段错误处理", not result))
    print()

    # 打印测试总结
    print_divider()
    print(f"{Colors.BLUE}测试总结{Colors.RESET}")
    print_divider()

    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)

    print()
    for test_name, result in test_results:
        if result:
            print_success(f"{test_name}: 通过")
        else:
            print_error(f"{test_name}: 失败")

    print()
    print_divider()
    if passed == total:
        print_success(f"所有测试通过! ({passed}/{total})")
    else:
        print_warning(f"部分测试失败: {passed}/{total} 通过")
    print_divider()

    return passed == total

if __name__ == "__main__":
    try:
        success = main()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print()
        print_warning("测试被用户中断")
        exit(1)
    except Exception as e:
        print()
        print_error(f"测试过程中发生错误: {str(e)}")
        exit(1)
