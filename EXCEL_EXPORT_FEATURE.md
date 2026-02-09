# Company Comparison 页面 Excel 导出功能

## 功能说明

在 **Company Comparison**（保险公司对比）页面右上角新增了 **"下载Excel"** 按钮，可以导出完整的对比数据。

## 核心特性

### ✅ 导出所有数据（不进行筛选）

- **与页面显示不同**：页面可能只显示部分年度数据（根据用户筛选），但 Excel 导出会包含所有年度的完整数据
- **数据来源**：使用 `company.allYearData` 而不是 `company.yearData`
- **无筛选条件**：忽略页面上的年度筛选设置，导出所有可用数据

### 📊 导出的数据结构

#### Excel 文件包含以下列：

| 列名 | 说明 |
|------|------|
| 保单年度 | 保单年度（从1开始） |
| 年龄 | 对应的年龄（根据客户起始年龄计算） |
| {公司名} - 已缴保费 | 该公司在该年度的已缴保费 |
| {公司名} - 保证现金价值 | 该公司的保证现金价值 |
| {公司名} - 非保证现金价值 | 该公司的非保证现金价值 |
| {公司名} - 总现金价值 | 该公司的总现金价值（保证+非保证） |

**示例**：如果对比3家公司，Excel会有以下列：
```
保单年度 | 年龄 | 友邦-已缴保费 | 友邦-保证现金价值 | 友邦-非保证现金价值 | 友邦-总现金价值 | 宏利-已缴保费 | ... | 保诚-总现金价值
```

## 技术实现

### 1. 依赖库

- **xlsx** (npm package): 用于生成 Excel 文件

```bash
npm install xlsx --save
```

### 2. 关键代码

**导入库**:
```javascript
import * as XLSX from 'xlsx';
import { FileSpreadsheet } from 'lucide-react';
```

**导出函数** (`handleDownloadExcel`):
```javascript
const handleDownloadExcel = () => {
  // 1. 收集所有年度数据（使用allYearData，包含所有未筛选的数据）
  const allYears = new Set();
  comparisonData.companies.forEach(company => {
    Object.keys(company.allYearData).forEach(year => {
      allYears.add(parseInt(year));
    });
  });
  const sortedYears = Array.from(allYears).sort((a, b) => a - b);

  // 2. 构建Excel数据
  const excelData = [];

  // 添加表头
  const titleRow = ['保单年度', '年龄'];
  comparisonData.companies.forEach(company => {
    titleRow.push(`${company.name} - 已缴保费`);
    titleRow.push(`${company.name} - 保证现金价值`);
    titleRow.push(`${company.name} - 非保证现金价值`);
    titleRow.push(`${company.name} - 总现金价值`);
  });
  excelData.push(titleRow);

  // 添加数据行
  sortedYears.forEach(year => {
    const row = [year, customerAge + year - 1];
    comparisonData.companies.forEach(company => {
      const data = company.allYearData[year]; // 使用allYearData（完整数据）
      if (data) {
        row.push(
          data.premiums_paid !== undefined ? data.premiums_paid : '-',
          data.guaranteed !== undefined ? data.guaranteed : '-',
          data.non_guaranteed !== undefined ? data.non_guaranteed : '-',
          data.total !== undefined ? data.total : '-'
        );
      } else {
        row.push('-', '-', '-', '-');
      }
    });
    excelData.push(row);
  });

  // 3. 创建工作簿
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // 4. 设置列宽
  const colWidths = [
    { wch: 12 }, // 保单年度
    { wch: 10 }  // 年龄
  ];
  comparisonData.companies.forEach(() => {
    colWidths.push({ wch: 15 }); // 已缴保费
    colWidths.push({ wch: 18 }); // 保证现金价值
    colWidths.push({ wch: 18 }); // 非保证现金价值
    colWidths.push({ wch: 18 }); // 总现金价值
  });
  ws['!cols'] = colWidths;

  // 5. 添加工作表并下载
  XLSX.utils.book_append_sheet(wb, ws, '保险公司对比');
  const fileName = `保险公司对比_完整数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
```

### 3. UI 按钮

**按钮位置**：对比页面右上角，介于"下载图片"和"显示项"之间

**按钮样式**：
```jsx
<button
  onClick={handleDownloadExcel}
  className="flex items-center gap-2 px-3 py-2 bg-green-500/90 backdrop-blur-sm rounded-xl hover:bg-green-600/90 transition-all text-sm font-semibold text-white whitespace-nowrap"
  title="下载完整数据（包含所有年度）"
>
  <FileSpreadsheet className="w-4 h-4" />
  <span className="hidden sm:inline">下载Excel</span>
  <span className="sm:hidden">Excel</span>
</button>
```

**特点**：
- 绿色背景（与其他按钮区分）
- 有 tooltip 提示"下载完整数据（包含所有年度）"
- 响应式设计：大屏显示"下载Excel"，小屏显示"Excel"

## 数据说明

### yearData vs allYearData

| 数据源 | 说明 | 用途 |
|--------|------|------|
| `company.yearData` | 根据用户筛选的年度数据 | 页面表格显示 |
| `company.allYearData` | 所有年度的完整数据（未筛选） | Excel 导出 |

**示例**：
- 用户在页面上筛选年度：1,5,10,20,30
- 页面表格只显示这5个年度
- Excel 导出包含所有年度：1,2,3,4,...,98,99,100

### 数据计算

所有数值都根据用户输入的年缴保费按比例计算：

```javascript
const companyPremiumRatio = paymentAmount / companyStandardPremium;
const scaledValue = Math.round(originalValue * companyPremiumRatio);
```

## 文件命名规则

生成的文件名格式：
```
保险公司对比_完整数据_YYYY-MM-DD.xlsx
```

示例：
```
保险公司对比_完整数据_2026-02-04.xlsx
```

## 使用流程

1. 在 Company Comparison 页面选择要对比的公司
2. 点击"开始对比"查看对比表格
3. 点击右上角**绿色的"下载Excel"按钮**
4. Excel 文件自动下载到本地
5. 打开 Excel 查看完整数据

## 注意事项

1. **数据完整性**：Excel 导出包含所有年度数据，文件可能较大
2. **数值格式**：所有数值都是整数（已四舍五入）
3. **空值处理**：如果某年度无数据，显示为 "-"
4. **编码问题**：Excel 使用 UTF-8 编码，中文显示正常

## 故障排查

### 问题1：下载按钮不可见
**原因**：可能是屏幕太小或按钮被隐藏
**解决**：
- 横向滚动查看
- 使用大屏设备

### 问题2：Excel 文件打不开
**原因**：可能是浏览器下载被拦截
**解决**：
- 检查浏览器下载设置
- 允许弹出窗口和下载

### 问题3：数据不完整
**原因**：可能某些公司缺少部分年度数据
**解决**：
- 这是正常现象，对应年度会显示 "-"
- 检查原始数据源是否完整

## 更新日期

2026-02-04

## 开发者

Claude Code (Anthropic)
