# 🎯 自定义爬取要求指南

## 概述

工具支持通过 `--requirements` 参数自定义Gemini的分析要求，实现精准爬取。

## 基本用法

```bash
python3 scrape_product_with_playwright.py \
  --url "产品URL" \
  --product-id 产品ID \
  --requirements "您的自定义要求"
```

## 实用场景

### 1. 按内容类型筛选

```bash
# 只提取产品说明书和用户指南
--requirements "只提取产品说明书和用户指南，忽略促销资料"

# 只提取视频内容
--requirements "只提取产品介绍视频和教学视频，忽略PDF文档"

# 只提取英文资料
--requirements "只提取英文版本的资料，忽略中文资料"
```

### 2. 按重要性筛选

```bash
# 只提取核心资料
--requirements "只提取产品核心资料：产品说明书、费率表、条款，忽略宣传单张"

# 提取完整文档
--requirements "提取所有详细的产品文档，包括完整版说明书、详细条款、FAQ文档"
```

### 3. 按主题筛选

```bash
# 理赔相关
--requirements "只提取理赔相关的资料：理赔流程、理赔案例、索赔表格"

# 投保相关
--requirements "只提取投保相关的资料：投保须知、健康告知、投保流程"

# 产品对比
--requirements "只提取产品对比资料和竞品分析文档"
```

### 4. 按格式筛选

```bash
# 只要PDF
--requirements "只提取PDF格式的文档，忽略视频和其他链接"

# 只要视频
--requirements "只提取视频链接（YouTube、产品演示视频），忽略PDF文档"

# 交互式内容
--requirements "优先提取在线计算器、产品配置工具等交互式页面链接"
```

### 5. 按时效性筛选

```bash
# 最新资料
--requirements "只提取2024年及以后发布的最新产品资料"

# 促销活动
--requirements "只提取当前有效的促销活动和优惠信息"
```

### 6. 组合条件

```bash
# 多个条件
--requirements "只提取：1) 中文PDF文档 2) 产品说明书和费率表 3) 2024年发布的资料"

# 排除条件
--requirements "提取所有产品资料，但排除：公司年报、企业社会责任报告、招聘信息"
```

## 完整示例

### 示例1：提取理赔文档

```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/.../genesis.html" \
  --product-id 17 \
  --requirements "只提取理赔相关的文档：理赔指南、理赔流程、索赔表格、理赔案例"
```

### 示例2：提取产品说明书

```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.aia.com.hk/.../product.html" \
  --product-id 5 \
  --requirements "只提取完整的产品说明书和详细条款，必须是PDF格式，至少50页以上"
```

### 示例3：提取视频教程

```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.prudential.com.hk/.../plan.html" \
  --product-id 12 \
  --requirements "只提取产品介绍视频、投保流程视频、使用教程视频，忽略所有PDF文档"
```

### 示例4：提取英文资料

```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.fwd.com.hk/.../insurance.html" \
  --product-id 8 \
  --requirements "只提取英文版本的产品资料，包括：English brochure, Product guide, Terms and conditions"
```

## 提示词编写技巧

### ✅ 好的提示词

1. **明确具体**
   ```
   "只提取产品说明书（Product Brochure）和投保须知（Application Guide）"
   ```

2. **列举关键词**
   ```
   "提取包含以下关键词的资料：保障范围、理赔流程、退保价值、现金价值"
   ```

3. **说明格式要求**
   ```
   "只提取PDF格式的完整文档，页数至少20页以上，忽略单页宣传单"
   ```

4. **排除不需要的**
   ```
   "提取所有产品文档，但排除：公司简介、招聘信息、联系我们、隐私政策"
   ```

### ❌ 不好的提示词

1. **过于模糊**
   ```
   "提取重要的资料"  # 什么是重要？
   ```

2. **过于宽泛**
   ```
   "提取所有内容"  # 等于没有筛选
   ```

3. **逻辑矛盾**
   ```
   "只提取PDF，但必须包含视频内容"  # 矛盾
   ```

## 效果验证

### 查看提取结果

```bash
# 查看JSON输出
cat /tmp/product-scrape-17.json | jq '{
  product_name,
  total: .promotions | length,
  titles: [.promotions[].title]
}'

# 查看数据库记录
python3 manage.py shell -c "
from api.models import ProductPromotion
promos = ProductPromotion.objects.filter(product_id=17).order_by('-created_at')[:5]
for p in promos:
    print(f'{p.title} - {p.description}')
"
```

### 对比不同要求的效果

```bash
# 默认模式（无自定义要求）
python3 scrape_product_with_playwright.py --url "..." --product-id 17
# 结果：提取 5 条资料

# 自定义要求：只要说明书
python3 scrape_product_with_playwright.py --url "..." --product-id 17 \
  --requirements "只提取产品说明书"
# 结果：提取 1 条资料（更精准）

# 自定义要求：排除促销
python3 scrape_product_with_playwright.py --url "..." --product-id 17 \
  --requirements "提取所有产品文档，但排除促销活动和优惠信息"
# 结果：提取 3 条资料（过滤掉2条促销）
```

## 常见问题

### Q1: 提取结果为0条？

**原因**：自定义要求过于严格，没有匹配的资料

**解决**：
1. 放宽条件
2. 检查提示词是否准确
3. 先用默认模式查看有哪些资料，再调整要求

### Q2: 如何提取特定语言？

```bash
--requirements "只提取繁体中文资料，忽略英文和简体中文"
```

### Q3: 如何按文件大小筛选？

```bash
--requirements "只提取完整的产品文档（PDF页数大于20页），忽略单页宣传单"
```

### Q4: 如何提取最新资料？

```bash
--requirements "只提取2024年1月之后发布的最新产品资料和更新说明"
```

## 高级用法

### 批量处理不同要求

```bash
# 创建批量脚本
cat > batch_scrape_custom.sh << 'EOF'
#!/bin/bash

PRODUCT_ID=17
URL="https://www.manulife.com.hk/.../genesis.html"

# 1. 提取产品说明书
python3 scrape_product_with_playwright.py \
  --url "$URL" --product-id $PRODUCT_ID \
  --requirements "只提取产品说明书和详细条款"

sleep 2

# 2. 提取理赔文档
python3 scrape_product_with_playwright.py \
  --url "$URL" --product-id $PRODUCT_ID \
  --requirements "只提取理赔相关文档"

sleep 2

# 3. 提取视频教程
python3 scrape_product_with_playwright.py \
  --url "$URL" --product-id $PRODUCT_ID \
  --requirements "只提取视频教程"
EOF

chmod +x batch_scrape_custom.sh
./batch_scrape_custom.sh
```

## 总结

- ✅ 使用 `--requirements` 参数实现精准爬取
- ✅ 明确具体的提示词效果最好
- ✅ 可以组合多个条件
- ✅ 验证提取结果，调整要求
- ✅ 善用排除条件过滤无关内容

---

**最后更新**: 2026-02-03
**相关文档**: `PLAYWRIGHT_SCRAPER_ENHANCED.md`
