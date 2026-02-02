# InsuranceProduct 新增字段：product_category (产品分类)

## 更新时间
2026-01-26

## 变更内容

为 `InsuranceProduct` 模型新增 **product_category** 字段，用于对保险产品进行类型分类。

## 字段详情

### product_category (产品分类)

- **类型**: CharField
- **最大长度**: 50
- **中文名**: 产品分类
- **必填**: 否 (blank=True)
- **默认值**: 空字符串
- **用途**: 产品类型分类，便于筛选和展示

### 常见分类类型

```text
• 重疾险 - Critical Illness Insurance
• 理财 - Wealth Management
• 储蓄 - Savings Plan
• 医疗险 - Medical Insurance
• 人寿保险 - Life Insurance
• 年金险 - Annuity Insurance
• 意外险 - Accident Insurance
• 教育金 - Education Fund
• 退休规划 - Retirement Planning
```

### 示例数据

```python
# 友邦环宇盈活
product_category = '理财'

# 保诚守护健康危疾
product_category = '重疾险'

# 万通富饶传承储蓄计划
product_category = '储蓄'
```

## 数据库变更

### 迁移文件
- 文件名: `0055_add_product_category_to_product.py`
- 路径: `api/migrations/0055_add_product_category_to_product.py`

### SQL 语句（自动执行）
```sql
ALTER TABLE `insurance_products`
ADD COLUMN `product_category` varchar(50) NOT NULL DEFAULT '';
```

## 模型变更

### 文件位置
`api/models.py:856-862`

### 代码
```python
# 产品分类
product_category = models.CharField(
    max_length=50,
    verbose_name='产品分类',
    blank=True,
    help_text='产品类型分类，例如：重疾险、理财、储蓄、医疗险等'
)
```

## Admin 后台变更

### 文件位置
`api/admin.py:917`

### 变更内容
在 "基本信息" 字段组中添加 `product_category` 字段：

```python
('基本信息', {
    'fields': ('company', 'product_name', 'product_category', 'description'),
    'description': '产品的基本信息'
}),
```

## 使用场景

### 1. 产品筛选
```python
from api.models import InsuranceProduct

# 获取所有理财类产品
wealth_products = InsuranceProduct.objects.filter(
    product_category='理财',
    is_active=True
)

# 获取所有重疾险产品
critical_illness = InsuranceProduct.objects.filter(
    product_category='重疾险',
    is_active=True
)
```

### 2. API返回
```json
{
  "id": 21,
  "product_name": "环宇盈活",
  "company": "友邦",
  "product_category": "理财",
  "payment_period": 5,
  "annual_premium": 50000
}
```

### 3. 前端筛选器
```javascript
// 产品分类筛选组件
const categories = [
  { value: '', label: '全部' },
  { value: '重疾险', label: '重疾险' },
  { value: '理财', label: '理财' },
  { value: '储蓄', label: '储蓄' },
  { value: '医疗险', label: '医疗险' }
];

<select onChange={handleCategoryChange}>
  {categories.map(cat => (
    <option value={cat.value}>{cat.label}</option>
  ))}
</select>
```

### 4. CompanyComparison 页面
可以添加产品分类列，便于用户快速识别产品类型：

```javascript
<td className="p-2 text-sm">
  <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">
    {product.product_category || '未分类'}
  </span>
</td>
```

## 数据填充建议

### 优先级：高

建议为所有27个产品填充 `product_category`，提升产品可筛选性和展示体验。

### 填充策略

根据产品名称和特征进行分类：

1. **储蓄/理财类产品**：
   - 包含"储蓄"、"盈"、"传承"、"理财"等关键词
   - 例如：环宇盈活、富饶传承、盈聚未来

2. **重疾险产品**：
   - 包含"危疾"、"健康"、"重疾"等关键词
   - 例如：守护健康危疾加护保、加裕智倍保

3. **人寿保险**：
   - 包含"寿险"、"终身"等关键词
   - 例如：充裕未来计划、盛世·传家宝

### 批量填充脚本示例

```python
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceProduct

# 定义分类规则（基于产品名称关键词）
category_rules = {
    '理财': ['盈', '储蓄', '传承', '理财', '富饶'],
    '重疾险': ['危疾', '健康', '重疾', '加护'],
    '人寿保险': ['寿险', '终身', '传家'],
    '教育金': ['教育', '学习'],
    '退休规划': ['退休', '年金']
}

products = InsuranceProduct.objects.filter(is_active=True)

for product in products:
    if product.product_category:
        continue  # 已有分类，跳过

    # 根据产品名匹配分类
    for category, keywords in category_rules.items():
        if any(keyword in product.product_name for keyword in keywords):
            product.product_category = category
            product.save()
            print(f'✅ {product.product_name} → {category}')
            break
    else:
        print(f'⚠️ {product.product_name} → 无法自动分类，需人工标注')
```

## API 扩展建议

### 1. 添加分类筛选参数
```python
# api/insurance_company_views.py
@api_view(['GET'])
def get_companies_standard_comparison(request):
    category = request.GET.get('category', None)
    payment_period = request.GET.get('payment_period', 5)

    filters = {
        'is_active': True,
        'payment_period': payment_period
    }

    if category:
        filters['product_category'] = category

    products = InsuranceProduct.objects.filter(**filters)
    # ...
```

### 2. 获取所有分类列表
```python
@api_view(['GET'])
def get_product_categories(request):
    """获取所有产品分类列表"""
    categories = InsuranceProduct.objects.filter(
        is_active=True,
        product_category__isnull=False
    ).exclude(
        product_category=''
    ).values_list(
        'product_category', flat=True
    ).distinct().order_by('product_category')

    return Response({
        'categories': list(categories)
    })
```

### 3. 分类统计API
```python
from django.db.models import Count

@api_view(['GET'])
def get_category_statistics(request):
    """获取各分类的产品数量统计"""
    stats = InsuranceProduct.objects.filter(
        is_active=True
    ).values('product_category').annotate(
        count=Count('id')
    ).order_by('-count')

    return Response({
        'statistics': list(stats)
    })
```

## 字段统计

### 更新前
- 总字段数：20个
- 基本信息字段：3个（company, product_name, description）

### 更新后
- **总字段数：21个** ✅
- **基本信息字段：4个** ✅
  - `company` - 保险公司
  - `product_name` - 产品名称
  - `product_category` - 产品分类 ✨ NEW
  - `description` - 产品描述

## 完整字段列表（更新后）

```
📦 InsuranceProduct (21个字段)
├── 🏢 关联字段 (1个)
│   └── company
├── 📝 基本信息 (4个) ⬆️
│   ├── product_name
│   ├── product_category ✨ NEW
│   ├── description
│   └── (payment_period, annual_premium - 移至保费信息)
├── 💰 保费信息 (2个)
│   ├── payment_period
│   └── annual_premium
├── 📖 计划书内容 (2个)
│   ├── plan_summary
│   └── plan_details
├── 📊 数据表格 (2个)
│   ├── surrender_value_table
│   └── death_benefit_table
├── 🎯 AI推荐元数据 (7个)
│   ├── target_age_min
│   ├── target_age_max
│   ├── target_life_stage
│   ├── coverage_type
│   ├── min_annual_income
│   ├── features
│   └── ai_recommendation_prompt
├── ⚙️ 产品特性 (2个)
│   ├── is_withdrawal
│   └── is_active
└── 📅 系统字段 (3个)
    ├── sort_order
    ├── created_at
    └── updated_at
```

## 测试验证

### 验证步骤

1. ✅ 检查字段是否添加成功
```bash
python3 manage.py shell
>>> from api.models import InsuranceProduct
>>> product = InsuranceProduct.objects.first()
>>> hasattr(product, 'product_category')
True
>>> len([f for f in InsuranceProduct._meta.get_fields()])
23  # 包括关系字段
```

2. ✅ 测试字段读写
```python
product = InsuranceProduct.objects.get(id=21)
product.product_category = '理财'
product.save()
print(product.product_category)  # 输出: 理财
```

3. ✅ 检查Admin后台
访问 `/admin/api/insuranceproduct/` 查看是否在"基本信息"显示新字段

4. ✅ 测试数据已添加
```python
product = InsuranceProduct.objects.get(id=21)
print(f"产品名: {product.product_name}")
print(f"产品分类: {product.product_category}")
# 输出:
# 产品名: 环宇盈活
# 产品分类: 理财
```

## 回滚方案

如果需要回滚此变更：

```bash
# 回滚迁移
python3 manage.py migrate api 0054_add_plan_details_to_product

# 或手动删除字段
python3 manage.py dbshell
mysql> ALTER TABLE insurance_products DROP COLUMN product_category;
```

## 相关文件

- ✅ 模型定义: `api/models.py`
- ✅ 迁移文件: `api/migrations/0055_add_product_category_to_product.py`
- ✅ Admin配置: `api/admin.py`
- ⚪ 需更新: `INSURANCE_PRODUCT_FIELDS.md` (如果存在)

## 下一步工作

1. ⚪ 为所有27个产品填充 `product_category`（使用批量脚本）
2. ⚪ 更新 API 返回 `product_category` 字段
3. ⚪ 在 CompanyComparison 页面添加分类筛选器
4. ⚪ 在产品列表页显示分类标签
5. ⚪ 创建分类统计API端点
6. ⚪ 更新相关文档

## 总结

✅ 成功为 `InsuranceProduct` 模型添加 `product_category` 字段
✅ 数据库迁移已完成
✅ Admin 后台已配置
✅ 字段测试通过
✅ Django服务已重启

**新字段总数**: 21个（从20个增加到21个）

**建议下一步**: 使用批量脚本为所有产品填充分类数据，提升产品筛选和展示功能。

## 分类建议（基于现有27个产品）

根据产品名称特征，以下是初步分类建议：

### 理财类产品（Wealth Management）
- 环宇盈活
- 富饶传承储蓄计划
- 盈聚未来储蓄计划
- 盈御多元货币计划
- 传家有道储蓄计划

### 重疾险产品（Critical Illness）
- 守护健康危疾加护保
- 加裕智倍保危疾保障计划
- 康健一生守护健康保障

### 人寿保险（Life Insurance）
- 充裕未来计划
- 盛世·传家宝终身寿险
- 终身寿险计划

### 储蓄计划（Savings Plan）
- 美元储蓄计划
- 全能保储蓄计划
- 多元货币储蓄

_注：具体分类需根据产品详细特性和公司定位进行调整_
