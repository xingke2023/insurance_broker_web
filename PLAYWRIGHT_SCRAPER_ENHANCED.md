# 🚀 Playwright产品爬虫工具 - Gemini智能增强版

## 📖 概述

本工具使用 **Playwright + Gemini 3 Flash Preview** 智能爬取保险产品页面，自动筛选和提取高质量的产品宣传材料。

## ✨ 核心特性

### 🤖 Gemini智能分析（默认模式）

- **自动筛选**：过滤无关链接（公司新闻、隐私政策、Cookie政策等）
- **智能分类**：自动识别内容类型（brochure/guide/video/article等）
- **重要性标记**：标识核心资料（产品单张、说明书等）
- **内容描述**：自动生成简要说明（50字以内）
- **准确提取**：只保存与产品直接相关的资料

### 🎯 对比两种模式

| 特性 | Gemini智能模式 | 基础DOM模式 |
|------|---------------|------------|
| **分析方式** | AI智能理解 | DOM直接提取 |
| **准确度** | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐ 中 |
| **过滤能力** | 自动过滤无关内容 | 提取所有PDF链接 |
| **内容描述** | 自动生成 | 无 |
| **重要性标记** | 自动标记核心资料 | 无 |
| **速度** | 较慢（需调用API） | 快 |
| **成本** | 有API调用成本 | 无 |

## 🚀 使用方法

### 默认模式（Gemini智能分析）

```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html" \
  --product-id 17
```

### 基础模式（DOM直接提取）

```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html" \
  --product-id 17 \
  --no-gemini
```

## 📊 实际效果对比

### 案例：宏利 - 宏摯傳承保障計劃

**Gemini智能模式**：
- ✅ 提取 2 条高质量资料
- ✅ 自动过滤 10+ 条无关链接
- ✅ 标记 1 条核心资料（储蓄及退休计划限时保费折扣）
- ✅ 生成准确的内容描述

**基础DOM模式**：
- ⚠️ 提取 12 个PDF链接
- ⚠️ 包含无关资料（常见问题、公司政策等）
- ⚠️ 无法区分重要性
- ⚠️ 无内容描述

## 🤖 Gemini分析示例

### 输入（产品页面）
```
https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html
```

### 输出（智能分析结果）

```json
{
  "product_name": "宏摯傳承保障計劃",
  "product_description": "這是一款儲蓄保險計劃，提供整付保費或3、5、10、15年保費繳付期...",
  "promotions": [
    {
      "title": "儲蓄及退休計劃限時保費折扣",
      "content_type": "brochure",
      "description": "成功投保指定儲蓄及退休計劃，可享限時保費折扣優惠。",
      "url": "https://www.manulife.com.hk/.../savings-retirement.pdf",
      "is_important": true
    },
    {
      "title": "跨計劃組合投保優惠",
      "content_type": "brochure",
      "description": "申請指定計劃連同合資格儲蓄計劃，第2保單年度各計劃可享高達15%及8%額外折扣。",
      "url": "https://www.manulife.com.hk/.../cross-sell-combos.pdf",
      "is_important": false
    }
  ]
}
```

### 数据库保存效果

- ⭐ **核心资料**（is_important=true）：`sort_order=1`（优先显示）
- 📄 **一般资料**（is_important=false）：`sort_order=10`
- 📝 **自动添加描述**：保存到 `description` 字段
- 🏷️ **智能分类**：准确的 `content_type`

## 🛠️ 技术实现

### 工作流程

1. **Playwright爬取** → 访问产品页面，获取完整HTML
2. **内容清理** → 移除script、style、nav等无用标签
3. **Gemini分析** → 调用API智能识别和提取资料
4. **结果解析** → 解析JSON，标记重要性
5. **保存数据库** → 写入 `product_promotions` 表

### Gemini Prompt设计

```
你是一个专业的保险产品信息提取专家。请分析以下保险产品网页内容...

要求：
1. 只提取与产品直接相关的资料（产品小册子、说明书、服务指南、产品视频等）
2. 过滤掉无关链接（如：公司新闻、招聘信息、隐私政策、Cookie政策等）
3. URL必须是完整的绝对路径
4. is_important标记核心资料（如产品单张、产品说明书）
5. 优先提取PDF资料链接
```

### API配置

- **模型**：`gemini-3-flash-preview`
- **API端点**：`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`
- **认证**：通过环境变量 `GEMINI_API_KEY`

## 📝 使用场景

### 推荐使用Gemini模式

✅ 产品页面内容复杂，包含大量无关链接
✅ 需要区分核心资料和辅助资料
✅ 需要自动生成内容描述
✅ 追求高质量数据

### 推荐使用基础模式

✅ 产品页面简单清晰
✅ 快速批量爬取
✅ 预算有限（避免API调用成本）
✅ 手动审核和筛选

## 🔧 参数说明

```bash
python3 scrape_product_with_playwright.py [选项]

必需参数:
  --url URL              产品页面URL

产品识别（三选一）:
  --product-id ID        产品ID（数据库主键）
  --product-name NAME    产品名称（模糊匹配）
  --product-name + --company-name  产品名称 + 公司名称

可选参数:
  --no-gemini           禁用Gemini智能分析（使用基础DOM模式）
```

## 📂 输出文件

### JSON数据文件

```
/tmp/product-scrape-{PRODUCT_ID}.json
```

**Gemini模式特有字段**：
- `analysis_method`: "gemini-3-flash-preview"
- `product_description`: 产品简要描述
- `promotions[].description`: 资料描述
- `promotions[].is_important`: 重要性标记

### 页面截图

```
/tmp/product-page-screenshot.png
```

## 🎯 最佳实践

### 1. 优先使用Gemini模式

```bash
# 推荐：默认使用Gemini智能分析
python3 scrape_product_with_playwright.py --url "..." --product-id 17
```

### 2. 定期更新产品资料

```bash
# 每月更新一次
0 0 1 * * cd /var/www/harry-insurance2 && python3 scrape_product_with_playwright.py --url "..." --product-id 17
```

### 3. 验证提取结果

```bash
# 查看JSON结果
cat /tmp/product-scrape-17.json | jq '.promotions[] | {title, is_important, url}'

# 查看数据库记录
python3 manage.py shell -c "
from api.models import ProductPromotion
promos = ProductPromotion.objects.filter(product_id=17).order_by('sort_order')
for p in promos:
    print(f'[{p.sort_order}] {p.title} - {p.description[:50]}...')
"
```

### 4. 批量处理脚本

```bash
cat > batch_scrape_gemini.sh << 'EOF'
#!/bin/bash
# 宏利产品（使用Gemini智能分析）
python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/.../genesis.html" \
  --product-id 17

python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/.../altra.html" \
  --product-id 29

# 等待1秒（避免API限流）
sleep 1
EOF

chmod +x batch_scrape_gemini.sh
./batch_scrape_gemini.sh
```

## 🚨 注意事项

### API配额管理

- Gemini API有免费配额限制
- 建议控制爬取频率（每次间隔1-2秒）
- 监控API使用情况

### 错误处理

```bash
# 如果Gemini API调用失败，脚本会自动报错
❌ 错误: Gemini API错误: Resource exhausted

# 解决方法：
# 1. 等待配额恢复
# 2. 使用基础模式：添加 --no-gemini 参数
```

## 📖 相关文档

- **完整指南**: `PLAYWRIGHT_SCRAPER_GUIDE.md`
- **快速参考**: `SCRAPER_QUICK_REF.md`
- **基础版脚本**: `/tmp/playwright-scraper-product.js`
- **增强版脚本**: `/tmp/playwright-scraper-product-enhanced.js`

---

**最后更新**: 2026-02-03
**版本**: v2.0 (Gemini增强版)
**维护者**: Claude AI Assistant
