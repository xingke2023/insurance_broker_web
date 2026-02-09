# 通用网页智能分析工具

基于 Playwright + Gemini 的网页内容分析工具，支持基础 DOM 提取、AI 智能分析和微信文章提取三种模式。

## 功能特性

- ✅ **微信文章提取**：自动识别并提取标题、作者、发布时间、正文内容 ⭐ 新增
- ✅ **DOM 提取**：自动提取网页中的 PDF、视频、文章/新闻链接
- ✅ **智能识别**：自动识别文章路径特征（/article/、/news/、日期路径等）
- ✅ **Gemini 分析**：AI 智能分类和内容描述
- ✅ **截图功能**：自动保存网页截图
- ✅ **JSON 输出**：结构化数据便于二次处理

## 快速开始

### 1. 微信文章提取（自动识别）⭐

```bash
python3 web_analyzer.py --url "https://mp.weixin.qq.com/s/xxxxx"
```

**输出**：
- 文章标题、作者、发布时间
- 完整正文内容（纯文本）
- 页面截图

### 2. 基础模式（DOM 提取）

```bash
python3 web_analyzer.py --url "https://example.com"
```

### 3. 智能模式（Gemini 分析）

```bash
export GEMINI_API_KEY="your-api-key"
python3 web_analyzer.py --url "https://example.com" --gemini
```

### 4. 自定义分析要求

```bash
python3 web_analyzer.py \
  --url "https://example.com" \
  --gemini \
  --prompt "重点提取技术文档和 API 说明"
```

## 输出结果

### 微信文章模式 ⭐ 新增

```json
{
  "url": "https://mp.weixin.qq.com/s/xxxxx",
  "analysis_method": "weixin-article",
  "weixin_article": {
    "type": "weixin_article",
    "title": "5.3K Star！OpenClaw 最强\"军火库\"",
    "author": "开源星探",
    "publishTime": "2026年2月2日 08:06",
    "content": "这段时间全网都在聊这个火遍全网的...",
    "contentLength": 1525
  },
  "output_files": {
    "json": "/tmp/web-analysis-xxx.json",
    "screenshot": "/tmp/screenshot-xxx.png"
  }
}
```

### 基础模式输出

```json
{
  "url": "https://example.com",
  "analysis_method": "basic-dom",
  "dom_links": [
    {
      "title": "产品手册",
      "url": "https://example.com/manual.pdf",
      "type": "pdf"
    },
    {
      "title": "产品介绍视频",
      "url": "https://youtube.com/watch?v=xxx",
      "type": "video"
    },
    {
      "title": "2024年度新闻发布",
      "url": "https://example.com/news/2024/announcement",
      "type": "article"
    }
  ],
  "output_files": {
    "json": "/tmp/web-analysis-xxx.json",
    "screenshot": "/tmp/screenshot-xxx.png"
  }
}
```

### Gemini 模式输出

```json
{
  "url": "https://example.com",
  "analysis_method": "gemini-enhanced",
  "gemini_analysis": {
    "page_title": "产品介绍页面",
    "page_description": "这是一个产品介绍页面...",
    "content_items": [
      {
        "title": "产品手册",
        "content_type": "document",
        "description": "完整的产品使用说明",
        "url": "https://example.com/manual.pdf",
        "is_important": true
      },
      {
        "title": "2024年度新闻发布",
        "content_type": "news",
        "description": "公司年度重要新闻发布",
        "url": "https://example.com/news/2024/announcement",
        "is_important": true
      }
    ]
  }
}
```

## 依赖要求

- Python 3.7+
- Playwright (Node.js)
- Gemini API Key（智能模式）

## 文件位置

- **Python 脚本**：`/var/www/harry-insurance2/web_analyzer.py`
- **Playwright 脚本**：`/tmp/playwright-web-analyzer.js`
- **输出目录**：`/tmp/` (默认)

## 注意事项

1. 首次使用需要确保 Playwright JS 脚本已创建
2. Gemini 模式需要配置环境变量 `GEMINI_API_KEY`
3. 默认超时时间为 90 秒
4. 截图和 JSON 结果保存在 `/tmp/` 目录

## 链接识别规则

### PDF 文件
- 以 `.pdf` 结尾的链接

### 视频链接
- YouTube、Vimeo、Bilibili 等视频平台
- 包含 `video` 关键词或 `.mp4` 的链接

### 文章/新闻链接（同域名）
- 路径包含：`/article/`、`/post/`、`/blog/`、`/news/`、`/story/`、`/press/`、`/announcement/`
- 包含数字 ID：`/123/`、`/id=456`
- 包含日期：`/2024/01/`、`/20240101/`
- 自动排除：导航页、首页、分类页、关于页等
- 标题长度 ≥ 5 字符（过滤短导航文字）

## 示例场景

- 📚 批量提取文档资料
- 🎬 收集视频教程链接
- 📰 抓取新闻文章列表
- 📄 生成网页内容清单
- 🔍 智能分类网站资源
