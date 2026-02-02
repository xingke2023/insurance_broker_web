# AI顾问API快速参考

## 🚀 快速开始

### 1. 获取Token
```bash
curl -X POST http://localhost:8007/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

### 2. 调用AI咨询
```bash
curl -X POST http://localhost:8007/api/ai-consultant/consult \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 35,
    "gender": "男",
    "annual_income": 800000,
    "life_stage": "责任高峰期",
    "family_status": "已婚有子女",
    "has_children": true,
    "children_count": 2,
    "main_concerns": ["子女教育", "家庭保障"],
    "budget": 100000
  }'
```

---

## 📋 API端点总览

| 端点 | 方法 | 说明 | 频率限制 |
|------|------|------|---------|
| `/api/ai-consultant/consult` | POST | AI智能咨询 | 3/分钟, 20/小时 |
| `/api/ai-consultant/products` | GET | 产品列表 | 无 |
| `/api/ai-consultant/stats` | GET | 咨询统计 | 无 |

---

## 🔑 必填字段

```json
{
  "age": 35,                          // 年龄 (18-100)
  "gender": "男",                     // 性别
  "annual_income": 800000,            // 年收入
  "life_stage": "责任高峰期",         // 人生阶段
  "family_status": "已婚有子女"       // 家庭状况
}
```

---

## 🎯 人生阶段选项

- `扶幼保障期` - 25-30岁
- `收入成长期` - 31-40岁
- `责任高峰期` - 41-50岁
- `责任递减期` - 51-60岁
- `退休期` - 60岁以上

---

## 📊 返回结果结构

```json
{
  "success": true,
  "cached": false,
  "data": {
    "customer_analysis": "...",        // 客户分析
    "risk_assessment": "...",          // 风险评估
    "coverage_gap": {...},             // 保障缺口
    "recommended_products": [...],     // 推荐产品（前3）
    "alternative_products": [...],     // 备选产品
    "professional_advice": "...",      // 专业建议
    "budget_planning": {...},          // 预算规划
    "warnings": [...],                 // 注意事项
    "protection_plan": {...},          // 保障方案
    "matched_products_detail": [...]   // 评分详情
  }
}
```

---

## ⚡ 评分维度

| 维度 | 权重 | 说明 |
|------|------|------|
| 需求匹配 | 35% | 产品是否满足客户需求 |
| 预算匹配 | 20% | 保费是否在预算内 |
| 年龄匹配 | 20% | 年龄是否在目标范围 |
| 收入匹配 | 15% | 收入是否达到要求 |
| 阶段匹配 | 10% | 人生阶段是否匹配 |

**总分计算**:
```
总分 = 需求×35% + 预算×20% + 年龄×20% + 收入×15% + 阶段×10%
```

---

## 🛡️ 安全特性

### 频率限制
- **每分钟**: 3次请求
- **每小时**: 20次请求
- **超限响应**: 429 Too Many Requests

### 缓存机制
- **时长**: 1小时
- **标识**: `cached: true` 字段
- **范围**: 用户级别

### 认证方式
- **类型**: JWT Token
- **请求头**: `Authorization: Bearer <token>`

---

## 🔍 常用查询参数

### 获取产品列表
```
GET /api/ai-consultant/products?age=35&annual_income=800000&budget=100000&limit=10
```

| 参数 | 类型 | 说明 |
|------|------|------|
| age | int | 年龄 |
| annual_income | float | 年收入 |
| budget | float | 预算 |
| life_stage | string | 人生阶段 |
| coverage_type | string | 保障类型 |
| limit | int | 返回数量（默认20，最大50） |

---

## ❌ 常见错误

| 状态码 | 错误 | 解决方案 |
|--------|------|---------|
| 400 | 参数错误 | 检查必填字段 |
| 401 | 未认证 | 提供有效Token |
| 404 | 未找到产品 | 调整筛选条件 |
| 429 | 超过限制 | 等待后重试 |
| 500 | 服务器错误 | 联系技术支持 |

---

## 🧪 测试命令

### 运行测试脚本
```bash
cd /var/www/harry-insurance2
python test_ai_consultant_api.py
```

### 检查服务状态
```bash
sudo supervisorctl status harry-insurance:harry-insurance-django
```

### 查看日志
```bash
sudo tail -f /var/log/supervisor/harry-insurance-django-stderr.log
```

---

## 📚 文档链接

| 文档 | 说明 |
|------|------|
| `AI_CONSULTANT_API_DOCUMENTATION.md` | 完整API文档 |
| `AI_CONSULTANT_SERVICE_GUIDE.md` | 服务使用指南 |
| `AI_CONSULTANT_VIEWS_SUMMARY.md` | 视图实现总结 |
| `test_ai_consultant_api.py` | 测试脚本 |

---

## 💡 快速提示

### Python调用
```python
import requests

token = "YOUR_TOKEN"
headers = {"Authorization": f"Bearer {token}"}

response = requests.post(
    "http://localhost:8007/api/ai-consultant/consult",
    headers=headers,
    json={
        "age": 35,
        "gender": "男",
        "annual_income": 800000,
        "life_stage": "责任高峰期",
        "family_status": "已婚有子女",
        "has_children": True,
        "children_count": 2,
        "main_concerns": ["家庭保障"],
        "budget": 100000
    }
)

result = response.json()
```

### JavaScript调用
```javascript
const token = "YOUR_TOKEN";

const response = await fetch(
  "http://localhost:8007/api/ai-consultant/consult",
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      age: 35,
      gender: "男",
      annual_income: 800000,
      life_stage: "责任高峰期",
      family_status: "已婚有子女",
      has_children: true,
      children_count: 2,
      main_concerns: ["家庭保障"],
      budget: 100000
    })
  }
);

const result = await response.json();
```

---

## 🎯 最佳实践

1. **使用缓存** - 相同请求会返回缓存结果
2. **错误处理** - 检查 `success` 字段和状态码
3. **频率控制** - 注意频率限制，避免429错误
4. **参数验证** - 发送前验证必填字段
5. **日志记录** - 记录重要的API调用

---

**版本**: v1.0.0
**更新**: 2026-01-01
**服务地址**: `http://localhost:8007/api`

---
