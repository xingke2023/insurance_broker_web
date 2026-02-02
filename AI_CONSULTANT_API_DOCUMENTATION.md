# AI保险顾问API文档

## 概述

本文档描述AI保险顾问系统提供的REST API接口。系统提供两套API：
- **基础版API** (`/api/consultation/*`) - 简单快速，适合快速推荐
- **高级版API** (`/api/ai-consultant/*`) - 详细评分，适合深度咨询

---

## 认证

所有API端点都需要JWT Token认证。

### 请求头
```http
Authorization: Bearer <access_token>
```

### 获取Token
```http
POST /api/auth/login/
Content-Type: application/json

{
    "username": "your_username",
    "password": "your_password"
}
```

---

## 频率限制

### 高级版API限制
- **每分钟限制**: 3次请求
- **每小时限制**: 20次请求
- **超过限制**: 返回 429 Too Many Requests

### 响应头
```http
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 1704067200
```

---

## API端点

### 1. 基础版AI咨询

#### 1.1 获取AI推荐 (基础版)

**端点**: `POST /api/consultation/ai-recommend`

**描述**: 快速获取AI保险推荐，返回简单的分析结果。

**请求体**:
```json
{
    "age": 35,
    "gender": "男",
    "annual_income": 800000,
    "life_stage": "责任高峰期",
    "family_status": "已婚有子女",
    "has_children": true,
    "children_count": 2,
    "main_concerns": ["子女教育", "家庭保障", "重疾保障"],
    "budget": 100000
}
```

**响应示例**:
```json
{
    "success": true,
    "data": {
        "analysis": "客户需求分析...",
        "recommendations": [
            {
                "product_id": 1,
                "product_name": "某某储蓄险",
                "company_name": "XX保险公司",
                "reason": "推荐理由...",
                "priority": 1,
                "suitability_score": 92.5
            }
        ],
        "advice": "专业建议...",
        "warnings": ["注意事项1", "注意事项2"]
    }
}
```

---

#### 1.2 获取客户案例

**端点**: `GET /api/consultation/customer-cases`

**描述**: 获取不同人生阶段的保险配置案例。

**响应示例**:
```json
{
    "success": true,
    "cases": [
        {
            "life_stage": "扶幼保障期",
            "age_range": "25-30岁",
            "description": "刚步入职场或成家不久...",
            "example_profile": {
                "age": 28,
                "annual_income": 500000,
                "family_status": "已婚"
            },
            "key_points": [
                "保障为主，储蓄为辅",
                "选择高杠杆的定期寿险"
            ],
            "budget_suggestion": "年缴保费: 25,000-50,000 台币"
        }
    ]
}
```

---

### 2. 高级版AI顾问

#### 2.1 深度AI咨询 (高级版)

**端点**: `POST /api/ai-consultant/consult`

**描述**: 使用完整的产品匹配引擎和深度AI分析，提供详细的评分和保障方案。

**频率限制**:
- 每分钟3次
- 每小时20次

**请求体**:
```json
{
    // === 基本信息（必填） ===
    "age": 35,
    "gender": "男",
    "annual_income": 800000,

    // === 人生阶段（必填） ===
    "life_stage": "责任高峰期",

    // === 家庭状况（必填） ===
    "family_status": "已婚有子女",
    "has_children": true,
    "children_count": 2,
    "children_ages": [5, 8],

    // === 保险需求（必填） ===
    "main_concerns": ["子女教育", "家庭保障", "重疾保障"],
    "budget": 100000,

    // === 可选字段 ===
    "existing_coverage": {
        "重疾": 500000,
        "寿险": 1000000
    },
    "assets": 2000000,
    "liabilities": 500000,
    "health_status": "健康",
    "has_chronic_disease": false,
    "occupation": "软件工程师",
    "risk_tolerance": "中等"
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| age | int | ✅ | 年龄（18-100） | 35 |
| gender | string | ✅ | 性别 | "男"/"女" |
| annual_income | float | ✅ | 年收入（台币） | 800000 |
| life_stage | string | ✅ | 人生阶段 | "责任高峰期" |
| family_status | string | ✅ | 家庭状况 | "已婚有子女" |
| has_children | boolean | ❌ | 是否有子女 | true |
| children_count | int | ❌ | 子女数量 | 2 |
| children_ages | array | ❌ | 子女年龄列表 | [5, 8] |
| main_concerns | array | ❌ | 主要关注点 | ["家庭保障"] |
| budget | float | ❌ | 年缴保费预算 | 100000 |
| existing_coverage | object | ❌ | 现有保障 | {"重疾": 500000} |
| assets | float | ❌ | 资产总额 | 2000000 |
| liabilities | float | ❌ | 负债总额 | 500000 |
| health_status | string | ❌ | 健康状况 | "健康" |
| has_chronic_disease | boolean | ❌ | 是否有慢性病 | false |
| occupation | string | ❌ | 职业 | "软件工程师" |
| risk_tolerance | string | ❌ | 风险承受度 | "中等" |

**人生阶段选项**:
- `扶幼保障期` - 25-30岁
- `收入成长期` - 31-40岁
- `责任高峰期` - 41-50岁
- `责任递减期` - 51-60岁
- `退休期` - 60岁以上

**健康状况选项**:
- `健康`
- `亚健康`
- `有既往病史`

**风险承受度选项**:
- `低`
- `中等`
- `高`

**响应示例**:
```json
{
    "success": true,
    "cached": false,
    "data": {
        // === 客户分析 ===
        "customer_analysis": "客户当前35岁，正处于责任高峰期...",

        // === 风险评估 ===
        "risk_assessment": "主要面临的风险包括：1. 家庭经济支柱风险...",

        // === 保障缺口分析 ===
        "coverage_gap": {
            "寿险": "建议配置800-1000万台币的寿险保障",
            "重疾": "建议配置200-300万台币的重疾保障",
            "医疗": "建议配置实支实付型医疗险",
            "意外": "建议配置300-500万台币的意外险"
        },

        // === 推荐产品（前3名） ===
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

        // === 备选产品 ===
        "alternative_products": [
            {
                "product_id": 2,
                "product_name": "另一款产品",
                "company_name": "YY保险公司",
                "annual_premium": 70000,
                "brief_description": "作为备选方案，保费更低但保障范围略窄"
            }
        ],

        // === 专业建议 ===
        "professional_advice": "根据您的情况，建议采用以下保障策略...",

        // === 预算规划 ===
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

        // === 注意事项 ===
        "warnings": [
            "注意事项1：请如实告知健康状况，避免理赔纠纷",
            "注意事项2：优先配置保障型产品，再考虑储蓄型产品"
        ],

        // === 保障方案总结 ===
        "total_annual_premium": 95000,
        "total_coverage_amount": 15000000,

        // === 保障方案说明 ===
        "protection_plan": {
            "immediate_protection": "立即配置寿险和重疾险作为基础保障",
            "medium_term_plan": "3-5年内补充医疗险和子女教育金保险",
            "long_term_plan": "5年后根据收入增长情况，考虑增加保额"
        },

        // === 产品匹配详情（评分明细） ===
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
}
```

**错误响应**:
```json
{
    "success": false,
    "error": "缺少必填字段: age, annual_income"
}
```

**HTTP状态码**:
- `200 OK` - 成功
- `400 Bad Request` - 参数错误
- `401 Unauthorized` - 未认证
- `404 Not Found` - 未找到匹配产品
- `429 Too Many Requests` - 超过频率限制
- `500 Internal Server Error` - 服务器错误

---

#### 2.2 获取推荐产品列表

**端点**: `GET /api/ai-consultant/products`

**描述**: 获取符合筛选条件的产品列表，用于前端展示。

**查询参数**:

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| age | int | ❌ | 年龄 | 35 |
| annual_income | float | ❌ | 年收入 | 800000 |
| budget | float | ❌ | 预算 | 100000 |
| life_stage | string | ❌ | 人生阶段 | "责任高峰期" |
| coverage_type | string | ❌ | 保障类型 | "储蓄" |
| limit | int | ❌ | 返回数量（默认20，最大50） | 20 |

**请求示例**:
```http
GET /api/ai-consultant/products?age=35&annual_income=800000&budget=100000&limit=10
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
    "success": true,
    "count": 10,
    "products": [
        {
            "id": 1,
            "product_name": "某某储蓄险",
            "company_name": "XX保险公司",
            "company_icon": "🏦",
            "annual_premium": 50000,
            "payment_period": 10,
            "total_premium": 500000,
            "coverage_type": "储蓄,重疾",
            "target_age_range": "25-45岁",
            "target_life_stage": "收入成长期,责任高峰期",
            "min_annual_income": 500000,
            "features": [
                "高额身故保障",
                "现金价值稳定增长",
                "可附加重疾保障"
            ],
            "description": "适合有子女教育需求的家庭...",
            "is_withdrawal": false,
            "created_at": "2024-01-01T00:00:00Z"
        }
    ]
}
```

---

#### 2.3 获取咨询统计

**端点**: `GET /api/ai-consultant/stats`

**描述**: 获取当前用户的咨询统计信息。

**响应示例**:
```json
{
    "success": true,
    "stats": {
        "total_consultations": 5,
        "today_consultations": 2,
        "remaining_quota": 18,
        "last_consultation_time": "2024-01-01T10:00:00Z",
        "popular_concerns": [
            {
                "concern": "家庭保障",
                "count": 3
            },
            {
                "concern": "重疾保障",
                "count": 2
            }
        ]
    }
}
```

---

## 缓存机制

### 高级版API缓存

为了提高性能和减少AI调用次数，系统会缓存相同的咨询请求。

**缓存策略**:
- **缓存时长**: 1小时
- **缓存键**: 基于用户ID和请求参数的哈希值
- **缓存返回**: 响应中包含 `"cached": true` 字段

**响应示例（缓存命中）**:
```json
{
    "success": true,
    "cached": true,
    "data": { ... }
}
```

---

## 错误码

| HTTP状态码 | 错误说明 | 处理建议 |
|-----------|---------|---------|
| 400 | 参数错误 | 检查请求参数格式和必填字段 |
| 401 | 未认证 | 提供有效的JWT Token |
| 403 | 无权限 | 检查用户权限 |
| 404 | 未找到匹配产品 | 调整筛选条件 |
| 429 | 超过频率限制 | 等待后重试 |
| 500 | 服务器错误 | 联系技术支持 |

---

## 使用示例

### Python示例

```python
import requests

# 1. 登录获取Token
login_response = requests.post(
    'https://your-domain.com/api/auth/login/',
    json={
        'username': 'your_username',
        'password': 'your_password'
    }
)
access_token = login_response.json()['access']

# 2. 调用AI顾问接口
headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

consultation_data = {
    'age': 35,
    'gender': '男',
    'annual_income': 800000,
    'life_stage': '责任高峰期',
    'family_status': '已婚有子女',
    'has_children': True,
    'children_count': 2,
    'main_concerns': ['子女教育', '家庭保障'],
    'budget': 100000,
}

response = requests.post(
    'https://your-domain.com/api/ai-consultant/consult',
    headers=headers,
    json=consultation_data
)

result = response.json()
print(result['data']['recommended_products'])
```

---

### JavaScript示例

```javascript
// 1. 登录获取Token
const loginResponse = await fetch('https://your-domain.com/api/auth/login/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        username: 'your_username',
        password: 'your_password'
    })
});

const { access } = await loginResponse.json();

// 2. 调用AI顾问接口
const consultationData = {
    age: 35,
    gender: '男',
    annual_income: 800000,
    life_stage: '责任高峰期',
    family_status: '已婚有子女',
    has_children: true,
    children_count: 2,
    main_concerns: ['子女教育', '家庭保障'],
    budget: 100000,
};

const response = await fetch('https://your-domain.com/api/ai-consultant/consult', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${access}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(consultationData)
});

const result = await response.json();
console.log(result.data.recommended_products);
```

---

### cURL示例

```bash
# 1. 登录获取Token
TOKEN=$(curl -X POST https://your-domain.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}' \
  | jq -r '.access')

# 2. 调用AI顾问接口
curl -X POST https://your-domain.com/api/ai-consultant/consult \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 35,
    "gender": "男",
    "annual_income": 800000,
    "life_stage": "责任高峰期",
    "family_status": "已婚有子女",
    "has_children": true,
    "children_count": 2,
    "main_concerns": ["子女教育", "家庭保障"],
    "budget": 100000
  }'
```

---

## 性能优化建议

### 1. 使用缓存
相同的咨询请求会返回缓存结果，无需重新调用AI。

### 2. 批量查询产品
如果需要展示产品列表，使用 `/api/ai-consultant/products` 端点。

### 3. 前端预筛选
在前端先进行基本的数据验证，避免无效请求。

### 4. 异步处理
如果需要处理大量咨询，考虑使用异步任务队列。

---

## 最佳实践

### 1. 错误处理
```javascript
try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!data.success) {
        console.error('API错误:', data.error);
        // 显示错误提示
    }
} catch (error) {
    console.error('网络错误:', error);
    // 显示网络错误提示
}
```

### 2. 频率限制处理
```javascript
if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    console.log(`请等待 ${retryAfter} 秒后重试`);
    // 显示等待提示
}
```

### 3. 缓存管理
```javascript
// 检查是否使用缓存
if (data.cached) {
    console.log('使用缓存结果');
    // 可以显示"缓存"标识
}
```

---

## API版本对比

| 特性 | 基础版 | 高级版 |
|------|-------|-------|
| **端点** | `/api/consultation/ai-recommend` | `/api/ai-consultant/consult` |
| **评分系统** | ❌ 无 | ✅ 6维度评分 |
| **保障缺口分析** | ❌ 无 | ✅ 4类保障 |
| **预算规划** | ❌ 无 | ✅ 详细分解 |
| **时间规划** | ❌ 无 | ✅ 3个阶段 |
| **产品详情** | ❌ 无 | ✅ 评分明细 |
| **频率限制** | 无 | 3/分钟, 20/小时 |
| **缓存** | 无 | 1小时 |
| **响应速度** | 快 | 中等 |
| **适用场景** | 快速推荐 | 深度咨询 |

---

## 常见问题

### Q1: 为什么返回429错误？
**A**: 您超过了频率限制（每分钟3次或每小时20次）。请等待后重试。

### Q2: 为什么返回404错误？
**A**: 没有找到匹配的保险产品。请调整筛选条件，如增加预算或放宽年龄范围。

### Q3: 缓存多久过期？
**A**: 缓存会在1小时后过期。如果需要强制刷新，可以修改请求参数。

### Q4: 如何清除缓存？
**A**: 缓存会自动过期。如需强制清除，请联系技术支持。

### Q5: 产品数据多久更新一次？
**A**: 产品数据由管理员维护，更新频率根据实际情况而定。

---

## 支持

如有问题或建议，请联系：
- **技术支持**: support@example.com
- **API文档**: https://docs.example.com
- **GitHub**: https://github.com/example/insurance-api

---

## 更新日志

### v1.0.0 (2026-01-01)
- ✅ 初始版本发布
- ✅ 实现基础版和高级版API
- ✅ 添加频率限制
- ✅ 实现缓存机制
- ✅ 6维度评分算法

---

**文档版本**: v1.0.0
**最后更新**: 2026-01-01
**API基础URL**: `https://your-domain.com/api`

---

**文档结束**
