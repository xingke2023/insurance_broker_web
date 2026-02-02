#!/usr/bin/env python3
"""
AI保险顾问功能测试脚本
测试不同客户信息输入的AI推荐准确性
"""

import os
import sys
import django
import json
from decimal import Decimal

# 设置Django环境
sys.path.append('/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceProduct
from api.ai_consultant_service import AIConsultantService, CustomerInfo


class Colors:
    """终端颜色"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(text):
    """打印标题"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(80)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}\n")


def print_success(text):
    """打印成功信息"""
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")


def print_info(text):
    """打印信息"""
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")


def print_warning(text):
    """打印警告"""
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")


def print_error(text):
    """打印错误"""
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")


def get_test_scenarios():
    """获取测试场景"""
    return [
        {
            "name": "场景1：30岁新婚夫妇",
            "customer_info": {
                "age": 30,
                "gender": "男",
                "annual_income": 600000,
                "life_stage": "扶幼保障期",
                "family_status": "已婚",
                "has_children": False,
                "children_count": 0,
                "children_ages": [],
                "main_concerns": ["医疗保障", "重疾保障", "家庭保障"],
                "budget": 80000,
                "health_status": "健康",
                "has_chronic_disease": False,
                "occupation": "工程师",
                "risk_tolerance": "中等",
                "existing_coverage": {},
                "assets": 0,
                "liabilities": 0
            },
            "expectations": {
                "recommended_count": 3,
                "budget_within_range": True,
                "life_stage_match": True,
                "min_recommendation_length": 200
            }
        },
        {
            "name": "场景2：40岁中年家庭（2个子女）",
            "customer_info": {
                "age": 40,
                "gender": "男",
                "annual_income": 1200000,
                "life_stage": "责任高峰期",
                "family_status": "已婚有子女",
                "has_children": True,
                "children_count": 2,
                "children_ages": [10, 13],
                "main_concerns": ["家庭保障", "重疾保障", "子女教育", "医疗保障"],
                "budget": 200000,
                "health_status": "健康",
                "has_chronic_disease": False,
                "occupation": "企业高管",
                "risk_tolerance": "中等",
                "existing_coverage": {},
                "assets": 0,
                "liabilities": 0
            },
            "expectations": {
                "recommended_count": 3,
                "budget_within_range": True,
                "life_stage_match": True,
                "min_recommendation_length": 200
            }
        },
        {
            "name": "场景3：55岁退休准备期",
            "customer_info": {
                "age": 55,
                "gender": "女",
                "annual_income": 800000,
                "life_stage": "责任递减期",
                "family_status": "已婚",
                "has_children": True,
                "children_count": 2,
                "children_ages": [25, 28],
                "main_concerns": ["退休规划", "医疗保障", "长期照护"],
                "budget": 100000,
                "health_status": "健康",
                "has_chronic_disease": False,
                "occupation": "会计师",
                "risk_tolerance": "低",
                "existing_coverage": {},
                "assets": 0,
                "liabilities": 0
            },
            "expectations": {
                "recommended_count": 3,
                "budget_within_range": True,
                "life_stage_match": True,
                "min_recommendation_length": 200
            }
        },
        {
            "name": "场景4：35岁单身专业人士（高收入）",
            "customer_info": {
                "age": 35,
                "gender": "女",
                "annual_income": 1500000,
                "life_stage": "收入成长期",
                "family_status": "单身",
                "has_children": False,
                "children_count": 0,
                "children_ages": [],
                "main_concerns": ["重疾保障", "储蓄规划", "医疗保障"],
                "budget": 150000,
                "health_status": "健康",
                "has_chronic_disease": False,
                "occupation": "医生",
                "risk_tolerance": "中等",
                "existing_coverage": {},
                "assets": 0,
                "liabilities": 0
            },
            "expectations": {
                "recommended_count": 3,
                "budget_within_range": True,
                "life_stage_match": True,
                "min_recommendation_length": 200
            }
        },
        {
            "name": "场景5：低预算年轻人",
            "customer_info": {
                "age": 25,
                "gender": "男",
                "annual_income": 400000,
                "life_stage": "收入成长期",
                "family_status": "单身",
                "has_children": False,
                "children_count": 0,
                "children_ages": [],
                "main_concerns": ["意外保障", "医疗保障"],
                "budget": 30000,
                "health_status": "健康",
                "has_chronic_disease": False,
                "occupation": "程序员",
                "risk_tolerance": "高",
                "existing_coverage": {},
                "assets": 0,
                "liabilities": 0
            },
            "expectations": {
                "recommended_count": 3,
                "budget_within_range": True,
                "life_stage_match": True,
                "min_recommendation_length": 200
            }
        }
    ]


def validate_result(result, expectations, customer_info):
    """验证测试结果"""
    validation_results = {
        "passed": [],
        "failed": [],
        "warnings": []
    }

    # 检查1: 推荐产品数量
    recommended_count = len(result.get("recommended_products", []))
    if recommended_count == expectations["recommended_count"]:
        validation_results["passed"].append(
            f"推荐产品数量正确: {recommended_count}个"
        )
    else:
        validation_results["failed"].append(
            f"推荐产品数量错误: 期望{expectations['recommended_count']}个，实际{recommended_count}个"
        )

    # 检查2: 预算合理性
    total_premium = result.get("total_annual_premium", 0)
    budget = customer_info["budget"]
    if total_premium <= budget * 1.2:  # 允许超出20%
        validation_results["passed"].append(
            f"预算合理: 总保费{total_premium:,.0f}元，预算{budget:,.0f}元"
        )
    else:
        validation_results["warnings"].append(
            f"预算超出较多: 总保费{total_premium:,.0f}元，预算{budget:,.0f}元（超出{(total_premium/budget-1)*100:.1f}%）"
        )

    # 检查3: 推荐理由长度
    for i, product in enumerate(result.get("recommended_products", []), 1):
        reason = product.get("reason", "")
        reason_length = len(reason)
        if reason_length >= expectations["min_recommendation_length"]:
            validation_results["passed"].append(
                f"产品{i}推荐理由充分: {reason_length}字"
            )
        else:
            validation_results["failed"].append(
                f"产品{i}推荐理由不足: {reason_length}字（最少{expectations['min_recommendation_length']}字）"
            )

    # 检查4: 客户分析完整性
    customer_analysis = result.get("customer_analysis", "")
    if len(customer_analysis) >= 300:
        validation_results["passed"].append(
            f"客户分析详细: {len(customer_analysis)}字"
        )
    else:
        validation_results["failed"].append(
            f"客户分析不足: {len(customer_analysis)}字（建议300字以上）"
        )

    # 检查5: 风险评估完整性
    risk_assessment = result.get("risk_assessment", "")
    if len(risk_assessment) >= 200:
        validation_results["passed"].append(
            f"风险评估详细: {len(risk_assessment)}字"
        )
    else:
        validation_results["failed"].append(
            f"风险评估不足: {len(risk_assessment)}字（建议200字以上）"
        )

    # 检查6: 保障缺口分析
    coverage_gap = result.get("coverage_gap", {})
    if len(coverage_gap) >= 4:
        validation_results["passed"].append(
            f"保障缺口分析完整: {len(coverage_gap)}项"
        )
    else:
        validation_results["failed"].append(
            f"保障缺口分析不完整: {len(coverage_gap)}项（建议4项：寿险、重疾、医疗、意外）"
        )

    # 检查7: 专业建议长度
    professional_advice = result.get("professional_advice", "")
    if len(professional_advice) >= 400:
        validation_results["passed"].append(
            f"专业建议详细: {len(professional_advice)}字"
        )
    else:
        validation_results["failed"].append(
            f"专业建议不足: {len(professional_advice)}字（建议400字以上）"
        )

    # 检查8: 注意事项数量
    warnings = result.get("warnings", [])
    if len(warnings) >= 5:
        validation_results["passed"].append(
            f"注意事项充分: {len(warnings)}条"
        )
    else:
        validation_results["failed"].append(
            f"注意事项不足: {len(warnings)}条（建议至少5条）"
        )

    # 检查9: 保障计划完整性
    protection_plan = result.get("protection_plan", {})
    required_keys = ["immediate_protection", "medium_term_plan", "long_term_plan"]
    missing_keys = [key for key in required_keys if key not in protection_plan]
    if not missing_keys:
        validation_results["passed"].append("保障计划完整（短期/中期/长期）")
    else:
        validation_results["failed"].append(
            f"保障计划不完整: 缺少{', '.join(missing_keys)}"
        )

    # 检查10: 预算规划
    budget_planning = result.get("budget_planning", {})
    if "recommended_total" in budget_planning and "breakdown" in budget_planning:
        validation_results["passed"].append("预算规划完整")
    else:
        validation_results["failed"].append("预算规划不完整")

    return validation_results


def test_scenario(service, scenario, products):
    """测试单个场景"""
    print_header(scenario["name"])

    # 打印客户信息
    print_info("客户信息:")
    customer_info = scenario["customer_info"]
    print(f"  年龄: {customer_info['age']}岁")
    print(f"  年收入: {customer_info['annual_income']:,}元")
    print(f"  人生阶段: {customer_info['life_stage']}")
    print(f"  家庭状况: {customer_info['family_status']}")
    print(f"  预算: {customer_info['budget']:,}元")
    print(f"  关注点: {', '.join(customer_info['main_concerns'])}")

    try:
        # 调用AI咨询服务
        print_info("\n开始AI分析...")
        result = service.consult(customer_info, products)

        # 验证结果
        print_info("\n验证结果...")
        validation = validate_result(result, scenario["expectations"], customer_info)

        # 打印验证结果
        print("\n" + "="*80)
        print(f"{Colors.BOLD}验证结果:{Colors.ENDC}")
        print("="*80)

        # 通过的检查
        if validation["passed"]:
            print(f"\n{Colors.OKGREEN}{Colors.BOLD}✓ 通过的检查 ({len(validation['passed'])}):{Colors.ENDC}")
            for item in validation["passed"]:
                print(f"{Colors.OKGREEN}  ✓ {item}{Colors.ENDC}")

        # 失败的检查
        if validation["failed"]:
            print(f"\n{Colors.FAIL}{Colors.BOLD}✗ 失败的检查 ({len(validation['failed'])}):{Colors.ENDC}")
            for item in validation["failed"]:
                print(f"{Colors.FAIL}  ✗ {item}{Colors.ENDC}")

        # 警告
        if validation["warnings"]:
            print(f"\n{Colors.WARNING}{Colors.BOLD}⚠ 警告 ({len(validation['warnings'])}):{Colors.ENDC}")
            for item in validation["warnings"]:
                print(f"{Colors.WARNING}  ⚠ {item}{Colors.ENDC}")

        # 打印推荐产品概要
        print("\n" + "="*80)
        print(f"{Colors.BOLD}推荐产品概要:{Colors.ENDC}")
        print("="*80)
        for i, product in enumerate(result.get("recommended_products", []), 1):
            print(f"\n{Colors.OKCYAN}产品{i}: {product.get('product_name', 'N/A')}{Colors.ENDC}")
            print(f"  保险公司: {product.get('company_name', 'N/A')}")
            print(f"  年缴保费: {product.get('annual_premium', 0):,}元")
            print(f"  匹配度: {product.get('suitability_score', 0):.1f}分")
            reason = product.get('reason', '')
            print(f"  推荐理由长度: {len(reason)}字")

        # 计算总体评分
        total_checks = len(validation["passed"]) + len(validation["failed"])
        passed_checks = len(validation["passed"])
        score = (passed_checks / total_checks * 100) if total_checks > 0 else 0

        print("\n" + "="*80)
        if score >= 90:
            print(f"{Colors.OKGREEN}{Colors.BOLD}总体评分: {score:.1f}分 - 优秀{Colors.ENDC}")
        elif score >= 80:
            print(f"{Colors.OKGREEN}总体评分: {score:.1f}分 - 良好{Colors.ENDC}")
        elif score >= 70:
            print(f"{Colors.WARNING}总体评分: {score:.1f}分 - 合格{Colors.ENDC}")
        else:
            print(f"{Colors.FAIL}总体评分: {score:.1f}分 - 需要改进{Colors.ENDC}")
        print("="*80)

        return {
            "success": True,
            "score": score,
            "validation": validation,
            "result": result
        }

    except Exception as e:
        print_error(f"\n测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "score": 0,
            "error": str(e)
        }


def main():
    """主函数"""
    print_header("AI保险顾问功能测试")

    # 初始化服务
    print_info("初始化AI咨询服务...")
    try:
        service = AIConsultantService()
        print_success("AI咨询服务初始化成功")
    except Exception as e:
        print_error(f"AI咨询服务初始化失败: {str(e)}")
        return

    # 获取产品列表
    print_info("获取产品列表...")
    products_queryset = InsuranceProduct.objects.select_related('company').all()
    products = []
    for product in products_queryset:
        products.append({
            'id': product.id,
            'product_name': product.product_name,
            'company_name': product.company.name if product.company else 'N/A',
            'annual_premium': float(product.annual_premium),
            'payment_period': product.payment_period,
            'coverage_type': product.coverage_type or '',
            'target_age_min': product.target_age_min,
            'target_age_max': product.target_age_max,
            'target_life_stage': product.target_life_stage or '',
            'min_annual_income': float(product.min_annual_income) if product.min_annual_income else 0,
            'features': product.features or [],
            'description': product.description or '',
            'ai_recommendation_prompt': product.ai_recommendation_prompt or ''
        })
    print_success(f"获取到 {len(products)} 个产品")

    if len(products) == 0:
        print_error("产品列表为空，无法进行测试")
        return

    # 获取测试场景
    scenarios = get_test_scenarios()
    print_info(f"准备测试 {len(scenarios)} 个场景\n")

    # 执行测试
    results = []
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n{'='*80}")
        print(f"{Colors.BOLD}测试进度: {i}/{len(scenarios)}{Colors.ENDC}")
        print(f"{'='*80}")

        result = test_scenario(service, scenario, products)
        results.append({
            "scenario_name": scenario["name"],
            **result
        })

        # 等待用户确认（可选）
        # input("\n按Enter键继续下一个测试...")

    # 打印总结
    print_header("测试总结")

    successful_tests = [r for r in results if r["success"]]
    failed_tests = [r for r in results if not r["success"]]

    print(f"\n总测试数: {len(results)}")
    print(f"{Colors.OKGREEN}成功: {len(successful_tests)}{Colors.ENDC}")
    print(f"{Colors.FAIL}失败: {len(failed_tests)}{Colors.ENDC}")

    if successful_tests:
        average_score = sum(r["score"] for r in successful_tests) / len(successful_tests)
        print(f"\n{Colors.BOLD}平均评分: {average_score:.1f}分{Colors.ENDC}")

        print("\n各场景评分:")
        for r in successful_tests:
            score_color = Colors.OKGREEN if r["score"] >= 90 else (
                Colors.WARNING if r["score"] >= 70 else Colors.FAIL
            )
            print(f"  {score_color}{r['scenario_name']}: {r['score']:.1f}分{Colors.ENDC}")

    if failed_tests:
        print(f"\n{Colors.FAIL}失败的场景:{Colors.ENDC}")
        for r in failed_tests:
            print(f"  {Colors.FAIL}✗ {r['scenario_name']}: {r.get('error', 'Unknown error')}{Colors.ENDC}")

    print("\n" + "="*80)
    print(f"{Colors.BOLD}测试完成！{Colors.ENDC}")
    print("="*80)


if __name__ == "__main__":
    main()
