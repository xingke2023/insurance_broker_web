# table1字段前端展示功能

## 功能说明

前端文档详情页（DocumentDetail.jsx）已经实现了完整的 `table1` 字段展示功能，可以显示所有字段和数据。

## 数据流向

```
后端 API (get_document_detail)
    ↓
解析 table1 JSON字段
    ↓
返回完整的表格对象
    {
      "table_name": "...",
      "row_count": 97,
      "fields": [...10个字段...],
      "data": [[...], [...], ...]
    }
    ↓
前端 DocumentDetail.jsx
    ↓
展示完整的表格（所有字段、所有行）
```

## 后端修改

### 修改位置
`api/ocr_views.py` - `get_document_detail` 函数（第332-362行）

### 修改前逻辑
```python
# ❌ 问题：优先从AnnualValue构建（只有4个字段）
if doc.annual_values.exists():
    # 构建简化版：只有4个字段
    table1_data = {
        'fields': ['保单年度终结', '保证现金价值', '非保证现金价值', '总现金价值']
    }
elif doc.table1:
    # 其次才用table1字段（完整的10个字段）
    table1_data = json.loads(doc.table1)
```

**问题**:
- 文档188既有 `AnnualValue` 记录，又有 `table1` JSON数据
- API优先返回 AnnualValue（4字段），忽略了完整的 table1（10字段）

### 修改后逻辑
```python
# ✅ 优先使用table1字段（完整数据）
if doc.table1:
    # 优先：从table1字段获取（完整的10个字段）
    table1_data = json.loads(doc.table1)

# 降级：如果table1为空，从AnnualValue构建
if not table1_data and doc.annual_values.exists():
    # 构建简化版：只有4个字段
    table1_data = {
        'fields': ['保单年度终结', '保证现金价值', '非保证现金价值', '总现金价值']
    }
```

**优势**:
- 优先展示完整数据（10字段）
- 只有在没有 table1 时才降级到 AnnualValue
- 向后兼容旧文档

## 前端展示功能

### 文件位置
`frontend/src/components/DocumentDetail.jsx`

### 功能特性

#### 1. 折叠卡片设计
```jsx
<div className="bg-white rounded-lg shadow-sm border">
  <div className="flex items-center justify-between">
    <h2>保单价值表</h2>
    <span>({table_name} - {row_count} 行)</span>
    <button>重新提取</button>
  </div>

  {isTable1Open && (
    <table>
      {/* 表格内容 */}
    </table>
  )}
</div>
```

#### 2. 表格显示（完整）
```jsx
<table className="w-full text-xs border-collapse">
  <thead className="bg-gray-100">
    <tr>
      {/* 显示所有字段名（10列） */}
      {document.table1.fields?.map((field, idx) => (
        <th key={idx}>{field}</th>
      ))}
    </tr>
  </thead>
  <tbody>
    {/* 显示所有数据行（97行） */}
    {document.table1.data.map((row, rowIdx) => (
      <tr key={rowIdx}>
        {row.map((cell, colIdx) => (
          <td key={colIdx}>
            {cell !== null ? cell : '-'}
          </td>
        ))}
      </tr>
    ))}
  </tbody>
</table>
```

#### 3. 重新提取功能
```jsx
<button
  onClick={handleReextractTable1}
  disabled={reextractingTable1 || !document.tablesummary}
>
  {reextractingTable1 ? '提取中...' : '🔄 重新提取'}
</button>
```

**逻辑**:
1. 调用 `/api/ocr/documents/{id}/reextract-table1/` API
2. 启动轮询检查处理状态
3. 完成后自动刷新页面显示新数据

#### 4. 空状态处理
```jsx
{document.table1 && document.table1.data?.length > 0 ? (
  <table>{/* 显示数据 */}</table>
) : (
  <div className="text-center py-6">
    <p>暂无保单价值表数据</p>
    {document.tablesummary ? (
      <button>📊 提取保单价值表</button>
    ) : (
      <p>请先完成表格分析</p>
    )}
  </div>
)}
```

#### 5. 兼容多种格式
```jsx
// 支持数组格式 ✅（当前格式）
{Array.isArray(document.table1.data[0]) &&
  document.table1.fields?.map(field => <th>{field}</th>)
}

// 也支持对象格式（向后兼容）
{!Array.isArray(document.table1.data[0]) &&
  Object.keys(document.table1.data[0]).map(col => <th>{col}</th>)
}
```

## 数据示例

### API返回（修改后）
```json
{
  "status": "success",
  "data": {
    "id": 188,
    "file_name": "41岁女士法国盛利_II_至尊-50000-5年...",
    "table1": {
      "table_name": "補充說明摘要 – 沒有行使保單選項",
      "row_count": 97,
      "fields": [
        "保單年度終結",
        "已繳保費總額",
        "退保發還金額-保證金額現金價值(1)",
        "退保發還金額-非保證金額-保額增值紅利之現金價值(2)",
        "退保發還金額-非保證金額-終期紅利之現金價值(3)",
        "退保發還金額-總額(1)+(2)+(3)",
        "身故保險賠償-保證金額身故保險賠償(4)",
        "身故保險賠償-非保證金額-保額增值紅利之面值(5)",
        "身故保險賠償-非保證金額-終期紅利之面值(6)",
        "身故保險賠償-總額(4)+(5)+(6)"
      ],
      "data": [
        ["1", "50,000", "-", "-", "-", "-", "50,000", "-", "-", "50,000"],
        ["2", "100,000", "-", "-", "-", "-", "100,000", "-", "-", "100,000"],
        ["3", "150,000", "2,250", "8,000", "5,160", "15,410", "150,000", "8,000", "5,160", "163,160"],
        ["5", "250,000", "11,250", "24,000", "147,960", "183,210", "250,000", "24,000", "147,960", "421,960"],
        ...
        ["97", "250,000", "...", "...", "...", "...", "...", "...", "...", "..."]
      ]
    }
  }
}
```

### 前端显示效果

#### 折叠标题
```
📊 保单价值表 (補充說明摘要 – 沒有行使保單選項 - 97 行) [🔄 重新提取]
```

#### 展开表格
```
┌─────────────┬──────────┬────────────────┬────────────────┬──────────┐
│ 保單年度終結 │ 已繳保費  │ 退保發還金額-   │ 退保發還金額-   │ ...      │
│             │ 總額      │ 保證金額(1)     │ 非保證金額(2)   │          │
├─────────────┼──────────┼────────────────┼────────────────┼──────────┤
│ 1           │ 50,000   │ -              │ -              │ ...      │
│ 2           │ 100,000  │ -              │ -              │ ...      │
│ 3           │ 150,000  │ 2,250          │ 8,000          │ ...      │
│ 5           │ 250,000  │ 11,250         │ 24,000         │ ...      │
│ ...         │ ...      │ ...            │ ...            │ ...      │
│ 97          │ 250,000  │ ...            │ ...            │ ...      │
└─────────────┴──────────┴────────────────┴────────────────┴──────────┘
```

## 响应式设计

### 移动端优化
```jsx
<table className="w-full text-xs">  {/* 小字体 */}
  <th className="px-2 sm:px-3 py-1.5 sm:py-2">  {/* 响应式padding */}
    <span className="whitespace-nowrap">  {/* 防止换行 */}
      {field}
    </span>
  </th>
</table>

<div className="overflow-x-auto">  {/* 横向滚动 */}
  <table>...</table>
</div>
```

### 样式特性
- ✅ 响应式布局（sm/base断点）
- ✅ 横向滚动（宽表格）
- ✅ 悬停高亮（hover:bg-gray-50）
- ✅ 边框样式（border-collapse）
- ✅ 单元格对齐（text-left）

## 使用流程

### 查看表格
1. 进入文档详情页：`/document/{id}`
2. 找到"保单价值表"卡片
3. 点击标题展开折叠面板
4. 查看完整的10列表格数据

### 重新提取
1. 点击"🔄 重新提取"按钮
2. 系统调用步骤3任务
3. 等待提取完成（自动轮询）
4. 页面自动刷新显示新数据

### 前置条件
- ✅ 必须已完成OCR识别（content字段）
- ✅ 必须已完成表格分析（tablesummary字段）
- ❌ 如果没有tablesummary，按钮禁用

## 对比：AnnualValue vs table1

| 特性 | AnnualValue（简化版） | table1（完整版） |
|------|---------------------|----------------|
| 字段数 | 4个 | 10个 |
| 字段名 | 固定（年度、保证、非保证、总额） | 动态（来自OCR） |
| 数据来源 | HTML解析器提取 | Gemini API提取 |
| 存储方式 | 关系数据库 | JSON字段 |
| 适用场景 | 数据分析、查询 | 前端展示、导出 |
| 完整性 | 部分字段 | 全部字段 |

**修改后的逻辑**: 优先使用 `table1`（完整版），只有在没有时才降级到 `AnnualValue`（简化版）

## 相关API端点

### 1. 获取文档详情
```
GET /api/ocr/documents/{id}/
```

**返回**:
```json
{
  "status": "success",
  "data": {
    "table1": {
      "table_name": "...",
      "fields": [...],
      "data": [...]
    }
  }
}
```

### 2. 重新提取table1
```
POST /api/ocr/documents/{id}/reextract-table1/
```

**逻辑**: 使用步骤3相同的逻辑
- 从 content + tablesummary 提取
- 根据页码范围优化
- 保存到 table1 字段

### 3. 查询处理状态
```
GET /api/ocr/documents/{id}/status/
```

**返回**:
```json
{
  "status": "success",
  "data": {
    "processing_stage": "all_completed",
    "progress_percentage": 100
  }
}
```

## 测试验证

### 文档188测试结果

**修改前**:
- 返回字段数: 4个（从AnnualValue）
- 字段: 年度、保证、非保证、总额

**修改后**:
- 返回字段数: 10个（从table1）
- 字段: 年度、保费、退保价值(多列)、身故赔偿(多列)

**验证命令**:
```bash
python3 -c "
from api.models import PlanDocument
import json

doc = PlanDocument.objects.get(id=188)
table1 = json.loads(doc.table1)
print(f'字段数: {len(table1[\"fields\"])}')
print(f'数据行数: {len(table1[\"data\"])}')
"
```

**输出**:
```
字段数: 10
数据行数: 97
```

## 总结

✅ **后端修改**: 优先返回 `table1` JSON字段（完整的10列数据）

✅ **前端展示**: 已实现完整的表格展示功能（所有字段、所有行）

✅ **重新提取**: 支持手动触发重新提取，使用步骤3相同逻辑

✅ **响应式**: 支持移动端和桌面端，横向滚动

✅ **向后兼容**: 降级到 AnnualValue（如果 table1 为空）

现在文档详情页可以完整展示 `table1` 字段的所有信息！
