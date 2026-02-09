# 通用网页分析工具 - 完整使用指南

## 🎯 核心功能

1. **自动识别页面类型**
   - 微信公众号文章 → 提取标题、作者、正文
   - 普通网页 → 提取PDF、视频、文章链接

2. **智能代理管理**
   - 默认直连访问（快速、省钱）
   - 遇到验证自动启用代理（无需手动干预）

3. **AI增强分析**（可选）
   - Gemini智能分类
   - 内容描述生成
   - 重点标记

---

## 🚀 快速开始

### 1. 最简单用法（推荐）

```bash
# 直接访问，遇到问题自动处理
python3 web_analyzer.py --url "https://example.com"
```

**工作流程**：
1. 先尝试直接访问
2. 如果遇到验证页面 → 自动切换代理重试
3. 返回结果

### 2. 配置代理信息（一次配置）

```bash
# 方式1：命令行参数
python3 web_analyzer.py \
  --url "https://mp.weixin.qq.com/s/xxxxx" \
  --proxy-server "http://us.1024proxy.io:3000" \
  --proxy-user "username" \
  --proxy-pass "password"

# 方式2：环境变量（推荐）
export PROXY_SERVER="http://us.1024proxy.io:3000"
export PROXY_USER="wk4n3645-region-Rand"
export PROXY_PASS="tw2fvu8c"

python3 web_analyzer.py --url "URL"
```

---

## 📋 使用场景

### 场景1：分析普通网页

```bash
# GitHub仓库
python3 web_analyzer.py --url "https://github.com/xxx/xxx"

# 新闻网站
python3 web_analyzer.py --url "https://news-site.com"

# 技术博客
python3 web_analyzer.py --url "https://blog.example.com"
```

**输出**：提取所有PDF、视频、文章链接

### 场景2：提取微信文章

```bash
# 配置代理信息（只需一次）
export PROXY_SERVER="http://us.1024proxy.io:3000"
export PROXY_USER="username"
export PROXY_PASS="password"

# 直接访问微信文章
python3 web_analyzer.py --url "https://mp.weixin.qq.com/s/xxxxx"
```

**自动处理**：
1. 首次尝试直接访问
2. 遇到验证 → 自动启用代理
3. 提取标题、作者、发布时间、正文

### 场景3：AI智能分析

```bash
export GEMINI_API_KEY="your-api-key"

python3 web_analyzer.py \
  --url "https://example.com" \
  --gemini \
  --prompt "重点标记技术文档"
```

**输出**：AI分类、内容描述、重要性标记

---

## ⚙️ 命令参数详解

### 基础参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--url` | 目标网页URL（必需） | `--url "https://example.com"` |
| `--gemini` | 启用Gemini分析 | `--gemini` |
| `--prompt` | 自定义分析提示 | `--prompt "重点标记产品资料"` |

### 代理参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--proxy` | 强制启用代理 | 不启用 |
| `--proxy-server` | 代理服务器地址 | - |
| `--proxy-user` | 代理用户名 | - |
| `--proxy-pass` | 代理密码 | - |
| `--no-auto-proxy` | 禁用自动代理 | 启用 |

---

## 🤖 自动代理机制

### 工作原理

```
访问网页（不使用代理）
    ↓
成功？
    ↓ YES
返回结果 ✅
    ↓ NO（检测到验证页面）
自动启用代理重试
    ↓
返回结果 ✅
```

### 触发条件

以下情况会自动启用代理：
- ✅ 微信"环境异常"验证页面
- ✅ 其他反爬虫验证机制
- ✅ 返回结果包含 `verification: true`

### 禁用自动代理

```bash
# 强制只尝试一次，不自动重试
python3 web_analyzer.py \
  --url "https://example.com" \
  --no-auto-proxy
```

---

## 📊 输出结果

### 1. 微信文章模式

```json
{
  "analysis_method": "weixin-article",
  "weixin_article": {
    "title": "文章标题",
    "author": "作者名",
    "publishTime": "2026年2月2日 08:06",
    "content": "完整正文...",
    "contentLength": 1525
  }
}
```

### 2. 链接提取模式

```json
{
  "analysis_method": "basic-dom",
  "dom_links": [
    {"title": "文档.pdf", "url": "...", "type": "pdf"},
    {"title": "视频", "url": "...", "type": "video"},
    {"title": "新闻", "url": "...", "type": "article"}
  ]
}
```

### 3. Gemini分析模式

```json
{
  "analysis_method": "gemini-enhanced",
  "gemini_analysis": {
    "page_title": "页面标题",
    "content_items": [
      {
        "title": "内容标题",
        "content_type": "document",
        "description": "内容描述",
        "is_important": true
      }
    ]
  }
}
```

---

## 💡 最佳实践

### 1. 一次配置，永久使用

在 `~/.bashrc` 或 `~/.zshrc` 中添加：

```bash
# 代理配置
export PROXY_SERVER="http://us.1024proxy.io:3000"
export PROXY_USER="your-username"
export PROXY_PASS="your-password"

# Gemini API（可选）
export GEMINI_API_KEY="your-api-key"
```

然后直接使用：

```bash
python3 web_analyzer.py --url "任意URL"
```

### 2. 批量处理

```bash
#!/bin/bash
# batch_analyze.sh

urls=(
  "https://mp.weixin.qq.com/s/article1"
  "https://mp.weixin.qq.com/s/article2"
  "https://example.com/page"
)

for url in "${urls[@]}"; do
  python3 web_analyzer.py --url "$url"
  sleep 5  # 避免过于频繁
done
```

### 3. 结果保存

```bash
# 保存到指定目录
python3 web_analyzer.py --url "URL" > results/output.log
```

---

## 🎯 使用技巧

### 技巧1：先测试，再批量

```bash
# 1. 先测试单个URL
python3 web_analyzer.py --url "https://example.com"

# 2. 确认工作正常后再批量
./batch_analyze.sh
```

### 技巧2：查看详细日志

工具会实时输出处理过程：
- 🚀 启动信息
- 📥 页面加载状态
- ✅ 提取进度
- ⚠️ 自动代理切换

### 技巧3：多次运行同一URL

```bash
# 第1次：可能遇到验证（自动切换代理）
python3 web_analyzer.py --url "https://mp.weixin.qq.com/s/xxx"

# 第2次：使用代理IP可能直接成功
python3 web_analyzer.py --url "https://mp.weixin.qq.com/s/xxx"
```

---

## ⚠️ 注意事项

1. **代理账号安全**
   - 不要将密码硬编码到脚本
   - 使用环境变量
   - 定期更换密码

2. **访问频率控制**
   - 批量处理时加入延迟（`sleep 5`）
   - 避免短时间大量请求

3. **代理成本**
   - 按流量计费，自动模式会增加成本
   - 普通网站建议使用 `--no-auto-proxy`

4. **遵守网站规则**
   - 遵守 robots.txt
   - 遵守网站服务条款
   - 不进行恶意爬取

---

## 📖 相关文档

- **功能详解**：`WEB_ANALYZER_FEATURES.md`
- **代理配置**：`WEB_ANALYZER_PROXY_GUIDE.md`
- **快速入门**：`WEB_ANALYZER_README.md`

---

## 🆘 常见问题

### Q: 为什么不直接使用代理？

A: 因为：
- 代理有成本（按流量计费）
- 代理会降低速度
- 大部分网站不需要代理

### Q: 自动代理会增加多少成本？

A: 仅在遇到验证时才使用，通常增加 5-10% 流量成本。

### Q: 如何确认代理生效？

A: 查看日志输出：
```
代理: ✅ 启用
代理地址: http://us.1024proxy.io:3000
🌐 使用代理配置...
```

### Q: 可以使用免费代理吗？

A: 可以，但不推荐：
- 免费代理不稳定
- 成功率低
- 可能有安全风险

推荐使用付费代理服务。
