"""
AI保险顾问服务
提供智能产品匹配和专业保险建议
"""

import os
import json
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from decimal import Decimal
from google import genai
from google.genai import types
from django.conf import settings

logger = logging.getLogger(__name__)


@dataclass
class CustomerInfo:
    """客户信息数据结构"""
    # 基本信息
    age: int
    gender: str  # 男/女
    annual_income: float  # 年收入（港币）

    # 人生阶段
    life_stage: str  # 扶幼保障期/收入成长期/责任高峰期/责任递减期/退休期

    # 家庭状况
    family_status: str  # 单身/已婚/已婚有子女
    has_children: bool = False
    children_count: int = 0
    children_ages: List[int] = None  # 子女年龄列表

    # 保险需求
    main_concerns: List[str] = None  # 主要关注点
    existing_coverage: Dict[str, float] = None  # 现有保障 {"重疾": 500000, "寿险": 1000000}

    # 财务状况
    budget: float = 0  # 年缴保费预算（港币）
    assets: float = 0  # 资产总额（可选）
    liabilities: float = 0  # 负债总额（可选）

    # 健康状况
    health_status: str = "健康"  # 健康/亚健康/有既往病史
    has_chronic_disease: bool = False

    # 其他信息
    occupation: str = ""  # 职业
    risk_tolerance: str = "中等"  # 低/中等/高

    def __post_init__(self):
        """初始化后处理"""
        if self.main_concerns is None:
            self.main_concerns = []
        if self.children_ages is None:
            self.children_ages = []
        if self.existing_coverage is None:
            self.existing_coverage = {}


@dataclass
class ProductMatch:
    """产品匹配结果"""
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
    ai_recommendation_prompt: str
    plan_summary: str = ""  # 计划书产品概要
    plan_details: str = ""  # 计划书详情

    # 匹配评分
    match_score: float = 0.0  # 总体匹配度 (0-100)
    age_match_score: float = 0.0
    income_match_score: float = 0.0
    need_match_score: float = 0.0
    budget_match_score: float = 0.0
    life_stage_match_score: float = 0.0

    # 推荐信息
    is_recommended: bool = False
    priority: int = 0  # 推荐优先级 1-3
    recommendation_reason: str = ""


@dataclass
class ConsultationResult:
    """咨询结果数据结构"""
    # 客户分析
    customer_analysis: str  # 客户需求分析
    risk_assessment: str  # 风险评估
    coverage_gap: Dict[str, str]  # 保障缺口分析

    # 产品推荐
    recommended_products: List[Dict]  # 推荐产品列表（前3名）
    alternative_products: List[Dict]  # 备选产品列表

    # 专业建议
    professional_advice: str  # 专业建议
    budget_planning: Dict[str, float]  # 预算规划
    warnings: List[str]  # 注意事项

    # 保障方案
    total_annual_premium: float  # 总年缴保费
    total_coverage_amount: float  # 总保障额度
    protection_plan: Dict[str, str]  # 保障方案说明


class ProductMatchingEngine:
    """产品匹配引擎"""

    def __init__(self):
        """初始化匹配引擎"""
        pass

    def calculate_age_match_score(self, customer_age: int,
                                   product_age_min: Optional[int],
                                   product_age_max: Optional[int]) -> float:
        """
        计算年龄匹配度评分

        Args:
            customer_age: 客户年龄
            product_age_min: 产品目标最小年龄
            product_age_max: 产品目标最大年龄

        Returns:
            评分 (0-100)
        """
        # 如果产品没有年龄限制，返回中等分数
        if product_age_min is None and product_age_max is None:
            return 60.0

        # 完全匹配
        if product_age_min is None:
            product_age_min = 0
        if product_age_max is None:
            product_age_max = 100

        if product_age_min <= customer_age <= product_age_max:
            # 在范围内，计算位置得分（中间位置得分更高）
            age_range = product_age_max - product_age_min
            if age_range > 0:
                middle = (product_age_min + product_age_max) / 2
                distance_from_middle = abs(customer_age - middle)
                position_score = 100 - (distance_from_middle / (age_range / 2) * 20)
                return max(80, min(100, position_score))
            return 100.0

        # 不在范围内，根据距离递减
        if customer_age < product_age_min:
            distance = product_age_min - customer_age
        else:
            distance = customer_age - product_age_max

        # 距离越大，分数越低（最多扣50分）
        penalty = min(distance * 5, 50)
        return max(0, 50 - penalty)

    def calculate_income_match_score(self, customer_income: float,
                                     min_required_income: float) -> float:
        """
        计算收入匹配度评分

        Args:
            customer_income: 客户年收入
            min_required_income: 产品要求的最低年收入

        Returns:
            评分 (0-100)
        """
        if min_required_income == 0 or min_required_income is None:
            return 80.0  # 没有收入要求，给中上分数

        if customer_income >= min_required_income:
            # 收入达标，根据超出程度给分
            ratio = customer_income / min_required_income
            if ratio >= 2.0:
                return 100.0  # 收入是要求的2倍以上
            elif ratio >= 1.5:
                return 95.0
            elif ratio >= 1.2:
                return 90.0
            else:
                return 85.0
        else:
            # 收入不足，根据缺口扣分
            ratio = customer_income / min_required_income
            if ratio >= 0.8:
                return 70.0  # 差20%，还可以考虑
            elif ratio >= 0.6:
                return 50.0  # 差40%，勉强
            else:
                return 20.0  # 差距太大

    def calculate_need_match_score(self, customer_concerns: List[str],
                                   product_coverage_type: str,
                                   product_features: List[str]) -> float:
        """
        计算需求匹配度评分

        Args:
            customer_concerns: 客户关注点列表
            product_coverage_type: 产品保障类型
            product_features: 产品特点列表

        Returns:
            评分 (0-100)
        """
        if not customer_concerns:
            return 60.0  # 没有明确需求，返回中等分数

        score = 0.0
        matches = 0

        # 解析产品保障类型
        coverage_types = [ct.strip() for ct in product_coverage_type.split(',')] if product_coverage_type else []

        # 关注点与保障类型的映射
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

        for concern in customer_concerns:
            # 检查保障类型匹配
            if concern in concern_to_coverage:
                keywords = concern_to_coverage[concern]
                for keyword in keywords:
                    for coverage in coverage_types:
                        if keyword in coverage:
                            matches += 1
                            score += 30
                            break

            # 检查产品特点匹配
            for feature in product_features:
                if any(keyword in feature for keyword in concern.split()):
                    matches += 0.5
                    score += 10

        # 标准化分数
        if matches > 0:
            score = min(100, score)
        else:
            score = 30  # 没有匹配，给基础分

        return score

    def calculate_budget_match_score(self, annual_premium: float,
                                     customer_budget: float) -> float:
        """
        计算预算匹配度评分

        Args:
            annual_premium: 产品年缴保费
            customer_budget: 客户预算

        Returns:
            评分 (0-100)
        """
        if customer_budget == 0:
            return 60.0  # 没有明确预算，返回中等分数

        ratio = annual_premium / customer_budget

        if ratio <= 0.8:
            return 100.0  # 保费低于预算80%，很好
        elif ratio <= 1.0:
            return 95.0  # 保费在预算内
        elif ratio <= 1.2:
            return 80.0  # 超预算20%，可以接受
        elif ratio <= 1.5:
            return 60.0  # 超预算50%，勉强
        else:
            return max(0, 60 - (ratio - 1.5) * 40)  # 超太多，分数快速下降

    def calculate_life_stage_match_score(self, customer_life_stage: str,
                                        product_life_stage: str) -> float:
        """
        计算人生阶段匹配度评分

        Args:
            customer_life_stage: 客户人生阶段
            product_life_stage: 产品目标人生阶段

        Returns:
            评分 (0-100)
        """
        if not product_life_stage or not customer_life_stage:
            return 60.0

        # 解析产品支持的人生阶段
        stages = [s.strip() for s in product_life_stage.split(',')]

        if customer_life_stage in stages:
            return 100.0  # 完全匹配

        # 相邻阶段也有一定匹配度
        stage_order = ['扶幼保障期', '收入成长期', '责任高峰期', '责任递减期', '退休期']

        try:
            customer_idx = stage_order.index(customer_life_stage)
            for stage in stages:
                if stage in stage_order:
                    product_idx = stage_order.index(stage)
                    distance = abs(customer_idx - product_idx)
                    if distance == 1:
                        return 70.0  # 相邻阶段
                    elif distance == 2:
                        return 40.0  # 隔一个阶段
        except ValueError:
            pass

        return 20.0  # 不匹配

    def calculate_overall_match_score(self, product_match: ProductMatch) -> float:
        """
        计算总体匹配度评分

        Args:
            product_match: 产品匹配对象

        Returns:
            总体评分 (0-100)
        """
        # 权重分配
        weights = {
            'age': 0.20,      # 年龄 20%
            'income': 0.15,   # 收入 15%
            'need': 0.35,     # 需求 35%
            'budget': 0.20,   # 预算 20%
            'life_stage': 0.10,  # 人生阶段 10%
        }

        total_score = (
            product_match.age_match_score * weights['age'] +
            product_match.income_match_score * weights['income'] +
            product_match.need_match_score * weights['need'] +
            product_match.budget_match_score * weights['budget'] +
            product_match.life_stage_match_score * weights['life_stage']
        )

        return round(total_score, 2)

    def match_products(self, customer: CustomerInfo,
                      products: List[Dict]) -> List[ProductMatch]:
        """
        匹配产品并评分

        Args:
            customer: 客户信息
            products: 产品列表

        Returns:
            匹配结果列表，按评分降序排列
        """
        matches = []

        for product in products:
            # 创建ProductMatch对象
            match = ProductMatch(
                product_id=product['id'],
                product_name=product['product_name'],
                company_name=product['company_name'],
                annual_premium=float(product['annual_premium']),
                payment_period=product['payment_period'],
                coverage_type=product.get('coverage_type', ''),
                target_age_min=product.get('target_age_min'),
                target_age_max=product.get('target_age_max'),
                target_life_stage=product.get('target_life_stage', ''),
                min_annual_income=float(product.get('min_annual_income', 0)),
                features=product.get('features', []),
                description=product.get('description', ''),
                ai_recommendation_prompt=product.get('ai_recommendation_prompt', ''),
                plan_summary=product.get('plan_summary', ''),
                plan_details=product.get('plan_details', ''),
            )

            # 计算各项评分
            match.age_match_score = self.calculate_age_match_score(
                customer.age, match.target_age_min, match.target_age_max
            )

            match.income_match_score = self.calculate_income_match_score(
                customer.annual_income, match.min_annual_income
            )

            match.need_match_score = self.calculate_need_match_score(
                customer.main_concerns, match.coverage_type, match.features
            )

            match.budget_match_score = self.calculate_budget_match_score(
                match.annual_premium, customer.budget
            )

            match.life_stage_match_score = self.calculate_life_stage_match_score(
                customer.life_stage, match.target_life_stage
            )

            # 计算总体评分
            match.match_score = self.calculate_overall_match_score(match)

            matches.append(match)

        # 按评分降序排列
        matches.sort(key=lambda x: x.match_score, reverse=True)

        # 标记推荐产品（前3名）
        for i, match in enumerate(matches[:3]):
            match.is_recommended = True
            match.priority = i + 1

        return matches


class AIConsultantService:
    """AI保险顾问服务"""

    def __init__(self):
        """初始化服务"""
        # 初始化Gemini客户端
        api_key = os.environ.get('GEMINI_API_KEY') or settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY未配置")

        self.client = genai.Client(api_key=api_key)
        self.model_name = 'gemini-2.0-flash-exp'

        # 初始化匹配引擎
        self.matching_engine = ProductMatchingEngine()

    def analyze_customer_needs(self, customer: CustomerInfo,
                              matched_products: List[ProductMatch]) -> ConsultationResult:
        """
        AI分析客户需求并生成咨询报告

        Args:
            customer: 客户信息
            matched_products: 匹配的产品列表

        Returns:
            咨询结果
        """
        try:
            # 构建AI提示词
            prompt = self._build_consultation_prompt(customer, matched_products)

            # 调用Gemini API
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)]
                )]
            )

            # 解析AI响应
            result_text = response.text
            logger.info(f"AI咨询服务响应: {result_text[:500]}...")

            # 解析JSON
            try:
                ai_result = json.loads(result_text)
            except json.JSONDecodeError:
                # 尝试提取JSON部分
                import re
                json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
                if json_match:
                    ai_result = json.loads(json_match.group())
                else:
                    raise ValueError("无法解析AI响应为JSON格式")

            # 构建咨询结果
            result = ConsultationResult(
                customer_analysis=ai_result.get('customer_analysis', ''),
                risk_assessment=ai_result.get('risk_assessment', ''),
                coverage_gap=ai_result.get('coverage_gap', {}),
                recommended_products=ai_result.get('recommended_products', []),
                alternative_products=ai_result.get('alternative_products', []),
                professional_advice=ai_result.get('professional_advice', ''),
                budget_planning=ai_result.get('budget_planning', {}),
                warnings=ai_result.get('warnings', []),
                total_annual_premium=ai_result.get('total_annual_premium', 0),
                total_coverage_amount=ai_result.get('total_coverage_amount', 0),
                protection_plan=ai_result.get('protection_plan', {}),
            )

            return result

        except Exception as e:
            logger.error(f"AI咨询分析错误: {str(e)}", exc_info=True)
            raise

    def _build_consultation_prompt(self, customer: CustomerInfo,
                                   matched_products: List[ProductMatch]) -> str:
        """构建AI咨询提示词"""

        # 格式化客户信息
        customer_info_text = f"""
## 客户基本信息

### 个人资料
- 年龄：{customer.age} 岁
- 性别：{customer.gender}
- 年收入：{customer.annual_income:,.0f} 港币
- 职业：{customer.occupation or '未提供'}

### 人生阶段
- 当前阶段：{customer.life_stage}
- 家庭状况：{customer.family_status}
- 是否有子女：{'是' if customer.has_children else '否'}
"""

        if customer.has_children:
            customer_info_text += f"- 子女数量：{customer.children_count} 人\n"
            if customer.children_ages:
                customer_info_text += f"- 子女年龄：{', '.join(map(str, customer.children_ages))} 岁\n"

        customer_info_text += f"""
### 保险需求
- 主要关注：{', '.join(customer.main_concerns) if customer.main_concerns else '未明确'}
- 健康状况：{customer.health_status}
- 有慢性病：{'是' if customer.has_chronic_disease else '否'}
- 风险承受度：{customer.risk_tolerance}

### 财务状况
- 年缴保费预算：{customer.budget:,.0f} 港币
"""

        if customer.assets > 0:
            customer_info_text += f"- 资产总额：{customer.assets:,.0f} 港币\n"
        if customer.liabilities > 0:
            customer_info_text += f"- 负债总额：{customer.liabilities:,.0f} 港币\n"

        if customer.existing_coverage:
            customer_info_text += "\n### 现有保障\n"
            for coverage_type, amount in customer.existing_coverage.items():
                customer_info_text += f"- {coverage_type}：{amount:,.0f} 港币\n"

        # 格式化匹配产品信息（前5名）
        products_text = "\n## 匹配产品列表（按匹配度排序）\n\n"

        for i, match in enumerate(matched_products[:5], 1):
            products_text += f"""
### 产品 {i}：{match.product_name}

**基本信息**
- 保险公司：{match.company_name}
- 产品ID：{match.product_id}
- 年缴保费：{match.annual_premium:,.0f} 港币
- 缴费年期：{match.payment_period} 年
- 总保费：{match.annual_premium * match.payment_period:,.0f} 港币

**产品属性**
- 保障类型：{match.coverage_type}
- 适合年龄：{match.target_age_min or '不限'}-{match.target_age_max or '不限'} 岁
- 适合人生阶段：{match.target_life_stage or '不限'}
- 建议年收入：{match.min_annual_income:,.0f} 港币以上

**产品特点**
{chr(10).join(f'- {feature}' for feature in match.features) if match.features else '- 暂无'}

**产品描述**
{match.description or '暂无详细描述'}

"""
            # 添加计划书产品概要（重要背景资料）
            if match.plan_summary:
                products_text += f"""**📋 计划书产品概要**
{match.plan_summary}

"""

            # 添加计划书详情（详细背景资料）
            if match.plan_details:
                products_text += f"""**📖 计划书详细信息**
{match.plan_details}

"""

            products_text += f"""**匹配度分析**
- 总体匹配度：{match.match_score:.1f}/100
- 年龄匹配：{match.age_match_score:.1f}/100
- 收入匹配：{match.income_match_score:.1f}/100
- 需求匹配：{match.need_match_score:.1f}/100
- 预算匹配：{match.budget_match_score:.1f}/100
- 阶段匹配：{match.life_stage_match_score:.1f}/100

"""
            if match.ai_recommendation_prompt:
                products_text += f"**AI推荐参考**\n{match.ai_recommendation_prompt}\n\n"

        # 完整提示词
        prompt = f"""# 角色定位
你是一位专业的保险规划顾问，拥有以下资质：
- CFP国际认证理财规划师
- 20年以上保险行业从业经验
- 擅长家庭风险管理和财务规划
- 精通台湾保险市场和监管政策

# 核心原则
1. **客户至上**：始终以客户的最佳利益为出发点
2. **量力而行**：推荐方案必须符合客户财务能力，避免过度保险
3. **风险导向**：优先解决客户面临的最大风险
4. **长期规划**：提供可持续、可调整的保障方案
5. **透明诚信**：如实说明产品优缺点，不夸大承诺

{customer_info_text}

{products_text}

---

# 重要说明

**关于产品信息来源**：
每个产品的"📋 计划书产品概要"和"📖 计划书详细信息"是官方计划书的真实内容，包含了产品的核心特点、保障范围、理赔条款等权威信息。这些信息是你推荐产品的**最重要依据**，请优先参考这些官方资料，而不是仅依赖"产品描述"或"产品特点"字段。

在分析和推荐产品时，务必：
1. 仔细阅读每个产品的计划书概要和详情
2. 基于计划书内容准确理解产品的保障内容、适用范围、理赔条件
3. 在推荐理由中引用计划书的具体内容（如保障项目、赔付条件、特色条款等）
4. 如果计划书中有明确的优势或限制，必须如实告知客户

---

# 分析任务

请基于上述客户信息和产品列表（特别是计划书详细信息），提供专业的保险咨询建议。

## 第一步：深度需求分析
1. **人生阶段特征**：分析该阶段的典型风险和保险需求
2. **家庭责任评估**：评估家庭经济支柱的保障责任
3. **财务健康度**：分析收入、预算、负债的合理性
4. **保险需求优先级**：确定最紧迫的保障需求（1-5级）

## 第二步：风险评估
1. **身故风险**：如果客户身故，家庭会面临多大的财务缺口？
2. **重疾风险**：大病治疗费用和收入中断损失如何弥补？
3. **医疗费用风险**：日常医疗和住院费用的负担能力？
4. **长期照护风险**：失能或老年照护的资金准备？
5. **子女教育风险**（如适用）：教育资金是否充足？

## 第三步：保障缺口分析
针对每个风险点，计算：
- 现有保障额度（如有）
- 建议保障额度（基于科学方法）
- 保障缺口 = 建议额度 - 现有额度

**建议保障额度计算方法**：
- 寿险：年收入 × 10 + 未还贷款 + 子女教育金 - 现有流动资产
- 重疾险：年收入 × 3-5（治疗费+康复费+收入损失）
- 医疗险：根据医疗通膨和家庭病史评估
- 意外险：年收入 × 5-10

## 第四步：产品推荐
从提供的产品列表中，推荐最合适的3个产品，要求：
1. **必须选择列表中的产品**（使用product_id）
2. **匹配度优先**：优先考虑匹配度高的产品
3. **保障互补**：推荐的产品应覆盖不同风险
4. **预算合理**：总保费应在客户预算范围内（允许超出10-20%，但需说明理由）
5. **详细理由**：每个产品至少200字推荐理由，说明：
   - 为什么选择这个产品？
   - 它解决客户哪个具体风险？
   - 相比其他产品的优势在哪里？
   - 保费是否合理？

## 第五步：专业建议
1. **保障规划建议**：先保障后储蓄，先大人后小孩
2. **缴费期限建议**：根据年龄和收入稳定性建议缴费年期
3. **保额配置建议**：各类险种的保额如何搭配
4. **产品组合策略**：定期+终身、主险+附加险的组合思路
5. **未来调整方向**：3-5年后如何调整保单

## 第六步：风险提示
至少提供5条注意事项，包括但不限于：
- 健康告知的重要性
- 等待期的影响
- 保费缴纳能力评估
- 保单条款理解
- 受益人指定建议

---

# 输出格式要求

**严格按照以下JSON格式返回，不要有任何额外文字或说明**

```json
{{
    "customer_analysis": "【客户需求深度分析】300-400字，包含：\n1. 人生阶段特点及典型风险\n2. 家庭责任量化分析\n3. 财务状况健康度评估\n4. 保险需求优先级排序（用1-5星标注）\n\n示例：\n该客户处于[人生阶段]，是家庭经济的[主要/次要]支柱...",

    "risk_assessment": "【风险评估报告】200-300字，包含：\n1. 最大风险点识别（如：身故、重疾、医疗等）\n2. 每个风险的潜在财务损失（量化）\n3. 风险紧急程度评级（高/中/低）\n4. 现有保障的不足之处\n\n示例：\n若客户不幸身故，家庭将面临年收入XX万中断，房贷XX万需偿还...",

    "coverage_gap": {{
        "寿险": "缺口分析：建议保额XX万（计算方式：年收入×10+房贷+教育金），现有XX万，缺口XX万",
        "重疾": "缺口分析：建议保额XX万（年收入×5，涵盖3-5年康复期），现有XX万，缺口XX万",
        "医疗": "缺口分析：建议每年XX万额度（覆盖住院、手术、特殊疾病），现有XX万，缺口XX万",
        "意外": "缺口分析：建议保额XX万（年收入×5-10），现有XX万，缺口XX万"
    }},

    "recommended_products": [
        {{
            "product_id": 1,
            "product_name": "产品名称（必须来自列表）",
            "company_name": "保险公司名称",
            "annual_premium": 50000,
            "reason": "【详细推荐理由】200-250字：\n\n1. 为什么选择这个产品？\n分析客户的具体情况（年龄XX、收入XX、家庭状况XX），这个产品的[保障类型]正好契合客户的[具体需求]...\n\n2. 它解决什么问题？\n这个产品可以提供XX万的保障额度，弥补客户在[风险点]的缺口，如果发生[风险情况]，可以...\n\n3. 优势在哪里？\n相比其他产品，这个产品的优势在于：[特点1：如多次赔付]、[特点2：如保费豁免]、[特点3：如保障全面]...\n\n4. 保费合理性？\n年缴XX万，占年收入的XX%，符合保险规划的合理区间（10-15%），且在客户预算XX万范围内...",
            "priority": 1,
            "suitability_score": 92.5,
            "coverage_highlights": [
                "保障亮点1：具体说明（如：多次赔付，最多5次）",
                "保障亮点2：具体说明（如：轻症豁免保费）",
                "保障亮点3：具体说明（如：涵盖100种重疾）"
            ],
            "estimated_coverage": "预估总保障额度：XX万港币（身故/全残/重疾）"
        }},
        {{
            "product_id": 2,
            "product_name": "第二个推荐产品",
            "company_name": "保险公司",
            "annual_premium": 30000,
            "reason": "【详细推荐理由】200-250字...",
            "priority": 2,
            "suitability_score": 88.0,
            "coverage_highlights": ["亮点1", "亮点2", "亮点3"],
            "estimated_coverage": "XX万港币"
        }},
        {{
            "product_id": 3,
            "product_name": "第三个推荐产品",
            "company_name": "保险公司",
            "annual_premium": 25000,
            "reason": "【详细推荐理由】200-250字...",
            "priority": 3,
            "suitability_score": 85.0,
            "coverage_highlights": ["亮点1", "亮点2", "亮点3"],
            "estimated_coverage": "XX万港币"
        }}
    ],

    "alternative_products": [
        {{
            "product_id": 4,
            "product_name": "备选产品1",
            "company_name": "保险公司",
            "annual_premium": 20000,
            "brief_description": "作为备选的原因（100字）：这个产品的优势是XX，但相比推荐产品，在XX方面略逊一筹，可作为预算有限时的替代方案..."
        }},
        {{
            "product_id": 5,
            "product_name": "备选产品2",
            "company_name": "保险公司",
            "annual_premium": 18000,
            "brief_description": "作为备选的原因（100字）..."
        }}
    ],

    "professional_advice": "【专业建议】400-500字，分为以下部分：\n\n## 一、保障规划建议\n根据客户情况，建议采用'先保障后储蓄'的策略。优先配置定期寿险和重疾险，确保家庭经济支柱的风险得到覆盖...\n\n## 二、缴费期限建议\n考虑到客户XX岁，职业XX，收入稳定性XX，建议选择XX年缴费期。理由是...\n\n## 三、保额配置建议\n- 寿险：XX万（年收入×10的原则）\n- 重疾险：XX万（年收入×3-5）\n- 医疗险：XX万/年（覆盖住院+门诊）\n- 意外险：XX万（年收入×5-10）\n\n## 四、产品组合策略\n建议采用'定期+终身'的组合：定期险提供高保额低保费，终身险提供终身保障和储蓄功能...\n\n## 五、未来调整方向\n- 3年后：当子女进入XX阶段，需要加强教育金储备...\n- 5年后：当家庭责任减轻，可以考虑增加退休规划类产品...\n- 10年后：当接近退休期，重点转向医疗和长期照护保障...",

    "budget_planning": {{
        "recommended_total": 105000,
        "breakdown": {{
            "寿险": 40000,
            "重疾险": 35000,
            "医疗险": 20000,
            "其他": 10000
        }},
        "budget_ratio": "17.5%（年收入60万的17.5%，略高于标准15%，但考虑到家庭责任重大，属于合理范围）",
        "payment_strategy": "建议采用月缴方式，每月约8,750元，减轻一次性缴费压力。如果资金充裕，可选择年缴享受保费折扣（约95折）。"
    }},

    "warnings": [
        "⚠️ 健康告知的重要性：投保时必须如实告知健康状况，包括既往病史、家族病史等。若未如实告知，理赔时可能被拒赔。建议在填写健康告知前，仔细阅读条款或咨询专业人员。",
        "⚠️ 等待期的影响：大部分保险都有30-90天的等待期，等待期内发生的保险事故不予理赔（意外险除外）。建议尽早投保，避免保障空窗期。",
        "⚠️ 保费缴纳能力评估：年缴保费XX万，占年收入XX%。请确保未来XX年内有稳定收入支持保费缴纳。若中途断缴，可能面临保单失效风险。建议预留6个月保费作为紧急备用金。",
        "⚠️ 保单条款理解：购买前务必仔细阅读保险条款，特别是'保险责任'和'责任免除'部分。不清楚的地方要向业务员或客服咨询。可利用10天犹豫期仔细考虑，不满意可全额退保。",
        "⚠️ 受益人指定建议：寿险建议指定明确的受益人（配偶、子女等），避免'法定继承人'，以免理赔时产生纠纷。受益人可以随时变更，建议每年检视一次。如有多名受益人，需明确受益顺序和份额。"
    ],

    "total_annual_premium": 105000,
    "total_coverage_amount": 5000000,

    "protection_plan": {{
        "immediate_protection": "【立即需要的保障】（0-1年）\n优先配置推荐的3个产品，快速建立基础保障网。总保费约XX万，提供XX万保障额度，覆盖身故、重疾、医疗三大风险。这是最紧迫的保障需求，建议1个月内完成投保。",
        "medium_term_plan": "【中期保障规划】（3-5年）\n随着收入增长和家庭变化，建议：1）增加重疾险保额至XX万（目前通膨下，医疗费用持续上升）；2）为子女配置教育金保险；3）考虑增加意外险保额；4）评估是否需要长期照护保险。预计每年增加保费XX万。",
        "long_term_plan": "【长期保障规划】（5年以上）\n当子女成年、房贷还清后，家庭责任逐渐减轻，保障重点转向：1）退休规划：增配年金保险，确保退休后有稳定现金流；2）医疗升级：从基础医疗险升级到高端医疗险；3）长期照护：加强失能护理保障；4）资产传承：利用终身寿险进行财富传承规划。"
    }}
}}
```

---

# 质量检查清单

输出前请自我检查：
✅ 所有推荐产品的product_id都来自提供的产品列表
✅ 每个推荐产品都有200字以上的详细理由
✅ 保障缺口分析都有具体的金额和计算方法
✅ 预算规划合理（通常为年收入的10-20%）
✅ 至少提供5条具体的注意事项
✅ 所有数字字段都是数值类型（不是字符串）
✅ JSON格式完全正确，没有多余的注释或说明文字

请立即输出完整的JSON结果。
"""

        return prompt

    def consult(self, customer_info: Dict, products: List[Dict]) -> Dict:
        """
        完整咨询流程

        Args:
            customer_info: 客户信息字典
            products: 产品列表

        Returns:
            咨询结果字典
        """
        # 创建CustomerInfo对象
        customer = CustomerInfo(**customer_info)

        # 产品匹配和评分
        matched_products = self.matching_engine.match_products(customer, products)

        logger.info(f"产品匹配完成，共匹配到 {len(matched_products)} 个产品")
        logger.info(f"Top 3 产品评分: {[(p.product_name, p.match_score) for p in matched_products[:3]]}")

        # AI分析
        consultation_result = self.analyze_customer_needs(customer, matched_products)

        # 转换为字典格式
        result_dict = asdict(consultation_result)

        # 添加匹配产品信息（用于前端展示详细评分）
        result_dict['matched_products_detail'] = [
            {
                'product_id': m.product_id,
                'product_name': m.product_name,
                'company_name': m.company_name,
                'match_score': m.match_score,
                'age_match_score': m.age_match_score,
                'income_match_score': m.income_match_score,
                'need_match_score': m.need_match_score,
                'budget_match_score': m.budget_match_score,
                'life_stage_match_score': m.life_stage_match_score,
            }
            for m in matched_products[:10]
        ]

        return result_dict


def get_ai_consultant_service() -> AIConsultantService:
    """获取AI顾问服务实例"""
    return AIConsultantService()
