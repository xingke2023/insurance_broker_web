---
name: product-scraper
description: Insurance product scraper using Playwright with Gemini AI enhancement. Automatically extracts product materials (PDFs, videos) from insurance product pages, intelligently filters irrelevant links, and saves to product_promotions table. Use when user wants to scrape product information, extract product materials, or analyze insurance product pages.
---

# Product Scraper Skill

自动从保险产品网页抓取产品资料（PDF、视频等）的工具，使用 Playwright + Gemini AI 智能增强。

## 功能特性

- **智能模式**（默认）：使用 Gemini 3 Flash Preview 自动分析和筛选高质量产品资料
  - 过滤无关链接（公司新闻、隐私政策、招聘信息等）
  - 自动标记核心资料（产品手册、计划书、条款等）
  - 生成内容描述

- **基础模式**：使用 DOM 直接提取所有 PDF/视频链接（添加 `--no-gemini` 参数）

- **智能保存**：自动保存到 `product_promotions` 表
  - 自动检查重复（基于 URL）
  - 支持新增/更新
  - 核心资料优先排序

## 使用方法

### 智能模式（推荐）

```bash
python3 scrape_product_with_playwright.py --url "产品URL" --product-id 产品ID
```

### 基础模式

```bash
python3 scrape_product_with_playwright.py --url "产品URL" --product-id 产品ID --no-gemini
```

### 参数说明

- `--url`: 产品页面 URL（必需）
- `--product-id`: 保险产品 ID（必需）
- `--no-gemini`: 禁用 Gemini AI 增强，使用基础 DOM 提取
- `--headless`: 无头模式运行（默认：有界面）

## 工作流程

1. **启动浏览器**：使用 Playwright 打开产品页面
2. **页面加载**：等待页面完全加载（最多 30 秒）
3. **内容提取**：
   - 智能模式：注入 Gemini 增强脚本，AI 分析页面
   - 基础模式：直接提取所有 PDF/视频链接
4. **数据保存**：保存到 `product_promotions` 表
5. **输出结果**：显示提取的资料列表

## 输出数据结构

保存到 `product_promotions` 表的字段：

- `product_id`: 保险产品 ID（外键）
- `material_type`: 资料类型（PDF/Video/Image）
- `material_url`: 资料 URL
- `material_title`: 资料标题
- `description`: 内容描述（Gemini 生成）
- `is_core_material`: 是否核心资料（Gemini 判断）
- `display_order`: 显示顺序（核心资料优先）

## 技术实现

- **浏览器自动化**：Playwright（Chromium）
- **AI 分析**：Google Gemini 3 Flash Preview
- **脚本位置**：`/tmp/playwright-scraper-product-enhanced.js`
- **数据库**：Django ORM（`product_promotions` 表）

## 示例

抓取友邦"充裕未来3"产品资料：

```bash
python3 scrape_product_with_playwright.py \
  --url "https://www.aia.com.hk/zh-hk/our-products/savings/premier-academy-3.html" \
  --product-id 1
```

## 相关文件

- `scrape_product_with_playwright.py` - 主脚本
- `/tmp/playwright-scraper-product-enhanced.js` - Playwright 注入脚本
- `PLAYWRIGHT_SCRAPER_ENHANCED.md` - 详细文档
- `api/models.py` - ProductPromotion 模型定义

## 注意事项

1. 首次运行需要安装 Playwright：`playwright install chromium`
2. 需要配置 `GEMINI_API_KEY` 环境变量（智能模式）
3. 确保 `product_id` 对应的产品已存在
4. 脚本会自动跳过已存在的资料（基于 URL）
