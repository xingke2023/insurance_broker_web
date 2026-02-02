# 改进的表格提取策略

## 当前问题

文档179的案例显示：
- AI在`tablesummary`中推荐了"表格4"（120行完整年度数据）
- 但`PlanTable`表格4实际只有32行（年度1-30）
- 完整数据分散在`tablecontent`的多个`<table>`标签中

## 为什么会出现这个问题？

### OCR到PlanTable的流程

```
PDF文档
  ↓ (Gemini OCR)
content字段（Markdown + HTML表格）
  ↓ (extract_tablecontent_task)
tablecontent字段（只保留<table>标签）
  ↓ (extract_tablesummary_task)
tablesummary字段（AI分析表格概要）+ PlanTable记录
  ↓ (extract_table_data_task)
AnnualValue数据库
```

### 问题出在哪一步？

**步骤3: extract_tablesummary_task**
- 这个任务负责：
  1. 分析`tablecontent`中的所有表格
  2. 使用Gemini AI生成`tablesummary`（推荐哪些表格）
  3. 将跨页表格分组合并
  4. 创建PlanTable记录

- **跨页表格分组逻辑**（`api/tasks.py:group_tables_by_summary`）：
  - 依赖表格相似度匹配
  - 使用表头字段对比
  - 可能会错误分组或漏掉部分续表

### 文档179的情况

```
tablecontent中的8个<table>:
- 表格1: 年度1,2,3,4,5,10,15,20,25,30 (抽样)
- 表格2: 年度1,2,3... (悲观情景，已排除)
- 表格3: 年度1,2,3... (身故赔偿，已排除)
- 表格4: 年度1-30 (连续)          ← 分组为PlanTable #4
- 表格5: 年度31-60 (连续)         ← 应该与#4合并，但没有
- 表格6: 年度61-90 (连续)         ← 应该与#4合并，但没有
- 表格7: 年度91-108 (连续)        ← 应该与#4合并，但没有
- 表格8: 年度1-5 (保费账户)

AI推荐: 表格4（120行）
实际PlanTable #4: 只有32行（tablecontent表格4）
缺失数据: tablecontent表格5,6,7
```

## 解决方案对比

### 方案1：修复跨页表格分组（治本）

**修改文件**: `api/tasks.py` - `group_tables_by_summary`函数

**优点**:
- 从源头解决问题
- PlanTable包含完整数据
- `tablesummary`推荐准确

**缺点**:
- 需要修改复杂的分组逻辑
- 可能影响现有文档
- 需要重新处理所有文档

### 方案2：直接从tablecontent提取（治标）✅ **已实现**

**修改文件**: `api/html_table_parser.py` - `extract_annual_values_from_document`

**优点**:
- 简单快速
- 不影响现有流程
- 适用于所有文档（包括旧文档）

**缺点**:
- 绕过了PlanTable和tablesummary
- 没有利用AI的推荐

### 方案3：混合策略（最佳）

结合AI推荐和tablecontent提取：

1. **读取tablesummary**，找到AI推荐的表格
2. **在tablecontent中定位**该表格的所有跨页部分
3. **提取完整数据**

伪代码：
```python
# 1. 解析tablesummary，找到推荐表格
recommended_table = parse_tablesummary_recommendation(doc.tablesummary)
# 结果: "表格4: 120行完整年度数据"

# 2. 在tablecontent中查找"表格4"的所有相关<table>
matching_tables = find_tables_in_tablecontent(
    tablecontent=doc.tablecontent,
    table_name=recommended_table.name,
    expected_rows=recommended_table.row_count
)
# 结果: [table4_html, table5_html, table6_html, table7_html]

# 3. 提取并合并数据
for table_html in matching_tables:
    values = extract_annual_values_from_html(table_html)
    all_values.extend(values)

merged = merge_annual_values(all_values)
# 结果: 111条记录
```

## 当前实现的效果

**方案2（已实现）** 的效果：
- 文档179：从42条 → 111条 ✅
- 处理所有`tablecontent`中符合条件的表格
- 自动合并跨页数据
- 不依赖PlanTable分组的正确性

**适用性**：
- ✅ 适用于任意计划书
- ✅ 自动处理跨页表格
- ✅ 排除悲观/乐观情景表
- ✅ 排除身故赔偿表

**局限性**：
- ⚠️ 如果OCR识别错误，tablecontent本身不完整
- ⚠️ 如果表格格式不规范，HTML解析可能失败

## 推荐：实现方案3

为了更精确地利用AI推荐，可以实现方案3：

### 步骤1：解析tablesummary

创建函数 `parse_tablesummary_recommendation()`:
```python
def parse_tablesummary_recommendation(tablesummary_text):
    """
    从tablesummary文本中提取AI推荐的表格信息

    示例输入:
    表格4：
    表名：基本计划 – 说明摘要 （现时假设基础）
    行数：120行 (完整年度表1-108 + 部分年龄年份)
    ...
    ✅ 推荐：此表为最符合条件的表格

    返回:
    {
        'table_number': 4,
        'table_name': '基本计划 – 说明摘要 （现时假设基础）',
        'row_count': 120,
        'is_recommended': True
    }
    """
    # 使用正则提取 "✅ 推荐" 标记的表格
    # 提取表格编号、名称、行数
```

### 步骤2：在tablecontent中智能匹配

创建函数 `find_recommended_tables_in_tablecontent()`:
```python
def find_recommended_tables_in_tablecontent(tablecontent, table_name, expected_rows):
    """
    在tablecontent中找到与推荐表格匹配的所有<table>标签

    匹配策略:
    1. 表格名称相似度 > 80%
    2. 字段名称匹配
    3. 年度连续性判断
    4. 累计行数接近expected_rows
    """
```

### 步骤3：更新提取逻辑

```python
def extract_annual_values_from_document(document):
    # 优先级1: 使用AI推荐 + tablecontent
    if document.tablesummary and document.tablecontent:
        recommended = parse_tablesummary_recommendation(document.tablesummary)
        if recommended:
            tables = find_recommended_tables_in_tablecontent(
                document.tablecontent,
                recommended['table_name'],
                recommended['row_count']
            )
            # 提取数据...

    # 优先级2: 仅使用tablecontent（当前方法）
    elif document.tablecontent:
        # 当前实现...

    # 优先级3: 使用PlanTable
    else:
        # 备用方案...
```

## 结论

- **当前方案**（方案2）已经能够处理文档179，提取到111条完整数据
- **对于任意计划书**：只要`tablecontent`包含完整表格，都能正确提取
- **未来改进**：可以实现方案3，结合AI推荐和智能匹配，提高精确度

## 测试验证

文档179测试结果：
```
✅ 从42条 → 111条
✅ 年度1-108完整
✅ 包含年度110, 115, 120
✅ 所有数据来自tablecontent的6个表格
✅ 自动排除悲观/乐观情景表
```
