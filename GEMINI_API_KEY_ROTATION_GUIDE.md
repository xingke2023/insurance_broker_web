# Gemini API密钥轮询机制使用指南

## 概述

本系统实现了**智能API密钥轮询机制**，可以配置多个Gemini API密钥，自动轮流使用，避免单个密钥的配额限制。

## 核心特性

### ✅ 1. 自动轮询
- 每次请求自动切换到下一个密钥
- 线程安全的索引管理
- 避免单个密钥过度使用

### ✅ 2. 智能重试
- 当前密钥失败时，自动尝试下一个
- 检测配额/限流错误，优先切换
- 所有密钥失败才返回错误

### ✅ 3. 均衡负载
- 多个密钥均匀分配请求
- 避免热点问题
- 最大化API配额利用率

## 配置方法

### 1. 环境变量配置

在`.env`文件中配置多个API密钥：

```bash
# 主密钥（必需）
GEMINI_API_KEY=AIzaSyC6_Lp7D2RLFTDtWoKz6-eSerX6oNDdjdM

# 备用密钥1（可选）
GEMINI_API_KEY_FALLBACK=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 备用密钥3（可选）
GEMINI_API_KEY_3=AIzaSyExxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**注意**:
- 至少配置1个密钥（`GEMINI_API_KEY`）
- 可以配置最多3个密钥
- 密钥名称固定，不可自定义

### 2. 获取Gemini API密钥

访问 [Google AI Studio](https://aistudio.google.com/app/apikey) 创建API密钥。

**建议**:
- 使用不同的Google账号创建多个密钥
- 每个密钥单独的项目，避免共享配额
- 定期检查配额使用情况

## 工作原理

### 轮询算法

```python
# 全局索引（线程安全）
_api_key_index = 0
_api_key_lock = threading.Lock()

def get_next_api_key():
    """获取下一个API密钥（轮询）"""
    global _api_key_index

    # 收集所有配置的密钥
    all_keys = []
    if os.getenv('GEMINI_API_KEY'):
        all_keys.append(('密钥1', os.getenv('GEMINI_API_KEY')))
    if os.getenv('GEMINI_API_KEY_FALLBACK'):
        all_keys.append(('密钥2', os.getenv('GEMINI_API_KEY_FALLBACK')))
    if os.getenv('GEMINI_API_KEY_3'):
        all_keys.append(('密钥3', os.getenv('GEMINI_API_KEY_3')))

    # 线程安全地更新索引
    with _api_key_lock:
        start_index = _api_key_index
        _api_key_index = (start_index + 1) % len(all_keys)

    # 返回轮询后的密钥列表
    return all_keys[start_index:] + all_keys[:start_index]
```

### 执行流程

```
请求1 → 密钥1 (索引0) → 成功 → 索引+1
请求2 → 密钥2 (索引1) → 成功 → 索引+1
请求3 → 密钥3 (索引2) → 成功 → 索引+1
请求4 → 密钥1 (索引0) → 成功 → 索引+1
...循环
```

### 失败重试

```
请求 → 密钥1 → 失败（配额超限）
     → 密钥2 → 失败（网络错误）
     → 密钥3 → 成功 ✅
```

## 使用示例

### 1. 非流式调用

```python
from .gemini_service import call_gemini_with_fallback
from google.genai import types

# 构建请求
parts = [types.Part.from_text(text="你好")]
contents = [types.Content(role="user", parts=parts)]

# 自动轮询调用
response = call_gemini_with_fallback(
    model='gemini-3-flash-preview',
    contents=contents,
    operation_name="测试调用"
)

# 日志输出:
# 🔄 本次任务从 密钥1 开始（轮询索引: 0）
# 🔑 [测试调用] 尝试使用密钥1: AIzaSyC6_L...
# ✅ [测试调用] 密钥1调用成功
```

### 2. 流式调用

```python
from .gemini_service import get_next_api_key
from google import genai

# 获取轮询后的密钥列表
api_keys = get_next_api_key()

# 依次尝试
for key_name, api_key in api_keys:
    try:
        client = genai.Client(api_key=api_key)

        # 流式调用
        for chunk in client.models.generate_content_stream(...):
            yield chunk.text

        break  # 成功后退出
    except Exception as e:
        logger.warning(f"{key_name}失败，尝试下一个...")
        continue
```

### 3. 计划书对比（流式）

在`plan_comparison_views.py`中：

```python
# 获取API密钥列表
api_keys = get_next_api_key()

# 依次尝试每个密钥
for key_name, api_key in api_keys:
    try:
        client = genai.Client(api_key=api_key)

        # 流式生成对比报告
        for chunk in client.models.generate_content_stream(...):
            if chunk.text:
                yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"

        break  # 成功
    except Exception as e:
        continue  # 尝试下一个密钥
```

## 日志监控

### 查看轮询日志

```bash
tail -f logs/django.log | grep "🔄"
```

输出示例：
```
🔄 本次任务从 密钥1 开始（轮询索引: 0）
🔄 本次任务从 密钥2 开始（轮询索引: 1）
🔄 本次任务从 密钥3 开始（轮询索引: 2）
🔄 本次任务从 密钥1 开始（轮询索引: 0）
```

### 查看密钥使用情况

```bash
tail -f logs/django.log | grep "🔑"
```

输出示例：
```
🔑 [PDF OCR识别] 尝试使用密钥1: AIzaSyC6_L...
✅ [PDF OCR识别] 密钥1调用成功

🔑 [流式对比] 尝试使用密钥2: AIzaSyDxxx...
✅ [流式对比] 密钥2调用成功
```

### 查看失败重试

```bash
tail -f logs/django.log | grep "⚠️"
```

输出示例：
```
⚠️ [PDF OCR识别] 密钥1失败: 429 Resource exhausted
📊 [PDF OCR识别] 检测到密钥1超额限制，尝试下一个密钥...
🔑 [PDF OCR识别] 尝试使用密钥2: AIzaSyDxxx...
✅ [PDF OCR识别] 密钥2调用成功
```

## 配额管理

### Google AI Studio配额限制

**Free tier（免费版）**:
- 每分钟：15 RPM (Requests Per Minute)
- 每天：1,500 RPD (Requests Per Day)
- 每个项目：10 RPD（并发）

**示例计算**:
- 1个密钥：15 RPM × 60 = 900 请求/小时
- 3个密钥：45 RPM × 60 = 2,700 请求/小时

### 配额监控

在Google AI Studio查看使用情况：
1. 访问 [API Keys](https://aistudio.google.com/app/apikey)
2. 点击密钥旁的"详情"
3. 查看"使用情况"图表

### 配额优化建议

1. **合理分配密钥**
   - 高频操作（OCR）：使用密钥1
   - 中频操作（对比）：使用密钥2
   - 低频操作（海报分析）：使用密钥3

2. **设置优先级**
   ```python
   # 按优先级排序密钥
   all_keys = [
       ('高频密钥', key1),
       ('中频密钥', key2),
       ('低频密钥', key3)
   ]
   ```

3. **缓存结果**
   - 相同PDF多次对比，使用缓存
   - 减少API调用次数

## 错误处理

### 配额超限错误

**错误信息**:
```
429 Resource exhausted
quota exceeded
rate limit exceeded
```

**处理逻辑**:
```python
is_quota_error = any(keyword in error_msg.lower() for keyword in [
    'quota', 'rate limit', 'resource exhausted', '429', 'too many requests'
])

if is_quota_error:
    logger.warning(f"检测到{key_name}超额限制，尝试下一个密钥...")
    continue  # 立即切换到下一个密钥
```

### 所有密钥失败

**场景**: 所有密钥都超额或失败

**处理**:
```python
if not full_report:
    logger.error("❌ 所有API密钥均失败")
    yield f"data: {json.dumps({'error': '所有API密钥均已超额，请稍后重试'})}\n\n"
    return
```

**建议**:
- 提示用户稍后重试
- 发送邮件通知管理员
- 临时禁用相关功能

### 网络错误

**错误信息**:
```
Connection timeout
Network unreachable
SSL error
```

**处理**:
- 自动重试当前密钥（最多3次）
- 重试失败后切换到下一个密钥

## 性能优化

### 1. 减少API调用

```python
# 使用缓存
from django.core.cache import cache

def get_comparison_with_cache(pdf_hash):
    # 检查缓存
    cached = cache.get(f'comparison_{pdf_hash}')
    if cached:
        return cached

    # 调用API
    result = call_gemini_with_fallback(...)

    # 保存缓存（1小时）
    cache.set(f'comparison_{pdf_hash}', result, 3600)
    return result
```

### 2. 批量处理

```python
# 批量对比时，均匀分配到不同密钥
for i, (pdf1, pdf2) in enumerate(pdf_pairs):
    # 强制使用特定密钥索引
    key_index = i % 3
    api_keys = get_next_api_key()
    key_name, api_key = api_keys[key_index]
    ...
```

### 3. 异步调用

```python
import asyncio

async def compare_async(pdf1, pdf2):
    # 异步调用，不阻塞主线程
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        call_gemini_with_fallback,
        ...
    )
    return result
```

## 测试轮询机制

### 测试脚本

```python
# test_api_rotation.py
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from api.gemini_service import get_next_api_key

# 测试10次轮询
for i in range(10):
    keys = get_next_api_key()
    print(f"请求{i+1}: 使用{keys[0][0]}")

# 预期输出:
# 请求1: 使用密钥1
# 请求2: 使用密钥2
# 请求3: 使用密钥3
# 请求4: 使用密钥1
# 请求5: 使用密钥2
# ...
```

### 测试失败重试

```python
# test_fallback.py
from api.gemini_service import call_gemini_with_fallback

# 故意使用错误的密钥测试fallback
os.environ['GEMINI_API_KEY'] = 'invalid_key_1'
os.environ['GEMINI_API_KEY_FALLBACK'] = 'invalid_key_2'
os.environ['GEMINI_API_KEY_3'] = 'valid_key_3'

try:
    response = call_gemini_with_fallback(...)
    print("成功使用密钥3")
except Exception as e:
    print(f"所有密钥失败: {e}")
```

## 常见问题

### Q1: 如何查看当前使用的是哪个密钥？

**A**: 查看日志
```bash
tail -f logs/django.log | grep "✅.*调用成功"
```

### Q2: 某个密钥一直失败怎么办？

**A**:
1. 检查密钥是否有效
2. 查看Google AI Studio配额
3. 临时移除该密钥配置

```bash
# .env文件中注释掉
# GEMINI_API_KEY_FALLBACK=xxx
```

### Q3: 如何强制使用特定密钥？

**A**: 临时修改代码
```python
# 强制使用密钥1
api_keys = [('密钥1', os.getenv('GEMINI_API_KEY'))]
```

### Q4: 轮询是否影响性能？

**A**: 不会。轮询索引更新是O(1)操作，对性能影响可忽略。

### Q5: 多个进程是否会冲突？

**A**: 不会。每个进程有独立的轮询索引，不会相互影响。

## 最佳实践

### 1. 密钥命名规范

```bash
# 按用途命名
GEMINI_API_KEY=xxx           # 主密钥（高频）
GEMINI_API_KEY_FALLBACK=xxx  # 备用密钥（中频）
GEMINI_API_KEY_3=xxx         # 备用密钥（低频）
```

### 2. 定期轮换

每月更新API密钥，避免安全风险：
```bash
# 生成新密钥，逐个替换
1月：替换密钥1
2月：替换密钥2
3月：替换密钥3
```

### 3. 监控告警

设置配额告警：
```python
# 当API调用失败率 > 10% 时发送邮件
if failure_rate > 0.1:
    send_alert_email("API密钥可能已超额")
```

### 4. 文档更新

在`.env.example`中添加说明：
```bash
# Gemini API密钥配置（支持多密钥轮询）
GEMINI_API_KEY=your_primary_key_here
GEMINI_API_KEY_FALLBACK=your_fallback_key_here  # 可选
GEMINI_API_KEY_3=your_third_key_here            # 可选
```

## 总结

✅ **已实现功能**:
- 自动轮询多个API密钥
- 智能失败重试
- 配额超限检测
- 线程安全索引管理

✅ **使用场景**:
- PDF OCR识别
- 计划书对比（流式/非流式）
- 海报分析
- 表格数据提取

✅ **优势**:
- 3倍配额（3个密钥）
- 高可用性（自动fallback）
- 负载均衡
- 零配置（自动检测）

🎯 **建议配置**:
- 生产环境：至少2个密钥
- 高流量：3个密钥
- 测试环境：1个密钥即可
