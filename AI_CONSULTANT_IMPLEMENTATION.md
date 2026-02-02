# AI智能保险咨询系统实现文档

## 概述

本系统实现了两个核心功能：
1. **AI智能咨询** - 客户输入个人情况，AI根据数据库产品推荐保险方案
2. **客户案例展示** - 展示不同人生阶段的保险配置案例

## 实现内容

### 一、数据库扩展

#### 1.1 新增字段（InsuranceProduct模型）

在 `api/models.py:775-879` 的 `InsuranceProduct` 模型中添加了7个AI推荐相关字段：

```python
# AI推荐相关字段
target_age_min = IntegerField()           # 目标年龄段最小值（如：25）
target_age_max = IntegerField()           # 目标年龄段最大值（如：50）
target_life_stage = CharField()           # 目标人生阶段（扶幼保障期/收入成长期/责任高峰期/责任递减期/退休期）
coverage_type = CharField()               # 保障类型（储蓄/重疾/医疗/教育基金/退休规划）
min_annual_income = DecimalField()        # 最低年收入要求（台币）
features = JSONField()                    # 产品特点列表 ["高额身故保障", "现金价值稳定增长"]
ai_recommendation_prompt = TextField()    # AI推荐时的产品描述提示词
```

#### 1.2 数据库迁移

迁移文件：`api/migrations/0043_insuranceproduct_ai_recommendation_prompt_and_more.py`

执行命令：
```bash
python manage.py makemigrations
python manage.py migrate
```

---

### 二、后端实现

#### 2.1 AI咨询服务（consultation_service.py）

**文件位置：** `api/consultation_service.py`

**核心类：** `ConsultationService`

**主要方法：**
- `analyze_customer_needs(customer_info, available_products)` - 分析客户需求并推荐产品

**AI模型：** Google Gemini 2.0 Flash Exp

**工作流程：**
1. 接收客户信息（年龄、收入、家庭状况、关注点等）
2. 接收筛选后的产品列表
3. 构建详细的提示词（包含客户信息和产品信息）
4. 调用Gemini API进行智能分析
5. 返回结构化结果（需求分析、推荐产品、专业建议、注意事项）

**返回格式：**
```json
{
    "analysis": "客户需求分析...",
    "recommendations": [
        {
            "product_id": 1,
            "product_name": "产品名称",
            "company_name": "保险公司",
            "reason": "推荐理由...",
            "priority": 1,
            "suitability_score": 95.5
        }
    ],
    "advice": "专业建议...",
    "warnings": ["注意事项1", "注意事项2"]
}
```

---

#### 2.2 API视图（consultation_views.py）

**文件位置：** `api/consultation_views.py`

**端点1：AI智能咨询**
- **路由：** `POST /api/consultation/ai-recommend`
- **权限：** 需要登录（IsAuthenticated）
- **功能：** 接收客户信息，筛选匹配产品，调用AI分析，返回推荐结果

**产品筛选逻辑：**
1. 基本筛选：只选择启用的产品（is_active=True）
2. 年龄筛选：选择目标年龄±5岁范围的产品
3. 收入筛选：选择收入要求≤客户收入×120%的产品
4. 人生阶段筛选：匹配相应人生阶段的产品
5. 预算筛选：选择年缴保费≤预算×150%的产品
6. 最多返回20个匹配产品供AI分析

**端点2：客户案例展示**
- **路由：** `GET /api/consultation/customer-cases`
- **权限：** 需要登录（IsAuthenticated）
- **功能：** 返回5个人生阶段的保险配置案例

**案例内容：**
- 扶幼保障期（25-30岁）
- 收入成长期（31-40岁）
- 责任高峰期（41-50岁）
- 责任递减期（51-60岁）
- 退休期（60岁以上）

每个案例包含：
- 阶段描述
- 示例画像
- 关键要点
- 预算建议

---

#### 2.3 URL路由配置

**文件位置：** `api/urls.py:163-165`

```python
# AI智能咨询API
path('consultation/ai-recommend', get_ai_consultation, name='get-ai-consultation'),
path('consultation/customer-cases', get_customer_cases, name='get-customer-cases'),
```

---

### 三、前端实现

#### 3.1 AI咨询页面（AIConsultation.jsx）

**文件位置：** `frontend/src/components/AIConsultation.jsx`

**布局：** 左右分栏
- **左侧：** 信息收集表单
- **右侧：** AI分析结果展示

**表单字段：**
- 基本信息：年龄、性别、年收入
- 人生阶段：5个选项
- 家庭状况：单身/已婚/已婚有子女
- 子女信息：是否有子女、子女数量
- 主要关注点：9个可多选选项（意外、医疗、重疾、家庭、教育、退休、传承、储蓄、照护）
- 预算：年缴保费预算

**结果展示：**
1. 需求分析（蓝色卡片）
2. 推荐产品（白色边框卡片，显示优先级和适配度评分）
3. 专业建议（绿色卡片）
4. 注意事项（黄色卡片）

**特色功能：**
- 实时表单验证
- Loading动画
- 响应式设计
- 清空重置功能

---

#### 3.2 客户案例展示页面（CustomerCases.jsx）

**文件位置：** `frontend/src/components/CustomerCases.jsx`

**布局：** 左右分栏
- **左侧：** 人生阶段列表（粘性定位）
- **右侧：** 选中阶段的详细案例

**案例展示内容：**
1. 阶段标题和描述（带颜色区分）
2. 案例画像（年龄、收入、家庭状况、子女、关注点）
3. 预算建议
4. 关键要点（5条）
5. 行动按钮（跳转到AI咨询）

**颜色主题：**
- 扶幼保障期：绿色
- 收入成长期：蓝色
- 责任高峰期：紫色
- 责任递减期：橙色
- 退休期：红色

**底部免责声明：** 提醒用户案例仅供参考

---

#### 3.3 路由配置（App.jsx）

**文件位置：** `frontend/src/App.jsx:32-33, 173-182`

```jsx
import AIConsultation from './components/AIConsultation'
import CustomerCases from './components/CustomerCases'

// 路由
<Route path="/ai-consultation" element={
  <ProtectedRoute>
    <AIConsultation />
  </ProtectedRoute>
} />
<Route path="/customer-cases" element={
  <ProtectedRoute>
    <CustomerCases />
  </ProtectedRoute>
} />
```

---

#### 3.4 Dashboard导航更新

**文件位置：** `frontend/src/components/Dashboard.jsx:247-252`

新增工具分类：**AI智能咨询**

```javascript
{
  category: 'AI智能咨询',
  tools: [
    {
      name: 'AI保险智能咨询',
      icon: LightBulbIcon,
      action: () => onNavigate('ai-consultation'),
      color: 'from-cyan-500 via-blue-600 to-indigo-700',
      show: true
    },
    {
      name: '客户案例展示',
      icon: UserGroupIcon,
      action: () => onNavigate('customer-cases'),
      color: 'from-blue-500 via-indigo-600 to-purple-700',
      show: true
    },
  ]
}
```

---

## API端点总结

### 1. AI智能咨询
```
POST /api/consultation/ai-recommend
Authorization: Bearer <token>

Request Body:
{
    "age": 35,
    "gender": "男",
    "annual_income": 800000,
    "life_stage": "责任高峰期",
    "family_status": "已婚",
    "has_children": true,
    "children_count": 2,
    "main_concerns": ["子女教育", "家庭保障", "退休规划"],
    "budget": 50000
}

Response:
{
    "success": true,
    "data": {
        "analysis": "...",
        "recommendations": [...],
        "advice": "...",
        "warnings": [...]
    }
}
```

### 2. 客户案例
```
GET /api/consultation/customer-cases
Authorization: Bearer <token>

Response:
{
    "success": true,
    "cases": [
        {
            "life_stage": "扶幼保障期",
            "age_range": "25-30岁",
            "description": "...",
            "example_profile": {...},
            "key_points": [...],
            "budget_suggestion": "..."
        },
        ...
    ]
}
```

---

## 技术栈

### 后端
- **框架：** Django 5.2.7 + Django REST Framework
- **AI模型：** Google Gemini 2.0 Flash Exp
- **数据库：** MySQL（insurance_products表）
- **认证：** JWT Token

### 前端
- **框架：** React 19.1.1
- **构建工具：** Vite 7.1.7
- **样式：** Tailwind CSS 3.4.17
- **HTTP客户端：** Axios
- **图标：** Heroicons
- **路由：** React Router

---

## 部署说明

### 1. 后端部署
```bash
# 1. 激活虚拟环境
source /home/ubuntu/miniconda3/envs/harry-insurance/bin/activate

# 2. 安装依赖（如需）
pip install google-genai

# 3. 运行迁移
python manage.py makemigrations
python manage.py migrate

# 4. 重启Django服务
sudo supervisorctl restart harry-insurance:harry-insurance-django
```

### 2. 前端部署
前端使用Vite开发服务器，已配置在supervisor中：
```bash
# 查看前端服务状态
sudo supervisorctl status harry-insurance:harry-insurance-vite

# 重启前端服务
sudo supervisorctl restart harry-insurance:harry-insurance-vite
```

### 3. 环境变量
确保 `.env` 文件包含：
```bash
GEMINI_API_KEY=AIzaSyC6_Lp7D2RLFTDtWoKz6-eSerX6oNDdjdM
```

---

## 使用流程

### 用户使用流程

1. **登录系统** → Dashboard

2. **查看案例**（可选）
   - 点击"客户案例展示"
   - 选择人生阶段查看参考案例
   - 了解不同阶段的保险配置策略

3. **AI咨询**
   - 点击"AI保险智能咨询"
   - 填写个人信息表单
   - 点击"获取AI推荐"
   - 查看AI分析结果和产品推荐

4. **后续操作**
   - 根据推荐结果联系顾问
   - 了解具体产品详情
   - 制定个性化保险方案

---

## 数据流程图

```
用户输入信息
    ↓
前端表单验证
    ↓
发送API请求 → /api/consultation/ai-recommend
    ↓
后端接收并验证数据
    ↓
根据用户信息筛选产品
    ↓
调用ConsultationService
    ↓
构建Gemini提示词
    ↓
调用Gemini API
    ↓
解析AI响应（JSON）
    ↓
返回结构化结果
    ↓
前端展示分析结果
```

---

## 核心优势

1. **智能匹配：** 多维度筛选产品（年龄、收入、阶段、预算）
2. **AI分析：** 使用最新Gemini模型，提供专业分析
3. **可扩展：** 产品数据库驱动，易于添加新产品
4. **用户友好：** 表单简洁，结果清晰
5. **案例参考：** 5个人生阶段案例供参考
6. **专业建议：** AI提供针对性建议和注意事项

---

## 未来扩展方向

1. **产品数据填充：** 在数据库中添加真实保险产品数据
2. **推荐历史：** 保存用户的咨询记录
3. **产品详情：** 链接到具体产品页面
4. **顾问对接：** 一键联系保险顾问
5. **多语言支持：** 支持繁体中文、英文等
6. **PDF导出：** 导出分析报告PDF
7. **对比功能：** 对比多次咨询结果
8. **用户反馈：** 收集推荐准确度反馈

---

## 维护说明

### 日志位置
- Django日志：查看supervisor配置
- Gemini API调用日志：在 `consultation_service.py` 中

### 常见问题

**Q1: AI推荐没有返回结果？**
- 检查数据库中是否有匹配的产品
- 检查产品的AI相关字段是否填写
- 查看Django日志确认API调用是否成功

**Q2: Gemini API调用失败？**
- 检查GEMINI_API_KEY是否配置正确
- 确认API密钥有效且有配额
- 查看错误日志获取详细信息

**Q3: 前端页面空白？**
- 检查前端服务是否运行
- 查看浏览器控制台错误
- 确认路由配置正确

---

## 文件清单

### 后端文件
- `api/models.py` - 数据模型（InsuranceProduct扩展）
- `api/consultation_service.py` - AI咨询服务（新增）
- `api/consultation_views.py` - API视图（新增）
- `api/urls.py` - 路由配置（更新）
- `api/migrations/0043_*.py` - 数据库迁移文件（新增）

### 前端文件
- `frontend/src/components/AIConsultation.jsx` - AI咨询页面（新增）
- `frontend/src/components/CustomerCases.jsx` - 客户案例页面（新增）
- `frontend/src/components/Dashboard.jsx` - Dashboard（更新）
- `frontend/src/App.jsx` - 路由配置（更新）

---

## 版本信息

- **实现日期：** 2026-01-01
- **Django版本：** 5.2.7
- **React版本：** 19.1.1
- **Gemini SDK：** google-genai 1.41.0
- **AI模型：** gemini-2.0-flash-exp

---

## 联系信息

如有问题或建议，请联系开发团队。

---

**文档结束**
