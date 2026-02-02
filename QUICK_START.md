# 表格提取工具 - 快速开始

## 两种使用方式

### 方式1：一键执行（推荐）⭐

**最简单**：自动执行所有步骤

```bash
./extract_all_tables.sh "中銀集團人壽 保險有限公司.txt"
```

一条命令完成：
- ✅ 步骤1: 提取表格概要
- ✅ 步骤2: 验证表格合并
- ✅ 步骤3: 提取表格完整数据

---

### 方式2：分步执行

**适合调试**：单独执行每个步骤

#### 步骤1（必需）：提取表格概要

```bash
python3 test_extract_tablesummary.py "中銀集團人壽 保險有限公司.txt"
```

**输出**：
- `中銀集團人壽 保險有限公司_tablesummary.txt` - 完整概要
- `中銀集團人壽 保險有限公司_table1.txt` - 表格1概要
- `中銀集團人壽 保險有限公司_table2.txt` - 表格2概要

---

#### 步骤2（可选）：验证表格合并

```bash
python3 verify_table_merge.py "中銀集團人壽 保險有限公司.txt"
```

**功能**：检查跨页表格是否正确合并

---

#### 步骤3（需要步骤1）：提取表格完整数据

```bash
python3 extract_table_data.py "中銀集團人壽 保險有限公司.txt"
```

**输出**：
- `中銀集團人壽 保險有限公司_table1_data.json` - 表格1完整数据（JSON）
- `中銀集團人壽 保險有限公司_table1_data.txt` - 表格1完整数据（可读）
- `中銀集團人壽 保險有限公司_table2_data.json` - 表格2完整数据（JSON）
- `中銀集團人壽 保險有限公司_table2_data.txt` - 表格2完整数据（可读）

---

## 依赖关系图

```
步骤1: 提取表格概要 (test_extract_tablesummary.py)
   ↓ 生成 _tablesummary.txt
   ↓
步骤2: 验证表格合并 (verify_table_merge.py) [可选]
   ↓ 读取 _tablesummary.txt
   ↓
步骤3: 提取表格完整数据 (extract_table_data.py)
   ↓ 读取 _tablesummary.txt (必需!)
   ↓ 生成 _table1_data.json 等
```

## 重要提示

### ⚠️ 步骤3必须先执行步骤1

**错误示例**：
```bash
# ❌ 直接执行步骤3会失败
python3 extract_table_data.py "计划书.txt"

错误: 未找到表格概要文件
```

**正确示例**：
```bash
# ✅ 先执行步骤1
python3 test_extract_tablesummary.py "计划书.txt"

# ✅ 再执行步骤3
python3 extract_table_data.py "计划书.txt"
```

或者：
```bash
# ✅ 使用一键脚本
./extract_all_tables.sh "计划书.txt"
```

## 输出文件总览

运行完整流程后，会生成以下文件：

```
原文件: 中銀集團人壽 保險有限公司.txt

输出文件:
├── 中銀集團人壽 保險有限公司_tablesummary.txt       [步骤1] 所有表格概要
├── 中銀集團人壽 保險有限公司_table1.txt            [步骤1] 表格1概要
├── 中銀集團人壽 保險有限公司_table1_data.json      [步骤3] 表格1完整数据(JSON)
├── 中銀集團人壽 保險有限公司_table1_data.txt       [步骤3] 表格1完整数据(可读)
├── 中銀集團人壽 保險有限公司_table2.txt            [步骤1] 表格2概要
├── 中銀集團人壽 保險有限公司_table2_data.json      [步骤3] 表格2完整数据(JSON)
└── 中銀集團人壽 保險有限公司_table2_data.txt       [步骤3] 表格2完整数据(可读)
```

## 前置要求

### 1. 环境变量

确保 `.env` 文件中配置了 DeepSeek API 密钥：

```bash
DEEPSEEK_API_KEY=sk-your-api-key-here
```

### 2. Python依赖

```bash
pip3 install openai python-dotenv
```

### 3. 文件权限

```bash
chmod +x extract_all_tables.sh
```

## 使用场景

### 场景1：首次分析新计划书

```bash
# 使用一键脚本
./extract_all_tables.sh "新计划书.txt"
```

### 场景2：只需要表格概要

```bash
# 只运行步骤1
python3 test_extract_tablesummary.py "计划书.txt"
```

### 场景3：只提取某个表格的数据

```bash
# 先运行步骤1
python3 test_extract_tablesummary.py "计划书.txt"

# 修改 extract_table_data.py 添加过滤条件
# 例如：只提取表格1
# if table_info['number'] != 1:
#     continue

python3 extract_table_data.py "计划书.txt"
```

### 场景4：重新提取表格数据

```bash
# 如果步骤1已运行过，可以直接运行步骤3
python3 extract_table_data.py "计划书.txt"
```

## 工具对比

| 工具 | 输入 | 输出 | 速度 | 用途 |
|------|------|------|------|------|
| **test_extract_tablesummary.py** | OCR文本 | 表格概要 | 快(2-5秒) | 了解有哪些表格 |
| **verify_table_merge.py** | OCR文本 + 概要 | 验证报告 | 快(1秒) | 检查跨页合并 |
| **extract_table_data.py** | OCR文本 + 概要 | 完整数据 | 慢(每表5-30秒) | 提取所有数值 |
| **extract_all_tables.sh** | OCR文本 | 全部文件 | 中等 | 一键完成 |

## 常见问题

### Q: 如何查看表格概要？

```bash
cat "中銀集團人壽 保險有限公司_tablesummary.txt"
```

### Q: 如何查看表格数据？

```bash
# 可读格式
cat "中銀集團人壽 保險有限公司_table1_data.txt"

# JSON格式
cat "中銀集團人壽 保險有限公司_table1_data.json" | jq .
```

### Q: 步骤3可以单独运行吗？

不可以，步骤3依赖步骤1的输出文件 `_tablesummary.txt`。

### Q: 如何跳过验证步骤？

```bash
# 只运行步骤1和步骤3
python3 test_extract_tablesummary.py "计划书.txt"
python3 extract_table_data.py "计划书.txt"
```

### Q: 一键脚本可以自动处理吗？

可以，`extract_all_tables.sh` 会自动执行所有步骤，无需手动干预。

## 下一步

- 查看 `EXTRACT_TABLE_DATA_GUIDE.md` 了解详细功能
- 查看 `CROSS_PAGE_TABLE_HANDLING.md` 了解跨页表格处理
- 查看 `TABLESUMMARY_QUICK_TEST.md` 了解表格概要工具

## 相关文件

- ✅ `test_extract_tablesummary.py` - 步骤1: 提取表格概要
- ✅ `verify_table_merge.py` - 步骤2: 验证表格合并
- ✅ `extract_table_data.py` - 步骤3: 提取表格完整数据
- ✅ `extract_all_tables.sh` - 一键执行所有步骤

## 总结

✅ **推荐使用一键脚本**：`./extract_all_tables.sh "文件.txt"`

✅ **步骤3依赖步骤1**：必须先运行步骤1才能运行步骤3

✅ **双格式输出**：JSON（机器可读）+ TXT（人类可读）

✅ **完整文档**：每个工具都有详细的使用指南
