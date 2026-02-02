# 前端构建问题临时解决方案

## 问题现状

前端构建在 `transforming` 阶段卡住，原因未明。可能与Vite 7.2.7版本或系统环境有关。

## ✅ 后端已完全就绪

所有Gemini对比分析功能的后端API已经实现并可用：

- ✅ `/api/gemini-comparison/compare/` - 对比分析（非流式）
- ✅ `/api/gemini-comparison/compare-stream/` - 流式对比分析
- ✅ `/api/gemini-comparison/history/` - 对比历史
- ✅ `/api/gemini-comparison/{id}/` - 获取详情
- ✅ `/api/gemini-comparison/{id}/download/{pdf_number}/` - 下载PDF
- ✅ `/api/gemini-comparison/{id}/delete/` - 删除记录

## 临时解决方案

### 方案1：使用开发模式（推荐）

```bash
cd /var/www/harry-insurance2/frontend
npm run dev
```

- ✅ 无需构建
- ✅ 支持热重载
- ✅ 立即可用
- ⚠️ 性能略低于生产构建

### 方案2：API测试

使用curl或Postman直接测试后端API：

```bash
# 流式对比分析
curl -X POST http://localhost:8017/api/gemini-comparison/compare-stream/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "pdf_1=@plan1.pdf" \
  -F "file_name_1=plan1.pdf" \
  -F "pdf_2=@plan2.pdf" \
  -F "file_name_2=plan2.pdf" \
  -F "title=测试对比"
```

### 方案3：在其他环境构建

1. 在本地开发机器构建
2. 上传dist目录到服务器
3. 配置Nginx提供静态文件

## 已尝试的解决方法

1. ❌ 清除缓存（`rm -rf node_modules/.vite dist`）
2. ❌ 修改vite.config.js（添加optimizeDeps、禁用minify）
3. ❌ 增加Node.js内存限制
4. ❌ 使用debug模式查看详细信息
5. ❌ 降级Vite版本
6. ❌ 使用最小化配置

## 下一步建议

1. 升级服务器Node.js版本
2. 在另一台机器上测试构建
3. 提issue到Vite GitHub
4. 使用Webpack替代Vite

## 系统环境

- OS: Linux 6.8.0-87-generic
- Node.js: v24.4.1
- npm: 10.9.2
- Vite: 7.2.7
- 内存: 14GB (10GB已用)
- 磁盘: 99GB (64GB已用)

## 文件修改清单

### 后端（✅ 已完成）
- `api/models.py` - 添加PDF base64字段
- `api/gemini_comparison_service.py` - 新建
- `api/gemini_comparison_views.py` - 新建
- `api/urls.py` - 添加路由
- `api/migrations/0050_*` - 数据库迁移

### 前端（✅ 已修改，❌ 未构建）
- `src/components/PlanAnalyzer2.jsx` - 修改API调用
- `src/components/GeminiComparisonHistory.jsx` - 新建
- `src/App.jsx` - 添加路由
- `vite.config.js` - 优化配置

## 联系方式

如需帮助，请查看：
- `GEMINI_COMPARISON_GUIDE.md` - 完整使用指南
- `CLAUDE.md` - 项目整体说明
