#!/usr/bin/env python3
"""
测试客户案例标签数据
检查数据库中存储的tags是否正确
"""

import os
import django
import json

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import CustomerCase

def test_tags():
    """测试所有案例的tags字段"""
    print("=" * 80)
    print("客户案例标签数据检查")
    print("=" * 80)

    cases = CustomerCase.objects.filter(is_active=True).order_by('id')

    if not cases.exists():
        print("❌ 数据库中没有启用的客户案例")
        return

    print(f"\n共有 {cases.count()} 个启用的案例\n")

    # 检查每个案例的标签
    for case in cases:
        print(f"案例 ID: {case.id}")
        print(f"标题: {case.title}")
        print(f"Tags类型: {type(case.tags)}")
        print(f"Tags内容: {case.tags}")
        print(f"Tags JSON: {json.dumps(case.tags, ensure_ascii=False)}")

        if case.tags:
            print(f"第一个标签: '{case.tags[0]}'")
            print(f"标签数量: {len(case.tags)}")
        else:
            print("⚠️ 警告: 该案例没有标签")

        print("-" * 80)

    # 统计标签使用情况
    print("\n标签使用统计:")
    print("=" * 80)

    all_tags = {}
    for case in cases:
        if case.tags:
            for tag in case.tags:
                all_tags[tag] = all_tags.get(tag, 0) + 1

    for tag, count in sorted(all_tags.items(), key=lambda x: x[1], reverse=True):
        print(f"  {tag}: {count} 个案例")

    # 检查标签是否匹配前端配置
    print("\n前端标签配置检查:")
    print("=" * 80)

    expected_tags = ['扶幼保障期', '收入成长期', '责任高峰期', '责任递减期', '退休期']

    for tag in expected_tags:
        if tag in all_tags:
            print(f"✅ {tag} - 已使用 ({all_tags[tag]} 个案例)")
        else:
            print(f"⚠️ {tag} - 未使用")

    # 检查是否有前端不支持的标签
    unsupported_tags = set(all_tags.keys()) - set(expected_tags)
    if unsupported_tags:
        print(f"\n⚠️ 发现前端不支持的标签: {unsupported_tags}")

if __name__ == '__main__':
    test_tags()
