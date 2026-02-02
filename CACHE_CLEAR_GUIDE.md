# 前端更新后清除缓存指南

## 问题说明

当前端代码更新并构建后（`npm run build`），网站已经部署了新版本，但用户可能看不到变化。这是由于以下缓存层导致的：

1. **浏览器缓存** - 用户浏览器缓存了旧的 JS/CSS 文件
2. **Cloudflare CDN 缓存** - CDN 缓存了旧版本的静态资源

## 当前部署状态 ✅

**构建时间**: 2026-01-01 13:42:08 +0800

**新构建文件**:
- `/assets/index-DS92YfeP.js` (2.2MB)
- `/assets/index-BychXnPt.css` (102KB)
- `/index.html` (6.3KB)

**验证命令**:
```bash
curl -s https://www.hongkong-insurance.com/ | grep "index-"
```

**预期输出**:
```html
<script type="module" crossorigin src="/assets/index-DS92YfeP.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-BychXnPt.css">
```

✅ 新版本已经部署到生产环境！

---

## 解决方案

### 方案 1: 清除浏览器缓存（用户端）

**Chrome / Edge**:
1. 按 `Ctrl + Shift + Delete` (Windows) 或 `Cmd + Shift + Delete` (Mac)
2. 选择"缓存的图片和文件"
3. 时间范围选择"全部时间"
4. 点击"清除数据"
5. 刷新页面 `Ctrl + F5` (硬刷新)

**或者使用硬刷新**:
- Windows: `Ctrl + F5` 或 `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**或者使用无痕模式测试**:
- Chrome: `Ctrl + Shift + N` (Windows) 或 `Cmd + Shift + N` (Mac)
- 在无痕窗口打开网站，这样会跳过缓存

---

### 方案 2: 清除 Cloudflare CDN 缓存（服务器端）

#### 2.1 通过 Cloudflare 控制台（推荐）

1. 登录 Cloudflare: https://dash.cloudflare.com/
2. 选择域名: `hongkong-insurance.com`
3. 进入 **Caching** → **Configuration**
4. 点击 **Purge Everything** (清除所有缓存)
5. 确认操作

**注意**: 清除所有缓存可能会暂时影响网站性能（CDN 需要重新缓存所有文件）

#### 2.2 通过 Cloudflare API（高级）

如果只想清除特定文件的缓存：

```bash
# 设置 Cloudflare API 凭证
CLOUDFLARE_ZONE_ID="your-zone-id"
CLOUDFLARE_API_TOKEN="your-api-token"

# 清除特定文件
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "files": [
      "https://www.hongkong-insurance.com/",
      "https://www.hongkong-insurance.com/assets/index-DS92YfeP.js",
      "https://www.hongkong-insurance.com/assets/index-BychXnPt.css"
    ]
  }'
```

---

### 方案 3: 禁用浏览器缓存（开发者工具）

**Chrome DevTools**:
1. 按 `F12` 打开开发者工具
2. 点击 **Network** 标签
3. 勾选 **Disable cache** (禁用缓存)
4. 保持 DevTools 打开状态
5. 刷新页面

这样在开发者工具打开时，浏览器会跳过缓存。

---

## 验证新版本已加载

### 检查 1: 查看控制台日志

1. 按 `F12` 打开开发者工具
2. 点击 **Console** 标签
3. 查找 "API配置:" 日志
4. 应该能看到 API_URL 配置信息

### 检查 2: 查看 Network 请求

1. 按 `F12` 打开开发者工具
2. 点击 **Network** 标签
3. 刷新页面
4. 查找 `index-DS92YfeP.js` 文件
5. 点击查看文件内容，确认是最新版本

### 检查 3: 测试新功能

访问以下页面测试新部署的功能：

1. **AI保险顾问**: https://www.hongkong-insurance.com/ai-consultant
   - 应该能看到优化后的AI推荐界面
   - 填写客户信息后应该快速返回结果（缓存生效）

2. **客户案例库**: https://www.hongkong-insurance.com/customer-case-library
   - 应该能看到 15 个客户案例
   - 案例按人生阶段分类展示

---

## Nginx 缓存配置

当前 Nginx 配置 (`/etc/nginx/sites-enabled/hongkong-insurance2.conf`):

```nginx
# 静态资源缓存（第156-159行）
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

这个配置告诉浏览器缓存静态文件 1 年。Vite 构建时会自动生成带哈希的文件名（如 `index-DS92YfeP.js`），所以：

- ✅ 文件名变化时，浏览器会自动请求新文件
- ✅ 不需要修改 Nginx 缓存配置
- ⚠️ 但首次访问时可能仍加载旧的 `index.html`

---

## 最佳实践

### 开发环境测试

在本地测试新功能：

```bash
# 启动开发服务器
cd /var/www/harry-insurance2/frontend
npm run dev

# 访问 http://localhost:8008
# 开发模式下没有缓存问题
```

### 生产部署流程

1. **本地测试**: `npm run dev` 测试功能
2. **构建生产版本**: `npm run build`
3. **重载 Nginx**: `sudo systemctl reload nginx`
4. **清除 CDN 缓存**: Cloudflare 控制台清除缓存
5. **验证部署**: 无痕模式访问网站验证

---

## 常见问题

### Q1: 为什么硬刷新后还是看不到变化？

A: 可能是 Cloudflare CDN 缓存。需要在 Cloudflare 控制台清除缓存。

### Q2: 如何确认用户看到的是新版本？

A: 在浏览器控制台运行：
```javascript
console.log(document.querySelector('script[src*="index-"]').src);
```
应该显示 `index-DS92YfeP.js`

### Q3: 是否需要每次都清除 Cloudflare 缓存？

A: 不需要。因为 Vite 构建时文件名包含哈希值，新版本会有新的文件名。但 `index.html` 可能被缓存，所以首次部署后建议清除一次。

### Q4: 如何避免缓存问题？

A:
- 开发时使用 `npm run dev`（无缓存）
- 部署后使用无痕模式测试
- 在 Cloudflare 设置 Page Rule 减少 HTML 文件的缓存时间

---

## 技术说明

### Vite 构建缓存机制

Vite 使用 **Content-based Hashing** 生成文件名：

- `index-DS92YfeP.js` ← 哈希值基于文件内容
- 当代码改变时，哈希值改变，文件名改变
- 浏览器会将其视为全新文件，自动请求新版本

### 为什么还是会有缓存问题？

虽然 JS/CSS 文件名会变，但 `index.html` 文件名不变。如果浏览器或 CDN 缓存了旧的 `index.html`，就会引用旧的 JS/CSS 文件名。

**解决方案**:
- 设置 `index.html` 的缓存时间为 0 或很短（如 5 分钟）
- 或每次部署后清除 CDN 缓存

---

## 联系方式

如有问题，请检查：
- **部署报告**: `/var/www/harry-insurance2/DEPLOYMENT_REPORT.md`
- **优化总结**: `/var/www/harry-insurance2/OPTIMIZATION_SUMMARY.md`
- **服务状态**: `sudo supervisorctl status harry-insurance:*`

---

**最后更新**: 2026-01-01 13:44 +0800
**当前版本**: v1.1.0 (AI优化版)
