# Table1 格式检测修复（最终版本）

## 问题描述

在 **plan-management** 页面选择两个计划书进行对比时，出现错误提示：
```
以下文档尚未分析年度价值表，请先进行分析
```

即使文档已经完成分析（`processing_stage: 'all_completed'`）并有 `table1` 数据，仍然出现此错误。

## 根本原因

前端检查逻辑只支持以下两种格式：
- 新格式：`surrender_value_table` 数组
- 旧格式：`data` 数组

但实际数据库中的 `table1` 数据格式是：
```json
{
  "table_name": "退保价值表",
  "row_count": 60,
  "fields": [...],
  "data": [...],
  "policy_info": {...}
}
```

**问题点**：
1. ❌ 代码检查 `surrender_value_table`，但数据中没有这个字段
2. ✅ 数据中有 `data` 字段，但检查逻辑有问题
3. ❌ 没有统一处理字符串和对象两种情况

## 实际数据结构示例

### 数据库中的实际格式（plan_documents.table1）

```json
{
  "table_name": "退保价值表",
  "row_count": 60,
  "fields": [
    "保單年度終結",
    "年齡",
    "繳付保費總額",
    "保證現金價值",
    "終期紅利",
    "總額"
  ],
  "data": [
    ["policy_year", "age", "total_premiums_paid", "guaranteed_cash_value", "terminal_dividend", "surrender_value_after_withdrawal"],
    ["1", "42", "9998", "0", "0", "0"],
    ["2", "43", "19997", "0", "0", "0"],
    ...
  ],
  "policy_info": {
    "保险公司名称": "周大福人壽保險有限公司",
    "产品名称": "「守護家倍198」危疾保障計劃",
    "姓名": "vip女士",
    "年龄": "41",
    "性别": "女",
    "保额": "280700",
    "年缴保费": "9998.27",
    "缴费年数": "25",
    "总保费": "249956.75",
    "保险期限": "至100歲"
  }
}
```

### 检查逻辑的三种格式支持

| 格式类型 | 数据结构 | 关键字段 | 状态 |
|---------|---------|---------|------|
| **格式1：新格式（Gemini）** | 对象 | `surrender_value_table` 数组 | ✅ 支持 |
| **格式2：标准格式** | 对象 | `table_name` + `fields` + `data` + `policy_info` | ✅ 支持（本次修复）|
| **格式3：旧格式** | 对象 | `data` + `fields` | ✅ 支持 |

## 解决方案

### 修改位置
**文件**: `frontend/src/components/PlanDocumentManagement.jsx`
**函数**: `handleCompareProducts` (行 342-380)

### 修复代码

```javascript
// 判断table1是否有值：支持三种格式
// 1. 新格式（Gemini）: {policy_info: {...}, surrender_value_table: [...]}
// 2. 标准格式: {table_name: "...", fields: [...], data: [...], policy_info: {...}}
// 3. 旧格式: {data: [...], fields: [...]}
let hasTable = false;
let table1Obj = null;

if (doc.table1) {
  // 统一转换为对象
  if (typeof doc.table1 === 'string') {
    try {
      table1Obj = JSON.parse(doc.table1);
      console.log('table1是字符串，解析后的keys:', Object.keys(table1Obj));
    } catch (e) {
      // 不是JSON，检查是否为非空字符串
      hasTable = doc.table1.trim().length > 0;
      console.log('table1是非JSON字符串，长度:', doc.table1.trim().length);
    }
  } else if (typeof doc.table1 === 'object') {
    table1Obj = doc.table1;
    console.log('table1是对象，keys:', Object.keys(table1Obj));
  }

  // 检查对象中是否有有效数据
  if (table1Obj) {
    // 格式1：新格式（Gemini）
    if (table1Obj.surrender_value_table &&
        Array.isArray(table1Obj.surrender_value_table) &&
        table1Obj.surrender_value_table.length > 0) {
      hasTable = true;
      console.log('✅ 检测到新格式（surrender_value_table），长度:', table1Obj.surrender_value_table.length);
    }
    // 格式2 & 3：标准格式/旧格式（有data数组）
    else if (table1Obj.data &&
             Array.isArray(table1Obj.data) &&
             table1Obj.data.length > 1) {
      hasTable = true;
      console.log('✅ 检测到data格式，data长度:', table1Obj.data.length);
    }
    // 没有匹配的格式
    else {
      console.log('❌ table1存在但格式不匹配');
      console.log('   - 有surrender_value_table?', !!table1Obj.surrender_value_table);
      console.log('   - 有data?', !!table1Obj.data);
      console.log('   - data是数组?', Array.isArray(table1Obj.data));
      console.log('   - data长度:', table1Obj.data?.length);
    }
  }
}

console.log('最终 hasTable 结果:', hasTable);
console.log('返回 !hasTable (缺少表格):', !hasTable);
return !hasTable;
```

## 修复要点

### 1. 统一处理字符串和对象
**之前的问题**：分别处理字符串和对象，逻辑重复且容易遗漏
**现在的方案**：先统一转换为对象（`table1Obj`），然后统一检查

### 2. 支持标准格式的 data 字段
**之前的问题**：检查 `data` 时，如果 `table1` 是字符串则无法正确检查
**现在的方案**：先解析字符串为对象，再检查 `data` 字段

### 3. 详细的调试日志
**新增功能**：
- 显示解析后的对象 keys
- 区分三种格式的检测结果
- 失败时显示详细的诊断信息

## 测试步骤

### 1. 清除浏览器缓存
按 `Ctrl+Shift+R` 强制刷新页面

### 2. 打开浏览器控制台
按 `F12` 打开开发者工具，切换到 Console 标签

### 3. 选择两个计划书进行对比
- 进入 `/plan-management` 页面
- 选择两个已完成分析的文档（如 ID 253 和 254）
- 点击"产品对比"按钮

### 4. 查看控制台日志

**成功的日志示例**：
```
===== 开始检查选中的文档 =====
选中的文档数量: 2

--- 检查文档 ---
文件名: 41岁280700.pdf
table1: [object Object]
table1是对象，keys: ["table_name", "row_count", "fields", "data", "policy_info"]
✅ 检测到data格式，data长度: 60
最终 hasTable 结果: true
返回 !hasTable (缺少表格): false

--- 检查文档 ---
文件名: 3 安盛盛利2_计划书.pdf
table1: [object Object]
table1是对象，keys: ["table_name", "row_count", "fields", "data", "policy_info"]
✅ 检测到data格式，data长度: 138
最终 hasTable 结果: true
返回 !hasTable (缺少表格): false

===== 检查结果汇总 =====
没有table的文档数量: 0
没有table的文档: []
```

### 5. 预期结果
✅ 成功进入产品对比页面（`/company-comparison`）
✅ 不再显示"以下文档尚未分析年度价值表"错误

## 数据库验证

### 查看已完成文档的 table1 数据

```bash
mysql -u root -p'Uu8297636' -h 127.0.0.1 -P 8510 insurancetools -e \
"SELECT id, file_name,
 CASE
   WHEN table1 IS NULL THEN 'NULL'
   WHEN table1 = '' THEN 'EMPTY'
   ELSE CONCAT(SUBSTRING(table1, 1, 150), '...')
 END as table1_preview,
 processing_stage, status
FROM plan_documents
WHERE status='completed'
ORDER BY id DESC
LIMIT 5;"
```

### 最近5条文档的实际数据

| id | file_name | table1_preview | processing_stage | status |
|----|-----------|----------------|------------------|--------|
| 254 | 3 安盛盛利2_计划书.pdf | `{"table_name": "退保价值表", "row_count": 138, "fields": [...], "data": [...]}` | all_completed | completed |
| 253 | 41岁280700.pdf | `{"table_name": "退保价值表", "row_count": 60, "fields": [...], "data": [...]}` | all_completed | completed |
| 252 | 保诚年缴1万5年_计划书.pdf | `{"table_name": "退保价值表", "row_count": 101, "fields": [...], "data": [...]}` | all_completed | completed |

**结论**：所有已完成的文档都使用标准格式（有 `data` 字段），符合格式2的定义。

## 常见问题

### Q1: 为什么之前的修复没有生效？

**A**: 之前的修复检查了 `surrender_value_table` 和 `data`，但没有正确处理以下情况：
1. `table1` 从 API 返回时可能是字符串（需要先解析）
2. 解析后检查 `data` 字段时，之前的代码可能在字符串分支中遗漏了检查

### Q2: 如何确认修复已生效？

**A**:
1. 查看 Vite HMR 日志：应该显示 `11:36:11 [vite] (client) hmr update /src/components/PlanDocumentManagement.jsx`
2. 浏览器控制台显示新的日志格式（带 ✅ 符号）
3. 选择文档对比不再提示错误

### Q3: 如果还是提示错误怎么办？

**A**:
1. **强制刷新浏览器**：`Ctrl+Shift+R`
2. **查看控制台日志**：截图或复制完整的日志信息
3. **检查文档数据**：使用上面的 SQL 查询查看 `table1` 实际内容
4. **验证文档状态**：确认 `processing_stage` 是 `all_completed`

## 技术细节

### API 返回的数据类型

**从 `/api/ocr/documents/` 返回的数据**：
- `table1` 字段可能是：
  - `null` - 未处理
  - `string` - JSON 字符串（需要 `JSON.parse()`）
  - `object` - 已解析的对象（某些序列化器可能自动解析）

### 前端处理逻辑

```javascript
// 统一转换为对象
let table1Obj = null;
if (typeof doc.table1 === 'string') {
  table1Obj = JSON.parse(doc.table1);  // 字符串 → 对象
} else if (typeof doc.table1 === 'object') {
  table1Obj = doc.table1;  // 已经是对象
}

// 统一检查对象的字段
if (table1Obj) {
  if (table1Obj.surrender_value_table && ...) { ... }
  else if (table1Obj.data && ...) { ... }
}
```

## 更新状态

- ✅ 代码已修改（2026-02-04 11:36:11）
- ✅ Vite HMR 已自动生效
- ✅ 无需重启服务
- ✅ 立即可用

## 相关文件

- `frontend/src/components/PlanDocumentManagement.jsx` - 前端检查逻辑
- `plan_documents` 表 - 数据库表
- `table1` 字段 - 存储退保价值表的 JSON 数据

## 开发者

Claude Code (Anthropic) - 2026-02-04
