# Gemini API Fallback机制实现文档

## 概述

本系统现已实现 **Google Gemini API 多密钥自动切换机制**，当主API密钥超额限制时，自动切换到备用密钥，确保服务的连续性和可靠性。

## 功能特性

### 1. 自动故障转移
- **主密钥优先**：默认使用主API密钥（GEMINI_API_KEY）
- **自动切换**：检测到配额/限流错误时，自动切换到备用密钥
- **智能检测**：识别以下错误类型自动触发切换：
  - `quota` - 配额超限
  - `rate limit` - 速率限制
  - `resource exhausted` - 资源耗尽
  - `429` - HTTP 429错误码
  - `too many requests` - 请求过多

### 2. 配置方式

在 `.env` 文件中配置两个API密钥：

```bash
# 主API密钥（必需）
GEMINI_API_KEY=AIzaSyA3xuSV9BzkQ19wePy9pExjFjOHmDVJpjs

# 备用API密钥（可选，当主密钥超额时使用）
GEMINI_API_KEY_FALLBACK=AIzaSyCyQwSEOg1qY9SpwTGt9Xwx4LjOA4vT0AI
```

### 3. 覆盖范围

已更新以下服务模块支持fallback机制：

#### `api/gemini_service.py`
- ✅ `analyze_poster()` - 海报分析
- ✅ `analyze_poster_with_custom_prompt()` - 自定义提示词海报分析
- ✅ `ocr_pdf_with_gemini()` - PDF OCR识别

#### `api/gemini_analysis_service.py`
- ✅ `extract_plan_data_from_text()` - 提取基本信息
- ✅ `analyze_insurance_table()` - 分析年度价值表
- ✅ `extract_table_summary()` - 提取表格概要
- ✅ `extract_plan_summary()` - 生成计划书概要
- ✅ `check_wellness_table_exists()` - 判断无忧选表格存在
- ✅ `extract_surrender_value_table()` - 提取退保价值表

## 技术实现

### 核心函数

#### `call_gemini_with_fallback()`

```python
def call_gemini_with_fallback(model, contents, operation_name="API调用"):
    """
    调用Gemini API并支持自动重试备用密钥

    Args:
        model: 模型名称 (如 'gemini-3-pro-preview')
        contents: API请求内容
        operation_name: 操作名称（用于日志）

    Returns:
        response: API响应对象

    Raises:
        Exception: 当所有API密钥都失败时抛出异常
    """
```

#### 工作流程

1. **读取配置**：从环境变量读取主密钥和备用密钥
2. **依次尝试**：按顺序尝试每个可用的API密钥
3. **错误检测**：分析错误信息，判断是否为配额/限流问题
4. **自动切换**：检测到配额问题立即切换到下一个密钥
5. **完整日志**：记录每次尝试的详细日志

### 日志示例

正常调用（主密钥成功）：
```
🔑 [PDF OCR识别] 尝试使用主密钥: AIzaSyA3xu...
✅ [PDF OCR识别] 主密钥调用成功
```

主密钥超额，切换到备用密钥：
```
🔑 [海报分析] 尝试使用主密钥: AIzaSyA3xu...
⚠️ [海报分析] 主密钥失败: Resource has been exhausted (quota)
📊 [海报分析] 检测到主密钥超额限制，尝试下一个密钥...
🔑 [海报分析] 尝试使用备用密钥: AIzaSyCyQw...
✅ [海报分析] 备用密钥调用成功
```

所有密钥失败：
```
🔑 [提取基本信息] 尝试使用主密钥: AIzaSyA3xu...
⚠️ [提取基本信息] 主密钥失败: Invalid API key
🔑 [提取基本信息] 尝试使用备用密钥: AIzaSyCyQw...
⚠️ [提取基本信息] 备用密钥失败: Invalid API key
❌ [提取基本信息] 所有API密钥均失败
```

## 使用说明

### 1. 获取API密钥

访问 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取API密钥：
- 创建两个不同的API密钥（建议使用不同的Google账号）
- 确保两个密钥都有足够的配额

### 2. 配置环境变量

编辑 `.env` 文件：
```bash
# 主密钥（必需）
GEMINI_API_KEY=你的主密钥

# 备用密钥（可选）
GEMINI_API_KEY_FALLBACK=你的备用密钥
```

### 3. 重启服务

```bash
# 重启Django后端
sudo supervisorctl restart harry-insurance:harry-insurance-django

# 重启Celery Worker
sudo supervisorctl restart harry-insurance:harry-insurance-celery
```

### 4. 监控使用情况

查看Django日志：
```bash
tail -f /var/log/supervisor/harry-insurance-django.log
```

查看Celery日志：
```bash
tail -f /var/log/supervisor/harry-insurance-celery.log
```

## 优势

1. **高可用性**：主密钥故障时自动切换，用户无感知
2. **无缝切换**：切换过程自动完成，无需手动干预
3. **配额翻倍**：两个密钥提供双倍的API配额
4. **详细日志**：记录每次切换，便于监控和调试
5. **灵活配置**：备用密钥可选，不强制配置

## 注意事项

1. **成本考虑**：使用两个密钥会增加API调用成本
2. **密钥管理**：确保密钥安全，不要上传到版本控制
3. **配额监控**：定期检查两个密钥的配额使用情况
4. **错误处理**：所有密钥失败时，系统会返回错误信息

## 未来扩展

可以进一步扩展为支持3个或更多备用密钥：

```bash
GEMINI_API_KEY=主密钥
GEMINI_API_KEY_FALLBACK=备用密钥1
GEMINI_API_KEY_FALLBACK_2=备用密钥2
GEMINI_API_KEY_FALLBACK_3=备用密钥3
```

只需在 `call_gemini_with_fallback()` 函数中添加更多密钥读取逻辑即可。

## 故障排查

### 问题1：备用密钥未生效

**检查步骤**：
1. 确认 `.env` 文件中配置了 `GEMINI_API_KEY_FALLBACK`
2. 确认Django服务已重启
3. 查看日志确认是否识别到备用密钥

### 问题2：所有密钥都失败

**可能原因**：
- 密钥无效或已过期
- 网络连接问题
- Google API服务故障

**解决方案**：
- 检查密钥有效性
- 测试网络连接
- 查看Google服务状态页面

## 相关文件

- `api/gemini_service.py` - Gemini服务核心模块（包含fallback实现）
- `api/gemini_analysis_service.py` - 保险数据分析服务
- `.env` - 环境变量配置
- `.env.example` - 配置示例文件

## 更新历史

- **2026-01-21**: 初始实现，支持双密钥自动切换
- 覆盖所有Gemini API调用点
- 添加详细日志记录

---

**实现者**: Claude Code
**版本**: 1.0.0
**最后更新**: 2026-01-21
