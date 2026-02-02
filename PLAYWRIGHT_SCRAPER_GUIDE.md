# Playwright 产品爬虫工具使用指南

## 📖 概述

本工具使用 Playwright 自动爬取保险产品页面的宣传材料（PDF、视频等），并自动保存到数据库的 `product_promotions` 表。

## 🚀 快速开始

### 方式一：使用产品ID

```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html" \
  --product-id 17
```

### 方式二：使用产品名称

```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html" \
  --product-name "宏摯傳承保障計劃"
```

### 方式三：使用产品名称 + 公司名称

```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html" \
  --product-name "宏摯傳承" \
  --company-name "宏利"
```

## 🛠️ 工具架构

### 文件结构

```
/var/www/harry-insurance2/
├── scrape_product_with_playwright.py  # Django管理脚本（主入口）
└── /tmp/
    └── playwright-scraper-product.js  # Playwright爬虫脚本

/home/ubuntu/.claude/skills/playwright-skill/
├── run.js                             # Playwright运行器
└── node_modules/                      # Playwright依赖
```

### 工作流程

1. **Python脚本** (`scrape_product_with_playwright.py`)
   - 接收命令行参数（URL、产品ID/名称）
   - 查询数据库获取产品信息
   - 通过环境变量传递参数给Playwright脚本
   - 调用Playwright爬虫
   - 读取爬取结果（JSON文件）
   - 保存数据到数据库

2. **Playwright脚本** (`/tmp/playwright-scraper-product.js`)
   - 从环境变量读取参数（PRODUCT_URL、PRODUCT_ID）
   - 使用Headless浏览器访问产品页面
   - 提取页面内容：
     - 产品标题
     - 产品描述
     - PDF链接（产品小册子、说明等）
     - 视频链接
     - 相关图片
   - 保存提取结果到JSON文件
   - 截图保存到 `/tmp/product-page-screenshot.png`

3. **数据保存**
   - 检查URL是否已存在（避免重复）
   - 新增或更新 `product_promotions` 表记录
   - 记录类型：`brochure`（PDF）、`video`（视频）

## 📊 数据模型

### ProductPromotion 表结构

```python
class ProductPromotion(models.Model):
    product = ForeignKey(InsuranceProduct)  # 关联产品
    title = CharField(max_length=200)       # 宣传标题
    content_type = CharField(max_length=50) # 类型：news/brochure/guide/video/article/other
    description = TextField()               # 描述
    url = URLField()                        # 链接地址
    pdf_base64 = TextField()                # PDF的Base64编码（可选）
    published_date = DateField()            # 发布日期
    is_active = BooleanField()              # 是否启用
    created_at = DateTimeField()            # 创建时间
    updated_at = DateTimeField()            # 更新时间
```

## 🔧 参数说明

### 必需参数

- `--url`: 产品页面URL（必填）

### 产品识别参数（三选一）

- `--product-id`: 产品ID（数据库中的主键）
- `--product-name`: 产品名称（模糊匹配）
- `--product-name` + `--company-name`: 产品名称 + 公司名称（组合匹配）

## 📝 示例

### 示例1：宏利 - 宏摯傳承保障計劃

```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html" \
  --product-id 17
```

**爬取结果：**
- ✅ 12个PDF文件（产品小册子、服务说明等）
- ✅ 1个视频链接
- ✅ 自动保存到数据库

### 示例2：友邦 - 进泰优裕

```bash
# 先查找产品ID
python3 manage.py shell -c "
from api.models import InsuranceProduct
p = InsuranceProduct.objects.filter(product_name__icontains='进泰').first()
print(f'产品ID: {p.id}, 产品名: {p.product_name}')
"

# 然后运行爬虫
python3 scrape_product_with_playwright.py \
  --url "https://www.aia.com.hk/..." \
  --product-id <ID>
```

## 🎯 支持的内容类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `brochure` | 产品小册子 | 产品单张、服务说明PDF |
| `video` | 视频链接 | YouTube视频、产品介绍视频 |
| `guide` | 产品指南 | 使用手册、FAQ |
| `news` | 产品新闻 | 优惠活动、新闻稿 |
| `article` | 文章 | 专业文章、行业分析 |

## 🔍 提取的内容

Playwright爬虫会自动提取以下内容：

1. **产品标题**
   - 从 `<h1>` 标签
   - 从 `.product-title` 类
   - 从 `og:title` meta标签

2. **产品描述**
   - 从 `.product-description` 类
   - 从 `og:description` meta标签

3. **PDF文件**
   - 所有以 `.pdf` 结尾的链接
   - 包含链接文本作为标题

4. **视频链接**
   - YouTube链接
   - 包含 "video" 关键词的链接

5. **页面截图**
   - 保存全页截图到 `/tmp/product-page-screenshot.png`

## 📦 输出文件

### JSON数据文件

位置：`/tmp/product-scrape-{PRODUCT_ID}.json`

格式：
```json
{
  "product_id": 17,
  "product_url": "https://...",
  "scraped_at": "2026-02-03T10:30:00.000Z",
  "title": "宏摯傳承保障計劃",
  "description": "本計劃為儲蓄保險計劃...",
  "pdfs": [
    {
      "url": "https://...pdf",
      "title": "下載產品單張",
      "type": "brochure"
    }
  ],
  "videos": [
    {
      "url": "https://youtube.com/...",
      "title": "产品介绍",
      "type": "video"
    }
  ],
  "fullHtml": "..."
}
```

### 页面截图

位置：`/tmp/product-page-screenshot.png`

## 🚨 错误处理

### 常见错误

1. **产品不存在**
   ```
   ❌ 错误：未找到产品 '宏摯傳承保障計劃'
   ```
   **解决方法**：检查产品名称拼写，或使用产品ID

2. **页面加载超时**
   ```
   ❌ 错误: page.goto: Timeout 60000ms exceeded
   ```
   **解决方法**：检查URL是否正确，或网络连接

3. **Playwright未安装**
   ```
   📦 Playwright not found. Installing...
   ```
   **解决方法**：运行 `cd /home/ubuntu/.claude/skills/playwright-skill && npm run setup`

## 🔗 API端点

如果需要通过API调用爬虫：

```http
POST /api/scraper/product-promotions/
Content-Type: application/json

{
  "product_id": 17
}
```

**注意**：需要管理员权限（`IsAdminUser`）

## 📖 相关文档

- **数据模型**: `api/models.py:1589` - `ProductPromotion` 类
- **API视图**: `api/scraper_views.py:71` - `scrape_product_promotions` 函数
- **爬虫服务**: `api/insurance_scraper_service.py:544` - `scrape_product_promotions` 方法

## 💡 最佳实践

1. **定期更新**：每月运行一次爬虫，更新产品宣传材料
2. **数据验证**：爬取后检查数据库，确认数据正确
3. **错误监控**：查看日志文件，及时发现问题
4. **手动检查**：对于重要产品，手动检查PDF链接是否有效

## 🎓 进阶用法

### 批量爬取多个产品

```bash
# 创建批量脚本
cat > batch_scrape.sh << 'EOF'
#!/bin/bash
# 宏利产品
python3 scrape_product_with_playwright.py --url "..." --product-id 17
python3 scrape_product_with_playwright.py --url "..." --product-id 29

# 友邦产品
python3 scrape_product_with_playwright.py --url "..." --product-name "进泰优裕"
EOF

chmod +x batch_scrape.sh
./batch_scrape.sh
```

### 自定义Playwright脚本

如果需要修改提取逻辑，编辑：
```
/tmp/playwright-scraper-product.js
```

关键部分：
```javascript
// 提取产品信息
const productInfo = await page.evaluate(() => {
  // 在这里添加自定义提取逻辑
  return {
    title: '',
    pdfs: [],
    // ...
  };
});
```

## 🤝 贡献

如果发现问题或有改进建议，请联系开发团队。

## 📄 许可证

本工具为内部项目工具，仅供项目内部使用。

---

**最后更新**: 2026-02-03
**维护者**: Claude AI Assistant
