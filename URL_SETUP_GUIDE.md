# 保险公司URL配置指南

## 📋 概述

本指南帮助你快速配置11家保险公司的官网URL和产品URL，以便爬虫系统能够正常工作。

---

## 🚀 快速开始（推荐）

### 一键配置

运行自动配置脚本，一次性配置所有11家保险公司的官网URL：

```bash
cd /var/www/harry-insurance2
python3 quick_setup_urls.py
```

**自动完成**：
- ✅ 配置11家保险公司的官网URL
- ✅ 配置宏利的3个示例产品URL
- ✅ 显示配置统计信息

**配置的公司**：
1. 友邦 (AIA) - https://www.aia.com.hk/zh-hk.html
2. 保诚 (Prudential) - https://www.prudential.com.hk/zh-hk.html
3. 宏利 (Manulife) - https://www.manulife.com.hk/zh-hk.html
4. 永明 (Sun Life) - https://www.sunlife.com.hk/zh-hk.html
5. 安盛 (AXA) - https://www.axa.com.hk/zh-hk.html
6. 中银 (BOC Group) - https://www.bocgroup.com/web/zh/index.html
7. 国寿 (China Life) - https://www.chinalife.com.hk/tc.html
8. 富卫 (FWD) - https://www.fwd.com.hk/zh.html
9. 立桥 (Prudence) - https://www.prudence.com.hk/zh-hk.html
10. 萬通 (YF Life) - https://www.yflife.com.hk/zh-hk.html
11. 周大福 (CTF Life) - https://www.ctflife.com.hk/zh-hk.html

---

## 🔧 高级配置（使用Gemini智能查找）

### 交互式配置工具

运行交互式配置工具，使用Gemini AI自动查找产品URL：

```bash
cd /var/www/harry-insurance2
python3 setup_insurance_urls.py
```

**功能菜单**：
```
1. 配置所有公司的官网URL
2. 配置已知产品的URL
3. 使用Gemini查找产品URL（指定公司）
4. 使用Gemini批量查找所有公司的产品URL
5. 查看当前配置状态
0. 退出
```

### 使用Gemini查找产品URL

**示例：为宏利查找产品URL**

```bash
# 运行配置工具
python3 setup_insurance_urls.py

# 选择选项3
# 输入公司代码: manulife
```

**流程**：
1. ✅ Gemini分析公司官网
2. ✅ 找到产品列表页面
3. ✅ 提取所有产品链接
4. ✅ 智能匹配数据库中的产品
5. ✅ 自动保存URL到数据库

---

## 💻 手动配置（Python代码）

### 配置公司官网URL

```python
from api.models import InsuranceCompany

# 单个公司
manulife = InsuranceCompany.objects.get(code='manulife')
manulife.website_url = 'https://www.manulife.com.hk/zh-hk.html'
manulife.save()

# 批量配置
companies = {
    'aia': 'https://www.aia.com.hk/zh-hk.html',
    'prudential': 'https://www.prudential.com.hk/zh-hk.html',
    'manulife': 'https://www.manulife.com.hk/zh-hk.html',
    # ... 更多公司
}

for code, url in companies.items():
    company = InsuranceCompany.objects.get(code=code)
    company.website_url = url
    company.save()
    print(f"✅ {company.name}: {url}")
```

### 配置产品URL

```python
from api.models import InsuranceProduct

# 单个产品
product = InsuranceProduct.objects.get(id=17)
product.url = 'https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html'
product.save()

# 批量配置（根据产品名称）
product_urls = {
    '宏摯傳承保障計劃': 'https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html',
    '宏利環球精選': 'https://www.manulife.com.hk/zh-hk/individual/products/wealth/savings/global-select.html'
}

manulife = InsuranceCompany.objects.get(code='manulife')

for name, url in product_urls.items():
    product = InsuranceProduct.objects.filter(
        company=manulife,
        product_name__icontains=name.split('·')[0]
    ).first()

    if product:
        product.url = url
        product.save()
        print(f"✅ {product.product_name}")
```

---

## 📊 查看配置状态

### 方式1：使用配置工具

```bash
python3 setup_insurance_urls.py
# 选择选项5：查看当前配置状态
```

### 方式2：Python代码

```python
from api.models import InsuranceCompany, InsuranceProduct

# 查看所有公司配置
for company in InsuranceCompany.objects.all():
    print(f"\n📦 {company.name} ({company.code})")
    print(f"   官网: {company.website_url or '❌ 未配置'}")

    # 统计产品URL
    total = InsuranceProduct.objects.filter(
        company=company,
        is_active=True
    ).count()

    with_url = InsuranceProduct.objects.filter(
        company=company,
        is_active=True
    ).exclude(url='').count()

    print(f"   产品: {total} 个，已配置URL: {with_url} 个")
```

### 方式3：API查询

```bash
curl -X GET http://localhost:8017/api/scraper/status/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 配置完成后

### 1. 测试爬虫功能

```bash
# 运行测试脚本
cd /var/www/harry-insurance2
python3 test_scraper.py
```

### 2. 抓取公司新闻

```bash
# 使用API抓取
curl -X POST http://localhost:8017/api/scraper/company-news/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"company_id": 3}'

# 或使用Python
from api.insurance_scraper_service import scraper_service
result = scraper_service.scrape_all_companies()
```

### 3. 抓取产品资料

```bash
# 确保产品有URL后
curl -X POST http://localhost:8017/api/scraper/product-promotions/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 17}'
```

---

## 🔍 查找产品URL的方法

### 方法1：使用Gemini自动查找（推荐）

最智能的方式，Gemini会分析官网并自动匹配产品：

```bash
python3 setup_insurance_urls.py
# 选择选项3或4
```

### 方法2：从产品列表页手动复制

1. 访问公司官网产品页面
2. 找到具体产品链接
3. 复制完整URL
4. 使用Python代码或Admin后台配置

### 方法3：使用爬虫服务查找

```python
from api.insurance_scraper_service import scraper_service

# 查找公司的产品页面
pages = scraper_service.find_company_pages('https://www.manulife.com.hk/zh-hk.html')
print(f"产品页面: {pages.get('products_page')}")
```

---

## 📝 产品URL命名规范

保险公司产品URL通常遵循以下模式：

### 宏利 (Manulife)
```
https://www.manulife.com.hk/zh-hk/individual/products/[category]/[type]/[product-name].html

示例:
- 储蓄: /products/save/savings/genesis.html
- 保障: /products/protection/life/term-life.html
```

### 友邦 (AIA)
```
https://www.aia.com.hk/zh-hk/our-products/[category]/[product-name].html

示例:
- 储蓄: /our-products/savings/prime-value.html
- 保障: /our-products/protection/love-eternal.html
```

### 保诚 (Prudential)
```
https://www.prudential.com.hk/zh-hk/our-products/[category]/[product-name].html
```

---

## 🛠️ 常见问题

### Q1: 为什么需要配置URL？

爬虫系统需要知道：
1. 公司官网地址 → 查找新闻和产品页面
2. 产品页面地址 → 抓取产品资料

### Q2: 可以只配置部分公司吗？

可以！爬虫会自动跳过没有配置URL的公司。

### Q3: Gemini查找失败怎么办？

手动访问公司官网，找到产品链接后手动配置。

### Q4: 产品URL会变化吗？

可能会变化。建议：
- 定期检查URL有效性
- 使用爬虫时会自动验证
- 失败时更新URL

### Q5: 如何批量导入产品URL？

准备CSV文件：
```csv
product_id,url
17,https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html
18,https://www.manulife.com.hk/zh-hk/individual/products/wealth/savings/global-select.html
```

然后使用脚本导入：
```python
import csv
from api.models import InsuranceProduct

with open('product_urls.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        product = InsuranceProduct.objects.get(id=row['product_id'])
        product.url = row['url']
        product.save()
        print(f"✅ {product.product_name}")
```

---

## ✅ 验证清单

完成配置后，请验证：

- [ ] 11家公司都配置了官网URL
- [ ] 至少配置了一些产品的URL（用于测试）
- [ ] 运行 `quick_setup_urls.py` 无错误
- [ ] 运行 `test_scraper.py` 测试通过
- [ ] 能够成功抓取至少一家公司的新闻
- [ ] 能够成功抓取至少一个产品的资料

---

## 📚 相关文档

- [爬虫API文档](./INSURANCE_SCRAPER_API.md)
- [快速开始指南](./SCRAPER_QUICK_START.md)
- [实现总结](./SCRAPER_IMPLEMENTATION_SUMMARY.md)

---

## 💡 提示

1. **优先级**: 先配置公司官网URL，再考虑产品URL
2. **测试**: 每配置一家公司，立即测试抓取功能
3. **备份**: 配置前备份数据库
4. **日志**: 查看Django日志排查问题
5. **更新**: 定期更新URL，保持有效性
