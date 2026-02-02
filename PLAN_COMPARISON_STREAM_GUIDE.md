# 计划书智能对比功能 - 流式输出版本

## 更新说明

本版本使用**Server-Sent Events (SSE)** 实现流式输出，用户可以实时看到AI分析的过程。

## 流式输出的优势

### 1. 实时反馈
- 用户可以看到AI分析的实时进度
- 不需要等待整个分析完成才看到结果
- 提升用户体验，减少等待焦虑

### 2. 更好的性能
- 使用HTTP流式传输，不需要长时间阻塞
- 支持大文件对比（不受响应超时限制）
- 更高效的资源利用

### 3. 状态提示
- 显示当前处理阶段（上传、分析、生成）
- 实时显示生成的内容
- 完成后自动保存记录

## 技术实现

### 后端 - Server-Sent Events

**API路由**: `POST /api/plan-comparison/compare/`

**响应格式**: `text/event-stream`

**数据格式**:
```
data: {"status": "uploading", "message": "正在读取PDF文件..."}

data: {"status": "analyzing", "message": "AI正在深度分析对比..."}

data: {"status": "streaming", "chunk": "<div>对比报告片段...</div>"}

data: {"status": "completed", "comparison_id": 123, "message": "对比报告生成完成"}
```

**错误处理**:
```
data: {"error": "错误信息"}
```

### 前端 - Fetch API + Stream Reader

使用原生Fetch API接收流式数据：

```javascript
// 发送请求
const response = await fetch(`${API_BASE_URL}/api/plan-comparison/compare/`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

// 读取流式响应
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  // 解码并处理数据
  const chunk = decoder.decode(value, { stream: true });
  // ... 处理SSE格式数据
}
```

### 状态管理

使用React Hooks管理流式状态：

```javascript
const [streamingText, setStreamingText] = useState(''); // 实时显示的文本
const [statusMessage, setStatusMessage] = useState(''); // 状态提示
const streamingTextRef = useRef(''); // 追踪最新值（避免闭包问题）
```

### 关键代码片段

#### 后端 - 生成器函数

```python
def generate():
    try:
        # 发送上传进度
        yield f"data: {json.dumps({'status': 'uploading', 'message': '正在读取PDF文件...'})}\n\n"

        # 发送分析进度
        yield f"data: {json.dumps({'status': 'analyzing', 'message': 'AI正在深度分析对比...'})}\n\n"

        # 流式输出对比报告
        for chunk in client.models.generate_content_stream(...):
            if chunk.text:
                yield f"data: {json.dumps({'status': 'streaming', 'chunk': chunk.text})}\n\n"

        # 发送完成信号
        yield f"data: {json.dumps({'status': 'completed', 'comparison_id': 123})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

return StreamingHttpResponse(generate(), content_type='text/event-stream')
```

#### 前端 - SSE数据解析

```javascript
// 处理SSE格式的数据
const lines = buffer.split('\n');

for (const line of lines) {
  if (line.startsWith('data: ')) {
    const data = JSON.parse(line.substring(6));

    if (data.status === 'streaming') {
      // 累积文本并实时显示
      streamingTextRef.current += data.chunk;
      setStreamingText(streamingTextRef.current);
    } else if (data.status === 'completed') {
      // 完成后保存最终结果
      setComparisonReport(streamingTextRef.current);
      setComparisonId(data.comparison_id);
    }
  }
}
```

## 使用流程

### 用户体验流程

1. **上传阶段** (1-3秒)
   - 显示: "正在读取PDF文件..."
   - 进度: "正在读取文件 1/2: xxx.pdf..."

2. **分析阶段** (0.5秒)
   - 显示: "AI正在深度分析对比..."

3. **生成阶段** (30-60秒)
   - 显示: "AI正在生成对比报告..."
   - 实时渲染HTML内容
   - 用户可以边看边等

4. **完成阶段**
   - 显示: "对比完成"
   - 自动保存记录
   - 显示"重新对比"按钮

## API密钥轮询

支持多个Gemini API密钥自动轮询：

```python
# 获取API密钥列表
api_keys = get_next_api_key()

# 依次尝试
for key_name, api_key in api_keys:
    try:
        client = genai.Client(api_key=api_key)
        # 流式调用
        for chunk in client.models.generate_content_stream(...):
            yield ...
        break  # 成功后跳出
    except Exception as e:
        logger.warning(f"{key_name}失败，尝试下一个...")
        continue
```

## 错误处理

### 网络错误
```javascript
try {
  const response = await fetch(...);
  if (!response.ok) {
    throw new Error('请求失败');
  }
} catch (error) {
  alert('对比失败，请重试');
}
```

### API错误
```python
if not full_report:
    logger.error("所有API密钥均失败")
    yield f"data: {json.dumps({'error': '对比分析失败'})}\n\n"
    return
```

### 超时处理
- 前端无超时限制（流式读取）
- 后端单个chunk超时：Gemini SDK自动重试
- 如果长时间无响应，用户可刷新页面重试

## 性能优化

### 1. 减少Token消耗
```python
# 使用MEDIUM分辨率
media_resolution=types.MediaResolution.MEDIA_RESOLUTION_MEDIUM
```

### 2. 渐进式渲染
```javascript
// 实时更新DOM，不等待完成
setStreamingText(prev => prev + data.chunk);
```

### 3. 内存优化
```javascript
// 使用useRef避免重复渲染
streamingTextRef.current += data.chunk;
```

## 调试技巧

### 后端日志
```bash
tail -f logs/django.log | grep "流式对比"
```

查看日志输出：
```
🔑 [流式对比] 尝试使用密钥1: AIzaSyC6_L...
✅ [流式对比] 密钥1调用成功
✅ 对比报告生成成功，长度: 12345 字符
💾 对比记录已保存，ID: 123
```

### 前端调试
```javascript
console.log('收到chunk:', data.chunk);
console.log('当前总长度:', streamingTextRef.current.length);
```

### 网络抓包
使用浏览器开发者工具：
1. 打开Network标签
2. 找到`/api/plan-comparison/compare/`请求
3. 查看Response标签
4. 可以看到实时的SSE数据流

## 常见问题

### Q1: 为什么流式输出中断了？
**A**: 可能原因：
1. 网络连接中断 - 检查网络
2. API密钥超额 - 自动切换到下一个密钥
3. 浏览器限制 - 刷新页面重试

### Q2: 流式输出比非流式慢吗？
**A**: 不会。流式输出的总时间相同，但：
- 用户感知速度更快（实时反馈）
- 不会因为超时而失败
- 更好的用户体验

### Q3: 如何查看完整的对比报告？
**A**: 流式完成后会自动保存：
1. 保存到数据库（PlanComparison表）
2. 可在历史记录中查看
3. 支持下载原始PDF

## 与非流式版本对比

| 特性 | 流式版本 | 非流式版本 |
|------|----------|------------|
| 实时反馈 | ✅ 是 | ❌ 否 |
| 超时风险 | ✅ 低 | ⚠️ 高 |
| 用户体验 | ✅ 优秀 | ⚠️ 一般 |
| 网络要求 | ✅ 普通 | ⚠️ 稳定 |
| 实现复杂度 | ⚠️ 中等 | ✅ 简单 |
| 浏览器兼容性 | ✅ 现代浏览器 | ✅ 所有浏览器 |

## 部署步骤

### 1. 更新后端代码
```bash
# 已更新的文件
api/plan_comparison_views.py  # 添加流式输出支持
api/urls.py                     # 路由配置
```

### 2. 更新前端代码
```bash
# 已更新的文件
frontend/src/components/PlanComparisonDirect.jsx  # 流式接收
```

### 3. 重启服务
```bash
# 重启Django
sudo supervisorctl restart harry-insurance:harry-insurance-django

# 前端自动热重载（开发环境）
# 或重新构建（生产环境）
cd frontend && npm run build
```

### 4. 测试
1. 访问 `/plan-comparison`
2. 上传2份PDF
3. 观察实时输出
4. 检查最终报告

## 更新日志

### v1.1.0 (2026-01-23) - 流式输出版本
- ✅ 添加Server-Sent Events支持
- ✅ 实时显示AI分析进度
- ✅ 渐进式渲染对比报告
- ✅ 改进错误处理和重试机制
- ✅ 优化用户体验

### v1.0.0 (2026-01-23) - 初始版本
- ✅ 基础对比功能
- ✅ 历史记录管理
- ✅ PDF下载功能
