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

    # 计划书概要（AI提取，HTML格式）
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
            ('ocr_processing', 'OCR识别中'),
            ('ocr_completed', 'OCR识别完成'),
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


class DailyUsageQuota(models.Model):
    """每日使用限额模型 - 记录用户每天的文档上传次数"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='daily_usage',
        verbose_name='用户'
    )
    date = models.DateField(
        verbose_name='日期',
        db_index=True
    )
    upload_count = models.IntegerField(
        default=0,
        verbose_name='当日上传次数'
    )
    max_daily_limit = models.IntegerField(
        default=4,
        verbose_name='每日最大限制'
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
        db_table = 'daily_usage_quotas'
        verbose_name = '每日使用限额'
        verbose_name_plural = '每日使用限额'
        unique_together = [['user', 'date']]  # 每个用户每天只有一条记录
        indexes = [
            models.Index(fields=['user', 'date']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.date} - {self.upload_count}/{self.max_daily_limit}"

    def can_upload(self):
        """检查是否还可以上传"""
        return self.upload_count < self.max_daily_limit

    def increment_count(self):
        """增加上传次数"""
        if self.can_upload():
            self.upload_count += 1
            self.save()
            return True
        return False

    def remaining_count(self):
        """剩余可用次数"""
        return max(0, self.max_daily_limit - self.upload_count)

    @classmethod
    def get_or_create_today(cls, user):
        """获取或创建今天的使用记录"""
        from django.utils import timezone
        today = timezone.now().date()
        quota, created = cls.objects.get_or_create(
            user=user,
            date=today,
            defaults={'upload_count': 0, 'max_daily_limit': 4}
        )
        return quota


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
    website_url = models.URLField(
        verbose_name='公司官网',
        blank=True,
        max_length=500,
        help_text='保险公司的官方网站链接地址'
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
    """保险公司产品模型（主表 - 存储产品基本信息）"""
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

    # 以下字段保留用于向后兼容，新数据建议使用 ProductPlan 关联表
    payment_period = models.IntegerField(
        verbose_name='缴费年期（已废弃）',
        null=True,
        blank=True,
        help_text='⚠️ 已废弃：请使用 ProductPlan 关联表管理不同缴费年期'
    )
    annual_premium = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='年缴金额（已废弃）',
        null=True,
        blank=True,
        help_text='⚠️ 已废弃：请使用 ProductPlan 关联表管理不同年缴金额'
    )
    surrender_value_table = models.TextField(
        verbose_name='退保发还金额表（已废弃）',
        blank=True,
        default='',
        help_text='⚠️ 已废弃：请使用 ProductPlan 关联表管理退保价值表'
    )
    death_benefit_table = models.TextField(
        verbose_name='身故保险赔偿表（已废弃）',
        blank=True,
        default='',
        help_text='⚠️ 已废弃：请使用 ProductPlan 关联表管理身故赔偿表'
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

    # 产品分类
    product_category = models.CharField(
        max_length=50,
        verbose_name='产品分类',
        blank=True,
        help_text='产品类型分类，例如：重疾险、理财、储蓄、医疗险等'
    )

    # 支持的缴费年期
    supported_payment_periods = models.CharField(
        max_length=200,
        verbose_name='支持的缴费年期',
        blank=True,
        default='',
        help_text='产品支持的缴费年期选项，多个用逗号分隔，例如：1年,2年,5年,趸缴'
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
        help_text='建议的最低年收入（港币），例如：500000'
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

    # 计划书产品概要
    plan_summary = models.TextField(
        verbose_name='计划书产品概要',
        blank=True,
        help_text='产品在计划书中的概要描述，用于快速了解产品核心信息'
    )

    # 计划书详情
    plan_details = models.TextField(
        verbose_name='计划书详情',
        blank=True,
        help_text='产品计划书的完整详细信息，包括条款、保障范围、理赔流程等详细内容'
    )

    # 计划书PDF Base64编码
    plan_pdf_base64 = models.TextField(
        verbose_name='计划书PDF Base64编码',
        blank=True,
        default='',
        help_text='存储计划书PDF文件的Base64编码，用于前端下载或预览'
    )

    # 产品研究报告
    product_research_report = models.TextField(
        verbose_name='产品研究报告',
        blank=True,
        default='',
        help_text='产品的深度研究报告，包括市场分析、竞品对比、投资策略等专业内容'
    )

    # 官方产品链接
    url = models.URLField(
        verbose_name='官方产品链接',
        blank=True,
        max_length=500,
        help_text='产品的官方网站链接地址'
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


class ProductPlan(models.Model):
    """
    产品缴费方案模型
    同一款产品可以有多个不同的缴费年期方案
    每个方案包含独立的年缴金额、退保价值表和身故赔偿表
    """
    product = models.ForeignKey(
        InsuranceProduct,
        on_delete=models.CASCADE,
        related_name='plans',
        verbose_name='所属产品'
    )
    plan_name = models.CharField(
        max_length=100,
        verbose_name='方案名称',
        blank=True,
        help_text='例如：5年缴费方案、10年缴费方案'
    )
    payment_period = models.IntegerField(
        verbose_name='缴费年期',
        help_text='缴费年数，例如：5、10、15、20'
    )
    annual_premium = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='年缴金额',
        help_text='年缴保费金额（港币）'
    )

    # 退保价值表
    surrender_value_table = models.TextField(
        verbose_name='退保发还金额表',
        blank=True,
        default='',
        help_text='JSON格式：[{"year": 1, "guaranteed": 0, "non_guaranteed": 0, "total": 0, "premiums_paid": 10000}, ...]'
    )

    # 身故赔偿表
    death_benefit_table = models.TextField(
        verbose_name='身故保险赔偿表',
        blank=True,
        default='',
        help_text='JSON格式：[{"year": 1, "benefit": 100000}, {"year": 2, "benefit": 150000}, ...]'
    )

    # IRR内部回报率（可选）
    irr_rate = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        verbose_name='内部回报率（IRR）',
        null=True,
        blank=True,
        help_text='年化内部回报率（百分比），例如：5.5 表示5.5%'
    )

    # 总保费
    total_premium = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='总保费',
        null=True,
        blank=True,
        help_text='年缴金额 × 缴费年期'
    )

    # 方案说明
    plan_description = models.TextField(
        verbose_name='方案说明',
        blank=True,
        default='',
        help_text='该缴费方案的详细说明和特点'
    )

    # 是否推荐方案
    is_recommended = models.BooleanField(
        default=False,
        verbose_name='是否推荐方案',
        help_text='标记为推荐方案会在前端优先显示'
    )

    # 排序
    sort_order = models.IntegerField(
        default=0,
        verbose_name='排序',
        help_text='数字越小越靠前'
    )

    # 是否启用
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
        db_table = 'product_plans'
        verbose_name = '产品缴费方案'
        verbose_name_plural = '产品缴费方案'
        ordering = ['product', 'sort_order', 'payment_period']
        indexes = [
            models.Index(fields=['product', 'is_active']),
            models.Index(fields=['product', 'payment_period']),
        ]
        # 确保同一产品的缴费年期不重复
        unique_together = ['product', 'payment_period']

    def __str__(self):
        return f"{self.product.product_name} - {self.payment_period}年缴费"

    def save(self, *args, **kwargs):
        """保存前自动计算总保费和生成方案名称"""
        # 自动计算总保费
        if self.annual_premium and self.payment_period:
            self.total_premium = self.annual_premium * self.payment_period

        # 自动生成方案名称
        if not self.plan_name:
            self.plan_name = f"{self.payment_period}年缴费方案"

        super().save(*args, **kwargs)


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
    category = models.CharField(
        max_length=50,
        verbose_name='文章分类',
        default='未分类',
        help_text='文章分类，例如：基础认知、重疾险、理财储蓄、理赔售后等'
    )
    tags = models.JSONField(
        verbose_name='标签',
        default=list,
        blank=True,
        help_text='案例标签列表，例如：["扶幼保障期", "高收入", "海外资产配置"]'
    )
    customer_age = models.IntegerField(
        verbose_name='客户年龄',
        help_text='案例中客户的年龄'
    )
    annual_income = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='年收入',
        help_text='年收入（港币）'
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
        help_text='所有推荐产品的年缴保费总和（港币）'
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
    content = models.TextField(
        verbose_name='文章内容',
        blank=True,
        default='',
        help_text='公司新闻/文章的完整内容（Markdown格式），用于替代case_description字段'
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
        help_text='例如：年缴保费: 80,000-120,000 港币'
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
            models.Index(fields=['is_active']),
            models.Index(fields=['sort_order']),
        ]

    def __str__(self):
        tags_str = ', '.join(self.tags) if self.tags else '无标签'
        return f"{self.title} - {tags_str}"

    def get_total_premium_display(self):
        """格式化显示总保费"""
        return f"{self.total_annual_premium:,.0f} 港币"

    def get_income_display(self):
        """格式化显示年收入"""
        return f"{self.annual_income:,.0f} 港币"


class ComparisonReport(models.Model):
    """计划书对比分析报告"""
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, verbose_name='创建用户', null=True, blank=True)
    comparison_title = models.CharField(max_length=255, verbose_name='对比标题', default='计划书对比分析')

    # PDF文件的base64数据（存储原始PDF，支持下载）
    pdf1_base64 = models.TextField(verbose_name='计划书1 PDF Base64', blank=True)
    pdf1_filename = models.CharField(max_length=255, verbose_name='计划书1文件名', blank=True)

    pdf2_base64 = models.TextField(verbose_name='计划书2 PDF Base64', blank=True)
    pdf2_filename = models.CharField(max_length=255, verbose_name='计划书2文件名', blank=True)

    pdf3_base64 = models.TextField(verbose_name='计划书3 PDF Base64', blank=True, default='')
    pdf3_filename = models.CharField(max_length=255, verbose_name='计划书3文件名', blank=True, default='')

    # 关联的三份计划书文档（可选，用于向后兼容）
    document1 = models.ForeignKey(
        PlanDocument,
        on_delete=models.CASCADE,
        related_name='comparison_as_doc1',
        verbose_name='计划书1',
        null=True,
        blank=True
    )
    document2 = models.ForeignKey(
        PlanDocument,
        on_delete=models.CASCADE,
        related_name='comparison_as_doc2',
        verbose_name='计划书2',
        null=True,
        blank=True
    )
    document3 = models.ForeignKey(
        PlanDocument,
        on_delete=models.CASCADE,
        related_name='comparison_as_doc3',
        verbose_name='计划书3',
        null=True,
        blank=True
    )

    # 对比分析结果（JSON格式）
    comparison_result = models.JSONField(verbose_name='对比数据', default=dict, blank=True)

    # AI生成的对比总结（HTML或Markdown格式）
    comparison_summary = models.TextField(verbose_name='对比总结', blank=True, default='')

    # 报告格式类型
    report_format = models.CharField(
        max_length=10,
        choices=[
            ('html', 'HTML'),
            ('markdown', 'Markdown')
        ],
        default='markdown',
        verbose_name='报告格式'
    )

    # 状态
    status = models.CharField(
        max_length=20,
        choices=[
            ('processing', '分析中'),
            ('completed', '已完成'),
            ('failed', '失败')
        ],
        default='processing',
        verbose_name='状态'
    )
    error_message = models.TextField(verbose_name='错误信息', blank=True)

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'comparison_reports'
        verbose_name = '计划书对比报告'
        verbose_name_plural = '计划书对比报告'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.comparison_title} - {self.created_at.strftime('%Y-%m-%d')}"


class PlanComparison(models.Model):
    """计划书直接对比（使用Gemini直接分析PDF）"""
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, verbose_name='创建用户')

    # PDF文件的base64数据（存储原始PDF，支持下载）
    pdf1_name = models.CharField(max_length=255, verbose_name='计划书1文件名')
    pdf1_base64 = models.TextField(verbose_name='计划书1 PDF Base64')

    pdf2_name = models.CharField(max_length=255, verbose_name='计划书2文件名')
    pdf2_base64 = models.TextField(verbose_name='计划书2 PDF Base64')

    pdf3_name = models.CharField(max_length=255, verbose_name='计划书3文件名', blank=True, default='')
    pdf3_base64 = models.TextField(verbose_name='计划书3 PDF Base64', blank=True, default='')

    # Gemini生成的对比报告（HTML格式）
    comparison_report = models.TextField(verbose_name='对比报告', blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'plan_comparisons'
        verbose_name = '计划书对比'
        verbose_name_plural = '计划书对比'
        ordering = ['-created_at']

    def __str__(self):
        return f"对比: {self.pdf1_name} vs {self.pdf2_name} - {self.created_at.strftime('%Y-%m-%d')}"


class ProductPromotion(models.Model):
    """产品宣传材料模型"""
    product = models.ForeignKey(
        InsuranceProduct,
        on_delete=models.CASCADE,
        related_name='promotions',
        verbose_name='所属产品'
    )
    title = models.CharField(
        max_length=200,
        verbose_name='宣传标题',
        help_text='宣传材料的标题，例如：产品小册子、产品新闻、产品说明'
    )
    content_type = models.CharField(
        max_length=50,
        verbose_name='内容类型',
        choices=[
            ('news', '新闻'),
            ('brochure', '产品小册子'),
            ('guide', '产品说明'),
            ('video', '视频'),
            ('article', '文章'),
            ('other', '其他')
        ],
        default='news',
        help_text='宣传材料的类型'
    )
    description = models.TextField(
        verbose_name='描述',
        blank=True,
        help_text='宣传材料的简要描述'
    )
    url = models.URLField(
        verbose_name='链接地址',
        blank=True,
        max_length=500,
        help_text='外部链接，如新闻链接、视频链接等'
    )
    pdf_file = models.FileField(
        upload_to='product_promotions/',
        verbose_name='PDF文件',
        blank=True,
        null=True,
        help_text='上传产品小册子PDF文件'
    )
    pdf_base64 = models.TextField(
        verbose_name='PDF Base64编码',
        blank=True,
        default='',
        help_text='PDF文件的Base64编码，用于前端下载或预览'
    )
    thumbnail = models.ImageField(
        upload_to='product_promotions/thumbnails/',
        verbose_name='缩略图',
        blank=True,
        null=True,
        help_text='宣传材料的缩略图'
    )
    published_date = models.DateField(
        verbose_name='发布日期',
        null=True,
        blank=True,
        help_text='宣传材料的发布日期'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='是否启用',
        help_text='是否在前端显示此宣传材料'
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name='排序',
        help_text='数字越小越靠前'
    )
    view_count = models.IntegerField(
        default=0,
        verbose_name='浏览次数'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'product_promotions'
        verbose_name = '产品宣传材料'
        verbose_name_plural = '产品宣传材料'
        ordering = ['product', 'sort_order', '-published_date']
        indexes = [
            models.Index(fields=['product', 'is_active']),
            models.Index(fields=['content_type']),
        ]

    def __str__(self):
        return f"{self.product.product_name} - {self.title}"


class CompanyNews(models.Model):
    """保险公司新闻与宣传材料模型"""
    company = models.ForeignKey(
        InsuranceCompany,
        on_delete=models.CASCADE,
        related_name='news',
        verbose_name='所属公司'
    )
    title = models.CharField(
        max_length=200,
        verbose_name='标题',
        help_text='新闻或宣传材料的标题'
    )
    content_type = models.CharField(
        max_length=50,
        verbose_name='内容类型',
        choices=[
            ('news', '公司新闻'),
            ('announcement', '公司公告'),
            ('brochure', '公司小册子'),
            ('video', '视频'),
            ('article', '文章'),
            ('press_release', '新闻稿'),
            ('report', '年度报告'),
            ('other', '其他')
        ],
        default='news',
        help_text='内容的类型'
    )
    description = models.TextField(
        verbose_name='描述',
        blank=True,
        help_text='新闻或材料的简要描述'
    )
    content = models.TextField(
        verbose_name='正文内容',
        blank=True,
        help_text='新闻或材料的完整正文内容（支持HTML）'
    )
    url = models.URLField(
        verbose_name='外部链接',
        blank=True,
        max_length=500,
        help_text='外部新闻链接、视频链接等'
    )
    pdf_file = models.FileField(
        upload_to='company_news/',
        verbose_name='PDF文件',
        blank=True,
        null=True,
        help_text='上传PDF文件（如公司年报、小册子等）'
    )
    pdf_base64 = models.TextField(
        verbose_name='PDF Base64编码',
        blank=True,
        default='',
        help_text='PDF文件的Base64编码，用于前端下载或预览'
    )
    thumbnail = models.ImageField(
        upload_to='company_news/thumbnails/',
        verbose_name='缩略图',
        blank=True,
        null=True,
        help_text='新闻或材料的缩略图'
    )
    published_date = models.DateField(
        verbose_name='发布日期',
        null=True,
        blank=True,
        help_text='新闻或材料的发布日期'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='是否启用',
        help_text='是否在前端显示此内容'
    )
    is_featured = models.BooleanField(
        default=False,
        verbose_name='是否精选',
        help_text='标记为精选内容将优先显示'
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name='排序',
        help_text='数字越小越靠前'
    )
    view_count = models.IntegerField(
        default=0,
        verbose_name='浏览次数'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'company_news'
        verbose_name = '公司新闻与宣传'
        verbose_name_plural = '公司新闻与宣传'
        ordering = ['company', '-is_featured', 'sort_order', '-published_date']
        indexes = [
            models.Index(fields=['company', 'is_active']),
            models.Index(fields=['content_type']),
            models.Index(fields=['is_featured']),
            models.Index(fields=['published_date']),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.title}"
