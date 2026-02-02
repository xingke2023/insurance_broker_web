# SpeedyCloud API 使用说明

## 基本信息

- **API地址**: `https://tokens.speedycloud.net`
- **API密钥**: `sk-QZnjoEWhDaEwWrCreXCXkc7m8Uuwq9gSFPE02rVPPgn43YwH`
- **可用模型**: `claude-sonnet-4-5-20250929`
- **兼容标准**: OpenAI Chat Completions API

## 快速开始

### Python 示例

```python
import requests

api_key = "sk-QZnjoEWhDaEwWrCreXCXkc7m8Uuwq9gSFPE02rVPPgn43YwH"
base_url = "https://tokens.speedycloud.net"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {api_key}"
}

payload = {
    "model": "claude-sonnet-4-5-20250929",
    "messages": [
        {"role": "user", "content": "你好"}
    ],
    "max_tokens": 1000
}

response = requests.post(
    f"{base_url}/v1/chat/completions",
    headers=headers,
    json=payload
)

result = response.json()
print(result["choices"][0]["message"]["content"])
```

### cURL 示例

```bash
curl https://tokens.speedycloud.net/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-QZnjoEWhDaEwWrCreXCXkc7m8Uuwq9gSFPE02rVPPgn43YwH" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [
      {"role": "user", "content": "你好"}
    ],
    "max_tokens": 1000
  }'
```

### JavaScript/Node.js 示例

```javascript
const axios = require('axios');

const apiKey = 'sk-QZnjoEWhDaEwWrCreXCXkc7m8Uuwq9gSFPE02rVPPgn43YwH';
const baseUrl = 'https://tokens.speedycloud.net';

async function callAPI() {
  try {
    const response = await axios.post(
      `${baseUrl}/v1/chat/completions`,
      {
        model: 'claude-sonnet-4-5-20250929',
        messages: [
          { role: 'user', content: '你好' }
        ],
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    console.log(response.data.choices[0].message.content);
  } catch (error) {
    console.error('错误:', error.response?.data || error.message);
  }
}

callAPI();
```

## 请求参数说明

### 必需参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `model` | string | 模型名称: `claude-sonnet-4-5-20250929` |
| `messages` | array | 对话消息数组 |

### 常用可选参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `max_tokens` | integer | - | 最大生成tokens数量 |
| `temperature` | float | 1.0 | 采样温度 (0.0-2.0) |
| `top_p` | float | 1.0 | 核采样参数 |
| `stream` | boolean | false | 是否流式输出 |

### Messages 格式

```json
{
  "messages": [
    {"role": "system", "content": "你是一个helpful助手"},
    {"role": "user", "content": "用户的问题"},
    {"role": "assistant", "content": "助手的回复"},
    {"role": "user", "content": "继续对话..."}
  ]
}
```

**角色类型**:
- `system`: 系统提示，设定AI行为
- `user`: 用户消息
- `assistant`: AI助手的回复

## 响应格式

```json
{
  "id": "msg_015smM6zW2JpURU9DgdwjpuK",
  "model": "claude-sonnet-4-5-20250929",
  "object": "chat.completion",
  "created": 1769591717,
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "AI的回复内容"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 24,
    "completion_tokens": 6,
    "total_tokens": 30
  }
}
```

### 关键字段说明

- `choices[0].message.content`: AI的回复内容
- `finish_reason`: 结束原因 (`stop`=正常结束, `length`=达到最大长度)
- `usage.total_tokens`: 总token消耗

## 流式输出示例

```python
import requests

response = requests.post(
    "https://tokens.speedycloud.net/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    },
    json={
        "model": "claude-sonnet-4-5-20250929",
        "messages": [{"role": "user", "content": "讲个故事"}],
        "stream": True
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        print(line.decode('utf-8'))
```

## 错误处理

### 常见错误码

| 状态码 | 说明 | 处理方式 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查请求格式和参数 |
| 401 | 认证失败 | 检查API密钥是否正确 |
| 429 | 请求过于频繁 | 添加重试机制和延迟 |
| 500 | 服务器错误 | 稍后重试 |

### 错误处理示例

```python
try:
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    result = response.json()
except requests.exceptions.Timeout:
    print("请求超时")
except requests.exceptions.HTTPError as e:
    print(f"HTTP错误: {e.response.status_code}")
    print(f"错误详情: {e.response.text}")
except Exception as e:
    print(f"其他错误: {e}")
```

## 最佳实践

1. **错误重试**: 添加指数退避重试机制
2. **超时设置**: 建议设置30-60秒超时
3. **Token控制**: 合理设置`max_tokens`避免过度消耗
4. **并发限制**: 避免过高并发请求
5. **安全存储**: API密钥不要硬编码，使用环境变量

### 环境变量配置示例

```bash
# .env 文件
SPEEDYCLOUD_API_KEY=sk-QZnjoEWhDaEwWrCreXCXkc7m8Uuwq9gSFPE02rVPPgn43YwH
SPEEDYCLOUD_BASE_URL=https://tokens.speedycloud.net
SPEEDYCLOUD_MODEL=claude-sonnet-4-5-20250929
```

```python
# Python 读取
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv('SPEEDYCLOUD_API_KEY')
base_url = os.getenv('SPEEDYCLOUD_BASE_URL')
model = os.getenv('SPEEDYCLOUD_MODEL')
```

## 更多资源

- OpenAI API文档: https://platform.openai.com/docs/api-reference/chat
- 本API兼容OpenAI格式，大部分参数和用法相同

## 测试工具

使用项目中的 `test_api.py` 脚本测试API连接:

```bash
python3 test_api.py
```
