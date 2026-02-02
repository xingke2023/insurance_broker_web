# 提取表格完整数据指南

## 功能说明

`extract_table_data.py` 工具可以从OCR识别的保险计划书中提取每个表格的**完整数据**，包括：
- ✅ 所有行的数据
- ✅ 所有列的数据
- ✅ 具体的数值
- ✅ 保存为JSON和可读文本格式

## 使用流程

### 完整的三步流程

```bash
# 步骤1：提取表格概要
python3 test_extract_tablesummary.py "中銀集團人壽 保險有限公司.txt"

# 步骤2：验证表格合并（可选）
python3 verify_table_merge.py "中銀集團人壽 保險有限公司.txt"

# 步骤3：提取表格完整数据
python3 extract_table_data.py "中銀集團人壽 保險有限公司.txt"
```

### 为什么需要三步？

1. **步骤1**：识别文档中有哪些表格（表名、行数、字段）
2. **步骤2**：验证跨页表格是否正确合并（可选）
3. **步骤3**：基于步骤1的结果，提取每个表格的具体数值

## 输出文件

### 文件结构

```
原文件：中銀集團人壽 保險有限公司.txt

输出文件：
├── 中銀集團人壽 保險有限公司_tablesummary.txt       （步骤1：表格概要）
├── 中銀集團人壽 保險有限公司_table1.txt            （步骤1：表格1概要）
├── 中銀集團人壽 保險有限公司_table1_data.json      （步骤3：表格1完整数据 JSON）
├── 中銀集團人壽 保險有限公司_table1_data.txt       （步骤3：表格1完整数据 可读）
├── 中銀集團人壽 保險有限公司_table2_data.json      （步骤3：表格2完整数据 JSON）
└── 中銀集團人壽 保險有限公司_table2_data.txt       （步骤3：表格2完整数据 可读）
```

### JSON格式示例

`中銀集團人壽 保險有限公司_table1_data.json`：

```json
{
  "table_name": "詳細說明 - 退保價值 (只根據基本計劃計算)",
  "columns": [
    "保单年度终结",
    "缴付保费总额",
    "保证现金价值",
    "非保证金额",
    "总退保价值"
  ],
  "rows": [
    {
      "保单年度终结": 1,
      "缴付保费总额": 50000,
      "保证现金价值": 10000,
      "非保证金额": 5000,
      "总退保价值": 15000
    },
    {
      "保单年度终结": 2,
      "缴付保费总额": 100000,
      "保证现金价值": 25000,
      "非保证金额": 12000,
      "总退保价值": 37000
    },
    ...
  ]
}
```

### 可读文本格式示例

`中銀集團人壽 保險有限公司_table1_data.txt`：

```
表格名称: 詳細說明 - 退保價值 (只根據基本計劃計算)
================================================================================

保单年度终结	缴付保费总额	保证现金价值	非保证金额	总退保价值
--------------------------------------------------------------------------------
1	50000	10000	5000	15000
2	100000	25000	12000	37000
3	150000	45000	20000	65000
4	200000	70000	35000	105000
...

总行数: 100
```

## 工作原理

### 提取流程

```
读取OCR文本 + 表格概要
    ↓
对每个表格：
    ↓
构建Prompt（包含表名、行数、字段）
    ↓
调用DeepSeek API提取完整数据
    ↓
解析JSON结果
    ↓
保存为JSON + 可读文本
```

### Prompt示例

```
从计划书内容中提取以下表格的完整数据。

表格名称：詳細說明 - 退保價值
预期行数：100行
基本字段：保单年度终结,缴付保费总额,退保价值(保证金额,非保证金额,总额)

要求：
1. 提取表格的所有行和所有列数据
2. 保单年度终结转换成纯数字
3. 数值类型不要加单位
4. 以JSON格式返回

计划书内容：
{完整OCR内容}
```

### API配置

- **模型**：`deepseek-chat`
- **Temperature**：0.1（高精度）
- **Max Tokens**：16384（支持大表格）
- **内容**：完整OCR内容（无限制）

## 使用示例

### 示例1：基本使用

```bash
# 提取表格概要
python3 test_extract_tablesummary.py "友邦保险计划书.txt"

# 提取完整数据
python3 extract_table_data.py "友邦保险计划书.txt"
```

**输出**：
```
📄 读取文件: 友邦保险计划书.txt
✅ 文件读取成功，内容长度: 52,341 字符

📋 读取表格概要: 友邦保险计划书_tablesummary.txt
✅ 识别到 2 个表格

================================================================================

📊 表格 1: 詳細說明 - 退保價值
--------------------------------------------------------------------------------
⏳ 正在提取表格数据: 詳細說明 - 退保價值
   预期行数: 100行
✅ 提取成功，实际行数: 100
  💾 JSON数据: 友邦保险计划书_table1_data.json
  📄 可读格式: 友邦保险计划书_table1_data.txt

📊 表格 2: 身故賠償
--------------------------------------------------------------------------------
⏳ 正在提取表格数据: 身故賠償
   预期行数: 100行
✅ 提取成功，实际行数: 100
  💾 JSON数据: 友邦保险计划书_table2_data.json
  📄 可读格式: 友邦保险计划书_table2_data.txt

================================================================================
✅ 所有表格数据提取完成！
```

### 示例2：查看JSON数据

```bash
# 查看JSON格式
cat "友邦保险计划书_table1_data.json" | jq .

# 查看可读格式
cat "友邦保险计划书_table1_data.txt"

# 统计行数
cat "友邦保险计划书_table1_data.json" | jq '.rows | length'
```

### 示例3：数据验证

```bash
# 检查列名
cat "友邦保险计划书_table1_data.json" | jq '.columns'

# 查看前5行数据
cat "友邦保险计划书_table1_data.json" | jq '.rows[0:5]'

# 查看某一列的所有值
cat "友邦保险计划书_table1_data.json" | jq '.rows[].保单年度终结'
```

## 数据应用

### 1. 导入数据库

提取的JSON数据可以直接导入数据库：

```python
import json

# 读取JSON
with open('友邦保险计划书_table1_data.json', 'r') as f:
    table_data = json.load(f)

# 导入数据库
for row in table_data['rows']:
    AnnualValue.objects.create(
        document=document,
        policy_year=row['保单年度终结'],
        guaranteed_cash_value=row.get('保证现金价值', 0),
        non_guaranteed_cash_value=row.get('非保证金额', 0),
        total_cash_value=row.get('总退保价值', 0)
    )
```

### 2. 数据分析

```python
import json
import pandas as pd

# 读取JSON
with open('友邦保险计划书_table1_data.json', 'r') as f:
    table_data = json.load(f)

# 转换为DataFrame
df = pd.DataFrame(table_data['rows'])

# 数据分析
print(df.describe())
print(df['总退保价值'].max())
print(df[df['保单年度终结'] == 20])
```

### 3. 生成图表

```python
import json
import matplotlib.pyplot as plt

# 读取数据
with open('友邦保险计划书_table1_data.json', 'r') as f:
    table_data = json.load(f)

# 提取数据
years = [row['保单年度终结'] for row in table_data['rows']]
values = [row['总退保价值'] for row in table_data['rows']]

# 绘制图表
plt.plot(years, values)
plt.xlabel('保单年度')
plt.ylabel('退保价值')
plt.title('退保价值趋势')
plt.show()
```

## 常见问题

### Q1: 提示"未找到表格概要文件"

**原因**：未运行步骤1

**解决**：
```bash
python3 test_extract_tablesummary.py "计划书.txt"
```

### Q2: 提取的行数与预期不符

**可能原因**：
1. OCR识别有误，部分行丢失
2. 表格格式特殊，AI难以识别
3. 跨页表格未正确合并

**解决方法**：
1. 检查OCR原文件，确认表格是否完整
2. 运行 `verify_table_merge.py` 验证表格合并
3. 手动检查JSON数据，确认是否符合预期

### Q3: JSON解析失败

**可能原因**：
- DeepSeek返回的格式不符合JSON规范
- 包含特殊字符或转义问题

**解决方法**：
1. 查看错误信息中的 "返回内容预览"
2. 检查是否有markdown标记未清理
3. 重新运行（DeepSeek偶尔会格式错误）

### Q4: API调用超时

**原因**：表格数据量大，处理时间长

**解决方法**：
1. 检查网络连接
2. 等待更长时间（大表格可能需要30-60秒）
3. 分批处理（暂不支持，需手动拆分）

## 对比：概要 vs 完整数据

| 特性 | 表格概要 | 表格完整数据 |
|------|---------|------------|
| **文件** | `_tablesummary.txt` | `_table1_data.json` |
| **内容** | 表名、行数、字段列表 | 所有行、所有列的具体值 |
| **大小** | 几百字节 | 几KB到几百KB |
| **用途** | 了解表格结构 | 数据分析、导入数据库 |
| **生成速度** | 快（1-2秒） | 慢（每个表5-30秒） |
| **API成本** | 低 | 较高 |

## 性能优化建议

### 1. 仅提取需要的表格

如果只需要某个表格，可以修改脚本，跳过其他表格：

```python
# 只提取表格1
if table_info['number'] != 1:
    continue
```

### 2. 并行处理（高级）

如果有多个表格，可以并行调用API：

```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = [executor.submit(extract_single_table_data, content, t) for t in tables]
    results = [f.result() for f in futures]
```

### 3. 缓存结果

如果多次运行，可以检查文件是否已存在：

```python
if os.path.exists(f"{output_file}.json"):
    print(f"⏭️  跳过已存在的文件")
    continue
```

## 技术细节

### 数据类型处理

脚本会自动处理以下数据类型：

1. **保单年度**：
   - "65岁" → 转换为数字（第几年）
   - "65歲" → 转换为数字
   - "1" → 保持数字

2. **金额**：
   - "HK$50,000" → 50000
   - "50,000港元" → 50000
   - 移除货币符号和逗号

3. **百分比**：
   - "3.5%" → 3.5
   - "5%" → 5

### JSON结构规范

```json
{
  "table_name": "string",          // 表格名称
  "columns": ["col1", "col2"],     // 列名数组
  "rows": [                        // 数据行数组
    {"col1": value1, "col2": value2},
    ...
  ]
}
```

## 相关文件

- **提取脚本**：`extract_table_data.py`
- **概要工具**：`test_extract_tablesummary.py`
- **验证工具**：`verify_table_merge.py`
- **跨页处理文档**：`CROSS_PAGE_TABLE_HANDLING.md`

## 总结

✅ **完整数据提取**：获取表格的所有行和列数据

✅ **双格式输出**：JSON（机器可读）+ TXT（人类可读）

✅ **数据可用性**：可直接导入数据库、数据分析、生成图表

✅ **高精度**：temperature=0.1，确保数值准确

⚠️ **处理时间**：大表格需要较长时间，请耐心等待

🔧 **持续优化**：根据实际使用反馈调整提取逻辑
