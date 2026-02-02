# 计划书表格功能测试指南

## 测试前准备

✅ 数据库迁移已完成
✅ Django服务器已重启
✅ Celery Worker已重启
✅ 所有服务运行正常

## 测试步骤

### 1. 上传新的计划书PDF

```bash
# 方式1：通过前端上传
# 访问前端页面，上传一个保险计划书PDF

# 方式2：使用API上传
curl -X POST http://localhost:8007/api/ocr/save/ \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "test.pdf",
    "ocr_content": "..."
  }'
```

### 2. 等待Celery任务完成

查看任务处理进度：
```bash
# 查看Celery日志
tail -f logs/celery.log

# 或者通过API查询状态
curl http://localhost:8007/api/ocr/documents/<document_id>/status/
```

**预期流程：**
1. ⏳ 步骤1/6: 提取表格源代码
2. ⏳ 步骤2/6: 提取基本信息
3. ⏳ 步骤3/6: 提取表格概要
   - 🔍 开始提取各个表格的HTML源代码...
   - 📋 概要识别到 X 个逻辑表格
   - 📊 提取到 Y 个包含'保单年度终结'的<table>标签
   - 💾 成功保存 Z 个表格到数据库
4. ⏳ 步骤4/6: 提取退保价值表
5. ⏳ 步骤5/6: 提取无忧选退保价值表
6. ⏳ 步骤6/6: 提取计划书概要

### 3. 查看文档详情

```bash
# 获取文档详情（包含表格列表）
curl http://localhost:8007/api/ocr/documents/<document_id>/
```

**预期响应：**
```json
{
  "status": "success",
  "data": {
    "id": 123,
    "file_name": "xxx.pdf",
    "tablesummary": "1.\n表名：詳細說明 - 退保價值\n行数：101行\n...",
    "plan_tables": [
      {
        "id": 1,
        "table_number": 1,
        "table_name": "詳細說明 - 退保價值 (只根據基本計劃計算)",
        "row_count": 101,
        "fields": "保单年度终结,缴付保费总额,退保价值(保证金额,非保證金額,总额)",
        "created_at": "2024-01-19T..."
      },
      {
        "id": 2,
        "table_number": 2,
        "table_name": "身故賠償",
        "row_count": 101,
        "fields": "保单年度终结,身故赔偿(保证金额,非保证金额,总额)",
        "created_at": "2024-01-19T..."
      }
    ]
  }
}
```

### 4. 查看单个表格详情

```bash
# 获取表格详情（包含HTML源代码）
curl http://localhost:8007/api/ocr/tables/<table_id>/
```

**预期响应：**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "table_number": 1,
    "table_name": "詳細說明 - 退保價值 (只根據基本計劃計算)",
    "row_count": 101,
    "fields": "保单年度终结,缴付保费总额,退保价值(保证金额,非保證金額,总额)",
    "html_source": "<table>\n  <tr><th>保单年度终结</th><th>缴付保费总额</th>...</tr>\n  <tr><td>1</td><td>10000</td>...</tr>\n  ...\n</table>",
    "plan_document": {
      "id": 123,
      "file_name": "xxx.pdf"
    },
    "created_at": "2024-01-19T...",
    "updated_at": "2024-01-19T..."
  }
}
```

### 5. 在Admin后台查看

1. 访问：http://localhost:8007/admin/
2. 登录后点击 "计划书表格 (Plan tables)"
3. 查看表格列表
4. 点击任意表格查看详情
5. 展开"HTML源代码"折叠区域查看完整HTML

## 验证要点

### ✅ 数据完整性检查
- [ ] 每个计划书至少有1个表格记录
- [ ] 表格编号连续（1, 2, 3...）
- [ ] 表格名称与tablesummary中的名称一致
- [ ] 行数合理（跨页表格已合并）
- [ ] 字段列表与概要一致
- [ ] HTML源代码完整且格式正确

### ✅ 跨页表格合并检查
- [ ] 跨页表格只保留一个表头
- [ ] 所有数据行都被保留
- [ ] 行数 = 表头行数 + 数据行数

### ✅ 关键词过滤检查
- [ ] 只提取包含"保单年度终结"的表格
- [ ] 其他无关表格被正确过滤

### ✅ API功能检查
- [ ] 文档详情API返回plan_tables字段
- [ ] plan_tables包含所有表格的基本信息
- [ ] 表格详情API返回完整HTML源代码
- [ ] 404错误处理正确

### ✅ Admin后台检查
- [ ] 列表页显示正常
- [ ] 搜索功能正常
- [ ] 过滤功能正常
- [ ] 详情页HTML显示正常

## 常见问题排查

### Q1: plan_tables字段为空？
**可能原因：**
- Celery任务尚未执行完步骤3
- 表格提取失败但未报错
- OCR内容中没有包含"保单年度终结"的表格

**排查方法：**
```bash
# 查看Celery日志
tail -f logs/celery.log | grep "表格"

# 检查文档状态
curl http://localhost:8007/api/ocr/documents/<document_id>/status/
```

### Q2: 表格数量与预期不符？
**可能原因：**
- DeepSeek分析的概要与实际<table>标签数量不匹配
- 部分表格不包含"保单年度终结"字段被过滤

**排查方法：**
```bash
# 检查tablesummary字段，看识别了多少个表格
# 检查tablecontent字段，看有多少个<table>标签
```

### Q3: HTML源代码不完整？
**可能原因：**
- OCR识别质量问题
- 跨页表格合并逻辑错误

**排查方法：**
- 在Admin后台查看html_source字段
- 检查是否有表头重复或数据行丢失

## 性能测试

### 测试指标
- 单个表格提取时间：< 1秒
- 5个表格提取总时间：< 5秒
- 数据库存储大小：每个表格 ~10-50KB

### 并发测试
```bash
# 同时上传5个文档
for i in {1..5}; do
  curl -X POST http://localhost:8007/api/ocr/save/ \
    -H "Content-Type: application/json" \
    -d @test_doc_$i.json &
done
wait
```

## 回归测试

确保新功能不影响现有功能：
- [ ] 基本信息提取正常
- [ ] 退保价值表提取正常
- [ ] 无忧选退保价值表提取正常
- [ ] 计划书概要提取正常
- [ ] 前端文档列表正常显示

## 测试数据准备

建议准备以下类型的测试文档：
1. **标准文档**：包含2-3个表格，无跨页
2. **跨页文档**：包含跨页表格
3. **复杂文档**：包含5个以上表格
4. **边界情况**：只有1个表格或超过10个表格

## 测试报告模板

```markdown
## 测试结果

### 测试环境
- Django版本: 5.2.7
- 数据库: MySQL 8.0
- 测试时间: 2024-01-19

### 测试用例

#### 测试用例1：标准文档
- 文档ID: 123
- 表格数量: 3
- 测试结果: ✅ 通过
- 备注: 所有表格正确提取

#### 测试用例2：跨页文档
- 文档ID: 124
- 表格数量: 2（跨3页）
- 测试结果: ✅ 通过
- 备注: 表格正确合并，无重复表头

### 性能数据
- 平均提取时间: 2.3秒/文档
- 数据库存储: 35KB/表格

### 问题记录
- 无

### 总结
✅ 所有测试用例通过，功能正常
```

## 下一步

测试通过后，可以考虑：
1. 开发前端UI展示表格列表
2. 添加表格数据导出功能
3. 实现表格内容搜索
4. 添加表格数据可视化
