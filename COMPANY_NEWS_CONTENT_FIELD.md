# 公司新闻content字段功能说明

## 📋 需求背景

公司新闻类型的案例不需要显示"案例情况"和"案例说明"等传统案例字段，只需要一个字段存储完整的文章内容。

## ✅ 实现方案

### 1. 数据库变更

**新增字段**：
```python
content = models.TextField(
    verbose_name='文章内容',
    blank=True,
    default='',
    help_text='公司新闻/文章的完整内容（Markdown格式），用于替代case_description字段'
)
```

**字段类型**：TextField（对应MySQL的longtext）
**迁移文件**：`api/migrations/0060_remove_customercase_customer_ca_life_st_92c432_idx_and_more.py`

### 2. 数据模型（CustomerCase）

**公司新闻使用的字段**：
- ✅ `title` - 标题
- ✅ `category` - 固定为"公司新闻"
- ✅ `tags` - 标签（保险公司名 + 业务关键词）
- ✅ `content` - **新字段**，存储完整文章内容（Markdown格式）
- ✅ `key_points` - 核心速递（3-5条）

**占位字段**（设为默认值）：
- `customer_age` = 0
- `annual_income` = 0
- `family_structure` = '全市场'
- `insurance_needs` = '保险公司动态调研'
- `case_description` = ''（留空）
- `recommended_products` = []
- `total_annual_premium` = 0
- `budget_suggestion` = '参考市场信息'

### 3. 后端变更

#### 3.1 Serializer更新
**文件**：`api/serializers.py:91`
```python
fields = [
    ...
    'case_description',
    'content',  # 新增
    'key_points',
    ...
]
```

#### 3.2 AI生成脚本更新
**文件**：`auto_generate_insurance_market_news.py`

**Prompt变更**：
- 将JSON输出的 `case_description` 改为 `content`

**存储逻辑**：
```python
CustomerCase.objects.create(
    title=data.get('title'),
    category='公司新闻',
    tags=data.get('tags', [])[:3],
    content=data.get('content', ''),  # 使用content字段
    case_description='',  # 公司新闻不使用
    ...
)
```

### 4. 前端变更

#### 4.1 详情弹窗显示
**文件**：`frontend/src/components/CustomerCaseLibrary.jsx:451`

**显示优先级**：`content` > `case_description`（向后兼容）
```jsx
{(selectedCase.content || selectedCase.case_description) && (
  <div dangerouslySetInnerHTML={{
    __html: (selectedCase.content || selectedCase.case_description)
      .replace(/\n/g, '<br />')
      .replace(/### (.*?)(<br \/>|$)/g, '<h3>$1</h3>')
      ...
  }} />
)}
```

#### 4.2 卡片预览
**文件**：`frontend/src/components/CustomerCaseLibrary.jsx:304`
```jsx
{(caseItem.content || caseItem.case_description) && (
  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
    {(caseItem.content || caseItem.case_description)
      .replace(/###?\s/g, '')
      .substring(0, 100)}
  </p>
)}
```

#### 4.3 分类筛选
新增"公司新闻"分类选项卡：
```jsx
const CATEGORIES = [
  { id: '全部', name: '全部' },
  { id: '港险案例', name: '精选案例' },
  { id: '港险问答', name: '港险问答' },
  { id: '公司新闻', name: '公司新闻' }  // 新增
];
```

## 📝 文章内容结构（Markdown）

公司新闻的 `content` 字段采用统一的4段式结构：

```markdown
### 1. 核心快讯：市场地位与最新动向
（简述公司在行业内的地位及本次资讯的核心内容）

### 2. 深度解析：核心优势与数据表现
（详细展开：包括财报亮点、评级优势、或战略转型的具体措施）

### 3. 行业视野：对投保人的影响
（从专业角度分析，这些公司动态对现有保单持有人或潜在买家的意义）

### 4. 参考资料 (References)
（格式：[编号] [来源标题](URL)，必须是实际参考的网页深度链接）
```

## 🧪 测试脚本

**文件**：`test_company_news_content.py`

**功能**：
- 创建测试公司新闻记录
- 验证content字段存储和读取
- 输出详细测试报告

**运行**：
```bash
python3 test_company_news_content.py
```

## 🎯 使用指南

### 自动生成公司新闻
```bash
python3 auto_generate_insurance_market_news.py
```

**生成频率**：每60秒一条
**话题池**：8个预设主题（宏利、友邦、保诚、AXA、汇丰、周大福、万通、中银）

### 前端查看
1. 访问：`/customer-case-library`
2. 点击"公司新闻"分类
3. 查看案例详情 → 直接显示完整文章内容（无"案例情况"字段）

## 🔄 向后兼容

- ✅ 旧数据仍使用 `case_description` 字段
- ✅ 前端优先读取 `content`，不存在则回退到 `case_description`
- ✅ 港险问答/传统案例不受影响

## 📊 字段对比

| 案例类型 | 主要内容字段 | 显示方式 |
|---------|-------------|---------|
| 港险案例 | `case_description` | 显示案例情况 + 案例说明 |
| 港险问答 | `case_description` | 直接显示问答内容（Markdown） |
| 公司新闻 | `content` | 直接显示文章内容（Markdown） |

## 🚀 部署步骤

1. **数据库迁移**：
   ```bash
   python3 manage.py migrate
   ```

2. **重启Django**：
   ```bash
   sudo supervisorctl restart harry-insurance:harry-insurance-django
   ```

3. **构建前端**：
   ```bash
   cd frontend && npm run build
   ```

4. **测试验证**：
   ```bash
   python3 test_company_news_content.py
   ```

## ✅ 完成状态

- ✅ 数据库字段添加完成
- ✅ 模型迁移执行成功
- ✅ Serializer已更新
- ✅ AI生成脚本已适配
- ✅ 前端显示逻辑已优化
- ✅ 向后兼容性已保证
- ✅ 测试脚本已通过

---

**最后更新**：2026-01-29
**相关文件**：
- 模型：`api/models.py:1401`
- 迁移：`api/migrations/0060_*.py`
- Serializer：`api/serializers.py:91`
- 前端组件：`frontend/src/components/CustomerCaseLibrary.jsx`
- AI脚本：`auto_generate_insurance_market_news.py`
- 测试脚本：`test_company_news_content.py`
