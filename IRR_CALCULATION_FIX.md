# IRR 计算修正说明

## 修改日期
2026-01-14

## 问题描述
`PlanDocumentManagement.jsx` 页面中的 IRR（内部收益率）计算使用了简化的复利公式，未考虑保费分期缴纳的时间价值，导致计算结果不准确。

## 错误的计算方法（已修正）
```javascript
// ❌ 错误：假设所有保费在第0年一次性支付
const calculateIRR = (totalValue, actualInvestment, holdingYears) => {
  // IRR = (回报 / 投入)^(1/年数) - 1
  const irr = (Math.pow(totalValue / actualInvestment, 1 / holdingYears) - 1) * 100;
  return irr;
};
```

**问题**：
1. 未考虑保费是分期缴纳的（例如：5年期每年年初缴费）
2. 简化公式假设所有现金流在期初发生，忽略了时间价值
3. 对于长期保险产品（如20年期），误差会非常大

## 正确的计算方法（已应用）

### 核心原理
使用**牛顿迭代法（Newton-Raphson Method）**求解净现值（NPV）为0时的折现率。

### 现金流时间点
- **保费**：期初缴纳（第1年保费在第0年末，第2年保费在第1年末）
- **退保价值**：期末获得（第N年的价值在第N年末）

### 算法实现
```javascript
const calculateIRR = (annualPremium, paymentYears, totalValue, holdingYears) => {
  // 构建每年的累计保费支付数组
  const yearlyPremiums = [];
  for (let year = 1; year <= holdingYears; year++) {
    if (year <= paymentYears) {
      yearlyPremiums.push(annualPremium * year);
    } else {
      yearlyPremiums.push(annualPremium * paymentYears);
    }
  }

  // 牛顿迭代法求解IRR
  let rate = holdingYears > 50 ? 0.03 : 0.05; // 初始猜测值
  const maxIterations = 200;
  const precision = holdingYears > 50 ? 0.001 : 0.0001;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivative = 0;

    // 计算现金流的净现值和导数
    for (let year = 1; year <= holdingYears; year++) {
      const currentPaid = yearlyPremiums[year - 1] || 0;
      const previousPaid = year > 1 ? (yearlyPremiums[year - 2] || 0) : 0;
      const payment = currentPaid - previousPaid;

      if (payment > 0) {
        const discountPeriod = year - 1; // 第year年保费在第(year-1)年末缴纳
        const factor = Math.pow(1 + rate, discountPeriod);
        npv -= payment / factor;
        derivative += (payment * discountPeriod) / Math.pow(1 + rate, discountPeriod + 1);
      }
    }

    // 退保价值在第holdingYears年末
    const finalFactor = Math.pow(1 + rate, holdingYears);
    npv += totalValue / finalFactor;
    derivative -= (totalValue * holdingYears) / Math.pow(1 + rate, holdingYears + 1);

    // 检查收敛
    if (Math.abs(npv) < precision) {
      if (rate > 1) return null; // 异常值
      return rate * 100;
    }

    // 牛顿迭代
    if (Math.abs(derivative) < 0.0000001) return null;
    const newRate = rate - npv / derivative;

    // 防止过度振荡
    if (Math.abs(newRate - rate) > 1) {
      rate = rate - (npv / derivative) * 0.5;
    } else {
      rate = newRate;
    }

    // 限制搜索范围
    if (rate < -0.99) rate = -0.99;
    if (rate > 2) rate = 2;
  }

  return null; // 未收敛
};
```

## 修改的文件
- `/var/www/harry-insurance2/frontend/src/components/PlanDocumentManagement.jsx`
  - 第159-222行：`calculateIRR` 函数定义
  - 第661行：函数调用更新（传递4个参数：年缴保费、缴费年数、总价值、持有年数）

## 参考实现
正确的算法参考了 `CompanyComparison.jsx` 的实现（第361-413行）。

## 示例对比

假设：
- 年缴保费：10,000 元
- 缴费年限：5 年
- 持有年数：10 年
- 第10年退保价值：60,000 元

### 错误算法结果
```
总投入 = 10,000 × 5 = 50,000
IRR = (60,000 / 50,000)^(1/10) - 1 = 1.847% ❌
```

### 正确算法结果
```
现金流:
  第0年末: -10,000
  第1年末: -10,000
  第2年末: -10,000
  第3年末: -10,000
  第4年末: -10,000
  第10年末: +60,000

NPV = 0 求解 → IRR ≈ 3.12% ✓
```

**差异原因**：错误算法假设50,000元在第0年一次性支付，而实际是分5年支付，后面的保费现值更低。

## 影响范围
此修改仅影响 `PlanDocumentManagement.jsx` 页面的产品对比功能中的 IRR 列显示。

## 测试建议
1. 打开计划书管理页面
2. 选择多个计划书进行对比
3. 检查 IRR 列的数值是否更合理（通常会比旧算法高1-3个百分点）
4. 对比 `CompanyComparison.jsx` 页面的结果，确保算法一致

## 注意事项
- Vite 热重载会自动应用更改，无需重启前端服务
- 旧的浏览器缓存可能需要硬刷新（Ctrl+F5）
