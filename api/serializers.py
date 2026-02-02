from rest_framework import serializers
from .models import InsurancePolicy, CustomerCase, PlanTable, ComparisonReport, PlanDocument, PlanComparison, ProductPromotion, CompanyNews
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
            'category',
            'tags',
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
            'content',
            'key_points',
            'case_image',
            'sort_order',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at', 'income_display', 'premium_display', 'product_count')


class PlanDocumentSimpleSerializer(serializers.ModelSerializer):
    """计划书文档简化序列化器（用于对比报告）"""

    class Meta:
        model = PlanDocument
        fields = [
            'id',
            'file_name',
            'insured_name',
            'insured_age',
            'insured_gender',
            'insurance_product',
            'insurance_company',
            'annual_premium',
            'payment_years',
            'total_premium',
            'sum_assured',
            'insurance_period'
        ]


class ComparisonReportListSerializer(serializers.ModelSerializer):
    """对比报告列表序列化器（简化版）"""
    document1_name = serializers.CharField(source='document1.file_name', read_only=True)
    document2_name = serializers.CharField(source='document2.file_name', read_only=True)
    document3_name = serializers.CharField(source='document3.file_name', read_only=True, allow_null=True)

    class Meta:
        model = ComparisonReport
        fields = [
            'id',
            'comparison_title',
            'document1_name',
            'document2_name',
            'document3_name',
            'status',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at')


class ComparisonReportSerializer(serializers.ModelSerializer):
    """对比报告详细序列化器"""
    document1_detail = PlanDocumentSimpleSerializer(source='document1', read_only=True)
    document2_detail = PlanDocumentSimpleSerializer(source='document2', read_only=True)
    document3_detail = PlanDocumentSimpleSerializer(source='document3', read_only=True)

    class Meta:
        model = ComparisonReport
        fields = [
            'id',
            'comparison_title',
            'document1',
            'document2',
            'document3',
            'document1_detail',
            'document2_detail',
            'document3_detail',
            'comparison_result',
            'comparison_summary',
            'status',
            'error_message',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at')



class PlanComparisonSerializer(serializers.ModelSerializer):
    """计划书对比序列化器"""

    class Meta:
        model = PlanComparison
        fields = [
            'id',
            'pdf1_name',
            'pdf2_name',
            'pdf3_name',
            'comparison_report',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at')

    def to_representation(self, instance):
        """自定义序列化输出，不包含base64数据（太大）"""
        representation = super().to_representation(instance)
        # 不返回base64字段，以减少响应大小
        return representation


class ProductPromotionSerializer(serializers.ModelSerializer):
    """产品宣传材料序列化器"""
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)

    class Meta:
        model = ProductPromotion
        fields = [
            'id',
            'title',
            'content_type',
            'content_type_display',
            'description',
            'url',
            'pdf_file',
            'thumbnail',
            'published_date',
            'view_count',
            'created_at'
        ]
        read_only_fields = ('view_count', 'created_at')


class CompanyNewsSerializer(serializers.ModelSerializer):
    """公司新闻与宣传序列化器"""
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = CompanyNews
        fields = [
            'id',
            'company_name',
            'title',
            'content_type',
            'content_type_display',
            'description',
            'content',
            'url',
            'pdf_file',
            'thumbnail',
            'published_date',
            'is_featured',
            'view_count',
            'created_at'
        ]
        read_only_fields = ('view_count', 'created_at', 'company_name')

