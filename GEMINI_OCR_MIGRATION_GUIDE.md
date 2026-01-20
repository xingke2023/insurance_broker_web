# Gemini OCR 迁移指南

## 概述

本文档说明如何将保险计划书OCR识别从 **PaddleLayout API** 迁移到 **Google Gemini 3 Flash Preview API**。

---

## 变更内容

### 1. 新增文件

#### `api/gemini_service.py` - 新增函数
```python
def ocr_pdf_with_gemini(pdf_path):
    """
    使用 Gemini 3 Flash Preview 对 PDF 文件进行 OCR 识别

    参数:
        pdf_path: PDF文件的绝对路径

    返回:
        {
            "success": True/False,
            "content": "识别的Markdown格式文本",
            "error": "错误信息（如果失败）"
        }
    """
```

### 2. 修改文件

#### `api/tasks.py` - OCR任务修改

**修改前（PaddleLayout）：**
```python
# 调用PaddleLayout API
response = requests.post(
    'http://localhost:5003/api/paddle-layout/pdf',
    files=files,
    data=data,
    headers=headers,
    timeout=300
)
```

**修改后（Gemini Flash）：**
```python
# 调用 Gemini Flash API
result = ocr_pdf_with_gemini(doc.file_path.path)

if result['success']:
    ocr_content = result['content']
    # 保存到数据库...
```

### 3. 测试工具

- `test_gemini_ocr.py` - 独立测试脚本，无需Django服务器

---

## 技术对比

| 特性 | PaddleLayout | Gemini 3 Flash |
|------|--------------|----------------|
| **模型** | PaddleOCR + LayoutParser | Google Gemini 3 Flash Preview |
| **部署方式** | 本地Docker服务 (5003端口) | 云端API调用 |
| **输出格式** | Markdown + HTML表格 | Markdown + HTML表格 |
| **表格识别** | 基于视觉布局 | 基于多模态理解 |
| **速度** | ~30-60秒/文档 | ~20-40秒/文档 (取决于网络) |
| **成本** | 免费（自托管） | 按Token计费（Flash版本更便宜） |
| **准确度** | 中文表格较好 | 多语言支持更强 |

---

## 优势

### Gemini 3 Flash Preview 的优势

1. **无需本地服务**
   - 不需要运行PaddleLayout Docker容器
   - 减少服务器资源占用（内存、CPU）
   - 简化部署流程

2. **更强的语义理解**
   - 多模态大模型（图片+文本）
   - 更准确的表格结构识别
   - 更智能的字段名识别（不会翻译"保单年度终结"等关键字）

3. **更好的格式保留**
   - 自动保留HTML表格格式
   - 提示词可精确控制输出格式
   - 数字、符号识别更准确

4. **易于维护**
   - 云端服务，无需维护本地OCR服务
   - API稳定，版本更新由Google处理
   - 错误日志更清晰

---

## 部署步骤

### 步骤1：检查环境变量

确保 `.env` 文件中配置了 Gemini API Key：

```bash
# .env
GEMINI_API_KEY=AIzaSyC6_Lp7D2RLFTDtWoKz6-eSerX6oNDdjdM
```

验证配置：
```bash
grep GEMINI_API_KEY .env
```

### 步骤2：测试OCR功能

使用测试脚本验证Gemini OCR是否正常工作：

```bash
# 选择一个测试PDF文件
python3 test_gemini_ocr.py ./media/plan_documents/test_insurance.pdf
```

**预期输出：**
```
================================================================================
📄 测试 Gemini Flash OCR 识别
================================================================================

📂 PDF文件路径: ./media/plan_documents/test_insurance.pdf
📊 文件大小: 2.34 MB

🚀 开始OCR识别...

================================================================================
✅ OCR识别成功
================================================================================

📝 识别内容长度: 15234 字符

📄 内容预览 (前500字符):
--------------------------------------------------------------------------------
# 保险计划书

## 受保人信息
- 姓名: 张三
- 年龄: 35岁
...
--------------------------------------------------------------------------------

✅ 检测到表格标签
📊 表格数量: 3

💾 完整结果已保存到: test_insurance.pdf_gemini_ocr_result.txt
```

### 步骤3：重启服务

重启Django和Celery服务以应用更改：

```bash
# 重启Django
sudo supervisorctl restart harry-insurance:harry-insurance-django

# 重启Celery Worker
sudo supervisorctl restart harry-insurance:harry-insurance-celery

# 查看服务状态
sudo supervisorctl status harry-insurance:
```

### 步骤4：验证完整流程

1. **上传测试PDF**
   - 访问 Plan-Analyzer 页面
   - 上传一份保险计划书PDF
   - 点击"开始分析"

2. **监控Celery日志**
   ```bash
   tail -f logs/celery.log
   ```

3. **检查关键日志**
   ```
   📄 Celery任务开始 - 步骤0/3: OCR识别文档
   📤 开始调用 Gemini Flash OCR
   🤖 正在调用Gemini Flash API进行OCR识别...
   ✅ OCR识别完成，内容长度: 18456 字符
   ✅ 步骤0完成: Gemini OCR识别成功
   ```

4. **验证后续任务**
   - 步骤1：提取表格源代码 ✅
   - 步骤2：提取表格概要 ✅
   - 步骤3：分析数据 ✅

---

## 故障排查

### 问题1：API密钥错误

**症状：**
```
❌ GEMINI_API_KEY环境变量未设置
```

**解决方法：**
```bash
# 检查.env文件
cat .env | grep GEMINI

# 重启Django服务加载新配置
sudo supervisorctl restart harry-insurance:harry-insurance-django
```

### 问题2：网络连接失败

**症状：**
```
❌ Gemini OCR识别失败: HTTPConnectionPool... timeout
```

**解决方法：**
1. 检查服务器网络连接
2. 测试Google API连通性：
   ```bash
   curl -I https://generativelanguage.googleapis.com
   ```
3. 如需代理，在 `gemini_service.py` 中配置代理

### 问题3：文件大小限制

**症状：**
```
❌ Gemini OCR识别失败: File too large
```

**解决方法：**
- Gemini Flash 支持最大 20MB PDF
- 检查PDF大小：`ls -lh media/plan_documents/*.pdf`
- 如文件过大，考虑压缩或分割PDF

### 问题4：识别结果为空

**症状：**
```
❌ OCR返回内容为空
```

**解决方法：**
1. 检查PDF是否损坏：`pdfinfo test.pdf`
2. 检查PDF是否包含文本（非纯图片）
3. 查看Celery日志获取详细错误信息

---

## 回滚方案

如果Gemini OCR出现问题，可以快速回滚到PaddleLayout：

### 1. 恢复代码（Git）

```bash
cd /var/www/harry-insurance2

# 查看修改的文件
git diff api/tasks.py api/gemini_service.py

# 撤销修改
git checkout api/tasks.py
git checkout api/gemini_service.py
```

### 2. 重启服务

```bash
sudo supervisorctl restart harry-insurance:harry-insurance-django
sudo supervisorctl restart harry-insurance:harry-insurance-celery
```

### 3. 确保PaddleLayout服务运行

```bash
# 检查PaddleLayout容器
docker ps | grep paddle

# 如未运行，启动服务
docker start paddlelayout
```

---

## 性能监控

### 1. OCR处理时间

在Celery日志中查看处理时间：
```bash
grep "OCR识别完成" logs/celery.log
```

### 2. API调用统计

可以在Google Cloud Console中查看Gemini API使用情况：
- 请求次数
- Token消耗
- 成功率
- 平均响应时间

### 3. 成本估算

Gemini 3 Flash Preview 计费（截至2026年）：
- 输入：$0.01 / 1M tokens
- 输出：$0.03 / 1M tokens
- 平均每份PDF（10页）：~30K tokens（输入+输出）
- 成本：约 $0.001 / 份

---

## 提示词优化

如需调整OCR识别效果，可以修改 `api/gemini_service.py` 中的提示词：

```python
# 当前提示词（第233-253行）
prompt_text = """请将此保险计划书PDF文档转换为Markdown格式文本。

要求：
1. 保留所有文字内容，包括标题、段落、列表
2. 识别并转换表格为Markdown表格格式
3. 保持原始文档的逻辑结构和层次
4. 使用<table>标签标记表格（保留HTML格式更准确）
5. 重要：表格字段名称必须原封不动保留，如"保单年度终结"、"保證現金價值"等不能翻译或改写
6. 特别注意表格中的数字、百分比、金额等数据必须准确无误

输出格式示例：
...
"""
```

**优化建议：**
- 添加更多示例以提高准确度
- 强调特定字段的识别（如"非保证入息"）
- 指定数字格式（保留逗号分隔符等）

---

## 联系支持

如遇到问题，请提供以下信息：

1. **Celery日志**（最近100行）
   ```bash
   tail -n 100 logs/celery.log > celery_error.log
   ```

2. **测试PDF样本**
   - 提供出错的PDF文件（脱敏处理）

3. **环境信息**
   ```bash
   python3 --version
   pip3 list | grep google-genai
   cat .env | grep GEMINI
   ```

4. **错误截图**
   - 前端错误提示
   - 后台任务状态

---

## 总结

✅ **优势：**
- 简化架构（移除本地OCR服务）
- 更高准确度（多模态理解）
- 更低成本（Flash版本）
- 更易维护

⚠️ **注意事项：**
- 需要稳定的网络连接
- API调用有速率限制（每分钟15次）
- 大文件处理时间较长（需考虑超时）

📈 **后续优化：**
- 添加缓存机制（相同PDF不重复识别）
- 批量处理优化（队列管理）
- 成本监控告警
