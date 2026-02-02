# 🚀 产品爬虫快速参考

## 基本用法

```bash
python3 scrape_product_with_playwright.py --url "产品URL" --product-id ID
```

## 示例

```bash
# 宏利 - 宏摯傳承保障計劃 (ID: 17)
python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html" \
  --product-id 17
```

## 查找产品ID

```bash
python3 manage.py shell -c "
from api.models import InsuranceProduct
products = InsuranceProduct.objects.filter(product_name__icontains='宏摯')
for p in products:
    print(f'ID: {p.id}, {p.product_name}, {p.company.name}')
"
```

## 验证结果

```bash
python3 manage.py shell -c "
from api.models import ProductPromotion
print(f'总数: {ProductPromotion.objects.filter(product_id=17).count()}')
"
```

## 输出文件

- JSON数据: `/tmp/product-scrape-{ID}.json`
- 页面截图: `/tmp/product-page-screenshot.png`

## 更多详情

查看 `PLAYWRIGHT_SCRAPER_GUIDE.md`
