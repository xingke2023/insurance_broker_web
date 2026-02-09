# 网页分析工具 - 功能详解

## 🎯 核心功能升级

### ✅ 已实现的链接提取类型

| 类型 | 识别规则 | 示例 |
|------|---------|------|
| **PDF 文件** | URL 以 `.pdf` 结尾 | `https://example.com/brochure.pdf` |
| **视频链接** | YouTube、Vimeo、Bilibili 等平台 | `https://youtube.com/watch?v=xxx` |
| **文章/新闻** | 路径包含 article/news/post 等关键词 | `https://example.com/news/2024/announcement` |

---

## 📰 文章/新闻链接识别详解

### 识别条件（必须同时满足）

1. **同域名**：只提取与目标页面相同域名的链接
2. **路径特征**（满足以下任一条件）：
   - 包含文章路径：`/article/`、`/post/`、`/blog/`、`/news/`、`/story/`、`/press/`、`/announcement/`、`/notice/`
   - 包含数字 ID：`/123/`、`/456`、`/id=789`
   - 包含日期路径：`/2024/01/`、`/20240101/`
3. **标题长度**：链接文字 ≥ 5 字符（过滤短导航）
4. **排除规则**：自动排除以下页面
   - 锚点链接（`#`）
   - 网站首页（`/` 或 `/index.html`）
   - 导航页面（`/category/`、`/tag/`、`/about/`、`/contact/`、`/login/`、`/register/`、`/search/`、`/sitemap/`、`/privacy/`）

### 识别示例

✅ **会被识别为文章/新闻**：
```
https://example.com/article/2024-product-launch
https://example.com/news/123
https://example.com/blog/2024/01/announcement
https://example.com/press/company-milestone
https://example.com/post/456
https://example.com/detail/789
https://example.com/content/id=123
https://example.com/archives/20240101/article
```

❌ **不会被识别**：
```
https://example.com/                    (首页)
https://example.com/about               (关于页)
https://example.com/category/tech       (分类页)
https://example.com/#section1           (锚点)
https://example.com/news                (新闻列表页，无ID)
https://other-domain.com/article/123    (外部域名)
<a href="/page">Go</a>                  (标题太短)
```

---

## 🤖 Gemini 智能分析增强

### 自动分类类型

- `document` - 文档资料（PDF、Word等）
- `video` - 视频内容
- `article` - 技术文章、教程
- `news` - 新闻报道、公告
- `guide` - 操作指南、手册
- `brochure` - 产品宣传册
- `other` - 其他类型

### 智能特性

1. **内容描述生成**：AI 根据标题生成 50 字以内的内容摘要
2. **重要性标记**：自动识别核心资料（官方文档、重点新闻等）
3. **遗漏链接补回**：确保 DOM 提取的所有链接都被保留
4. **容错机制**：Gemini 失败时自动回退到基础 DOM 模式

---

## 📊 输出数据结构

### 基础模式（DOM）

```json
{
  "url": "https://example.com",
  "task_id": "example-com_20260203_123456",
  "analyzed_at": "2026-02-03T12:34:56.789Z",
  "analysis_method": "basic-dom",
  "dom_links": [
    {
      "title": "公司2024年度报告",
      "url": "https://example.com/reports/2024-annual.pdf",
      "type": "pdf"
    },
    {
      "title": "产品介绍视频",
      "url": "https://youtube.com/watch?v=abc123",
      "type": "video"
    },
    {
      "title": "新产品发布公告",
      "url": "https://example.com/news/2024/product-launch",
      "type": "article"
    }
  ],
  "output_files": {
    "json": "/tmp/web-analysis-example-com_20260203_123456.json",
    "screenshot": "/tmp/screenshot-example-com_20260203_123456.png"
  }
}
```

### Gemini 增强模式

```json
{
  "url": "https://example.com",
  "analysis_method": "gemini-enhanced",
  "gemini_analysis": {
    "page_title": "产品与服务中心",
    "page_description": "提供完整的产品信息、技术文档和新闻资讯",
    "content_items": [
      {
        "title": "公司2024年度报告",
        "content_type": "document",
        "description": "完整的年度财务和业务报告",
        "url": "https://example.com/reports/2024-annual.pdf",
        "is_important": true
      },
      {
        "title": "新产品发布公告",
        "content_type": "news",
        "description": "2024年最新产品系列发布信息",
        "url": "https://example.com/news/2024/product-launch",
        "is_important": true
      },
      {
        "title": "产品使用教程",
        "content_type": "guide",
        "description": "详细的产品操作步骤说明",
        "url": "https://example.com/guide/tutorial",
        "is_important": false
      }
    ]
  }
}
```

---

## 🚀 使用建议

### 场景1：快速提取资源
适合：批量下载 PDF、收集视频链接
```bash
python3 web_analyzer.py --url "https://example.com"
```

### 场景2：内容分类整理
适合：内容站点分析、资料库整理
```bash
python3 web_analyzer.py --url "https://example.com" --gemini
```

### 场景3：新闻资讯抓取
适合：媒体网站、新闻聚合
```bash
python3 web_analyzer.py --url "https://news-site.com" --gemini \
  --prompt "重点标记今日新闻和突发事件"
```

### 场景4：技术文档整理
适合：开发者社区、技术博客
```bash
python3 web_analyzer.py --url "https://tech-blog.com" --gemini \
  --prompt "区分教程、API 文档和示例代码"
```

---

## ⚡ 性能优化

- **超时设置**：90 秒（可根据网页复杂度调整）
- **去重机制**：自动按 URL 去重
- **容错处理**：URL 解析失败自动跳过
- **智能过滤**：排除导航、分类等非内容页面

---

## 📝 注意事项

1. **文章识别限制**：仅识别同域名链接（防止外链干扰）
2. **标题长度过滤**：短于 5 字符的链接被视为导航按钮
3. **路径特征匹配**：基于常见 CMS 路径规则，可能遗漏特殊结构
4. **Gemini API 限制**：需要有效的 API Key，注意调用配额

---

## 🔧 自定义扩展

如需添加更多链接类型识别，可修改 `/tmp/playwright-web-analyzer.js` 中的提取逻辑：

```javascript
// 示例：添加图片链接提取
const imageLinks = await page.$$eval('img[src]', images => {
  return images.map(img => ({
    title: img.alt || '图片',
    url: img.src,
    type: 'image'
  }));
});
```
