# 🎯 Product Scraper Skill - 快速指南

## 什么是Product Scraper Skill？

这是一个Claude Code技能（skill），用于自动爬取保险产品网页并提取所有相关资料。

## 如何使用？

### 方法1：直接对话触发

只需在对话中提到以下关键词，Claude会自动调用此skill：

```
"爬取产品"
"提取产品资料"
"下载产品文档"
"scrape product"
"product scraper"
```

### 方法2：提供产品信息

直接提供产品URL和ID，Claude会识别并执行：

**示例对话**：
```
用户: 帮我爬取这个产品的资料：
      https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis-centurion.html
      产品ID是29

Claude: 我来帮你爬取这个产品的资料...
        [自动调用product-scraper skill]
```

## 工作流程

当你触发这个skill时，Claude会：

1. **收集信息**
   - 确认产品URL
   - 确认产品ID或产品名称
   - 询问是否需要Gemini增强

2. **执行爬取**
   - 使用Playwright访问产品页面
   - DOM提取所有PDF和视频链接
   - （可选）Gemini智能分类

3. **保存数据**
   - 自动保存到`product_promotions`表
   - 去重检测
   - 更新或创建记录

4. **报告结果**
   - 提取的资料数量
   - 新增/更新/跳过统计
   - 核心资料标记（Gemini模式）

## 两种模式

### 🔹 基础DOM模式（默认）

**特点**：
- ✅ 提取所有PDF和视频链接
- ✅ 确保完整性，不遗漏
- ⚡ 速度快（20-30秒）
- 📦 适合批量处理

**何时使用**：
- 首次爬取产品
- 需要完整资料列表
- 批量处理多个产品

### 🔸 Gemini增强模式（可选）

**特点**：
- 🔄 先DOM提取（确保完整）
- 🤖 再Gemini分类（提升质量）
- ⭐ 自动标记核心资料
- 📝 生成资料描述
- 🎯 推断产品信息

**何时使用**：
- 需要资料分类
- 需要自动生成描述
- 有特殊筛选要求

## 对话示例

### 示例1：基础爬取

```
用户: 帮我爬取宏摯家傳承保險計劃的资料
      URL: https://www.manulife.com.hk/.../genesis-centurion.html
      产品ID: 29

Claude: 好的，我来帮你爬取这个产品的资料。

        [执行爬取...]

        ✅ 爬取完成！

        📊 结果：
        - 新增: 8 条资料
        - PDF文件: 7 个
        - 视频链接: 1 个

        提取的资料包括：
        1. 產品小冊子（香港版）
        2. 產品小冊子（澳門版）
        3. 保單服務手冊
        4. 限時保費折扣優惠
        ...
```

### 示例2：Gemini增强

```
用户: 爬取这个产品，使用Gemini进行智能分类
      https://www.manulife.com.hk/.../genesis-centurion.html
      产品ID: 29

Claude: 好的，我将使用Gemini增强模式爬取。

        [执行DOM提取...]
        [Gemini智能分析...]

        ✅ 爬取完成！

        📊 结果：
        - 产品名称: 宏摯家傳承保險計劃 (Genesis Centurion)
        - 新增: 8 条资料
        - 核心资料: 3 条 ⭐

        核心资料（重要）：
        ⭐ 宏摯家傳承保險計劃產品小冊子（香港版）
        ⭐ 宏摯家傳承保險計劃產品小冊子（澳門版）
        ⭐ 宏摯家傳承保險計劃（2年保費繳付期）推廣單張

        其他资料（5条）：
        - 限時保費折扣優惠
        - 指定計劃組合折扣
        ...
```

### 示例3：使用产品名称

```
用户: 爬取"盛世·御享"的产品资料
      URL: https://www.aia.com.hk/.../product.html

Claude: 我需要确认一下信息：
        - 产品名称: 盛世·御享
        - 保险公司: 友邦（AIA）

        [查找产品ID...]

        ✅ 找到产品: 盛世·御享 (ID: 17)

        [执行爬取...]

        ✅ 完成！提取了5条资料。
```

### 示例4：自定义要求

```
用户: 爬取产品资料，重点关注产品说明书和费率表
      URL: https://www.manulife.com.hk/.../genesis.html
      产品ID: 17

Claude: 好的，我将启用Gemini增强，并添加自定义要求：
        "重点关注产品说明书和费率表"

        [执行爬取...]

        ✅ 完成！

        找到的核心资料：
        ⭐ 產品說明書（完整版）
        ⭐ 費率表及保費示例
        ⭐ 詳細條款及細則

        其他资料（2条）：
        - 投保須知
        - 常見問題
```

## 常见问题

### Q1: 需要我手动运行命令吗？

**不需要！** 只需在对话中提到"爬取产品"等关键词，Claude会自动帮你执行。

### Q2: 如何知道是否成功？

Claude会在完成后报告：
- ✅ 提取的资料数量
- 📊 新增/更新统计
- 📝 资料列表

### Q3: 可以批量爬取吗？

可以！提供多个产品URL，Claude会逐个处理：

```
用户: 帮我爬取以下3个产品：
      1. [URL1] 产品ID: 29
      2. [URL2] 产品ID: 30
      3. [URL3] 产品名称: "盛世·御享"

Claude: 好的，我将依次爬取这3个产品...
```

### Q4: 基础模式和Gemini模式如何选择？

**默认使用基础模式**（确保完整性）

**以下情况建议Gemini模式**：
- 需要资料分类
- 需要自动生成描述
- 有特殊筛选要求

**对话示例**：
```
用户: 爬取产品，需要智能分类
Claude: 好的，我将启用Gemini增强模式
```

### Q5: 如果爬取失败怎么办？

Claude会：
1. 显示错误信息
2. 提供页面截图路径
3. 建议解决方法

**示例**：
```
❌ 爬取失败：未找到任何资料

可能原因：
- 页面结构不同
- URL错误

请检查页面截图：/tmp/product-page-screenshot.png
```

## 技术细节（供参考）

### 底层实现

- **脚本**: `/var/www/harry-insurance2/scrape_product_with_playwright.py`
- **Playwright脚本**: `/tmp/playwright-scraper-product-hybrid.js`
- **数据库表**: `product_promotions`

### 提取内容

- ✅ PDF文档（.pdf结尾的链接）
- ✅ 视频链接（YouTube、Vimeo等）
- ✅ 产品小册子
- ✅ 产品说明书
- ✅ 服务指南
- ✅ 促销资料

### 数据保存

每条资料包含：
- `title` - 资料标题
- `url` - 资料链接
- `content_type` - 类型（brochure/guide/video/news/other）
- `description` - 资料描述（Gemini生成）
- `is_important` - 是否核心资料（Gemini标记）

### 去重机制

- 基于 `product_id + url` 检测重复
- 已存在：更新标题和描述
- 不存在：创建新记录

## 优势

✅ **自动化**：无需手动操作，对话即可触发
✅ **完整性**：DOM模式确保不遗漏资料
✅ **智能化**：Gemini可选增强，智能分类
✅ **去重**：自动检测和更新，避免重复
✅ **可靠**：失败自动回退，确保数据不丢失

## 相关文档

- 完整技术文档: `/var/www/harry-insurance2/PLAYWRIGHT_SCRAPER_SUMMARY.md`
- 自定义要求指南: `/var/www/harry-insurance2/SCRAPER_CUSTOM_REQUIREMENTS_GUIDE.md`
- Skill定义: `~/.claude/skills/product-scraper/skill.md`

---

**版本**: 1.0.0
**最后更新**: 2026-02-03
**状态**: ✅ 生产就绪
