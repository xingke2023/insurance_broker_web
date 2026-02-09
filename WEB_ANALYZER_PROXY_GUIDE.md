# 网页分析工具 - 代理配置指南

## 🌐 为什么需要代理？

使用代理可以：
- ✅ **绕过地域限制**：访问特定地区的网站
- ✅ **更换IP地址**：避免触发反爬虫验证（如微信验证页面）
- ✅ **提高成功率**：降低被封禁的风险
- ✅ **并发爬取**：多IP轮换，提高效率

---

## 📋 代理配置参考

### 示例：澳门文章爬虫项目

参考 `/var/www/aomen_crawl_articles/auto_crawler1.py` 的配置：

```python
# 1024代理配置
PROXY_HOST = 'us.1024proxy.io:3000'
PROXY_USERNAME = 'wk4n3645-region-Rand'
PROXY_PASSWORD = 'tw2fvu8c'

# Playwright 代理配置格式
proxy_config = {
    'server': f'http://{host}:{port}',
    'username': username,
    'password': password
}
```

---

## 🚀 使用方法

### 1. 基础代理（无认证）

```bash
python3 web_analyzer.py \
  --url "https://example.com" \
  --proxy \
  --proxy-server "http://proxy.example.com:8080"
```

### 2. 带认证的代理（推荐）

```bash
python3 web_analyzer.py \
  --url "https://mp.weixin.qq.com/s/xxxxx" \
  --proxy \
  --proxy-server "http://us.1024proxy.io:3000" \
  --proxy-user "your-username" \
  --proxy-pass "your-password"
```

### 3. 代理 + Gemini 分析

```bash
export GEMINI_API_KEY="your-api-key"

python3 web_analyzer.py \
  --url "https://example.com" \
  --proxy \
  --proxy-server "http://proxy.example.com:8080" \
  --proxy-user "username" \
  --proxy-pass "password" \
  --gemini
```

---

## 🔧 代理服务器格式

### HTTP 代理
```bash
--proxy-server "http://host:port"
```

### HTTPS 代理
```bash
--proxy-server "https://host:port"
```

### SOCKS5 代理
```bash
--proxy-server "socks5://host:port"
```

---

## 💡 实战示例

### 场景1：绕过微信验证

```bash
# 使用美国代理访问微信文章
python3 web_analyzer.py \
  --url "https://mp.weixin.qq.com/s/qqGIZtKfzFolkB7vqqt_Fg" \
  --proxy \
  --proxy-server "http://us.1024proxy.io:3000" \
  --proxy-user "wk4n3645-region-Rand" \
  --proxy-pass "tw2fvu8c"
```

**预期效果**：
- 使用美国IP访问
- 绕过频繁访问限制
- 成功提取文章内容

### 场景2：批量爬取（轮换IP）

```bash
#!/bin/bash
# 多个URL使用同一代理

URLS=(
  "https://mp.weixin.qq.com/s/article1"
  "https://mp.weixin.qq.com/s/article2"
  "https://mp.weixin.qq.com/s/article3"
)

for url in "${URLS[@]}"; do
  python3 web_analyzer.py \
    --url "$url" \
    --proxy \
    --proxy-server "http://us.1024proxy.io:3000" \
    --proxy-user "wk4n3645-region-Rand" \
    --proxy-pass "tw2fvu8c"

  # 每次爬取后等待5秒
  sleep 5
done
```

---

## 📊 代理配置验证

### 检查代理是否生效

工具会在启动时显示：

```
🚀 启动网页分析...
   URL: https://example.com
   模式: DOM基础提取
   代理: ✅ 启用          ← 已启用代理
   代理地址: http://us.1024proxy.io:3000

🌐 使用代理配置...      ← Playwright已使用代理
```

### 验证IP地址

可以访问 IP 查询网站验证：

```bash
python3 web_analyzer.py \
  --url "https://ipinfo.io" \
  --proxy \
  --proxy-server "http://proxy.example.com:8080"
```

---

## ⚠️ 常见问题

### 1. 代理连接超时

**问题**：`Proxy connection timeout`

**解决**：
- 检查代理服务器地址是否正确
- 确认代理服务器可访问（防火墙规则）
- 增加超时时间

### 2. 代理认证失败

**问题**：`407 Proxy Authentication Required`

**解决**：
- 检查用户名和密码是否正确
- 确认代理账户未过期

### 3. 仍然触发验证

**问题**：使用代理后仍遇到微信验证页面

**解决**：
- 更换代理服务器（不同地区）
- 增加访问间隔（`sleep` 时间）
- 使用住宅IP代理（而非数据中心IP）

---

## 🎯 代理服务商推荐

### 1. 1024Proxy（示例中使用）
- 支持全球多地区
- 动态IP轮换
- 适合爬虫场景

### 2. Bright Data（Luminati）
- 高质量住宅IP
- 成功率高
- 价格较高

### 3. SmartProxy
- 性价比高
- 支持SOCKS5
- 适合中小规模爬取

---

## 📝 技术细节

### Playwright 代理配置

工具内部使用以下配置：

```javascript
const browser = await chromium.launch({
  headless: true,
  proxy: {
    server: 'http://us.1024proxy.io:3000',
    username: 'your-username',
    password: 'your-password'
  }
});
```

### 代理传递流程

```
Python命令行参数
    ↓
环境变量（USE_PROXY, PROXY_SERVER等）
    ↓
Playwright JavaScript脚本
    ↓
Chromium浏览器代理配置
```

---

## 🔒 安全提示

1. **不要硬编码密码**：使用环境变量或配置文件
2. **定期更换代理**：避免单一IP被封禁
3. **遵守法律法规**：仅用于合法的数据采集
4. **保护凭证安全**：不要将代理账号上传到公开仓库

---

## 📖 参考资源

- 澳门爬虫项目：`/var/www/aomen_crawl_articles/auto_crawler1.py`
- Playwright代理文档：https://playwright.dev/docs/network#http-proxy
- 工具源码：`/tmp/playwright-web-analyzer.js`
