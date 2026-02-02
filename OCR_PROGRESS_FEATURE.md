# OCR进度显示功能

## 功能概述

为保险计划书分析系统添加了OCR识别过程的实时进度显示功能，让用户可以清楚地看到文档处理的每个阶段。

## 更新内容

### 1. 数据库模型更新 (`api/models.py`)

**新增处理阶段**：
```python
('ocr_processing', 'OCR识别中'),
('ocr_completed', 'OCR识别完成'),
```

**完整的处理阶段流程**：
1. `pending` (8%) - 待处理
2. `ocr_processing` (10%) - 🆕 OCR识别中
3. `ocr_completed` (15%) - 🆕 OCR识别完成
4. `extracting_basic_info` (25%) - 提取基本信息中
5. `basic_info_completed` (35%) - 基本信息完成
6. `extracting_tablesummary` (45%) - 分析表格结构中
7. `tablesummary_completed` (55%) - 表格结构分析完成
8. `extracting_table` (65%) - 提取退保价值表中
9. `table_completed` (75%) - 退保价值表完成
10. `extracting_wellness_table` (82%) - 提取无忧选表中
11. `wellness_table_completed` (88%) - 无忧选表完成
12. `extracting_summary` (94%) - 提取概要中
13. `all_completed` (100%) - 全部完成

### 2. 后端任务更新 (`api/tasks.py`)

**OCR任务进度更新**：
```python
@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def ocr_document_task(self, document_id):
    # 开始OCR识别
    doc.processing_stage = 'ocr_processing'
    doc.save()

    # 调用 Gemini OCR API
    result = ocr_pdf_with_gemini(doc.file_path.path)

    # OCR完成，保存内容
    doc.content = ocr_content
    doc.processing_stage = 'ocr_completed'
    doc.save()
```

### 3. 前端进度显示更新 (`frontend/src/components/PlanAnalyzer.jsx`)

**进度映射**：
```javascript
const stageProgress = {
  'ocr_processing': 10,    // 🆕
  'ocr_completed': 15,     // 🆕
  'extracting_basic_info': 25,
  // ...
};
```

**阶段消息**：
```javascript
const stageMessages = {
  'ocr_processing': '正在OCR识别文档...',           // 🆕
  'ocr_completed': 'OCR识别完成，开始提取信息',      // 🆕
  'extracting_basic_info': '正在提取基本信息...',
  // ...
};
```

**进度条显示**：
```javascript
{[
  {
    id: 'ocr',
    label: '🔍 OCR识别文档内容',
    processingStages: ['ocr_pending', 'ocr_processing'],  // 🆕
    completedStages: ['ocr_completed', ...]
  },
  // ...
]}
```

### 4. Gemini API性能优化 (`api/gemini_service.py`)

**配置优化**：
```python
config = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(thinkingBudget=1024),  # 最小思考预算
    media_resolution=types.MediaResolution.MEDIA_RESOLUTION_MEDIUM,  # 中等分辨率
    max_output_tokens=65536  # 最大输出
)

response = call_gemini_with_fallback(
    model='gemini-3-flash-preview',  # 使用最新模型
    contents=contents,
    config=config,
    operation_name="PDF OCR识别"
)
```

**性能提升**：
- 使用 `thinkingBudget=1024` 减少推理时间
- 使用 `MEDIA_RESOLUTION_MEDIUM` 平衡速度和质量
- 升级到 `gemini-3-flash-preview` 获得更快的处理速度

## 数据库迁移

```bash
# 生成迁移文件
python3 manage.py makemigrations api

# 应用迁移
python3 manage.py migrate api
```

迁移文件：`api/migrations/0048_alter_plandocument_processing_stage.py`

## 前端显示效果

### 上传文档时
1. 初始状态：`pending` (8%)
2. 开始OCR：`ocr_processing` (10%) - 显示 "正在OCR识别文档..."
3. OCR完成：`ocr_completed` (15%) - 显示 "OCR识别完成，开始提取信息"

### 进度条UI
- 实时显示当前处理阶段
- 进度百分比准确反映完成度
- 每个任务步骤都有清晰的图标和文字说明
- 支持多任务并发显示

### 任务列表
- 显示所有正在处理的文档
- 实时更新进度条
- 点击任务可查看详细信息
- 完成后自动标记为"已完成"

## 测试

### 测试脚本 1: API配置测试
```bash
python3 test_gemini_config.py
```

**测试内容**：
- ✅ Gemini 客户端创建
- ✅ GenerateContentConfig 配置验证
- ✅ 简单文本生成测试
- ✅ PDF OCR识别测试

### 测试脚本 2: 进度显示测试
```bash
python3 test_ocr_progress.py
```

**测试内容**：
- 显示最近5个文档的处理状态
- 显示进度条和百分比
- 显示OCR内容长度
- 显示正在处理的文档数量

## 实际使用流程

1. **用户上传PDF**
   - 前端：显示初始进度 8%
   - 状态：`pending`

2. **OCR识别开始**
   - 后端：调用 Gemini 3 Flash Preview API
   - 前端：进度更新到 10%，显示 "正在OCR识别文档..."
   - 状态：`ocr_processing`

3. **OCR识别完成**
   - 后端：content字段保存识别结果
   - 前端：进度更新到 15%，显示 "OCR识别完成，开始提取信息"
   - 状态：`ocr_completed`

4. **后续处理**
   - 自动触发表格提取、数据分析等任务
   - 进度条持续更新直到 100%

## 技术细节

### 轮询机制
- 前端每2秒轮询一次 `/api/ocr/documents/{id}/status/`
- 获取 `processing_stage` 和 `progress_percentage`
- 自动更新UI显示

### 错误处理
- OCR失败：自动重试2次（60秒间隔）
- 重试失败：标记为 `error` 状态
- 前端显示错误信息

### 性能优化
- 使用最新 Gemini 3 Flash Preview 模型
- 优化API配置减少响应时间
- 预计OCR速度提升 20-40%

## 相关文件

### 后端
- `api/models.py` - 数据模型定义
- `api/tasks.py` - Celery异步任务
- `api/gemini_service.py` - Gemini API调用
- `api/migrations/0048_*.py` - 数据库迁移

### 前端
- `frontend/src/components/PlanAnalyzer.jsx` - 主分析页面

### 测试
- `test_gemini_config.py` - API配置测试
- `test_ocr_progress.py` - 进度显示测试

## 部署

```bash
# 1. 应用数据库迁移
python3 manage.py migrate api

# 2. 重启服务
sudo supervisorctl restart harry-insurance:*

# 3. 验证服务状态
sudo supervisorctl status harry-insurance:*
```

## 注意事项

1. **API密钥配置**
   - 需要配置 `GEMINI_API_KEY` 环境变量
   - 支持备用密钥 `GEMINI_API_KEY_FALLBACK`

2. **模型选择**
   - 使用 `gemini-3-flash-preview` 获得最佳性能
   - 配置 `thinkingBudget=1024` 和 `MEDIA_RESOLUTION_MEDIUM`

3. **进度更新**
   - 确保 Celery Worker 正常运行
   - 前端轮询机制依赖后端API响应

4. **错误监控**
   - 查看 Celery 日志：`tail -f logs/celery.log`
   - 查看 Django 日志：`sudo journalctl -u harry-insurance-django -f`

## 未来改进

- [ ] 使用 WebSocket 替代轮询，实现真正的实时更新
- [ ] 添加OCR识别的详细日志（识别速度、页数等）
- [ ] 支持暂停/恢复OCR任务
- [ ] 添加OCR质量评分和置信度显示
- [ ] 支持批量上传时的并发OCR处理
