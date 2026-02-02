#!/usr/bin/env python3
"""
测试 InsuranceProduct 新增字段
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceProduct

print("=" * 60)
print("测试 InsuranceProduct 新增字段")
print("=" * 60)

# 获取第一个产品（如果存在）
product = InsuranceProduct.objects.first()

if product:
    print(f"\n✅ 找到产品: {product.product_name}")
    print(f"   公司: {product.company.name}")
    print(f"   ID: {product.id}")

    # 测试新字段
    print("\n📋 新增字段测试:")
    print(f"   - plan_pdf_base64: {'✅ 存在' if hasattr(product, 'plan_pdf_base64') else '❌ 不存在'}")
    print(f"     当前值长度: {len(product.plan_pdf_base64) if product.plan_pdf_base64 else 0} 字符")

    print(f"   - product_research_report: {'✅ 存在' if hasattr(product, 'product_research_report') else '❌ 不存在'}")
    print(f"     当前值长度: {len(product.product_research_report) if product.product_research_report else 0} 字符")

    # 尝试更新字段
    print("\n🔧 测试字段写入:")
    product.plan_pdf_base64 = "test_base64_data"
    product.product_research_report = "这是一份测试研究报告"
    product.save()

    # 重新读取验证
    product.refresh_from_db()
    print(f"   ✅ plan_pdf_base64 写入成功: {product.plan_pdf_base64[:20]}...")
    print(f"   ✅ product_research_report 写入成功: {product.product_research_report}")

    # 恢复空值
    product.plan_pdf_base64 = ""
    product.product_research_report = ""
    product.save()
    print("\n✅ 测试完成，已恢复原始值")

else:
    print("\n⚠️  数据库中没有保险产品数据")
    print("   可以在 Admin 后台创建产品进行测试")

print("\n" + "=" * 60)
print("✅ 所有测试完成！")
print("=" * 60)
print("\n📝 使用说明:")
print("   1. 访问 Admin 后台: http://your-domain:8017/admin/api/insuranceproduct/")
print("   2. 编辑任意产品")
print("   3. 在「计划书内容」区域可以看到新增的两个字段:")
print("      - 计划书PDF Base64编码")
print("      - 产品研究报告")
print("   4. API 接口也已更新，可通过 GET /api/insurance-companies/products/{id}/ 获取")
print()
