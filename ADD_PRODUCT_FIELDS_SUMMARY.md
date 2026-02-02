# InsuranceProduct 新增字段说明

## 概述
在 `InsuranceProduct` 模型中新增了两个字段，用于存储计划书PDF和产品研究报告。

## 新增字段

### 1. plan_pdf_base64
- **字段类型**: `TextField`
- **verbose_name**: 计划书PDF Base64编码
- **说明**: 存储计划书PDF文件的Base64编码，用于前端下载或预览
- **使用场景**:
  - 前端可以直接从API获取Base64编码的PDF
  - 无需额外的文件服务器或存储配置
  - 支持在线预览和下载

### 2. product_research_report
- **字段类型**: `TextField`
- **verbose_name**: 产品研究报告
- **说明**: 产品的深度研究报告，包括市场分析、竞品对比、投资策略等专业内容
- **使用场景**:
  - 存储AI生成或人工编写的产品分析报告
  - 为客户提供专业的产品解读
  - 辅助销售人员了解产品特性

## 数据库变更

### 迁移文件
- **文件路径**: `api/migrations/0056_add_pdf_base64_and_research_report_to_product.py`
- **迁移状态**: ✅ 已应用

### 数据库表
- **表名**: `insurance_products`
- **新增列**:
  - `plan_pdf_base64` (TEXT)
  - `product_research_report` (TEXT)

## 代码变更

### 1. 模型定义
**文件**: `api/models.py`

```python
class InsuranceProduct(models.Model):
    # ... 其他字段 ...

    # 计划书PDF Base64编码
    plan_pdf_base64 = models.TextField(
        verbose_name='计划书PDF Base64编码',
        blank=True,
        default='',
        help_text='存储计划书PDF文件的Base64编码，用于前端下载或预览'
    )

    # 产品研究报告
    product_research_report = models.TextField(
        verbose_name='产品研究报告',
        blank=True,
        default='',
        help_text='产品的深度研究报告，包括市场分析、竞品对比、投资策略等专业内容'
    )
```

### 2. Admin 配置
**文件**: `api/admin.py`

在 `InsuranceProductAdmin` 的 fieldsets 中添加了这两个字段：

```python
('计划书内容', {
    'fields': ('plan_pdf', 'plan_summary', 'plan_details', 'plan_pdf_base64', 'product_research_report'),
    'description': '<strong>计划书内容配置</strong><br>'
                 '• plan_pdf: 上传PDF计划书，AI将自动解析并填充到plan_details字段（推荐）<br>'
                 '• plan_summary: 产品概要，简短介绍（200-500字）<br>'
                 '• plan_details: 完整详情，包括条款、保障范围、理赔流程等<br>'
                 '• plan_pdf_base64: 计划书PDF的Base64编码（用于前端下载或预览）<br>'
                 '• product_research_report: 产品研究报告，深度分析内容',
    'classes': ('collapse',)
}),
```

### 3. API 接口
**文件**: `api/insurance_company_views.py`

更新了 `get_insurance_product_detail` 接口，返回数据中包含新字段：

```python
return Response({
    'status': 'success',
    'data': {
        'id': product.id,
        # ... 其他字段 ...
        'plan_summary': product.plan_summary,
        'plan_details': product.plan_details,
        'plan_pdf_base64': product.plan_pdf_base64,
        'product_research_report': product.product_research_report,
    }
})
```

## 使用方法

### 1. Admin 后台使用

访问产品编辑页面：
```
http://your-domain:8017/admin/api/insuranceproduct/{product_id}/change/
```

在「计划书内容」折叠区域中可以看到：
- **计划书PDF Base64编码**: 大型文本框，可粘贴Base64编码的PDF数据
- **产品研究报告**: 大型文本框，可输入或粘贴研究报告内容

### 2. API 接口使用

**获取产品详情（包含新字段）**:
```bash
GET /api/insurance-companies/products/{product_id}/
```

**响应示例**:
```json
{
  "status": "success",
  "data": {
    "id": 12,
    "company": { ... },
    "product_name": "环宇盈活",
    "plan_summary": "产品概要...",
    "plan_details": "详细信息...",
    "plan_pdf_base64": "JVBERi0xLjQKJeLjz9MK...",
    "product_research_report": "# 产品研究报告\n\n## 市场分析..."
  }
}
```

### 3. Python 代码使用

```python
from api.models import InsuranceProduct

# 获取产品
product = InsuranceProduct.objects.get(id=12)

# 读取字段
pdf_base64 = product.plan_pdf_base64
report = product.product_research_report

# 更新字段
product.plan_pdf_base64 = "新的Base64数据"
product.product_research_report = "新的研究报告"
product.save()
```

## 前端集成建议

### PDF Base64 使用示例

```javascript
// 1. 获取产品详情
const response = await fetch(`/api/insurance-companies/products/${productId}/`);
const data = await response.json();

// 2. 解析Base64为PDF Blob
const base64Data = data.data.plan_pdf_base64;
if (base64Data) {
    // 方法1: 直接在iframe中显示
    const pdfSrc = `data:application/pdf;base64,${base64Data}`;
    document.getElementById('pdf-viewer').src = pdfSrc;

    // 方法2: 转换为Blob用于下载
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // 触发下载
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.data.product_name}_计划书.pdf`;
    a.click();
}
```

### 研究报告使用示例

```javascript
// 获取研究报告（可能是Markdown格式）
const report = data.data.product_research_report;

if (report) {
    // 如果是Markdown格式，可使用marked库解析
    import { marked } from 'marked';
    const htmlContent = marked(report);
    document.getElementById('report-content').innerHTML = htmlContent;
}
```

## 注意事项

1. **Base64编码大小**: PDF文件Base64编码后会比原文件大约33%，建议控制PDF文件大小在10MB以内
2. **数据库性能**: TextField在MySQL中对应TEXT类型，最大存储64KB。如需存储更大的数据，考虑使用LONGTEXT或文件存储
3. **API响应大小**: 包含Base64的响应可能很大，建议：
   - 在列表接口中不返回这些字段
   - 只在详情接口中返回
   - 考虑使用分页或延迟加载
4. **缓存策略**: 大型字段应考虑使用CDN或缓存机制

## 测试验证

运行测试脚本验证字段功能：
```bash
python3 test_new_product_fields.py
```

## 相关文件

- 模型定义: `api/models.py`
- Admin配置: `api/admin.py`
- API视图: `api/insurance_company_views.py`
- 迁移文件: `api/migrations/0056_add_pdf_base64_and_research_report_to_product.py`
- 测试脚本: `test_new_product_fields.py`

## 部署检查清单

- [x] 模型字段已添加
- [x] 迁移文件已创建
- [x] 数据库迁移已执行
- [x] Admin配置已更新
- [x] API接口已更新
- [x] Django服务已重启
- [x] 字段功能已测试

## 后续优化建议

1. **AI自动生成**: 可以添加功能，在上传PDF时自动生成研究报告
2. **版本管理**: 可以添加版本字段，跟踪PDF和报告的更新历史
3. **文件存储**: 如果Base64影响性能，可以改用云存储（如OSS、S3）存储PDF原文件
4. **权限控制**: 可以添加字段级别的权限控制，限制谁可以查看研究报告
