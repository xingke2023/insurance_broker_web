# DeepSeek API 限制修复说明

## 问题描述

### 问题1: max_tokens 超出限制

**错误信息**：
```
Error code: 400 - {'error': {'message': 'Invalid max_tokens value, the valid range of max_tokens is [1, 8192]'}}
```

**原因**：
- DeepSeek API 的 `max_tokens` 上限是 **8192**
- 之前代码中设置了 `max_tokens=16384`，超出限制

**修复位置**：
1. ✅ `extract_table_data.py:103` - 改为 8192
2. ✅ `api/tasks.py:775` - 改为 2000（表格概要不需要太长）

### 问题2: 续表被识别为独立表格

**现象**：
```
表格 8: 補充說明摘要 (提取款項)
表格 9: 補充說明摘要 (提取款項) (續)
```

**原因**：
- OCR识别时，跨页表格在新页面会标注"(續)"
- DeepSeek将其识别为两个独立表格

**影响**：
- 数据被拆分，不完整
- 提取时需要手动合并

## 解决方案

### 方案1: Prompt优化（推荐）

修改 `test_extract_tablesummary.py` 和 `api/tasks.py` 的prompt，增加续表处理规则：

```python
prompt = f"""以保单年度终结为坐标，分析以下保险计划书中的所有表格。

要求：
1. 识别所有以"保单年度终结"为坐标的表格
2. 有些表格可能跨度好几个页面，但只算一张表，请完整识别
3. 特别注意：如果表格名称包含"(續)"、"(续)"、"續"等字样，应合并为同一张表
4. 对每个表格提取：表详细名称、行数（续表需累加）、基本字段

只输出结果，不要有任何解释说明。

输出格式示例：
1.
表名：補充說明摘要 (提取款項)
行数：50行  # 注：包含续表的总行数
基本字段：保单年度终结,提取金额,备注

计划书内容：
{content}

请直接返回分析结果，不要包含markdown代码块标记。"""
```

### 方案2: 后处理合并

创建一个工具自动合并续表：

```python
def merge_continuation_tables(tables):
    """
    合并续表

    规则：
    - 如果表名包含"(續)"、"(续)"
    - 且去掉续标记后与前一个表格名称相同
    - 则合并为一个表格，累加行数
    """
    merged = []

    for i, table in enumerate(tables):
        name = table['name']

        # 检查是否为续表
        is_continuation = any(marker in name for marker in ['(續)', '(续)', '（續）', '（续）'])

        if is_continuation and merged:
            # 移除续标记
            base_name = name.replace('(續)', '').replace('(续)', '').replace('（續）', '').replace('（续）', '').strip()
            prev_name = merged[-1]['name']

            if base_name == prev_name:
                # 合并到上一个表格
                prev_rows = int(merged[-1]['rows'].replace('行', ''))
                curr_rows = int(table['rows'].replace('行', ''))
                merged[-1]['rows'] = f"{prev_rows + curr_rows}行"

                # 合并字段（去重）
                prev_fields = set(merged[-1]['fields'].split(','))
                curr_fields = set(table['fields'].split(','))
                merged[-1]['fields'] = ','.join(prev_fields | curr_fields)

                continue

        merged.append(table)

    return merged
```

### 方案3: 手动修正

如果只是偶尔出现，可以手动编辑 `_tablesummary.txt`：

**修改前**：
```
8.
表名：補充說明摘要 (提取款項)
行数：25行
基本字段：...

9.
表名：補充說明摘要 (提取款項) (續)
行数：25行
基本字段：...
```

**修改后**：
```
8.
表名：補充說明摘要 (提取款項)
行数：50行
基本字段：...（合并后的字段）
```

然后重新运行步骤3。

## 已修复的API限制

| 文件 | 行号 | 原值 | 新值 | 说明 |
|------|------|------|------|------|
| `extract_table_data.py` | 103 | 16384 | 8192 | 提取表格数据 |
| `api/tasks.py` | 775 | 16384 | 2000 | 提取表格概要 |

## 其他正常的 max_tokens 设置

以下设置都在 8192 以内，无需修改：

| 文件 | max_tokens | 功能 |
|------|-----------|------|
| `api/deepseek_service.py:62` | 1000 | 基本信息提取 |
| `api/deepseek_service.py:203` | 8192 | 年度价值表 |
| `api/deepseek_service.py:608` | 2000 | 计划书概要 |
| `api/content_editor_views.py:122` | 8192 | 用户请求处理 |
| `api/content_editor_views.py:446` | 8000 | 退保价值表提取 |
| `api/content_editor_views.py:678` | 8000 | 无忧选表提取 |

## 验证修复

### 测试步骤

1. 重启Django服务：
```bash
sudo supervisorctl restart harry-insurance:harry-insurance-django
```

2. 测试提取工具：
```bash
python3 extract_table_data.py "测试文件.txt"
```

3. 检查是否还有 400 错误：
```bash
# 应该不再出现 "Invalid max_tokens value" 错误
```

### 预期结果

✅ 所有表格都能成功提取
✅ 不再出现 max_tokens 错误
⚠️ 续表仍可能被识别为独立表格（需要实施方案1或2）

## 后续改进建议

1. **优先实施方案1**：修改Prompt，让AI自动合并续表
2. **长期方案**：升级到支持更大 context 的模型（如需要）
3. **监控日志**：关注是否还有其他API限制问题

## 相关文档

- DeepSeek API文档: https://platform.deepseek.com/api-docs/
- 表格提取指南: `EXTRACT_TABLE_DATA_GUIDE.md`
- 跨页表格处理: `CROSS_PAGE_TABLE_HANDLING.md`
