# 香港保险产品大全功能

## 功能概述

这是一个完整的保险产品浏览系统，用户可以：
- 浏览所有香港保险公司
- 查看每家公司的产品列表
- 查看产品的详细信息和数据表格
- 查看保险公司的详细介绍

## 功能入口

### Dashboard入口
- 位置：Dashboard → AI智能保险顾问系统 → 香港保险产品大全
- 路由：`/insurance-products`

## 页面结构

### 1. 产品列表页 (`/insurance-products`)

**左侧：保险公司列表**
- 显示所有保险公司
- 包含公司图标、中文名、英文名
- 选中后显示该公司的产品

**右侧：产品列表**
- 显示选中公司的所有产品
- 搜索功能：按产品名称搜索
- 产品信息：
  - 产品名称
  - 缴费年期
  - 年缴金额
  - 产品分类

### 2. 产品详情页 (`/insurance-product/:id`)

**左侧：基本信息**
- 保险公司
- 产品名称
- 缴费年期
- 年缴金额
- 产品分类
- 是否支持提取
- 产品描述（支持Markdown）

**右侧：数据表格**
- 退保发还金额表
  - 保单年度
  - 保证现金价值
  - 非保证现金价值
  - 总现金价值
- 身故保险赔偿表
  - 保单年度
  - 赔偿金额

### 3. 保险公司详情页 (`/insurance-company/:id`)

**左侧：公司信息**
- 公司名称（中英文）
- 公司代码
- 产品数量
- 最新消息（占位，待实现）

**右侧：公司产品列表**
- 显示该公司的所有产品
- 点击可进入产品详情页

## 技术实现

### 前端组件

1. **InsuranceProducts.jsx** - 产品列表页
   - 路径：`/var/www/harry-insurance2/frontend/src/components/InsuranceProducts.jsx`
   - 功能：展示公司列表和产品列表

2. **InsuranceProductDetail.jsx** - 产品详情页
   - 路径：`/var/www/harry-insurance2/frontend/src/components/InsuranceProductDetail.jsx`
   - 功能：展示产品详细信息和数据表格

3. **InsuranceCompanyDetail.jsx** - 公司详情页
   - 路径：`/var/www/harry-insurance2/frontend/src/components/InsuranceCompanyDetail.jsx`
   - 功能：展示公司信息和产品列表

### 后端API

**文件位置**：`/var/www/harry-insurance2/api/insurance_company_views.py`

1. **获取保险产品列表**
   ```
   GET /api/insurance-products/
   参数：company (可选) - 按公司ID筛选
   返回：产品列表
   ```

2. **获取产品详情**
   ```
   GET /api/insurance-products/{product_id}/
   返回：产品详细信息，包括数据表格
   ```

3. **获取公司详情**
   ```
   GET /api/insurance-companies/{company_id}/
   返回：公司详细信息
   ```

### 数据模型

**InsuranceCompany** - 保险公司
- code: 公司代码
- name: 公司名称
- name_en: 英文名称
- icon: 图标（emoji或URL）
- color_gradient: 颜色渐变
- description: 公司描述

**InsuranceProduct** - 保险产品
- company: 所属公司（外键）
- product_name: 产品名称
- payment_period: 缴费年期
- annual_premium: 年缴金额
- product_category: 产品分类
- is_withdrawal: 是否支持提取
- description: 产品描述
- surrender_value_table: 退保价值表（JSON）
- death_benefit_table: 身故赔偿表（JSON）

## 数据格式

### 退保价值表 JSON格式
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
    "guaranteed": 10000,
    "non_guaranteed": 5000,
    "total": 15000
  }
]
```

### 身故赔偿表 JSON格式
```json
[
  {
    "year": 1,
    "benefit": 100000
  },
  {
    "year": 2,
    "benefit": 120000
  }
]
```

## 权限控制

- 所有API端点使用 `AllowAny` 权限，无需登录即可访问
- 方便用户浏览产品信息

## 待实现功能

1. **保险公司最新消息**
   - 需要添加新闻/公告数据模型
   - 在公司详情页显示

2. **产品比较功能**
   - 允许用户选择多个产品进行对比
   - 展示产品差异

3. **产品搜索优化**
   - 全局搜索（跨公司）
   - 高级筛选（按分类、价格范围等）

4. **产品推荐**
   - 根据用户需求推荐合适产品
   - AI智能匹配

## 部署说明

前端和后端都已部署：
- 前端已构建：`npm run build`
- Django已重启：`sudo supervisorctl restart harry-insurance:harry-insurance-django`
- 功能立即可用

## 使用流程

1. 用户登录Dashboard
2. 点击"香港保险产品大全"按钮
3. 在左侧选择保险公司
4. 右侧显示该公司的产品列表
5. 点击产品进入详情页查看详细信息
6. 在产品详情页可以点击"查看公司详情"查看公司信息

## 注意事项

- 产品数据需要在Django Admin中录入
- 表格数据以JSON格式存储，确保格式正确
- 支持Markdown格式的产品描述
