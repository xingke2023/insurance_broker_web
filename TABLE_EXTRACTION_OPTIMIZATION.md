# 表格提取性能优化方案

## 当前逻辑分析

### 现有流程

```
步骤1: 提取表格概要
  └─ 调用1次DeepSeek API (完整OCR内容)
      └─ 识别出N个表格

步骤3: 提取表格数据 (当前逻辑)
  ├─ 读取完整OCR内容 (1次文件IO)
  ├─ 循环N个表格 (串行执行)
  │   ├─ 表格1: 调用DeepSeek API (完整OCR内容) → 等待5-30秒
  │   ├─ 表格2: 调用DeepSeek API (完整OCR内容) → 等待5-30秒
  │   └─ 表格N: 调用DeepSeek API (完整OCR内容) → 等待5-30秒
  └─ 总耗时: N × (5-30秒) = 很慢！
```

### 性能瓶颈

#### 🐌 瓶颈1: 串行处理（最大问题）
```python
# 当前代码 (第302-315行)
for table_info in tables:  # 串行循环
    table_data = extract_single_table_data(content, table_info)  # 阻塞等待
```

**影响**：
- 10个表格 × 平均15秒 = **150秒（2.5分钟）**
- CPU闲置，只是在等待API响应

#### 🐌 瓶颈2: 每次都发送完整OCR内容
```python
prompt = f"""
...
计划书内容：
{content}  # 每次都发送几万字的完整内容！
"""
```

**影响**：
- 网络传输慢（可能几MB数据）
- API处理慢（需要分析整个文档）
- Token消耗大（成本高）

#### 🐌 瓶颈3: 没有缓存机制
- 多次运行会重复提取
- 已提取的数据没有复用

#### 🐌 瓶颈4: 没有进度显示
- 用户不知道还要等多久
- 无法判断是否卡住

---

## 优化方案

### 🚀 方案1: 并行处理（效果最佳）⭐

**原理**：同时调用多个API，而不是一个接一个等待

**改进**：
```python
from concurrent.futures import ThreadPoolExecutor
import time

# 并行提取，最多3个并发
with ThreadPoolExecutor(max_workers=3) as executor:
    futures = {
        executor.submit(extract_single_table_data, content, table): table
        for table in tables
    }

    for future in as_completed(futures):
        table = futures[future]
        table_data = future.result()
        # 保存数据...
```

**效果**：
- 10个表格，3个并发
- 原本: 10 × 15秒 = 150秒
- 优化后: ceil(10/3) × 15秒 = **60秒**
- **速度提升 2.5倍！**

**风险**：
- API可能有并发限制（需测试）
- 内存占用增加

---

### 🚀 方案2: 智能内容截取（减少传输）

**原理**：只发送表格相关的内容片段，而不是整个文档

**改进**：
```python
def extract_table_section(content, table_name, table_fields):
    """
    从完整内容中提取表格相关的片段

    策略:
    1. 查找表格标题位置
    2. 提取表格前后各1000行上下文
    3. 只发送这部分内容给API
    """
    # 查找表格名称
    table_pos = content.find(table_name)

    if table_pos == -1:
        return content  # 找不到就发送全部

    # 提取前后20000字符
    start = max(0, table_pos - 20000)
    end = min(len(content), table_pos + 20000)

    return content[start:end]

# 使用
table_section = extract_table_section(content, table_info['name'], table_info['fields'])
prompt = f"""...
计划书内容：
{table_section}  # 只发送相关片段！
"""
```

**效果**：
- 数据传输量减少 **70-90%**
- API处理速度提升 **2-3倍**
- Token消耗减少 **70-90%**（节省成本）

---

### 🚀 方案3: 缓存已提取数据

**原理**：检查文件是否已存在，跳过已提取的表格

**改进**：
```python
for table_info in tables:
    output_file = f"{base_filename}_table{table_info['number']}_data.json"

    # 检查是否已存在
    if os.path.exists(output_file):
        print(f"⏭️  跳过已提取: 表格 {table_info['number']}")
        continue

    # 提取数据...
```

**效果**：
- 重新运行时，跳过已完成的表格
- 支持断点续传

---

### 🚀 方案4: 进度条和预估时间

**原理**：显示实时进度和剩余时间

**改进**：
```python
from tqdm import tqdm
import time

start_time = time.time()

for i, table_info in enumerate(tqdm(tables, desc="提取表格数据"), 1):
    table_start = time.time()

    # 提取数据...

    # 计算预估时间
    elapsed = time.time() - start_time
    avg_time = elapsed / i
    remaining = avg_time * (len(tables) - i)

    print(f"⏱️  预计剩余: {remaining:.0f}秒")
```

**效果**：
- 用户知道进度
- 预估剩余时间

---

### 🚀 方案5: 使用表格源代码（tablecontent）

**原理**：步骤1已经提取了表格HTML源代码，直接用它

**改进**：
```python
# 从数据库读取已保存的tablecontent
doc = PlanDocument.objects.get(id=document_id)

if doc.tablecontent:
    # 使用已提取的HTML表格源代码
    prompt = f"""从以下HTML表格中提取数据：

{doc.tablecontent}  # 只有表格，没有其他干扰内容！
"""
else:
    # 降级方案：使用完整OCR内容
    prompt = f"""从计划书中提取表格：

{doc.content}
"""
```

**效果**：
- 数据更精准（只有表格，没有正文干扰）
- 内容更小（只有表格HTML）
- 处理速度提升 **3-5倍**

---

## 综合优化方案（推荐）⭐⭐⭐

结合多个方案的最佳实践：

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import os

def extract_table_section(content, table_name):
    """智能截取表格相关内容"""
    table_pos = content.find(table_name)
    if table_pos == -1:
        return content

    start = max(0, table_pos - 20000)
    end = min(len(content), table_pos + 20000)
    return content[start:end]


def extract_single_table_data_optimized(content, table_info):
    """优化版：只发送相关内容片段"""
    # 智能截取
    table_section = extract_table_section(content, table_info['name'])

    prompt = f"""从计划书内容中提取以下表格的完整数据。

表格名称：{table_info['name']}
预期行数：{table_info['rows']}
基本字段：{table_info['fields']}

...

计划书内容：
{table_section}  # 只发送相关片段！
"""

    # 调用API...
    return table_data


def main_optimized():
    # 读取表格概要
    tables = parse_tablesummary(summary_file)

    # 过滤已提取的表格（缓存）
    pending_tables = []
    for table_info in tables:
        output_file = f"{base_filename}_table{table_info['number']}_data.json"
        if os.path.exists(output_file):
            print(f"⏭️  跳过已提取: 表格 {table_info['number']}")
        else:
            pending_tables.append(table_info)

    if not pending_tables:
        print("✅ 所有表格已提取完成！")
        return

    print(f"📊 需要提取 {len(pending_tables)} 个表格")
    print(f"🚀 使用 3 个并发线程加速")
    print()

    # 并行提取（最多3个并发）
    start_time = time.time()
    results = {}

    with ThreadPoolExecutor(max_workers=3) as executor:
        # 提交所有任务
        futures = {
            executor.submit(extract_single_table_data_optimized, content, table): table
            for table in pending_tables
        }

        # 等待完成并显示进度
        completed = 0
        for future in as_completed(futures):
            table_info = futures[future]
            completed += 1

            try:
                table_data = future.result()
                results[table_info['number']] = table_data

                # 计算进度
                progress = completed / len(pending_tables) * 100
                elapsed = time.time() - start_time
                avg_time = elapsed / completed
                remaining = avg_time * (len(pending_tables) - completed)

                print(f"✅ [{completed}/{len(pending_tables)}] 表格 {table_info['number']} 完成")
                print(f"   进度: {progress:.1f}% | 已用: {elapsed:.0f}秒 | 预计剩余: {remaining:.0f}秒")

                # 立即保存
                output_file = f"{base_filename}_table{table_info['number']}_data"
                save_table_data(table_data, output_file)

            except Exception as e:
                print(f"❌ 表格 {table_info['number']} 提取失败: {e}")

    total_time = time.time() - start_time
    print()
    print(f"⚡ 总耗时: {total_time:.1f}秒")
    print(f"📊 平均每表: {total_time/len(pending_tables):.1f}秒")
```

---

## 性能对比

| 方案 | 10个表格耗时 | 速度提升 | 复杂度 | 推荐度 |
|------|-------------|---------|--------|--------|
| **当前方案** | 150秒 | 1x | 简单 | ⭐ |
| **并行处理** | 60秒 | 2.5x | 中等 | ⭐⭐⭐⭐⭐ |
| **智能截取** | 50秒 | 3x | 中等 | ⭐⭐⭐⭐ |
| **缓存机制** | 0秒（二次运行） | ∞ | 简单 | ⭐⭐⭐⭐⭐ |
| **综合优化** | 20秒 | 7.5x | 较复杂 | ⭐⭐⭐⭐⭐ |

---

## 实施建议

### 阶段1: 快速优化（1小时）

实施最简单、效果最好的优化：

1. ✅ **缓存机制**（5分钟）- 跳过已提取的表格
2. ✅ **并行处理**（30分钟）- 3个并发线程
3. ✅ **进度显示**（10分钟）- 显示进度和预估时间

**预期效果**：速度提升 **3-5倍**

### 阶段2: 深度优化（2-3小时）

实施更复杂的优化：

4. ✅ **智能截取**（1小时）- 只发送相关内容
5. ✅ **使用tablecontent**（1小时）- 使用已提取的表格HTML

**预期效果**：速度提升 **5-10倍**

### 阶段3: 高级优化（可选）

6. ⭐ **流式响应**（2小时）- 使用API的stream模式
7. ⭐ **批量处理**（2小时）- 一次API调用提取多个小表格
8. ⭐ **本地缓存**（1小时）- Redis缓存API响应

---

## 代码实现

我可以立即创建优化版本的脚本，您想先实施哪些优化？

### 选项A: 保守优化（推荐）
- ✅ 并行处理（3个并发）
- ✅ 缓存机制
- ✅ 进度显示
- 速度提升: **3-5倍**
- 风险: **低**

### 选项B: 激进优化
- ✅ 所有优化方案
- ✅ 智能截取 + 并行 + 缓存
- 速度提升: **7-10倍**
- 风险: **中等**（需测试）

### 选项C: 自定义
- 您选择想要的优化方案组合

---

## 风险评估

| 优化方案 | 风险 | 缓解措施 |
|---------|------|---------|
| 并行处理 | API并发限制 | 限制max_workers=3，可配置 |
| 智能截取 | 表格跨度太大被截断 | 设置足够大的窗口（40000字符） |
| 缓存机制 | 数据过期 | 提供强制刷新选项 |

---

## 总结

✅ **最大瓶颈**：串行处理，每次发送完整内容

✅ **最佳方案**：并行处理 + 智能截取 + 缓存

✅ **预期效果**：速度提升 **5-10倍**

✅ **实施成本**：2-3小时开发 + 测试

您想要我实施哪个优化方案？
