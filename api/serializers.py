from rest_framework import serializers
from .models import InsurancePolicy, CustomerCase, PlanTable
import json

class InsurancePolicySerializer(serializers.ModelSerializer):
    """保险策略序列化器"""

    # 自定义字段，将JSON字符串转换为对象（仅在字段存在时）
    table1 = serializers.SerializerMethodField()
    table2 = serializers.SerializerMethodField()

    def get_table1(self, obj):
        """将table1 JSON字符串转换为对象"""
        if hasattr(obj, 'table1') and obj.table1:
            try:
                return json.loads(obj.table1)
            except (json.JSONDecodeError, TypeError):
                return None
        return None

    def get_table2(self, obj):
        """将table2 JSON字符串转换为对象"""
        if hasattr(obj, 'table2') and obj.table2:
            try:
                return json.loads(obj.table2)
            except (json.JSONDecodeError, TypeError):
                return None
        return None

    class Meta:
        model = InsurancePolicy
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class PlanTableSerializer(serializers.ModelSerializer):
    """计划书表格序列化器"""

    class Meta:
        model = PlanTable
        fields = [
            'id',
            'table_number',
            'table_name',
            'row_count',
            'fields',
            'html_source',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at')


class CustomerCaseSerializer(serializers.ModelSerializer):
    """客户案例序列化器"""

    # 添加格式化显示的字段
    income_display = serializers.SerializerMethodField()
    premium_display = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()

    def get_income_display(self, obj):
        """格式化显示年收入"""
        return f"¥{obj.annual_income:,.0f}"

    def get_premium_display(self, obj):
        """格式化显示年缴保费总额"""
        return f"¥{obj.total_annual_premium:,.0f}"

    def get_product_count(self, obj):
        """获取推荐产品数量"""
        return len(obj.recommended_products) if obj.recommended_products else 0

    class Meta:
        model = CustomerCase
        fields = [
            'id',
            'title',
            'life_stage',
            'customer_age',
            'annual_income',
            'income_display',
            'family_structure',
            'insurance_needs',
            'budget_suggestion',
            'recommended_products',
            'total_annual_premium',
            'premium_display',
            'product_count',
            'case_description',
            'key_points',
            'case_image',
            'sort_order',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at', 'income_display', 'premium_display', 'product_count')
