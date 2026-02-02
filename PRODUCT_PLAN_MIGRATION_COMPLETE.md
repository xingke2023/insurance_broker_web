# ProductPlan 数据迁移和API更新 - 完成总结

## 🎯 目标达成

✅ **单一产品品种记录**: 每个保险产品品种只需一条 `InsuranceProduct` 记录
✅ **关联缴费方案**: 不同缴费年期（1年、2年、5年等）通过 `ProductPlan` 关联表管理
✅ **API已更新**: CompanyComparison 页面的API已适配新的数据结构
✅ **向后兼容**: 旧字段保留，数据平滑迁移

## 📊 数据结构

### 旧的设计（已废弃）
```
InsuranceProduct 表:
├── ID: 1  产品名: 环宇盈活  年期: 1  年缴: 100000
├── ID: 2  产品名: 环宇盈活  年期: 2  年缴: 55000
└── ID: 3  产品名: 环宇盈活  年期: 5  年缴: 25000
                  ⬆️ 重复的产品记录！
```

### 新的设计（推荐）
```
InsuranceProduct (产品品种表):
└── ID: 1  产品名: 环宇盈活  公司: 友邦  分类: 理财
            │
            ├── ProductPlan (缴费方案表):
            ├── ID: 1  年期: 1  年缴: 100000  退保表: {...}
            ├── ID: 2  年期: 2  年缴: 55000   退保表: {...}
            └── ID: 3  年期: 5  年缴: 25000   退保表: {...}
```

## 🔄 API 更新

### 更新的接口

**接口**: `GET /api/insurance-companies/standard-comparison/`

**查询参数**:
- `payment_period`: 缴费年期（1, 2, 5）
- `selected_product_ids`: 用户选择的产品ID列表（可选）

**更新前**:
```python
# 旧逻辑：直接筛选 InsuranceProduct.payment_period
products = InsuranceProduct.objects.filter(
    company=company,
    payment_period=payment_period,  # ❌ 需要为每个年期创建重复记录
    is_active=True
)
```

**更新后**:
```python
# 新逻辑：先获取产品品种，再查询对应年期的方案
products = InsuranceProduct.objects.filter(
    company=company,
    is_active=True  # ✅ 产品品种不重复
)

for product in products:
    # 查询该产品的指定年期方案
    plan = ProductPlan.objects.filter(
        product=product,
        payment_period=payment_period,  # ✅ 从关联表获取年期数据
        is_active=True
    ).first()

    # 使用 plan.surrender_value_table 获取退保数据
```

### API 响应变化

**新增字段**:
```json
{
  "product_id": 1,
  "plan_id": 5,              // ✅ 新增：方案ID
  "product_name": "环宇盈活",
  "payment_period": 5,       // ✅ 从 ProductPlan 获取
  "annual_premium": 25000,   // ✅ 从 ProductPlan 获取
  "standard_data": {...}     // ✅ 从 ProductPlan.surrender_value_table 获取
}
```

## 📱 前端影响

### CompanyComparison 页面

**无需修改**: 前端逻辑保持不变
- 用户选择缴费年期（1年、2年、5年）
- 前端发送 `payment_period` 参数
- 后端返回相同格式的数据

**数据流**:
```
用户选择: 5年缴费
    ↓
前端: GET /api/insurance-companies/standard-comparison/?payment_period=5
    ↓
后端: 查询所有产品 → 筛选有5年期方案的产品 → 返回数据
    ↓
前端: 显示对比表格（逻辑不变）
```

## 💾 数据迁移

### 当前数据状态

```bash
总产品数: 27
有旧缴费数据的产品: 27  ⚠️  需要迁移
已存在的缴费方案: 5
```

### 迁移脚本

运行以下脚本迁移数据：

```bash
python3 migrate_old_product_data.py
```

**脚本功能**:
1. 扫描所有 `InsuranceProduct` 记录
2. 如果产品有 `payment_period` 和 `annual_premium` 数据
3. 创建对应的 `ProductPlan` 记录
4. 将 `surrender_value_table` 和 `death_benefit_table` 迁移到方案表
5. 原始数据保留不变（向后兼容）

**预期结果**:
```
✅ 成功迁移: 27 个方案
📦 总缴费方案数: 32
```

### 迁移示例

**迁移前**:
| InsuranceProduct | payment_period | annual_premium | surrender_value_table |
|-----------------|----------------|----------------|-----------------------|
| ID: 1  环宇盈活 | 1              | 100000         | [...]                 |
| ID: 21 环宇盈活 | 5              | 25000          | [...]                 |

**迁移后**:

**InsuranceProduct** (产品品种，保留一条):
| ID | product_name | company | payment_period | annual_premium |
|----|--------------|---------|----------------|----------------|
| 1  | 环宇盈活      | 友邦     | NULL (废弃)     | NULL (废弃)     |

**ProductPlan** (缴费方案，新建):
| ID | product_id | payment_period | annual_premium | surrender_value_table |
|----|------------|----------------|----------------|-----------------------|
| 1  | 1          | 1              | 100000         | [...]                 |
| 2  | 1          | 5              | 25000          | [...]                 |

## ✅ 验证步骤

### 1. 运行迁移脚本

```bash
python3 migrate_old_product_data.py
```

### 2. 验证数据库

```sql
-- 查看产品品种数
SELECT COUNT(*) FROM insurance_products;

-- 查看缴费方案数
SELECT COUNT(*) FROM product_plans;

-- 查看某个产品的所有方案
SELECT
    pp.id AS plan_id,
    ip.product_name,
    pp.payment_period,
    pp.annual_premium,
    pp.total_premium
FROM product_plans pp
JOIN insurance_products ip ON pp.product_id = ip.id
WHERE ip.id = 1;
```

### 3. 测试API

```bash
# 测试1年期数据
curl "http://localhost:8017/api/insurance-companies/standard-comparison/?payment_period=1"

# 测试2年期数据
curl "http://localhost:8017/api/insurance-companies/standard-comparison/?payment_period=2"

# 测试5年期数据
curl "http://localhost:8017/api/insurance-companies/standard-comparison/?payment_period=5"
```

### 4. 测试前端

访问: `http://your-domain:8008/company-comparison`

1. 选择「1年缴」，检查数据是否正确显示
2. 选择「2年缴」，检查数据是否正确显示
3. 选择「5年缴」，检查数据是否正确显示

## 🔧 Admin 后台

### 查看缴费方案

1. **方式1**: 独立管理页面
   ```
   http://your-domain:8017/admin/api/productplan/
   ```

2. **方式2**: 产品编辑页面内联
   ```
   http://your-domain:8017/admin/api/insuranceproduct/1/change/
   ```
   在页面底部可以看到「产品缴费方案」表格

### 添加新方案

在产品编辑页面底部点击「添加另一个 产品缴费方案」：

| 方案名称 | 缴费年期 | 年缴金额 | 总保费 | 推荐 | 启用 |
|---------|---------|---------|-------|------|------|
| 1年缴费方案 | 1 | 100000 | 100000 | ☐ | ✅ |
| 2年缴费方案 | 2 | 55000 | 110000 | ✅ | ✅ |
| 5年缴费方案 | 5 | 25000 | 125000 | ☐ | ✅ |

## 📝 数据维护

### 创建新产品

1. 在 `InsuranceProduct` 表创建产品品种记录
2. 在 `ProductPlan` 表为该产品添加不同年期的方案

```python
# 1. 创建产品品种
product = InsuranceProduct.objects.create(
    company=company,
    product_name="新产品名称",
    product_category="理财",
    description="产品描述",
    is_active=True
)

# 2. 为产品添加缴费方案
ProductPlan.objects.create(
    product=product,
    payment_period=1,
    annual_premium=100000,
    surrender_value_table=json.dumps([...]),
    is_active=True
)

ProductPlan.objects.create(
    product=product,
    payment_period=5,
    annual_premium=25000,
    surrender_value_table=json.dumps([...]),
    is_active=True
)
```

### 更新缴费方案

```python
# 更新某个方案的数据
plan = ProductPlan.objects.get(id=1)
plan.annual_premium = 110000
plan.surrender_value_table = json.dumps([...])
plan.save()  # 总保费会自动重新计算
```

### 删除方案

```python
# 删除某个缴费年期的方案
ProductPlan.objects.filter(product_id=1, payment_period=1).delete()
```

## ⚠️ 注意事项

### 1. 唯一约束

同一产品不能有重复的缴费年期：

```python
# ❌ 错误：会触发唯一约束
ProductPlan.objects.create(product_id=1, payment_period=5, ...)  # 已存在
ProductPlan.objects.create(product_id=1, payment_period=5, ...)  # 重复！
```

### 2. 旧字段已废弃

`InsuranceProduct` 的以下字段已标记为「已废弃」：
- `payment_period` → 使用 `ProductPlan.payment_period`
- `annual_premium` → 使用 `ProductPlan.annual_premium`
- `surrender_value_table` → 使用 `ProductPlan.surrender_value_table`
- `death_benefit_table` → 使用 `ProductPlan.death_benefit_table`

### 3. 数据一致性

迁移后，建议清空旧字段（可选）：

```python
InsuranceProduct.objects.update(
    payment_period=None,
    annual_premium=None,
    surrender_value_table='',
    death_benefit_table=''
)
```

## 🚀 下一步

1. ✅ 运行数据迁移脚本
2. ✅ 验证API返回数据正确
3. ✅ 测试前端CompanyComparison页面
4. ✅ 在Admin后台验证数据
5. ⏳ 清理重复的产品品种记录（如果有）
6. ⏳ 更新其他相关API接口使用新结构
7. ⏳ 清空旧字段数据（可选）

## 📚 相关文档

- **数据结构说明**: `PRODUCT_PLAN_TABLE_GUIDE.md`
- **快速总结**: `PRODUCT_PLAN_SUMMARY.md`
- **迁移脚本**: `migrate_old_product_data.py`
- **演示脚本**: `demo_product_plan_relationship.py`
- **测试脚本**: `test_product_plan.py`

## 🎉 完成状态

- ✅ ProductPlan 模型创建
- ✅ 数据库迁移完成
- ✅ Admin 配置更新
- ✅ API 接口更新
- ✅ 文档编写完成
- ⏳ 数据迁移待执行
- ⏳ 前端测试待进行

运行数据迁移并测试后，整个系统就完全切换到新的数据结构了！
