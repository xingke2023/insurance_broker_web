import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, FileSpreadsheet, Settings, ArrowLeft } from 'lucide-react';
import { useAppNavigate } from '../hooks/useAppNavigate';
import axios from 'axios';
import * as XLSX from 'xlsx';
import CompanyIconDisplay from './CompanyIconDisplay';

function CompanyComparison2() {
  const onNavigate = useAppNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [customYearsInput, setCustomYearsInput] = useState(() => {
    const defaultValue = '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,30,35,40,45,50,60,70,80,90,100';
    const saved = localStorage.getItem('companyComparison2_customYears');
    return saved || defaultValue;
  });
  const [totalPremiumInput, setTotalPremiumInput] = useState(100000); // 用户输入的总保费

  const comparisonTableRef = React.useRef(null);

  // 风格主题配置 - 固定使用 Google Material 主题
  const currentTheme = 'googleMaterial';

  // 屏幕尺寸检测
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  // 自定义显示列相关状态
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('companyComparison2_visibleColumns');
    if (saved) {
      return JSON.parse(saved);
    }
    // 根据屏幕尺寸设置默认列显示
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return {
      premiumsPaid: true,
      totalCashValue: true,
      simpleReturn: !isMobile,  // 手机端隐藏单利
      irr: !isMobile            // 手机端隐藏IRR
    };
  });

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 保存显示列设置到localStorage
  useEffect(() => {
    localStorage.setItem('companyComparison2_visibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Google Material 主题配置
  const currentThemeConfig = {
    name: 'Google Material',
    pageGradient: 'from-blue-50 via-white to-gray-50',
    headerGradient: 'from-blue-600 to-blue-800',
    cardBg: 'bg-white',
    tableBg: 'bg-gray-50',
    tableHeaderBg: 'from-gray-100 to-gray-200',
    borderColor: 'border-gray-300',
    primaryColor: 'blue',
    textMain: 'text-gray-800',
    textSub: 'text-gray-600',
    inputBg: 'bg-blue-50',
    inputBorder: 'border-blue-200',
  };

  useEffect(() => {
    const originalTitle = document.title;
    document.title = '同产品方案对比';

    fetchProducts();

    return () => {
      document.title = originalTitle;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('companyComparison2_customYears', customYearsInput);
  }, [customYearsInput]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/insurance-products/');
      const data = response.data;

      if (data.status === 'success' && Array.isArray(data.data)) {
        // 只显示有多个方案的产品
        const productsWithMultiplePlans = data.data.filter(product =>
          product.plans && Array.isArray(product.plans) && product.plans.length > 1
        );
        setProducts(productsWithMultiplePlans || []);
        console.log('✅ 加载了', productsWithMultiplePlans.length, '个有多方案的产品');

        // 默认选中"宏摯傳承保障計劃"
        const defaultProduct = productsWithMultiplePlans.find(p =>
          p.product_name && p.product_name.includes('宏摯傳承保障計劃')
        );
        if (defaultProduct) {
          setSelectedProductId(defaultProduct.id);
          // 自动选择该产品的所有缴费方案
          if (defaultProduct.plans) {
            const allPlanIds = defaultProduct.plans.map(plan => plan.id);
            setSelectedPlans(allPlanIds);
          }
          console.log('✅ 默认选中产品:', defaultProduct.product_name);
        }
      } else {
        console.error('❌ API返回格式错误:', data);
        setProducts([]);
      }
    } catch (error) {
      console.error('❌ 获取产品列表失败:', error);
      alert('获取产品列表失败: ' + error.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId) => {
    setSelectedProductId(productId);

    // 自动选择该产品的所有缴费方案
    const product = products.find(p => p.id === productId);
    if (product && product.plans) {
      const allPlanIds = product.plans.map(plan => plan.id);
      setSelectedPlans(allPlanIds);
    } else {
      setSelectedPlans([]);
    }

    setShowComparison(false);
  };

  const handlePlanToggle = (planId) => {
    setSelectedPlans(prev => {
      if (prev.includes(planId)) {
        return prev.filter(id => id !== planId);
      } else {
        return [...prev, planId];
      }
    });
  };

  // 列选择器相关函数
  const handleToggleColumn = (columnName) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnName]: !prev[columnName]
    }));
  };

  const handleSelectAllColumns = () => {
    setVisibleColumns({
      premiumsPaid: true,
      totalCashValue: true,
      simpleReturn: true,
      irr: true
    });
  };

  // 计算IRR（修正版：保费期初缴纳，退保价值期末）
  const calculateIRRFromActualPayments = (yearlyPremiums, totalValue, currentYear) => {
    if (!yearlyPremiums || yearlyPremiums.length === 0 || !totalValue || totalValue <= 0) {
      return null;
    }

    let rate = currentYear > 50 ? 0.03 : 0.05;
    const maxIterations = 200;
    const precision = currentYear > 50 ? 0.001 : 0.0001;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let derivative = 0;

      // 保费在期初缴纳：第1年保费在第0年末，第2年保费在第1年末...
      for (let year = 1; year <= currentYear; year++) {
        const currentPaid = yearlyPremiums[year - 1] || 0;
        const previousPaid = year > 1 ? (yearlyPremiums[year - 2] || 0) : 0;
        const payment = currentPaid - previousPaid;

        if (payment > 0) {
          // 修正：第year年的保费在第(year-1)年末缴纳
          const discountPeriod = year - 1;
          const factor = Math.pow(1 + rate, discountPeriod);
          npv -= payment / factor;
          derivative += (payment * discountPeriod) / Math.pow(1 + rate, discountPeriod + 1);
        }
      }

      // 退保价值在第currentYear年末
      const finalFactor = Math.pow(1 + rate, currentYear);
      npv += totalValue / finalFactor;
      derivative -= (totalValue * currentYear) / Math.pow(1 + rate, currentYear + 1);

      if (Math.abs(npv) < precision) {
        return (rate * 100);
      }

      const newRate = rate - npv / derivative;
      if (isNaN(newRate) || !isFinite(newRate)) {
        return null;
      }

      rate = newRate;
    }

    return null;
  };

  const handleStartComparison = () => {
    if (selectedPlans.length < 1) {
      alert('请选择产品');
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct) return;

    const plansToCompare = selectedProduct.plans.filter(plan =>
      selectedPlans.includes(plan.id)
    );

    // 解析年度
    const years = customYearsInput
      .replace(/，/g, ',')
      .split(',')
      .map(item => item.trim())
      .filter(item => item);

    const parsedYears = new Set();
    years.forEach(input => {
      if (input.includes('-')) {
        const parts = input.split('-').map(p => p.trim()).filter(p => p);
        if (parts.length === 2) {
          const start = parseInt(parts[0]);
          const end = parseInt(parts[1]);
          if (!isNaN(start) && !isNaN(end) && start <= end) {
            for (let year = start; year <= end; year++) {
              parsedYears.add(year);
            }
          }
        }
      } else {
        const year = parseInt(input);
        if (!isNaN(year)) {
          parsedYears.add(year);
        }
      }
    });

    const targetYears = Array.from(parsedYears).sort((a, b) => a - b);

    // 构建对比数据
    const comparisonResult = {
      productName: selectedProduct.product_name,
      companyName: selectedProduct.company.name,
      companyCode: selectedProduct.company.code,
      totalPremiumInput: totalPremiumInput,
      targetYears: targetYears,
      plans: plansToCompare.map(plan => {
        // 解析退保价值表
        let surrenderValueTable = [];
        try {
          const parsed = JSON.parse(plan.surrender_value_table || '[]');
          // 处理可能的嵌套结构 {"standard": [...]} 或直接的数组 [...]
          if (Array.isArray(parsed)) {
            surrenderValueTable = parsed;
          } else if (parsed.standard && Array.isArray(parsed.standard)) {
            surrenderValueTable = parsed.standard;
          } else if (typeof parsed === 'object') {
            // 尝试找到第一个数组值
            const arrayValue = Object.values(parsed).find(v => Array.isArray(v));
            surrenderValueTable = arrayValue || [];
          }
        } catch (e) {
          console.error('解析退保价值表失败:', plan.plan_name, e);
          surrenderValueTable = [];
        }

        // 该方案的年缴保费 = 用户输入的总保费 / 该方案的缴费年期
        const annualPremium = totalPremiumInput / plan.payment_period;
        const totalPremium = totalPremiumInput;

        // 计算缩放比例：该方案的年缴 / 方案原始年缴
        const originalAnnualPremium = parseFloat(plan.annual_premium) || 1;
        const scalingRatio = annualPremium / originalAnnualPremium;

        // 提取各年度数据
        const yearData = {};
        targetYears.forEach(year => {
          const rowData = Array.isArray(surrenderValueTable)
            ? surrenderValueTable.find(row =>
                (row.year === year || row.保单年度 === year || row.policy_year === year)
              )
            : null;

          if (rowData) {
            // 计算已缴保费
            const premiumsPaid = year <= plan.payment_period
              ? annualPremium * year
              : totalPremium;

            // 获取原始退保价值（可能的字段名）
            const originalTotalCashValue = rowData.total_cash_value ||
                                           rowData.total ||
                                           rowData.退保发还金额总额 ||
                                           rowData.surrender_value_after_withdrawal ||
                                           0;

            const originalGuaranteed = rowData.guaranteed_cash_value ||
                                       rowData.guaranteed ||
                                       rowData.保证现金价值 ||
                                       0;

            const originalNonGuaranteed = rowData.non_guaranteed_cash_value ||
                                          rowData.non_guaranteed ||
                                          rowData.terminal_bonus_cash_value ||
                                          rowData.reversionary_bonus_cash_value ||
                                          rowData.非保证现金价值 ||
                                          0;

            // 按比例缩放退保价值
            const totalCashValue = originalTotalCashValue * scalingRatio;
            const guaranteed = originalGuaranteed * scalingRatio;
            const nonGuaranteed = originalNonGuaranteed * scalingRatio;

            // 计算单利（只在缴费期结束后的下一年开始计算）
            const holdingYears = year;
            const simpleReturn = holdingYears > plan.payment_period && totalCashValue && premiumsPaid && holdingYears > 0
              ? ((totalCashValue - premiumsPaid) / premiumsPaid / holdingYears) * 100
              : null;

            // 计算IRR
            let irr = null;
            if (totalCashValue && premiumsPaid) {
              const yearlyPremiums = [];
              for (let y = 1; y <= holdingYears; y++) {
                if (y <= plan.payment_period) {
                  yearlyPremiums.push(annualPremium * y);
                }
              }
              const returnRatio = totalCashValue / premiumsPaid;
              if (returnRatio > 0 && yearlyPremiums.length > 0) {
                irr = calculateIRRFromActualPayments(yearlyPremiums, totalCashValue, holdingYears);
              }
            }

            yearData[year] = {
              premiumsPaid: Math.round(premiumsPaid),
              totalCashValue: Math.round(totalCashValue),
              guaranteed: Math.round(guaranteed),
              nonGuaranteed: Math.round(nonGuaranteed),
              simpleReturn: simpleReturn,
              irr: irr
            };
          } else {
            yearData[year] = null;
          }
        });

        return {
          id: plan.id,
          planName: plan.plan_name || `${plan.payment_period}年缴费`,
          paymentPeriod: plan.payment_period,
          annualPremium: annualPremium,
          totalPremium: totalPremium,
          originalAnnualPremium: originalAnnualPremium,
          scalingRatio: scalingRatio,
          irrRate: plan.irr_rate,
          yearData: yearData
        };
      })
    };

    setComparisonData(comparisonResult);
    setShowComparison(true);
  };

  const exportToExcel = () => {
    if (!comparisonData) return;

    const worksheetData = [];

    // 表头
    worksheetData.push([
      '保单年度',
      ...comparisonData.plans.map(plan => `${plan.planName} - 已缴保费`),
      ...comparisonData.plans.map(plan => `${plan.planName} - 退保价值`),
      ...comparisonData.plans.map(plan => `${plan.planName} - 单利(%)`),
      ...comparisonData.plans.map(plan => `${plan.planName} - IRR(%)`)
    ]);

    // 数据行
    comparisonData.targetYears.forEach(year => {
      const row = [year];

      // 已缴保费
      comparisonData.plans.forEach(plan => {
        const data = plan.yearData[year];
        row.push(data ? data.premiumsPaid : '-');
      });

      // 退保价值
      comparisonData.plans.forEach(plan => {
        const data = plan.yearData[year];
        row.push(data ? data.totalCashValue : '-');
      });

      // 单利
      comparisonData.plans.forEach(plan => {
        const data = plan.yearData[year];
        row.push(data && data.simpleReturn !== null ? data.simpleReturn.toFixed(2) : '-');
      });

      // IRR
      comparisonData.plans.forEach(plan => {
        const data = plan.yearData[year];
        row.push(data && data.irr !== null ? data.irr.toFixed(2) : '-');
      });

      worksheetData.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '方案对比');
    XLSX.writeFile(workbook, `${comparisonData.productName}_方案对比.xlsx`);
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '-';
    return num.toLocaleString('zh-CN');
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentThemeConfig.pageGradient} p-2 md:p-4 transition-colors duration-500`}>
      <div className="max-w-[99%] mx-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : !showComparison ? (
          <div className="space-y-3 md:space-y-6">
            {/* 对比设置和产品选择的组合布局 */}
            <div className="flex flex-col lg:flex-row gap-3 md:gap-6">
              {/* 产品选择 - 左侧或全宽（移动端） */}
              <div className={`${currentThemeConfig.cardBg} rounded-xl md:rounded-2xl shadow-lg p-3 md:p-6 flex-1`}>
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <button
                    onClick={() => onNavigate('/dashboard')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all text-sm font-semibold text-blue-700 border border-blue-200 hover:border-blue-300"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>返回</span>
                  </button>
                  <h2 className={`text-lg md:text-xl font-bold ${currentThemeConfig.textMain} flex-1`}>
                    选择产品（自动对比所有缴费方案）
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                  {products.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product.id)}
                      className={`p-3 md:p-4 rounded-lg border-2 transition-all text-left ${
                        selectedProductId === product.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CompanyIconDisplay
                              iconUrl={product.company.icon}
                              companyName={product.company.name}
                              imgSizeClasses="w-6 h-6"
                            />
                            <span className="text-sm text-gray-600">
                              {product.company.name}
                            </span>
                          </div>
                          <div className="font-semibold text-gray-900 mb-2">
                            {product.product_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {product.plans.length} 个缴费方案
                            {product.plans.length > 0 && (
                              <span className="ml-1">
                                ({product.plans.map(p => `${p.payment_period}年`).join(', ')})
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedProductId === product.id && (
                          <CheckCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 对比设置 - 右侧 */}
              <div className={`${currentThemeConfig.cardBg} rounded-xl md:rounded-2xl shadow-lg p-3 md:p-6 lg:w-96 flex-shrink-0`}>
                {selectedProduct && selectedPlans.length >= 1 && (
                  <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      已选择产品：<span className="font-semibold">{selectedProduct.product_name}</span>
                      <br />
                      将对比该产品的 <span className="font-semibold">{selectedProduct.plans.length} 个缴费方案</span>
                      {selectedProduct.plans.length > 0 && (
                        <span className="ml-1">
                          ({selectedProduct.plans.map(p => `${p.payment_period}年`).join(', ')})
                        </span>
                      )}
                    </p>
                  </div>
                )}
                <div className="space-y-3 md:space-y-4">
                    <div>
                      <label className={`block text-xs md:text-sm font-medium ${currentThemeConfig.textMain} mb-1.5 md:mb-2`}>
                        总保费（美元）
                      </label>
                      <input
                        type="number"
                        value={totalPremiumInput}
                        onChange={(e) => setTotalPremiumInput(Number(e.target.value))}
                        className={`w-full px-3 py-2 md:px-4 md:py-2 text-sm md:text-base ${currentThemeConfig.inputBg} border ${currentThemeConfig.inputBorder} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        placeholder="输入总保费"
                      />
                      <p className="text-xs md:text-sm text-gray-500 mt-1">
                        各方案根据缴费年期自动计算年缴（如1年缴年缴10万，5年缴年缴2万），并按各自比例缩放退保价值
                      </p>
                    </div>

                    <div>
                      <label className={`block text-xs md:text-sm font-medium ${currentThemeConfig.textMain} mb-1.5 md:mb-2`}>
                        对比年度（逗号分隔，支持范围如 1-10）
                      </label>
                      <input
                        type="text"
                        value={customYearsInput}
                        onChange={(e) => setCustomYearsInput(e.target.value)}
                        className={`w-full px-3 py-2 md:px-4 md:py-2 text-sm md:text-base ${currentThemeConfig.inputBg} border ${currentThemeConfig.inputBorder} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        placeholder="例如: 1,5,10,15,20 或 1-10,20,30"
                      />
                    </div>

                    <button
                      onClick={handleStartComparison}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 md:py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold text-sm md:text-base"
                    >
                      开始对比
                    </button>
                  </div>
              </div>
            </div>
          </div>
        ) : (
          /* 对比结果 */
          <div className={`${currentThemeConfig.cardBg} backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border ${currentThemeConfig.borderColor}`}>
            <div className={`bg-gradient-to-r ${currentThemeConfig.headerGradient} px-4 py-4 md:px-6 md:py-6`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="flex-1">
                  <h2 className={`text-lg md:text-2xl font-bold text-white`}>
                    {comparisonData.productName}
                  </h2>
                  <p className={`text-white/90 mt-0.5 md:mt-1 text-xs md:text-base`}>
                    {comparisonData.companyName} | 总保费: {formatNumber(comparisonData.totalPremiumInput)} 港币
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button
                    onClick={() => setShowColumnSelector(true)}
                    className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-lg transition-all text-xs md:text-sm font-semibold whitespace-nowrap"
                  >
                    <Settings className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden sm:inline">自定义显示项</span>
                    <span className="sm:hidden">显示项</span>
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-lg transition-all text-xs md:text-sm font-semibold whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden sm:inline">导出Excel</span>
                    <span className="sm:hidden">导出</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowComparison(false);
                      setSelectedProductId(null);
                      setSelectedPlans([]);
                    }}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-lg transition-all text-xs md:text-sm font-semibold whitespace-nowrap"
                  >
                    返回
                  </button>
                </div>
              </div>
            </div>

            {/* 对比表格 */}
            <div ref={comparisonTableRef} className="overflow-x-auto px-2 md:px-4 pb-4 md:pb-6">
              <table className="w-full border-collapse text-xs md:text-base">
                <thead>
                  <tr className={`bg-gradient-to-r ${currentThemeConfig.tableHeaderBg}`}>
                    <th className="border px-2 py-2 md:px-4 md:py-3 text-left font-semibold">保单年度</th>
                    {comparisonData.plans.map(plan => {
                      const colSpan = Object.values(visibleColumns).filter(v => v).length;
                      return (
                        <th key={plan.id} className="border px-2 py-2 md:px-4 md:py-3 text-center font-semibold" colSpan={colSpan}>
                          <div className="text-sm md:text-base">{plan.planName}</div>
                          <div className="text-xs md:text-sm font-normal text-gray-600 mt-0.5 md:mt-1">
                            年缴: {formatNumber(plan.annualPremium)} 港币
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                  <tr className={`bg-gradient-to-r ${currentThemeConfig.tableHeaderBg} opacity-80`}>
                    <th className="border px-2 py-1.5 md:px-4 md:py-2"></th>
                    {comparisonData.plans.map(plan => (
                      <React.Fragment key={plan.id}>
                        {visibleColumns.premiumsPaid && (
                          <th className="border px-1.5 py-1.5 md:px-2 md:py-2 text-xs">已缴保费</th>
                        )}
                        {visibleColumns.totalCashValue && (
                          <th className="border px-1.5 py-1.5 md:px-2 md:py-2 text-xs">退保价值</th>
                        )}
                        {visibleColumns.simpleReturn && (
                          <th className="border px-1.5 py-1.5 md:px-2 md:py-2 text-xs">单利(%)</th>
                        )}
                        {visibleColumns.irr && (
                          <th className="border px-1.5 py-1.5 md:px-2 md:py-2 text-xs">IRR(%)</th>
                        )}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.targetYears.map(year => (
                    <tr key={year} className="hover:bg-gray-50">
                      <td className="border px-2 py-2 md:px-4 md:py-3 font-semibold text-center">
                        {year}
                      </td>
                      {comparisonData.plans.map(plan => {
                        const data = plan.yearData[year];
                        const visibleColCount = Object.values(visibleColumns).filter(v => v).length;

                        if (!data) {
                          return (
                            <td key={plan.id} colSpan={visibleColCount} className="border px-1.5 py-2 md:px-2 md:py-3 text-center text-gray-400 text-xs md:text-sm">
                              无数据
                            </td>
                          );
                        }
                        return (
                          <React.Fragment key={plan.id}>
                            {visibleColumns.premiumsPaid && (
                              <td className="border px-1.5 py-2 md:px-2 md:py-3 text-right text-xs md:text-sm">
                                {formatNumber(data.premiumsPaid)}
                              </td>
                            )}
                            {visibleColumns.totalCashValue && (
                              <td className="border px-1.5 py-2 md:px-2 md:py-3 text-right text-xs md:text-sm font-semibold text-indigo-700">
                                {formatNumber(data.totalCashValue)}
                              </td>
                            )}
                            {visibleColumns.simpleReturn && (
                              <td className="border px-1.5 py-2 md:px-2 md:py-3 text-right text-xs md:text-sm font-bold text-purple-600">
                                {data.simpleReturn !== null ? `${data.simpleReturn.toFixed(2)}%` : '-'}
                              </td>
                            )}
                            {visibleColumns.irr && (
                              <td className="border px-1.5 py-2 md:px-2 md:py-3 text-right text-xs md:text-sm font-bold text-green-600">
                                {data.irr !== null ? `${data.irr.toFixed(2)}%` : '-'}
                              </td>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 方案汇总 */}
            <div className="mt-4 md:mt-6 px-2 md:px-4 pb-2 md:pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {comparisonData.plans.map(plan => (
                <div key={plan.id} className="border rounded-lg p-3 md:p-4 bg-gray-50">
                  <h3 className="font-semibold text-base md:text-lg mb-2 md:mb-3">{plan.planName}</h3>
                  <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">缴费年期:</span>
                      <span className="font-semibold">{plan.paymentPeriod}年</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">年缴保费:</span>
                      <span className="font-semibold">{formatNumber(plan.annualPremium)} 港币</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">总保费:</span>
                      <span className="font-semibold">{formatNumber(plan.totalPremium)} 港币</span>
                    </div>
                    {plan.irrRate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">预期IRR:</span>
                        <span className="font-semibold text-blue-600">{plan.irrRate}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 列选择器模态框 */}
            {showColumnSelector && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                  {/* 标题栏 */}
                  <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-2 flex items-center justify-between">
                    <div className="w-8"></div>
                    <h3 className="text-base font-bold text-white text-center flex-1">自定义显示项</h3>
                    <button
                      onClick={() => setShowColumnSelector(false)}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-all"
                      aria-label="关闭"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* 操作按钮栏 */}
                  <div className="px-3 py-1.5 bg-gray-50 flex items-center justify-between gap-2 border-b border-gray-200">
                    <button
                      onClick={handleSelectAllColumns}
                      className="px-2.5 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-xs font-semibold"
                    >
                      全选
                    </button>
                    <div className="text-xs text-gray-600">
                      已选择 <span className="font-bold text-indigo-600">{Object.values(visibleColumns).filter(v => v).length}</span> / 4 项
                    </div>
                  </div>

                  {/* 列选项 */}
                  <div className="p-2.5 space-y-2">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2.5 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.premiumsPaid}
                          onChange={() => handleToggleColumn('premiumsPaid')}
                          className="w-4 h-4 rounded text-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">已缴保费</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.totalCashValue}
                          onChange={() => handleToggleColumn('totalCashValue')}
                          className="w-4 h-4 rounded text-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">退保价值</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.simpleReturn}
                          onChange={() => handleToggleColumn('simpleReturn')}
                          className="w-4 h-4 rounded text-purple-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">单利(%)</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.irr}
                          onChange={() => handleToggleColumn('irr')}
                          className="w-4 h-4 rounded text-green-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">IRR(%)</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CompanyComparison2;
