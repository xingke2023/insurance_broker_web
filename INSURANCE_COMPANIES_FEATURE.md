# 香港各大保险公司名单功能说明

## 功能概述

新增"香港各大保险公司名单"功能，用户可以浏览所有保险公司信息、查看公司详情、公司新闻和产品列表。

## 功能模块

### 1. 保险公司列表页面 (`/insurance-companies`)

**组件**: `frontend/src/components/InsuranceCompanies.jsx`

**功能特性**:
- 展示所有启用的保险公司
- 网格布局，每个公司卡片显示：
  - 公司Logo或图标
  - 公司中英文名称
  - 公司简介
  - 主打产品
  - 官网链接（可点击）
- 点击卡片进入公司详情页
- 显示总公司数量统计

**API接口**: `GET /api/insurance-companies/`

### 2. 保险公司详情页面 (`/insurance-company/:id`)

**组件**: `frontend/src/components/InsuranceCompanyDetail.jsx`

**功能特性**:
- 公司头部信息展示（带渐变背景）
- 统计信息：产品数量、新闻数量
- 双标签页切换：
  - **在线产品** - 显示该公司的所有产品
  - **公司动态** - 显示该公司的新闻与宣传材料

**产品标签页**:
- 产品卡片展示
- 支持按产品分类筛选
- 点击产品进入产品详情页

**新闻标签页**:
- 新闻卡片展示
- 显示新闻类型、标题、描述
- 显示发布日期和浏览次数
- 精选新闻带星标标识
- 点击新闻自动增加浏览次数
- 支持跳转到外部链接

**API接口**:
- 公司信息: `GET /api/insurance-companies/:id/`
- 公司产品: `GET /api/insurance-products/?company=:id`
- 公司新闻: `GET /api/company-news/?company=:id`

### 3. 公司新闻与宣传材料系统

**数据模型**: `api/models.py:CompanyNews`

**字段说明**:
- `company` - 所属公司（外键）
- `title` - 标题
- `content_type` - 内容类型（新闻/公告/小册子/视频/文章/新闻稿/年度报告/其他）
- `description` - 简要描述
- `content` - 完整正文（支持HTML）
- `url` - 外部链接
- `pdf_file` - PDF文件
- `thumbnail` - 缩略图
- `published_date` - 发布日期
- `is_active` - 是否启用
- `is_featured` - 是否精选
- `sort_order` - 排序
- `view_count` - 浏览次数

**API接口**: `api/company_news_views.py:CompanyNewsViewSet`

### 4. Dashboard入口

**位置**: Dashboard → 产品与计划书 → 香港各大保险公司名单

**图标**: UserGroupIcon（用户组图标）

**配色**: 翠绿到青色渐变 (`from-emerald-500 via-teal-600 to-cyan-700`)

## 数据库更改

### 1. `insurance_companies` 表新增字段

```sql
ALTER TABLE insurance_companies ADD COLUMN website_url VARCHAR(500) NOT NULL DEFAULT '';
```

- `website_url` - 公司官方网站链接

### 2. `company_news` 表（新表）

**表名**: `company_news`

**索引**:
- `(company, is_active)` - 复合索引
- `content_type` - 内容类型索引
- `is_featured` - 精选标识索引
- `published_date` - 发布日期索引

**排序规则**: 按公司 → 精选优先 → sort_order → 发布日期降序

## API端点

### 保险公司

- `GET /api/insurance-companies/` - 获取所有保险公司列表
- `GET /api/insurance-companies/:id/` - 获取单个公司详情

### 公司新闻

- `GET /api/company-news/` - 获取新闻列表
- `GET /api/company-news/?company=:id` - 获取指定公司的新闻
- `GET /api/company-news/?content_type=:type` - 按内容类型筛选
- `GET /api/company-news/?is_featured=true` - 只获取精选新闻
- `POST /api/company-news/:id/increment_view/` - 增加浏览次数
- `GET /api/company-news/featured/` - 获取所有精选新闻
- `GET /api/company-news/by-company/?company=:id&limit=:n` - 按公司获取指定数量新闻

## Admin后台管理

### InsuranceCompany管理

**新增字段**: 在"基本信息"区域添加了 `website_url` 字段

**使用方法**:
1. 登录Admin后台
2. 进入"保险公司"管理
3. 编辑公司信息
4. 在"基本信息"区填写"公司官网"URL

### CompanyNews管理

**访问路径**: Admin → 公司新闻与宣传

**功能**:
- 列表显示：标题、公司、内容类型、发布日期、是否精选、浏览次数
- 可编辑字段：is_featured、is_active、sort_order
- 筛选：内容类型、是否启用、是否精选、发布日期、公司
- 搜索：标题、描述、正文、公司名称
- 日期层级导航

**添加新闻步骤**:
1. 点击"添加公司新闻与宣传"
2. 选择所属公司
3. 填写标题、选择内容类型
4. 填写描述和正文内容
5. 可选：添加外部链接、上传PDF、上传缩略图
6. 设置发布日期
7. 勾选"是否精选"将优先显示
8. 设置排序（数字越小越靠前）
9. 保存

## 使用流程

### 用户端流程

1. **浏览公司列表**
   - 登录系统
   - 进入Dashboard
   - 点击"香港各大保险公司名单"
   - 浏览所有保险公司卡片

2. **查看公司详情**
   - 点击任意公司卡片
   - 查看公司基本信息和统计数据
   - 切换标签页查看产品或新闻

3. **浏览公司新闻**
   - 在公司详情页点击"公司动态"标签
   - 浏览新闻列表
   - 点击新闻卡片跳转到外部链接（自动增加浏览次数）

4. **访问官网**
   - 在公司列表或详情页点击"官网"按钮
   - 新窗口打开公司官方网站

### 管理员流程

1. **添加保险公司**
   - Admin后台 → 保险公司 → 添加
   - 填写公司基本信息
   - 设置公司官网URL
   - 保存

2. **发布公司新闻**
   - Admin后台 → 公司新闻与宣传 → 添加
   - 选择公司、填写新闻内容
   - 设置是否精选
   - 保存

3. **管理新闻内容**
   - 编辑已有新闻
   - 调整排序
   - 启用/停用新闻
   - 查看浏览统计

## 技术实现

### 前端技术栈
- React 19.1.1
- React Router（路由）
- Axios（HTTP请求）
- Lucide React（图标库）
- Tailwind CSS（样式）

### 后端技术栈
- Django 5.2.7
- Django REST Framework 3.16.1
- MySQL数据库

### 关键文件

**前端**:
- `frontend/src/components/InsuranceCompanies.jsx` - 公司列表页
- `frontend/src/components/InsuranceCompanyDetail.jsx` - 公司详情页
- `frontend/src/components/Dashboard.jsx` - Dashboard入口
- `frontend/src/App.jsx` - 路由配置

**后端**:
- `api/models.py` - 数据模型（InsuranceCompany, CompanyNews）
- `api/company_news_views.py` - 公司新闻API视图
- `api/serializers.py` - 序列化器（CompanyNewsSerializer）
- `api/admin.py` - Admin配置
- `api/urls.py` - API路由
- `api/migrations/0062_companynews_and_more.py` - 数据库迁移

## 特性亮点

1. **双标签页设计** - 产品和新闻分离展示，信息结构清晰
2. **精选机制** - 支持标记精选新闻，优先展示重要内容
3. **浏览统计** - 自动统计新闻浏览次数
4. **响应式布局** - 支持桌面和移动端访问
5. **优雅的UI设计** - 使用现代化卡片布局和渐变配色
6. **外链支持** - 支持跳转到外部新闻源
7. **多内容类型** - 支持新闻、公告、小册子、视频等多种内容形式

## 后续优化建议

1. **新闻详情页** - 添加独立的新闻详情页展示完整正文
2. **搜索功能** - 支持按关键词搜索新闻
3. **筛选功能** - 支持按内容类型、日期范围筛选
4. **分页** - 新闻数量较多时添加分页
5. **富文本编辑器** - Admin后台支持富文本编辑新闻正文
6. **图片画廊** - 支持上传多张新闻图片
7. **评论功能** - 用户可对新闻进行评论
8. **分享功能** - 支持分享新闻到社交媒体

## 测试建议

1. **功能测试**
   - 测试公司列表加载
   - 测试公司详情页切换
   - 测试新闻浏览次数增加
   - 测试外链跳转

2. **数据测试**
   - 测试空数据状态
   - 测试大量数据加载
   - 测试筛选和排序

3. **界面测试**
   - 测试响应式布局
   - 测试不同浏览器兼容性
   - 测试加载动画

4. **权限测试**
   - 测试未登录访问
   - 测试Admin权限

## 版本信息

- 创建日期: 2026-02-02
- 数据库迁移: 0062_companynews_and_more
- Django版本: 5.2.7
- React版本: 19.1.1
