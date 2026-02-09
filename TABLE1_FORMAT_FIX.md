# PlanDocumentManagement 页面 table1 格式兼容性修复

## 问题描述

在 **plan-management** 页面选择两个计划书进行对比时，出现错误提示：
```
以下文档尚未分析年度价值表，请先进行分析
```

即使文档已经完成分析并有 `table1` 数据，仍然出现此错误。

## 问题原因

代码中检查 `table1` 数据的逻辑只支持**旧格式**（二维数组格式），但新的 Gemini 分析流程返回的是**新格式**（JSON 对象格式），导致检查失败。

### 旧格式（二维数组）
```json
{
  "data": [
    ["policy_year", "guaranteed", "non_guaranteed", "total"],
    [1, 1000, 500, 1500],
    [2, 2000, 1000, 3000]
  ],
  "fields": ["policy_year", "guaranteed", "non_guaranteed", "total"]
}
```

### 新格式（JSON 对象）
```json
{
  "policy_info": {
    "姓名": "张三",
    "年龄": 30
  },
  "surrender_value_table": [
    {"保单年度": 1, "保证现金价值": 1000, "非保证现金价值": 500, "总现金价值": 1500},
    {"保单年度": 2, "保证现金价值": 2000, "非保证现金价值": 1000, "总现金价值": 3000}
  ]
}
```

## 解决方案

### 修改 1：检查逻辑兼容新旧格式

**文件**: `frontend/src/components/PlanDocumentManagement.jsx`

**修改位置**: `handleCompareProducts` 函数中的 `table1` 检查逻辑

**修改内容**:

```javascript
// 判断table1是否有值：支持两种格式
let hasTable = false;

if (doc.table1) {
  if (typeof doc.table1 === 'string') {
    // 如果是字符串，尝试解析 JSON
    try {
      const parsed = JSON.parse(doc.table1);
      // 检查新格式（surrender_value_table）或旧格式（data）
      hasTable = (parsed.surrender_value_table &&
                 Array.isArray(parsed.surrender_value_table) &&
                 parsed.surrender_value_table.length > 0) ||
                (parsed.data &&
                 Array.isArray(parsed.data) &&
                 parsed.data.length > 1);
    } catch (e) {
      // 不是 JSON，检查是否为非空字符串
      hasTable = doc.table1.trim().length > 0;
    }
  } else if (typeof doc.table1 === 'object') {
    // 如果是对象，检查新格式或旧格式
    hasTable = (doc.table1.surrender_value_table &&
               Array.isArray(doc.table1.surrender_value_table) &&
               doc.table1.surrender_value_table.length > 0) ||
              (doc.table1.data &&
               Array.isArray(doc.table1.data) &&
               doc.table1.data.length > 1);
  }
}

return !hasTable; // 返回是否缺少表格
```

### 修改 2：数据读取逻辑兼容新旧格式

**修改位置**: 动态计算年龄范围的代码

**修改内容**:

```javascript
// 动态计算所有文档的实际年龄范围
let allAges = new Set();
selectedDocs.forEach(doc => {
  const currentAge = doc.insured_age || 0;
  let tableData = [];

  // 解析 table1 数据，支持新旧两种格式
  const table1 = typeof doc.table1 === 'string'
    ? JSON.parse(doc.table1)
    : doc.table1;

  if (table1.surrender_value_table && Array.isArray(table1.surrender_value_table)) {
    // 新格式：JSON 对象数组
    tableData = table1.surrender_value_table;
    tableData.forEach(row => {
      const policyYear = row['保单年度'] || row['保單年度'] || row.policy_year;
      if (policyYear) {
        // 保单年度转换为年龄
        allAges.add(currentAge + parseInt(policyYear) - 1);
      }
    });
  } else if (table1.data && Array.isArray(table1.data)) {
    // 旧格式：二维数组
    // ... 原有逻辑 ...
  }
});
```

## 兼容性说明

### 支持的 table1 格式

| 格式类型 | 数据结构 | 关键字段 | 状态 |
|---------|---------|---------|------|
| 新格式（JSON） | 对象 | `surrender_value_table` | ✅ 支持 |
| 旧格式（数组） | 对象 | `data` + `fields` | ✅ 支持 |
| 字符串（JSON） | 字符串 | 解析后检查 | ✅ 支持 |
| 字符串（纯文本） | 字符串 | 非空即可 | ✅ 支持 |

### 检查条件

**新格式通过条件**:
```javascript
table1.surrender_value_table 存在 &&
Array.isArray(table1.surrender_value_table) &&
table1.surrender_value_table.length > 0
```

**旧格式通过条件**:
```javascript
table1.data 存在 &&
Array.isArray(table1.data) &&
table1.data.length > 1  // 至少有表头和一行数据
```

## 测试步骤

### 1. 测试新格式文档

1. 上传一份计划书，等待分析完成
2. 确认文档的 `table1` 数据格式为新格式（包含 `surrender_value_table`）
3. 在 plan-management 页面选择该文档
4. 点击"产品对比"按钮
5. ✅ 应该成功进入对比页面，不再提示"尚未分析年度价值表"

### 2. 测试旧格式文档

1. 选择一份旧格式的文档（`table1.data` 格式）
2. 与其他文档一起选择
3. 点击"产品对比"按钮
4. ✅ 应该正常工作

### 3. 测试混合格式

1. 同时选择新格式和旧格式的文档
2. 点击"产品对比"按钮
3. ✅ 应该都能正常识别和对比

### 4. 测试真正没有数据的文档

1. 选择一份处理中或失败的文档（没有 `table1` 数据）
2. 尝试对比
3. ✅ 应该正确提示"尚未分析年度价值表"

## 调试方法

### 检查文档的 table1 格式

在浏览器控制台执行：

```javascript
// 获取选中的文档
const selectedDocs = /* 你的选中文档 */;

// 检查每个文档的 table1 格式
selectedDocs.forEach(doc => {
  console.log('文件名:', doc.file_name);
  console.log('table1 类型:', typeof doc.table1);

  if (doc.table1) {
    if (typeof doc.table1 === 'string') {
      console.log('table1 是字符串，长度:', doc.table1.length);
      try {
        const parsed = JSON.parse(doc.table1);
        console.log('解析后的结构:', Object.keys(parsed));
        console.log('是否有 surrender_value_table:', !!parsed.surrender_value_table);
        console.log('是否有 data:', !!parsed.data);
      } catch (e) {
        console.log('无法解析为 JSON');
      }
    } else {
      console.log('table1 是对象');
      console.log('对象的键:', Object.keys(doc.table1));
      console.log('是否有 surrender_value_table:', !!doc.table1.surrender_value_table);
      console.log('是否有 data:', !!doc.table1.data);
    }
  } else {
    console.log('table1 为空');
  }
  console.log('---');
});
```

### 查看控制台日志

修改后的代码会输出详细的检查日志：

```
===== 开始检查选中的文档 =====
选中的文档数量: 2

--- 检查文档 ---
文件名: xxx.pdf
table1: [object]
table1是对象，hasTable: true
  - 新格式：surrender_value_table 长度: 50
最终 hasTable 结果: true
返回 !hasTable (缺少表格): false

===== 检查结果汇总 =====
没有table的文档数量: 0
没有table的文档: []
```

## 常见问题

### Q1: 为什么之前的文档突然不能对比了？

**A**: 因为你的文档使用了新的 Gemini 分析流程，返回的数据格式从旧的二维数组格式变成了新的 JSON 对象格式。旧的检查逻辑不认识新格式，所以误判为"没有数据"。

### Q2: 需要重新分析已有的文档吗？

**A**: **不需要**。修复后的代码同时支持新旧两种格式，已有的文档（无论新旧格式）都能正常使用。

### Q3: 如果还是提示错误怎么办？

**A**:
1. **清除浏览器缓存**：按 `Ctrl+Shift+R` 强制刷新
2. **检查数据格式**：使用上面的调试方法查看 `table1` 的实际格式
3. **查看控制台日志**：确认 `hasTable` 的检查结果
4. **检查文档状态**：确认文档的 `processing_stage` 是 `all_completed`

### Q4: 为什么有些文档有数据但还是提示错误？

**A**: 可能的原因：
1. `table1` 数据是空数组（`surrender_value_table: []` 或 `data: []`）
2. `table1` 是字符串但无法解析为 JSON
3. 数据格式不符合预期（既没有 `surrender_value_table` 也没有 `data`）

## 后续优化建议

### 1. 统一数据格式

建议后端统一返回新格式的 JSON 数据，逐步淘汰旧格式。

### 2. 添加数据验证

在保存 `table1` 数据时，添加格式验证：

```python
def validate_table1_data(table1_data):
    """验证 table1 数据格式"""
    if not table1_data:
        return False

    if isinstance(table1_data, dict):
        # 新格式
        if 'surrender_value_table' in table1_data:
            return len(table1_data['surrender_value_table']) > 0
        # 旧格式
        if 'data' in table1_data:
            return len(table1_data['data']) > 1

    return False
```

### 3. 前端提示优化

当检测到数据格式问题时，提供更详细的错误信息：

```javascript
if (docsWithoutTable.length > 0) {
  const errorDetails = docsWithoutTable.map(d => {
    return `${d.file_name} (状态: ${d.processing_stage})`;
  }).join('\n');

  alert(`以下文档尚未分析年度价值表，请先进行分析：\n\n${errorDetails}\n\n提示：如果文档已完成分析但仍提示错误，请刷新页面重试。`);
  return;
}
```

## 更新状态

- ✅ 代码已修改
- ✅ Vite HMR 已自动生效（10:40:20）
- ✅ 无需重启服务
- ✅ 立即可用

## 更新日期

2026-02-04

## 开发者

Claude Code (Anthropic)
