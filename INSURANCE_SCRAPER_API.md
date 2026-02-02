# 保险公司信息爬虫 API 文档

## 📋 概述

智能爬虫系统，使用 **Gemini 3 Flash Preview** 自动抓取11家香港保险公司的官网信息：

### 支持的保险公司
1. **友邦** (AIA)
2. **保诚** (Prudential)
3. **宏利** (Manulife)
4. **永明** (Sun Life)
5. **安盛** (AXA)
6. **中银** (BOC Group)
7. **国寿** (China Life)
8. **富卫** (FWD)
9. **立桥** (Prudence)
10. **萬通** (YF Life)
11. **周大福** (CTF)

### 抓取内容

#### 1. 公司新闻 → `CompanyNews` 表
- 公司新闻和公告
- 客户优惠活动
- 新闻稿和报告
- PDF宣传资料

#### 2. 产品资料 → `ProductPromotion` 表
- 产品小册子
- 产品说明书
- 产品介绍视频
- 产品PDF文档

---

## 🚀 API 端点

### 1. 抓取公司新闻

**端点**: `POST /api/scraper/company-news/`

**权限**: 仅管理员

**功能**: 抓取指定公司（或所有公司）的新闻和优惠信息

**请求示例**:

```bash
# 抓取单个公司
curl -X POST http://localhost:8017/api/scraper/company-news/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": 3
  }'

# 抓取所有公司
curl -X POST http://localhost:8017/api/scraper/company-news/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**响应示例**:

```json
{
  "status": "success",
  "data": {
    "success": true,
    "company_name": "宏利",
    "created": 5,
    "updated": 2,
    "total": 7
  }
}
```

---

### 2. 抓取产品推广信息

**端点**: `POST /api/scraper/product-promotions/`

**权限**: 仅管理员

**功能**: 抓取指定产品的推广资料（小册子、说明书、PDF等）

**请求示例**:

```bash
curl -X POST http://localhost:8017/api/scraper/product-promotions/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 17
  }'
```

**响应示例**:

```json
{
  "status": "success",
  "data": {
    "success": true,
    "product_name": "宏摯傳承保障計劃",
    "created": 3,
    "updated": 1,
    "total": 4
  }
}
```

---

### 3. 抓取公司所有产品资料

**端点**: `POST /api/scraper/company-products/`

**权限**: 仅管理员

**功能**: 批量抓取某公司旗下所有产品的推广资料

**请求示例**:

```bash
curl -X POST http://localhost:8017/api/scraper/company-products/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": 3
  }'
```

**响应示例**:

```json
{
  "status": "success",
  "data": {
    "company_name": "宏利",
    "total_products": 5,
    "results": [
      {
        "product_name": "宏摯傳承保障計劃",
        "result": {
          "success": true,
          "created": 3,
          "updated": 1,
          "total": 4
        }
      }
    ]
  }
}
```

---

### 4. 查找公司页面

**端点**: `GET /api/scraper/find-pages/`

**权限**: 仅管理员

**功能**: 使用 Gemini 智能分析公司官网，找到新闻页面和产品页面

**请求示例**:

```bash
curl -X GET "http://localhost:8017/api/scraper/find-pages/?company_id=3" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**响应示例**:

```json
{
  "status": "success",
  "data": {
    "company_name": "宏利",
    "website_url": "https://www.manulife.com.hk/zh-hk.html",
    "news_page": "https://www.manulife.com.hk/zh-hk/individual/promotions/latest-customer-offers.html",
    "products_page": "https://www.manulife.com.hk/zh-hk/individual/products.html"
  }
}
```

---

### 5. 爬虫统计信息

**端点**: `GET /api/scraper/status/`

**权限**: 已登录用户

**功能**: 查看已抓取的新闻和产品资料统计

**请求示例**:

```bash
curl -X GET http://localhost:8017/api/scraper/status/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例**:

```json
{
  "status": "success",
  "data": {
    "company_news": {
      "total": 45,
      "by_company": [
        {"company__name": "友邦", "count": 12},
        {"company__name": "宏利", "count": 10},
        {"company__name": "保诚", "count": 8}
      ]
    },
    "product_promotions": {
      "total": 78,
      "by_company": [
        {"product__company__name": "友邦", "count": 20},
        {"product__company__name": "宏利", "count": 18}
      ]
    }
  }
}
```

---

## 🔧 使用示例

### Python 示例

```python
import requests

API_BASE = "http://localhost:8017/api"
ADMIN_TOKEN = "your_admin_token_here"

headers = {
    "Authorization": f"Bearer {ADMIN_TOKEN}",
    "Content-Type": "application/json"
}

# 1. 抓取所有公司新闻
response = requests.post(
    f"{API_BASE}/scraper/company-news/",
    headers=headers,
    json={}
)
print(response.json())

# 2. 抓取特定产品资料
response = requests.post(
    f"{API_BASE}/scraper/product-promotions/",
    headers=headers,
    json={"product_id": 17}
)
print(response.json())

# 3. 查看统计
response = requests.get(
    f"{API_BASE}/scraper/status/",
    headers=headers
)
print(response.json())
```

### JavaScript 示例

```javascript
const API_BASE = 'http://localhost:8017/api';
const ADMIN_TOKEN = 'your_admin_token_here';

const headers = {
  'Authorization': `Bearer ${ADMIN_TOKEN}`,
  'Content-Type': 'application/json'
};

// 抓取公司新闻
fetch(`${API_BASE}/scraper/company-news/`, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify({ company_id: 3 })
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 📊 数据模型

### CompanyNews（公司新闻表）

| 字段 | 类型 | 说明 |
|------|------|------|
| company | ForeignKey | 所属公司 |
| title | CharField | 新闻标题 |
| content_type | CharField | 类型（news/announcement/brochure等） |
| description | TextField | 描述摘要 |
| content | TextField | PDF Base64编码内容 |
| url | URLField | 外部链接 |
| published_date | DateField | 发布日期 |
| is_featured | BooleanField | 是否精选 |
| is_active | BooleanField | 是否启用 |

### ProductPromotion（产品资料表）

| 字段 | 类型 | 说明 |
|------|------|------|
| product | ForeignKey | 所属产品 |
| title | CharField | 资料标题 |
| content_type | CharField | 类型（brochure/guide/video等） |
| description | TextField | 描述摘要 |
| url | URLField | 外部链接 |
| pdf_base64 | TextField | PDF Base64编码 |
| published_date | DateField | 发布日期 |
| is_active | BooleanField | 是否启用 |

---

## 🧪 测试脚本

运行测试脚本：

```bash
cd /var/www/harry-insurance2
python3 test_scraper.py
```

测试内容：
1. ✅ 查找公司页面
2. ✅ Gemini网页分析
3. ✅ 抓取公司新闻
4. ✅ 抓取产品推广信息

---

## 🛠️ 技术实现

### 核心技术栈
- **AI引擎**: Google Gemini 3 Flash Preview
- **网页获取**: requests + BeautifulSoup
- **数据存储**: Django ORM
- **API框架**: Django REST Framework

### 爬虫流程

```
1. 获取公司官网URL（从 InsuranceCompany 表）
     ↓
2. 使用 Gemini 智能分析首页，找到新闻页面
     ↓
3. 获取新闻页面HTML内容
     ↓
4. Gemini 提取结构化数据（标题、描述、链接、PDF等）
     ↓
5. 下载PDF文件并转换为Base64
     ↓
6. 保存到 CompanyNews 或 ProductPromotion 表
     ↓
7. 自动去重（根据URL判断）
```

### 智能特性
✅ **自动去重**: 根据URL判断是否已存在
✅ **智能补全**: 相对路径自动转换为绝对路径
✅ **PDF下载**: 自动下载并转换为Base64
✅ **日期识别**: 自动解析发布日期
✅ **内容分类**: 自动识别内容类型（新闻/公告/小册子等）
✅ **精选标记**: 自动标记重要/精选内容

---

## 📝 注意事项

1. **权限要求**: 所有爬虫API需要管理员权限
2. **API限制**: 注意Gemini API的调用频率限制
3. **超时设置**: 网页获取默认超时30秒
4. **错误处理**: 失败会自动跳过并记录错误
5. **官网URL**: 确保InsuranceCompany表中配置了正确的官网URL
6. **产品URL**: 产品抓取需要在InsuranceProduct表中配置产品链接

---

## 🔄 定时任务（推荐）

可以使用 Django Celery 定时任务每天自动抓取：

```python
from celery import shared_task

@shared_task
def daily_scrape_company_news():
    """每天凌晨2点抓取所有公司新闻"""
    from api.insurance_scraper_service import scraper_service
    return scraper_service.scrape_all_companies()
```

---

## 📞 支持与反馈

如有问题或建议，请联系开发团队。
