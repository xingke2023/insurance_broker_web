# 产品PDF处理按钮使用指南

## ✅ 新增功能

在产品编辑页面底部，现在有两个PDF处理按钮：

1. **保存（默认）** - 完整处理PDF
2. **🔍 仅识别并保存** - 只OCR识别，不更新Base64

## 📍 使用位置

访问产品编辑页面：
```
/admin/api/insuranceproduct/{id}/change/
```

在页面底部的保存按钮区域，您会看到：

```
┌──────────────────────────────────────────────────────────┐
│  [保存]  [保存并继续编辑]  [保存并新增]  [🔍 仅识别并保存]  │
└──────────────────────────────────────────────────────────┘
```

## 🎯 两个按钮的区别

### 按钮1: 保存（默认，蓝色）

**功能**：完整处理PDF文件

**处理流程**：
```
选择PDF文件
  ↓
点击"保存"
  ↓
1. PDF → Base64编码 → plan_pdf_base64 ✅
2. PDF → OCR识别 → plan_details ✅
  ↓
两个字段都更新
```

**适用场景**：
- ✅ 首次上传产品PDF
- ✅ PDF文件内容有更新
- ✅ 需要前端能下载最新的PDF
- ✅ 需要更新所有内容

**结果消息**：
```
✅ PDF已转换为Base64编码（XXX字符）
✅ PDF处理完成！Base64编码和计划书详情已更新（XXX字符）
```

### 按钮2: 🔍 仅识别并保存（橙色）

**功能**：只OCR识别并更新计划书详情

**处理流程**：
```
选择PDF文件
  ↓
点击"🔍 仅识别并保存"
  ↓
1. PDF → Base64编码 → plan_pdf_base64 ⏭️ 不更新
2. PDF → OCR识别 → plan_details ✅ 更新
  ↓
只更新计划书详情
```

**适用场景**：
- ✅ PDF文件未变化，只想重新OCR
- ✅ 测试不同版本的OCR识别
- ✅ 修正OCR识别错误
- ✅ Base64已有，不想重复保存

**结果消息**：
```
✅ OCR识别成功！已更新"计划书详情"字段（XXX字符），Base64未更新
```

## 📊 功能对比表

| 操作 | 保存（默认） | 🔍 仅识别并保存 |
|------|------------|---------------|
| **选择PDF** | 需要 | 需要 |
| **更新 Base64** | ✅ 是 | ❌ 否 |
| **OCR识别** | ✅ 是 | ✅ 是 |
| **更新详情** | ✅ 是 | ✅ 是 |
| **处理速度** | 较慢（Base64转换） | 较快 |
| **适合新增** | ✅ 是 | ❌ 否 |
| **适合测试** | ❌ 否 | ✅ 是 |

## 🔄 典型使用场景

### 场景1：新产品录入（使用"保存"）

```
步骤：
1. 创建新产品记录
2. 填写基本信息
3. 上传计划书PDF
4. 点击"保存"按钮

结果：
- plan_pdf_base64: ✅ 已保存
- plan_details: ✅ OCR识别结果
```

### 场景2：OCR识别效果不佳（使用"仅识别并保存"）

```
问题：首次上传时OCR识别有错误

解决步骤：
1. 编辑产品记录
2. 重新选择同一个PDF文件
3. 点击"🔍 仅识别并保存"
4. 重新识别，不更新Base64

结果：
- plan_pdf_base64: ⏭️ 保持不变
- plan_details: ✅ 重新识别
```

### 场景3：测试不同OCR参数（使用"仅识别并保存"）

```
目的：测试OCR识别质量

步骤：
1. 选择PDF文件
2. 点击"🔍 仅识别并保存"
3. 查看识别结果
4. 如果不满意，再次点击
5. Base64只保存一次，节省空间

结果：
- plan_pdf_base64: ⏭️ 不重复保存
- plan_details: ✅ 可以多次尝试
```

### 场景4：更新PDF版本（使用"保存"）

```
场景：保险公司发布新版PDF

步骤：
1. 编辑产品记录
2. 上传新版PDF
3. 点击"保存"
4. 更新所有内容

结果：
- plan_pdf_base64: ✅ 新版本Base64
- plan_details: ✅ 重新OCR识别
```

## ⚠️ 注意事项

### 1. 必须选择文件

无论点击哪个按钮，都必须先选择PDF文件：

```
❌ 错误：没选择文件就点击按钮 → 没有任何效果
✅ 正确：选择文件 → 点击按钮 → 开始处理
```

### 2. OCR会覆盖内容

两个按钮都会**覆盖** `plan_details` 字段！

- 如果已手动编辑过内容，使用前请备份
- 如果只想保留手动内容，不要选择PDF文件

### 3. 处理时间

- **保存**：约10-20秒（Base64转换 + OCR）
- **仅识别并保存**：约5-15秒（仅OCR）

### 4. Base64字段大小

plan_pdf_base64字段会存储完整的PDF文件（Base64编码），一个20MB的PDF会变成约27MB的Base64字符串。

## 🧪 测试建议

### 推荐测试流程

```
1. 首次上传
   → 选择PDF
   → 点击"保存"
   → 检查两个字段都有内容

2. 测试仅OCR
   → 选择相同PDF
   → 点击"🔍 仅识别并保存"
   → 检查plan_details更新，Base64不变

3. 对比结果
   → 查看识别质量
   → 决定是否需要人工修正
```

## 💡 最佳实践

### 何时使用"保存"

- ✅ 新产品首次上传
- ✅ PDF内容有实质性变化
- ✅ 需要前端能下载最新PDF
- ✅ 完整更新所有内容

### 何时使用"仅识别并保存"

- ✅ OCR识别质量不佳，想重试
- ✅ PDF文件未变化，只想更新识别结果
- ✅ 测试不同的识别效果
- ✅ 节省数据库空间（不重复保存Base64）

## 🔧 技术实现

### 表单字段

```html
<!-- 隐藏字段，用于标记是否只OCR -->
<input type="hidden" name="ocr_only" id="id_ocr_only" value="false">
```

### 按钮逻辑

```javascript
// 点击"仅识别并保存"时
onclick="document.getElementById('id_ocr_only').value='true';"

// 点击其他保存按钮时
document.getElementById('id_ocr_only').value='false';
```

### 后端处理

```python
def save_model(self, request, obj, form, change):
    ocr_only = form.cleaned_data.get('ocr_only', False)

    if ocr_only:
        # 只OCR，不更新Base64
        result = ocr_pdf_with_gemini(temp_path)
        obj.plan_details = result['content']
    else:
        # 完整处理
        obj.plan_pdf_base64 = base64_encode(pdf)
        result = ocr_pdf_with_gemini(temp_path)
        obj.plan_details = result['content']
```

## 📂 相关文件

- **模板**: `/var/www/harry-insurance2/api/templates/admin/api/insuranceproduct/change_form.html`
- **表单**: `/var/www/harry-insurance2/api/admin.py:912`
- **保存逻辑**: `/var/www/harry-insurance2/api/admin.py:1164`
- **OCR服务**: `/var/www/harry-insurance2/api/gemini_service.py:301`

## ✅ 总结

现在您有两个灵活的选项来处理PDF：

1. **保存** - 完整更新（Base64 + OCR），适合新增和更新
2. **🔍 仅识别并保存** - 只更新OCR，适合测试和修正

根据实际需求选择合适的按钮，提高工作效率！

访问产品编辑页面试试：`/admin/api/insuranceproduct/17/change/`
