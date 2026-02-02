# AI顾问服务详细指南

## 概述

`ai_consultant_service.py` 是一个完整的AI保险顾问服务模块，提供智能产品匹配、多维度评分和专业咨询报告生成功能。

---

## 核心组件

### 1. 数据结构（Dataclasses）

#### 1.1 CustomerInfo - 客户信息

完整的客户画像数据结构，包含：

```python
@dataclass
class CustomerInfo:
    # === 基本信息 ===
    age: int                          # 年龄
    gender: str                       # 性别（男/女）
    annual_income: float              # 年收入（台币）

    # === 人生阶段 ===
    life_stage: str                   # 扶幼保障期/收入成长期/责任高峰期/责任递减期/退休期

    # === 家庭状况 ===
    family_status: str                # 单身/已婚/已婚有子女
    has_children: bool                # 是否有子女
    children_count: int               # 子女数量
    children_ages: List[int]          # 子女年龄列表

    # === 保险需求 ===
    main_concerns: List[str]          # 主要关注点
    existing_coverage: Dict[str, float]  # 现有保障

    # === 财务状况 ===
    budget: float                     # 年缴保费预算
    assets: float                     # 资产总额
    liabilities: float                # 负债总额

    # === 健康状况 ===
    health_status: str                # 健康/亚健康/有既往病史
    has_chronic_disease: bool         # 是否有慢性病

    # === 其他信息 ===
    occupation: str                   # 职业
    risk_tolerance: str               # 风险承受度（低/中等/高）
```

**使用示例：**
```python
customer = CustomerInfo(
    age=35,
    gender="男",
    annual_income=800000,
    life_stage="责任高峰期",
    family_status="已婚有子女",
    has_children=True,
    children_count=2,
    children_ages=[5, 8],
    main_concerns=["子女教育", "家庭保障", "重疾保障"],
    budget=100000,
    assets=2000000,
    liabilities=500000,
    health_status="健康",
    occupation="软件工程师",
    risk_tolerance="中等"
)
```

---

#### 1.2 ProductMatch - 产品匹配结果

存储产品信息和匹配评分：

```python
@dataclass
class ProductMatch:
    # 产品基本信息
    product_id: int
    product_name: str
    company_name: str
    annual_premium: float
    payment_period: int

    # 产品属性
    coverage_type: str
    target_age_min: Optional[int]
    target_age_max: Optional[int]
    target_life_stage: str
    min_annual_income: float
    features: List[str]
    description: str

    # 匹配评分（0-100）
    match_score: float                # 总体匹配度
    age_match_score: float            # 年龄匹配度
    income_match_score: float         # 收入匹配度
    need_match_score: float           # 需求匹配度
    budget_match_score: float         # 预算匹配度
    life_stage_match_score: float     # 人生阶段匹配度

    # 推荐信息
    is_recommended: bool              # 是否推荐
    priority: int                     # 优先级（1-3）
    recommendation_reason: str        # 推荐理由
```

---

#### 1.3 ConsultationResult - 咨询结果

完整的咨询报告结构：

```python
@dataclass
class ConsultationResult:
    # 客户分析
    customer_analysis: str            # 客户需求分析
    risk_assessment: str              # 风险评估
    coverage_gap: Dict[str, str]      # 保障缺口分析

    # 产品推荐
    recommended_products: List[Dict]  # 推荐产品（前3名）
    alternative_products: List[Dict]  # 备选产品

    # 专业建议
    professional_advice: str          # 专业建议
    budget_planning: Dict[str, float] # 预算规划
    warnings: List[str]               # 注意事项

    # 保障方案
    total_annual_premium: float       # 总年缴保费
    total_coverage_amount: float      # 总保障额度
    protection_plan: Dict[str, str]   # 保障方案说明
```

---

## 2. 产品匹配引擎（ProductMatchingEngine）

### 2.1 核心评分算法

#### 年龄匹配度算法

```python
def calculate_age_match_score(customer_age, product_age_min, product_age_max) -> float
```

**评分逻辑：**
1. **无年龄限制**：返回 60 分（中等）
2. **完全在范围内**：80-100 分
   - 在范围中间位置：100 分
   - 靠近边界：80 分
3. **超出范围**：根据距离递减
   - 距离1岁扣5分
   - 最多扣50分

**示例：**
```
产品目标：30-45岁
客户35岁 → 95分（接近中间）
客户28岁 → 45分（差2岁）
客户50岁 → 25分（差5岁）
```

---

#### 收入匹配度算法

```python
def calculate_income_match_score(customer_income, min_required_income) -> float
```

**评分逻辑：**
1. **无收入要求**：返回 80 分
2. **收入达标**：85-100 分
   - ≥2倍要求：100 分
   - ≥1.5倍：95 分
   - ≥1.2倍：90 分
   - ≥1倍：85 分
3. **收入不足**：20-70 分
   - 达到80%：70 分
   - 达到60%：50 分
   - <60%：20 分

**示例：**
```
产品要求：年收入50万
客户收入100万 → 100分（2倍）
客户收入60万 → 90分（1.2倍）
客户收入40万 → 70分（80%）
客户收入25万 → 20分（50%）
```

---

#### 需求匹配度算法

```python
def calculate_need_match_score(customer_concerns, product_coverage_type, product_features) -> float
```

**评分逻辑：**
1. 建立关注点→保障类型映射表
2. 每匹配一个保障类型：+30 分
3. 每匹配一个产品特点：+10 分
4. 最高 100 分，无匹配 30 分

**映射关系：**
```python
concern_to_coverage = {
    '意外保障': ['意外', '意外险'],
    '医疗保障': ['医疗', '医疗险', '住院'],
    '重疾保障': ['重疾', '重疾险', '疾病'],
    '家庭保障': ['寿险', '身故', '家庭'],
    '子女教育': ['教育基金', '储蓄', '教育'],
    '退休规划': ['退休', '年金', '养老'],
    '财富传承': ['寿险', '储蓄', '传承'],
    '储蓄规划': ['储蓄', '理财', '投资'],
    '长期照护': ['长期照护', '护理', '照护'],
}
```

---

#### 预算匹配度算法

```python
def calculate_budget_match_score(annual_premium, customer_budget) -> float
```

**评分逻辑：**
```
保费/预算比例 → 分数
≤0.8  → 100分（很好）
≤1.0  → 95分（在预算内）
≤1.2  → 80分（可接受）
≤1.5  → 60分（勉强）
>1.5  → 快速下降
```

---

#### 人生阶段匹配度算法

```python
def calculate_life_stage_match_score(customer_life_stage, product_life_stage) -> float
```

**评分逻辑：**
1. **完全匹配**：100 分
2. **相邻阶段**：70 分
3. **隔一个阶段**：40 分
4. **不匹配**：20 分

**阶段顺序：**
```
扶幼保障期 → 收入成长期 → 责任高峰期 → 责任递减期 → 退休期
```

---

#### 总体匹配度算法

```python
def calculate_overall_match_score(product_match) -> float
```

**权重分配：**
```
年龄匹配：20%
收入匹配：15%
需求匹配：35%（最重要）
预算匹配：20%
人生阶段：10%
```

**计算公式：**
```
总分 = 年龄分×0.20 + 收入分×0.15 + 需求分×0.35 + 预算分×0.20 + 阶段分×0.10
```

---

### 2.2 产品匹配流程

```python
def match_products(customer: CustomerInfo, products: List[Dict]) -> List[ProductMatch]
```

**流程：**
1. 遍历所有产品
2. 为每个产品计算5项评分
3. 计算总体评分
4. 按评分降序排列
5. 标记前3名为推荐产品

---

## 3. AI咨询服务（AIConsultantService）

### 3.1 主要功能

#### consult() - 完整咨询流程

```python
def consult(customer_info: Dict, products: List[Dict]) -> Dict
```

**流程：**
```
1. 创建CustomerInfo对象
   ↓
2. 调用匹配引擎进行产品匹配和评分
   ↓
3. 调用AI进行深度需求分析
   ↓
4. 生成完整咨询报告
   ↓
5. 返回结构化结果（包含匹配详情）
```

---

#### analyze_customer_needs() - AI需求分析

```python
def analyze_customer_needs(customer: CustomerInfo, matched_products: List[ProductMatch]) -> ConsultationResult
```

**功能：**
1. 构建详细的AI提示词
2. 调用Gemini 2.0 Flash Exp模型
3. 解析AI返回的JSON结果
4. 返回ConsultationResult对象

---

### 3.2 AI提示词结构

提示词包含以下部分：

#### 第一部分：客户信息
```
## 客户基本信息
### 个人资料
### 人生阶段
### 保险需求
### 财务状况
### 现有保障
```

#### 第二部分：匹配产品（Top 5）
```
## 匹配产品列表
### 产品1
- 基本信息
- 产品属性
- 产品特点
- 匹配度分析（6项评分）
```

#### 第三部分：任务要求
```
- 以20年资深顾问角度分析
- 提供全面的咨询报告
- 必须返回JSON格式
```

#### 第四部分：返回格式规范
详细的JSON Schema，包含：
- customer_analysis（300-400字）
- risk_assessment（200-300字）
- coverage_gap（4类保障缺口）
- recommended_products（前3个产品）
- alternative_products（2-3个备选）
- professional_advice（400-500字）
- budget_planning（预算规划）
- warnings（5条注意事项）
- protection_plan（3个时间段规划）

#### 第五部分：分析要点
- 全面性
- 专业性
- 针对性
- 实用性
- 前瞻性
- 风险意识

---

## 4. 使用示例

### 示例1：基本使用

```python
from api.ai_consultant_service import get_ai_consultant_service

# 1. 准备客户信息
customer_info = {
    'age': 35,
    'gender': '男',
    'annual_income': 800000,
    'life_stage': '责任高峰期',
    'family_status': '已婚有子女',
    'has_children': True,
    'children_count': 2,
    'main_concerns': ['子女教育', '家庭保障', '重疾保障'],
    'budget': 100000,
    'health_status': '健康',
    'risk_tolerance': '中等',
}

# 2. 准备产品列表
products = [
    {
        'id': 1,
        'product_name': '某某储蓄险',
        'company_name': 'XX保险公司',
        'annual_premium': 80000,
        'payment_period': 10,
        'coverage_type': '储蓄,教育基金',
        'target_age_min': 25,
        'target_age_max': 45,
        'target_life_stage': '收入成长期,责任高峰期',
        'min_annual_income': 500000,
        'features': ['高额保障', '现金价值稳定增长', '可附加教育金'],
        'description': '适合有子女教育需求的家庭...',
        'ai_recommendation_prompt': '这是一款专为家庭设计的储蓄型产品...',
    },
    # ... 更多产品
]

# 3. 调用服务
service = get_ai_consultant_service()
result = service.consult(customer_info, products)

# 4. 使用结果
print("客户分析:", result['customer_analysis'])
print("推荐产品:", result['recommended_products'])
print("专业建议:", result['professional_advice'])
print("预算规划:", result['budget_planning'])
print("注意事项:", result['warnings'])

# 5. 查看匹配详情
for product in result['matched_products_detail'][:3]:
    print(f"\n产品: {product['product_name']}")
    print(f"总体匹配度: {product['match_score']:.1f}")
    print(f"- 年龄匹配: {product['age_match_score']:.1f}")
    print(f"- 收入匹配: {product['income_match_score']:.1f}")
    print(f"- 需求匹配: {product['need_match_score']:.1f}")
    print(f"- 预算匹配: {product['budget_match_score']:.1f}")
    print(f"- 阶段匹配: {product['life_stage_match_score']:.1f}")
```

---

### 示例2：在Django视图中使用

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from api.ai_consultant_service import get_ai_consultant_service
from api.models import InsuranceProduct

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def advanced_consultation(request):
    """高级AI咨询接口"""
    try:
        # 1. 获取客户信息
        customer_info = request.data

        # 2. 查询产品
        products = InsuranceProduct.objects.filter(is_active=True)
        products_list = [
            {
                'id': p.id,
                'product_name': p.product_name,
                'company_name': p.company.name,
                'annual_premium': float(p.annual_premium),
                'payment_period': p.payment_period,
                'coverage_type': p.coverage_type,
                'target_age_min': p.target_age_min,
                'target_age_max': p.target_age_max,
                'target_life_stage': p.target_life_stage,
                'min_annual_income': float(p.min_annual_income or 0),
                'features': p.features,
                'description': p.description,
                'ai_recommendation_prompt': p.ai_recommendation_prompt,
            }
            for p in products
        ]

        # 3. 调用AI顾问服务
        service = get_ai_consultant_service()
        result = service.consult(customer_info, products_list)

        # 4. 返回结果
        return Response({
            'success': True,
            'data': result
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

---

## 5. 返回结果示例

```json
{
    "customer_analysis": "客户当前35岁，正处于责任高峰期，是人生中家庭责任最重的阶段...",

    "risk_assessment": "主要面临的风险包括：1. 家庭经济支柱风险... 2. 子女教育金准备风险...",

    "coverage_gap": {
        "寿险": "建议配置800-1000万台币的寿险保障，目前尚无任何寿险保障",
        "重疾": "建议配置200-300万台币的重疾保障",
        "医疗": "建议配置实支实付型医疗险",
        "意外": "建议配置300-500万台币的意外险"
    },

    "recommended_products": [
        {
            "product_id": 1,
            "product_name": "某某储蓄险",
            "company_name": "XX保险公司",
            "annual_premium": 80000,
            "reason": "这款产品非常适合您当前的家庭状况...",
            "priority": 1,
            "suitability_score": 92.5,
            "coverage_highlights": [
                "高额身故保障覆盖家庭责任期",
                "现金价值稳定增长，可作为子女教育金",
                "缴费期灵活，符合当前收入水平"
            ],
            "estimated_coverage": "基本保额300万台币"
        }
    ],

    "alternative_products": [
        {
            "product_id": 2,
            "product_name": "另一款产品",
            "company_name": "YY保险公司",
            "annual_premium": 70000,
            "brief_description": "作为备选方案，这款产品保费更低，但保障范围略窄"
        }
    ],

    "professional_advice": "根据您的情况，建议采用以下保障策略...",

    "budget_planning": {
        "recommended_total": 95000,
        "breakdown": {
            "寿险": 40000,
            "重疾险": 35000,
            "医疗险": 15000,
            "其他": 5000
        },
        "budget_ratio": "11.9%",
        "payment_strategy": "建议采用20年期缴费，保障至65岁"
    },

    "warnings": [
        "注意事项1：请如实告知健康状况，避免理赔纠纷",
        "注意事项2：优先配置保障型产品，再考虑储蓄型产品",
        "注意事项3：定期审视保障需求，随家庭情况调整",
        "注意事项4：注意免责条款，了解不保障的范围",
        "注意事项5：保留所有保单文件和缴费记录"
    ],

    "total_annual_premium": 95000,
    "total_coverage_amount": 15000000,

    "protection_plan": {
        "immediate_protection": "立即配置寿险和重疾险作为基础保障",
        "medium_term_plan": "3-5年内补充医疗险和子女教育金保险",
        "long_term_plan": "5年后根据收入增长情况，考虑增加保额或配置养老年金"
    },

    "matched_products_detail": [
        {
            "product_id": 1,
            "product_name": "某某储蓄险",
            "company_name": "XX保险公司",
            "match_score": 92.5,
            "age_match_score": 95.0,
            "income_match_score": 90.0,
            "need_match_score": 95.0,
            "budget_match_score": 95.0,
            "life_stage_match_score": 100.0
        }
    ]
}
```

---

## 6. 评分系统详解

### 6.1 评分维度权重

```
需求匹配（35%）> 预算匹配（20%）= 年龄匹配（20%）> 收入匹配（15%）> 阶段匹配（10%）
```

**设计理念：**
- 需求最重要：产品必须解决客户的实际需求
- 预算和年龄同等重要：影响产品可行性
- 收入次之：只要达标即可
- 阶段权重最低：仅作参考

---

### 6.2 评分等级划分

```
90-100分：完美匹配 ★★★★★
80-89分：高度匹配 ★★★★☆
70-79分：良好匹配 ★★★☆☆
60-69分：一般匹配 ★★☆☆☆
50-59分：勉强匹配 ★☆☆☆☆
<50分：不推荐 ☆☆☆☆☆
```

---

### 6.3 推荐逻辑

1. **自动推荐前3名**
   - Priority 1: 第1名
   - Priority 2: 第2名
   - Priority 3: 第3名

2. **备选产品**
   - 第4-6名作为备选

3. **不推荐**
   - 评分<60分的产品

---

## 7. 性能优化建议

### 7.1 产品预筛选

在调用AI顾问服务之前，可以先进行数据库层面的筛选：

```python
from django.db.models import Q

# 预筛选逻辑
products = InsuranceProduct.objects.filter(
    is_active=True,
    # 年龄筛选（±5岁）
    Q(target_age_min__lte=age + 5) | Q(target_age_min__isnull=True),
    Q(target_age_max__gte=age - 5) | Q(target_age_max__isnull=True),
    # 收入筛选（120%）
    Q(min_annual_income__lte=annual_income * 1.2) | Q(min_annual_income__isnull=True),
    # 预算筛选（150%）
    annual_premium__lte=budget * 1.5
)[:20]  # 限制20个产品
```

---

### 7.2 缓存策略

对于固定的产品数据，可以使用缓存：

```python
from django.core.cache import cache

def get_products_cached():
    """获取缓存的产品列表"""
    cache_key = 'insurance_products_all'
    products = cache.get(cache_key)

    if products is None:
        products = list(InsuranceProduct.objects.filter(is_active=True).values())
        cache.set(cache_key, products, 3600)  # 缓存1小时

    return products
```

---

### 7.3 异步处理

对于耗时的AI分析，可以使用Celery异步处理：

```python
from celery import shared_task

@shared_task
def async_consultation(customer_info, products):
    """异步咨询任务"""
    service = get_ai_consultant_service()
    result = service.consult(customer_info, products)
    return result
```

---

## 8. 错误处理

### 8.1 常见错误

**1. GEMINI_API_KEY未配置**
```python
ValueError: GEMINI_API_KEY未配置
```
**解决：** 检查.env文件或环境变量

**2. AI返回格式错误**
```python
ValueError: 无法解析AI响应为JSON格式
```
**解决：** 检查AI提示词，确保要求返回JSON

**3. 产品数据不完整**
```python
KeyError: 'coverage_type'
```
**解决：** 确保产品数据包含所有必需字段

---

### 8.2 异常处理示例

```python
try:
    result = service.consult(customer_info, products)
except ValueError as e:
    logger.error(f"配置错误: {e}")
    return {'error': '服务配置错误'}
except json.JSONDecodeError as e:
    logger.error(f"JSON解析错误: {e}")
    return {'error': 'AI返回格式错误'}
except Exception as e:
    logger.error(f"未知错误: {e}", exc_info=True)
    return {'error': '服务器内部错误'}
```

---

## 9. 测试建议

### 9.1 单元测试

```python
import unittest
from api.ai_consultant_service import ProductMatchingEngine, CustomerInfo

class TestProductMatching(unittest.TestCase):

    def setUp(self):
        self.engine = ProductMatchingEngine()

    def test_age_match_perfect(self):
        """测试完美年龄匹配"""
        score = self.engine.calculate_age_match_score(35, 30, 40)
        self.assertGreaterEqual(score, 90)

    def test_age_match_out_of_range(self):
        """测试年龄超出范围"""
        score = self.engine.calculate_age_match_score(25, 40, 50)
        self.assertLess(score, 60)

    def test_income_match_sufficient(self):
        """测试收入充足"""
        score = self.engine.calculate_income_match_score(1000000, 500000)
        self.assertGreaterEqual(score, 90)
```

---

### 9.2 集成测试

```python
def test_full_consultation():
    """测试完整咨询流程"""
    customer_info = {
        'age': 35,
        'gender': '男',
        'annual_income': 800000,
        'life_stage': '责任高峰期',
        'family_status': '已婚',
        'has_children': True,
        'children_count': 2,
        'main_concerns': ['家庭保障', '重疾保障'],
        'budget': 100000,
    }

    products = [
        # ... 测试产品数据
    ]

    service = get_ai_consultant_service()
    result = service.consult(customer_info, products)

    # 验证结果
    assert 'customer_analysis' in result
    assert 'recommended_products' in result
    assert len(result['recommended_products']) <= 3
```

---

## 10. 与原有服务的对比

### consultation_service.py vs ai_consultant_service.py

| 特性 | consultation_service.py | ai_consultant_service.py |
|------|------------------------|-------------------------|
| **数据结构** | 字典 | Dataclass（类型安全） |
| **匹配算法** | 简单筛选 | 6维度评分算法 |
| **评分系统** | 无 | 完整的0-100评分 |
| **产品排序** | 无 | 按匹配度自动排序 |
| **详细评分** | 无 | 提供各维度评分详情 |
| **推荐理由** | AI生成 | AI生成 + 评分依据 |
| **保障缺口分析** | 无 | 有（4类保障） |
| **预算规划** | 无 | 有（详细分解） |
| **保障方案** | 无 | 有（3个时间段） |
| **可扩展性** | 中等 | 高（模块化设计） |
| **代码复杂度** | 简单 | 复杂（功能完善） |

---

## 11. 最佳实践

### 11.1 使用建议

1. **简单咨询**：使用 `consultation_service.py`
   - 快速推荐
   - 基础分析
   - 响应速度优先

2. **深度咨询**：使用 `ai_consultant_service.py`
   - 详细评分
   - 全面分析
   - 专业报告

---

### 11.2 产品数据质量

为了获得最佳匹配效果，产品数据应该：

1. **完整填写AI字段**
   - target_age_min/max
   - target_life_stage
   - coverage_type
   - features
   - ai_recommendation_prompt

2. **准确的保障类型**
   - 使用标准术语
   - 多个类型用逗号分隔

3. **详细的产品特点**
   - 至少3-5个特点
   - 突出产品优势

4. **AI推荐提示词**
   - 200-300字
   - 突出产品适用人群
   - 说明核心价值

---

## 12. 未来扩展

### 可能的增强功能

1. **机器学习优化**
   - 根据用户反馈调整权重
   - 学习最优匹配模式

2. **多目标优化**
   - 考虑保费/保障比
   - 平衡短期和长期需求

3. **风险评估模型**
   - 量化风险缺口
   - 提供风险评分

4. **动态权重**
   - 根据客户类型调整权重
   - 自适应评分策略

5. **A/B测试**
   - 对比不同算法效果
   - 优化推荐准确率

---

## 文档版本

- **创建日期：** 2026-01-01
- **版本：** 1.0.0
- **作者：** AI保险顾问开发团队
- **最后更新：** 2026-01-01

---

**文档结束**
