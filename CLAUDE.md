# 保险计划书智能分析系统 - 项目分析

## 项目概述

这是一个**保险计划书智能分析系统**（Insurance Plan Analyzer），使用全栈技术构建的现代化Web应用。主要用于自动化处理和分析保险计划书文档。

## 核心功能

### 1. OCR文档识别与保存
- 上传保险计划书文档（PDF）
- 使用Google Gemini 3 Flash Preview进行OCR识别
- 保存识别结果到数据库（Markdown格式 + HTML表格）
- 实现位置：`api/ocr_views.py`, `api/gemini_service.py`

### 2. AI智能提取
- 提取受保人信息（姓名、年龄、性别）
- 提取保险产品信息（产品名、保险公司）
- 提取保费信息（年缴保费、缴费年数、总保费）
- 提取保险期限和基本保额
- AI服务：`api/qwen_service.py`

### 3. 年度价值表分析
- 使用DeepSeek AI分析保单年度价值表
- 提取每年的保证现金价值、非保证现金价值
- 存储多年度数据用于对比分析
- 实现位置：`api/deepseek_service.py`

### 4. 用户认证系统
- JWT token认证
- 用户注册/登录功能
- 多语言支持（中文/英文）
- 认证视图：`api/auth_views.py`

### 5. 文档管理
- 查看已保存的文档列表
- 查看文档详情和分析结果
- **下载原始PDF文件**（绿色下载按钮）
- 批量删除文档
- 重新OCR识别（文档详情页）
- 重新提取表格（文档详情页）
- 前端组件：`frontend/src/components/PlanDocumentManagement.jsx`、`DocumentDetail.jsx`

#### PDF文件存储和下载机制

**文件存储路径**：
- 物理路径：`/var/www/harry-insurance2/media/plan_documents/`
- URL路径：`/media/plan_documents/文件名`

**文件命名规则**：
- 原始文件名保存在 `file_name` 字段（用户看到的名称）
- 实际存储文件名：`原名_时间戳.pdf`（避免重名冲突）
- 示例：`41岁女士法国盛利_II_至尊-50000-5年_20260120_101711.pdf`

**下载功能**：
- Plan-Management页面：绿色"下载"按钮
- 点击自动下载原始PDF文件
- 无文件时按钮自动禁用
- 前端通过 `file_path` URL字段下载

**重新OCR识别**：
- 文档详情页"计划书内容"区域
- 橙色"重新OCR"按钮
- 重新调用PaddleLayout API识别PDF
- 自动触发后续表格提取和分析任务
- API路径：`POST /api/ocr/documents/{id}/re-ocr/`

### 6. 海报分析工具
- 上传海报图片（JPG、PNG、WebP、GIF，最大10MB）
- AI智能分析海报的视觉设计、内容解读、营销要素
- 提供8种预设分析模板：产品分析、客户视角分析、朋友圈文案、全面分析、文案提取、设计分析、营销效果评估、竞品对比
- 支持自定义分析提示词
- 一键复制分析结果
- AI服务：Google Gemini 3 Pro Preview (`api/gemini_service.py`)
- 前端页面：`frontend/src/components/PosterAnalyzer.jsx`
- 访问路径：Dashboard → 海报分析工具 → `/poster-analyzer`

#### 海报分析功能详细说明

**技术架构**：
- **后端服务**：`api/gemini_service.py` - 封装Gemini API调用
- **视图层**：`api/poster_views.py` - 处理图片上传和分析请求
- **路由**：`POST /api/poster/analyze` - 分析接口，`GET /api/poster/templates` - 获取模板
- **AI模型**：Google Gemini 3 Pro Preview (`gemini-3-pro-preview`)
- **SDK版本**：`google-genai` 1.41.0（新版SDK，使用 `genai.Client`）

**分析模板**：
1. **产品分析**：深度理解海报传达的产品定位、核心价值、信息传达、情感共鸣和品牌印象
2. **客户视角分析**：站在客户角度分析产品吸引力、列举客户可能的疑问、并从专业角度给出满意答复
3. **朋友圈文案**：生成5种不同角度的营销文案（痛点切入、利益驱动、故事叙述、数据说话、情感共鸣），包含emoji和话题标签
4. **全面分析**：视觉设计、内容解读、营销要素、改进建议
5. **文案提取**：识别并提取海报中的所有文字内容
6. **设计分析**：配色方案、排版布局、字体选择、视觉层次
7. **营销效果评估**：目标受众定位、核心卖点、转化率预估
8. **竞品对比**：与行业标准对比，分析优劣势和创新点

**API实现细节**：
```python
# 使用新版Gemini SDK
from google import genai
from google.genai import types

client = genai.Client(api_key=api_key)

# 构建请求
parts = [
    types.Part.from_text(text=prompt_text),
    types.Part.from_bytes(data=image_bytes, mime_type=content_type)
]

# 调用API
response = client.models.generate_content(
    model='gemini-3-pro-preview',
    contents=[types.Content(role="user", parts=parts)]
)
```

**前端特性**：
- 左右分栏布局：左侧上传和选择模板，右侧显示结果
- 渐变背景设计（黄色→橙色→红色）
- 图片实时预览
- 分析过程loading动画
- 结果展示支持换行和格式化
- 返回Dashboard按钮

**文件大小限制**：
- 最大10MB
- 支持格式：image/jpeg, image/jpg, image/png, image/webp, image/gif
- 前后端双重验证

## 技术架构

### 后端技术栈
- **框架**: Django 5.2.7
- **API**: Django REST Framework 3.16.1
- **数据库**: MySQL（端口8510，数据库名：insurancetools）
- **数据库连接**: PyMySQL
- **认证**: JWT (djangorestframework-simplejwt)
- **跨域**: django-cors-headers
- **配置**: python-dotenv

### 前端技术栈
- **框架**: React 19.1.1
- **构建工具**: Vite 7.1.7
- **样式**: Tailwind CSS 3.4.17
- **HTTP客户端**: Axios 1.13.1
- **国际化**: react-i18next 16.2.4
- **图标**: Heroicons, Lucide React

### AI服务集成
- **Google Gemini 3 Flash Preview**: PDF文档OCR识别（替代PaddleLayout）
- **DeepSeek API**: 年度价值表格分析
- **Google Gemini 3 Pro Preview**: 海报视觉分析和营销评估

## 项目结构

```
harry-insurance/
├── backend/                          # Django配置目录
│   ├── settings.py                   # 主配置文件
│   ├── urls.py                       # 主URL配置
│   ├── wsgi.py                       # WSGI配置
│   └── asgi.py                       # ASGI配置
│
├── api/                              # Django API应用
│   ├── models.py                     # 数据模型（InsurancePolicy, PlanDocument, AnnualValue）
│   ├── serializers.py                # DRF序列化器
│   ├── urls.py                       # API路由配置
│   ├── views.py                      # 保险策略视图
│   ├── auth_views.py                 # 用户认证视图
│   ├── ocr_views.py                  # OCR识别和文档保存
│   ├── qwen_service.py               # 通义千问AI服务
│   ├── deepseek_service.py           # DeepSeek表格分析服务
│   ├── gemini_service.py             # Gemini AI海报分析服务
│   ├── poster_views.py               # 海报分析视图
│   ├── insurance_company_configs.py  # 保险公司配置
│   └── admin.py                      # Django管理后台配置
│
├── frontend/                         # React前端应用（主前端，端口8008）
│   ├── src/
│   │   ├── components/               # React组件
│   │   │   ├── HomePage.jsx          # 主页/OCR上传（19KB）
│   │   │   ├── PlanAnalyzer.jsx      # 计划书分析（31KB）
│   │   │   ├── PlanDocumentManagement.jsx  # 文档管理（52KB）
│   │   │   ├── PosterAnalyzer.jsx    # 海报分析工具
│   │   │   ├── Dashboard.jsx         # 仪表盘
│   │   │   ├── Login.jsx             # 登录页面
│   │   │   ├── Register.jsx          # 注册页面
│   │   │   └── PolicyList.jsx        # 保单列表
│   │   ├── services/                 # API服务层
│   │   ├── context/                  # React Context
│   │   ├── i18n.js                   # 国际化配置（14KB）
│   │   ├── config.js                 # 前端配置
│   │   ├── App.jsx                   # 主应用组件
│   │   └── main.jsx                  # 入口文件
│   ├── package.json                  # 依赖配置
│   ├── vite.config.js                # Vite配置
│   ├── tailwind.config.js            # Tailwind配置
│   └── postcss.config.js             # PostCSS配置
│
├── frontend1/                        # 备用前端（端口8088）
│
├── media/                            # 文件上传目录
│
├── .env                              # 环境变量配置
├── .env.example                      # 环境变量示例
├── manage.py                         # Django管理脚本
├── requirements.txt                  # Python依赖
├── start-backend.sh                  # 后端启动脚本
├── start-frontend.sh                 # 前端启动脚本
└── start-frontend1.sh                # 备用前端启动脚本
```

## 数据模型

### InsurancePolicy（保险策略）
基础保单模型，包含：
- `policy_number`: 保单号（唯一）
- `customer_name`: 客户姓名
- `policy_type`: 保险类型
- `premium`: 保费
- `start_date/end_date`: 保险期限
- `status`: 状态（active/expired/cancelled）

### PlanDocument（计划书文档）
主文档表，存储：
- 文件信息（名称、路径、大小）
- 受保人信息（姓名、年龄、性别）
- 保险产品信息（产品名、保险公司）
- 保费信息（年缴、缴费年数、总保费）
- OCR识别内容（`content`字段）
- AI提取数据（`extracted_data` JSON字段）
- 年度价值表（`table` JSON字段）
- 处理状态（uploaded/processing/completed/failed）

### AnnualValue（年度价值表）
存储每个保单年度的退保价值：
- `policy_year`: 保单年度终结
- `guaranteed_cash_value`: 保证现金价值
- `non_guaranteed_cash_value`: 非保证现金价值
- `total_cash_value`: 总现金价值
- 与PlanDocument关联（外键）

## API端点

### 保险策略管理
- `GET /api/policies/` - 获取所有保单
- `POST /api/policies/` - 创建新保单
- `GET /api/policies/{id}/` - 获取单个保单详情
- `PUT /api/policies/{id}/` - 更新保单
- `DELETE /api/policies/{id}/` - 删除保单
- `GET /api/policies/active_policies/` - 获取所有有效保单
- `POST /api/policies/{id}/cancel_policy/` - 取消保单

### 用户认证
- `POST /api/auth/register/` - 用户注册
- `POST /api/auth/login/` - 用户登录
- `GET /api/auth/profile/` - 获取用户信息

### OCR与文档管理
- `POST /api/ocr/upload-async/` - 异步上传PDF并触发OCR识别（Plan-Analyzer使用）
- `POST /api/ocr/save/` - 保存OCR识别结果（已废弃）
- `GET /api/ocr/documents/` - 获取已保存文档列表（返回file_path用于下载）
- `GET /api/ocr/documents/{id}/` - 获取文档详情（返回file_path）
- `GET /api/ocr/documents/{id}/status/` - 获取文档处理状态和进度
- `POST /api/ocr/documents/{id}/re-ocr/` - 重新OCR识别（DocumentDetail使用）
- `POST /api/ocr/documents/{id}/reextract-tablecontent/` - 重新提取表格源代码
- `POST /api/ocr/documents/{id}/reanalyze-tables/` - 重新分析表格概要
- `POST /api/ocr/documents/delete/` - 批量删除文档
- `GET /api/ocr/tables/{id}/` - 获取单个PlanTable表格详情

### 海报分析
- `POST /api/poster/analyze` - 分析海报图片（multipart/form-data，字段：image, custom_prompt）
- `GET /api/poster/templates` - 获取预设分析模板列表（8种模板）

## 部署配置

### 服务端口
- **后端服务**: `0.0.0.0:8017`（Django）
- **前端服务**: `0.0.0.0:8008`（主前端）
- **备用前端**: `0.0.0.0:8088`（frontend1）
- **MySQL数据库**: `localhost:8510`
- **Redis**: `localhost:6379`（Celery任务队列）
- **Celery Worker**: 4个并发进程

### 环境变量（.env）
```bash
# Django配置
SECRET_KEY=django-insecure-change-this-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# 数据库配置
DB_NAME=insurance_db
DB_USER=root
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=3306

# 阿里云DashScope API密钥
DASHSCOPE_API_KEY=sk-67f551815ab14c35afc14170be7dacca

# DeepSeek API密钥
# DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here

# Google Gemini API密钥 (用于海报分析)
GEMINI_API_KEY=AIzaSyC6_Lp7D2RLFTDtWoKz6-eSerX6oNDdjdM

# CORS配置
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## 安装和运行

### 前置要求
- Python 3.12+
- Node.js 24+
- MySQL 数据库

### 后端启动步骤

1. 安装Python依赖：
```bash
pip3 install django djangorestframework django-cors-headers pymysql python-dotenv google-genai
```

2. 运行数据库迁移：
```bash
python3 manage.py makemigrations
python3 manage.py migrate
```

3. 创建超级用户（可选）：
```bash
python3 manage.py createsuperuser
```

4. 启动Django服务器：Django 進程也需要重啟
```bash
sudo supervisorctl restart harry-insurance:harry-insurance-django
```

### 前端启动步骤

1. 进入前端目录并安装依赖：
```bash
cd frontend
npm install
```

2. 启动开发服务器：
```bash
./start-frontend.sh
# 或
npm run dev
```

## 关键文件说明

### 后端核心文件
- **api/ocr_views.py**: OCR识别和文档保存的核心逻辑
- **api/deepseek_service.py**: DeepSeek AI表格分析服务
- **api/qwen_service.py**: 通义千问OCR识别服务
- **api/gemini_service.py**: Google Gemini海报分析服务
- **api/poster_views.py**: 海报分析API视图（上传、分析、模板）
- **api/insurance_company_configs.py**: 各保险公司的字段映射配置
- **backend/settings.py**: Django主配置文件（数据库、JWT、CORS等）

### 前端核心组件
- **HomePage.jsx**: 主页和OCR上传界面（19KB）
- **PlanAnalyzer.jsx**: 计划书智能分析组件（31KB）
- **PlanDocumentManagement.jsx**: 文档管理和查看组件（52KB）
- **PosterAnalyzer.jsx**: 海报分析工具页面（独立页面，支持图片上传和AI分析）
- **i18n.js**: 国际化配置文件（14KB）

### 文档资源
- **DEMO_GUIDE.md**: 演示指南
- **PLAN_ANALYZER_GUIDE.md**: 计划书分析功能指南
- **PLAN_MANAGEMENT_USER_GUIDE.md**: 用户使用指南
- **DEEPSEEK_ANALYSIS_GUIDE.md**: DeepSeek分析说明
- **PROJECT_STRUCTURE.md**: 项目结构文档
- **QWEN_INTEGRATION_SUMMARY.md**: 通义千问集成总结

## 安全注意事项

### 当前需要改进的地方

⚠️ **生产环境必须修改**：

1. **数据库安全**
   - 位置：`backend/settings.py:93`
   - 问题：数据库密码硬编码
   - 建议：使用环境变量

2. **Django密钥**
   - 位置：`backend/settings.py:32`
   - 问题：使用默认不安全的SECRET_KEY
   - 建议：生成新的随机密钥

3. **调试模式**
   - 位置：`backend/settings.py:35`
   - 问题：DEBUG=True
   - 建议：生产环境设置为False

4. **跨域配置**
   - 位置：`backend/settings.py:150`
   - 问题：CORS_ALLOW_ALL_ORIGINS = True
   - 建议：限制允许的域名

5. **API密钥**
   - 位置：`.env`文件
   - 问题：包含真实API密钥
   - 建议：确保.env不上传到版本控制（已在.gitignore中）

6. **主机限制**
   - 位置：`backend/settings.py:37`
   - 问题：ALLOWED_HOSTS = ['*']
   - 建议：生产环境指定具体域名

## 开发注意事项

### 基础配置
1. 确保MySQL服务运行在8510端口
2. 确保Redis服务运行在6379端口（Celery需要）
3. 前后端需要同时运行才能正常工作
4. 修改前端代码会自动热重载
5. 修改后端代码需要重启Django服务器：`sudo supervisorctl restart harry-insurance:harry-insurance-django`
6. 修改Celery任务代码需要重启Celery Worker：`sudo supervisorctl restart harry-insurance:harry-insurance-celery`
7. 后端运行在0.0.0.0:8017，可从任何网络访问
8. 前端运行在0.0.0.0:8008，可从任何网络访问

### Django FieldFile使用规范

**PlanDocument模型的文件字段**：
```python
file_path = models.FileField(upload_to='plan_documents/')
```

**FieldFile常用属性**：
```python
doc.file_path              # FieldFile对象（不是字符串！）
doc.file_path.name         # 相对路径: "plan_documents/文件名.pdf"
doc.file_path.path         # 绝对路径: "/var/www/harry-insurance2/media/plan_documents/文件名.pdf"
doc.file_path.url          # URL路径: "/media/plan_documents/文件名.pdf"（自动URL编码）
doc.file_path.size         # 文件大小（字节）
```

**常见错误和正确写法**：
```python
# ❌ 错误：FieldFile不是字符串，不能调用字符串方法
file_path = doc.file_path.lstrip('/')
file_path = os.path.join('/var/www', doc.file_path)

# ✅ 正确：使用.path属性获取绝对路径
file_path = doc.file_path.path

# ✅ 正确：检查文件是否存在
if os.path.exists(doc.file_path.path):
    ...

# ✅ 正确：API返回URL给前端下载
'file_path': doc.file_path.url if doc.file_path else None
```

### 文件存储机制

**上传文件命名规则**（`upload_pdf_async`）：
```python
# 1. 保存原始文件名到file_name字段（用户看到的）
plan_doc.file_name = uploaded_file.name

# 2. 生成唯一文件名（避免冲突）
safe_name = re.sub(r'[^\w\s\-\_\u4e00-\u9fff]', '_', original_name)
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
unique_filename = f"{safe_name}_{timestamp}.pdf"

# 3. 保存到media/plan_documents/目录
plan_doc.file_path.save(unique_filename, uploaded_file, save=False)
```

**文件路径示例**：
- 原始文件名：`41岁女士法国盛利 II 至尊-50000-5年(1)(1).pdf`
- 存储文件名：`41岁女士法国盛利_II_至尊-50000-5年_1__1__20260120_101711.pdf`
- 绝对路径：`/var/www/harry-insurance2/media/plan_documents/41岁女士法国盛利_II_至尊-50000-5年_1__1__20260120_101711.pdf`
- URL路径：`/media/plan_documents/41%E5%B2%81%E5%A5%B3%E5%A3%AB...20260120_101711.pdf`

### 表格提取关键点

**移除OCR换行问题**：
```python
# OCR可能把"保單年度終結"识别为"保單年度\n終結"
# 检测前必须移除换行符
table_html_cleaned = table_html.replace('\n', '').replace('\r', '')
if '保单年度终结' in table_html_cleaned or '保單年度終結' in table_html_cleaned:
    ...
```

**数字特征检测（判断是否从年度1开始）**：
```python
# 改进版：基于数字特征，不依赖关键词白名单
if '<th' in row.lower():
    continue  # 跳过表头行

first_cell = re.sub(r'<[^>]+>', '', cells[0]).strip()
first_cell = first_cell.replace('\n', '').replace('\r', '')

if not first_cell.isdigit():
    continue  # 不是数字 → 表头行

year = int(first_cell)
return year == 1  # 数据行，判断是否为1
```

## 生产部署建议

1. **安全配置**
   - 设置 `DEBUG = False`
   - 配置强密码的 `SECRET_KEY`
   - 设置具体的 `ALLOWED_HOSTS`
   - 限制CORS允许的域名
   - 使用环境变量管理所有敏感信息

2. **服务器配置**
   - 使用Gunicorn作为WSGI服务器
   - 使用Nginx作为反向代理
   - 配置HTTPS（SSL证书）
   - 配置数据库连接池

3. **性能优化**
   - 启用前端生产构建（`npm run build`）
   - 配置静态文件CDN
   - 启用数据库查询优化
   - 配置缓存策略

4. **监控与日志**
   - 配置应用日志记录
   - 设置错误监控（如Sentry）
   - 配置性能监控
   - 定期备份数据库

## Celery工作原理

### 系统架构
本项目使用 **Celery + Redis** 实现异步任务处理，自动分析保险计划书文档。

### 任务流水线

当用户上传PDF后，系统会自动执行以下流程：

```
用户上传PDF（Plan-Analyzer页面）
    ↓
前端检测PDF是否包含表格（detectTableInPDF）
    ↓
用户点击"开始分析"
    ↓
POST /api/ocr/upload-async/（保存PDF文件）
    ↓
生成唯一文件名：原名_时间戳.pdf
    ↓
保存到 media/plan_documents/
    ↓
创建PlanDocument记录（file_name, file_path, status='processing'）
    ↓
触发Celery任务链（3个核心任务按顺序执行）
    ↓
[步骤0] OCR识别 (ocr_document_task)
    → 调用 Gemini 3 Flash Preview API识别PDF
    → 提取Markdown格式文本（包含HTML表格）
    → 保存到 content 字段
    ↓
[步骤1] 提取表格源代码 (extract_tablecontent_task)
    → 从content按页分割（--- 分隔符）
    → 提取每页的所有<table>标签（手动解析，非正则）
    → 过滤：只保留包含"保单年度终结/保單年度終結"的表格
    → Table级过滤（不是页面级）
    → 移除换行符避免OCR分词问题
    → 保存到 tablecontent 字段
    ↓
[步骤2] 提取表格概要并保存到数据库 (extract_tablesummary_task)
    → 从tablecontent提取所有包含"保单年度终结"的<table>标签
    → 使用check_first_year_in_table判断是否从年度1开始
    → 基于数字特征检测（跳过多行表头）
    → 跳过孤立续表（不从1开始且前面无可接续表格）
    → 自动分组合并跨页表格（group_tables_by_title）
    → 每个逻辑表格创建一条PlanTable记录
    → 保存表格HTML源代码和元数据
    ↓
处理完成（processing_stage: all_completed, status: completed）
```

### 核心组件

1. **任务队列**: Redis (localhost:6379)
2. **任务处理器**: Celery Worker (4个并发)
3. **任务定义**: `api/tasks.py`
4. **任务配置**: `backend/celery.py`
5. **任务触发**: `api/ocr_views.py:122` (save_ocr_result函数)

### 任务特性

- **自动链式触发**: 每个任务完成后自动触发下一个任务
- **重试机制**: 每个任务最多重试2次（60秒间隔）
- **降级策略**: 即使某个任务失败，也会继续执行后续任务
- **状态跟踪**: 实时更新 `processing_stage` 字段
- **进度显示**: 前端可轮询状态获取处理进度

### 监控和管理

```bash
# 启动Celery Worker
./start_celery.sh

# 停止Celery Worker
./stop_celery.sh

# 查看任务日志
tail -f logs/celery.log

# 查看Redis队列
redis-cli LLEN celery
```

### 表格提取核心逻辑

#### 步骤1：表格源代码提取（extract_tablecontent_task）

**核心功能**：从OCR文本中提取所有包含"保单年度终结"的表格HTML源代码

**关键技术点**：
1. **手动HTML解析**（非正则）：
   - 使用 `str.find()` 查找 `<table>` 和 `</table>`
   - 支持嵌套表格（深度追踪）
   - 避免正则表达式在大表格上的性能问题

2. **Table级过滤**（非页面级）：
   - 提取页面所有表格
   - 逐个检查是否包含关键词
   - 只保留符合条件的表格，删除其他表格
   - 重建页面HTML

3. **OCR换行问题处理**：
   - OCR可能把"保單年度終結"识别为"保單年度\n終結"
   - 检测前移除所有换行符：`table_html.replace('\n', '').replace('\r', '')`

**代码位置**：`api/tasks.py:501-654`

#### 步骤2：表格分组和数据库保存（extract_tablesummary_task）

**核心功能**：识别逻辑表格，合并跨页表格，保存到PlanTable数据库

**关键技术点**：
1. **多行表头检测**（check_first_year_in_table）：
   - **改进前**：使用关键词白名单（需要维护20+个关键词）
   - **改进后**：基于数字特征判断
   - 跳过 `<th>` 标签行
   - 检查第一列是否为纯数字（`str.isdigit()`）
   - 非数字 → 表头行，继续寻找
   - 数字 → 数据行，判断是否为1

2. **跨页表格合并**（group_tables_by_title）：
   - 规则1：保单年度=1 → 新表格的开始
   - 规则2：保单年度≠1 → 必须接续前一个表格
   - 规则3：表头不同 → 跳过孤立续表
   - 规则4：表头相同 + 年度≠1 → 续表，合并到当前组

3. **PlanTable记录创建**：
   - 每个逻辑表格（可能包含多个跨页<table>）创建一条记录
   - 存储：table_number, table_name, row_count, fields, table_html

**代码位置**：`api/tasks.py:656-900`

**改进历史**：
- ✅ 修复正则匹配失败（改用手动解析）
- ✅ 修复页面级过滤（改为table级）
- ✅ 修复OCR换行问题（移除换行符）
- ✅ 修复多行表头识别（基于数字特征）
- ✅ 修复孤立续表问题（跳过不从1开始的表格）

### 详细文档
更多配置和使用说明，请参阅：
- **CELERY_SETUP.md** - 完整的Celery安装、配置和使用指南
- **api/tasks.py** - 所有任务的详细实现代码
- **CROSS_PAGE_TABLE_HANDLING.md** - 跨页表格处理机制
- **TABLE_EXTRACTION_IMPROVEMENTS.md** - 表格提取改进记录

### 步骤5代码逻
核心逻辑（两步走）：

  第一步：判断是否存在

  - 读取 tablesummary（步骤3生成的表格概要）
  - 调用 DeepSeek API 判断是否有包含"入息"/"提取"/"无忧选"字段的表格
  - 如果不存在 → 保存空字符串，结束

  第二步：提取数据（如果存在）

  - 从 content（OCR文本）中提取该表格的具体数据
  - 调用 DeepSeek API 提取4个字段：
    - policy_year: 保单年度
    - withdraw: 该年非保证入息
    - withdraw_total: 累计已支付非保证入息
    - total: 行使无忧选后的退保价值
- 第一步OCR识别 如果失败 其他步骤就全部没有意义了
- 第一步OCR识别 如果失败 其他步骤就全部没有意义了
- /memory 页面company-comparison 文件frontend/src/components/CompanyComparison.jsx
- /memory 您的系统（可能是 AppArmor 或其他安全模块）正在杀死 esbuild 的原生二进制文件（每次运行都被 SIGKILL 信号杀死，Exit code
  137）。

  解决方案

  我使用了 esbuild-wasm（WebAssembly 版本的 esbuild）替代原生二进制版本：

  1. ✅ 安装了 esbuild-wasm
  2. ✅ 通过符号链接将 node_modules/esbuild 指向 esbuild-wasm
  3. ✅ 构建成功完成（11.94秒