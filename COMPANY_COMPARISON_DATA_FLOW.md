# Company Comparison 页面数据流分析

## 问题回答

**是的！Company-Comparison 页面的数据确实是从 `InsuranceProduct` 数据库表获取的。**

## 数据流程图

```
前端 CompanyComparison.jsx
    ↓
    调用 API: GET /api/insurance-companies/standard-comparison/
    ↓
后端 insurance_company_views.py:get_companies_standard_comparison()
    ↓
    查询数据库表: insurance_products
    ↓
    筛选条件: payment_period (1年/2年/5年)
    ↓
    解析 JSON 字段: surrender_value_table
    ↓
    返回数据: 公司列表 + 产品列表 + 退保价值表
    ↓
前端展示对比表格
```

## 详细数据流

### 1. 前端请求 (CompanyComparison.jsx:252)

```javascript
const response = await axios.get('/api/insurance-companies/standard-comparison/', {
  params: {
    payment_period: paymentPeriod,  // 1, 2, 或 5 年
    selected_product_ids: selectedProductIds.join(',')  // 用户选择的产品ID（可选）
  }
});
```

**请求参数**：
- `payment_period`: 缴费年期（默认5年）
  - 1年期：年缴保费通常为 HK$100,000
  - 2年期：年缴保费通常为 HK$100,000
  - 5年期：年缴保费通常为 HK$10,000

- `selected_product_ids`: 用户选择的产品ID列表（可选）
  - 例如：`"1,3,5,7"`
  - 如果提供，则只返回这些产品
  - 如果不提供，则返回所有产品

### 2. 后端处理 (api/insurance_company_views.py:50-171)

#### 步骤1: 查询公司列表
```python
companies = InsuranceCompany.objects.filter(is_active=True).order_by('sort_order')
```

#### 步骤2: 为每个公司查询产品
```python
products_query = InsuranceProduct.objects.filter(
    company=company,
    payment_period=payment_period,  # 按缴费年期筛选
    is_active=True
)
```

#### 步骤3: 解析产品的退保价值表
```python
if product.surrender_value_table:
    surrender_table = json.loads(product.surrender_value_table)
    # 支持两种格式：
    # 格式1: [{"year": 1, "guaranteed": 0, "non_guaranteed": 0, "total": 0}, ...]
    # 格式2: {"standard": [{"year": 1, ...}, ...]}
```

**surrender_value_table 数据结构**：
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

#### 步骤4: 构建返回数据
```python
company_data = {
    'id': company.id,
    'code': company.code,
    'name': company.name,
    'name_en': company.name_en,
    'icon': company.icon,
    'color_gradient': company.color_gradient,
    'bg_color': company.bg_color,
    'flagship_product': company.flagship_product,
    'has_data': True,
    'payment_period': payment_period,
    'products': [
        {
            'product_id': product.id,
            'product_name': product.product_name,
            'standard_data': {
                'standard': surrender_table
            }
        }
    ],
    'has_multiple_products': len(products_data) > 1
}
```

### 3. 前端展示逻辑

#### 步骤1: 公司选择
- 用户点击公司卡片
- 如果公司只有1个产品 → 直接选中
- 如果公司有多个产品 → 弹出产品选择对话框

#### 步骤2: 产品多选
```javascript
// 用户可以选择多个产品进行对比
selectedProductsByCompany = {
  1: [101, 102],  // 友邦: 环宇盈活 + 盈御多元货币计划
  2: [201],       // 保诚: 世誉财富
  3: [301, 302, 303]  // 宏利: 3个宏挚传承
}
```

#### 步骤3: 生成对比表格
- 横轴：保单年度（1, 2, 3, 5, 10, 15, 20...）
- 纵轴：公司/产品名称
- 单元格：退保价值（保证/非保证/总现金价值）

#### 步骤4: 计算指标
- **单利回报率**: `(总现金价值 - 总保费) / 总保费 × 100%`
- **IRR内部收益率**: 使用牛顿迭代法计算
- **回本期**: 第一次总现金价值 >= 总保费的年度

## 数据库表结构

### InsuranceProduct 表 (insurance_products)

| 字段名 | 类型 | 说明 | 示例 |
|-------|------|------|------|
| id | INT | 主键 | 1 |
| company_id | INT | 外键 → InsuranceCompany | 1 (友邦) |
| product_name | VARCHAR(200) | 产品名称 | "环宇盈活" |
| payment_period | INT | 缴费年期 | 5 |
| annual_premium | DECIMAL(15,2) | 年缴金额 | 10000.00 |
| surrender_value_table | TEXT | 退保价值表 (JSON) | `[{"year": 1, ...}]` |
| death_benefit_table | TEXT | 身故赔偿表 (JSON) | `[{"year": 1, ...}]` |
| is_withdrawal | BOOLEAN | 是否提取 | false |
| is_active | BOOLEAN | 是否启用 | true |

### InsuranceCompany 表 (insurance_companies)

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | INT | 主键 |
| code | VARCHAR(50) | 公司代码 |
| name | VARCHAR(200) | 中文名称 |
| name_en | VARCHAR(200) | 英文名称 |
| icon | VARCHAR(500) | Logo URL |
| color_gradient | VARCHAR(200) | 颜色渐变 |
| bg_color | VARCHAR(50) | 背景色 |
| sort_order | INT | 排序 |
| is_active | BOOLEAN | 是否启用 |

## API 端点详情

### GET /api/insurance-companies/standard-comparison/

**功能**: 获取所有保险公司的标准退保数据用于对比

**路径**: `api/urls.py:186`

**视图函数**: `insurance_company_views.py:get_companies_standard_comparison()`

**权限**: 公开API（无需登录）

**请求参数**:
```
payment_period: 缴费年限（可选，默认5年）
selected_product_ids: 用户选择的产品ID列表（可选，逗号分隔）
```

**响应示例**:
```json
{
  "status": "success",
  "payment_period": 5,
  "data": [
    {
      "id": 1,
      "code": "aia",
      "name": "友邦",
      "name_en": "AIA",
      "icon": "/aia.svg",
      "color_gradient": "from-blue-600 to-cyan-500",
      "bg_color": "#0066cc",
      "flagship_product": "环宇盈活储蓄寿险计划",
      "has_data": true,
      "payment_period": 5,
      "has_multiple_products": true,
      "products": [
        {
          "product_id": 2,
          "product_name": "环宇盈活储蓄寿险计划",
          "standard_data": {
            "standard": [
              {"year": 1, "guaranteed": 0, "non_guaranteed": 0, "total": 0},
              {"year": 2, "guaranteed": 2500, "non_guaranteed": 19200, "total": 21700},
              {"year": 5, "guaranteed": 25000, "non_guaranteed": 96000, "total": 121000}
            ]
          }
        },
        {
          "product_id": 3,
          "product_name": "盈御多元货币计划",
          "standard_data": {
            "standard": [...]
          }
        }
      ]
    },
    {
      "id": 2,
      "code": "prudential",
      "name": "保诚",
      ...
    }
  ]
}
```

## 用户操作流程

### 场景1: 首次对比（5年期）

1. 用户打开 Company Comparison 页面
2. 系统默认加载 **5年期** 产品数据
3. 显示所有有数据的公司卡片
4. 用户点击 **友邦** 卡片
   - 友邦有3个5年期产品
   - 弹出产品选择对话框
   - 用户选择 "环宇盈活储蓄寿险计划" 和 "盈御多元货币计划"
5. 用户点击 **保诚** 卡片
   - 保诚有1个5年期产品
   - 直接选中 "信守明天多元貨幣計劃"
6. 点击 "开始对比" 按钮
7. 生成对比表格，显示3个产品的数据

### 场景2: 切换到1年期

1. 用户点击 "1年期" 按钮
2. 系统重新调用API：`payment_period=1`
3. 后端返回所有1年期产品
4. 前端清空之前的选择
5. 年缴保费自动变为 HK$100,000（1-2年期默认值）

### 场景3: 保存用户偏好（需登录）

1. 用户登录后
2. 系统调用 `GET /api/user/product-comparison-settings`
3. 获取用户之前保存的产品选择
4. 自动选中这些产品

## 数据完整性

### 当前状态（2026年1月）

- ✅ **10家保险公司** 已录入
- ✅ **27个产品** 已配置退保价值表
- ✅ **所有产品** 都有完整的退保价值数据
- ⚠️ **37%产品** 已配置身故赔偿表（不影响对比功能）

### 按缴费年期分组

| 缴费年期 | 产品数量 | 年缴保费范围 |
|---------|---------|------------|
| 1年期 | 8个 | HK$100,000 - HK$200,000 |
| 2年期 | 9个 | HK$100,000 |
| 5年期 | 10个 | HK$10,000 |

## 关键代码位置

### 前端
- **主组件**: `frontend/src/components/CompanyComparison.jsx`
- **数据获取**: 252-273行
- **产品选择**: 305-322行
- **对比表格**: 1200-1400行（估计）

### 后端
- **API视图**: `api/insurance_company_views.py:50-171`
- **URL配置**: `api/urls.py:186`
- **数据模型**: `api/models.py:811-927`

### 数据库
- **产品表**: `insurance_products`
- **公司表**: `insurance_companies`

## 性能优化

### 数据库查询优化
```python
# 使用 select_related 减少数据库查询
products = InsuranceProduct.objects.filter(
    company=company,
    payment_period=payment_period,
    is_active=True
).select_related('company').order_by('sort_order', 'id')
```

### 前端缓存
```javascript
// localStorage 缓存用户选择
localStorage.setItem('selectedProductIds', JSON.stringify(selectedIds));
localStorage.setItem('paymentPeriod', paymentYears);
```

## 常见问题

### Q1: 为什么有些公司不显示？
**A**: 公司只有在有对应缴费年期的产品数据时才会显示。如果某个公司没有5年期产品，切换到5年期时就不会显示该公司。

### Q2: 如何添加新产品？
**A**: 在 Django Admin 后台 `/admin/api/insuranceproduct/` 添加新产品，填写退保价值表JSON数据即可。

### Q3: 退保价值表格式不对怎么办？
**A**: 后端支持两种格式：
- 格式1: `[{"year": 1, ...}, ...]`
- 格式2: `{"standard": [{"year": 1, ...}, ...]}`

### Q4: 能否对比不同缴费年期的产品？
**A**: 不能。系统设计为同一缴费年期内对比，因为不同年期的产品缴费结构不同，对比没有意义。

## 未来扩展

### 计划中的功能
1. ✅ 支持用户自定义产品选择（已实现）
2. ✅ 支持多产品对比（已实现）
3. ⚠️ 添加身故赔偿对比（数据不完整）
4. ❌ 添加提取功能对比（待开发）
5. ❌ AI智能推荐产品（待开发）

## 总结

Company Comparison 页面完全依赖 **InsuranceProduct 数据库表**，通过 `surrender_value_table` 字段获取退保价值数据。数据流程清晰，架构合理，支持多产品对比和用户自定义选择。
