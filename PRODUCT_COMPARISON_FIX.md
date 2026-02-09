# 产品对比功能修复文档

## 修复日期
2026年2月5日

## 问题描述
在 Plan Management 页面选择2个或多个计划书，点击"产品对比"按钮后，对比表格显示为空白，无法正常显示数据。

## 根本原因分析

### 问题1：数据格式解析错误
**位置**：`frontend/src/components/PlanDocumentManagement.jsx:550`

**错误代码**：
```javascript
const tableData = doc.table1?.data || [];
```

**问题说明**：
- API (`/api/ocr/documents/`) 返回的 `table1` 字段是 **JSON 字符串**
- 前端代码直接访问 `doc.table1.data`，由于 `table1` 是字符串，`data` 属性为 `undefined`
- 导致 `tableData` 变成空数组 `[]`，后续无法提取任何数据

**修复方案**：
```javascript
// ⚠️ 修复：先解析 table1 字符串为对象
let table1Obj = doc.table1;
if (typeof doc.table1 === 'string') {
  try {
    table1Obj = JSON.parse(doc.table1);
  } catch (e) {
    console.error('❌ 解析 table1 失败:', doc.file_name, e);
    table1Obj = {};
  }
}

const tableData = table1Obj?.data || [];
```

### 问题2：字段名匹配不完整
**位置**：`frontend/src/components/PlanDocumentManagement.jsx:574`

**原有代码**：
```javascript
non_guaranteed_cash_value: englishFields.findIndex(f => 
  f === 'non_guaranteed_cash_value' || 
  f === 'terminal_dividend' || 
  f === 'non_guaranteed'
)
```

**问题说明**：
- 实际数据库中的字段名是 `reversionary_bonus_cash_value`（保额增值红利）和 `terminal_bonus_cash_value`（终期红利）
- 原有匹配规则不包含这些字段名
- 导致 `findIndex` 返回 `-1`，无法提取数据

**修复方案**：
```javascript
non_guaranteed_cash_value: englishFields.findIndex(f =>
  f === 'non_guaranteed_cash_value' ||
  f === 'terminal_bonus_cash_value' ||      // 新增：终期红利
  f === 'reversionary_bonus_cash_value' ||  // 新增：保额增值红利
  f === 'terminal_dividend' ||
  f === 'non_guaranteed'
)
```

## 实际数据格式说明

### API 返回格式
```json
{
  "id": 254,
  "file_name": "3 安盛盛利2_计划书.pdf",
  "table1": "{\"table_name\":\"...\",\"fields\":[...],\"data\":[[...]]}"  // ← JSON字符串
}
```

### table1 解析后的结构
```json
{
  "table_name": "退保价值表",
  "row_count": 138,
  "fields": ["保單年度終結", "已繳保費總額", "保證現金價值", "保額增值紅利之現金價值", "終期紅利之現金價值", "退保發還金額總額"],
  "data": [
    ["policy_year", "total_premiums_paid", "guaranteed_cash_value", "reversionary_bonus_cash_value", "terminal_bonus_cash_value", "surrender_value_after_withdrawal"],
    ["1", "10000", "0", "0", "0", "0"],
    ["2", "20000", "0", "0", "0", "0"]
  ],
  "policy_info": {...}
}
```

**关键特征**：
- ✅ `data[0]` 是英文字段名行（用于程序匹配）
- ✅ `data[1]` 开始是实际数据行
- ✅ 所有数值都是**字符串格式**（`"10000"` 而非 `10000`）

### 字段名对应关系

| 中文字段名 | 英文字段名 | 说明 |
|-----------|-----------|------|
| 保單年度終結 | `policy_year` | 保单年度 |
| 已繳保費總額 | `total_premiums_paid` | 累计已缴保费 |
| 保證現金價值 | `guaranteed_cash_value` | 保证现金价值 |
| 保額增值紅利之現金價值 | `reversionary_bonus_cash_value` | 保额增值红利 |
| 終期紅利之現金價值 | `terminal_bonus_cash_value` | 终期红利 |
| 退保發還金額總額 | `surrender_value_after_withdrawal` | 总现金价值（退保价值） |

## 修复内容

### 文件变更
**文件**：`frontend/src/components/PlanDocumentManagement.jsx`

**变更1：第549-560行** - 添加 table1 字符串解析
```javascript
// 提取对比数据
const comparison = selectedDocs.map(doc => {
  // ⚠️ 修复：先解析 table1 字符串为对象
  let table1Obj = doc.table1;
  if (typeof doc.table1 === 'string') {
    try {
      table1Obj = JSON.parse(doc.table1);
    } catch (e) {
      console.error('❌ 解析 table1 失败:', doc.file_name, e);
      table1Obj = {};
    }
  }

  const tableData = table1Obj?.data || [];
  const ageData = {};
  // ...
});
```

**变更2：第568-595行** - 增强字段名匹配规则
```javascript
const fieldIndexes = {
  policy_year: englishFields.findIndex(f => f === 'policy_year'),
  age: englishFields.findIndex(f => f === 'age'),
  total_premiums_paid: englishFields.findIndex(f =>
    f === 'total_premiums_paid' ||
    f === 'total_premium_paid' ||
    f === 'premiums_paid'
  ),
  guaranteed_cash_value: englishFields.findIndex(f =>
    f === 'guaranteed_cash_value' ||
    f === 'guaranteed'
  ),
  // 非保证现金价值：可能是终期红利或保额增值红利
  non_guaranteed_cash_value: englishFields.findIndex(f =>
    f === 'non_guaranteed_cash_value' ||
    f === 'terminal_bonus_cash_value' ||  // 终期红利
    f === 'reversionary_bonus_cash_value' ||  // 保额增值红利
    f === 'terminal_dividend' ||
    f === 'non_guaranteed'
  ),
  // 总现金价值：退保发还金额总额
  total_cash_value: englishFields.findIndex(f =>
    f === 'total_cash_value' ||
    f === 'surrender_value_after_withdrawal' ||  // 退保发还金额总额（最常见）
    f === 'total_surrender_value' ||
    f === 'total_value' ||
    f === 'total'
  ),
  withdrawal_amount: englishFields.findIndex(f => f === 'withdrawal_amount')
};
```

**变更3：第27行** - 分页优化
```javascript
const [pageSize] = useState(10); // 每页10条（原50条）
```

## 验证测试

### 测试步骤
1. 访问 `/plan-document-management` 页面
2. 选择2个已分析完成的文档（`processing_stage = 'all_completed'`）
3. 点击"产品对比"按钮
4. 检查对比表格是否显示以下数据：
   - ✅ 保单年度/年龄列
   - ✅ 已缴保费
   - ✅ 提取总额
   - ✅ 退保价值

### 测试用例
**文档ID**：254, 253
**文档名称**：
- `3 安盛盛利2_计划书.pdf`（受保人年龄：1岁）
- `41岁280700.pdf`（受保人年龄：41岁）

**预期结果**：
```
保单年度 | 产品1-已缴保费 | 产品1-退保价值 | 产品2-已缴保费 | 产品2-退保价值
   1    |    10,000     |      0        |    42        |    9,998
   2    |    20,000     |      0        |    84        |   19,996
```

### 调试命令
```bash
# 检查数据库中的数据格式
python3 manage.py shell << 'EOF'
from api.models import PlanDocument
import json

doc = PlanDocument.objects.get(id=254)
table1_obj = json.loads(doc.table1)
print("英文字段名:", table1_obj['data'][0])
print("第一行数据:", table1_obj['data'][1])
