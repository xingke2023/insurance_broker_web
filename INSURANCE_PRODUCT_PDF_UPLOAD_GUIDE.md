# 保险产品计划书PDF上传功能指南

## 功能概述

在 InsuranceProduct（保险公司产品）的后台管理页面，新增了 **PDF计划书自动解析** 功能。

通过上传产品计划书PDF文件，系统会自动使用 **Google Gemini 3 Flash Preview AI** 进行OCR识别，并将识别结果保存到 `plan_details`（计划书详情）字段。

---

## 功能位置

- **后台管理地址**: `/admin/api/insuranceproduct/`
- **编辑产品页面**: `/admin/api/insuranceproduct/<产品ID>/change/`
- **字段位置**: "计划书内容" 区域 → "📄 上传计划书PDF（AI自动解析）"

---

## 使用步骤

### 1. 进入产品编辑页面

访问后台管理 → 保险公司产品 → 选择要编辑的产品（或添加新产品）

### 2. 找到 "计划书内容" 区域

展开 "计划书内容" 折叠区域（默认折叠），您会看到以下字段：

- **📄 上传计划书PDF（AI自动解析）** - PDF上传字段（新增）
- **计划书产品概要** (plan_summary) - 产品简介
- **计划书详情** (plan_details) - 完整详情（AI解析结果将保存在这里）

### 3. 上传PDF文件

1. 点击 "选择文件" 按钮
2. 选择产品计划书PDF（支持最大20MB）
3. 点击页面底部的 "保存" 或 "保存并继续编辑" 按钮

### 4. 查看解析结果

- **成功提示**: 如果解析成功，页面顶部会显示绿色提示框：
  ```
  ✅ PDF解析成功！已将内容保存到"计划书详情"字段（XXX字符）
  ```

- **查看内容**: 向下滚动到 "计划书详情" 字段，您可以看到AI识别的完整内容（Markdown格式，包含HTML表格）

- **失败提示**: 如果解析失败，会显示红色错误提示，您可以尝试重新上传或联系技术支持

---

## 技术细节

### AI模型
- **模型**: Google Gemini 3 Flash Preview
- **功能**: OCR识别PDF文档
- **输出格式**: Markdown格式文本 + HTML表格

### 文件限制
- **格式**: 仅支持 `.pdf` 文件
- **大小**: 最大 20MB
- **内容**: 保险产品计划书PDF

### 解析内容
识别结果通常包含：
- 产品名称和基本信息
- 保费缴纳情况
- 保障范围和期限
- 退保价值表（HTML表格格式）
- 条款和细则等

### 数据保存
- 解析结果保存到 `InsuranceProduct.plan_details` 字段（TextField）
- **⚠️ 注意**: 上传新PDF会**覆盖**原有的 `plan_details` 内容
- 建议：如果已有重要内容，请先备份再上传

---

## 使用场景

### 场景1：新增产品
1. 创建新的保险产品记录
2. 填写基本信息（公司、产品名称、保费等）
3. 上传产品计划书PDF，让AI自动填充详情
4. 保存产品

### 场景2：更新已有产品
1. 打开已有产品的编辑页面
2. 如果有新版本的计划书PDF，可以重新上传
3. AI会重新解析并覆盖原有内容
4. 您可以在 "计划书详情" 字段中手动编辑AI识别的结果

### 场景3：批量录入产品
1. 准备多个产品的计划书PDF
2. 逐个创建产品记录
3. 对每个产品上传对应的PDF
4. AI自动识别，节省手动录入时间

---

## 常见问题

### Q1: PDF解析需要多长时间？
A: 通常在 **10-30秒**，取决于PDF文件大小和页数。解析过程中会显示"正在使用AI解析PDF..."提示。

### Q2: 识别结果不准确怎么办？
A: AI识别结果保存在 `plan_details` 字段后，您可以手动编辑和修正识别错误的内容。

### Q3: 上传PDF会影响原有数据吗？
A: 上传PDF只会覆盖 `plan_details` 字段，**不会影响**产品的其他字段（如产品名称、保费、退保价值表等）。

### Q4: 可以上传非计划书的PDF吗？
A: 功能设计用于保险产品计划书，上传其他类型PDF也会被识别，但内容可能不够规范。

### Q5: 解析失败如何处理？
A: 检查以下事项：
- PDF文件是否损坏或加密
- 文件大小是否超过20MB
- Gemini API密钥是否正确配置（环境变量 `GEMINI_API_KEY`）
- 查看Django日志获取详细错误信息

---

## API配置

### 环境变量
确保在 `.env` 文件中配置了 Gemini API 密钥：

```bash
# Google Gemini API密钥（用于PDF解析）
GEMINI_API_KEY=AIzaSyC6_Lp7D2RLFTDtWoKz6-eSerX6oNDdjdM
GEMINI_API_KEY_FALLBACK=<备用密钥>
GEMINI_API_KEY_3=<第三个密钥>
```

### 轮询机制
系统支持多个API密钥轮询使用，当主密钥超出配额时自动切换到备用密钥。

---

## 开发说明

### 代码位置
- **Admin配置**: `api/admin.py` (InsuranceProductAdmin, InsuranceProductForm)
- **Gemini服务**: `api/gemini_service.py` (ocr_pdf_with_gemini函数)
- **模型定义**: `api/models.py` (InsuranceProduct.plan_details字段)

### 核心函数

#### `ocr_pdf_with_gemini(pdf_path)`
使用 Gemini 3 Flash Preview 对PDF进行OCR识别

**参数**:
- `pdf_path`: PDF文件的绝对路径

**返回**:
```python
{
    "success": True/False,
    "content": "识别的Markdown格式文本",
    "error": "错误信息（如果失败）"
}
```

### 自定义表单

`InsuranceProductForm` 扩展了原有的模型表单，添加了 `plan_pdf` 文件上传字段：

```python
plan_pdf = forms.FileField(
    required=False,
    label='📄 上传计划书PDF（AI自动解析）',
    help_text='...',
    widget=forms.FileInput(attrs={
        'accept': 'application/pdf',
        ...
    })
)
```

### 保存逻辑

在 `InsuranceProductAdmin.save_model()` 方法中：

1. 检查是否上传了PDF文件
2. 将PDF保存到临时文件
3. 调用 `ocr_pdf_with_gemini()` 解析
4. 将解析结果保存到 `obj.plan_details`
5. 清理临时文件
6. 显示成功/失败提示

---

## 测试

运行测试脚本验证功能：

```bash
cd /var/www/harry-insurance2
python3 test_insurance_product_pdf_upload.py
```

测试脚本会：
1. 查找测试PDF文件
2. 调用 `ocr_pdf_with_gemini()` 解析
3. 显示识别结果预览

---

## 后续优化建议

1. **进度显示**: 添加Ajax实时进度条，避免长时间等待无反馈
2. **历史版本**: 保存PDF上传历史，支持回滚到旧版本
3. **字段映射**: 自动从识别结果中提取产品名称、保费等字段，自动填充到对应字段
4. **批量上传**: 支持一次性上传多个PDF，批量创建产品记录
5. **预览功能**: 上传后先预览识别结果，确认后再保存

---

## 联系方式

如有问题或建议，请联系技术支持团队。

---

**更新日期**: 2026-01-26
**功能版本**: v1.0
