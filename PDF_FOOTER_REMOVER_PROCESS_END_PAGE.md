# PDF页脚擦除工具 - 处理结束页码功能

## 更新说明

为PDF页脚擦除工具增加了"处理结束页码"参数，允许用户指定只处理PDF的某个页面范围。

---

## 功能详情

### 新增参数

**处理结束页码 (process_end_page)**
- **默认值**: 0（表示处理到最后一页）
- **作用**: 指定处理到原文件的第几页
- **范围**: 0 或 1 到总页数
- **记忆**: 自动保存到 LocalStorage

### 使用场景

1. **跳过尾部页面**
   - 例如：10页PDF，最后2页是附录不需要处理
   - 设置：`process_start_page=1`, `process_end_page=8`
   - 结果：只处理前8页，第9-10页保持原样

2. **只处理中间部分**
   - 例如：20页PDF，前3页是封面，后5页是附录
   - 设置：`process_start_page=4`, `process_end_page=15`
   - 结果：只处理第4-15页

3. **精确控制范围**
   - 可以精确指定任意页面范围进行处理
   - 未处理的页面保持原样（不擦除页脚）

---

## 参数组合示例

### 示例1：处理部分页面，全部保存
```
文件: 10页PDF
process_start_page: 3  (从第3页开始处理)
process_end_page: 8    (处理到第8页)
page_number_start: 3   (第3页显示"第1页")
save_start_page: 1     (保存从第1页开始)
save_end_page: 0       (保存到最后一页)

结果:
- 第1-2页: 原样保留（无页码）
- 第3-8页: 擦除页脚，添加页码"第1-6页"
- 第9-10页: 原样保留（无页码）
- 输出文件: 10页完整PDF
```

### 示例2：处理并裁剪
```
文件: 20页PDF
process_start_page: 5  (从第5页开始处理)
process_end_page: 15   (处理到第15页)
page_number_start: 5   (第5页显示"第1页")
save_start_page: 5     (只保存第5页开始)
save_end_page: 15      (保存到第15页)

结果:
- 第1-4页: 丢弃
- 第5-15页: 擦除页脚，添加页码"第1-11页"
- 第16-20页: 丢弃
- 输出文件: 11页PDF（只保留处理过的页面）
```

### 示例3：全部处理（默认行为）
```
文件: 15页PDF
process_start_page: 1  (从第1页开始)
process_end_page: 0    (到最后一页)
page_number_start: 1   (第1页显示"第1页")
save_start_page: 1     (保存全部)
save_end_page: 0       (到最后一页)

结果:
- 第1-15页: 全部擦除页脚，添加页码"第1-15页"
- 输出文件: 15页完整PDF
```

---

## 技术实现

### 前端修改

**文件**: `frontend/src/components/PDFFooterRemover.jsx`

1. **新增状态变量**
```javascript
const [processEndPage, setProcessEndPage] = useState(() => {
  const saved = localStorage.getItem('pdf_process_end_page');
  return saved ? parseInt(saved) : 0;
});
```

2. **LocalStorage持久化**
```javascript
useEffect(() => {
  localStorage.setItem('pdf_process_end_page', processEndPage.toString());
}, [processEndPage]);
```

3. **表单数据提交**
```javascript
formData.append('process_end_page', processEndPage);
```

4. **UI界面**
- 在"处理开始页码"旁边添加"处理结束页码"输入框
- 支持0表示最后一页
- 自动验证：结束页不能小于开始页

### 后端修改

**文件**: `api/pdf_views.py`

1. **接收参数**
```python
try:
    process_end_page = int(request.POST.get('process_end_page', 0))
    if process_end_page < 0:
        process_end_page = 0
except (ValueError, TypeError):
    process_end_page = 0
```

2. **参数验证**
```python
# 如果为0或超过总页数，设置为总页数
if process_end_page == 0 or process_end_page > total_pages:
    process_end_page = total_pages

# 验证范围
if process_start_page > process_end_page:
    return Response({'message': '开始页不能大于结束页'}, status=400)
```

3. **处理循环**
```python
# 只处理指定范围
for page_num in range(process_start_page - 1, process_end_page):
    # 擦除页脚并添加页码
```

4. **页码计算调整**
```python
# 总页数 = 处理范围的页数
display_total_pages = process_end_page - page_number_start + 1
```

---

## UI界面设计

### 页码设置区域布局

```
┌─────────────────────────────────────────────────┐
│              页码设置 [自动记忆]                  │
├───────────────────────┬─────────────────────────┤
│ 处理开始页码           │ 处理结束页码             │
│ 从第 [3] 页开始处理    │ 处理到第 [8] 页          │
│ 例如：3 = 跳过前2页    │ (0=最后一页)            │
├───────────────────────┴─────────────────────────┤
│ 起始页码编号                                      │
│ 从原文件第 [3] 页开始添加"第1页"                  │
│ 例如：3 = 原文件第3页显示"第1页"                  │
└─────────────────────────────────────────────────┘
```

### 输入验证

- **处理开始页码**: 1 到总页数
- **处理结束页码**: 0 或 1 到总页数
- **自动调整**: 如果结束页 < 开始页（且不为0），自动设为开始页
- **联动调整**: 修改开始页时，如果超过结束页，自动调整结束页

---

## 使用说明更新

### 步骤3更新为

**设置页码参数：**
- **处理开始页码**：从第几页开始擦除页脚
- **处理结束页码**：处理到第几页（0=最后一页）⭐ 新增
- **起始页码编号**：从第几页开始添加"第1页"

---

## 实际应用案例

### 案例1: 保险计划书处理
- **原文件**: 12页
  - 第1页: 封面（保留原样）
  - 第2页: 目录（保留原样）
  - 第3-11页: 正文（需要处理）
  - 第12页: 联系方式（保留原样）

- **设置**:
  ```
  process_start_page: 3
  process_end_page: 11
  page_number_start: 3
  save_start_page: 1
  save_end_page: 0
  ```

- **结果**: 12页完整PDF，只有第3-11页有新页码

### 案例2: 提取核心内容
- **原文件**: 20页宣传册
  - 第1-3页: 封面和介绍
  - 第4-16页: 产品信息（需要）
  - 第17-20页: 广告和联系方式

- **设置**:
  ```
  process_start_page: 4
  process_end_page: 16
  page_number_start: 4
  save_start_page: 4
  save_end_page: 16
  ```

- **结果**: 13页PDF（第4-16页），显示"第1-13页"

---

## 参数优先级

1. **process_start_page / process_end_page**: 决定哪些页面会被处理（擦除页脚）
2. **page_number_start**: 决定从哪一页开始显示"第1页"
3. **save_start_page / save_end_page**: 决定最终输出文件包含哪些页面

**处理顺序**:
1. 按 process_start/end 范围擦除页脚
2. 按 page_number_start 添加页码
3. 按 save_start/end 裁剪输出

---

## 注意事项

1. **页码连续性**: 如果 `page_number_start` 在处理范围外，可能导致页码不连续
   - 例如：`process_start=1, process_end=5, page_number_start=3`
   - 结果：第1-2页无页码，第3-5页显示"第1-3页"

2. **保存范围**: `save_start/end` 是最终裁剪，会丢弃范围外的所有页面

3. **默认行为**: 所有 `*_end_page` 参数为0时，表示"到最后一页"

4. **参数记忆**: 所有参数都会保存到浏览器 LocalStorage，下次自动恢复

---

## API文档更新

### POST /api/pdf/remove-footer

**新增参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `process_end_page` | integer | 否 | 0 | 处理到第几页（0=最后一页） |

**请求示例**:
```javascript
const formData = new FormData();
formData.append('pdf_file', file);
formData.append('process_start_page', 3);
formData.append('process_end_page', 10);  // 新增
formData.append('page_number_start', 3);
formData.append('remove_areas', JSON.stringify(removeAreas));
```

**错误响应**:
```json
{
  "status": "error",
  "message": "处理开始页码(5)不能大于结束页码(3)"
}
```

---

## 测试建议

### 测试用例

1. **基础功能**: `process_end_page=0` (默认行为)
2. **部分处理**: `process_start=3, process_end=8`
3. **单页处理**: `process_start=5, process_end=5`
4. **边界测试**: `process_end=总页数`
5. **错误测试**: `process_start > process_end`
6. **记忆测试**: 刷新页面后参数是否保留

---

## 部署

### 更新步骤

1. ✅ 前端代码已更新（`PDFFooterRemover.jsx`）
2. ✅ 后端代码已更新（`pdf_views.py`）
3. ✅ Django服务已重启
4. ⚠️ 前端需要重新构建（如果是生产环境）

### 生产部署命令

```bash
# 前端构建（如果需要）
cd frontend
npm run build

# 重启服务
sudo supervisorctl restart harry-insurance:harry-insurance-django
```

---

## 总结

此次更新增强了PDF页脚擦除工具的灵活性，用户现在可以：

✅ 精确控制处理范围（开始页和结束页）
✅ 保留不需要处理的页面原样
✅ 更适合处理复杂结构的PDF文档
✅ 所有参数自动记忆，提升用户体验

**适用场景**：
- 保险计划书（跳过封面和附录）
- 宣传册（只处理核心内容）
- 合同文档（保留签名页原样）
- 报告文档（跳过索引和参考文献）
