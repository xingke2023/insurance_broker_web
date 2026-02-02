# 计划书智能对比功能 - 测试指南

## 快速测试步骤

### 前置准备

1. **确保服务运行**
```bash
# 检查Django服务
sudo supervisorctl status harry-insurance:harry-insurance-django

# 如果未运行，启动服务
sudo supervisorctl start harry-insurance:harry-insurance-django
```

2. **创建数据库表**
```bash
# 方式1: 使用SQL文件
mysql -h localhost -P 8510 -u root -p insurancetools < create_plan_comparisons_table.sql

# 方式2: 使用Django迁移
python3 manage.py migrate
```

3. **检查Gemini API密钥**
```bash
# 查看.env文件
cat .env | grep GEMINI_API_KEY

# 应该看到:
# GEMINI_API_KEY=AIzaSyC6_Lp7D2RLFTDtWoKz6-eSerX6oNDdjdM
# GEMINI_API_KEY_FALLBACK=xxx (可选)
# GEMINI_API_KEY_3=xxx (可选)
```

### 测试步骤

#### 测试1: 基本对比功能

1. **访问对比页面**
   - URL: `http://your-domain:8008/plan-comparison`
   - 或从Dashboard点击"计划书智能对比"

2. **上传PDF文件**
   - 上传计划书1（必需）
   - 上传计划书2（必需）
   - 上传计划书3（可选）

3. **开始对比**
   - 点击"开始AI对比分析"按钮
   - 观察状态变化：
     - ✅ "正在读取PDF文件..."
     - ✅ "正在读取文件 1/2: xxx.pdf..."
     - ✅ "AI正在深度分析对比..."
     - ✅ "AI正在生成对比报告..."
     - ✅ 实时显示HTML内容

4. **检查结果**
   - ✅ 对比报告完整显示
   - ✅ 包含6个对比维度
   - ✅ 有HTML表格和样式
   - ✅ 显示"重新对比"按钮

#### 测试2: 历史记录功能

1. **访问历史记录**
   - 点击"查看历史记录"按钮
   - 或直接访问 `/comparison-history`

2. **查看记录列表**
   - ✅ 显示之前的对比记录
   - ✅ 显示PDF文件名
   - ✅ 显示创建时间

3. **查看对比报告**
   - 点击"查看报告"按钮
   - ✅ 弹出模态框
   - ✅ 显示完整的对比报告

4. **下载PDF**
   - 点击"下载"按钮
   - ✅ 成功下载PDF文件
   - ✅ 文件名正确

5. **删除记录**
   - 点击"删除"按钮
   - ✅ 确认对话框
   - ✅ 删除成功

#### 测试3: 错误处理

1. **未登录访问**
   - 登出账号
   - 访问 `/plan-comparison`
   - ✅ 重定向到登录页面

2. **只上传1个PDF**
   - 只上传计划书1
   - 点击"开始对比"
   - ✅ 提示"请至少上传2份PDF计划书"

3. **上传非PDF文件**
   - 上传图片或其他文件
   - ✅ 提示"请上传PDF文件"

4. **网络中断**
   - 开始对比后断网
   - ✅ 显示错误提示
   - ✅ 可重新对比

### API测试

#### 测试API端点

```bash
# 获取Token
TOKEN="your_access_token"

# 测试1: 获取历史记录
curl -X GET "http://localhost:8017/api/plan-comparison/history/" \
  -H "Authorization: Bearer $TOKEN"

# 预期响应:
{
  "success": true,
  "comparisons": [...]
}

# 测试2: 获取对比详情
curl -X GET "http://localhost:8017/api/plan-comparison/1/" \
  -H "Authorization: Bearer $TOKEN"

# 预期响应:
{
  "success": true,
  "comparison": {
    "id": 1,
    "pdf1_name": "...",
    "comparison_report": "..."
  }
}

# 测试3: 下载PDF
curl -X GET "http://localhost:8017/api/plan-comparison/1/download/1/" \
  -H "Authorization: Bearer $TOKEN" \
  -o test.pdf

# 预期: 下载test.pdf文件

# 测试4: 删除记录
curl -X DELETE "http://localhost:8017/api/plan-comparison/1/delete/" \
  -H "Authorization: Bearer $TOKEN"

# 预期响应:
{
  "success": true,
  "message": "删除成功"
}
```

#### 测试流式对比API

```bash
# 准备测试PDF
PDF1="/path/to/plan1.pdf"
PDF2="/path/to/plan2.pdf"

# 流式对比（观察SSE输出）
curl -X POST "http://localhost:8017/api/plan-comparison/compare/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "pdf1=@$PDF1" \
  -F "pdf2=@$PDF2" \
  --no-buffer

# 预期输出:
data: {"status": "uploading", "message": "正在读取PDF文件..."}

data: {"status": "analyzing", "message": "AI正在深度分析对比..."}

data: {"status": "streaming", "chunk": "<div>..."}

data: {"status": "completed", "comparison_id": 123}
```

### 数据库测试

```sql
-- 查看对比记录
SELECT id, pdf1_name, pdf2_name, pdf3_name, created_at
FROM plan_comparisons
ORDER BY created_at DESC
LIMIT 5;

-- 查看报告长度
SELECT id, pdf1_name, LENGTH(comparison_report) as report_length
FROM plan_comparisons;

-- 查看用户的对比记录数
SELECT user_id, COUNT(*) as comparison_count
FROM plan_comparisons
GROUP BY user_id;

-- 删除测试数据
DELETE FROM plan_comparisons WHERE id = 1;
```

### 性能测试

#### 测试响应时间

```bash
# 记录开始时间
START_TIME=$(date +%s)

# 执行对比请求
curl -X POST "http://localhost:8017/api/plan-comparison/compare/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "pdf1=@$PDF1" \
  -F "pdf2=@$PDF2" \
  --no-buffer > /dev/null

# 记录结束时间
END_TIME=$(date +%s)

# 计算耗时
ELAPSED=$((END_TIME - START_TIME))
echo "对比耗时: ${ELAPSED}秒"

# 预期耗时: 30-60秒
```

#### 测试并发

```bash
# 同时发起3个对比请求（不同用户）
for i in {1..3}; do
  curl -X POST "http://localhost:8017/api/plan-comparison/compare/" \
    -H "Authorization: Bearer $TOKEN_$i" \
    -F "pdf1=@$PDF1" \
    -F "pdf2=@$PDF2" &
done

wait
echo "并发测试完成"
```

### 日志检查

```bash
# 查看Django日志
tail -f /var/www/harry-insurance2/logs/django.log

# 关键日志行:
📊 收到计划书流式对比请求，用户: xxx
📄 收到2份PDF文件: xxx.pdf, xxx.pdf
🔑 [流式对比] 尝试使用密钥1
✅ [流式对比] 密钥1调用成功
✅ 对比报告生成成功，长度: 12345 字符
💾 对比记录已保存，ID: 123

# 查看Celery日志（如果使用）
tail -f /var/www/harry-insurance2/logs/celery.log
```

### 前端调试

#### 浏览器控制台

```javascript
// 打开控制台（F12）

// 查看网络请求
// Network -> plan-comparison/compare/
// Type: text/event-stream
// Status: 200

// 查看实时日志
// 应该看到:
"收到chunk: <div>..."
"当前总长度: 1234"

// 查看错误（如果有）
// Console -> 红色错误信息
```

#### React DevTools

```
1. 安装React DevTools扩展
2. 打开Components标签
3. 选择PlanComparisonDirect组件
4. 查看State:
   - comparing: true/false
   - streamingText: "..."
   - comparisonReport: "..."
   - statusMessage: "..."
```

## 测试清单

### 功能测试
- [ ] 上传2个PDF成功对比
- [ ] 上传3个PDF成功对比
- [ ] 实时显示流式输出
- [ ] 对比报告完整显示
- [ ] 查看历史记录
- [ ] 查看对比详情
- [ ] 下载PDF文件1
- [ ] 下载PDF文件2
- [ ] 下载PDF文件3（如果有）
- [ ] 删除对比记录
- [ ] 重新对比功能

### 错误处理
- [ ] 未登录访问重定向
- [ ] 只上传1个PDF提示错误
- [ ] 上传非PDF文件提示错误
- [ ] 文件过大提示错误
- [ ] 网络中断显示错误
- [ ] API密钥失效自动切换

### 性能测试
- [ ] 对比耗时在60秒内
- [ ] 流式输出流畅无卡顿
- [ ] 支持3个并发请求
- [ ] 大文件（30MB+）对比成功

### UI测试
- [ ] 响应式布局正常
- [ ] 按钮状态正确
- [ ] Loading动画显示
- [ ] 进度提示清晰
- [ ] 模态框正常打开/关闭

## 常见问题排查

### 问题1: 对比失败
```bash
# 检查后端日志
tail -f logs/django.log | grep "ERROR"

# 可能原因:
1. Gemini API密钥无效 -> 检查.env
2. PDF文件损坏 -> 更换PDF
3. 网络问题 -> 检查网络
4. 数据库连接失败 -> 检查MySQL
```

### 问题2: 流式输出中断
```bash
# 检查网络连接
curl -I http://localhost:8017

# 检查Django进程
ps aux | grep django

# 重启Django
sudo supervisorctl restart harry-insurance:harry-insurance-django
```

### 问题3: 历史记录为空
```bash
# 检查数据库
mysql -h localhost -P 8510 -u root -p insurancetools -e "SELECT * FROM plan_comparisons;"

# 如果表不存在
mysql -h localhost -P 8510 -u root -p insurancetools < create_plan_comparisons_table.sql
```

### 问题4: PDF下载失败
```bash
# 检查PDF数据
mysql -h localhost -P 8510 -u root -p insurancetools -e "
SELECT id, pdf1_name, LENGTH(pdf1_base64) as pdf1_size
FROM plan_comparisons
WHERE id = 1;
"

# 如果pdf1_base64为空，说明保存失败
```

## 成功标准

- ✅ 所有功能测试通过
- ✅ 所有错误处理正常
- ✅ 性能达标（60秒内）
- ✅ 无JavaScript错误
- ✅ 无Django错误日志
- ✅ 数据库记录正确

## 报告问题

如果发现问题，请提供：
1. 错误截图
2. 浏览器控制台日志
3. Django日志（logs/django.log）
4. 测试步骤复现
5. 使用的PDF文件信息

## 下一步

测试通过后：
1. 部署到生产环境
2. 监控API使用量
3. 收集用户反馈
4. 优化对比算法
5. 添加更多对比维度
