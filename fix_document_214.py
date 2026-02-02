#!/usr/bin/env python3
"""
修复文档214的policy_info数据
从table1的policy_info中提取数据并更新到数据库字段
"""
import os
import sys
import django

# 设置Django环境
sys.path.append('/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import PlanDocument
import json

def fix_document_214():
    """修复文档214的数据"""
    try:
        doc = PlanDocument.objects.get(id=214)
        print(f"📄 文档ID: {doc.id}")
        print(f"📄 文件名: {doc.file_name}")
        print()

        # 检查table1是否存在
        if not doc.table1:
            print("❌ table1字段为空，无法修复")
            return

        # 解析table1 JSON
        table1_data = json.loads(doc.table1)
        policy_info = table1_data.get('policy_info', {})

        if not policy_info:
            print("❌ policy_info不存在")
            return

        print("📋 原始policy_info:")
        print(json.dumps(policy_info, ensure_ascii=False, indent=2))
        print()

        # 提取数据（兼容英文字段名）
        updates = {}

        # 受保人信息
        insured_name = policy_info.get('姓名') or policy_info.get('insured_name')
        if insured_name:
            doc.insured_name = insured_name
            updates['insured_name'] = insured_name

        insured_age = policy_info.get('年龄') or policy_info.get('insured_age')
        if insured_age:
            try:
                doc.insured_age = int(str(insured_age).replace('岁', '').replace('歲', '').strip())
                updates['insured_age'] = doc.insured_age
            except (ValueError, AttributeError):
                pass

        insured_gender = policy_info.get('性别') or policy_info.get('insured_gender')
        if insured_gender:
            doc.insured_gender = insured_gender
            updates['insured_gender'] = insured_gender

        # 保险产品信息
        insurance_company = policy_info.get('保险公司名称') or policy_info.get('insurance_company')
        if insurance_company:
            doc.insurance_company = insurance_company
            updates['insurance_company'] = insurance_company

        insurance_product = policy_info.get('产品名称') or policy_info.get('product_name')
        if insurance_product:
            doc.insurance_product = insurance_product
            updates['insurance_product'] = insurance_product

        # 保费信息
        sum_assured = policy_info.get('保额') or policy_info.get('notional_amount')
        if sum_assured:
            try:
                sum_assured_str = str(sum_assured).replace(',', '').strip()
                doc.sum_assured = float(sum_assured_str)
                updates['sum_assured'] = doc.sum_assured
            except (ValueError, AttributeError):
                pass

        annual_premium = policy_info.get('年缴保费') or policy_info.get('annual_premium')
        if annual_premium:
            try:
                annual_premium_str = str(annual_premium).replace(',', '').strip()
                doc.annual_premium = float(annual_premium_str)
                updates['annual_premium'] = doc.annual_premium
            except (ValueError, AttributeError):
                pass

        payment_years = policy_info.get('缴费年数') or policy_info.get('premium_payment_term')
        if payment_years:
            try:
                payment_years_str = str(payment_years).replace('年', '').replace(' ', '').strip()
                doc.payment_years = int(payment_years_str)
                updates['payment_years'] = doc.payment_years
            except (ValueError, AttributeError):
                pass

        # 计算总保费
        if doc.annual_premium and doc.payment_years:
            doc.total_premium = doc.annual_premium * doc.payment_years
            updates['total_premium'] = doc.total_premium

        insurance_period = policy_info.get('保险期限') or policy_info.get('coverage_period')
        if insurance_period:
            doc.insurance_period = insurance_period
            updates['insurance_period'] = insurance_period

        # 保存到数据库
        doc.save(update_fields=[
            'insured_name', 'insured_age', 'insured_gender',
            'insurance_company', 'insurance_product',
            'sum_assured', 'annual_premium', 'payment_years', 'total_premium', 'insurance_period'
        ])

        print("✅ 更新成功！")
        print()
        print("📊 更新的字段:")
        for key, value in updates.items():
            print(f"   {key}: {value}")

        return True

    except PlanDocument.DoesNotExist:
        print("❌ 文档214不存在")
        return False
    except Exception as e:
        print(f"❌ 修复失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    fix_document_214()
