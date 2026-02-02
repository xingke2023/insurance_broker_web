# 客户案例库：从 life_stage 迁移到 tags 系统

## 📋 迁移概述

将 `CustomerCase` 模型的 `life_stage` 字段（固定选项）改为 `tags` 字段（灵活的多标签系统）。

## ✅ 已完成的修改

### 1. 数据库模型 (`api/models.py`)

**之前**：
```python
life_stage = models.CharField(
    max_length=50,
    choices=[
        ('扶幼保障期', '扶幼保障期（25-30岁）'),
        ('收入成长期', '收入成长期（31-40岁）'),
        ...
    ]
)
```

**之后**：
```python
tags = models.JSONField(
    verbose_name='标签',
    default=list,
    blank=True,
    help_text='案例标签列表，例如：["扶幼保障期", "高收入", "海外资产配置"]'
)
```

### 2. API接口更新 (`api/customer_case_views.py`)

#### 修改的接口：

| 原接口 | 新接口 | 说明 |
|-------|--------|------|
| `GET /api/customer-cases/?life_stage=扶幼保障期` | `GET /api/customer-cases/?tags=扶幼保障期,高收入` | 支持多标签筛选（逗号分隔） |
| `GET /api/customer-cases/by-stage/<stage>/` | `GET /api/customer-cases/by-tag/<tag>/` | 按单个标签筛选 |
| `GET /api/customer-cases/life-stages/` | `GET /api/customer-cases/tags/` | 获取所有标签及统计 |
| `GET /api/customer-cases/statistics/` | `GET /api/customer-cases/statistics/` | 统计改为按标签分组 |

#### 新接口响应示例：

**GET `/api/customer-cases/tags/`**
```json
{
  "success": true,
  "data": {
    "tags": [
      {"name": "扶幼保障期", "count": 3},
      {"name": "高收入", "count": 2},
      {"name": "海外资产配置", "count": 1}
    ],
    "total": 3
  }
}
```

**GET `/api/customer-cases/statistics/`**
```json
{
  "success": true,
  "data": {
    "total_cases": 10,
    "active_cases": 8,
    "total_tags": 5,
    "by_tag": {
      "扶幼保障期": 3,
      "高收入": 2,
      "海外资产配置": 1
    },
    "avg_income": 500000.00,
    "avg_premium": 80000.00
  }
}
```

### 3. 序列化器更新 (`api/serializers.py`)

```python
class CustomerCaseSerializer(serializers.ModelSerializer):
    class Meta:
        fields = [
            'id',
            'title',
            'tags',  # ✅ 改为 tags
            'customer_age',
            ...
        ]
```

### 4. URL路由更新 (`api/urls.py`)

```python
# 新路由
path('customer-cases/by-tag/<str:tag>/', get_cases_by_tag, name='get-cases-by-tag'),
path('customer-cases/tags/', get_all_tags, name='get-all-tags'),
```

### 5. Django Admin更新 (`api/admin.py`)

- ✅ 列表显示：添加 `tags_display` 方法，彩色标签显示
- ✅ 筛选器：移除 `life_stage` 筛选
- ✅ 字段配置：更新 fieldsets，添加标签使用说明

## 🎯 标签系统优势

### 之前（life_stage）：
- ❌ 每个案例只能属于一个人生阶段
- ❌ 固定的5个选项，不灵活
- ❌ 无法表达"高收入"、"海外资产"等其他维度

### 之后（tags）：
- ✅ 每个案例可以有多个标签
- ✅ 标签完全自定义，无限扩展
- ✅ 支持多维度分类（人生阶段 + 收入水平 + 产品类型等）

### 推荐的标签分类：

**人生阶段**：
- 扶幼保障期
- 收入成长期
- 责任高峰期
- 责任递减期
- 退休期

**收入水平**：
- 中产家庭
- 高收入
- 超高净值

**配置类型**：
- 教育金规划
- 养老规划
- 财富传承
- 重疾保障
- 医疗保障

**特色需求**：
- 美元资产
- 海外资产配置
- 税务筹划
- 多币种

## 📝 使用示例

### 创建案例（Django Admin）

```json
{
  "title": "中产家庭的美金教育金方案",
  "tags": ["扶幼保障期", "中产家庭", "教育金规划", "美元资产"],
  "customer_age": 32,
  "annual_income": 500000,
  ...
}
```

### 前端查询（API调用）

```javascript
// 查询"扶幼保障期" + "高收入"的案例
fetch('/api/customer-cases/?tags=扶幼保障期,高收入')

// 获取所有标签
fetch('/api/customer-cases/tags/')

// 按单个标签筛选
fetch('/api/customer-cases/by-tag/教育金规划/')
```

## 🔄 数据迁移

迁移已完成：
- ✅ 原有 `life_stage` 数据自动转为 `tags` 数组
- ✅ 空值处理为空数组 `[]`
- ✅ 删除旧的 `life_stage` 字段
- ✅ 迁移记录已写入 `django_migrations` 表

## 🚀 后续步骤

1. **前端更新**：修改前端组件，使用新的 `tags` API
2. **添加案例**：在Django Admin中添加典型案例（如您提供的4个案例）
3. **标签规范**：制定标签命名规范，避免重复（如"扶幼保障期" vs "扶幼"）

## 📚 参考文档

- `CUSTOMER_CASE_API_DOCUMENTATION.md` - API详细文档
- `CUSTOMER_CASE_IMPLEMENTATION.md` - 实现指南
- `api/customer_case_views.py` - 视图源代码
- `api/models.py:1154` - CustomerCase 模型定义
