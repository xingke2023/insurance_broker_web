# 重新OCR识别功能使用指南

## ✅ 新增功能

在保险产品列表页面（`/admin/api/insuranceproduct/`），新增了一个批量操作按钮：

**🔄 重新OCR识别计划书详情**

## 🎯 功能说明

这个功能允许您重新OCR识别已上传的PDF计划书，更新 `plan_details` 字段，而不需要重新上传PDF文件。

## 📋 使用步骤

### 步骤1：访问产品列表页面

```
http://your-domain:8017/admin/api/insuranceproduct/
```

### 步骤2：选择要重新OCR的产品

在产品列表中，勾选一个或多个产品的复选框：

```
☑ 环宇盈活储蓄寿险计划
☑ 宏挚传承
☐ 万年青星河尊享计划II
```

### 步骤3：选择动作

在页面顶部的「动作」下拉菜单中，选择：

```
动作: [🔄 重新OCR识别计划书详情]  [执行]
```

### 步骤4：确认执行

点击「执行」按钮后，系统会自动处理选中的产品。

## 🔄 处理流程

```
选中的产品
    ↓
检查是否有 plan_pdf_base64 字段
    ↓
有PDF → 解码Base64
    ↓
保存到临时文件
    ↓
调用 Gemini OCR API
    ↓
识别成功 → 更新 plan_details
    ↓
显示结果统计
```

## ✅ 结果消息

### 成功消息
```
✅ 成功重新OCR识别 2 个产品
```

### 警告消息
```
⚠️ 1 个产品OCR识别失败
```

### 信息消息
```
ℹ️ 3 个产品没有PDF文件，已跳过
```

## 📊 适用场景

### 场景1：OCR识别质量不佳

```
问题：首次上传时OCR识别错误较多
解决：
1. 在plan_details字段手动修正错误
2. 如果需要重新识别，使用此按钮
```

### 场景2：Gemini API升级

```
问题：Gemini API更新后识别效果更好
解决：批量选择所有产品，重新OCR识别
```

### 场景3：已有PDF，没有OCR结果

```
问题：产品有plan_pdf_base64但plan_details为空
解决：使用此功能补充OCR识别结果
```

### 场景4：只想更新部分产品

```
问题：某些产品的计划书内容需要更新
解决：
1. 选择需要更新的产品
2. 批量重新OCR识别
3. 其他产品保持不变
```

## ⚠️ 注意事项

### 1. 会覆盖现有内容

重新OCR会**覆盖** `plan_details` 字段的现有内容！

- ✅ 如果内容是OCR自动生成的，可以放心覆盖
- ❌ 如果内容是人工编辑的，覆盖后将**丢失**

### 2. 需要有PDF Base64

只有已上传PDF（`plan_pdf_base64` 不为空）的产品才能重新OCR。

### 3. 处理时间

- 单个产品：约5-15秒
- 多个产品：按顺序处理，可能需要较长时间
- 请勿在处理过程中关闭页面

### 4. API配额

每次OCR调用都会消耗Gemini API配额，请合理使用。

## 🔍 技术细节

### 数据流

```python
# 1. 获取PDF Base64
pdf_base64 = product.plan_pdf_base64

# 2. 解码为字节
pdf_bytes = base64.b64decode(pdf_base64)

# 3. 保存到临时文件
with tempfile.NamedTemporaryFile(suffix='.pdf') as temp:
    temp.write(pdf_bytes)
    temp_path = temp.name

# 4. OCR识别
result = ocr_pdf_with_gemini(temp_path)

# 5. 更新数据库
if result['success']:
    product.plan_details = result['content']
    product.save(update_fields=['plan_details'])
```

### 涉及字段

| 字段 | 读取 | 更新 |
|------|------|------|
| `plan_pdf_base64` | ✅ 读取 | ❌ 不更新 |
| `plan_details` | ❌ 不读取 | ✅ 覆盖更新 |

## 📍 代码位置

- **Admin配置**: `/var/www/harry-insurance2/api/admin.py:1098`
  - `actions = ['reocr_plan_details']`

- **Action方法**: `/var/www/harry-insurance2/api/admin.py:1242`
  - `def reocr_plan_details(self, request, queryset)`

- **OCR服务**: `/var/www/harry-insurance2/api/gemini_service.py:301`
  - `def ocr_pdf_with_gemini(pdf_path)`

## 💡 最佳实践

### 建议工作流程

1. **首次上传PDF**
   - 在产品编辑页面上传PDF
   - 系统自动OCR并保存

2. **检查OCR质量**
   - 查看 `plan_details` 字段
   - 检查是否有识别错误

3. **决定是否重新OCR**
   - 如果质量差：使用「重新OCR识别」按钮
   - 如果质量好：保持不变

4. **人工修正（可选）**
   - 手动编辑 `plan_details` 修正小错误
   - 注意：之后不要再重新OCR，否则会丢失修改

### 批量处理建议

```
场景：100个产品需要重新OCR

推荐做法：
1. 分批处理，每次10-20个产品
2. 处理完一批后等待几分钟
3. 避免在高峰期批量处理
4. 注意监控API配额使用情况
```

## 🆚 对比：两种方式

| 方式 | 适用场景 | 是否需要PDF文件 | 更新内容 |
|------|---------|---------------|---------|
| **上传PDF** | 新产品或PDF有变化 | ✅ 需要 | Base64 + OCR |
| **重新OCR** | 已有PDF，只想更新识别 | ❌ 不需要 | 仅OCR |

## ✅ 功能优势

1. **无需重新上传**：直接使用已保存的PDF
2. **批量操作**：一次处理多个产品
3. **灵活控制**：只更新选中的产品
4. **快速修正**：OCR质量不佳时快速重试

## 🎉 总结

「重新OCR识别」功能让您可以：
- ✅ 灵活管理计划书内容
- ✅ 无需重新上传PDF文件
- ✅ 批量更新多个产品
- ✅ 快速修正OCR识别问题

现在访问产品列表页面，试试这个新功能吧！

`http://your-domain:8017/admin/api/insuranceproduct/`
