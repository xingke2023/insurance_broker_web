# Gemini直接表格提取功能 - 更新说明

## 📅 更新日期：2026-01-22

## ✅ 更新内容

### 1. 增强的提取功能

现在Gemini直接表格提取功能可以同时提取：

1. **表格数据** (`policy_values_table`)
   - 保单年度终结
   - 已缴总保费
   - 保证金额
   - 累积周年红利及累积利息
   - 终期红利
   - 总额（或其他相关字段）

2. **投保人基本信息** (`policy_info`)
   - 保险公司名称
   - 产品名称
   - 姓名
   - 年龄
   - 性别
   - 保额
   - 年缴保费
   - 缴费年数
   - 保险期限
   - 保单货币（如适用）

### 2. 提示词更新

```
分析table里包含列名为"保单年度终结"或"保單年度終結"的table
可能会有好几个这样的表，有些表可能会跨页但其实是属于一个表
选取一个表,输出为policy_values_table，这个表必须满足下面条件：
1.不是悲观或乐观（非不同投资回报），也不是身故，
2.如果有提取就选提取表（字段一般带提取两个字），如果没有就选退保价值表（或者现金价值而不是身故）
3.尽量选取跨页总行数较多的表，最好不是抽样年份展示的表
返回这个表所有行包括跨页行的数据的json格式（第一行是字段名，去除空格换行的数组格式，减少token浪费）
另外json也包括投保人基本信息输出为policy_info(包括保险公司名称,产品名称,姓名,年龄,性别,保额,年缴保费,缴费年数,保险期限等)
```

### 3. JSON输出格式

```json
{
  "table_name": "退保价值表",
  "row_count": 43,
  "fields": [
    "保單年度終結",
    "已繳總保費",
    "保證金額",
    "累積週年紅利及累積利息",
    "終期紅利",
    "總額"
  ],
  "data": [
    ["1", "1,000,000", "808,000", "100", "1,010", "809,110"],
    ["2", "1,000,000", "828,080", "204", "2,020", "830,304"],
    ...
  ],
  "policy_info": {
    "保险公司名称": "中銀集團人壽保險有限公司",
    "产品名称": "薪火傳承環球終身壽險計劃",
    "姓名": "VIP",
    "年龄": "57",
    "性别": "女",
    "保额": "1,000,000.00",
    "年缴保费": "1,000,000.00",
    "缴费年数": "躉繳",
    "保险期限": "終身",
    "保单货币": "美元"
  }
}
```

### 4. 技术改进

#### JSON解析增强
- 自动清理Gemini响应中的多余换行符
- 支持数组包装的响应格式 `[{...}]`
- 更好的错误处理和调试日志

**代码位置**: `api/gemini_service.py:473-489`

```python
# 清理JSON中可能存在的格式问题
json_text_cleaned = json_text.replace('", \n', '", ').replace(',\n', ',').replace('[\n', '[').replace('\n]', ']')

# Gemini可能返回数组包装的结果: [{...}]
if isinstance(raw_data, list) and len(raw_data) > 0 and isinstance(raw_data[0], dict):
    if 'policy_values_table' in raw_data[0]:
        raw_data = raw_data[0]
```

## 📊 测试结果

### 测试文件
- **文件名**: 57岁女士中银薪火传承计划书.pdf
- **文件大小**: 0.85 MB (887,983 bytes)

### 提取结果
✅ **成功率**: 100%
✅ **响应时间**: ~15秒
✅ **表格数据**: 43行 × 6列
✅ **投保人信息**: 10个字段全部提取成功

### 数据完整性
```
表格名称: 退保价值表
总行数: 43
字段数: 6
数据行数: 43

投保人信息:
- 保险公司名称: 中銀集團人壽保險有限公司
- 产品名称: 薪火傳承環球終身壽險計劃
- 姓名: VIP
- 年龄: 57
- 性别: 女
- 保额: 1,000,000.00
- 年缴保费: 1,000,000.00
- 缴费年数: 躉繳
- 保险期限: 終身
- 保单货币: 美元
```

## 🚀 使用方式

### 1. 通过plan-analyzer页面上传

访问：`http://your-domain:8008/plan-analyzer`

1. 上传PDF文件
2. 等待处理完成（约15-30秒）
3. 系统会自动执行两个并行任务：
   - 原有OCR流程（保留）
   - 新Gemini直接提取（保存到table1字段）

### 2. 获取提取结果

**API接口**：
```bash
GET /api/ocr/documents/{document_id}/
```

**响应示例**：
```json
{
  "status": "success",
  "data": {
    "id": 191,
    "file_name": "57岁女士中银薪火传承计划书.pdf",
    "status": "completed",
    "processing_stage": "all_completed",

    "table1": "{\"table_name\":\"退保价值表\",\"row_count\":43,\"fields\":[...],\"data\":[[...]],\"policy_info\":{...}}",

    "content": "OCR识别的文本...",
    "tablecontent": "提取的表格HTML...",
    "tablesummary": "表格分析概要..."
  }
}
```

### 3. 前端解析

```javascript
// 获取文档数据
const response = await fetch(`/api/ocr/documents/${documentId}/`);
const docData = await response.json();

// 解析table1 JSON
const table1Data = JSON.parse(docData.data.table1);

// 访问表格数据
console.log('表格名称:', table1Data.table_name);
console.log('总行数:', table1Data.row_count);
console.log('字段:', table1Data.fields);
console.log('数据:', table1Data.data);

// 访问投保人信息
const policyInfo = table1Data.policy_info;
console.log('保险公司:', policyInfo.保险公司名称);
console.log('产品名称:', policyInfo.产品名称);
console.log('姓名:', policyInfo.姓名);
console.log('年龄:', policyInfo.年龄);
console.log('性别:', policyInfo.性别);
console.log('保额:', policyInfo.保额);
console.log('年缴保费:', policyInfo.年缴保费);
console.log('缴费年数:', policyInfo.缴费年数);
console.log('保险期限:', policyInfo.保险期限);
```

## 🔧 修改的文件

1. **api/gemini_service.py** (行 426-543)
   - 更新提示词，增加policy_info提取
   - 改进JSON解析逻辑
   - 添加数组包装格式支持

2. **api/tasks.py** (extract_table_data_direct_task)
   - 保持不变，任务逻辑已经支持新格式

3. **api/ocr_views.py** (upload_pdf_async)
   - 保持不变，已经并行触发两个任务

## 📝 重要提示

### 数据类型
- 所有表格数据都是**字符串格式**
- 数字包含千位分隔符（如 "1,000,000"）
- 前端需要根据需要转换为数值类型

### 兼容性
- ✅ **向后兼容**：原有OCR流程完全保留
- ✅ **并行执行**：两个任务同时运行，互不干扰
- ✅ **数据备份**：有多个数据源可供使用

### 性能
- **Gemini直接提取**: ~15-30秒
- **传统OCR流程**: ~60-90秒
- **并行优势**: 总时间取决于最慢的任务

## 🎯 下一步工作

### 前端集成（可选）
1. 在PlanAnalyzer组件中显示policy_info
2. 格式化显示表格数据
3. 添加数据对比功能（Gemini vs OCR）

### 优化建议
1. 考虑缓存相同PDF的提取结果
2. 添加提取质量评分机制
3. 支持更多保险公司和产品类型

## 📚 相关文档

- **READY_TO_USE.md** - 系统就绪说明
- **GEMINI_TABLE_EXTRACTION_GUIDE.md** - 完整技术文档
- **test_gemini_table_extraction.py** - 测试脚本

## ✅ 系统状态

- ✅ Django服务：运行中 (端口8017)
- ✅ Celery Worker：运行中 (4个并发)
- ✅ Gemini API：已配置并测试通过
- ✅ 数据库：连接正常
- ✅ 新功能：已上线，生产环境可用

---

**部署日期**: 2026-01-22
**版本**: v2.0
**状态**: ✅ 生产环境已上线，测试通过
