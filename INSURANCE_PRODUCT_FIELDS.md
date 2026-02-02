# InsuranceProduct 模型字段详解

## 完整字段列表

InsuranceProduct 模型共有 **18个字段**，分为6大类：

```
📦 InsuranceProduct (insurance_products 表)
├── 🏢 关联字段 (1个)
│   └── company
├── 📝 基本信息 (4个)
│   ├── product_name
│   ├── payment_period
│   ├── annual_premium
│   └── description
├── 📊 数据表格 (2个)
│   ├── surrender_value_table
│   └── death_benefit_table
├── 🎯 AI推荐元数据 (6个)
│   ├── target_age_min
│   ├── target_age_max
│   ├── target_life_stage
│   ├── coverage_type
│   ├── min_annual_income
│   ├── features
│   └── ai_recommendation_prompt
├── ⚙️ 产品特性 (2个)
│   ├── is_withdrawal
│   └── is_active
└── 📅 系统字段 (3个)
    ├── sort_order
    ├── created_at
    └── updated_at
```

---

## 一、关联字段

### 1. company
- **类型**: ForeignKey → InsuranceCompany
- **中文名**: 所属保险公司
- **必填**: 是
- **说明**: 关联到保险公司表，每个产品属于一家保险公司
- **示例**: `1` (友邦 AIA)
- **级联删除**: 当保险公司被删除时，其所有产品也会被删除

---

## 二、基本信息字段

### 2. product_name
- **类型**: CharField(max_length=200)
- **中文名**: 产品名称
- **必填**: 是
- **示例**:
  - `"环宇盈活储蓄寿险计划"`
  - `"世誉财富"`
  - `"盈御多元货币计划"`
- **用途**: 显示在对比表格、产品列表等处

### 3. payment_period
- **类型**: IntegerField
- **中文名**: 缴费年期
- **必填**: 是
- **单位**: 年
- **常见值**: 1, 2, 5, 10
- **示例**: `5` (5年期)
- **说明**: 客户需要缴纳保费的年数
- **用途**: 产品筛选、对比分组的关键字段

### 4. annual_premium
- **类型**: DecimalField(max_digits=15, decimal_places=2)
- **中文名**: 年缴金额
- **必填**: 是
- **单位**: 港币 (HK$)
- **示例**:
  - `10000.00` (5年期产品)
  - `100000.00` (1-2年期产品)
- **说明**: 每年需要缴纳的保费金额
- **用途**: 计算总保费、IRR等财务指标

### 5. description
- **类型**: TextField
- **中文名**: 产品描述
- **必填**: 否
- **示例**: `"一款高收益储蓄保险产品，适合长期财富增值"`
- **用途**: 产品详情页展示

---

## 三、数据表格字段

### 6. surrender_value_table
- **类型**: TextField (存储JSON字符串)
- **中文名**: 退保发还金额表
- **必填**: 否（但Company Comparison功能必需）
- **格式**: JSON数组
- **数据结构**:
```json
[
  {
    "year": 1,
    "guaranteed": 0,
    "non_guaranteed": 0,
    "total": 0
  },
  {
    "year": 2,
    "guaranteed": 2500,
    "non_guaranteed": 19200,
    "total": 21700
  },
  {
    "year": 5,
    "guaranteed": 25000,
    "non_guaranteed": 96000,
    "total": 121000
  }
]
```

**字段说明**:
- `year`: 保单年度终结
- `guaranteed`: 保证现金价值（保险公司承诺的最低金额）
- `non_guaranteed`: 非保证现金价值（根据投资收益浮动）
- `total`: 总现金价值（预期价值 = guaranteed + non_guaranteed）

**用途**:
- ✅ Company Comparison 页面对比展示
- ✅ 计算IRR、单利回报率
- ✅ 标记回本期

**数据完整性**: 100% (27/27产品已配置)

### 7. death_benefit_table
- **类型**: TextField (存储JSON字符串)
- **中文名**: 身故保险赔偿表
- **必填**: 否
- **格式**: JSON数组
- **数据结构**:
```json
[
  {
    "year": 1,
    "benefit": 100000
  },
  {
    "year": 2,
    "benefit": 150000
  },
  {
    "year": 5,
    "benefit": 200000
  }
]
```

**字段说明**:
- `year`: 保单年度
- `benefit`: 身故赔偿金额（受保人身故时保险公司赔付金额）

**用途**:
- ⚠️ 身故赔偿对比（待开发）
- ⚠️ 保障分析（待开发）

**数据完整性**: 37% (10/27产品已配置)

---

## 四、AI推荐元数据字段

### 8. target_age_min
- **类型**: IntegerField
- **中文名**: 目标年龄段最小值
- **必填**: 否
- **单位**: 岁
- **示例**: `25`
- **说明**: 适合购买该产品的最小年龄
- **用途**: AI智能推荐产品时的筛选条件

### 9. target_age_max
- **类型**: IntegerField
- **中文名**: 目标年龄段最大值
- **必填**: 否
- **单位**: 岁
- **示例**: `50`
- **说明**: 适合购买该产品的最大年龄
- **用途**: AI智能推荐产品时的筛选条件

### 10. target_life_stage
- **类型**: CharField(max_length=50)
- **中文名**: 目标人生阶段
- **必填**: 否
- **格式**: 逗号分隔的字符串
- **可选值**:
  - `扶幼保障期` (0-6岁父母)
  - `收入成长期` (25-35岁)
  - `责任高峰期` (35-50岁)
  - `责任递减期` (50-65岁)
  - `退休期` (65岁以上)
- **示例**: `"扶幼保障期,收入成长期"`
- **用途**: AI根据客户人生阶段推荐产品

### 11. coverage_type
- **类型**: CharField(max_length=100)
- **中文名**: 保障类型
- **必填**: 否
- **格式**: 逗号分隔的字符串
- **可选值**:
  - `储蓄` - 储蓄型保险
  - `重疾` - 重大疾病保险
  - `医疗` - 医疗保险
  - `教育基金` - 教育储蓄
  - `退休规划` - 养老金计划
  - `人寿` - 人寿保险
  - `意外` - 意外伤害保险
- **示例**: `"储蓄,教育基金,退休规划"`
- **用途**: AI根据客户需求推荐对应类型产品

### 12. min_annual_income
- **类型**: DecimalField(max_digits=15, decimal_places=2)
- **中文名**: 最低年收入要求
- **必填**: 否
- **单位**: 港币 (HK$)
- **示例**: `500000.00`
- **说明**: 建议购买该产品的最低年收入水平
- **用途**: AI根据客户收入水平推荐合适产品

### 13. features
- **类型**: JSONField
- **中文名**: 产品特点列表
- **必填**: 否
- **格式**: JSON数组
- **数据结构**:
```json
[
  "高额身故保障",
  "现金价值稳定增长",
  "可附加重疾保障",
  "支持多币种选择",
  "灵活提取功能"
]
```

**用途**:
- 产品详情页展示
- AI推荐时的特性匹配
- 营销文案生成

### 14. ai_recommendation_prompt
- **类型**: TextField
- **中文名**: AI推荐提示词
- **必填**: 否
- **示例**:
```
这是一款适合25-50岁中高收入人群的储蓄型保险产品。
主要特点：
1. 稳定的现金价值增长，适合长期财富规划
2. 支持多币种选择（美元/港币/人民币）
3. 灵活的提取功能，满足不同人生阶段需求
4. 适合为子女教育、退休养老做准备

推荐场景：
- 家庭经济支柱，希望为家庭提供长期保障
- 有子女教育金储备需求的父母
- 计划30-40年后退休的中青年人群
```

**用途**: 帮助AI更准确地理解产品特性，生成更专业的推荐理由

---

## 五、产品特性字段

### 15. is_withdrawal
- **类型**: BooleanField
- **中文名**: 是否提取
- **默认值**: False
- **说明**: 该产品是否支持定期提取功能（年度派息/入息）
- **示例**:
  - `True` - 支持提取（如：年度非保证入息）
  - `False` - 不支持提取（纯储蓄型）
- **用途**:
  - 产品筛选
  - 对比表格中标注提取功能
  - 计算实际现金流

### 16. is_active
- **类型**: BooleanField
- **中文名**: 是否启用
- **默认值**: True
- **说明**: 控制产品是否在前端显示
- **用途**:
  - 下架过期产品但保留数据
  - 测试产品时临时禁用
  - 产品维护时隐藏

---

## 六、系统字段

### 17. sort_order
- **类型**: IntegerField
- **中文名**: 排序
- **默认值**: 0
- **说明**: 数字越小越靠前
- **示例**:
  - `0` - 旗舰产品（优先展示）
  - `10` - 普通产品
  - `99` - 低优先级产品
- **用途**: 控制产品列表、对比表格中的显示顺序

### 18. created_at
- **类型**: DateTimeField
- **中文名**: 创建时间
- **自动生成**: 是 (auto_now_add=True)
- **示例**: `2026-01-26 10:30:15`
- **用途**: 审计、统计

### 19. updated_at
- **类型**: DateTimeField
- **中文名**: 更新时间
- **自动更新**: 是 (auto_now=True)
- **示例**: `2026-01-26 15:45:30`
- **用途**: 审计、追踪产品数据变更

---

## 字段分类汇总

### 必填字段 (4个)
1. ✅ company
2. ✅ product_name
3. ✅ payment_period
4. ✅ annual_premium

### 可选字段 (14个)
5. ⚪ description
6. ⚪ surrender_value_table (Company Comparison必需)
7. ⚪ death_benefit_table
8. ⚪ target_age_min
9. ⚪ target_age_max
10. ⚪ target_life_stage
11. ⚪ coverage_type
12. ⚪ min_annual_income
13. ⚪ features
14. ⚪ ai_recommendation_prompt
15. ⚪ is_withdrawal (有默认值False)
16. ⚪ is_active (有默认值True)
17. ⚪ sort_order (有默认值0)
18. ⚪ created_at (自动生成)
19. ⚪ updated_at (自动生成)

---

## 字段使用场景

### Company Comparison 页面
**必需字段**:
- ✅ company (显示公司信息)
- ✅ product_name (显示产品名称)
- ✅ payment_period (筛选条件)
- ✅ annual_premium (计算总保费)
- ✅ surrender_value_table (退保价值数据)

**可选字段**:
- ⚪ is_withdrawal (标注提取功能)
- ⚪ sort_order (排序)

### AI智能推荐
**核心字段**:
- ✅ target_age_min / target_age_max (年龄匹配)
- ✅ target_life_stage (人生阶段匹配)
- ✅ coverage_type (需求类型匹配)
- ✅ min_annual_income (收入水平匹配)
- ✅ features (特性展示)
- ✅ ai_recommendation_prompt (推荐理由生成)

### 产品详情页
**展示字段**:
- ✅ product_name (标题)
- ✅ company (公司信息)
- ✅ payment_period + annual_premium (缴费信息)
- ✅ description (详细描述)
- ✅ features (产品特点)
- ✅ surrender_value_table (退保价值图表)
- ✅ death_benefit_table (身故赔偿图表)
- ✅ is_withdrawal (提取功能说明)

---

## 数据完整性统计

| 字段 | 完整度 | 说明 |
|-----|-------|------|
| company | 100% | 所有产品必须关联公司 |
| product_name | 100% | 所有产品必须有名称 |
| payment_period | 100% | 所有产品必须有缴费年期 |
| annual_premium | 100% | 所有产品必须有年缴金额 |
| surrender_value_table | 100% | 27/27 产品已配置 |
| death_benefit_table | 37% | 10/27 产品已配置 |
| description | ~20% | 部分产品有描述 |
| AI推荐字段 | 0% | 所有字段待补充 |

---

## 数据库表信息

- **表名**: `insurance_products`
- **主键**: `id` (自增)
- **索引**: `(company_id, is_active)`
- **排序**: `company, sort_order, product_name`
- **字符集**: utf8mb4
- **引擎**: InnoDB

---

## Django Admin 字段分组

管理后台将字段分为6个折叠区域：

1. **基本信息**: company, product_name, description
2. **保费信息**: payment_period, annual_premium
3. **退保价值表**: surrender_value_table
4. **身故赔偿表**: death_benefit_table
5. **产品特性**: is_withdrawal
6. **状态与排序**: is_active, sort_order
7. **时间信息**: created_at, updated_at (折叠)

---

## API返回字段示例

### Company Comparison API
```json
{
  "product_id": 2,
  "product_name": "环宇盈活储蓄寿险计划",
  "standard_data": {
    "standard": [
      {"year": 1, "guaranteed": 0, "non_guaranteed": 0, "total": 0},
      {"year": 2, "guaranteed": 2500, "non_guaranteed": 19200, "total": 21700}
    ]
  }
}
```

### 产品详情API（建议）
```json
{
  "id": 2,
  "company": {
    "id": 1,
    "name": "友邦",
    "name_en": "AIA",
    "icon": "/aia.svg"
  },
  "product_name": "环宇盈活储蓄寿险计划",
  "payment_period": 5,
  "annual_premium": "10000.00",
  "description": "...",
  "features": ["高额身故保障", "现金价值稳定增长"],
  "is_withdrawal": false,
  "surrender_value_table": [...],
  "death_benefit_table": [...],
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-01-20T15:45:00Z"
}
```

---

## 常见操作

### 添加新产品
```python
from api.models import InsuranceProduct, InsuranceCompany
import json

# 获取公司
company = InsuranceCompany.objects.get(code='aia')

# 创建产品
product = InsuranceProduct.objects.create(
    company=company,
    product_name='新产品名称',
    payment_period=5,
    annual_premium=10000,
    surrender_value_table=json.dumps([
        {"year": 1, "guaranteed": 0, "non_guaranteed": 0, "total": 0},
        {"year": 2, "guaranteed": 2500, "non_guaranteed": 19200, "total": 21700}
    ]),
    is_active=True,
    sort_order=10
)
```

### 查询产品
```python
# 查询5年期产品
products = InsuranceProduct.objects.filter(
    payment_period=5,
    is_active=True
).select_related('company')

# 查询友邦的产品
aia_products = InsuranceProduct.objects.filter(
    company__code='aia',
    is_active=True
)
```

### 更新退保价值表
```python
product = InsuranceProduct.objects.get(id=1)
product.surrender_value_table = json.dumps([...])
product.save()
```

---

## 总结

InsuranceProduct 模型是整个保险对比系统的核心，包含18个精心设计的字段：

- ✅ **4个必填字段** - 确保产品基本信息完整
- ✅ **2个数据表格** - 支持退保价值和身故赔偿对比
- ✅ **7个AI推荐字段** - 为智能推荐系统预留扩展空间
- ✅ **5个系统字段** - 完善的状态管理和审计功能

当前数据已100%完成退保价值表配置，可完美支持 Company Comparison 功能。下一步重点是补充AI推荐元数据，实现智能产品推荐功能。
