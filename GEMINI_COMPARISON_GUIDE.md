# Gemini PDF 对比分析功能使用指南

## 功能概述

使用 **Gemini 3 Flash Preview** AI 直接分析 2-3 份保险计划书 PDF，生成专业的对比报告。

## 核心改进

### 1. 直接 PDF 分析
- ✅ **无需OCR识别**：直接上传PDF给Gemini
- ✅ **更高准确度**：Gemini原生理解PDF结构
- ✅ **更快速度**：省略OCR和中间处理步骤

### 2. 智能对比分析
- 📊 **全维度对比**：基本信息、保费、现金价值、保障范围
- 📈 **年度价值表**：以"保单年度终结"为基准，展示完整对比
- 💰 **IRR 分析**：投资回报率计算
- ⭐ **综合评分**：从5个维度打分并推荐

### 3. API Key 轮询机制
- 🔄 **三密钥轮询**：自动使用 `GEMINI_API_KEY`、`GEMINI_API_KEY_FALLBACK`、`GEMINI_API_KEY_3`
- 🛡️ **自动降级**：某个密钥超额时自动切换
- ⚡ **负载均衡**：轮询使用，避免单密钥过载

### 4. 对比历史管理
- 💾 **PDF 存储**：Base64 格式存储原始 PDF，支持下载
- 📝 **Markdown 报告**：格式化的对比报告
- 🗂️ **历史记录**：查看所有对比记录
- 🗑️ **一键删除**：清理不需要的记录

## 系统架构

```
用户上传 2-3 份 PDF
    ↓
前端: PlanAnalyzer2.jsx
    │
    ├─ PDF 表格检测（pdfjs-dist）
    ├─ 文件上传（FormData）
    └─ 流式显示（SSE + ReactMarkdown）
    ↓
后端: gemini_comparison_views.py
    │
    ├─ 接收 PDF 文件
    ├─ 转换为 Base64
    ├─ 创建 ComparisonReport 记录
    └─ 调用 Gemini 服务
    ↓
服务: gemini_comparison_service.py
    │
    ├─ 使用轮询机制获取 API Key
    ├─ 构建对比提示词
    ├─ 调用 Gemini API
    └─ 返回 Markdown 报告
    ↓
数据库: ComparisonReport
    │
    ├─ pdf1_base64, pdf1_filename
    ├─ pdf2_base64, pdf2_filename
    ├─ pdf3_base64, pdf3_filename（可选）
    ├─ comparison_summary（Markdown）
    └─ status: processing/completed/failed
```

## 数据模型

### ComparisonReport（对比报告）

| 字段 | 类型 | 说明 |
|------|------|------|
| user | ForeignKey | 创建用户 |
| comparison_title | CharField | 对比标题 |
| pdf1_base64 | TextField | 计划书1 PDF Base64 |
| pdf1_filename | CharField | 计划书1文件名 |
| pdf2_base64 | TextField | 计划书2 PDF Base64 |
| pdf2_filename | CharField | 计划书2文件名 |
| pdf3_base64 | TextField | 计划书3 PDF Base64（可选） |
| pdf3_filename | CharField | 计划书3文件名（可选） |
| comparison_summary | TextField | 对比报告（Markdown/HTML） |
| report_format | CharField | 报告格式（markdown/html） |
| status | CharField | 状态（processing/completed/failed） |
| error_message | TextField | 错误信息 |
| created_at | DateTime | 创建时间 |

## API 接口

### 1. 对比分析（非流式）

```http
POST /api/gemini-comparison/compare/
Content-Type: multipart/form-data
Authorization: Bearer {token}

FormData:
  - pdf_1: File (必填)
  - file_name_1: String (必填)
  - pdf_2: File (必填)
  - file_name_2: String (必填)
  - pdf_3: File (可选)
  - file_name_3: String (可选)
  - title: String (可选)
```

**响应**：
```json
{
  "id": 123,
  "title": "3份计划书对比分析",
  "report": "# 保险计划书对比分析报告\n...",
  "report_format": "markdown",
  "status": "completed",
  "file_names": ["plan1.pdf", "plan2.pdf", "plan3.pdf"],
  "created_at": "2024-01-01 12:00:00"
}
```

### 2. 对比分析（流式）

```http
POST /api/gemini-comparison/compare-stream/
Content-Type: multipart/form-data
Authorization: Bearer {token}

（参数同上）
```

**响应**（SSE 流）：
```
data: {"status": "analyzing", "message": "Gemini AI 正在分析..."}
data: {"status": "streaming", "chunk": "# 对比报告\n"}
data: {"status": "streaming", "chunk": "## 基本信息\n"}
...
data: {"status": "completed", "id": 123}
```

### 3. 获取对比历史

```http
GET /api/gemini-comparison/history/
Authorization: Bearer {token}
```

**响应**：
```json
{
  "comparisons": [
    {
      "id": 123,
      "title": "3份计划书对比分析",
      "file_names": ["plan1.pdf", "plan2.pdf", "plan3.pdf"],
      "status": "completed",
      "created_at": "2024-01-01 12:00:00"
    }
  ]
}
```

### 4. 获取对比详情

```http
GET /api/gemini-comparison/{id}/
Authorization: Bearer {token}
```

**响应**：
```json
{
  "id": 123,
  "title": "3份计划书对比分析",
  "file_names": ["plan1.pdf", "plan2.pdf", "plan3.pdf"],
  "report": "# 对比报告内容...",
  "report_format": "markdown",
  "status": "completed",
  "created_at": "2024-01-01 12:00:00"
}
```

### 5. 下载 PDF

```http
GET /api/gemini-comparison/{id}/download/{pdf_number}/
Authorization: Bearer {token}

pdf_number: 1, 2, 或 3
```

**响应**：PDF 文件流

### 6. 删除对比报告

```http
DELETE /api/gemini-comparison/{id}/delete/
Authorization: Bearer {token}
```

## 前端组件

### 1. PlanAnalyzer2.jsx（对比分析页面）

**功能**：
- 上传 2-3 份 PDF
- PDF 表格检测
- 流式显示对比报告
- Markdown 渲染

**路由**：`/plan-analyzer2`

**关键技术**：
- `pdfjs-dist`：PDF 表格检测
- `react-markdown`：Markdown 渲染
- `remark-gfm`：GitHub 风格表格支持

### 2. GeminiComparisonHistory.jsx（对比历史）

**功能**：
- 查看所有对比记录
- 下载原始 PDF
- 查看对比报告
- 删除记录

**路由**：
- 历史列表：`/gemini-comparison-history`
- 报告详情：`/gemini-comparison/:id`

## 环境变量配置

```bash
# 主 API 密钥
GEMINI_API_KEY=AIzaSy...

# 备用密钥（轮询机制）
GEMINI_API_KEY_FALLBACK=AIzaSy...

# 第三个密钥（轮询机制）
GEMINI_API_KEY_3=AIzaSy...
```

## 对比报告内容

Gemini 会生成以下内容：

### 1. 基本信息对比
- 受保人信息（姓名、年龄、性别）
- 保险公司和产品名称
- 保险期限
- 基本保额

### 2. 保费对比分析
- 年缴保费
- 缴费年数
- 总保费
- 保费性价比分析

### 3. 现金价值对比（核心）

**Markdown 表格格式**：

| 保单年度终结 | 计划书1-保证现金价值 | 计划书1-非保证现金价值 | 计划书1-总现金价值 | 计划书2-保证现金价值 | ...
|------------|-------------------|---------------------|------------------|-------------------|---
| 1          | 10,000            | 5,000               | 15,000           | 12,000            | ...
| 2          | 22,000            | 11,000              | 33,000           | 25,000            | ...
| ...        | ...               | ...                 | ...              | ...               | ...

### 4. 关键年度对比
- 第 5 年（缴费期结束/回本点）
- 第 10 年（中期价值）
- 第 20 年（长期价值）
- 第 30 年（退休规划）
- 保单到期年

### 5. 投资回报率分析
- IRR（内部收益率）
- 回本情况
- 长期投资价值

### 6. 保障范围对比
- 身故保障
- 疾病保障
- 附加保障
- 保障全面性评分

### 7. 灵活性对比
- 提取计划
- 保单贷款
- 红利选项
- 其他功能

### 8. 综合评分与建议

**评分维度**（满分100分）：
- 保费性价比（30分）
- 现金价值增长（25分）
- 保障全面性（20分）
- 灵活性（15分）
- 公司信誉（10分）

## 使用流程

### 前端使用

1. **访问对比分析页面**
   ```
   /plan-analyzer2
   ```

2. **上传 PDF 文件**
   - 点击"选择文件"上传 PDF
   - 系统自动检测是否包含表格
   - 最少 2 份，最多 3 份

3. **开始分析**
   - 点击"开始对比分析"
   - 实时显示 AI 生成的报告
   - Markdown 格式，表格清晰

4. **查看历史**
   - 点击"对比历史"按钮
   - 查看所有对比记录
   - 下载原始 PDF
   - 查看完整报告

### 后端开发

1. **导入服务**
   ```python
   from api.gemini_comparison_service import GeminiComparisonService
   ```

2. **初始化服务**
   ```python
   service = GeminiComparisonService()
   ```

3. **调用对比分析**
   ```python
   # 非流式
   report = service.compare_plans(pdf_files, file_names)

   # 流式
   for chunk in service.compare_plans_stream(pdf_files, file_names):
       print(chunk, end='')
   ```

## 数据库迁移

```bash
# 创建迁移
python3 manage.py makemigrations

# 应用迁移
python3 manage.py migrate
```

## 测试

```bash
# 运行测试脚本
python3 test_gemini_comparison.py
```

## 日志

- **Django 日志**：查看 `logs/django.log`
- **Gemini 调用日志**：带有 `[PDF对比分析]` 或 `[流式对比]` 标签

**日志示例**：
```
🔄 本次任务从 密钥1 开始（轮询索引: 0）
🔑 [PDF对比分析] 尝试使用密钥1: AIzaSy...
✅ [PDF对比分析] 密钥1调用成功
```

## 注意事项

1. **文件大小限制**
   - 前端：50MB
   - Gemini API：建议 < 20MB/文件

2. **API 配额**
   - 使用轮询机制避免单密钥超额
   - 三个密钥轮流使用

3. **报告格式**
   - 默认 Markdown 格式
   - 支持 GitHub 风格表格（GFM）
   - 前端使用 `react-markdown` 渲染

4. **PDF 存储**
   - Base64 格式存储在数据库
   - 可能导致数据库体积增大
   - 建议定期清理历史记录

## 故障排查

### 1. API 调用失败

**症状**：所有密钥均失败

**解决**：
```bash
# 检查环境变量
echo $GEMINI_API_KEY
echo $GEMINI_API_KEY_FALLBACK
echo $GEMINI_API_KEY_3

# 检查日志
tail -f logs/django.log | grep Gemini
```

### 2. PDF 无法下载

**症状**：下载失败或文件损坏

**解决**：
- 检查 Base64 数据完整性
- 确认 PDF 字段未超过 MySQL 限制

### 3. 前端渲染异常

**症状**：Markdown 表格不显示

**解决**：
```bash
# 安装依赖
cd frontend
npm install react-markdown remark-gfm
```

## 性能优化

1. **数据库优化**
   - 对 `created_at` 建立索引
   - 对 `user_id` 建立索引

2. **API 优化**
   - 使用流式接口减少等待时间
   - 轮询机制避免单密钥限流

3. **前端优化**
   - 流式渲染，边生成边显示
   - PDF 检测异步执行

## 未来改进

- [ ] 支持更多文件格式（Word, Excel）
- [ ] 添加对比模板选择
- [ ] 支持自定义对比维度
- [ ] 导出对比报告为 PDF
- [ ] 对比报告分享链接
- [ ] PDF 压缩存储

## 相关文档

- [CLAUDE.md](CLAUDE.md) - 项目整体说明
- [CELERY_SETUP.md](CELERY_SETUP.md) - Celery 配置
- [API_LIMITS_FIX.md](API_LIMITS_FIX.md) - API 限制处理

---

**版本**: 1.0
**更新时间**: 2024-01-23
**作者**: AI Assistant
