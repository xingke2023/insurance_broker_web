# InsuranceProduct 新增计划书字段总结

## 更新时间
2026-01-26

## 变更总结

为 `InsuranceProduct` 模型新增 **2个计划书相关字段**：

1. ✅ **plan_summary** - 计划书产品概要（简短介绍，200-500字）
2. ✅ **plan_details** - 计划书详情（完整详情，longtext类型）

---

## 字段对比

### 变更前
- 总字段数：**18个**
- 基本信息字段：4个
- 产品描述字段：1个（description）

### 变更后
- 总字段数：**20个** ✅ (+2)
- 基本信息字段：4个
- **计划书内容字段：2个** ✨ NEW
  - `plan_summary` - 计划书产品概要
  - `plan_details` - 计划书详情
- 产品描述字段：3个总计（description + plan_summary + plan_details）

---

## 详细字段说明

### 1. plan_summary (计划书产品概要)

| 属性 | 值 |
|-----|---|
| 类型 | TextField (longtext) |
| 中文名 | 计划书产品概要 |
| 必填 | 否 (blank=True) |
| 推荐长度 | 200-500字 |
| 用途 | 产品快速介绍，显示在列表、卡片等处 |
| 示例 | 见下方 |

**内容结构建议**：
```text
【产品名称】XXX储蓄寿险计划

【产品特点】
• 特点1
• 特点2
• 特点3

【适合人群】
• 人群1
• 人群2

【核心优势】
1. 优势1
2. 优势2
```

### 2. plan_details (计划书详情)

| 属性 | 值 |
|-----|---|
| 类型 | TextField (longtext) |
| 中文名 | 计划书详情 |
| 必填 | 否 (blank=True) |
| 推荐长度 | 2000-10000字 |
| 用途 | 完整产品说明书，包括条款、保障范围、理赔流程等 |
| 格式 | 支持 Markdown |

**内容结构建议**：
```markdown
# 产品名称 - 完整详情

## 一、产品概述
产品介绍...

## 二、产品特色
### 2.1 特色1
### 2.2 特色2

## 三、保障范围
详细保障说明...

## 四、适合人群
目标客户分析...

## 五、保费示例
具体案例计算...

## 六、理赔流程
详细流程说明...

## 七、重要条款
等待期、犹豫期、免责条款等...

## 八、税务考虑
税务处理说明...

## 九、常见问题
Q&A...

## 十、购买流程
投保步骤...

## 十一、联系方式
客服信息...
```

---

## 数据库变更

### 迁移文件
1. `0053_add_plan_summary_to_product.py` - 添加 plan_summary
2. `0054_add_plan_details_to_product.py` - 添加 plan_details

### SQL 语句（已自动执行）
```sql
-- 添加 plan_summary 字段
ALTER TABLE `insurance_products`
ADD COLUMN `plan_summary` longtext NOT NULL DEFAULT '';

-- 添加 plan_details 字段
ALTER TABLE `insurance_products`
ADD COLUMN `plan_details` longtext NOT NULL DEFAULT '';
```

---

## Django Admin 配置

### 新增字段组："计划书内容"

```python
('计划书内容', {
    'fields': ('plan_summary', 'plan_details'),
    'description': '<strong>计划书内容配置</strong><br>'
                 '• plan_summary: 产品概要，简短介绍（200-500字）<br>'
                 '• plan_details: 完整详情，包括条款、保障范围、理赔流程等（可以很长）',
    'classes': ('collapse',)  # 默认折叠
}),
```

**访问路径**：`/admin/api/insuranceproduct/` → 编辑产品 → "计划书内容"区域

---

## 完整字段结构图

```
📦 InsuranceProduct (20个字段)
├── 🏢 关联字段 (1个)
│   └── company
│
├── 📝 基本信息 (4个)
│   ├── product_name
│   ├── payment_period
│   ├── annual_premium
│   └── description
│
├── 📄 计划书内容 (2个) ✨ NEW
│   ├── plan_summary - 计划书产品概要
│   └── plan_details - 计划书详情
│
├── 📊 数据表格 (2个)
│   ├── surrender_value_table
│   └── death_benefit_table
│
├── 🎯 AI推荐元数据 (7个)
│   ├── target_age_min
│   ├── target_age_max
│   ├── target_life_stage
│   ├── coverage_type
│   ├── min_annual_income
│   ├── features
│   └── ai_recommendation_prompt
│
├── ⚙️ 产品特性 (2个)
│   ├── is_withdrawal
│   └── is_active
│
└── 📅 系统字段 (3个)
    ├── sort_order
    ├── created_at
    └── updated_at
```

---

## 使用示例

### Python 代码示例

```python
from api.models import InsuranceProduct

# 获取产品
product = InsuranceProduct.objects.get(id=1)

# 添加计划书概要
product.plan_summary = """
【产品名称】环宇盈活储蓄寿险计划

【产品特点】
• 灵活缴费：1年期/5年期可选
• 稳健增值：保证现金价值 + 非保证红利
• 货币选择：支持美元/港币

【适合人群】
• 25-50岁中高收入人士
• 希望进行长期财富规划
"""

# 添加计划书详情（支持Markdown）
product.plan_details = """
# 友邦环宇盈活 - 完整详情

## 一、产品概述
这是一款灵活的储蓄型保险产品...

## 二、产品特色
### 2.1 灵活缴费
详细说明...
"""

product.save()
```

### API 返回示例

```json
{
  "id": 1,
  "product_name": "环宇盈活储蓄寿险计划",
  "company": "友邦",
  "payment_period": 5,
  "annual_premium": "10000.00",
  "description": "灵活储蓄型保险产品",
  "plan_summary": "【产品名称】环宇盈活储蓄寿险计划\n\n【产品特点】...",
  "plan_details": "# 友邦环宇盈活 - 完整详情\n\n## 一、产品概述\n..."
}
```

---

## 数据完整性统计

### 当前状态（2026-01-26）

| 字段 | 完整度 | 说明 |
|-----|-------|------|
| 基本字段 | 100% | 所有产品必填字段完整 |
| surrender_value_table | 100% | 27/27 产品已配置 |
| death_benefit_table | 37% | 10/27 产品已配置 |
| description | 33% | 9/27 产品已配置 |
| **plan_summary** | **3.7%** | **1/27 产品已配置** ✨ |
| **plan_details** | **3.7%** | **1/27 产品已配置** ✨ |
| AI推荐字段 | 0% | 0/27 产品已配置 |

### 示例产品

**产品ID 21**（友邦 - 环宇盈活）已配置完整计划书内容：
- ✅ plan_summary：212字符
- ✅ plan_details：2,679字符（约2.6KB）

---

## 使用场景

### 1. 产品列表页
显示 `plan_summary` 作为产品简介：
```jsx
<div className="product-card">
  <h3>{product.product_name}</h3>
  <p className="summary">{product.plan_summary}</p>
  <button>查看详情</button>
</div>
```

### 2. 产品详情页
显示 `plan_details` 作为完整说明（支持Markdown渲染）：
```jsx
import ReactMarkdown from 'react-markdown';

<div className="product-detail">
  <h1>{product.product_name}</h1>
  <div className="summary">{product.plan_summary}</div>
  <ReactMarkdown>{product.plan_details}</ReactMarkdown>
</div>
```

### 3. Company Comparison 页面
在对比表格中添加"产品概要"列：
```jsx
<td>
  <details>
    <summary>查看产品概要</summary>
    <div className="whitespace-pre-line">{product.plan_summary}</div>
  </details>
</td>
```

### 4. PDF计划书生成
使用 `plan_details` 生成完整的PDF计划书：
```python
from reportlab.lib.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

def generate_plan_pdf(product_id):
    product = InsuranceProduct.objects.get(id=product_id)

    # 使用 plan_details 生成PDF
    pdf = canvas.Canvas(f"{product.product_name}.pdf")
    # 渲染 Markdown 内容到 PDF
    pdf.drawString(100, 750, product.product_name)
    # ... 添加 plan_details 内容 ...
    pdf.save()
```

---

## 批量数据填充建议

### 优先级排序

**高优先级**（建议先填充）：
1. 旗舰产品（flagship_product）
2. 5年期产品（最常见）
3. 高年缴保费产品（≥ HK$50,000）

**中优先级**：
1. 1-2年期产品
2. 有完整退保价值表的产品

**低优先级**：
1. 低年缴保费产品（< HK$10,000）
2. 测试产品

### 填充方法

#### 方法1：手动填充
在 Django Admin 后台逐个编辑

#### 方法2：批量导入
```python
import os, django, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceProduct

# 从JSON文件批量导入
with open('product_plans.json', 'r', encoding='utf-8') as f:
    plans = json.load(f)

for plan_data in plans:
    product = InsuranceProduct.objects.get(id=plan_data['product_id'])
    product.plan_summary = plan_data['summary']
    product.plan_details = plan_data['details']
    product.save()
    print(f'✅ {product.product_name} - 计划书已更新')
```

#### 方法3：AI自动生成
```python
# 使用 Gemini API 自动生成计划书内容
def generate_plan_content(product):
    prompt = f"""
    请为以下保险产品生成详细的计划书内容：

    产品名称：{product.product_name}
    保险公司：{product.company.name}
    缴费年期：{product.payment_period}年
    年缴保费：HK${product.annual_premium}

    请生成：
    1. plan_summary（200-500字的产品概要）
    2. plan_details（2000-5000字的完整详情，使用Markdown格式）
    """

    # 调用 Gemini API
    response = call_gemini_api(prompt)

    product.plan_summary = response['summary']
    product.plan_details = response['details']
    product.save()
```

---

## API 扩展建议

### 1. 产品详情API
```python
@api_view(['GET'])
def get_product_detail(request, product_id):
    product = InsuranceProduct.objects.get(id=product_id)
    return Response({
        'id': product.id,
        'product_name': product.product_name,
        'company': product.company.name,
        'plan_summary': product.plan_summary,      # 新增
        'plan_details': product.plan_details,      # 新增
        'surrender_value_table': product.surrender_value_table
    })
```

### 2. 产品列表API（包含概要）
```python
@api_view(['GET'])
def get_products_with_summary(request):
    products = InsuranceProduct.objects.filter(is_active=True)
    data = [{
        'id': p.id,
        'product_name': p.product_name,
        'company': p.company.name,
        'plan_summary': p.plan_summary[:200] + '...' if len(p.plan_summary) > 200 else p.plan_summary
    } for p in products]
    return Response(data)
```

---

## 前端展示建议

### 产品卡片组件
```jsx
// ProductCard.jsx
export default function ProductCard({ product }) {
  return (
    <div className="product-card">
      <div className="company-logo">
        <img src={product.company_icon} alt={product.company_name} />
      </div>
      <h3>{product.product_name}</h3>

      {/* 显示计划书概要 */}
      <div className="summary whitespace-pre-line text-gray-600">
        {product.plan_summary}
      </div>

      <div className="premium">
        年缴: HK${product.annual_premium.toLocaleString()}
      </div>

      <Link to={`/products/${product.id}`}>
        查看详情
      </Link>
    </div>
  );
}
```

### 产品详情页面
```jsx
// ProductDetail.jsx
import ReactMarkdown from 'react-markdown';

export default function ProductDetail({ productId }) {
  const [product, setProduct] = useState(null);

  useEffect(() => {
    fetch(`/api/products/${productId}/`)
      .then(res => res.json())
      .then(data => setProduct(data));
  }, [productId]);

  return (
    <div className="product-detail">
      <h1>{product?.product_name}</h1>

      {/* 概要区域 */}
      <section className="summary-section">
        <h2>产品概要</h2>
        <div className="whitespace-pre-line">
          {product?.plan_summary}
        </div>
      </section>

      {/* 详情区域（Markdown渲染） */}
      <section className="details-section">
        <h2>详细信息</h2>
        <ReactMarkdown className="prose">
          {product?.plan_details}
        </ReactMarkdown>
      </section>
    </div>
  );
}
```

---

## 测试验证

### 1. 字段存在性验证
```bash
python3 manage.py shell
>>> from api.models import InsuranceProduct
>>> product = InsuranceProduct.objects.first()
>>> hasattr(product, 'plan_summary')
True
>>> hasattr(product, 'plan_details')
True
```

### 2. 数据读写测试
```python
product = InsuranceProduct.objects.get(id=21)
print(f'概要长度: {len(product.plan_summary)} 字符')
print(f'详情长度: {len(product.plan_details)} 字符')
```

### 3. Admin后台测试
访问 `/admin/api/insuranceproduct/21/change/` 查看是否显示"计划书内容"字段组

---

## 回滚方案

如需回滚：

```bash
# 回滚到添加 plan_summary 之前
python3 manage.py migrate api 0052_change_life_stage_to_tags

# 或手动删除字段
python3 manage.py dbshell
mysql> ALTER TABLE insurance_products DROP COLUMN plan_summary;
mysql> ALTER TABLE insurance_products DROP COLUMN plan_details;
```

---

## 相关文件

- ✅ 模型定义: `api/models.py:900-910`
- ✅ 迁移文件:
  - `api/migrations/0053_add_plan_summary_to_product.py`
  - `api/migrations/0054_add_plan_details_to_product.py`
- ✅ Admin配置: `api/admin.py:916-923`
- ⚪ 字段文档: `INSURANCE_PRODUCT_FIELDS.md` (需更新)

---

## 下一步工作

### 立即执行
1. ⚪ 为其他26个产品填充 `plan_summary` 和 `plan_details`
2. ⚪ 更新 `INSURANCE_PRODUCT_FIELDS.md` 文档

### 短期规划
3. ⚪ 开发产品详情API（包含新字段）
4. ⚪ 前端产品详情页展示计划书内容
5. ⚪ Company Comparison 添加"产品概要"展示

### 长期规划
6. ⚪ 开发计划书PDF生成功能
7. ⚪ AI自动生成计划书内容
8. ⚪ 多语言支持（中文/英文计划书）

---

## 总结

✅ 成功为 `InsuranceProduct` 模型添加 2个计划书字段
✅ 数据库迁移已完成
✅ Admin 后台已配置独立字段组
✅ 字段测试通过
✅ 示例数据已添加（产品ID 21）

**新字段总数**: 20个（从18个增加到20个）
**计划书内容字段**: 2个（plan_summary + plan_details）
**当前数据完整度**: 3.7% (1/27产品已配置)

**建议下一步**:
1. 为所有27个产品填充计划书内容
2. 优先填充旗舰产品和常用的5年期产品
3. 考虑使用AI自动生成以提高效率
