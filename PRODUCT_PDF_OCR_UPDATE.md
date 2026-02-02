# 产品计划书PDF OCR识别功能更新

## 📝 功能概述

在Admin后台上传产品计划书PDF时，系统会自动使用Gemini 3 Flash Preview进行OCR识别。

## 🎯 使用场景

**仅限后台Admin使用**

在产品编辑页面（`/admin/api/insuranceproduct/{id}/change/`）上传PDF：
- ✅ 用于录入产品计划书内容
- ✅ 自动提取文字和数据到数据库
- ✅ 保存Base64编码供前端下载

## 🔄 处理流程

```
用户在Admin后台上传PDF
    ↓
1. 读取PDF文件内容
    ↓
2. 转换为Base64编码
   → 保存到 plan_pdf_base64 字段
    ↓
3. 使用Gemini OCR识别
   → 提取文字和表格
   → 保存到 plan_details 字段
    ↓
4. 保存产品记录
   → 显示成功消息
```

## 🤖 OCR API配置

### 使用的模型
```python
model = "gemini-3-flash-preview"
```

### API配置参数
```python
config = types.GenerateContentConfig(
    temperature=0.3,
    thinking_config=types.ThinkingConfig(
        thinking_level="MINIMAL",
    ),
    media_resolution="MEDIA_RESOLUTION_LOW",
)
```

### 提示词
```
不返回页眉和页脚，不返回乐观悲观不同投资回报表格数据，不返回保险顾问姓名
返回所有识别的内容，一字不差返回原本内容，去掉空行
```

### 多轮对话格式
```python
contents = [
    types.Content(role="user", parts=[types.Part.from_text(text=system_prompt)]),
    types.Content(role="model", parts=[]),  # 空回复
    types.Content(role="user", parts=[types.Part.from_bytes(data=pdf_bytes, mime_type='application/pdf')]),
]
```

## 📊 涉及字段

| 字段名 | 数据来源 | 用途 |
|--------|---------|------|
| `plan_pdf_base64` | PDF文件Base64编码 | 前端下载/预览PDF |
| `plan_details` | Gemini OCR识别结果 | 文本搜索、AI分析 |

## ✅ 识别特性

### 会识别的内容
- ✅ 所有文字内容（一字不差）
- ✅ 表格数据
- ✅ 产品条款
- ✅ 保障范围
- ✅ 理赔流程

### 会过滤的内容
- ❌ 页眉和页脚
- ❌ 乐观/悲观投资回报表格
- ❌ 保险顾问姓名
- ❌ 空行

## 🔧 代码位置

- **OCR函数**: `/var/www/harry-insurance2/api/gemini_service.py:301`
  - 函数名: `ocr_pdf_with_gemini(pdf_path)`

- **Admin保存逻辑**: `/var/www/harry-insurance2/api/admin.py:1160`
  - 类: `InsuranceProductAdmin`
  - 方法: `save_model()`

## 📖 使用示例

### Admin后台操作

1. 访问产品编辑页面
   ```
   /admin/api/insuranceproduct/17/change/
   ```

2. 在「计划书内容」区域找到「上传计划书PDF」字段

3. 选择PDF文件并上传

4. 系统自动处理：
   - ✅ PDF已转换为Base64编码（X字符）
   - ✅ 正在使用AI解析PDF: filename.pdf，请稍候...
   - ✅ PDF OCR解析成功！已将内容保存到"计划书详情"字段（X字符）

5. 保存产品记录

### 前端使用（未来）

```javascript
// 获取产品数据
const product = await api.getProduct(17);

// 下载PDF
if (product.plan_pdf_base64) {
    const blob = base64ToBlob(product.plan_pdf_base64, 'application/pdf');
    downloadBlob(blob, `${product.product_name}.pdf`);
}

// 显示计划书详情
if (product.plan_details) {
    document.getElementById('plan-content').innerHTML = product.plan_details;
}
```

## ⚠️ 注意事项

1. **API密钥**: 需要配置 `GEMINI_API_KEY` 环境变量
2. **文件大小**: PDF文件建议不超过20MB
3. **处理时间**: 根据PDF大小，处理时间从几秒到几十秒不等
4. **错误处理**: 如果OCR失败，Base64编码仍会保存
5. **媒体分辨率**: 使用 `MEDIA_RESOLUTION_LOW` 以提升识别速度

## 🔗 相关文档

- Gemini API文档: https://ai.google.dev/gemini-api/docs
- 参考代码: `/var/www/harry-insurance2/api/gemini_service.py`
- Admin配置: `/var/www/harry-insurance2/api/admin.py`

## 📅 更新记录

- **2026-01-27**: 更新OCR API格式，采用多轮对话模式
- **2026-01-27**: 添加Base64编码自动保存功能
- **2026-01-27**: 优化提示词，过滤页眉页脚和投资回报表格
