from django.db import models
from django.contrib.auth.models import User, Group


class WeChatUser(models.Model):
    """微信用户模型"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wechat_profile', verbose_name='关联用户')
    openid = models.CharField(max_length=100, unique=True, verbose_name='微信OpenID')
    session_key = models.CharField(max_length=100, verbose_name='会话密钥', blank=True)
    unionid = models.CharField(max_length=100, verbose_name='UnionID', blank=True, null=True, db_index=True)
    nickname = models.CharField(max_length=100, verbose_name='昵称', blank=True)
    avatar_url = models.URLField(verbose_name='头像URL', blank=True)
    phone_number = models.CharField(max_length=20, verbose_name='手机号', blank=True)

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'wechat_users'
        verbose_name = '微信用户'
        verbose_name_plural = '微信用户'

    def __str__(self):
        return f"{self.nickname or self.openid}"


class InsurancePolicy(models.Model):
    """保险策略模型"""
    policy_number = models.CharField(max_length=50, unique=True, verbose_name='保单号')
    customer_name = models.CharField(max_length=100, verbose_name='客户姓名')
    policy_type = models.CharField(max_length=50, verbose_name='保险类型')
    premium = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='保费')
    start_date = models.DateField(verbose_name='起始日期')
    end_date = models.DateField(verbose_name='结束日期')
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', '有效'),
            ('expired', '已过期'),
            ('cancelled', '已取消')
        ],
        default='active',
        verbose_name='状态'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'insurance_policies'
        verbose_name = '保险策略'
        verbose_name_plural = '保险策略'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.policy_number} - {self.customer_name}"


class PlanDocument(models.Model):
    """计划书文档模型 - 主表"""
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, verbose_name='上传用户', null=True, blank=True)
    file_name = models.CharField(max_length=255, verbose_name='文件名')
    file_path = models.FileField(upload_to='plan_documents/', verbose_name='文件路径')
    file_size = models.IntegerField(verbose_name='文件大小(字节)')

    # 受保人信息
    insured_name = models.CharField(max_length=100, verbose_name='受保人姓名', blank=True)
    insured_age = models.IntegerField(verbose_name='受保人年龄', null=True, blank=True)
    insured_gender = models.CharField(max_length=10, verbose_name='性别', blank=True)

    # 保险产品信息
    insurance_product = models.CharField(max_length=200, verbose_name='保险产品', blank=True)
    insurance_company = models.CharField(max_length=200, verbose_name='保险公司', blank=True)

    # 保费缴纳情况
    annual_premium = models.BigIntegerField(verbose_name='年缴保费', null=True, blank=True)
    payment_years = models.IntegerField(verbose_name='缴费年数', null=True, blank=True)
    total_premium = models.BigIntegerField(verbose_name='总保费', null=True, blank=True)

    # 保险期限
    insurance_period = models.CharField(max_length=50, verbose_name='保险期限', blank=True)

    # 基本保额
    sum_assured = models.BigIntegerField(verbose_name='基本保额', null=True, blank=True)

    # OCR识别内容
    content = models.TextField(verbose_name='识别内容', blank=True, default='')

    # AI提取的完整数据（JSON格式）
    extracted_data = models.JSONField(verbose_name='提取的完整数据', default=dict, blank=True)

    # AI分析的年度价值表数据（JSON格式）
    table = models.JSONField(verbose_name='年度价值表', default=dict, blank=True, null=True)

    # 基本计划退保价值表（longtext格式）
    table1 = models.TextField(verbose_name='基本计划退保价值表', blank=True, default='')

    # 无忧选退保价值表（longtext格式）
    table2 = models.TextField(verbose_name='无忧选退保价值表', blank=True, default='')

    # 计划书概要（AI提取，纯文本格式）
    summary = models.TextField(verbose_name='计划书概要', blank=True, default='')

    # 计划书Table源代码内容（提取所有<table>标签）
    tablecontent = models.TextField(verbose_name='Table源代码内容', blank=True, default='')

    # 计划书Table概要（AI分析表格结构）
    tablesummary = models.TextField(verbose_name='Table概要', blank=True, default='')

    # 状态
    status = models.CharField(
        max_length=20,
        choices=[
            ('uploaded', '已上传'),
            ('processing', '处理中'),
            ('completed', '已完成'),
            ('failed', '失败')
        ],
        default='uploaded',
        verbose_name='状态'
    )
    error_message = models.TextField(verbose_name='错误信息', blank=True)

    # 任务处理状态（用于追踪异步任务进度）
    processing_stage = models.CharField(
        max_length=50,
        choices=[
            ('pending', '待处理'),
            ('extracting_tablecontent', '提取表格源代码中'),
            ('tablecontent_completed', '表格源代码完成'),
            ('extracting_tablesummary', '分析表格结构中'),
            ('tablesummary_completed', '表格结构分析完成'),
            ('extracting_table_html', '提取表格HTML中'),
            ('extracting_table1', '提取退保价值表中'),
            ('extracting_basic_info', '提取基本信息中'),
            ('basic_info_completed', '基本信息完成'),
            ('extracting_table', '提取年度价值表中'),
            ('table_completed', '年度价值表完成'),
            ('extracting_summary', '提取概要中'),
            ('all_completed', '全部完成'),
            ('error', '处理出错')
        ],
        default='pending',
        verbose_name='处理阶段'
    )
    last_processed_at = models.DateTimeField(null=True, blank=True, verbose_name='最后处理时间')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'plan_documents'
        verbose_name = '计划书文档'
        verbose_name_plural = '计划书文档'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.file_name} - {self.insured_name}"


class PlanTable(models.Model):
    """计划书表格 - 存储每个计划书的各个表格"""
    plan_document = models.ForeignKey(
        PlanDocument,
        on_delete=models.CASCADE,
        related_name='plan_tables',
        verbose_name='计划书'
    )
    table_number = models.IntegerField(verbose_name='表格编号')
    table_name = models.CharField(max_length=500, verbose_name='表格名称')
    row_count = models.IntegerField(verbose_name='行数', default=0)
    fields = models.TextField(verbose_name='基本字段', blank=True, default='')
    html_source = models.TextField(verbose_name='HTML源代码', blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'plan_tables'
        verbose_name = '计划书表格'
        verbose_name_plural = '计划书表格'
        ordering = ['plan_document', 'table_number']
        unique_together = ['plan_document', 'table_number']  # 确保同一计划书的表格编号不重复

    def __str__(self):
        return f"{self.plan_document.file_name} - 表格{self.table_number}: {self.table_name}"


class AnnualValue(models.Model):
    """年度价值表 - 存储每个保单年度的退保价值"""
    plan_document = models.ForeignKey(
        PlanDocument,
        on_delete=models.CASCADE,
        related_name='annual_values',
        verbose_name='计划书'
    )

    # 保单年度
    policy_year = models.IntegerField(verbose_name='保单年度终结')

    # 退保价值
    guaranteed_cash_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='保证现金价值',
        null=True,
        blank=True
    )
    non_guaranteed_cash_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='非保证现金价值',
        null=True,
        blank=True
    )
    total_cash_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='总现金价值',
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'annual_values'
        verbose_name = '年度价值'
        verbose_name_plural = '年度价值'
        ordering = ['plan_document', 'policy_year']
        unique_together = ['plan_document', 'policy_year']  # 确保同一计划书的年度不重复

    def __str__(self):
        return f"{self.plan_document.file_name} - 第{self.policy_year}年"


class Membership(models.Model):
    """会员模型"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='membership', verbose_name='用户')

    # 会员类型
    plan_type = models.CharField(
        max_length=20,
        choices=[
            ('trial', '试用会员'),
            ('solo', 'Solo计划'),
            ('team', 'Team计划'),
            ('monthly', '包月会员'),
            ('yearly', '包年会员'),
        ],
        verbose_name='会员类型'
    )

    # 会员状态
    is_active = models.BooleanField(default=True, verbose_name='是否激活')

    # 时间信息
    start_date = models.DateTimeField(verbose_name='开始时间')
    end_date = models.DateTimeField(verbose_name='到期时间')

    # Stripe相关字段
    stripe_customer_id = models.CharField(max_length=100, verbose_name='Stripe客户ID', blank=True)
    stripe_subscription_id = models.CharField(max_length=100, verbose_name='Stripe订阅ID', blank=True)

    # 使用统计
    documents_created = models.IntegerField(default=0, verbose_name='已创建计划书数')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'memberships'
        verbose_name = '会员'
        verbose_name_plural = '会员'

    def __str__(self):
        return f"{self.user.username} - {self.get_plan_type_display()}"

    def is_valid(self):
        """检查会员是否有效"""
        from django.utils import timezone
        return self.is_active and self.end_date > timezone.now()

    def days_remaining(self):
        """剩余天数"""
        from django.utils import timezone
        if not self.is_valid():
            return 0
        delta = self.end_date - timezone.now()
        return max(0, delta.days)


class PaymentOrder(models.Model):
    """支付订单模型"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='用户')
    order_no = models.CharField(max_length=64, unique=True, verbose_name='订单号')
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='支付金额')
    description = models.CharField(max_length=200, verbose_name='订单描述')

    # 套餐信息
    plan_type = models.CharField(
        max_length=20,
        choices=[
            ('trial', '试用会员'),
            ('solo', 'Solo计划'),
            ('team', 'Team计划'),
            ('monthly', '包月会员'),
            ('yearly', '包年会员'),
        ],
        verbose_name='套餐类型',
        blank=True
    )

    # 支付方式
    payment_method = models.CharField(
        max_length=20,
        choices=[
            ('wechat', '微信支付'),
            ('stripe', 'Stripe支付'),
        ],
        default='wechat',
        verbose_name='支付方式'
    )

    # 微信支付相关
    transaction_id = models.CharField(max_length=64, verbose_name='微信支付交易号', blank=True)
    prepay_id = models.CharField(max_length=64, verbose_name='预支付交易会话标识', blank=True)

    # Stripe支付相关
    stripe_payment_intent_id = models.CharField(max_length=100, verbose_name='Stripe支付意图ID', blank=True)
    stripe_session_id = models.CharField(max_length=100, verbose_name='Stripe会话ID', blank=True)

    # 订单状态
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', '待支付'),
            ('paid', '已支付'),
            ('cancelled', '已取消'),
            ('refunded', '已退款')
        ],
        default='pending',
        verbose_name='订单状态'
    )

    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name='支付时间')

    class Meta:
        db_table = 'payment_orders'
        verbose_name = '支付订单'
        verbose_name_plural = '支付订单'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_no} - {self.amount}元"


class IPImage(models.Model):
    """用户个人IP形象模型"""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='ip_image',
        verbose_name='用户'
    )
    original_image_url = models.CharField(
        max_length=500,
        verbose_name='原始照片URL',
        blank=True
    )
    generated_image_url = models.CharField(
        max_length=500,
        verbose_name='生成的IP形象URL'
    )
    prompt = models.TextField(
        verbose_name='使用的提示语',
        blank=True
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        db_table = 'ip_images'
        verbose_name = '个人IP形象'
        verbose_name_plural = '个人IP形象'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.username} - IP形象"


class GeminiUsage(models.Model):
    """Gemini API调用统计模型"""
    GENERATION_TYPES = [
        ('ip_image', 'IP形象生成'),
        ('content_image', '文案配图生成'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='gemini_usages',
        verbose_name='用户'
    )
    generation_type = models.CharField(
        max_length=20,
        choices=GENERATION_TYPES,
        verbose_name='生成类型'
    )
    prompt = models.TextField(
        verbose_name='提示语',
        blank=True
    )
    success = models.BooleanField(
        default=True,
        verbose_name='是否成功'
    )
    error_message = models.TextField(
        verbose_name='错误信息',
        blank=True
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间',
        db_index=True
    )

    class Meta:
        db_table = 'gemini_usages'
        verbose_name = 'Gemini调用记录'
        verbose_name_plural = 'Gemini调用记录'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'generation_type', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.get_generation_type_display()} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class UserQuota(models.Model):
    """用户额度模型 - 记录用户可用的生成次数"""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='quota',
        verbose_name='用户'
    )
    available_quota = models.IntegerField(
        default=3,
        verbose_name='可用次数'
    )
    total_purchased = models.IntegerField(
        default=0,
        verbose_name='累计购买次数'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        db_table = 'user_quotas'
        verbose_name = '用户额度'
        verbose_name_plural = '用户额度'

    def __str__(self):
        return f"{self.user.username} - 可用次数: {self.available_quota}"

    def add_quota(self, amount):
        """增加额度"""
        self.available_quota += amount
        self.total_purchased += amount
        self.save()

    def consume_quota(self, amount=1):
        """消耗额度"""
        if self.available_quota >= amount:
            self.available_quota -= amount
            self.save()
            return True
        return False

    def has_quota(self, amount=1):
        """检查是否有足够额度"""
        return self.available_quota >= amount


class MembershipPlan(models.Model):
    """会员套餐模型 - 存储套餐信息和权益"""
    plan_id = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='套餐ID'
    )
    name = models.CharField(
        max_length=50,
        verbose_name='套餐名称'
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='价格'
    )
    original_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='原价',
        null=True,
        blank=True
    )
    duration = models.CharField(
        max_length=50,
        verbose_name='时长描述'
    )
    features = models.JSONField(
        verbose_name='权益列表',
        default=list,
        help_text='权益列表，例如：["权益1", "权益2", "权益3"]'
    )
    badge = models.CharField(
        max_length=50,
        verbose_name='标签',
        blank=True
    )
    is_popular = models.BooleanField(
        default=False,
        verbose_name='是否热门'
    )
    discount_info = models.CharField(
        max_length=100,
        verbose_name='优惠信息',
        blank=True
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name='排序'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='是否启用'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        db_table = 'membership_plans'
        verbose_name = '会员套餐'
        verbose_name_plural = '会员套餐'
        ordering = ['sort_order', 'id']

    def __str__(self):
        return f"{self.name} - ¥{self.price}"


class VideoProject(models.Model):
    """视频项目模型"""
    STATUS_CHOICES = [
        ('draft', '草稿'),
        ('processing', '生成中'),
        ('completed', '已完成'),
        ('failed', '失败'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='video_projects')
    title = models.CharField(max_length=200, default='未命名视频')

    # 字幕和配置
    subtitles = models.TextField(blank=True)
    scene_count = models.IntegerField(default=0)
    duration = models.FloatField(default=3.0)  # 每个场景时长
    voice = models.CharField(max_length=50, default='zh-CN-XiaoxiaoNeural')

    # 场景数据（JSON格式）
    scenes_data = models.JSONField(default=list, blank=True)

    # 状态和结果
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    taskid = models.CharField(max_length=200, blank=True, null=True, unique=True, db_index=True)  # 视频生成任务ID
    video_url = models.CharField(max_length=500, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)

    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'video_projects'
        ordering = ['-updated_at']
        verbose_name = '视频项目'
        verbose_name_plural = '视频项目'

    def __str__(self):
        return f"{self.title} - {self.user.username}"


class MediaLibrary(models.Model):
    """用户素材库模型 - 存储所有生成的图片"""
    MEDIA_TYPES = [
        ('ip_image', 'IP形象'),
        ('content_image', '文案配图'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='media_library',
        verbose_name='用户'
    )
    media_type = models.CharField(
        max_length=20,
        choices=MEDIA_TYPES,
        verbose_name='素材类型'
    )

    # 图片URL - Gemini生成的原始URL
    original_url = models.CharField(
        max_length=500,
        verbose_name='原始图片URL'
    )

    # 本地存储路径
    local_path = models.CharField(
        max_length=500,
        verbose_name='本地存储路径',
        blank=True
    )

    # 缩略图路径（可选）
    thumbnail_path = models.CharField(
        max_length=500,
        verbose_name='缩略图路径',
        blank=True
    )

    # 提示语或文案内容
    prompt = models.TextField(
        verbose_name='提示语/文案',
        blank=True
    )

    # 图片元数据
    width = models.IntegerField(
        verbose_name='图片宽度',
        null=True,
        blank=True
    )
    height = models.IntegerField(
        verbose_name='图片高度',
        null=True,
        blank=True
    )
    file_size = models.IntegerField(
        verbose_name='文件大小(字节)',
        null=True,
        blank=True
    )

    # 关联的IP形象ID（仅对content_image有效）
    related_ip_image_id = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='关联的IP形象ID'
    )

    # 是否收藏
    is_favorite = models.BooleanField(
        default=False,
        verbose_name='是否收藏'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间',
        db_index=True
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        db_table = 'media_library'
        verbose_name = '素材库'
        verbose_name_plural = '素材库'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'media_type', 'created_at']),
            models.Index(fields=['user', 'is_favorite', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.get_media_type_display()} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class InsuranceCompany(models.Model):
    """保险公司模型"""
    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='公司代码',
        help_text='例如：axa, prudential, manulife'
    )
    name = models.CharField(
        max_length=100,
        verbose_name='公司名称'
    )
    name_en = models.CharField(
        max_length=100,
        verbose_name='英文名称',
        blank=True
    )
    icon = models.CharField(
        max_length=200,
        verbose_name='图标',
        blank=True,
        help_text='Emoji图标（如：🏦）或公司Logo的URL地址（如：https://example.com/logo.png 或 /media/logos/company.png）'
    )
    color_gradient = models.CharField(
        max_length=100,
        verbose_name='颜色渐变',
        blank=True,
        help_text='例如：from-blue-600 to-blue-700'
    )
    bg_color = models.CharField(
        max_length=50,
        verbose_name='背景颜色',
        blank=True,
        help_text='例如：bg-blue-50'
    )
    description = models.TextField(
        verbose_name='公司描述',
        blank=True
    )
    headers = models.TextField(
        verbose_name='公司级别Headers',
        blank=True,
        default='',
        help_text='公司级别的通用HTTP Headers（JSON格式或键值对格式），会应用到该公司的所有API请求'
    )
    bearer_token = models.TextField(
        verbose_name='Bearer Token',
        blank=True,
        help_text='API调用所需的Bearer Token'
    )
    cookie = models.TextField(
        verbose_name='Cookie',
        blank=True,
        help_text='API调用所需的Cookie'
    )
    standard_surrender_policy = models.TextField(
        verbose_name='标准退保数据',
        blank=True,
        default='',
        help_text='存储标准退保数据（第1-100年），JSON格式：{"standard": [{"policy_year": 1, "guaranteed": 0, "non_guaranteed": 0, "total": 0, "premiums_paid": 10000}, ...]}'
    )
    flagship_product = models.CharField(
        max_length=200,
        verbose_name='主打寿险产品',
        blank=True,
        default='',
        help_text='该保险公司的主打寿险产品名称'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='是否启用'
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name='排序'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        db_table = 'insurance_companies'
        verbose_name = '保险公司'
        verbose_name_plural = '保险公司'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class InsuranceProduct(models.Model):
    """保险公司产品模型"""
    company = models.ForeignKey(
        InsuranceCompany,
        on_delete=models.CASCADE,
        related_name='products',
        verbose_name='所属保险公司'
    )
    product_name = models.CharField(
        max_length=200,
        verbose_name='产品名称'
    )
    payment_period = models.IntegerField(
        verbose_name='缴费年期',
        help_text='缴费年数，例如：5年、10年'
    )
    annual_premium = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='年缴金额',
        help_text='年缴保费金额'
    )
    surrender_value_table = models.TextField(
        verbose_name='退保发还金额表',
        blank=True,
        default='',
        help_text='JSON格式存储各年度退保价值，例如：[{"year": 1, "guaranteed": 0, "non_guaranteed": 0, "total": 0}, ...]'
    )
    death_benefit_table = models.TextField(
        verbose_name='身故保险赔偿表',
        blank=True,
        default='',
        help_text='JSON格式存储各年度身故赔偿金额，例如：[{"year": 1, "benefit": 100000}, ...]'
    )
    is_withdrawal = models.BooleanField(
        default=False,
        verbose_name='是否提取',
        help_text='是否包含提取功能'
    )
    description = models.TextField(
        verbose_name='产品描述',
        blank=True
    )

    # AI推荐相关字段
    target_age_min = models.IntegerField(
        verbose_name='目标年龄段最小值',
        null=True,
        blank=True,
        help_text='适合的最小年龄，例如：25'
    )
    target_age_max = models.IntegerField(
        verbose_name='目标年龄段最大值',
        null=True,
        blank=True,
        help_text='适合的最大年龄，例如：50'
    )
    target_life_stage = models.CharField(
        max_length=50,
        verbose_name='目标人生阶段',
        blank=True,
        help_text='例如：扶幼保障期/收入成长期/责任高峰期/责任递减期/退休期，多个用逗号分隔'
    )
    coverage_type = models.CharField(
        max_length=100,
        verbose_name='保障类型',
        blank=True,
        help_text='例如：储蓄/重疾/医疗/教育基金/退休规划，多个用逗号分隔'
    )
    min_annual_income = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='最低年收入要求',
        null=True,
        blank=True,
        help_text='建议的最低年收入（台币），例如：500000'
    )
    features = models.JSONField(
        verbose_name='产品特点列表',
        default=list,
        blank=True,
        help_text='产品特点数组，例如：["高额身故保障", "现金价值稳定增长", "可附加重疾保障"]'
    )
    ai_recommendation_prompt = models.TextField(
        verbose_name='AI推荐提示词',
        blank=True,
        help_text='AI推荐产品时使用的描述，帮助AI更好地理解产品特性'
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name='是否启用'
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name='排序'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        db_table = 'insurance_products'
        verbose_name = '保险公司产品'
        verbose_name_plural = '保险公司产品'
        ordering = ['company', 'sort_order', 'product_name']
        indexes = [
            models.Index(fields=['company', 'is_active']),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.product_name}"


class InsuranceCompanyRequest(models.Model):
    """保险公司API请求配置模型"""
    company = models.ForeignKey(
        InsuranceCompany,
        on_delete=models.CASCADE,
        related_name='api_requests',
        verbose_name='保险公司'
    )
    request_name = models.CharField(
        max_length=100,
        verbose_name='请求名称',
        help_text='例如：利益表计算、提取金额计算'
    )
    request_url = models.CharField(
        max_length=500,
        verbose_name='请求URL',
        help_text='完整的API端点URL'
    )
    request_method = models.CharField(
        max_length=10,
        choices=[
            ('GET', 'GET'),
            ('POST', 'POST'),
            ('PUT', 'PUT'),
            ('DELETE', 'DELETE'),
        ],
        default='POST',
        verbose_name='请求方法'
    )
    request_template = models.JSONField(
        verbose_name='请求体模板',
        default=dict,
        help_text='POST请求体的JSON模板'
    )
    headers = models.TextField(
        verbose_name='请求头',
        blank=True,
        default='',
        help_text='HTTP请求头（JSON格式字符串），例如：{"Content-Type": "application/json", "X-Custom-Header": "value"}'
    )
    authorization = models.TextField(
        verbose_name='Authorization',
        blank=True,
        help_text='Bearer Token或其他认证信息，例如：Bearer eyJhbGc...'
    )
    configurable_fields = models.JSONField(
        verbose_name='可配置字段',
        default=list,
        help_text='用户可以修改的字段列表，例如：["premium", "withdrawalAmount", "productName"]'
    )
    field_descriptions = models.JSONField(
        verbose_name='字段说明',
        default=dict,
        blank=True,
        help_text='字段的中文说明和默认值，例如：{"premium": {"label": "每期保费", "default": "50000", "type": "number"}}'
    )
    response_template = models.JSONField(
        verbose_name='响应模板',
        default=dict,
        blank=True,
        help_text='预期的响应格式示例，用于文档说明'
    )
    insurance_product = models.CharField(
        max_length=200,
        verbose_name='保险品种',
        blank=True,
        help_text='例如：储蓄险、重疾险、医疗险'
    )
    description = models.TextField(
        verbose_name='请求描述',
        blank=True
    )
    requires_bearer_token = models.BooleanField(
        default=False,
        verbose_name='需要Bearer Token'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='是否启用'
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name='排序'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        db_table = 'insurance_company_requests'
        verbose_name = '保险公司API请求'
        verbose_name_plural = '保险公司API请求'
        ordering = ['company', 'sort_order', 'request_name']
        indexes = [
            models.Index(fields=['company', 'is_active']),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.request_name}"


class PagePermission(models.Model):
    """页面访问权限配置"""
    page_name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='页面名称',
        help_text='页面的显示名称，如：计划书分步骤分析'
    )
    page_code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='页面代码',
        help_text='页面的唯一标识，如：plan-analyzer-2'
    )
    route_path = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='路由路径',
        help_text='页面的路由路径，如：/plan-analyzer-2'
    )
    description = models.TextField(
        blank=True,
        verbose_name='描述',
        help_text='页面功能描述'
    )
    allowed_groups = models.ManyToManyField(
        Group,
        blank=True,
        verbose_name='允许的用户组',
        help_text='拥有访问权限的用户组。如果为空，则所有登录用户都可以访问'
    )
    require_staff = models.BooleanField(
        default=False,
        verbose_name='需要管理员权限',
        help_text='如果勾选，只有管理员（is_staff=True）可以访问'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='启用',
        help_text='是否启用此权限控制'
    )
    icon = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='图标',
        help_text='页面图标类名'
    )
    color = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='颜色',
        help_text='页面卡片的渐变色，如：from-emerald-600 to-teal-600'
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name='排序',
        help_text='数字越小越靠前'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        db_table = 'page_permissions'
        verbose_name = '页面访问权限'
        verbose_name_plural = '页面访问权限'
        ordering = ['sort_order', 'page_name']

    def __str__(self):
        return f"{self.page_name} ({self.page_code})"

    def check_user_permission(self, user):
        """检查用户是否有权限访问此页面"""
        # 如果未启用权限控制，所有人都可以访问
        if not self.is_active:
            return True

        # 如果需要管理员权限，检查用户是否是管理员
        if self.require_staff:
            return user.is_staff

        # 如果没有设置任何允许的组，所有登录用户都可以访问
        if self.allowed_groups.count() == 0:
            return True

        # 管理员始终有权限
        if user.is_staff:
            return True

        # 检查用户是否在允许的组中
        user_groups = user.groups.all()
        allowed_groups = self.allowed_groups.all()
        return any(group in allowed_groups for group in user_groups)


class UserProductSettings(models.Model):
    """
    用户产品对比设置
    存储用户在产品对比页面中选择显示的产品
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='product_settings')
    selected_product_ids = models.JSONField(default=list, help_text='用户选择的产品ID列表')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = '用户产品对比设置'
        verbose_name_plural = '用户产品对比设置'

    def __str__(self):
        return f'{self.user.username} 的产品对比设置'


class CustomerCase(models.Model):
    """
    客户保险配置案例模型
    用于展示不同人生阶段的典型保险配置方案
    """
    title = models.CharField(
        max_length=200,
        verbose_name='案例标题',
        help_text='例如：35岁IT工程师的家庭保障方案'
    )
    life_stage = models.CharField(
        max_length=50,
        verbose_name='人生阶段',
        choices=[
            ('扶幼保障期', '扶幼保障期（25-30岁）'),
            ('收入成长期', '收入成长期（31-40岁）'),
            ('责任高峰期', '责任高峰期（41-50岁）'),
            ('责任递减期', '责任递减期（51-60岁）'),
            ('退休期', '退休期（60岁以上）'),
        ],
        help_text='客户所处的人生阶段'
    )
    customer_age = models.IntegerField(
        verbose_name='客户年龄',
        help_text='案例中客户的年龄'
    )
    annual_income = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='年收入',
        help_text='年收入（台币）'
    )
    family_structure = models.CharField(
        max_length=200,
        verbose_name='家庭结构',
        help_text='例如：已婚，2个子女（5岁、8岁）'
    )
    insurance_needs = models.TextField(
        verbose_name='保险需求',
        help_text='客户的主要保险需求和关注点'
    )
    recommended_products = models.JSONField(
        verbose_name='推荐产品列表',
        default=list,
        help_text='JSON格式：[{"product_name": "产品名", "company": "公司", "annual_premium": 50000, "coverage_type": "重疾", "reason": "推荐理由"}]'
    )
    total_annual_premium = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='年缴保费总额',
        help_text='所有推荐产品的年缴保费总和（台币）'
    )
    case_image = models.ImageField(
        upload_to='customer_cases/',
        verbose_name='案例配图',
        blank=True,
        null=True,
        help_text='案例展示图片'
    )
    case_description = models.TextField(
        verbose_name='案例详细说明',
        help_text='详细描述案例的保障方案和配置理念'
    )
    key_points = models.JSONField(
        verbose_name='关键要点',
        default=list,
        blank=True,
        help_text='配置方案的关键要点列表，例如：["要点1", "要点2"]'
    )
    budget_suggestion = models.CharField(
        max_length=200,
        verbose_name='预算建议',
        blank=True,
        help_text='例如：年缴保费: 80,000-120,000 台币'
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name='排序',
        help_text='数字越小越靠前'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='是否启用',
        help_text='是否在前端展示此案例'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        db_table = 'customer_cases'
        verbose_name = '客户案例'
        verbose_name_plural = '客户案例'
        ordering = ['sort_order', '-created_at']
        indexes = [
            models.Index(fields=['life_stage', 'is_active']),
            models.Index(fields=['sort_order']),
        ]

    def __str__(self):
        return f"{self.title} - {self.life_stage}"

    def get_total_premium_display(self):
        """格式化显示总保费"""
        return f"{self.total_annual_premium:,.0f} 台币"

    def get_income_display(self):
        """格式化显示年收入"""
        return f"{self.annual_income:,.0f} 台币"
