# 🚀 Playwright产品爬虫工具 - 完整总结

## 📋 项目概述

这是一个使用 **Playwright + Gemini AI** 的保险产品资料爬虫工具，可以自动提取产品页面的所有相关资料并保存到数据库。

### 核心特性

✅ **双模式架构**：
- **基础DOM模式**（默认）：提取页面所有PDF和视频链接，确保完整性
- **Gemini智能模式**（可选）：使用AI智能筛选和分类内容

✅ **完整性优先**：默认模式确保不遗漏任何产品资料

✅ **自定义提示词**：支持自定义Gemini分析要求

✅ **自动去重**：基于URL自动检测重复资料

✅ **数据库集成**：直接保存到 `product_promotions` 表

---

## 🎯 设计决策

### 为什么默认使用基础DOM模式？

**测试结果对比**（测试产品：宏摯家傳承保險計劃）：

| 模式 | 提取数量 | 是否完整 | 关键遗漏 |
|------|---------|---------|---------|
| **基础DOM** | 9条 | ✅ 完整 | 无 |
| Gemini默认 | 2条 | ❌ 不完整 | 产品小册子、保单服务手册等 |
| Gemini优化 | 4条 | ❌ 不完整 | 产品小册子（澳门版）等 |

**基础DOM模式提取的完整清单**（9条）：
1. ⭐ 下載產品小冊子（香港版）
2. ⭐ 下載產品小冊子（澳門版）
3. ⭐ 下載宏利保單服務手冊
4. 儲蓄及退休保障計劃 - 限時保費折扣優惠
5. 指定計劃連同合資格儲蓄計劃 - 額外保費折扣優惠
6. 宏利香港數碼服務平台指南
7. 宏利人壽保險遷冊至香港 - 常見問題
8. 產品介紹視頻
9. 理財規劃視頻

**Gemini模式遗漏的关键资料**：
- ❌ 產品小冊子（香港版）- **核心产品资料**
- ❌ 產品小冊子（澳門版）- **核心产品资料**
- ❌ 宏利保單服務手冊 - **重要服务指南**

**结论**：
- Gemini的智能筛选虽然可以提升内容质量，但会牺牲完整性
- 对于保险产品资料，**完整性 > 选择性**
- 用户反馈："尽量下载有关这个产品的全部资料"
- **解决方案**：默认使用基础DOM模式，Gemini作为可选功能

---

## 📁 文件结构

```
/var/www/harry-insurance2/
├── scrape_product_with_playwright.py          # 主脚本（Python）
├── /tmp/playwright-scraper-product.js         # 基础DOM模式脚本
├── /tmp/playwright-scraper-product-enhanced.js # Gemini增强模式脚本
└── PLAYWRIGHT_SCRAPER_*.md                    # 文档
```

---

## 🔧 使用方法

### 1. 基础用法（推荐）

**默认基础DOM模式**（提取所有资料）：
```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/.../genesis-centurion.html" \
  --product-id 29
```

### 2. 使用产品名称查找

```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/.../genesis-centurion.html" \
  --product-name "宏摯家傳承保險計劃"
```

### 3. Gemini智能模式（可选）

**启用AI智能筛选**：
```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/.../genesis-centurion.html" \
  --product-id 29 \
  --gemini
```

⚠️ **注意**：Gemini模式可能遗漏部分资料，建议仅在需要精准筛选时使用

### 4. 自定义提示词（需配合--gemini）

```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.manulife.com.hk/.../genesis-centurion.html" \
  --product-id 29 \
  --gemini \
  --requirements "只提取产品说明书和费率表，忽略促销资料"
```

---

## 📊 工作流程

### 基础DOM模式（默认）

```
1. Playwright加载产品页面
    ↓
2. 提取所有PDF链接（.pdf结尾）
    ↓
3. 提取所有视频链接（YouTube、Vimeo等）
    ↓
4. 保存到 /tmp/product-scrape-{id}.json
    ↓
5. Python读取JSON并保存到数据库
    ↓
6. 自动去重（基于URL）
```

### Gemini智能模式（可选）

```
1. Playwright加载产品页面
    ↓
2. 提取完整HTML内容
    ↓
3. 调用Gemini API智能分析
    ↓
4. Gemini返回结构化JSON：
   {
     "product_name": "产品名称",
     "product_description": "产品描述",
     "promotions": [
       {
         "title": "资料标题",
         "content_type": "brochure/guide/video/...",
         "description": "资料描述",
         "url": "完整链接",
         "is_important": true/false
       }
     ]
   }
    ↓
5. 保存到数据库（重要资料sort_order=1）
```

---

## 🗄️ 数据库结构

### ProductPromotion 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `product_id` | ForeignKey | 关联产品ID |
| `title` | CharField(200) | 资料标题 |
| `content_type` | CharField(50) | 类型（news/brochure/guide/video/article/other）|
| `description` | TextField | 资料描述 |
| `url` | URLField | 资料链接 |
| `sort_order` | Integer | 排序（1=重要，10=普通）|
| `is_active` | Boolean | 是否启用 |
| `created_at` | DateTime | 创建时间 |
| `updated_at` | DateTime | 更新时间 |

**自动去重机制**：
- 检查条件：`product_id + url`
- 如果已存在：更新记录（title, content_type, description）
- 如果不存在：创建新记录

---

## 📈 测试结果

### 测试案例 1：宏摯家傳承保險計劃

**产品URL**: https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis-centurion.html
**产品ID**: 29

**基础DOM模式结果**：
```
✅ 成功提取 9 条资料
新增: 7 条
更新: 2 条
跳过: 0 条

提取内容：
1. ⭐ 下載產品小冊子（香港版）[PDF]
2. ⭐ 下載產品小冊子（澳門版）[PDF]
3. ⭐ 下載宏利保單服務手冊 [PDF]
4. 儲蓄及退休保障計劃優惠 [PDF]
5. 指定計劃額外折扣 [PDF]
6. 數碼服務平台指南 [網頁]
7. 遷冊常見問題 [PDF]
8. 產品介紹視頻 [視頻]
9. 理財規劃視頻 [視頻]
```

**Gemini模式结果**：
```
⚠️ 僅提取 2-4 條資料
遺漏核心資料：
- 產品小冊子（香港版）❌
- 產品小冊子（澳門版）❌
- 宏利保單服務手冊 ❌
```

### 测试案例 2：宏摯傳承保障計劃

**产品URL**: https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html
**产品ID**: 17

**基础DOM模式结果**：
```
✅ 成功提取 5 条资料
```

---

## 🎨 命令参数说明

| 参数 | 简写 | 必需 | 说明 | 示例 |
|------|------|------|------|------|
| `--url` | - | ✅ | 产品页面URL | `--url "https://..."` |
| `--product-id` | - | ⚠️ | 产品ID（或使用--product-name） | `--product-id 29` |
| `--product-name` | - | ⚠️ | 产品名称（或使用--product-id） | `--product-name "宏摯家"` |
| `--company-name` | - | ❌ | 公司名称（配合产品名称） | `--company-name "宏利"` |
| `--gemini` | - | ❌ | 启用Gemini智能模式 | `--gemini` |
| `--requirements` | `--req` | ❌ | 自定义提示词（需配合--gemini） | `--requirements "只提取中文资料"` |

---

## 🔍 故障排查

### 问题1：未提取到任何资料

**可能原因**：
- 页面加载失败
- 页面结构不同（没有PDF/视频链接）
- Gemini模式过滤过于严格

**解决方法**：
```bash
# 1. 检查页面截图
ls -lh /tmp/product-page-screenshot.png

# 2. 查看JSON输出
cat /tmp/product-scrape-29.json | jq

# 3. 切换到基础DOM模式（默认）
python3 scrape_product_with_playwright.py --url "..." --product-id 29
```

### 问题2：Gemini模式遗漏资料

**解决方法**：
```bash
# 使用基础DOM模式（默认）
python3 scrape_product_with_playwright.py --url "..." --product-id 29

# 或使用宽松的自定义要求
python3 scrape_product_with_playwright.py \
  --url "..." --product-id 29 --gemini \
  --requirements "提取所有与产品相关的资料，宽松筛选"
```

### 问题3：产品ID不存在

**错误信息**：`❌ 错误：产品不存在: ID=99`

**解决方法**：
```bash
# 使用产品名称查找
python3 scrape_product_with_playwright.py \
  --url "..." \
  --product-name "宏摯家傳承"
```

---

## 📝 输出示例

### 基础DOM模式输出（/tmp/product-scrape-29.json）

```json
{
  "product_id": "29",
  "product_url": "https://www.manulife.com.hk/.../genesis-centurion.html",
  "scraped_at": "2026-02-03T10:00:00.000Z",
  "analysis_method": "basic-dom",
  "pdfs": [
    {
      "title": "下載產品小冊子（香港版）",
      "url": "https://www.manulife.com.hk/.../brochure-hk.pdf"
    },
    {
      "title": "下載產品小冊子（澳門版）",
      "url": "https://www.manulife.com.hk/.../brochure-mo.pdf"
    }
  ],
  "videos": [
    {
      "title": "產品介紹視頻",
      "url": "https://www.youtube.com/watch?v=..."
    }
  ]
}
```

### Gemini模式输出（/tmp/product-scrape-29.json）

```json
{
  "product_id": "29",
  "product_url": "https://www.manulife.com.hk/.../genesis-centurion.html",
  "scraped_at": "2026-02-03T10:00:00.000Z",
  "analysis_method": "gemini-3-flash-preview",
  "product_name": "宏摯家傳承保險計劃",
  "product_description": "宏摯家傳承保險計劃乃具有儲蓄成分的長期分紅人壽計劃...",
  "promotions": [
    {
      "title": "儲蓄及退休保障計劃 - 限時保費折扣優惠",
      "content_type": "other",
      "description": "立即申請宏利儲蓄及退休保障計劃，可享限時保費折扣優惠。",
      "url": "https://www.manulife.com.hk/.../savings-retirement.pdf",
      "is_important": false,
      "pdf_url": "https://www.manulife.com.hk/.../savings-retirement.pdf"
    }
  ]
}
```

---

## 🔐 环境变量配置

需要在 `.env` 文件或环境中配置：

```bash
# Gemini API密钥（仅Gemini模式需要）
GEMINI_API_KEY=AIzaSy...
```

---

## 📚 相关文档

- **PLAYWRIGHT_SCRAPER_GUIDE.md** - 完整使用指南
- **PLAYWRIGHT_SCRAPER_ENHANCED.md** - Gemini模式详解
- **SCRAPER_CUSTOM_REQUIREMENTS_GUIDE.md** - 自定义提示词指南
- **SCRAPER_QUICK_REF.md** - 快速参考

---

## 🎉 总结

### 优势

✅ **完整性优先**：默认模式确保不遗漏任何产品资料
✅ **灵活性高**：支持基础DOM和Gemini智能两种模式
✅ **易于使用**：简单的命令行接口
✅ **自动去重**：智能检测重复资料
✅ **数据库集成**：直接保存到现有系统

### 适用场景

| 场景 | 推荐模式 | 原因 |
|------|---------|------|
| 首次爬取产品 | **基础DOM** | 确保完整性 |
| 批量爬取多个产品 | **基础DOM** | 快速且完整 |
| 需要精准筛选 | Gemini | 智能分类 |
| 特定类型资料 | Gemini + 自定义提示词 | 定向提取 |

### 最佳实践

1. **首次爬取**：使用基础DOM模式确保完整性
2. **数据清理**：使用Gemini模式进行二次筛选
3. **定期更新**：定期重新爬取检查新资料
4. **监控结果**：检查提取数量和质量

---

**最后更新**: 2026-02-03
**版本**: 1.0
**状态**: ✅ 生产就绪
