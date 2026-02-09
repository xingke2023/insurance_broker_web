# 保险计划书智能分析系统 - 项目分析

## 最近更新

### 2026年2月5日 - 文档详情页下载单页PDF功能
- **功能**：在文档详情页（`/document/{id}`）添加"下载单页PDF"按钮
- **实现**：
  - 创建新API端点 `POST /api/pdf/download-clean-document`
  - 使用PyMuPDF自动去除页眉（80px）和页脚（60px）
  - 前端从下载PNG截图改为下载处理后的PDF文件
- **位置**：`api/pdf_views.py:918-1016`、`DocumentDetail.jsx:448-507`
- **按钮**：紫色渐变按钮，带相机图标，标题"下载单页PDF（去除页眉页脚）"
- **优势**：保留PDF格式、保持矢量图形质量、去除代理商信息
- **文档**：详见 `DOCUMENT_DETAIL_CLEAN_PDF.md`

### 2026年2月5日 - 产品对比功能修复
- **问题**：Plan Management 页面产品对比功能无法显示数据
- **根因**：API 返回的 `table1` 是 JSON 字符串，前端未解析直接访问 `data` 属性
- **修复**：
  - 在 `PlanDocumentManagement.jsx:549-560` 添加字符串解析逻辑
  - 在 `PlanDocumentManagement.jsx:568-595` 增强字段名匹配规则
  - 支持更多字段变体：`terminal_bonus_cash_value`, `reversionary_bonus_cash_value`
- **影响**：产品对比功能现在可以正常显示数据
- **文档更新**：
  - 添加"产品对比功能"完整说明
  - 明确实际数据格式（`data` 二维数组 vs `surrender_value_table`）
  - 添加调试指南和常见问题排查流程
- **分页优化**：文档列表每页显示 10 条记录（原 50 条）

## 项目概述

这是一个**保险计划书智能分析系统**（Insurance Plan Analyzer），使用全栈技术构建的现代化Web应用。主要用于自动化处理和分析保险计划书文档。

## 核心功能

### 1. 计划书智能分析（Plan Analyzer）⭐ 核心功能

**页面路径**：`/plan-analyzer`
**前端组件**：`frontend/src/components/PlanAnalyzer.jsx`
**后端 API**：`POST /api/ocr/upload-async/`

#### 工作流程（2026年1月最新版本）

##### 1️⃣ 前端：上传 PDF

```javascript
// 位置：PlanAnalyzer.jsx:95
const handleFileSelect = async (file) => {
  // 1. 自动检测 PDF 是否包含表格（检查前6页）
  const hasTable = await detectTableInPDF(file);

  // 2. 检测特征：
  //    - 数字比例 > 15%
  //    - 包含关键词：年度、保单年度、退保金、现金价值等

  // 3. 文件准备就绪，等待点击"开始分析"
  setUploadedFile(file);
};
```

##### 2️⃣ 前端：点击"开始分析"

```javascript
// 位置：PlanAnalyzer.jsx:534
const handleStartParsing = async () => {
  // 1. 上传文件到后端
  const response = await authFetch('/api/ocr/upload-async/', {
    method: 'POST',
    body: formData  // 包含 file 和 user_id
  });

  // 2. 获取文档 ID
  const documentId = data.document_id;

  // 3. 添加到后台任务列表（localStorage 持久化）
  addBackgroundTask({
    task_id: documentId,
    file_name: uploadedFile.name,
    state: 'running',
    progress: 10,
    processing_stage: 'ocr_pending'
  });

  // 4. 开始轮询状态（每 3 秒）
  startPollingStatus(documentId);

  // 5. 提示用户可离开页面
  alert('文件已上传成功！OCR识别正在后台处理，您可以安全地离开此页面。');
};
```

##### 3️⃣ 后端：接收上传并创建任务

```python
# 位置：api/ocr_views.py:1501
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsMemberActive])
def upload_pdf_async(request):
    # 1. 验证会员状态
    # 2. 保存 PDF 文件到 media/plan_documents/
    plan_doc = PlanDocument.objects.create(
        file_name=uploaded_file.name,
        file_path=uploaded_file,  # 自动生成唯一文件名
        status='processing',
        processing_stage='ocr_pending'
    )

    # ⭐ 关键：启动单一 Celery 任务（不再是6步任务链）
    from .tasks import extract_table_data_direct_task
    extract_table_data_direct_task.apply_async(
        args=[plan_doc.id],
        countdown=1  # 1秒后执行
    )

    # 3. 立即返回文档 ID
    return Response({
        'status': 'success',
        'document_id': plan_doc.id
    })
```

##### 4️⃣ Celery 任务：一步直接提取所有数据

```python
# 位置：api/tasks.py:1607
@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def extract_table_data_direct_task(self, document_id):
    """
    🆕 新流程：直接使用 Gemini 从 PDF 提取所有数据
    （绕过传统的 OCR → 提取表格源代码 → 分析表格的多步流程）
    """

    # 1. 更新状态
    doc.processing_stage = 'extracting_table1'
    doc.save()

    # 2. 调用 Gemini API 直接分析 PDF
    from .gemini_service import extract_table_data_from_pdf
    result = extract_table_data_from_pdf(pdf_path)

    # 返回格式：
    # {
    #   'success': True,
    #   'table_data': {
    #     'policy_info': {...},           # 保单信息
    #     'surrender_value_table': [...], # 退保价值表
    #     'death_benefit_table': [...]    # 身故赔偿表
    #   },
    #   'financial_planning_summary': '...',  # 财务规划摘要
    #   'financial_planning_qa': [...]        # 常见问题
    # }

    # 3. 保存到 table1 字段（JSON 格式）
    doc.table1 = json.dumps(result['table_data'])

    # 4. 自动提取并更新数据库字段
    policy_info = result['table_data']['policy_info']
    doc.insured_name = policy_info.get('姓名')
    doc.insured_age = policy_info.get('年龄')
    doc.insured_gender = policy_info.get('性别')
    doc.insurance_company = policy_info.get('保险公司名称')
    doc.insurance_product = policy_info.get('产品名称')
    doc.sum_assured = policy_info.get('保额')
    doc.annual_premium = policy_info.get('年缴保费')
    doc.payment_years = policy_info.get('缴费年数')
    doc.total_premium = policy_info.get('总保费')
    doc.insurance_period = policy_info.get('保险期限')

    # 5. 生成并保存财务规划摘要（HTML 格式）
    doc.summary = generate_html_summary(result)

    # 6. 标记完成
    doc.processing_stage = 'all_completed'
    doc.status = 'completed'
    doc.save()
```

##### 5️⃣ 前端：轮询进度

```javascript
// 位置：PlanAnalyzer.jsx:610
const startPollingStatus = (documentId) => {
  const pollInterval = setInterval(async () => {
    // 每 3 秒查询一次
    const response = await fetch(`/api/ocr/documents/${documentId}/status/`);
    const { processing_stage, progress_percentage } = response.data;

    // 更新后台任务进度
    updateBackgroundTask(documentId, {
      progress: progress_percentage,
      processing_stage: processing_stage,
      state: processing_stage === 'all_completed' ? 'finished' : 'running'
    });

    // 完成后停止轮询
    if (processing_stage === 'all_completed' || processing_stage === 'error') {
      clearInterval(pollInterval);
    }
  }, 3000);

  // 10 分钟后自动停止轮询
  setTimeout(() => clearInterval(pollInterval), 600000);
};
```

#### 处理阶段（processing_stage）

| 阶段 | 说明 | 进度 |
|------|------|------|
| `ocr_pending` | 等待处理 | 10% |
| `extracting_table1` | Gemini 正在分析 PDF | 50% |
| `all_completed` | 分析完成 ✅ | 100% |
| `error` | 处理失败 ❌ | - |

#### 数据存储结构

**⚠️ 重要说明**：文档中描述的"新格式"（surrender_value_table）是设计目标，但**当前实际使用的是"标准格式"**（data数组）。

**table1 字段 - 理论格式（Gemini新格式，未使用）**：
```json
{
  "policy_info": {
    "姓名": "张三",
    "年龄": 30,
    "性别": "男",
    "保险公司名称": "友邦保险",
    "产品名称": "盛世·御享",
    "保额": 500000,
    "年缴保费": 50000,
    "缴费年数": 5,
    "总保费": 250000,
    "保险期限": "终身"
  },
  "surrender_value_table": [
    {"保单年度": 1, "保证现金价值": 1000, "非保证现金价值": 500, "总现金价值": 1500},
    {"保单年度": 2, "保证现金价值": 2000, "非保证现金价值": 1000, "总现金价值": 3000}
  ],
  "death_benefit_table": [...]
}
```

**table1 字段 - 实际格式（当前使用）**：
```json
{
  "table_name": "退保价值表",
  "row_count": 138,
  "fields": ["保單年度終結", "已繳保費總額", "保證現金價值", "保額增值紅利之現金價值", "終期紅利之現金價值", "退保發還金額總額"],
  "data": [
    ["policy_year", "total_premiums_paid", "guaranteed_cash_value", "reversionary_bonus_cash_value", "terminal_bonus_cash_value", "surrender_value_after_withdrawal"],
    ["1", "10000", "0", "0", "0", "0"],
    ["2", "20000", "0", "0", "0", "0"],
    ["3", "30000", "0", "0", "0", "0"]
  ],
  "policy_info": {
    "保險公司名稱": "安盛保險(百慕達)有限公司",
    "產品名稱": "盛利 II 儲蓄保險 – 至尊",
    "姓名": "XIAO MING",
    "年齡": "1",
    "性別": "女",
    "保額": "50000",
    "年繳保費": "10000.13",
    "繳費年數": "5",
    "總保費": "50000.65",
    "保險期限": "138"
  }
}
```

**关键特征**：
- ✅ `fields`：中文字段名数组（仅用于显示）
- ✅ `data[0]`：英文字段名数组（用于程序匹配）
- ✅ `data[1]` 开始：实际数据行（**所有值都是字符串**）
- ✅ `policy_info`：保单基本信息（**所有值都是字符串**）
- ✅ 数据库存储格式：JSON字符串（API返回时需先 `JSON.parse()`）

**数据库字段**（自动从 policy_info 提取）：
- `insured_name` - 受保人姓名
- `insured_age` - 受保人年龄
- `insured_gender` - 受保人性别
- `insurance_company` - 保险公司
- `insurance_product` - 产品名称
- `sum_assured` - 保额
- `annual_premium` - 年缴保费
- `payment_years` - 缴费年数
- `total_premium` - 总保费
- `insurance_period` - 保险期限

**summary 字段**（HTML 格式）：
财务规划摘要和常见问题解答

#### 核心特性

- ✅ **一步到位**：单一任务直接提取所有数据（不再是 6 步任务链）
- ✅ **异步处理**：上传后可立即离开页面，后台继续处理
- ✅ **智能检测**：自动识别 PDF 是否包含表格
- ✅ **实时进度**：多任务进度条显示（每个任务独立进度）
- ✅ **后台任务列表**：右上角显示所有正在处理/已完成的任务
- ✅ **持久化存储**：任务保存到 localStorage，刷新不丢失
- ✅ **自动重试**：失败自动重试 2 次（间隔 60 秒）
- ✅ **双重存储**：JSON + 数据库字段，便于查询和展示

#### 与旧流程的对比

| 对比项 | 旧流程（已废弃） | **新流程（文档描述）** | **实际情况** |
|--------|-----------------|---------------------|------------|
| **任务数量** | 6 个任务链 | **1 个任务** ⚡ | 1 个任务 ✅ |
| **处理方式** | OCR → 提取表格源代码 → 分析 | **Gemini 直接分析 PDF** | Gemini 分析 ✅ |
| **数据格式** | 多个字段分散 | `surrender_value_table` 数组 | **`data` 二维数组** ⚠️ |
| **字段名格式** | - | JSON对象键 | **英文字段名行 + 数据行** ⚠️ |
| **数据类型** | - | 数字 | **字符串** ⚠️ |
| **处理时间** | 较长（多步骤串行） | **更快（一步完成）** | 更快 ✅ |
| **依赖服务** | PaddleLayout OCR + Gemini | **仅 Gemini** | 仅 Gemini ✅ |

**⚠️ 数据格式说明**：
- 文档中描述的是理想的新格式（`surrender_value_table` 数组）
- 实际系统使用的是标准格式（`data` 二维数组，第0行是英文字段名）
- 所有数值都是字符串格式（需要前端转换为数字）
- 产品对比功能已适配实际格式

#### 技术实现

- **AI 引擎**：Google Gemini 3 Flash Preview（multimodal，直接处理 PDF）
- **任务队列**：Celery + Redis
- **状态管理**：PlanDocument.processing_stage 字段
- **进度跟踪**：前端轮询（每 3 秒）+ 后端状态更新
- **数据格式**：JSON（table1）+ 结构化数据库字段

#### 相关文件

- `frontend/src/components/PlanAnalyzer.jsx` - 前端主组件
- `api/ocr_views.py` - 上传和状态查询 API
- `api/tasks.py:1607` - Celery 任务定义（extract_table_data_direct_task）
- `api/gemini_service.py` - Gemini API 封装（extract_table_data_from_pdf）

### 2. 用户认证系统
- JWT token认证
- 用户注册/登录功能
- 多语言支持（中文/英文）
- 认证视图：`api/auth_views.py`

### 3. 文档管理
- 查看已保存的文档列表
- 查看文档详情和分析结果
- **下载原始PDF文件**（绿色下载按钮）
- 批量删除文档
- 重新OCR识别（文档详情页）
- 重新提取表格（文档详情页）
- 前端组件：`frontend/src/components/PlanDocumentManagement.jsx`、`DocumentDetail.jsx`

#### PDF文件存储和下载机制

**文件存储路径**：
- 物理路径：`/var/www/harry-insurance2/media/plan_documents/`
- URL路径：`/media/plan_documents/文件名`

**文件命名规则**：
- 原始文件名保存在 `file_name` 字段（用户看到的名称）
- 实际存储文件名：`原名_时间戳.pdf`（避免重名冲突）
- 示例：`41岁女士法国盛利_II_至尊-50000-5年_20260120_101711.pdf`

**下载功能**：
- Plan-Management页面：绿色"下载"按钮
- 点击自动下载原始PDF文件
- 无文件时按钮自动禁用
- 前端通过 `file_path` URL字段下载

**重新OCR识别**：
- 文档详情页"计划书内容"区域
- 橙色"重新OCR"按钮
- 重新调用PaddleLayout API识别PDF
- 自动触发后续表格提取和分析任务
- API路径：`POST /api/ocr/documents/{id}/re-ocr/`

#### 产品对比功能 ⭐ 重要功能

**页面路径**：`/plan-document-management`（Plan Management页面）
**前端组件**：`frontend/src/components/PlanDocumentManagement.jsx`

##### 功能说明

- **批量对比**：选择2个或多个已分析的计划书，点击"产品对比"按钮
- **对比维度**：显示3个核心字段
  - 已缴保费（`total_premiums_paid`）
  - 提取总额（`withdrawal_amount`）
  - 退保价值（`surrender_value_after_withdrawal`/`total_cash_value`）
- **自定义年度**：支持自定义显示的保单年度或年龄
  - 默认年度：`1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,30,35,40,45,50,60,70,80,90,100`
  - 支持范围格式：`1-10` 自动展开为 `1,2,3,...,10`
  - 支持年龄格式：`30岁,40岁` 按年龄匹配数据
  - 纯数字默认为保单年度
- **分页显示**：文档列表每页显示10条记录

##### 数据格式要求

对比功能要求文档必须包含有效的 `table1` 数据。系统支持以下数据格式：

**格式1：新格式（Gemini，未使用）**
```json
{
  "policy_info": {...},
  "surrender_value_table": [
    {"保单年度": 1, "保证现金价值": 1000, ...}
  ]
}
```

**格式2：标准格式（当前使用）**
```json
{
  "table_name": "...",
  "row_count": 138,
  "fields": ["保單年度終結", "已繳保費總額", ...],
  "data": [
    ["policy_year", "total_premiums_paid", "guaranteed_cash_value", "reversionary_bonus_cash_value", "terminal_bonus_cash_value", "surrender_value_after_withdrawal"],
    ["1", "10000", "0", "0", "0", "0"],
    ["2", "20000", "0", "0", "0", "0"]
  ],
  "policy_info": {...}
}
```

**关键说明**：
- `data[0]` 是英文字段名（用于字段匹配）
- `data[1]` 开始才是实际数据行
- 所有数值都是**字符串格式**（`"10000"` 而非 `10000`）
- `fields` 是中文字段名（仅用于显示）

##### 字段名映射规则

系统自动识别多种字段名变体（`PlanDocumentManagement.jsx:568-595`）：

| 标准字段 | 识别的变体 |
|---------|-----------|
| `policy_year` | `policy_year` |
| `total_premiums_paid` | `total_premiums_paid`, `total_premium_paid`, `premiums_paid` |
| `guaranteed_cash_value` | `guaranteed_cash_value`, `guaranteed` |
| `non_guaranteed_cash_value` | `non_guaranteed_cash_value`, `terminal_bonus_cash_value`, `reversionary_bonus_cash_value`, `terminal_dividend`, `non_guaranteed` |
| `total_cash_value` | `total_cash_value`, `surrender_value_after_withdrawal`, `total_surrender_value`, `total_value`, `total` |
| `withdrawal_amount` | `withdrawal_amount` |

**实际数据库字段示例**（安盛盛利 II）：
- `policy_year` - 保单年度
- `total_premiums_paid` - 已缴保费总额
- `guaranteed_cash_value` - 保证现金价值
- `reversionary_bonus_cash_value` - 保额增值红利之现金价值
- `terminal_bonus_cash_value` - 终期红利之现金价值
- `surrender_value_after_withdrawal` - 退保发还金额总额（= 总现金价值）

##### 技术实现要点

**数据解析**（2026年2月修复）：
```javascript
// ⚠️ 关键修复：API返回的table1是字符串，需先解析
let table1Obj = doc.table1;
if (typeof doc.table1 === 'string') {
  try {
    table1Obj = JSON.parse(doc.table1);
  } catch (e) {
    console.error('❌ 解析 table1 失败:', doc.file_name, e);
    table1Obj = {};
  }
}

const tableData = table1Obj?.data || [];  // ✅ 现在可以正确获取data数组
```

**字段索引查找**：
```javascript
// 使用 findIndex 在英文字段名行（data[0]）中查找字段位置
const fieldIndexes = {
  policy_year: englishFields.findIndex(f => f === 'policy_year'),
  total_cash_value: englishFields.findIndex(f =>
    f === 'total_cash_value' ||
    f === 'surrender_value_after_withdrawal' ||
    f === 'total_surrender_value'
  )
};
```

**数据提取**：
```javascript
// 从data[1]开始遍历数据行
const dataRows = tableData.slice(1);
const rowData = dataRows.find(row => {
  const policyYear = row[fieldIndexes.policy_year];
  return policyYear === targetPolicyYear;  // 支持字符串和数字匹配
});
```

##### 常见问题排查

**问题1：对比表格显示空白**
- **原因**：`table1` 是字符串未解析，导致 `doc.table1.data` 为 `undefined`
- **修复**：已在 `PlanDocumentManagement.jsx:549-560` 添加字符串解析逻辑

**问题2：字段值显示为空**
- **原因**：字段名不匹配，`findIndex` 返回 `-1`
- **排查**：检查 `console.log` 输出的 `englishFields` 和 `fieldIndexes`
- **修复**：在字段映射规则中添加新的变体名称

**问题3：年度匹配错误**
- **原因**：保单年度（数字）和年龄（带"岁"）混淆
- **区分**：纯数字视为保单年度，带"岁"的按年龄匹配

##### 相关文件

- `frontend/src/components/PlanDocumentManagement.jsx` - 文档管理和对比主组件
- `api/ocr_views.py:223` - `get_saved_documents()` API（返回table1字符串）
- `api/models.py` - `PlanDocument` 模型定义

### 4. PDF 工具箱 Pro（PDF Footer Remover 2）

**页面路径**：`/pdf-footer-remover2`
**前端组件**：`frontend/src/components/PDFFooterRemover2.jsx`
**后端 API**：`api/pdf_views.py`

#### 功能模块

1. **表格提取（两种方式）**
   - **快速提取**（PyMuPDF）：适合有边框表格，速度快
   - **精确提取**（pdfplumber）：适合复杂表格、无边框表格，准确度高
   - 支持三种导出格式：CSV（Excel）、TXT（制表符）、Markdown

2. **全文提取**
   - 使用 pdfplumber 提取所有文字
   - 显示各页统计信息
   - 支持下载为 TXT 文件

3. **页脚擦除**
   - 6个擦除区域：页眉通栏/左上/右上、页脚通栏/左下/右下
   - 支持自定义页码范围
   - 自动添加页码文字
   - PDF 预览功能

#### 表格导出格式对比

| 格式 | 特点 | 适用场景 |
|------|------|---------|
| CSV | UTF-8 BOM，双引号包裹单元格 | Excel 数据分析 |
| TXT | 制表符分隔，包含元数据 | 文本编辑器 |
| Markdown | 表格语法，自动识别表头 | 文档、笔记 |

#### API 端点

- `POST /api/pdf/extract-tables` - PyMuPDF 表格提取
- `POST /api/pdf/extract-tables-plumber` - pdfplumber 表格提取
- `POST /api/pdf/extract-text` - 全文提取
- `POST /api/pdf/remove-footer` - 页脚擦除

### 5. 海报分析工具
- 上传海报图片（JPG、PNG、WebP、GIF，最大10MB）
- AI智能分析海报的视觉设计、内容解读、营销要素
- 提供8种预设分析模板：产品分析、客户视角分析、朋友圈文案、全面分析、文案提取、设计分析、营销效果评估、竞品对比
- 支持自定义分析提示词
- 一键复制分析结果
- AI服务：Google Gemini 3 Pro Preview (`api/gemini_service.py`)
- 前端页面：`frontend/src/components/PosterAnalyzer.jsx`
- 访问路径：Dashboard → 海报分析工具 → `/poster-analyzer`

#### 海报分析功能详细说明

**技术架构**：
- **后端服务**：`api/gemini_service.py` - 封装Gemini API调用
- **视图层**：`api/poster_views.py` - 处理图片上传和分析请求
- **路由**：`POST /api/poster/analyze` - 分析接口，`GET /api/poster/templates` - 获取模板
- **AI模型**：Google Gemini 3 Pro Preview (`gemini-3-pro-preview`)
- **SDK版本**：`google-genai` 1.41.0（新版SDK，使用 `genai.Client`）

**分析模板**：
1. **产品分析**：深度理解海报传达的产品定位、核心价值、信息传达、情感共鸣和品牌印象
2. **客户视角分析**：站在客户角度分析产品吸引力、列举客户可能的疑问、并从专业角度给出满意答复
3. **朋友圈文案**：生成5种不同角度的营销文案（痛点切入、利益驱动、故事叙述、数据说话、情感共鸣），包含emoji和话题标签
4. **全面分析**：视觉设计、内容解读、营销要素、改进建议
5. **文案提取**：识别并提取海报中的所有文字内容
6. **设计分析**：配色方案、排版布局、字体选择、视觉层次
7. **营销效果评估**：目标受众定位、核心卖点、转化率预估
8. **竞品对比**：与行业标准对比，分析优劣势和创新点

**API实现细节**：
```python
# 使用新版Gemini SDK
from google import genai
from google.genai import types

client = genai.Client(api_key=api_key)

# 构建请求
parts = [
    types.Part.from_text(text=prompt_text),
    types.Part.from_bytes(data=image_bytes, mime_type=content_type)
]

# 调用API
response = client.models.generate_content(
    model='gemini-3-pro-preview',
    contents=[types.Content(role="user", parts=parts)]
)
```

**前端特性**：
- 左右分栏布局：左侧上传和选择模板，右侧显示结果
- 渐变背景设计（黄色→橙色→红色）
- 图片实时预览
- 分析过程loading动画
- 结果展示支持换行和格式化
- 返回Dashboard按钮

**文件大小限制**：
- 最大10MB
- 支持格式：image/jpeg, image/jpg, image/png, image/webp, image/gif
- 前后端双重验证

### 6. Playwright产品爬虫工具（Gemini智能增强版）
- **智能模式**：使用Gemini 3 Flash Preview自动分析和筛选高质量产品资料，过滤无关链接（公司新闻、隐私政策等），自动标记核心资料并生成内容描述
- **基础模式**：使用DOM直接提取所有PDF/视频链接（添加`--no-gemini`参数）
- 智能保存到`product_promotions`表（自动检查重复，支持新增/更新，核心资料优先排序）
- 使用方法：`python3 scrape_product_with_playwright.py --url "产品URL" --product-id 产品ID`
- 相关文件：`scrape_product_with_playwright.py`、`/tmp/playwright-scraper-product-enhanced.js`
- 详细文档：`PLAYWRIGHT_SCRAPER_ENHANCED.md`

## 技术架构

### 后端技术栈
- **框架**: Django 5.2.7
- **API**: Django REST Framework 3.16.1
- **数据库**: MySQL（端口8510，数据库名：insurancetools）
- **数据库连接**: PyMySQL
- **认证**: JWT (djangorestframework-simplejwt)
- **跨域**: django-cors-headers
- **配置**: python-dotenv

### 前端技术栈
- **框架**: React 19.1.1
- **构建工具**: Vite 7.1.7
- **样式**: Tailwind CSS 3.4.17
- **HTTP客户端**: Axios 1.13.1
- **国际化**: react-i18next 16.2.4
- **图标**: Heroicons, Lucide React

### AI服务集成
- **Google Gemini 3 Flash Preview**:
  - PDF文档OCR识别（替代PaddleLayout）
  - 保险数据提取和分析（替代DeepSeek）
  - 年度价值表格解析
  - 计划书概要生成
- **Google Gemini 3 Pro Preview**: 海报视觉分析和营销评估

## 项目结构

```
harry-insurance/
├── backend/                          # Django配置目录
│   ├── settings.py                   # 主配置文件
│   ├── urls.py                       # 主URL配置
│   ├── wsgi.py                       # WSGI配置
│   └── asgi.py                       # ASGI配置
│
├── api/                              # Django API应用
│   ├── models.py                     # 数据模型（InsurancePolicy, PlanDocument, AnnualValue）
│   ├── serializers.py                # DRF序列化器
│   ├── urls.py                       # API路由配置
│   ├── views.py                      # 保险策略视图
│   ├── auth_views.py                 # 用户认证视图
│   ├── ocr_views.py                  # OCR识别和文档保存
│   ├── qwen_service.py               # 通义千问AI服务
│   ├── deepseek_service.py           # DeepSeek表格分析服务
│   ├── gemini_service.py             # Gemini AI海报分析服务
│   ├── poster_views.py               # 海报分析视图
│   ├── insurance_company_configs.py  # 保险公司配置
│   └── admin.py                      # Django管理后台配置
│
├── frontend/                         # React前端应用（主前端，端口8008）
│   ├── src/
│   │   ├── components/               # React组件
│   │   │   ├── HomePage.jsx          # 主页/OCR上传（19KB）
│   │   │   ├── PlanAnalyzer.jsx      # 计划书分析（31KB）
│   │   │   ├── PlanDocumentManagement.jsx  # 文档管理（52KB）
│   │   │   ├── PosterAnalyzer.jsx    # 海报分析工具
│   │   │   ├── Dashboard.jsx         # 仪表盘
│   │   │   ├── Login.jsx             # 登录页面
│   │   │   ├── Register.jsx          # 注册页面
│   │   │   └── PolicyList.jsx        # 保单列表
│   │   ├── services/                 # API服务层
│   │   ├── context/                  # React Context
│   │   ├── i18n.js                   # 国际化配置（14KB）
│   │   ├── config.js                 # 前端配置
│   │   ├── App.jsx                   # 主应用组件
│   │   └── main.jsx                  # 入口文件
│   ├── package.json                  # 依赖配置
│   ├── vite.config.js                # Vite配置
│   ├── tailwind.config.js            # Tailwind配置
│   └── postcss.config.js             # PostCSS配置
│
├── frontend1/                        # 备用前端（端口8088）
│
├── media/                            # 文件上传目录
│
├── .env                              # 环境变量配置
├── .env.example                      # 环境变量示例
├── manage.py                         # Django管理脚本
├── requirements.txt                  # Python依赖
├── start-backend.sh                  # 后端启动脚本
├── start-frontend.sh                 # 前端启动脚本
└── start-frontend1.sh                # 备用前端启动脚本
```

## 数据模型

### InsurancePolicy（保险策略）
基础保单模型，包含：
- `policy_number`: 保单号（唯一）
- `customer_name`: 客户姓名
- `policy_type`: 保险类型
- `premium`: 保费
- `start_date/end_date`: 保险期限
- `status`: 状态（active/expired/cancelled）

### PlanDocument（计划书文档）
主文档表，存储：
- 文件信息（名称、路径、大小）
- 受保人信息（姓名、年龄、性别）
- 保险产品信息（产品名、保险公司）
- 保费信息（年缴、缴费年数、总保费）
- OCR识别内容（`content`字段）
- AI提取数据（`extracted_data` JSON字段）
- 年度价值表（`table` JSON字段）
- 处理状态（uploaded/processing/completed/failed）

### AnnualValue（年度价值表）
存储每个保单年度的退保价值：
- `policy_year`: 保单年度终结
- `guaranteed_cash_value`: 保证现金价值
- `non_guaranteed_cash_value`: 非保证现金价值
- `total_cash_value`: 总现金价值
- 与PlanDocument关联（外键）

### InsuranceProduct（保险产品品种）
产品品种主表，存储：
- `company`: 所属保险公司（外键）
- `product_name`: 产品名称
- `product_category`: 产品分类（重疾险、理财、储蓄等）
- `supported_payment_periods`: 支持的缴费年期（例如：趸缴,2年,5年,10年）
- `description`: 产品描述
- `plan_summary`: 计划书产品概要
- `plan_details`: 计划书详情
- `plan_pdf_base64`: 计划书PDF Base64编码
- `product_research_report`: 产品研究报告
- ⚠️ 以下字段已废弃，改用ProductPlan关联表：
  - `payment_period`: 缴费年期（已废弃）
  - `annual_premium`: 年缴金额（已废弃）
  - `surrender_value_table`: 退保价值表（已废弃）
  - `death_benefit_table`: 身故赔偿表（已废弃）

### ProductPlan（产品缴费方案）⭐ 新增
同一产品的不同缴费年期方案（一对多关系）：
- `product`: 关联产品（外键 → InsuranceProduct）
- `plan_name`: 方案名称（自动生成：5年缴费方案）
- `payment_period`: 缴费年期（1、2、5、10、20等）
- `annual_premium`: 年缴金额
- `total_premium`: 总保费（自动计算 = 年缴 × 年期）
- `surrender_value_table`: 退保价值表（JSON格式）
- `death_benefit_table`: 身故赔偿表（JSON格式）
- `irr_rate`: 内部回报率 IRR%
- `is_recommended`: 是否推荐方案
- `is_active`: 是否启用
- 唯一约束：`(product_id, payment_period)` 同一产品不能有重复年期

**设计优势**：
- ✅ 每个产品品种只需一条记录（避免重复）
- ✅ 缴费方案独立管理（如5年期、10年期、20年期）
- ✅ 支持标记推荐方案
- ✅ CompanyComparison页面已适配新结构

**使用示例**：
```python
# 获取产品的所有缴费方案
product = InsuranceProduct.objects.get(id=1)
plans = product.plans.all()  # 返回该产品的所有缴费方案

# 获取特定年期的方案
plan_5 = product.plans.get(payment_period=5)
```

## API端点

### 保险策略管理
- `GET /api/policies/` - 获取所有保单
- `POST /api/policies/` - 创建新保单
- `GET /api/policies/{id}/` - 获取单个保单详情
- `PUT /api/policies/{id}/` - 更新保单
- `DELETE /api/policies/{id}/` - 删除保单
- `GET /api/policies/active_policies/` - 获取所有有效保单
- `POST /api/policies/{id}/cancel_policy/` - 取消保单

### 用户认证
- `POST /api/auth/register/` - 用户注册
- `POST /api/auth/login/` - 用户登录
- `GET /api/auth/profile/` - 获取用户信息

### OCR与文档管理
- `POST /api/ocr/upload-async/` - 异步上传PDF并触发OCR识别（Plan-Analyzer使用）
- `POST /api/ocr/save/` - 保存OCR识别结果（已废弃）
- `GET /api/ocr/documents/` - 获取已保存文档列表（返回file_path用于下载）
- `GET /api/ocr/documents/{id}/` - 获取文档详情（返回file_path）
- `GET /api/ocr/documents/{id}/status/` - 获取文档处理状态和进度
- `POST /api/ocr/documents/{id}/re-ocr/` - 重新OCR识别（DocumentDetail使用）
- `POST /api/ocr/documents/{id}/reextract-tablecontent/` - 重新提取表格源代码
- `POST /api/ocr/documents/{id}/reanalyze-tables/` - 重新分析表格概要
- `POST /api/ocr/documents/delete/` - 批量删除文档
- `GET /api/ocr/tables/{id}/` - 获取单个PlanTable表格详情

### 海报分析
- `POST /api/poster/analyze` - 分析海报图片（multipart/form-data，字段：image, custom_prompt）
- `GET /api/poster/templates` - 获取预设分析模板列表（8种模板）

## 部署配置

### 服务端口
- **后端服务**: `0.0.0.0:8017`（Django）
- **前端服务**: `0.0.0.0:8008`（主前端）
- **备用前端**: `0.0.0.0:8088`（frontend1）
- **MySQL数据库**: `localhost:8510`
- **Redis**: `localhost:6379`（Celery任务队列）
- **Celery Worker**: 4个并发进程

### 环境变量（.env）
```bash
# Django配置
SECRET_KEY=django-insecure-change-this-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# 数据库配置
DB_NAME=insurance_db
DB_USER=root
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=3306

# 阿里云DashScope API密钥
DASHSCOPE_API_KEY=sk-67f551815ab14c35afc14170be7dacca

# DeepSeek API密钥
# DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here

# Google Gemini API密钥 (用于海报分析)
GEMINI_API_KEY=AIzaSyC6_Lp7D2RLFTDtWoKz6-eSerX6oNDdjdM

# CORS配置
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## 安装和运行

### 前置要求
- Python 3.12+
- Node.js 24+
- MySQL 数据库

### 后端启动步骤

1. 安装Python依赖：
```bash
pip3 install django djangorestframework django-cors-headers pymysql python-dotenv google-genai
```

2. 运行数据库迁移：
```bash
python3 manage.py makemigrations
python3 manage.py migrate
```

3. 创建超级用户（可选）：
```bash
python3 manage.py createsuperuser
```

4. 启动Django服务器：Django 進程也需要重啟
```bash
sudo supervisorctl restart harry-insurance:harry-insurance-django
```

### 前端启动步骤

1. 进入前端目录并安装依赖：
```bash
cd frontend
npm install
```

2. 启动开发服务器：
```bash
./start-frontend.sh
# 或
npm run dev
```

## 关键文件说明

### 后端核心文件
- **api/ocr_views.py**: OCR识别和文档保存的核心逻辑
- **api/deepseek_service.py**: DeepSeek AI表格分析服务
- **api/qwen_service.py**: 通义千问OCR识别服务
- **api/gemini_service.py**: Google Gemini海报分析服务
- **api/poster_views.py**: 海报分析API视图（上传、分析、模板）
- **api/insurance_company_configs.py**: 各保险公司的字段映射配置
- **backend/settings.py**: Django主配置文件（数据库、JWT、CORS等）

### 前端核心组件
- **HomePage.jsx**: 主页和OCR上传界面（19KB）
- **PlanAnalyzer.jsx**: 计划书智能分析组件（31KB）
- **PlanDocumentManagement.jsx**: 文档管理和查看组件（52KB）
- **PosterAnalyzer.jsx**: 海报分析工具页面（独立页面，支持图片上传和AI分析）
- **i18n.js**: 国际化配置文件（14KB）

### 文档资源
- **DEMO_GUIDE.md**: 演示指南
- **PLAN_ANALYZER_GUIDE.md**: 计划书分析功能指南
- **PLAN_MANAGEMENT_USER_GUIDE.md**: 用户使用指南
- **DEEPSEEK_ANALYSIS_GUIDE.md**: DeepSeek分析说明
- **PROJECT_STRUCTURE.md**: 项目结构文档
- **QWEN_INTEGRATION_SUMMARY.md**: 通义千问集成总结

## 安全注意事项

### 当前需要改进的地方

⚠️ **生产环境必须修改**：

1. **数据库安全**
   - 位置：`backend/settings.py:93`
   - 问题：数据库密码硬编码
   - 建议：使用环境变量

2. **Django密钥**
   - 位置：`backend/settings.py:32`
   - 问题：使用默认不安全的SECRET_KEY
   - 建议：生成新的随机密钥

3. **调试模式**
   - 位置：`backend/settings.py:35`
   - 问题：DEBUG=True
   - 建议：生产环境设置为False

4. **跨域配置**
   - 位置：`backend/settings.py:150`
   - 问题：CORS_ALLOW_ALL_ORIGINS = True
   - 建议：限制允许的域名

5. **API密钥**
   - 位置：`.env`文件
   - 问题：包含真实API密钥
   - 建议：确保.env不上传到版本控制（已在.gitignore中）

6. **主机限制**
   - 位置：`backend/settings.py:37`
   - 问题：ALLOWED_HOSTS = ['*']
   - 建议：生产环境指定具体域名

## 开发注意事项

### 基础配置
1. 确保MySQL服务运行在8510端口
2. 确保Redis服务运行在6379端口（Celery需要）
3. 前后端需要同时运行才能正常工作
4. 修改前端代码会自动热重载
5. 修改后端代码需要重启Django服务器：`sudo supervisorctl restart harry-insurance:harry-insurance-django`
6. 修改Celery任务代码需要重启Celery Worker：`sudo supervisorctl restart harry-insurance:harry-insurance-celery`
7. 后端运行在0.0.0.0:8017，可从任何网络访问
8. 前端运行在0.0.0.0:8008，可从任何网络访问

### Django FieldFile使用规范

**PlanDocument模型的文件字段**：
```python
file_path = models.FileField(upload_to='plan_documents/')
```

**FieldFile常用属性**：
```python
doc.file_path              # FieldFile对象（不是字符串！）
doc.file_path.name         # 相对路径: "plan_documents/文件名.pdf"
doc.file_path.path         # 绝对路径: "/var/www/harry-insurance2/media/plan_documents/文件名.pdf"
doc.file_path.url          # URL路径: "/media/plan_documents/文件名.pdf"（自动URL编码）
doc.file_path.size         # 文件大小（字节）
```

**常见错误和正确写法**：
```python
# ❌ 错误：FieldFile不是字符串，不能调用字符串方法
file_path = doc.file_path.lstrip('/')
file_path = os.path.join('/var/www', doc.file_path)

# ✅ 正确：使用.path属性获取绝对路径
file_path = doc.file_path.path

# ✅ 正确：检查文件是否存在
if os.path.exists(doc.file_path.path):
    ...

# ✅ 正确：API返回URL给前端下载
'file_path': doc.file_path.url if doc.file_path else None
```

### 文件存储机制

**上传文件命名规则**（`upload_pdf_async`）：
```python
# 1. 保存原始文件名到file_name字段（用户看到的）
plan_doc.file_name = uploaded_file.name

# 2. 生成唯一文件名（避免冲突）
safe_name = re.sub(r'[^\w\s\-\_\u4e00-\u9fff]', '_', original_name)
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
unique_filename = f"{safe_name}_{timestamp}.pdf"

# 3. 保存到media/plan_documents/目录
plan_doc.file_path.save(unique_filename, uploaded_file, save=False)
```

**文件路径示例**：
- 原始文件名：`41岁女士法国盛利 II 至尊-50000-5年(1)(1).pdf`
- 存储文件名：`41岁女士法国盛利_II_至尊-50000-5年_1__1__20260120_101711.pdf`
- 绝对路径：`/var/www/harry-insurance2/media/plan_documents/41岁女士法国盛利_II_至尊-50000-5年_1__1__20260120_101711.pdf`
- URL路径：`/media/plan_documents/41%E5%B2%81%E5%A5%B3%E5%A3%AB...20260120_101711.pdf`

### 表格提取关键点

**移除OCR换行问题**：
```python
# OCR可能把"保單年度終結"识别为"保單年度\n終結"
# 检测前必须移除换行符
table_html_cleaned = table_html.replace('\n', '').replace('\r', '')
if '保单年度终结' in table_html_cleaned or '保單年度終結' in table_html_cleaned:
    ...
```

**数字特征检测（判断是否从年度1开始）**：
```python
# 改进版：基于数字特征，不依赖关键词白名单
if '<th' in row.lower():
    continue  # 跳过表头行

first_cell = re.sub(r'<[^>]+>', '', cells[0]).strip()
first_cell = first_cell.replace('\n', '').replace('\r', '')

if not first_cell.isdigit():
    continue  # 不是数字 → 表头行

year = int(first_cell)
return year == 1  # 数据行，判断是否为1
```

### 产品对比功能调试

**问题排查流程**：

1. **检查API返回的数据格式**
```python
# Django Shell
from api.models import PlanDocument
import json

doc = PlanDocument.objects.get(id=254)
table1_obj = json.loads(doc.table1)

# 检查结构
print(f"Keys: {list(table1_obj.keys())}")  # 应包含: table_name, fields, data, policy_info
print(f"Fields: {table1_obj['fields']}")   # 中文字段名
print(f"Data[0]: {table1_obj['data'][0]}") # 英文字段名
print(f"Data[1]: {table1_obj['data'][1]}") # 第一行数据
```

2. **检查前端数据接收**
```javascript
// 浏览器控制台
console.log('documents:', documents);
console.log('第一个文档的table1类型:', typeof documents[0].table1);
console.log('第一个文档的table1内容:', documents[0].table1);

// 如果是字符串，需要手动解析测试
let table1 = JSON.parse(documents[0].table1);
console.log('解析后的data长度:', table1.data.length);
console.log('英文字段名:', table1.data[0]);
```

3. **检查字段匹配**
```javascript
// 在 handleCompareProducts 函数中已有详细日志
// 查看控制台输出：
// - "📊 文档: xxx"
// - "英文字段: [...]"
// - "字段索引: {...}"
// - "第一行数据: [...]"

// 如果字段索引为-1，说明字段名不匹配
// 需要在 PlanDocumentManagement.jsx:568-595 添加新的变体
```

4. **检查数据提取**
```javascript
// 查看对比数据
console.log('window.comparisonData:', window.comparisonData);
console.log('products数量:', window.comparisonData.products.length);
console.log('targetAges:', window.comparisonData.targetAges);

// 检查第一个产品的ageData
let p1 = window.comparisonData.products[0];
console.log('产品1名称:', p1.name);
console.log('产品1 ageData:', p1.ageData);
console.log('产品1第一个年度数据:', p1.ageData[window.comparisonData.targetAges[0]]);
```

**常见错误修复**：

```javascript
// ❌ 错误：直接使用 doc.table1.data（table1是字符串）
const tableData = doc.table1?.data || [];

// ✅ 正确：先解析再访问
let table1Obj = doc.table1;
if (typeof doc.table1 === 'string') {
  table1Obj = JSON.parse(doc.table1);
}
const tableData = table1Obj?.data || [];
```

```javascript
// ❌ 错误：字段名匹配不完整
non_guaranteed_cash_value: englishFields.findIndex(f =>
  f === 'non_guaranteed_cash_value'
)

// ✅ 正确：支持多种变体
non_guaranteed_cash_value: englishFields.findIndex(f =>
  f === 'non_guaranteed_cash_value' ||
  f === 'terminal_bonus_cash_value' ||
  f === 'reversionary_bonus_cash_value'
)
```

**调试技巧**：

1. **使用 window 全局变量**：代码已将对比数据暴露到 `window.comparisonData`
2. **开启详细日志**：代码已有大量 `console.log`，打开控制台查看
3. **逐步验证**：先检查API返回 → 再检查数据解析 → 最后检查字段匹配
4. **对比多个文档**：不同保险公司的字段名可能不同，多测试几个

## 生产部署建议

1. **安全配置**
   - 设置 `DEBUG = False`
   - 配置强密码的 `SECRET_KEY`
   - 设置具体的 `ALLOWED_HOSTS`
   - 限制CORS允许的域名
   - 使用环境变量管理所有敏感信息

2. **服务器配置**
   - 使用Gunicorn作为WSGI服务器
   - 使用Nginx作为反向代理
   - 配置HTTPS（SSL证书）
   - 配置数据库连接池

3. **性能优化**
   - 启用前端生产构建（`npm run build`）
   - 配置静态文件CDN
   - 启用数据库查询优化
   - 配置缓存策略

4. **监控与日志**
   - 配置应用日志记录
   - 设置错误监控（如Sentry）
   - 配置性能监控
   - 定期备份数据库

## Celery工作原理

### 系统架构
本项目使用 **Celery + Redis** 实现异步任务处理，自动分析保险计划书文档。

### 任务流水线

当用户上传PDF后，系统会自动执行以下流程（**当前架构**）：

```
用户上传PDF（Plan-Analyzer页面）
    ↓
前端检测PDF是否包含表格（detectTableInPDF）
    ↓
用户点击"开始分析"
    ↓
POST /api/ocr/upload-async/（保存PDF文件）
    ↓
生成唯一文件名：原名_时间戳.pdf
    ↓
保存到 media/plan_documents/
    ↓
创建PlanDocument记录（file_name, file_path, status='processing', processing_stage='ocr_pending'）
    ↓
触发Celery任务：extract_table_data_direct_task（单一任务直接处理）
    ↓
[核心任务] 直接提取表格数据 (extract_table_data_direct_task)
    → processing_stage: 'extracting_table1'
    → 使用 Gemini 3 Flash Preview API 直接分析 PDF 文件
    → 无需先OCR识别，直接从PDF提取结构化数据
    → 提取：受保人信息、保险产品信息、保费信息、年度价值表
    → 保存到 table1 字段（JSON格式）
    → 同时更新数据库字段：
      - insured_name（受保人姓名）
      - insured_age（受保人年龄）
      - insured_gender（受保人性别）
      - product_name（保险产品名称）
      - insurance_company（保险公司）
      - annual_premium（年缴保费）
      - payment_years（缴费年数）
      - total_premium（总保费）
    → processing_stage: 'all_completed'
    → status: 'completed'
    ↓
处理完成（前端轮询检测到 processing_stage: 'all_completed'）
```

**⚠️ 旧架构已废弃**：
早期版本使用6步任务链（ocr_document_task → extract_tablecontent_task → extract_tablesummary_task → extract_basic_info_task → extract_table_data_task → extract_summary_task），需要多次API调用和中间数据存储。现已简化为单一任务直接处理。

### 核心组件

1. **任务队列**: Redis (localhost:6379)
2. **任务处理器**: Celery Worker (4个并发)
3. **任务定义**: `api/tasks.py:1607` (extract_table_data_direct_task)
4. **任务配置**: `backend/celery.py`
5. **任务触发**: `api/ocr_views.py:1501` (upload_pdf_async函数)

### 任务特性

- **单一任务处理**: 使用一个任务直接完成所有分析（简化架构）
- **直接PDF分析**: Gemini API直接读取PDF，无需先OCR识别
- **重试机制**: 任务最多重试2次（60秒间隔）
- **状态跟踪**: 实时更新 `processing_stage` 字段（ocr_pending → extracting_table1 → all_completed）
- **进度显示**: 前端通过 GET /api/ocr/documents/{id}/status/ 轮询获取处理进度

### 监控和管理

```bash
# 启动Celery Worker
./start_celery.sh

# 停止Celery Worker
./stop_celery.sh

# 查看任务日志
tail -f logs/celery.log

# 查看Redis队列
redis-cli LLEN celery
```

### 核心任务实现详解

#### extract_table_data_direct_task（当前唯一任务）

**核心功能**：直接从PDF文件提取所有保险数据（一步完成）

**技术实现**（api/tasks.py:1607）：

```python
@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def extract_table_data_direct_task(self, document_id):
    # 1. 更新状态为"正在提取表格"
    doc.processing_stage = 'extracting_table1'
    doc.save()

    # 2. 调用 Gemini API 直接分析 PDF
    from .gemini_service import extract_table_data_from_pdf
    result = extract_table_data_from_pdf(pdf_path)

    # 3. 保存 table1 JSON数据
    doc.table1 = json.dumps(result['table_data'], ensure_ascii=False, indent=2)

    # 4. 提取 policy_info 并更新数据库字段
    policy_info = result['table_data']['policy_info']
    doc.insured_name = policy_info.get('姓名')
    doc.insured_age = policy_info.get('年龄')
    doc.insured_gender = policy_info.get('性别')
    doc.product_name = policy_info.get('产品名称')
    doc.insurance_company = policy_info.get('保险公司')
    doc.annual_premium = policy_info.get('年缴保费')
    doc.payment_years = policy_info.get('缴费年数')
    doc.total_premium = policy_info.get('总保费')

    # 5. 标记完成
    doc.processing_stage = 'all_completed'
    doc.status = 'completed'
    doc.save()
```

**关键特点**：
- ✅ **无需OCR预处理**：Gemini直接读取PDF文件
- ✅ **一次API调用**：所有数据一次性提取完成
- ✅ **结构化输出**：直接保存为JSON格式
- ✅ **自动填充字段**：从JSON中提取关键信息更新数据库

**数据结构**（table1字段）：
```json
{
  "policy_info": {
    "姓名": "李华",
    "年龄": 41,
    "性别": "女",
    "产品名称": "法国盛利 II 至尊",
    "保险公司": "AXA安盛",
    "年缴保费": 50000,
    "缴费年数": 5,
    "总保费": 250000
  },
  "annual_values": [
    {
      "year": 1,
      "guaranteed_cash_value": 0,
      "non_guaranteed_cash_value": 45000,
      "total_cash_value": 45000
    },
    ...
  ]
}
```

### 详细文档
更多配置和使用说明，请参阅：
- **CELERY_SETUP.md** - 完整的Celery安装、配置和使用指南
- **api/tasks.py** - 所有任务的详细实现代码
- **api/gemini_service.py** - Gemini API调用服务