# 文档详情页 - 下载单页PDF功能

## 功能概述

在文档详情页（`/document/253` 等），"下载单页PDF"按钮可以下载去除页眉和页脚的干净PDF文件。

## 技术实现

### 后端 API

**接口路径**：`POST /api/pdf/download-clean-document`

**功能**：
- 从数据库获取文档的原始PDF文件
- 使用 PyMuPDF（fitz）去除页眉和页脚
- 返回处理后的PDF文件供下载

**去除规则**：
- **页眉高度**：80px（去除顶部logo、标题等）
- **页脚高度**：60px（去除底部公司信息、页码等）
- **处理方式**：使用白色矩形覆盖指定区域

**实现代码**：`api/pdf_views.py:918-1016`

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def download_document_clean_pdf(request):
    """
    下载去除页眉页脚的文档PDF

    参数:
    - document_id: 文档ID

    返回:
    - 去除页眉页脚后的PDF文件
    """
    # 1. 获取文档ID
    document_id = request.data.get('document_id')

    # 2. 查询数据库获取文档
    document = PlanDocument.objects.get(id=document_id)

    # 3. 读取原始PDF文件
    pdf_path = document.file_path.path
    with open(pdf_path, 'rb') as f:
        pdf_bytes = f.read()

    # 4. 使用 PyMuPDF 处理每一页
    pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")

    for page in pdf_document:
        # 去除页眉（顶部80px）
        header_rect = fitz.Rect(0, 0, page_width, 80)
        page.draw_rect(header_rect, color=(1, 1, 1), fill=(1, 1, 1))

        # 去除页脚（底部60px）
        footer_rect = fitz.Rect(0, page_height - 60, page_width, page_height)
        page.draw_rect(footer_rect, color=(1, 1, 1), fill=(1, 1, 1))

    # 5. 保存到内存并返回
    output_buffer = io.BytesIO()
    pdf_document.save(output_buffer, garbage=4, deflate=True, clean=True)

    # 6. 返回文件下载响应
    response = HttpResponse(output_buffer.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
```

### 前端实现

**组件**：`frontend/src/components/DocumentDetail.jsx`

**按钮位置**：
1. 顶部工具栏（小屏）：紫色渐变按钮，带相机图标
2. 顶部工具栏（大屏）：显示"下载单页PDF"文字

**处理流程**：

```javascript
const handleDownloadPageScreenshot = async () => {
  // 1. 调用后端API
  const response = await authFetch('/api/pdf/download-clean-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document_id: document.id
    })
  });

  // 2. 检查响应类型
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    // 错误响应
    const errorData = await response.json();
    throw new Error(errorData.message);
  }

  // 3. 下载PDF文件
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  // 4. 清理
  window.URL.revokeObjectURL(url);
};
```

## 使用场景

1. **客户分享**：去除代理商信息后分享给客户
2. **内部存档**：保存干净的计划书版本
3. **打印输出**：去除页眉页脚后打印更美观
4. **二次编辑**：导入其他工具时减少干扰元素

## 与其他功能的对比

| 功能 | 按钮颜色 | 输出格式 | 说明 |
|------|---------|---------|------|
| 下载原PDF | 绿色 | PDF | 完整的原始PDF文件 |
| 下载现金价值表 | 绿色 | Excel | 仅退保价值表数据 |
| **下载单页PDF** | **紫色** | **PDF** | **去除页眉页脚的PDF** |
| 智能对话 | 蓝色 | - | 与文档AI对话 |

## 配置调整

如果需要调整去除的区域大小，修改以下参数：

**文件**：`api/pdf_views.py`

```python
# 默认配置（第965-967行）
header_height = 80  # 页眉高度（像素）
footer_height = 60  # 页脚高度（像素）
```

**建议值**：
- 页眉：50-100px（根据实际logo高度调整）
- 页脚：40-80px（根据实际公司信息高度调整）

## 注意事项

1. **文件大小**：处理后的文件大小可能略有增加（压缩设置已优化）
2. **文件命名**：自动添加"_单页版"后缀
3. **权限要求**：需要用户登录认证（`IsAuthenticated`）
4. **错误处理**：
   - 文档不存在 → 404错误
   - 文件路径无效 → 400错误
   - 处理失败 → 500错误

## 相关文件

### 后端
- `api/pdf_views.py:918-1016` - API实现
- `api/urls.py:202` - URL路由配置
- `api/models.py` - PlanDocument模型

### 前端
- `frontend/src/components/DocumentDetail.jsx:448-507` - 下载函数
- `frontend/src/components/DocumentDetail.jsx:896-901` - 小屏按钮
- `frontend/src/components/DocumentDetail.jsx:947-953` - 大屏按钮

## 更新日志

### 2026年2月5日
- ✅ 创建 `download_document_clean_pdf` API端点
- ✅ 修改前端按钮功能，从下载截图改为下载PDF
- ✅ 更新按钮文字和提示信息
- ✅ 添加完整的错误处理机制

### 原始功能（已替换）
- ❌ 使用 `html2canvas` 截图生成PNG图片
- ❌ 下载页面DOM渲染的截图

### 新功能优势
- ✅ 保留PDF格式，保持矢量图形质量
- ✅ 去除页眉页脚，更专业干净
- ✅ 文件体积更小，加载速度更快
- ✅ 可直接打印或再编辑
