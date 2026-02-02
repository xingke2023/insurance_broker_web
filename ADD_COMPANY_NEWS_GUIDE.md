# 添加公司新闻快速指南

## 方法一：通过Admin后台（推荐）

### 步骤：

1. **登录Admin后台**
   ```
   访问：http://your-domain/admin/
   ```

2. **进入公司新闻管理**
   ```
   侧边栏 → 公司新闻与宣传 → 添加
   ```

3. **填写新闻信息**
   - **所属公司**：选择公司（必填）
   - **标题**：新闻标题（必填）
   - **内容类型**：选择类型（新闻/公告/新闻稿等）
   - **描述**：简要描述
   - **正文内容**：完整正文（支持HTML）
   - **外部链接**：新闻PDF或网页链接
   - **发布日期**：选择日期
   - **是否精选**：勾选后将优先显示
   - **排序**：数字越小越靠前

4. **保存**

## 方法二：通过Python脚本

### 快速添加单条新闻

创建文件 `add_single_news.py`：

```python
#!/usr/bin/env python3
import os
import django
import sys
from datetime import date

sys.path.append('/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceCompany, CompanyNews

# 查找公司
company = InsuranceCompany.objects.get(name__icontains='周大福')

# 创建新闻
news = CompanyNews.objects.create(
    company=company,
    title='新闻标题',
    content_type='news',  # news/announcement/press_release/article等
    description='简要描述',
    content='<div><h2>完整正文</h2><p>内容...</p></div>',
    url='https://example.com/news.pdf',
    published_date=date.today(),
    is_active=True,
    is_featured=True,  # 是否精选
    sort_order=0
)

print(f"✅ 创建成功: {news.title}")
```

### 运行脚本

```bash
python3 add_single_news.py
```

## 方法三：使用Django Shell

### 进入Shell

```bash
python3 /var/www/harry-insurance2/manage.py shell
```

### 添加新闻

```python
from api.models import InsuranceCompany, CompanyNews
from datetime import date

# 查找公司
company = InsuranceCompany.objects.get(name__icontains='友邦')

# 创建新闻
news = CompanyNews.objects.create(
    company=company,
    title='友邦推出新产品',
    content_type='news',
    description='友邦最新推出...',
    content='<div>完整内容</div>',
    url='https://www.aia.com.hk/news.pdf',
    published_date=date.today(),
    is_active=True,
    is_featured=True,
    sort_order=0
)

print(f"创建成功: {news.title}")
```

## 内容类型说明

| 代码 | 显示名称 | 适用场景 |
|------|---------|---------|
| `news` | 公司新闻 | 日常新闻报道 |
| `announcement` | 公司公告 | 重要公告通知 |
| `brochure` | 公司小册子 | 宣传册、产品手册 |
| `video` | 视频 | 视频内容 |
| `article` | 文章 | 深度文章 |
| `press_release` | 新闻稿 | 官方新闻稿 |
| `report` | 年度报告 | 财务报告、ESG报告等 |
| `other` | 其他 | 其他类型 |

## 字段说明

### 必填字段
- `company` - 所属公司（外键）
- `title` - 标题
- `content_type` - 内容类型

### 可选字段
- `description` - 简要描述（建议填写）
- `content` - 完整正文（支持HTML）
- `url` - 外部链接（PDF或网页）
- `pdf_file` - 上传PDF文件
- `thumbnail` - 缩略图
- `published_date` - 发布日期
- `is_active` - 是否启用（默认True）
- `is_featured` - 是否精选（默认False）
- `sort_order` - 排序（默认0，越小越靠前）

## 实际案例

### 案例1：周大福ESG报告

```python
from api.models import InsuranceCompany, CompanyNews
from datetime import date

company = InsuranceCompany.objects.get(name__icontains='周大福')

news = CompanyNews.objects.create(
    company=company,
    title='周大福人壽首發自願性 ESG 披露 共建更可持續生態圈 開創保險新價值',
    content_type='press_release',
    description='周大福人壽首次發布自願性ESG披露報告，展示公司在環境、社會及管治方面的承諾和成就。',
    content='''
    <div>
        <h2>周大福人壽首發自願性 ESG 披露</h2>
        <p>報告重點包括環境保護、社會責任和企業管治等方面。</p>
    </div>
    ''',
    url='https://www.ctflife.com.hk/pdf/tc/新聞稿_周大福人壽首發自願性%20ESG%20披露.pdf',
    published_date=date.today(),
    is_active=True,
    is_featured=True,
    sort_order=0
)

print(f"✅ 已添加: {news.title}")
```

### 案例2：友邦新产品发布

```python
news = CompanyNews.objects.create(
    company=InsuranceCompany.objects.get(name__icontains='友邦'),
    title='友邦推出全新储蓄保险产品',
    content_type='news',
    description='友邦最新推出的储蓄保险产品将为客户提供更优厚的回报率。',
    content='<div><h2>产品特点</h2><ul><li>高回报</li><li>灵活提取</li></ul></div>',
    url='https://www.aia.com.hk/news',
    published_date=date(2026, 2, 1),
    is_active=True,
    is_featured=True,
    sort_order=0
)
```

## 批量添加新闻

### 从列表批量创建

```python
from api.models import InsuranceCompany, CompanyNews
from datetime import date, timedelta

company = InsuranceCompany.objects.get(name__icontains='友邦')

news_data = [
    {
        'title': '友邦2026年第一季度业绩公告',
        'type': 'announcement',
        'description': '公司公布2026年第一季度财务业绩。',
        'days_ago': 3,
    },
    {
        'title': '友邦客户服务优化通知',
        'type': 'announcement',
        'description': '我们将在2月15日起实施新的客户服务流程。',
        'days_ago': 7,
    },
]

for data in news_data:
    news = CompanyNews.objects.create(
        company=company,
        title=data['title'],
        content_type=data['type'],
        description=data['description'],
        content=f'<div><p>{data["description"]}</p></div>',
        published_date=date.today() - timedelta(days=data['days_ago']),
        is_active=True,
        is_featured=False,
        sort_order=10
    )
    print(f"✅ 已添加: {news.title}")
```

## 查看公司新闻

### 查看某公司的所有新闻

```python
from api.models import InsuranceCompany

company = InsuranceCompany.objects.get(name__icontains='周大福')

# 获取所有启用的新闻
news_list = company.news.filter(is_active=True).order_by('-is_featured', 'sort_order', '-published_date')

for news in news_list:
    print(f"📰 {news.title}")
    print(f"   类型: {news.get_content_type_display()}")
    print(f"   精选: {'⭐' if news.is_featured else '  '}")
    print(f"   日期: {news.published_date}")
    print(f"   浏览: {news.view_count} 次")
    print()
```

### 统计数据

```python
from api.models import CompanyNews

print(f"总新闻数: {CompanyNews.objects.count()}")
print(f"启用新闻: {CompanyNews.objects.filter(is_active=True).count()}")
print(f"精选新闻: {CompanyNews.objects.filter(is_featured=True, is_active=True).count()}")

# 按公司统计
from api.models import InsuranceCompany
for company in InsuranceCompany.objects.filter(is_active=True):
    count = company.news.filter(is_active=True).count()
    if count > 0:
        print(f"{company.name}: {count} 条新闻")
```

## 更新现有新闻

```python
from api.models import CompanyNews

# 通过ID获取
news = CompanyNews.objects.get(id=14)

# 更新字段
news.title = '新的标题'
news.is_featured = True
news.sort_order = 0
news.save()

print(f"✅ 已更新: {news.title}")
```

## 删除新闻

```python
# 软删除（推荐）- 只是禁用，数据保留
news = CompanyNews.objects.get(id=14)
news.is_active = False
news.save()

# 硬删除（谨慎）- 永久删除
news = CompanyNews.objects.get(id=14)
news.delete()
```

## 常见问题

### Q1: 如何查找公司？

```python
# 模糊查询
InsuranceCompany.objects.filter(name__icontains='友邦')

# 精确查询
InsuranceCompany.objects.get(code='aia')

# 列出所有公司
for c in InsuranceCompany.objects.all():
    print(f"{c.id}: {c.name} ({c.code})")
```

### Q2: 如何设置精选新闻？

精选新闻会在列表中优先显示，并带有星标标识：

```python
news.is_featured = True
news.sort_order = 0  # 精选新闻建议设置为0
news.save()
```

### Q3: 排序规则

新闻按以下顺序排列：
1. 精选新闻优先（`is_featured=True`）
2. 按 `sort_order` 升序
3. 按 `published_date` 降序

### Q4: URL编码问题

如果URL包含中文，Python会自动处理：

```python
url = 'https://www.ctflife.com.hk/pdf/tc/新聞稿_周大福人壽.pdf'
# 保存时自动编码，浏览器访问时自动解码
```

## 维护建议

1. **定期更新**：建议每周添加新闻动态
2. **精选控制**：每个公司保持2-3条精选新闻即可
3. **内容质量**：description字段尽量填写，方便用户快速了解
4. **外链检查**：定期检查URL是否有效
5. **浏览统计**：关注view_count，了解用户关注点

## 相关文件

- 模型定义：`api/models.py:CompanyNews`
- Admin配置：`api/admin.py:CompanyNewsAdmin`
- API视图：`api/company_news_views.py`
- 前端展示：`frontend/src/components/InsuranceCompanyDetail.jsx`

## 完整示例脚本

保存为 `add_news_template.py`：

```python
#!/usr/bin/env python3
"""
添加公司新闻模板脚本
使用方法: python3 add_news_template.py
"""
import os, django, sys
from datetime import date

sys.path.append('/var/www/harry-insurance2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import InsuranceCompany, CompanyNews

# ========== 配置区 ==========
COMPANY_NAME = '周大福'  # 公司名称（支持模糊匹配）
NEWS_TITLE = '新闻标题'
NEWS_TYPE = 'news'  # news/announcement/press_release等
NEWS_DESCRIPTION = '简要描述'
NEWS_URL = 'https://example.com/news.pdf'
IS_FEATURED = True  # 是否精选
# ===========================

try:
    company = InsuranceCompany.objects.get(name__icontains=COMPANY_NAME)

    news = CompanyNews.objects.create(
        company=company,
        title=NEWS_TITLE,
        content_type=NEWS_TYPE,
        description=NEWS_DESCRIPTION,
        content=f'<div><h2>{NEWS_TITLE}</h2><p>{NEWS_DESCRIPTION}</p></div>',
        url=NEWS_URL,
        published_date=date.today(),
        is_active=True,
        is_featured=IS_FEATURED,
        sort_order=0 if IS_FEATURED else 10
    )

    print(f"✅ 成功添加新闻!")
    print(f"   公司: {company.name}")
    print(f"   标题: {news.title}")
    print(f"   类型: {news.get_content_type_display()}")
    print(f"   精选: {'是' if news.is_featured else '否'}")

except Exception as e:
    print(f"❌ 错误: {e}")
```
