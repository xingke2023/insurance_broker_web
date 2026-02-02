# 计划书智能对比功能使用指南

## 功能概述

本功能使用Google Gemini AI直接分析2-3份PDF计划书文件，生成详细的对比分析报告。

## 主要特性

### 1. 直接PDF分析
- 无需预先OCR识别，直接上传PDF即可对比
- 支持同时对比2-3份计划书
- AI自动提取并对比所有关键信息

### 2. 多维度对比
- **保费对比**: 年缴保费、缴费年数、总保费、性价比
- **保障对比**: 基本保额、保险期限、保障范围
- **现金价值对比**: 以保单年度终结为基准，展示完整年度对比表格
- **提取计划对比**: 提取灵活性、提取后价值变化
- **适用人群分析**: 根据受保人情况给出推荐
- **优劣势总结**: 绿色标记优势，红色标记劣势

### 3. 历史记录管理
- 自动保存对比记录
- 可查看历史对比报告
- 支持下载原始PDF文件（所有3份）
- 可删除不需要的对比记录

## 使用步骤

### Step 1: 进入对比页面
1. 登录系统
2. 在Dashboard点击"计划书智能对比"
3. 或直接访问 `/plan-comparison`

### Step 2: 上传PDF文件
1. 点击"计划书1"区域，上传第一份PDF（必需）
2. 点击"计划书2"区域，上传第二份PDF（必需）
3. （可选）点击"计划书3"区域，上传第三份PDF

**注意事项**:
- 文件必须是PDF格式
- 单个文件最大50MB
- 至少上传2份，最多3份

### Step 3: 开始对比分析
1. 点击"开始AI对比分析"按钮
2. 等待AI分析（通常需要30-60秒）
3. 分析完成后自动显示对比报告

### Step 4: 查看对比报告
对比报告包含以下章节：
- 📊 保费投入对比
- 🛡️ 保障范围对比
- 💰 现金价值对比（完整年度表格）
- 📈 提取计划对比
- 👥 适用人群分析
- ⭐ 优劣势总结及评分

### Step 5: 查看历史记录
1. 在对比页面点击"查看历史记录"按钮
2. 或直接访问 `/comparison-history`
3. 可以：
   - 查看历史对比报告
   - 下载任意PDF文件
   - 删除不需要的记录

## API接口

### 1. 创建对比
**POST** `/api/plan-comparison/compare/`

**请求参数**:
- `pdf1`: PDF文件1（必需）
- `pdf2`: PDF文件2（必需）
- `pdf3`: PDF文件3（可选）

**响应**:
```json
{
  "success": true,
  "comparison_id": 123,
  "comparison_report": "HTML格式的对比报告",
  "message": "对比完成"
}
```

### 2. 获取对比历史
**GET** `/api/plan-comparison/history/`

**响应**:
```json
{
  "success": true,
  "comparisons": [
    {
      "id": 123,
      "pdf1_name": "计划书1.pdf",
      "pdf2_name": "计划书2.pdf",
      "pdf3_name": "计划书3.pdf",
      "created_at": "2026-01-23T10:00:00Z"
    }
  ]
}
```

### 3. 获取对比详情
**GET** `/api/plan-comparison/{comparison_id}/`

**响应**:
```json
{
  "success": true,
  "comparison": {
    "id": 123,
    "pdf1_name": "计划书1.pdf",
    "pdf2_name": "计划书2.pdf",
    "pdf3_name": "计划书3.pdf",
    "comparison_report": "HTML格式的对比报告",
    "created_at": "2026-01-23T10:00:00Z"
  }
}
```

### 4. 下载PDF
**GET** `/api/plan-comparison/{comparison_id}/download/{pdf_number}/`

**参数**:
- `comparison_id`: 对比记录ID
- `pdf_number`: PDF编号（1、2或3）

**响应**: PDF文件流

### 5. 删除对比记录
**DELETE** `/api/plan-comparison/{comparison_id}/delete/`

**响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

## 数据库表结构

### plan_comparisons表
```sql
CREATE TABLE plan_comparisons (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pdf1_name VARCHAR(255) NOT NULL,
  pdf1_base64 LONGTEXT NOT NULL,
  pdf2_name VARCHAR(255) NOT NULL,
  pdf2_base64 LONGTEXT NOT NULL,
  pdf3_name VARCHAR(255) DEFAULT '',
  pdf3_base64 LONGTEXT DEFAULT '',
  comparison_report LONGTEXT DEFAULT '',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE
);
```

## 技术实现

### 后端
- **框架**: Django REST Framework
- **AI服务**: Google Gemini 3 Flash Preview
- **数据存储**: MySQL（PDF以base64格式存储）
- **文件**:
  - `api/plan_comparison_views.py` - API视图
  - `api/models.py` - PlanComparison模型
  - `api/serializers.py` - PlanComparisonSerializer
  - `api/urls.py` - 路由配置

### 前端
- **框架**: React 19
- **路由**: React Router DOM
- **UI**: Tailwind CSS
- **文件**:
  - `frontend/src/components/PlanComparisonDirect.jsx` - 对比页面
  - `frontend/src/components/PlanComparisonHistory.jsx` - 历史记录页面
  - `frontend/src/App.jsx` - 路由配置

### Gemini API调用
```python
# 构建请求
parts = [
    types.Part.from_bytes(data=pdf1_bytes, mime_type='application/pdf'),
    types.Part.from_bytes(data=pdf2_bytes, mime_type='application/pdf'),
    types.Part.from_bytes(data=pdf3_bytes, mime_type='application/pdf'),
    types.Part.from_text(text=prompt)
]

# 调用API
response = call_gemini_with_fallback(
    model='gemini-3-flash-preview',
    contents=[types.Content(role="user", parts=parts)],
    operation_name="计划书对比分析"
)
```

## 部署步骤

### 1. 创建数据库表
```bash
mysql -h localhost -P 8510 -u root -p insurancetools < create_plan_comparisons_table.sql
```

### 2. 执行数据库迁移
```bash
python3 manage.py migrate
```

### 3. 重启Django服务
```bash
sudo supervisorctl restart harry-insurance:harry-insurance-django
```

### 4. 重新构建前端（如需）
```bash
cd frontend
npm run build
```

## 常见问题

### Q1: 对比失败怎么办？
**A**: 检查以下几点：
1. PDF文件是否损坏
2. 文件大小是否超过50MB
3. Gemini API密钥是否配置正确
4. 查看后端日志获取详细错误信息

### Q2: 对比速度慢怎么办？
**A**: 对比速度取决于：
1. PDF文件大小（建议压缩大文件）
2. Gemini API响应速度
3. 网络状况

通常30-60秒内完成，如果超过2分钟，建议刷新页面重试。

### Q3: 如何查看历史对比？
**A**:
1. 在对比页面点击"查看历史记录"
2. 或直接访问 `/comparison-history`
3. 所有对比记录都会自动保存

### Q4: PDF下载失败怎么办？
**A**:
1. 确认对比记录存在
2. 检查浏览器下载设置
3. 查看浏览器控制台错误信息

## 注意事项

1. **隐私安全**: PDF文件以base64格式存储在数据库，请确保数据库安全
2. **存储空间**: 每个PDF最大50MB，建议定期清理历史记录
3. **API限额**: Gemini API有调用限额，请合理使用
4. **权限控制**: 需要登录才能使用，每个用户只能查看自己的对比记录

## 更新日志

### v1.0.0 (2026-01-23)
- ✅ 初始版本发布
- ✅ 支持2-3份PDF直接对比
- ✅ 多维度对比分析
- ✅ 历史记录管理
- ✅ PDF下载功能
