# 保险公司信息爬虫 - 快速开始

## 🚀 立即使用

### 1. 准备工作

确保保险公司表中配置了官网URL：

```python
# 检查公司配置
from api.models import InsuranceCompany

# 查看所有公司
companies = InsuranceCompany.objects.all()
for company in companies:
    print(f"{company.name}: {company.website_url or '❌ 未配置'}")
```

**配置示例**（如果还没有配置）：

```python
# 宏利
manulife = InsuranceCompany.objects.get(code='manulife')
manulife.website_url = 'https://www.manulife.com.hk/zh-hk.html'
manulife.save()

# 友邦
aia = InsuranceCompany.objects.get(code='aia')
aia.website_url = 'https://www.aia.com.hk/zh-hk.html'
aia.save()
```

### 2. 方式一：使用API（推荐）

#### 步骤1: 获取管理员Token

```bash
# 登录获取token
curl -X POST http://localhost:8017/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_password"
  }'
```

#### 步骤2: 抓取公司新闻

```bash
# 抓取单个公司（宏利）
curl -X POST http://localhost:8017/api/scraper/company-news/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": 3
  }'

# 或者抓取所有公司
curl -X POST http://localhost:8017/api/scraper/company-news/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### 步骤3: 抓取产品资料

首先确保产品有配置URL：

```python
from api.models import InsuranceProduct

# 宏摯傳承保障計劃
product = InsuranceProduct.objects.get(id=17)
product.url = 'https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html'
product.save()
```

然后抓取：

```bash
curl -X POST http://localhost:8017/api/scraper/product-promotions/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 17
  }'
```

### 3. 方式二：使用测试脚本

```bash
cd /var/www/harry-insurance2
python3 test_scraper.py
```

测试脚本会逐步执行以下测试：
1. ✅ 查找公司页面
2. ✅ 网页分析
3. ✅ 抓取公司新闻
4. ✅ 抓取产品推广信息

### 4. 方式三：Python代码

```python
# 导入爬虫服务
from api.insurance_scraper_service import scraper_service
from api.models import InsuranceCompany, InsuranceProduct

# 1. 抓取宏利新闻
company = InsuranceCompany.objects.get(code='manulife')
result = scraper_service.scrape_company_news(
    company_id=company.id,
    company_name=company.name,
    company_url=company.website_url
)
print(f"成功: {result.get('success')}")
print(f"新增: {result.get('created')} 条")
print(f"更新: {result.get('updated')} 条")

# 2. 抓取产品资料
product = InsuranceProduct.objects.get(id=17)
result = scraper_service.scrape_product_promotions(
    product_id=product.id,
    product_name=product.product_name,
    product_url=product.url
)
print(f"成功: {result.get('success')}")
print(f"新增: {result.get('created')} 条")

# 3. 查看统计
from api.models import CompanyNews, ProductPromotion

print(f"公司新闻总数: {CompanyNews.objects.count()}")
print(f"产品资料总数: {ProductPromotion.objects.count()}")
```

---

## 📊 查看抓取结果

### 1. Admin后台查看

访问: http://localhost:8017/admin/

- **公司新闻**: `api` > `Company News`
- **产品资料**: `api` > `Product Promotions`

### 2. API查询

```bash
# 查看统计
curl -X GET http://localhost:8017/api/scraper/status/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# 查看宏利的新闻
curl -X GET "http://localhost:8017/api/company-news/?company=3" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 数据库查询

```python
from api.models import CompanyNews, ProductPromotion, InsuranceCompany

# 查看宏利的所有新闻
manulife = InsuranceCompany.objects.get(code='manulife')
news = CompanyNews.objects.filter(company=manulife, is_active=True)
for item in news:
    print(f"- {item.title}")
    print(f"  类型: {item.get_content_type_display()}")
    print(f"  链接: {item.url}")
    print()

# 查看某产品的所有资料
product = InsuranceProduct.objects.get(id=17)
promotions = ProductPromotion.objects.filter(product=product, is_active=True)
for item in promotions:
    print(f"- {item.title}")
    print(f"  类型: {item.get_content_type_display()}")
    print(f"  链接: {item.url}")
    print()
```

---

## 🔧 常见问题

### Q1: 抓取失败怎么办？

检查以下几点：
1. 公司是否配置了正确的官网URL
2. 网络连接是否正常
3. Gemini API Key是否配置正确
4. 查看Django日志获取详细错误信息

### Q2: 如何配置11家公司的官网URL？

```python
from api.models import InsuranceCompany

# 批量配置
company_urls = {
    'aia': 'https://www.aia.com.hk/zh-hk.html',
    'prudential': 'https://www.prudential.com.hk/zh-hk.html',
    'manulife': 'https://www.manulife.com.hk/zh-hk.html',
    'sunlife': 'https://www.sunlife.com.hk/zh-hk.html',
    'axa': 'https://www.axa.com.hk/zh-hk.html',
    'bocgroup': 'https://www.bocins.com.hk/zh-cn.html',
    'chinalife': 'https://www.chinalife.com.hk/tc.html',
    'fwd': 'https://www.fwd.com.hk/zh.html',
    'prudence': 'https://www.prudence.com.hk/zh-hk.html',
    'yf': 'https://www.yflife.com.hk/zh-hk.html',
    'ctf': 'https://www.ctfins.com.hk/zh-hk.html'
}

for code, url in company_urls.items():
    try:
        company = InsuranceCompany.objects.get(code=code)
        company.website_url = url
        company.save()
        print(f"✅ {company.name}: {url}")
    except InsuranceCompany.DoesNotExist:
        print(f"❌ {code} 公司不存在")
```

### Q3: 如何配置产品的官网链接？

```python
from api.models import InsuranceProduct

# 单个产品
product = InsuranceProduct.objects.get(id=17)
product.url = 'https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html'
product.save()

# 批量查找需要配置的产品
products_without_url = InsuranceProduct.objects.filter(url='', is_active=True)
print(f"需要配置URL的产品数: {products_without_url.count()}")
```

### Q4: 如何定时自动抓取？

使用 Celery 定时任务（需要先配置 Celery）：

```python
# api/tasks.py
from celery import shared_task
from .insurance_scraper_service import scraper_service

@shared_task
def daily_scrape_all_companies():
    """每天凌晨2点抓取所有公司新闻"""
    return scraper_service.scrape_all_companies()

# backend/celery.py - 添加定时任务
from celery.schedules import crontab

app.conf.beat_schedule = {
    'scrape-companies-daily': {
        'task': 'api.tasks.daily_scrape_all_companies',
        'schedule': crontab(hour=2, minute=0),  # 每天凌晨2点
    },
}
```

---

## ✅ 验证安装

运行以下命令验证爬虫系统是否正常工作：

```bash
# 1. 检查Django配置
cd /var/www/harry-insurance2
python3 manage.py check

# 2. 测试爬虫API
curl -X GET http://localhost:8017/api/scraper/status/

# 3. 运行测试脚本
python3 test_scraper.py
```

如果所有测试通过，说明爬虫系统已经成功安装！ 🎉

---

## 📚 完整文档

详细的API文档请查看: [INSURANCE_SCRAPER_API.md](./INSURANCE_SCRAPER_API.md)
