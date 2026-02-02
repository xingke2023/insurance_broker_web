# 客户案例 API 文档

## API 基础信息

**Base URL**: `http://localhost:8007/api`

**认证**: 所有端点均为公开访问（AllowAny），无需认证

**响应格式**: JSON

**编码**: UTF-8

---

## API 端点列表

### 1. 获取客户案例列表

**端点**: `GET /customer-cases/`

**描述**: 获取客户案例列表，支持筛选、搜索、分页和排序

#### 请求参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `life_stage` | string | 否 | - | 人生阶段筛选（扶幼保障期/收入成长期/责任高峰期/责任递减期/退休期） |
| `is_active` | boolean | 否 | true | 是否只返回启用的案例 |
| `search` | string | 否 | - | 搜索关键词（搜索标题、描述、家庭结构、保险需求） |
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 10 | 每页数量（最大50） |
| `ordering` | string | 否 | sort_order | 排序字段（可用逗号分隔多个字段） |

#### 可用排序字段

- `sort_order` - 排序序号（默认）
- `created_at` - 创建时间
- `-created_at` - 创建时间倒序
- `customer_age` - 客户年龄
- `annual_income` - 年收入
- `total_annual_premium` - 年缴保费总额

#### 请求示例

```bash
# 获取所有启用的案例（默认）
GET /api/customer-cases/

# 获取"责任高峰期"的案例
GET /api/customer-cases/?life_stage=责任高峰期

# 搜索包含"医疗"的案例
GET /api/customer-cases/?search=医疗

# 按年收入倒序排列
GET /api/customer-cases/?ordering=-annual_income

# 组合查询：责任高峰期 + 每页20条 + 按创建时间倒序
GET /api/customer-cases/?life_stage=责任高峰期&page_size=20&ordering=-created_at

# 包含已禁用的案例
GET /api/customer-cases/?is_active=false
```

#### 成功响应

**HTTP状态码**: 200 OK

```json
{
  "success": true,
  "data": {
    "count": 25,
    "next": "http://localhost:8007/api/customer-cases/?page=2",
    "previous": null,
    "results": [
      {
        "id": 1,
        "title": "35岁单身专业人士保险规划",
        "life_stage": "收入成长期",
        "customer_age": 35,
        "annual_income": "800000.00",
        "income_display": "¥800,000",
        "family_structure": "单身，独居",
        "insurance_needs": "重点关注重疾保障和储蓄规划",
        "budget_suggestion": "年收入的10-15%",
        "recommended_products": [
          {
            "product_name": "储蓄计划A",
            "company": "友邦保险",
            "annual_premium": 50000,
            "coverage_type": "储蓄",
            "reason": "稳健增值"
          },
          {
            "product_name": "重疾保险B",
            "company": "保诚保险",
            "annual_premium": 30000,
            "coverage_type": "重疾",
            "reason": "全面覆盖"
          }
        ],
        "total_annual_premium": "80000.00",
        "premium_display": "¥80,000",
        "product_count": 2,
        "case_description": "该客户处于职业上升期...",
        "key_points": [
          "35岁单身专业人士，年收入80万",
          "重点关注职业发展和未来家庭规划",
          "配置储蓄和重疾保障的平衡组合"
        ],
        "case_image": "/media/customer_cases/case1.jpg",
        "sort_order": 10,
        "is_active": true,
        "created_at": "2026-01-01T10:00:00Z",
        "updated_at": "2026-01-01T10:00:00Z"
      }
    ]
  }
}
```

#### 错误响应

**HTTP状态码**: 500 Internal Server Error

```json
{
  "success": false,
  "error": "错误详情",
  "message": "获取客户案例列表失败"
}
```

---

### 2. 获取单个案例详情

**端点**: `GET /customer-cases/<case_id>/`

**描述**: 根据案例ID获取单个案例的完整详情

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `case_id` | integer | 是 | 案例ID |

#### 请求示例

```bash
GET /api/customer-cases/1/
```

#### 成功响应

**HTTP状态码**: 200 OK

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "35岁单身专业人士保险规划",
    "life_stage": "收入成长期",
    "customer_age": 35,
    "annual_income": "800000.00",
    "income_display": "¥800,000",
    "family_structure": "单身，独居",
    "insurance_needs": "重点关注重疾保障和储蓄规划",
    "budget_suggestion": "年收入的10-15%",
    "recommended_products": [
      {
        "product_name": "储蓄计划A",
        "company": "友邦保险",
        "annual_premium": 50000,
        "coverage_type": "储蓄",
        "reason": "稳健增值，长期收益可观"
      },
      {
        "product_name": "重疾保险B",
        "company": "保诚保险",
        "annual_premium": 30000,
        "coverage_type": "重疾",
        "reason": "全面覆盖100种重疾"
      }
    ],
    "total_annual_premium": "80000.00",
    "premium_display": "¥80,000",
    "product_count": 2,
    "case_description": "该客户处于职业上升期，收入稳定且有较强的储蓄能力。推荐配置储蓄和重疾保障的平衡组合，总保费约占年收入的10%，符合合理范围。储蓄计划用于未来财富积累，重疾保险提供全面健康保障。",
    "key_points": [
      "35岁单身专业人士，年收入80万",
      "重点关注职业发展和未来家庭规划",
      "配置储蓄和重疾保障的平衡组合",
      "总保费约占年收入的10%，符合合理范围"
    ],
    "case_image": "/media/customer_cases/case1.jpg",
    "sort_order": 10,
    "is_active": true,
    "created_at": "2026-01-01T10:00:00Z",
    "updated_at": "2026-01-01T10:00:00Z"
  }
}
```

#### 错误响应

**HTTP状态码**: 404 Not Found

```json
{
  "success": false,
  "error": "Case not found",
  "message": "未找到ID为1的案例，或该案例未启用"
}
```

**HTTP状态码**: 500 Internal Server Error

```json
{
  "success": false,
  "error": "错误详情",
  "message": "获取客户案例详情失败"
}
```

---

### 3. 按人生阶段获取案例

**端点**: `GET /customer-cases/by-stage/<stage>/`

**描述**: 根据人生阶段获取所有相关案例

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `stage` | string | 是 | 人生阶段（扶幼保障期/收入成长期/责任高峰期/责任递减期/退休期） |

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 10 | 每页数量（最大50） |

#### 请求示例

```bash
# 获取"责任高峰期"的所有案例
GET /api/customer-cases/by-stage/责任高峰期/

# 分页获取
GET /api/customer-cases/by-stage/收入成长期/?page=2&page_size=20
```

#### 成功响应

**HTTP状态码**: 200 OK

```json
{
  "success": true,
  "data": {
    "life_stage": "责任高峰期",
    "count": 5,
    "cases": [
      {
        "id": 10,
        "title": "40岁中年家庭全面保障规划",
        "life_stage": "责任高峰期",
        "customer_age": 40,
        "annual_income": "1200000.00",
        "income_display": "¥1,200,000",
        "family_structure": "已婚，2个子女（10岁、13岁），有房贷",
        "insurance_needs": "需要完善的家庭保障，包括重疾、医疗、寿险",
        "budget_suggestion": "年收入的15-18%",
        "recommended_products": [...],
        "total_annual_premium": "220000.00",
        "premium_display": "¥220,000",
        "product_count": 4,
        "case_description": "该家庭处于责任高峰期...",
        "key_points": [...],
        "case_image": "/media/customer_cases/case10.jpg",
        "sort_order": 20,
        "is_active": true,
        "created_at": "2026-01-01T10:00:00Z",
        "updated_at": "2026-01-01T10:00:00Z"
      }
    ]
  }
}
```

#### 错误响应

**HTTP状态码**: 400 Bad Request

```json
{
  "success": false,
  "error": "Invalid life stage",
  "message": "无效的人生阶段: 错误的阶段名",
  "valid_stages": [
    "扶幼保障期",
    "收入成长期",
    "责任高峰期",
    "责任递减期",
    "退休期"
  ]
}
```

**HTTP状态码**: 500 Internal Server Error

```json
{
  "success": false,
  "error": "错误详情",
  "message": "获取责任高峰期案例失败"
}
```

---

### 4. 获取人生阶段列表

**端点**: `GET /customer-cases/life-stages/`

**描述**: 获取所有可用的人生阶段及其案例数量

#### 请求示例

```bash
GET /api/customer-cases/life-stages/
```

#### 成功响应

**HTTP状态码**: 200 OK

```json
{
  "success": true,
  "data": {
    "stages": [
      {
        "value": "扶幼保障期",
        "label": "扶幼保障期",
        "count": 3
      },
      {
        "value": "收入成长期",
        "label": "收入成长期",
        "count": 5
      },
      {
        "value": "责任高峰期",
        "label": "责任高峰期",
        "count": 8
      },
      {
        "value": "责任递减期",
        "label": "责任递减期",
        "count": 4
      },
      {
        "value": "退休期",
        "label": "退休期",
        "count": 5
      }
    ]
  }
}
```

#### 错误响应

**HTTP状态码**: 500 Internal Server Error

```json
{
  "success": false,
  "error": "错误详情",
  "message": "获取人生阶段列表失败"
}
```

---

### 5. 获取案例统计信息

**端点**: `GET /customer-cases/statistics/`

**描述**: 获取客户案例的统计数据，包括总数、按阶段分布、平均值等

#### 请求示例

```bash
GET /api/customer-cases/statistics/
```

#### 成功响应

**HTTP状态码**: 200 OK

```json
{
  "success": true,
  "data": {
    "total_cases": 30,
    "active_cases": 25,
    "by_stage": {
      "扶幼保障期": 3,
      "收入成长期": 5,
      "责任高峰期": 8,
      "责任递减期": 4,
      "退休期": 5
    },
    "avg_income": 850000.00,
    "avg_premium": 125000.00
  }
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `total_cases` | integer | 总案例数（包括已禁用） |
| `active_cases` | integer | 启用的案例数 |
| `by_stage` | object | 按人生阶段统计（只统计启用的案例） |
| `avg_income` | float | 平均年收入（只统计启用的案例） |
| `avg_premium` | float | 平均年缴保费（只统计启用的案例） |

#### 错误响应

**HTTP状态码**: 500 Internal Server Error

```json
{
  "success": false,
  "error": "错误详情",
  "message": "获取统计信息失败"
}
```

---

## 数据模型

### CustomerCase 模型字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `id` | integer | 案例ID（主键） | 1 |
| `title` | string | 案例标题 | "35岁单身专业人士保险规划" |
| `life_stage` | string | 人生阶段 | "收入成长期" |
| `customer_age` | integer | 客户年龄 | 35 |
| `annual_income` | decimal | 年收入 | "800000.00" |
| `income_display` | string | 格式化年收入（只读） | "¥800,000" |
| `family_structure` | string | 家庭结构 | "单身，独居" |
| `insurance_needs` | text | 保险需求 | "重点关注重疾保障..." |
| `budget_suggestion` | string | 预算建议 | "年收入的10-15%" |
| `recommended_products` | array | 推荐产品列表（JSON） | [...] |
| `total_annual_premium` | decimal | 年缴保费总额 | "80000.00" |
| `premium_display` | string | 格式化保费（只读） | "¥80,000" |
| `product_count` | integer | 推荐产品数量（只读） | 2 |
| `case_description` | text | 案例详细说明 | "该客户处于..." |
| `key_points` | array | 关键要点列表（JSON） | [...] |
| `case_image` | string | 案例配图URL | "/media/..." |
| `sort_order` | integer | 排序序号 | 10 |
| `is_active` | boolean | 是否启用 | true |
| `created_at` | datetime | 创建时间 | "2026-01-01T10:00:00Z" |
| `updated_at` | datetime | 更新时间 | "2026-01-01T10:00:00Z" |

### recommended_products 数组结构

```json
[
  {
    "product_name": "产品名称",
    "company": "保险公司",
    "annual_premium": 50000,
    "coverage_type": "保障类型",
    "reason": "推荐理由"
  }
]
```

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `product_name` | string | 产品名称 | "储蓄计划A" |
| `company` | string | 保险公司 | "友邦保险" |
| `annual_premium` | number | 年缴保费 | 50000 |
| `coverage_type` | string | 保障类型 | "储蓄"/"重疾"/"医疗"/"寿险" |
| `reason` | string | 推荐理由 | "稳健增值，长期收益可观" |

### key_points 数组结构

```json
[
  "关键要点1",
  "关键要点2",
  "关键要点3"
]
```

---

## 使用示例

### JavaScript (Axios)

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8007/api';

// 1. 获取所有案例
async function getAllCases() {
  try {
    const response = await axios.get(`${API_BASE_URL}/customer-cases/`);
    console.log('总案例数:', response.data.data.count);
    console.log('案例列表:', response.data.data.results);
  } catch (error) {
    console.error('获取失败:', error.response.data);
  }
}

// 2. 获取特定人生阶段的案例
async function getCasesByStage(stage) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/customer-cases/by-stage/${stage}/`
    );
    console.log(`${stage}案例数:`, response.data.data.count);
    console.log('案例列表:', response.data.data.cases);
  } catch (error) {
    console.error('获取失败:', error.response.data);
  }
}

// 3. 获取单个案例详情
async function getCaseDetail(caseId) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/customer-cases/${caseId}/`
    );
    console.log('案例详情:', response.data.data);
  } catch (error) {
    console.error('获取失败:', error.response.data);
  }
}

// 4. 搜索案例
async function searchCases(keyword) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/customer-cases/`,
      { params: { search: keyword } }
    );
    console.log('搜索结果:', response.data.data.results);
  } catch (error) {
    console.error('搜索失败:', error.response.data);
  }
}

// 5. 获取人生阶段列表
async function getLifeStages() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/customer-cases/life-stages/`
    );
    console.log('人生阶段列表:', response.data.data.stages);
  } catch (error) {
    console.error('获取失败:', error.response.data);
  }
}

// 6. 获取统计信息
async function getStatistics() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/customer-cases/statistics/`
    );
    console.log('统计信息:', response.data.data);
  } catch (error) {
    console.error('获取失败:', error.response.data);
  }
}

// 使用示例
getAllCases();
getCasesByStage('责任高峰期');
getCaseDetail(1);
searchCases('医疗');
getLifeStages();
getStatistics();
```

### Python (Requests)

```python
import requests

API_BASE_URL = 'http://localhost:8007/api'

# 1. 获取所有案例
def get_all_cases():
    response = requests.get(f'{API_BASE_URL}/customer-cases/')
    if response.status_code == 200:
        data = response.json()
        print(f"总案例数: {data['data']['count']}")
        print(f"案例列表: {data['data']['results']}")
    else:
        print(f"请求失败: {response.json()}")

# 2. 获取特定人生阶段的案例
def get_cases_by_stage(stage):
    response = requests.get(f'{API_BASE_URL}/customer-cases/by-stage/{stage}/')
    if response.status_code == 200:
        data = response.json()
        print(f"{stage}案例数: {data['data']['count']}")
        print(f"案例列表: {data['data']['cases']}")
    else:
        print(f"请求失败: {response.json()}")

# 3. 获取单个案例详情
def get_case_detail(case_id):
    response = requests.get(f'{API_BASE_URL}/customer-cases/{case_id}/')
    if response.status_code == 200:
        data = response.json()
        print(f"案例详情: {data['data']}")
    else:
        print(f"请求失败: {response.json()}")

# 4. 搜索案例
def search_cases(keyword):
    params = {'search': keyword}
    response = requests.get(f'{API_BASE_URL}/customer-cases/', params=params)
    if response.status_code == 200:
        data = response.json()
        print(f"搜索结果: {data['data']['results']}")
    else:
        print(f"请求失败: {response.json()}")

# 5. 获取人生阶段列表
def get_life_stages():
    response = requests.get(f'{API_BASE_URL}/customer-cases/life-stages/')
    if response.status_code == 200:
        data = response.json()
        print(f"人生阶段列表: {data['data']['stages']}")
    else:
        print(f"请求失败: {response.json()}")

# 6. 获取统计信息
def get_statistics():
    response = requests.get(f'{API_BASE_URL}/customer-cases/statistics/')
    if response.status_code == 200:
        data = response.json()
        print(f"统计信息: {data['data']}")
    else:
        print(f"请求失败: {response.json()}")

# 使用示例
get_all_cases()
get_cases_by_stage('责任高峰期')
get_case_detail(1)
search_cases('医疗')
get_life_stages()
get_statistics()
```

### cURL

```bash
# 1. 获取所有案例
curl -X GET "http://localhost:8007/api/customer-cases/"

# 2. 获取"责任高峰期"的案例
curl -X GET "http://localhost:8007/api/customer-cases/by-stage/责任高峰期/"

# 3. 获取ID为1的案例详情
curl -X GET "http://localhost:8007/api/customer-cases/1/"

# 4. 搜索包含"医疗"的案例
curl -X GET "http://localhost:8007/api/customer-cases/?search=医疗"

# 5. 获取人生阶段列表
curl -X GET "http://localhost:8007/api/customer-cases/life-stages/"

# 6. 获取统计信息
curl -X GET "http://localhost:8007/api/customer-cases/statistics/"

# 7. 分页获取（第2页，每页20条）
curl -X GET "http://localhost:8007/api/customer-cases/?page=2&page_size=20"

# 8. 按年收入倒序排列
curl -X GET "http://localhost:8007/api/customer-cases/?ordering=-annual_income"
```

---

## 错误代码说明

| HTTP状态码 | 说明 | 原因 |
|-----------|------|------|
| 200 | 成功 | 请求成功处理 |
| 400 | 请求错误 | 参数错误（如无效的人生阶段） |
| 404 | 未找到 | 案例不存在或未启用 |
| 500 | 服务器错误 | 服务器内部错误 |

---

## 最佳实践

### 1. 分页处理

推荐使用分页来处理大量数据：

```javascript
// 推荐
const response = await axios.get('/api/customer-cases/', {
  params: { page: 1, page_size: 20 }
});

// 不推荐（可能一次性加载过多数据）
const response = await axios.get('/api/customer-cases/', {
  params: { page_size: 1000 }
});
```

### 2. 错误处理

始终处理可能的错误：

```javascript
try {
  const response = await axios.get('/api/customer-cases/1/');
  // 处理成功响应
} catch (error) {
  if (error.response) {
    // 服务器返回错误响应
    console.error('错误:', error.response.data.message);
  } else {
    // 网络错误或其他问题
    console.error('请求失败:', error.message);
  }
}
```

### 3. 搜索优化

使用防抖(debounce)来优化搜索体验：

```javascript
import { debounce } from 'lodash';

const searchCases = debounce(async (keyword) => {
  const response = await axios.get('/api/customer-cases/', {
    params: { search: keyword }
  });
  // 处理结果
}, 300);
```

### 4. 缓存策略

对不经常变化的数据（如人生阶段列表）进行缓存：

```javascript
let cachedStages = null;

async function getLifeStages() {
  if (cachedStages) {
    return cachedStages;
  }

  const response = await axios.get('/api/customer-cases/life-stages/');
  cachedStages = response.data.data.stages;
  return cachedStages;
}
```

---

## 性能说明

### 查询性能

- 数据库索引已优化（`life_stage` + `is_active`, `sort_order`）
- 默认每页10条，最大50条
- 搜索功能使用数据库索引

### 响应时间

- 列表查询: < 100ms（10条记录）
- 详情查询: < 50ms
- 统计信息: < 200ms

---

## 更新日志

### v1.0.0 (2026-01-01)

- ✅ 初始版本发布
- ✅ 实现5个核心API端点
- ✅ 支持分页、搜索、筛选、排序
- ✅ 完整的错误处理
- ✅ 公开访问（无需认证）

---

## 技术支持

如有问题或建议，请联系系统管理员。

---

**文档版本**: v1.0.0
**最后更新**: 2026-01-01
**API版本**: v1
**Django版本**: 5.2.7

---

**文档结束**
