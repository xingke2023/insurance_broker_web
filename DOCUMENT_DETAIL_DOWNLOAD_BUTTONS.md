# DocumentDetail 页面下载功能

## 功能说明

在文档详情页面（`/document/:id`）右上角新增两个下载按钮：
1. **下载现金价值表** - 导出 Excel 文件
2. **下载单页** - 导出当前页面截图

## 功能详情

### 1. 下载现金价值表 Excel ✅

**按钮位置**: 右上角，绿色按钮
**图标**: FileSpreadsheet（表格图标）
**文字**: "现金价值表"

**功能特性**:
- 导出 Excel 格式的现金价值表数据
- 包含基本信息和完整的现金价值表
- 自动识别数据格式（JSON 或数组格式）
- 自动生成文件名：`{文件名}_现金价值表_{日期}.xlsx`

**导出的数据**:
1. **标题**: 文件名 - 现金价值表
2. **基本信息** (如果有):
   - 受保人姓名
   - 受保人年龄
   - 性别
   - 保险公司
   - 产品名称
   - 保额
   - 年缴保费
   - 缴费年数
   - 总保费
3. **现金价值表**:
   - 保单年度
   - 保证现金价值
   - 非保证现金价值
   - 总现金价值
   - 等等（根据实际数据）

**启用条件**:
- ✅ 有 `table1` 数据时按钮可用
- ❌ 无 `table1` 数据时按钮禁用（灰色）

### 2. 下载单页截图 ✅

**按钮位置**: 右上角，紫色按钮
**图标**: Camera（相机图标）
**文字**: "下载单页"

**功能特性**:
- 将当前页面内容截图为 PNG 图片
- 自动处理固定导航栏（避免重复）
- 高清截图（scale: 2）
- 自动生成文件名：`{文件名}_详情_{日期}.png`

**启用条件**:
- ✅ 始终可用

## 按钮布局

### 桌面端（大屏）
```
┌─────────────────────────────────────────────────────────────┐
│ [← 返回列表]  |  文档标题                                      │
│                                                               │
│                    [现金价值表] [下载单页] [计划书助手]        │
└─────────────────────────────────────────────────────────────┘
```

### 移动端（小屏）
```
┌──────────────────────────────────┐
│ [← 返回]    [📊][📷][助手]        │
│                                  │
│ 文档标题                          │
└──────────────────────────────────┘
```

**移动端说明**:
- 下载按钮只显示图标（节省空间）
- 计划书助手显示为"助手"

## 技术实现

### 依赖库

```javascript
import * as XLSX from 'xlsx';          // Excel 生成
import html2canvas from 'html2canvas'; // 页面截图
```

### 核心代码

#### 下载现金价值表

```javascript
const handleDownloadCashValueExcel = () => {
  // 1. 解析 table1 数据（支持 JSON 字符串或对象）
  const table1Data = typeof document.table1 === 'string'
    ? JSON.parse(document.table1)
    : document.table1;

  // 2. 提取数据（支持两种格式）
  let tableData = null;
  if (table1Data.surrender_value_table) {
    // 新格式：JSON 对象数组
    tableData = table1Data.surrender_value_table;
  } else if (table1Data.data) {
    // 旧格式：二维数组
    tableData = table1Data.data;
  }

  // 3. 构建 Excel 数据
  const excelData = [];

  // 添加标题和基本信息
  excelData.push([`${document.file_name} - 现金价值表`]);
  excelData.push([]);

  if (table1Data.policy_info) {
    // 添加保单信息
  }

  // 添加表格数据
  // ...

  // 4. 生成并下载 Excel
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(excelData);
  XLSX.utils.book_append_sheet(wb, ws, '现金价值表');
  XLSX.writeFile(wb, fileName);
};
```

#### 下载单页截图

```javascript
const handleDownloadPageScreenshot = async () => {
  // 1. 临时调整固定导航栏
  const topNav = document.querySelector('.sticky.top-0');
  if (topNav) {
    topNav.style.position = 'relative';
  }

  // 2. 截图
  const canvas = await html2canvas(pageRef.current, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#f9fafb',
    scrollY: -window.scrollY,
    scrollX: -window.scrollX
  });

  // 3. 恢复导航栏
  if (topNav) {
    topNav.style.position = originalPosition;
  }

  // 4. 下载图片
  const link = document.createElement('a');
  link.download = `${document.file_name}_详情_${date}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
```

### 页面 Ref

```javascript
const pageRef = useRef(null);

return (
  <div ref={pageRef} className="min-h-screen bg-gray-50">
    {/* 页面内容 */}
  </div>
);
```

## 按钮样式

### 现金价值表按钮（绿色）
```css
bg-gradient-to-r from-green-600 to-emerald-600
```

### 下载单页按钮（紫色）
```css
bg-gradient-to-r from-purple-600 to-pink-600
```

### 禁用状态（灰色）
```css
bg-gray-300 text-gray-500 cursor-not-allowed
```

## 数据格式支持

### table1 数据格式

#### 格式 1：新格式（JSON 对象）
```json
{
  "policy_info": {
    "姓名": "张三",
    "年龄": 30,
    "保险公司名称": "友邦保险",
    "产品名称": "盛世·御享"
  },
  "surrender_value_table": [
    {
      "保单年度": 1,
      "保证现金价值": 1000,
      "非保证现金价值": 500,
      "总现金价值": 1500
    }
  ]
}
```

#### 格式 2：旧格式（二维数组）
```json
{
  "data": [
    ["保单年度", "保证现金价值", "非保证现金价值", "总现金价值"],
    [1, 1000, 500, 1500],
    [2, 2000, 1000, 3000]
  ],
  "fields": ["保单年度", "保证现金价值", "非保证现金价值", "总现金价值"]
}
```

## 错误处理

### 现金价值表下载
- 无 table1 数据 → 按钮禁用
- 数据为空 → 提示"现金价值表数据为空"
- 下载失败 → 提示"下载现金价值表失败，请重试"

### 页面截图
- 页面未准备好 → 提示"页面未准备好"
- 截图失败 → 提示"下载页面截图失败，请重试"

## 文件命名规则

### Excel 文件
```
{文件名}_现金价值表_{YYYY-MM-DD}.xlsx
```

示例：
```
41岁女士法国盛利_II_至尊-50000-5年_现金价值表_2026-02-04.xlsx
```

### PNG 图片
```
{文件名}_详情_{YYYY-MM-DD}.png
```

示例：
```
41岁女士法国盛利_II_至尊-50000-5年_详情_2026-02-04.png
```

## 测试步骤

1. **访问文档详情页**: `/document/253`
2. **测试现金价值表下载**:
   - 查看按钮状态（有数据时可用，无数据时禁用）
   - 点击按钮下载 Excel
   - 打开 Excel 验证数据完整性
3. **测试单页截图**:
   - 点击"下载单页"按钮
   - 验证截图包含完整页面内容
   - 检查导航栏不重复

## 更新状态

- ✅ 代码已更新
- ✅ Vite HMR 已自动生效
- ✅ 无需重启服务
- ✅ 立即可用

## 更新日期

2026-02-04

## 开发者

Claude Code (Anthropic)
