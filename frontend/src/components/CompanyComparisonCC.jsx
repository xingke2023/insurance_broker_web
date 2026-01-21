import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, GitCompare, Loader2, CheckCircle, Printer, Download, Check, Palette, ChevronDown } from 'lucide-react';
import { useAppNavigate } from '../hooks/useAppNavigate';
import axios from 'axios';
import html2canvas from 'html2canvas';
import CompanyIconDisplay from './CompanyIconDisplay';
import Calculator from './Calculator';

function CompanyComparisonCC() {
  const onNavigate = useAppNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [customAgesInput, setCustomAgesInput] = useState(() => {
    // 从localStorage读取保存的自定义年度
    const saved = localStorage.getItem('customAgesInput');
    return saved || '1,2,3,4,5,6,7,8,9,10,15,20,25,30,35,40,60,80,100';
  });
  const [useCustomAges, setUseCustomAges] = useState(() => {
    // 从localStorage读取是否使用自定义年度
    const saved = localStorage.getItem('useCustomAges');
    return saved !== null ? saved === 'true' : true;
  });
  const [annualPremium] = useState(10000); // 假设年缴保费

  // 演示用客户信息
  const [customerAge, setCustomerAge] = useState(20);
  const [customerGender, setCustomerGender] = useState('male');
  const [paymentAmount, setPaymentAmount] = useState(10000);
  const [paymentYears, setPaymentYears] = useState(5); // 缴费年限

  const comparisonTableRef = useRef(null); // 用于截图的ref

  // 风格主题配置
  const [currentTheme, setCurrentTheme] = useState('googleMaterial'); // classic, modern, dark, fresh, tech, luxury, googleMaterial
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // 屏幕尺寸检测（用于响应式紧凑模式）
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  // 计算器相关状态
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorField, setCalculatorField] = useState(null); // 'age' or 'premium'

  // 产品选择相关状态
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [currentCompanyForSelection, setCurrentCompanyForSelection] = useState(null);
  const [selectedProductsByCompany, setSelectedProductsByCompany] = useState({}); // {companyId: [productId1, productId2]}
  const [tempSelectedProducts, setTempSelectedProducts] = useState([]); // 临时选择的产品ID列表

  // 年份选择器相关状态
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [selectedYears, setSelectedYears] = useState(() => {
    // 从customAgesInput解析出已选年份
    return customAgesInput.split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y));
  });
  const availableYears = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 60, 80, 100];
  const [yearRangeInput, setYearRangeInput] = useState(''); // 范围输入框的值

  // 自定义显示列相关状态
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('visibleColumns');
    if (saved) {
      return JSON.parse(saved);
    }
    // 根据屏幕尺寸设置默认列显示
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return {
      guaranteed: false,
      nonGuaranteed: false,
      total: true,
      simpleReturn: !isMobile,  // 手机端隐藏单利
      irr: !isMobile,           // 手机端隐藏IRR
      breakEven: true,          // 回本期标记
      highlightBest: true       // 按年度最优
    };
  });

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileScreen(window.innerWidth < 768); // md breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const themes = {
    classic: {
      name: '经典商务',
      pageGradient: 'from-slate-50 via-blue-50 to-indigo-100',
      headerGradient: 'from-blue-600 via-indigo-600 to-purple-600',
      cardBg: 'bg-white/95',
      tableBg: 'bg-gradient-to-b from-gray-50 to-white',
      tableHeaderBg: 'from-blue-50 to-indigo-50',
      tableSubHeaderBg: 'from-slate-50 to-gray-50',
      borderColor: 'border-indigo-200',
      primaryColor: 'blue',
      accentColor: 'indigo',
      textMain: 'text-gray-900',
      textSub: 'text-gray-600',
      textTableHead: 'text-gray-800',
      inputBg: 'bg-white',
      inputBorder: 'border-gray-200',
    },
    modern: {
      name: '现代简约',
      pageGradient: 'from-gray-50 via-slate-50 to-zinc-100',
      headerGradient: 'from-gray-800 via-slate-700 to-zinc-700',
      cardBg: 'bg-white',
      tableBg: 'bg-white',
      tableHeaderBg: 'from-gray-100 to-slate-100',
      tableSubHeaderBg: 'from-gray-50 to-slate-50',
      borderColor: 'border-gray-300',
      primaryColor: 'gray',
      accentColor: 'slate',
      textMain: 'text-gray-900',
      textSub: 'text-gray-500',
      textTableHead: 'text-gray-700',
      inputBg: 'bg-gray-50',
      inputBorder: 'border-gray-300',
    },
    luxury: {
      name: '黑金奢华',
      pageGradient: 'from-zinc-900 via-neutral-900 to-black',
      headerGradient: 'from-amber-700 via-yellow-600 to-orange-700',
      cardBg: 'bg-zinc-800/95',
      tableBg: 'bg-gradient-to-b from-zinc-800 to-stone-900',
      tableHeaderBg: 'from-amber-900/30 to-yellow-900/30',
      tableSubHeaderBg: 'from-zinc-800 to-stone-800',
      borderColor: 'border-amber-700/30',
      primaryColor: 'amber',
      accentColor: 'yellow',
      textMain: 'text-yellow-50',
      textSub: 'text-yellow-200/70',
      textTableHead: 'text-amber-100',
      inputBg: 'bg-zinc-700',
      inputBorder: 'border-amber-700/50',
    },
    fresh: {
      name: '清新活力',
      pageGradient: 'from-emerald-50 via-teal-50 to-cyan-100',
      headerGradient: 'from-emerald-600 via-teal-600 to-cyan-600',
      cardBg: 'bg-white/95',
      tableBg: 'bg-gradient-to-b from-emerald-50 to-teal-50',
      tableHeaderBg: 'from-emerald-100 to-teal-100',
      tableSubHeaderBg: 'from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-300',
      primaryColor: 'emerald',
      accentColor: 'teal',
      textMain: 'text-gray-900',
      textSub: 'text-emerald-700',
      textTableHead: 'text-teal-800',
      inputBg: 'bg-white',
      inputBorder: 'border-emerald-200',
    },
    googleMaterial: {
      name: 'Google Material',
      pageGradient: 'from-blue-50 via-white to-gray-50',
      headerGradient: 'from-blue-600 to-blue-800',
      cardBg: 'bg-white',
      tableBg: 'bg-gray-50',
      tableHeaderBg: 'from-gray-100 to-gray-200',
      tableSubHeaderBg: 'from-gray-50 to-gray-100',
      borderColor: 'border-gray-300',
      primaryColor: 'blue',
      accentColor: 'indigo',
      textMain: 'text-gray-800',
      textSub: 'text-gray-600',
      textTableHead: 'text-gray-800',
      inputBg: 'bg-blue-50',
      inputBorder: 'border-blue-200',
    },
  };

  const currentThemeConfig = themes[currentTheme];

  useEffect(() => {
    // 设置页面标题
    const originalTitle = document.title;
    document.title = '港險儲蓄分紅型產品收益統計';

    fetchCompanies();

    // 组件卸载时恢复原标题
    return () => {
      document.title = originalTitle;
    };
  }, []);

  // 保存自定义年度到localStorage
  useEffect(() => {
    localStorage.setItem('customAgesInput', customAgesInput);
  }, [customAgesInput]);

  // 保存是否使用自定义年度到localStorage
  useEffect(() => {
    localStorage.setItem('useCustomAges', useCustomAges.toString());
  }, [useCustomAges]);

  // 保存显示列设置到localStorage
  useEffect(() => {
    localStorage.setItem('visibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // 当勾选回本期标记时，自动添加1-10年到显示年度
  useEffect(() => {
    if (visibleColumns.breakEven) {
      // 解析当前已有的年份
      const currentYears = customAgesInput
        .split(',')
        .map(y => parseInt(y.trim()))
        .filter(y => !isNaN(y));

      // 添加1-10年
      const yearsToAdd = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const mergedYears = [...new Set([...currentYears, ...yearsToAdd])].sort((a, b) => a - b);

      // 更新输入框
      const newAgesInput = mergedYears.join(',');
      if (newAgesInput !== customAgesInput) {
        setCustomAgesInput(newAgesInput);
        setUseCustomAges(true); // 自动启用自定义年度
      }
    }
  }, [visibleColumns.breakEven]);

  const fetchCompanies = async (paymentPeriod = paymentYears) => {
    setLoading(true);
    try {
      // 获取用户的产品设置
      const token = localStorage.getItem('access_token');
      let selectedProductIds = [];

      if (token) {
        try {
          const settingsResponse = await axios.get('/api/user/product-comparison-settings', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          selectedProductIds = settingsResponse.data.selected_products || [];
        } catch (err) {
          console.log('未获取到用户产品设置，将显示所有产品');
        }
      }

      // 获取公司列表，传递用户选择的产品ID
      const response = await axios.get('/api/insurance-companies/standard-comparison/', {
        params: {
          payment_period: paymentPeriod,
          selected_product_ids: selectedProductIds.length > 0 ? selectedProductIds.join(',') : undefined
        }
      });
      const data = response.data;

      if (data.status === 'success') {
        setCompanies(data.data || []);
        // 更新缴费年限状态（如果后端返回了）
        if (data.payment_period) {
          setPaymentYears(data.payment_period);
        }
      }
    } catch (error) {
      console.error('获取保险公司列表失败:', error);
      alert('获取保险公司列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理缴费年限变化
  const handlePaymentYearsChange = (years) => {
    setPaymentYears(years);
    // 如果缴费年限为1年或2年，默认设置年缴保费为100000
    if (years === 1 || years === 2) {
      setPaymentAmount(100000);
    } else if (paymentAmount === 100000) {
      // 如果之前是1-2年期的100000，切换到其他年限时恢复为10000
      setPaymentAmount(10000);
    }
    setSelectedIds([]); // 清空已选择的公司
    setSelectedProductsByCompany({}); // 清空已选择的产品
    fetchCompanies(years); // 重新获取数据
  };

  const handleSelectOne = (id) => {
    const company = companies.find(c => c.id === id);
    if (!company.has_data) return;

    // 如果已经选择过产品，则取消选择
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
      setSelectedProductsByCompany(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      return;
    }

    // 如果公司有多个产品，弹出产品选择对话框
    if (company.has_multiple_products && company.products && company.products.length > 1) {
      setCurrentCompanyForSelection(company);
      // 初始化临时选择（如果之前选过，则恢复）
      setTempSelectedProducts(selectedProductsByCompany[id] || []);
      setShowProductSelector(true);
      return;
    }

    // 单一产品，直接选中
    if (company.products && company.products.length === 1) {
      setSelectedIds(prev => [...prev, id]);
      setSelectedProductsByCompany(prev => ({
        ...prev,
        [id]: [company.products[0].product_id]
      }));
    }
  };

  // 处理产品多选（复选框）
  const handleProductToggle = (productId) => {
    setTempSelectedProducts(prev => {
      const newSelection = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];

      // 检查是否选中了所有产品
      const company = currentCompanyForSelection;
      const allProductIds = company.products.map(p => p.product_id);

      if (newSelection.length === allProductIds.length && allProductIds.every(id => newSelection.includes(id))) {
        // 选中了所有产品，自动确认
        setTimeout(() => {
          setSelectedProductsByCompany(prevState => ({
            ...prevState,
            [company.id]: newSelection
          }));

          if (!selectedIds.includes(company.id)) {
            setSelectedIds(prevIds => [...prevIds, company.id]);
          }

          setShowProductSelector(false);
          setCurrentCompanyForSelection(null);
          setTempSelectedProducts([]);
        }, 100);
      }

      return newSelection;
    });
  };

  // 确认产品选择
  const handleConfirmProductSelection = () => {
    if (tempSelectedProducts.length === 0) {
      alert('请至少选择一个产品');
      return;
    }

    const company = currentCompanyForSelection;

    // 保存选中的产品
    setSelectedProductsByCompany(prev => ({
      ...prev,
      [company.id]: tempSelectedProducts
    }));

    // 添加公司到选中列表
    if (!selectedIds.includes(company.id)) {
      setSelectedIds(prev => [...prev, company.id]);
    }

    // 关闭对话框
    setShowProductSelector(false);
    setCurrentCompanyForSelection(null);
    setTempSelectedProducts([]);
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
        if (rate > 1) return null;
        return rate * 100;
      }

      if (Math.abs(derivative) < 0.0000001) return null;

      const newRate = rate - npv / derivative;
      if (Math.abs(newRate - rate) > 1) {
        rate = rate - (npv / derivative) * 0.5;
      } else {
        rate = newRate;
      }

      if (rate < -0.99) rate = -0.99;
      if (rate > 2) rate = 2;
    }
    return null;
  };

  // 格式化数字显示（紧凑模式 - 显示完整数字，不带千分位）
  const formatCompactNumber = (num) => {
    if (!num || num === 0) return '0';
    // 紧凑模式：显示完整数字，不使用千分位逗号（节省空间）
    return Math.round(num).toString();
  };

  const handleCompareCompanies = () => {
    if (selectedIds.length === 0) {
      alert('请先选择要对比的保险公司');
      return;
    }
    if (paymentAmount < 2000) {
      alert('年缴保费最低为2000元');
      return;
    }

    // 展开选中的产品，构建对比数据
    const expandedCompanies = [];
    selectedIds.forEach(companyId => {
      const company = companies.find(c => c.id === companyId);
      if (!company || !company.has_data) return;

      const selectedProductIds = selectedProductsByCompany[companyId] || [];
      if (selectedProductIds.length === 0) return;

      // 为每个选中的产品创建一个对比项
      selectedProductIds.forEach(productId => {
        const product = company.products.find(p => p.product_id === productId);
        if (product && product.standard_data) {
          expandedCompanies.push({
            id: `${companyId}_${productId}`, // 组合ID
            company_id: companyId,
            product_id: productId,
            name: company.name,
            icon: company.icon,
            flagship_product: product.product_name,
            standard_data: product.standard_data
          });
        }
      });
    });

    if (expandedCompanies.length === 0) {
      alert('没有有效的产品数据可供对比');
      return;
    }

    // 如果回本期已经被勾选，合并1-10年
    if (visibleColumns.breakEven) {
      const currentYears = customAgesInput
        .split(',')
        .map(y => parseInt(y.trim()))
        .filter(y => !isNaN(y));

      const yearsToAdd = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const mergedYears = [...new Set([...currentYears, ...yearsToAdd])].sort((a, b) => a - b);

      const newAgesInput = mergedYears.join(',');
      if (newAgesInput !== customAgesInput) {
        setCustomAgesInput(newAgesInput);
        setUseCustomAges(true);
      }
    }

    let allYears = new Set();
    expandedCompanies.forEach(company => {
      const years = company.standard_data?.standard || [];
      years.forEach(y => {
        if (y.policy_year) allYears.add(y.policy_year);
      });
    });

    const sortedYears = Array.from(allYears).sort((a, b) => a - b);
    let targetYears;

    if (useCustomAges && customAgesInput.trim()) {
      const inputs = customAgesInput
        .replace(/，/g, ',')
        .split(',')
        .map(item => item.trim())
        .filter(item => item);

      const customYears = new Set();
      inputs.forEach(input => {
        // 检查是否为范围格式 (例如: "1-9" 或 "1 - 6" 或 "1  -  6")
        if (input.includes('-')) {
          const parts = input.split('-').map(p => p.trim()).filter(p => p);
          if (parts.length === 2) {
            const start = parseInt(parts[0]);
            const end = parseInt(parts[1]);
            if (!isNaN(start) && !isNaN(end) && start <= end) {
              // 展开范围内的所有年度
              for (let year = start; year <= end; year++) {
                if (allYears.has(year)) {
                  customYears.add(year);
                }
              }
            }
          }
        } else {
          // 单个年度
          const year = parseInt(input);
          if (!isNaN(year) && allYears.has(year)) {
            customYears.add(year);
          }
        }
      });

      targetYears = Array.from(customYears).sort((a, b) => a - b);
      if (targetYears.length === 0) {
        alert('输入的年度在数据中没有对应数据，请检查输入');
        return;
      }
    } else {
      const defaultYears = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 60, 80, 100];
      targetYears = sortedYears.filter(year => defaultYears.includes(year));
      if (targetYears.length === 0) {
        targetYears = sortedYears.filter((year, index, arr) => {
          if (index === 0 || index === arr.length - 1) return true;
          return year % 5 === 0;
        }).slice(0, 20);
      }
    }

    const comparison = expandedCompanies.map(company => {
      const years = company.standard_data?.standard || [];

      // ✅ 关键修改：每个公司用自己的标准保费计算比例
      // 而不是用第一个公司的标准保费
      const companyStandardPremium = years[0]?.premiums_paid || 10000;
      const companyPremiumRatio = paymentAmount / companyStandardPremium;

      const yearData = {};
      const allYearData = {};

      targetYears.forEach(targetYear => {
        const data = years.find(y => y.policy_year === targetYear);
        if (data) {
          yearData[targetYear] = {
            guaranteed: Math.round(data.guaranteed * companyPremiumRatio),
            non_guaranteed: Math.round(data.non_guaranteed * companyPremiumRatio),
            total: Math.round(data.total * companyPremiumRatio),
            premiums_paid: Math.round(data.premiums_paid * companyPremiumRatio)
          };
        } else {
          yearData[targetYear] = {
            guaranteed: undefined,
            non_guaranteed: undefined,
            total: undefined,
            premiums_paid: undefined
          };
        }
      });

      years.forEach(yearItem => {
        const year = yearItem.policy_year;
        allYearData[year] = {
          guaranteed: Math.round(yearItem.guaranteed * companyPremiumRatio),
          non_guaranteed: Math.round(yearItem.non_guaranteed * companyPremiumRatio),
          total: Math.round(yearItem.total * companyPremiumRatio),
          premiums_paid: Math.round(yearItem.premiums_paid * companyPremiumRatio)
        };
      });

      return {
        id: company.id,
        name: company.name,
        icon: company.icon,
        flagship_product: company.flagship_product,
        yearData,
        allYearData
      };
    });

    setComparisonData({
      companies: comparison,
      targetYears,
      allYears: sortedYears
    });
    setShowComparison(true);
  };

  const handlePrint = () => window.print();

  // 处理年份选择
  const handleYearToggle = (year) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) {
        return prev.filter(y => y !== year);
      } else {
        return [...prev, year].sort((a, b) => a - b);
      }
    });
  };

  // 全选年份
  const handleSelectAllYears = () => {
    setSelectedYears([...availableYears]);
  };

  // 清空年份
  const handleClearAllYears = () => {
    setSelectedYears([]);
  };

  // 应用范围选择
  const handleApplyYearRange = () => {
    if (!yearRangeInput.trim()) {
      alert('请输入年度范围，例如：1-4 或 1-4,10,20-25');
      return;
    }

    // 先将中文逗号替换为英文逗号，然后按逗号分割
    const inputs = yearRangeInput
      .replace(/，/g, ',')
      .split(',')
      .map(item => item.trim())
      .filter(item => item);

    const yearsToAdd = new Set();
    inputs.forEach(input => {
      // 检查是否为范围格式 (例如: "1-9" 或 "1 - 6" 或 "1  -  6")
      if (input.includes('-')) {
        const parts = input.split('-').map(p => p.trim()).filter(p => p);
        if (parts.length === 2) {
          const start = parseInt(parts[0]);
          const end = parseInt(parts[1]);
          if (!isNaN(start) && !isNaN(end) && start <= end) {
            // 展开范围内的所有年度
            for (let year = start; year <= end; year++) {
              if (availableYears.includes(year)) {
                yearsToAdd.add(year);
              }
            }
          }
        }
      } else {
        // 单个年度
        const year = parseInt(input);
        if (!isNaN(year) && availableYears.includes(year)) {
          yearsToAdd.add(year);
        }
      }
    });

    if (yearsToAdd.size === 0) {
      alert('输入的年度不在可选范围内，请检查输入');
      return;
    }

    // 合并到已选年份（不重复）
    setSelectedYears(prev => {
      const merged = new Set([...prev, ...yearsToAdd]);
      return Array.from(merged).sort((a, b) => a - b);
    });

    // 清空输入框
    setYearRangeInput('');
  };

  // 确认选择年份
  const handleConfirmYears = () => {
    if (selectedYears.length === 0) {
      alert('请至少选择一个年度');
      return;
    }
    setCustomAgesInput(selectedYears.join(','));
    setShowYearSelector(false);
  };

  // 打开年份选择器
  const handleOpenYearSelector = () => {
    // 同步当前输入框的值到选择器，支持解析范围格式（如 "1-5" 或 "1 - 5"）
    const inputs = customAgesInput
      .replace(/，/g, ',')
      .split(',')
      .map(item => item.trim())
      .filter(item => item);

    const parsedYears = new Set();
    inputs.forEach(input => {
      // 检查是否为范围格式 (例如: "1-9" 或 "1 - 6" 或 "1  -  6")
      if (input.includes('-')) {
        const parts = input.split('-').map(p => p.trim()).filter(p => p);
        if (parts.length === 2) {
          const start = parseInt(parts[0]);
          const end = parseInt(parts[1]);
          if (!isNaN(start) && !isNaN(end) && start <= end) {
            // 展开范围内的所有年度
            for (let year = start; year <= end; year++) {
              if (availableYears.includes(year)) {
                parsedYears.add(year);
              }
            }
          }
        }
      } else {
        // 单个年度
        const year = parseInt(input);
        if (!isNaN(year) && availableYears.includes(year)) {
          parsedYears.add(year);
        }
      }
    });

    setSelectedYears(Array.from(parsedYears).sort((a, b) => a - b));
    setShowYearSelector(true);
  };

  // 切换列显示
  const handleToggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  // 全选列
  const handleSelectAllColumns = () => {
    setVisibleColumns({
      guaranteed: true,
      nonGuaranteed: true,
      total: true,
      simpleReturn: true,
      irr: true,
      breakEven: true,
      highlightBest: true
    });
  };

  // 计算显示的列数（排除breakEven和highlightBest，因为它们不是实际的列）
  const getVisibleColumnCount = () => {
    const { breakEven, highlightBest, ...actualColumns } = visibleColumns;
    return Object.values(actualColumns).filter(v => v).length;
  };

  const handleDownloadImage = async () => {
    if (!comparisonTableRef.current) return;
    try {
      // 隐藏按钮栏
      const buttonBar = comparisonTableRef.current.querySelector('.print\\:hidden');
      if (buttonBar) {
        buttonBar.style.display = 'none';
      }

      const canvas = await html2canvas(comparisonTableRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: currentTheme === 'luxury' ? '#18181b' : '#ffffff'
      });

      // 恢复按钮栏显示
      if (buttonBar) {
        buttonBar.style.display = '';
      }

      const link = document.createElement('a');
      link.download = `保险公司对比_${new Date().toLocaleDateString('zh-CN')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('下载图片失败:', error);
      alert('下载图片失败，请重试');

      // 确保恢复按钮栏显示
      const buttonBar = comparisonTableRef.current?.querySelector('.print\\:hidden');
      if (buttonBar) {
        buttonBar.style.display = '';
      }
    }
  };

  // 主题切换菜单
  const ThemeSelector = () => (
    <div className="relative">
      <button
        onClick={() => setShowThemeMenu(!showThemeMenu)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.3)] transition-all text-gray-900 border-2 border-indigo-200/50 hover:scale-[1.02] hover:border-indigo-300"
      >
        <Palette className="w-5 h-5 text-indigo-600" />
        <span className="hidden sm:inline font-semibold">风格: {themes[currentTheme].name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showThemeMenu ? 'rotate-180' : ''}`} />
      </button>

      {showThemeMenu && (
        <div className="absolute right-0 top-full mt-2 w-52 py-2 bg-white/98 backdrop-blur-2xl rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.2)] border-2 border-indigo-200/50 z-50 overflow-hidden">
          {Object.entries(themes).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => {
                setCurrentTheme(key);
                setShowThemeMenu(false);
              }}
              className={`w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-3 transition-all ${currentTheme === key ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-bold shadow-inner border-l-4 border-indigo-600' : 'text-gray-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${theme.headerGradient} shadow-lg ring-2 ring-white`}></div>
              <span>{theme.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // 如果正在查看对比
  if (showComparison && comparisonData) {
    // 根据公司数量和屏幕尺寸判断是否使用紧凑模式
    const companyCount = comparisonData.companies.length;
    const isCompactMode = companyCount >= 3 || isMobileScreen;

    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentThemeConfig.pageGradient} p-2 md:p-4 transition-colors duration-500`}>
        <div className="max-w-[99%] mx-auto">
          {/* 对比表格 */}
          <div ref={comparisonTableRef} className={`${currentThemeConfig.cardBg} backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border ${currentThemeConfig.borderColor}`}>
            {/* 标题栏 */}
            <div className={`bg-gradient-to-r ${currentThemeConfig.headerGradient} px-6 py-6`}>
              {/* 顶部按钮栏 */}
              <div className="mb-4 flex items-center justify-between gap-2 print:hidden overflow-x-auto">
                <button
                  onClick={() => setShowComparison(false)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all text-sm font-semibold text-white whitespace-nowrap flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">返回列表</span>
                  <span className="sm:hidden">返回</span>
                </button>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all text-sm font-semibold text-white whitespace-nowrap"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">打印</span>
                  </button>
                  <button
                    onClick={handleDownloadImage}
                    className="flex items-center gap-2 px-3 py-2 bg-white/30 backdrop-blur-sm rounded-xl hover:bg-white/40 transition-all text-sm font-semibold text-white whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">下载</span>
                  </button>
                  <button
                    onClick={() => setShowColumnSelector(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all text-sm font-semibold text-white whitespace-nowrap"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    <span className="hidden sm:inline">显示项</span>
                  </button>
                  <a
                    href="https://work.weixin.qq.com/kfid/kfcdfdb02ed73c8e4d0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all text-sm font-semibold text-white whitespace-nowrap"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="hidden sm:inline">联系保险顾问</span>
                    <span className="sm:hidden">咨询</span>
                  </a>
                </div>
              </div>

              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-wide text-center" style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif", textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>港險主打儲蓄分紅型產品按年度收益統計表</h2>

              {/* 客户信息展示 */}
              <div className="mt-4">
                <div className="flex items-center justify-center">
                  <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-md text-white max-w-4xl">
                    <span className="text-white/80 text-[10px] whitespace-nowrap">客户年龄</span>
                    <span className="text-white text-xs font-semibold whitespace-nowrap">{customerAge} 岁</span>
                    <span className="text-white/40 hidden sm:inline">|</span>
                    <span className="text-white/80 text-[10px] whitespace-nowrap">性别</span>
                    <span className="text-white text-xs font-semibold whitespace-nowrap">{customerGender === 'male' ? '男' : '女'}</span>
                    <span className="text-white/40 hidden sm:inline">|</span>
                    <span className="text-white/80 text-[10px] whitespace-nowrap">年缴保费</span>
                    <span className="text-white text-xs font-semibold whitespace-nowrap">{paymentAmount.toLocaleString('zh-CN')} 元</span>
                    <span className="text-white/40 hidden sm:inline">|</span>
                    <span className="text-white/80 text-[10px] whitespace-nowrap">缴费年限</span>
                    <span className="text-white text-xs font-semibold whitespace-nowrap">{paymentYears} 年</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-2 md:p-3 overflow-x-auto ${currentThemeConfig.tableBg}`}>
              <table className={`w-full min-w-max shadow-sm ${isCompactMode ? 'text-xs' : 'text-sm'}`}>
                <thead>
                  <tr className={`border-b-2 ${currentThemeConfig.borderColor} bg-gradient-to-r ${currentThemeConfig.tableHeaderBg}`}>
                    <th className={`${isCompactMode ? 'px-0.5 py-1.5' : 'px-1 py-3'} text-center ${isCompactMode ? 'text-sm' : 'text-base'} font-bold ${currentThemeConfig.textTableHead} sticky left-0 bg-gradient-to-r ${currentThemeConfig.tableHeaderBg} z-10 border-r-2 ${currentThemeConfig.borderColor}`} style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>
                      <div className="leading-tight">
                        <div>保单</div>
                        <div>年度</div>
                        <div>终结</div>
                      </div>
                    </th>
                    <th className={`${isCompactMode ? 'px-0.5 py-1.5' : 'px-1 py-3'} text-center ${isCompactMode ? 'text-sm' : 'text-base'} font-bold ${currentThemeConfig.textTableHead} bg-gradient-to-r ${currentThemeConfig.tableHeaderBg} border-r-2 ${currentThemeConfig.borderColor}`} style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>
                      <div className="leading-tight">
                        <div>客户</div>
                        <div>年龄</div>
                      </div>
                    </th>
                    <th className={`${isCompactMode ? 'px-1 py-1.5' : 'px-2 py-3'} text-center ${isCompactMode ? 'text-sm' : 'text-base'} font-bold ${currentThemeConfig.textTableHead} bg-gradient-to-r ${currentThemeConfig.tableHeaderBg} border-r-2 ${currentThemeConfig.borderColor}`} style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>
                      <div className="leading-tight">已缴保费</div>
                    </th>
                    {comparisonData.companies.map((company, index) => (
                      <th key={company.id} className={`${isCompactMode ? 'px-1 py-1.5' : 'px-2 py-3'} text-center bg-gradient-to-r ${currentThemeConfig.tableHeaderBg} ${index < comparisonData.companies.length - 1 ? `border-r-2 ${currentThemeConfig.borderColor}` : ''}`} colSpan={getVisibleColumnCount()}>
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className={`${isCompactMode ? 'text-sm' : 'text-lg'} font-bold truncate ${currentThemeConfig.textTableHead} ${isCompactMode ? 'max-w-[100px]' : 'max-w-[150px]'}`} title={company.name} style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>{company.name}</div>
                          {company.flagship_product && (
                            <div className={`${isCompactMode ? 'text-[10px]' : 'text-sm'} ${currentTheme === 'luxury' ? 'text-amber-300' : 'text-blue-600'} font-medium line-clamp-1 ${isCompactMode ? 'max-w-[80px]' : 'max-w-[140px]'} px-1`} style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }} title={company.flagship_product}>
                              {company.flagship_product}
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                  <tr className={`border-b-2 ${currentThemeConfig.borderColor} bg-gradient-to-r ${currentThemeConfig.tableSubHeaderBg}`}>
                    <th className={`${isCompactMode ? 'px-0.5 py-1' : 'px-1 py-2'} text-center text-xs font-medium sticky left-0 bg-gradient-to-r ${currentThemeConfig.tableSubHeaderBg} z-10 border-r-2 ${currentThemeConfig.borderColor}`}></th>
                    <th className={`${isCompactMode ? 'px-0.5 py-1' : 'px-1 py-2'} text-center text-xs font-medium bg-gradient-to-r ${currentThemeConfig.tableSubHeaderBg} border-r-2 ${currentThemeConfig.borderColor}`}></th>
                    <th className={`${isCompactMode ? 'px-1 py-1' : 'px-2 py-2'} text-center text-xs font-medium bg-gradient-to-r ${currentThemeConfig.tableSubHeaderBg} border-r-2 ${currentThemeConfig.borderColor}`}></th>
                    {(() => {
                      // 计算最后一个可见列（用于表头边框）
                      const columnOrder = ['guaranteed', 'nonGuaranteed', 'total', 'simpleReturn', 'irr'];
                      const visibleColumnNames = columnOrder.filter(col => visibleColumns[col]);
                      const lastVisibleColumn = visibleColumnNames[visibleColumnNames.length - 1];

                      return comparisonData.companies.map((company, pIndex) => {
                        return (
                          <React.Fragment key={`${company.id}-headers`}>
                            {visibleColumns.guaranteed && (
                              <th className={`${isCompactMode ? 'px-1 py-1' : 'px-2 py-2'} text-center ${isCompactMode ? 'text-[10px]' : 'text-xs'} font-semibold ${currentThemeConfig.textSub} whitespace-nowrap bg-gradient-to-r ${currentThemeConfig.tableSubHeaderBg} ${lastVisibleColumn === 'guaranteed' ? `border-r-2 ${currentThemeConfig.borderColor}` : ''}`}>
                                {isCompactMode ? '保证' : '保证现金价值'}
                              </th>
                            )}
                            {visibleColumns.nonGuaranteed && (
                              <th className={`${isCompactMode ? 'px-1 py-1' : 'px-2 py-2'} text-center ${isCompactMode ? 'text-[10px]' : 'text-xs'} font-semibold ${currentTheme === 'luxury' ? 'text-orange-400' : 'text-orange-700'} whitespace-nowrap bg-gradient-to-r ${currentThemeConfig.tableSubHeaderBg} ${lastVisibleColumn === 'nonGuaranteed' ? `border-r-2 ${currentThemeConfig.borderColor}` : ''}`}>
                                {isCompactMode ? '非保证' : '非保证现金价值'}
                              </th>
                            )}
                            {visibleColumns.total && (
                              <th className={`${isCompactMode ? 'px-1 py-1' : 'px-2 py-2'} text-center ${isCompactMode ? 'text-[10px]' : 'text-xs'} font-semibold ${currentTheme === 'luxury' ? 'text-amber-300' : 'text-indigo-700'} whitespace-nowrap bg-gradient-to-r ${currentThemeConfig.tableSubHeaderBg} ${lastVisibleColumn === 'total' ? `border-r-2 ${currentThemeConfig.borderColor}` : ''}`}>总价值</th>
                            )}
                            {visibleColumns.simpleReturn && (
                              <th className={`${isCompactMode ? 'px-1 py-1' : 'px-2 py-2'} text-center ${isCompactMode ? 'text-[10px]' : 'text-xs'} font-semibold ${currentTheme === 'luxury' ? 'text-purple-300' : 'text-purple-700'} whitespace-nowrap bg-gradient-to-r ${currentThemeConfig.tableSubHeaderBg} ${lastVisibleColumn === 'simpleReturn' ? `border-r-2 ${currentThemeConfig.borderColor}` : ''}`}>单利</th>
                            )}
                            {visibleColumns.irr && (
                              <th className={`${isCompactMode ? 'px-1 py-1' : 'px-2 py-2'} text-center ${isCompactMode ? 'text-[10px]' : 'text-xs'} font-semibold ${currentTheme === 'luxury' ? 'text-green-400' : 'text-green-700'} whitespace-nowrap bg-gradient-to-r ${currentThemeConfig.tableSubHeaderBg} ${lastVisibleColumn === 'irr' ? `border-r-2 ${currentThemeConfig.borderColor}` : ''}`}>IRR(复利)</th>
                            )}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.targetYears.map(year => {
                    const firstCompanyData = comparisonData.companies[0]?.yearData[year];
                    const premiumsPaid = firstCompanyData?.premiums_paid !== undefined
                      ? firstCompanyData.premiums_paid
                      : annualPremium * year;

                    // 找出该年度总价值最大的公司
                    let maxTotal = -Infinity;
                    comparisonData.companies.forEach(company => {
                      const data = company.yearData[year];
                      const totalValue = data?.total || 0;
                      if (totalValue > maxTotal) {
                        maxTotal = totalValue;
                      }
                    });

                    return (
                      <tr key={year} className={`border-b ${currentThemeConfig.borderColor} hover:bg-opacity-50 hover:bg-blue-50/10 transition-colors`}>
                        <td className={`${isCompactMode ? 'px-0.5 py-1' : 'px-1 py-2.5'} ${isCompactMode ? 'text-sm' : 'text-base'} font-bold ${currentThemeConfig.textMain} whitespace-nowrap sticky left-0 ${currentTheme === 'luxury' ? 'bg-zinc-800' : 'bg-white'} z-10 border-r-2 ${currentThemeConfig.borderColor} text-center`}>
                          {year}
                        </td>
                        <td className={`${isCompactMode ? 'px-0.5 py-1' : 'px-1 py-2.5'} ${isCompactMode ? 'text-sm' : 'text-base'} font-bold text-center whitespace-nowrap border-r-2 ${currentThemeConfig.borderColor} ${currentTheme === 'luxury' ? 'text-purple-300 bg-zinc-800/50' : 'text-purple-600 bg-purple-50/30'}`}>
                          {customerAge + year}
                        </td>
                        <td className={`${isCompactMode ? 'px-1 py-1' : 'px-2 py-2.5'} ${isCompactMode ? 'text-xs' : 'text-base'} font-semibold text-center whitespace-nowrap border-r-2 ${currentThemeConfig.borderColor} ${currentThemeConfig.textSub} ${currentTheme === 'luxury' ? 'bg-zinc-800/30' : 'bg-gray-50/50'}`}>
                          {isCompactMode ? formatCompactNumber(premiumsPaid, isMobileScreen) : premiumsPaid.toLocaleString('zh-CN')}
                        </td>
                        {comparisonData.companies.map((company, pIndex) => {
                          const data = company.yearData[year];
                          const totalValue = data?.total || 0;
                          const holdingYears = year;
                          const actualPremiumsPaid = data?.premiums_paid !== undefined ? data.premiums_paid : annualPremium * holdingYears;

                          // 只在缴费期结束后的下一年开始计算和显示单利
                          const simpleReturn = holdingYears > paymentYears && totalValue && actualPremiumsPaid && holdingYears > 0
                            ? ((totalValue - actualPremiumsPaid) / actualPremiumsPaid / holdingYears) * 100
                            : null;

                          // 计算该公司的回本年份
                          let companyBreakEvenYear = null;
                          if (visibleColumns.breakEven) {
                            for (const checkYear of comparisonData.targetYears) {
                              const checkData = company.yearData[checkYear];
                              const checkTotal = checkData?.total || 0;
                              const checkPaid = checkData?.premiums_paid !== undefined ? checkData.premiums_paid : annualPremium * checkYear;
                              if (checkTotal >= checkPaid) {
                                companyBreakEvenYear = checkYear;
                                break;
                              }
                            }
                          }

                          let irr = null;
                          // 只在缴费期结束后的下一年开始计算和显示IRR
                          if (holdingYears > paymentYears && totalValue > 0 && actualPremiumsPaid > 0 && holdingYears > 0) {
                            const yearlyPremiums = [];
                            for (let y = 1; y <= holdingYears; y++) {
                              const allYearDataItem = company.allYearData?.[y];
                              if (allYearDataItem?.premiums_paid !== undefined) {
                                yearlyPremiums.push(allYearDataItem.premiums_paid);
                              } else {
                                yearlyPremiums.push(annualPremium * y);
                              }
                            }
                            const returnRatio = totalValue / actualPremiumsPaid;
                            if (returnRatio > 0 && yearlyPremiums.length > 0) {
                              irr = calculateIRRFromActualPayments(yearlyPremiums, totalValue, holdingYears);
                            }
                          }

                          // 判断是否是该年度表现最好的公司（总价值最大）
                          const isBest = visibleColumns.highlightBest && totalValue > 0 && totalValue === maxTotal;
                          const bestCellClass = isBest ? 'bg-red-100' : '';
                          const bestTextClass = isBest ? 'text-red-700 font-extrabold' : '';

                          // 判断是否是回本年份
                          const isBreakEvenYear = visibleColumns.breakEven && companyBreakEvenYear === year;

                          // 判断某列是否是最后一个可见列（用于显示右边框）
                          const columnOrder = ['guaranteed', 'nonGuaranteed', 'total', 'simpleReturn', 'irr'];
                          const visibleColumnNames = columnOrder.filter(col => visibleColumns[col]);
                          const lastVisibleColumn = visibleColumnNames[visibleColumnNames.length - 1];

                          return (
                            <React.Fragment key={`${company.id}-${year}`}>
                              {visibleColumns.guaranteed && (
                                <td className={`${isCompactMode ? 'px-0.5 py-1' : 'px-2 py-2.5'} ${isCompactMode ? 'text-xs' : 'text-base'} font-semibold text-center whitespace-nowrap ${currentThemeConfig.textSub} ${bestCellClass} ${lastVisibleColumn === 'guaranteed' ? `border-r-2 ${currentThemeConfig.borderColor}` : ''}`}>
                                  {data?.guaranteed !== undefined && data?.guaranteed !== null ? (isCompactMode ? formatCompactNumber(parseInt(data.guaranteed), isMobileScreen) : parseInt(data.guaranteed).toLocaleString('zh-CN')) : '-'}
                                </td>
                              )}
                              {visibleColumns.nonGuaranteed && (
                                <td className={`${isCompactMode ? 'px-0.5 py-1' : 'px-2 py-2.5'} ${isCompactMode ? 'text-xs' : 'text-base'} font-semibold text-center whitespace-nowrap ${currentTheme === 'luxury' ? 'text-orange-400' : 'text-orange-600'} ${bestCellClass} ${lastVisibleColumn === 'nonGuaranteed' ? `border-r-2 ${currentThemeConfig.borderColor}` : ''}`}>
                                  {data?.non_guaranteed !== undefined && data?.non_guaranteed !== null ? (isCompactMode ? formatCompactNumber(parseInt(data.non_guaranteed), isMobileScreen) : parseInt(data.non_guaranteed).toLocaleString('zh-CN')) : '-'}
                                </td>
                              )}
                              {visibleColumns.total && (
                                <td className={`relative ${isCompactMode ? 'px-0.5 py-1' : 'px-2 py-2.5'} ${isCompactMode ? 'text-xs' : 'text-base'} font-bold text-center whitespace-nowrap ${currentTheme === 'luxury' ? 'text-amber-300 bg-amber-900/10' : 'text-indigo-700 bg-indigo-50/30'} ${bestCellClass} ${bestTextClass} ${isBreakEvenYear ? 'ring-4 ring-red-500 ring-inset' : ''} ${lastVisibleColumn === 'total' ? `border-r-2 ${currentThemeConfig.borderColor}` : ''}`}>
                                  {isBreakEvenYear && (
                                    <span className="absolute bottom-0.5 right-0.5 bg-red-500/40 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-sm">
                                      回本
                                    </span>
                                  )}
                                  {data?.total !== undefined && data?.total !== null ? (isCompactMode ? formatCompactNumber(parseInt(data.total), isMobileScreen) : parseInt(data.total).toLocaleString('zh-CN')) : '-'}
                                </td>
                              )}
                              {visibleColumns.simpleReturn && (
                                <td className={`${isCompactMode ? 'px-0.5 py-1' : 'px-2 py-2.5'} ${isCompactMode ? 'text-xs' : 'text-base'} font-bold text-center whitespace-nowrap ${currentTheme === 'luxury' ? 'text-purple-300' : 'text-purple-600'} ${bestCellClass} ${lastVisibleColumn === 'simpleReturn' ? `border-r-2 ${currentThemeConfig.borderColor}` : ''}`}>
                                  {simpleReturn !== null ? `${simpleReturn.toFixed(isCompactMode ? 1 : 2)}%` : '-'}
                                </td>
                              )}
                              {visibleColumns.irr && (
                                <td className={`${isCompactMode ? 'px-0.5 py-1' : 'px-2 py-2.5'} ${isCompactMode ? 'text-xs' : 'text-base'} font-bold text-center whitespace-nowrap ${currentTheme === 'luxury' ? 'text-green-400 bg-green-900/10' : 'text-green-600 bg-green-50/30'} ${bestCellClass} ${lastVisibleColumn === 'irr' ? `border-r-2 ${currentThemeConfig.borderColor}` : ''}`}>
                                  {irr !== null ? `${irr.toFixed(2)}%` : '-'}
                                </td>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 列选择器模态框 */}
          {showColumnSelector && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* 标题栏 */}
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-3 flex items-center justify-between">
                  <div className="w-8"></div>
                  <h3 className="text-lg font-bold text-white text-center flex-1">自定义显示项</h3>
                  <button
                    onClick={() => setShowColumnSelector(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-all"
                    aria-label="关闭"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* 操作按钮栏 */}
                <div className="px-4 py-2 bg-gray-50 flex items-center justify-between gap-2 border-b border-gray-200">
                  <button
                    onClick={handleSelectAllColumns}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-xs font-semibold"
                  >
                    全选
                  </button>
                  <div className="text-xs text-gray-600">
                    已选择 <span className="font-bold text-indigo-600">{Object.values(visibleColumns).filter(v => v).length}</span> / 7 项
                  </div>
                </div>

                {/* 列选项 */}
                <div className="p-3 space-y-3">
                  {/* 数据列分组 */}
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">数据列</div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.guaranteed}
                          onChange={() => handleToggleColumn('guaranteed')}
                          className="w-4 h-4 rounded text-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">保证现金价值</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-2.5 bg-orange-50 rounded-lg hover:bg-orange-100 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.nonGuaranteed}
                          onChange={() => handleToggleColumn('nonGuaranteed')}
                          className="w-4 h-4 rounded text-orange-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">非保证现金价值</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-2.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.total}
                          onChange={() => handleToggleColumn('total')}
                          className="w-4 h-4 rounded text-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">总价值</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-2.5 bg-purple-50 rounded-lg hover:bg-purple-100 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.simpleReturn}
                          onChange={() => handleToggleColumn('simpleReturn')}
                          className="w-4 h-4 rounded text-purple-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">单利</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-2.5 bg-green-50 rounded-lg hover:bg-green-100 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.irr}
                          onChange={() => handleToggleColumn('irr')}
                          className="w-4 h-4 rounded text-green-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">IRR(年化复利)</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* 分隔线 */}
                  <div className="border-t-2 border-dashed border-gray-300"></div>

                  {/* 其他选项分组 */}
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">其他选项</div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-2.5 bg-red-50 rounded-lg hover:bg-red-100 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.breakEven}
                          onChange={() => handleToggleColumn('breakEven')}
                          className="w-4 h-4 rounded text-red-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">回本期标记</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-2.5 bg-pink-50 rounded-lg hover:bg-pink-100 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.highlightBest}
                          onChange={() => handleToggleColumn('highlightBest')}
                          className="w-4 h-4 rounded text-pink-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">按年度最优</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 底部按钮 */}
                <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowColumnSelector(false)}
                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                  >
                    确认
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 列表视图
  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 px-3 md:px-4 pt-4 md:pt-6 pb-4 md:pb-6 transition-colors duration-500 relative`}>
      {/* 联系保险顾问按钮 - 右上角 */}
      <a
        href="https://work.weixin.qq.com/kfid/kfcdfdb02ed73c8e4d0"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl transition-all text-xs md:text-sm font-semibold text-white hover:scale-105 hover:from-green-600 hover:to-emerald-700 z-10"
      >
        <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="hidden sm:inline">联系保险顾问</span>
        <span className="sm:hidden">咨询</span>
      </a>

      <div className="max-w-[98%] mx-auto">
        {/* 头部 */}
        <div className="mb-3 md:mb-5 pt-12 md:pt-0">
          {/* 标题 */}
          <div className="mb-2 md:mb-4 text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900" style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>
              港險儲蓄分紅型產品收益數據統計表
              <span className="text-xl md:text-2xl lg:text-3xl">（2025年12月）</span>
            </h1>
            <p className="text-xs md:text-sm text-gray-500 mt-2">数据最新更新日期 09/12/2025</p>
          </div>

          {/* 提示文字与对比按钮 */}
          <div className="mb-2 md:mb-3 flex items-center justify-between gap-4">
            <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-indigo-900 drop-shadow-md" style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>点击选择对比的公司</h2>

            {/* 对比按钮 */}
            <button
              onClick={handleCompareCompanies}
              className="flex items-center gap-2 md:gap-3 px-4 md:px-8 py-2 md:py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl shadow-[0_8px_30px_rgba(99,102,241,0.5)] hover:shadow-[0_12px_40px_rgba(168,85,247,0.6)] transition-all text-base md:text-lg font-bold hover:scale-105 hover:brightness-110"
            >
              <GitCompare className="w-5 h-5 md:w-7 md:h-7" />
              <span>开始对比 {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</span>
            </button>
          </div>

          {/* 客户演示信息 */}
          <div className="mb-2 md:mb-4 bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1)] p-2 md:p-4 border-2 border-indigo-200/50">
            <div className="space-y-2">
              <div className="flex items-center gap-3 md:gap-8 flex-wrap">
                {/* 客户年龄 */}
                <div className="flex items-center gap-2 md:gap-3">
                  <label className="text-gray-900 font-semibold text-sm md:text-base">客户年龄：</label>
                  <div
                    onClick={() => {
                      setCalculatorField('age');
                      setShowCalculator(true);
                    }}
                    className="w-16 md:w-24 px-2 md:px-4 py-2 md:py-2.5 border border-gray-200/80 bg-white/90 rounded-xl text-gray-900 font-medium cursor-pointer hover:border-blue-400/50 hover:ring-2 hover:ring-blue-400/30 transition-all text-sm md:text-base shadow-sm flex items-center justify-center"
                  >
                    {customerAge}
                  </div>
                  <span className="text-gray-600 font-medium text-sm md:text-base">岁</span>
                </div>

                {/* 客户性别 */}
                <div className="flex items-center gap-2 md:gap-3">
                  <label className="text-gray-900 font-semibold text-sm md:text-base">性别：</label>
                  <div className="flex items-center gap-2 md:gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer px-2 md:px-4 py-1.5 md:py-2 rounded-xl hover:bg-blue-50/50 transition-all text-gray-900 bg-white/50">
                      <input
                        type="radio"
                        value="male"
                        checked={customerGender === 'male'}
                        onChange={(e) => setCustomerGender(e.target.value)}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span>男</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer px-2 md:px-4 py-1.5 md:py-2 rounded-xl hover:bg-pink-50/50 transition-all text-gray-900 bg-white/50">
                      <input
                        type="radio"
                        value="female"
                        checked={customerGender === 'female'}
                        onChange={(e) => setCustomerGender(e.target.value)}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span>女</span>
                    </label>
                  </div>
                </div>

                {/* 年缴保费 */}
                <div className="flex items-center gap-2 md:gap-3">
                  <label className="text-gray-900 font-semibold text-sm md:text-base">年缴保费：</label>
                  <div
                    onClick={() => {
                      setCalculatorField('premium');
                      setShowCalculator(true);
                    }}
                    className="w-24 md:w-36 px-2 md:px-4 py-2 md:py-2.5 border border-gray-200/80 bg-white/90 rounded-xl text-gray-900 font-medium cursor-pointer hover:border-blue-400/50 hover:ring-2 hover:ring-blue-400/30 transition-all text-sm md:text-base shadow-sm flex items-center justify-center"
                  >
                    {paymentAmount.toLocaleString('zh-CN')}
                  </div>
                  <span className="text-gray-600 font-medium text-sm md:text-base">元</span>
                </div>

                {/* 缴费年限 */}
                <div className="flex items-center gap-2 md:gap-3">
                  <label className="text-gray-900 font-semibold text-sm md:text-base">缴费年限：</label>
                  <div className="flex items-center gap-2 md:gap-4">
                    <label className={`flex items-center gap-1.5 cursor-pointer px-2 md:px-4 py-1.5 md:py-2 rounded-xl transition-all text-gray-900 ${paymentYears === 1 ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white/50 hover:bg-blue-50/50'}`}>
                      <input
                        type="radio"
                        value="1"
                        checked={paymentYears === 1}
                        onChange={(e) => handlePaymentYearsChange(Number(e.target.value))}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="font-medium">1年</span>
                    </label>
                    <label className={`flex items-center gap-1.5 cursor-pointer px-2 md:px-4 py-1.5 md:py-2 rounded-xl transition-all text-gray-900 ${paymentYears === 2 ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white/50 hover:bg-blue-50/50'}`}>
                      <input
                        type="radio"
                        value="2"
                        checked={paymentYears === 2}
                        onChange={(e) => handlePaymentYearsChange(Number(e.target.value))}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="font-medium">2年</span>
                    </label>
                    <label className={`flex items-center gap-1.5 cursor-pointer px-2 md:px-4 py-1.5 md:py-2 rounded-xl transition-all text-gray-900 ${paymentYears === 5 ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white/50 hover:bg-blue-50/50'}`}>
                      <input
                        type="radio"
                        value="5"
                        checked={paymentYears === 5}
                        onChange={(e) => handlePaymentYearsChange(Number(e.target.value))}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="font-medium">5年</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 保险公司列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12 md:py-20">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin drop-shadow-lg" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 md:gap-4">
            {companies.map((company) => {
              // 富卫公司使用稍小的logo
              const isFWD = company.name === '富卫' || company.name === 'FWD' || company.name.includes('富卫');
              const logoClasses = isFWD
                ? "w-20 h-14 md:w-36 md:h-20"
                : "w-32 h-20 md:w-52 md:h-32";

              return (
              <div
                key={company.id}
                onClick={() => handleSelectOne(company.id)}
                className={`
                  relative rounded-lg md:rounded-xl py-0.5 px-2 md:py-1 md:px-3 transition-all duration-300 cursor-pointer
                  ${!company.has_data
                    ? 'opacity-50 cursor-not-allowed bg-white/70 backdrop-blur-lg shadow-[0_4px_12px_rgba(0,0,0,0.15),0_2px_4px_rgba(0,0,0,0.1)] border-2 border-gray-300/60'
                    : selectedIds.includes(company.id)
                      ? 'bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 backdrop-blur-xl border-2 border-indigo-500 shadow-[0_16px_48px_rgba(99,102,241,0.6),0_8px_24px_rgba(139,92,246,0.4),0_4px_12px_rgba(0,0,0,0.15)] scale-105 ring-4 ring-purple-400/40'
                      : 'bg-white/95 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.35),0_8px_20px_rgba(0,0,0,0.15),0_4px_8px_rgba(0,0,0,0.1)] hover:scale-[1.03] hover:-translate-y-1 border-2 border-white/80 hover:border-indigo-300'
                  }
                `}
              >
                {/* 选中状态标记 */}
                {selectedIds.includes(company.id) && (
                  <>
                    <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-1 md:p-1.5 shadow-[0_6px_20px_rgba(99,102,241,0.6)]">
                      <Check className="w-4 h-4 md:w-6 md:h-6 text-white stroke-[3]" />
                    </div>
                    {/* 显示已选产品数量（仅多产品公司） */}
                    {company.has_multiple_products && selectedProductsByCompany[company.id] && selectedProductsByCompany[company.id].length > 1 && (
                      <div className="absolute top-1 left-1 md:top-1.5 md:left-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs md:text-sm font-bold px-2 py-0.5 md:px-2.5 md:py-1 rounded-full shadow-lg z-10">
                        {selectedProductsByCompany[company.id].length}个产品
                      </div>
                    )}
                  </>
                )}

                <div className={`flex items-center justify-center ${isFWD ? 'mt-4 md:mt-5 mb-2 md:mb-3' : '-mb-1'}`}>
                  <CompanyIconDisplay
                    iconUrl={company.icon}
                    companyName={company.name}
                    imgSizeClasses={logoClasses}
                    textClasses="text-4xl md:text-6xl"
                    fallbackBgClasses="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl md:rounded-2xl"
                  />
                </div>

                <div className={`text-center ${isFWD ? 'mt-1' : '-mt-2'}`}>
                  <h3 className={`text-sm md:text-lg font-bold ${currentThemeConfig.textMain} line-clamp-1 leading-none`} style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>{company.name}</h3>
                  {company.name_en && (
                    <p className={`text-[10px] md:text-xs ${currentThemeConfig.textSub} line-clamp-1 leading-none`}>{company.name_en}</p>
                  )}
                  {/* 显示所有产品名称 */}
                  {(() => {
                    // 如果公司有产品列表，显示所有产品名称
                    if (company.products && company.products.length > 0) {
                      const productNames = company.products.map(p => p.product_name);

                      return (
                        <div className={`text-xs md:text-base ${currentTheme === 'luxury' ? 'text-amber-400' : 'text-indigo-700'} font-bold px-0.5 leading-tight space-y-0.5`} style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>
                          {productNames.map((name, idx) => (
                            <div key={idx} className="line-clamp-2">{name}</div>
                          ))}
                        </div>
                      );
                    }

                    // 否则显示默认产品名称（兜底）
                    if (company.flagship_product) {
                      return (
                        <p className={`text-xs md:text-base ${currentTheme === 'luxury' ? 'text-amber-400' : 'text-indigo-700'} font-bold line-clamp-2 px-0.5 leading-tight`} style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>
                          {company.flagship_product}
                        </p>
                      );
                    }

                    return null;
                  })()}
                </div>

                {/* 隐藏有数据/暂无数据标签 */}
                <div className="text-center mt-2 md:mt-4 hidden">
                  {company.has_data ? (
                    <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-4 py-1 md:py-2 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 text-xs md:text-sm font-bold rounded-full border border-green-200 md:border-2">
                      <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">有数据</span>
                      <span className="sm:hidden">✓</span>
                    </span>
                  ) : (
                    <span className="inline-block px-2 md:px-4 py-1 md:py-2 bg-gray-100 text-gray-500 text-xs md:text-sm font-semibold rounded-full border border-gray-200 md:border-2">
                      <span className="hidden sm:inline">暂无数据</span>
                      <span className="sm:hidden">-</span>
                    </span>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* 自定义显示年度 */}
        <div className="mt-3 md:mt-4 bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1)] p-2 md:p-4 border-2 border-indigo-200/50">
          <div className="flex items-center gap-2 md:gap-4">
            <label className="flex items-center gap-2 md:gap-3 cursor-pointer px-2 md:px-3 py-1 md:py-1.5 rounded-xl hover:bg-blue-50/50 transition-all bg-white/50">
              <input
                type="checkbox"
                checked={useCustomAges}
                onChange={(e) => setUseCustomAges(e.target.checked)}
                className="w-4 h-4 rounded text-blue-500"
              />
              <span className="text-gray-900 font-semibold text-sm md:text-base whitespace-nowrap">年度</span>
            </label>
            {useCustomAges && (
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={customAgesInput}
                  onChange={(e) => setCustomAgesInput(e.target.value)}
                  placeholder="输入年度，用逗号分隔（如：1,5,10,20）"
                  className="w-full pl-2 md:pl-4 pr-[90px] md:pr-[130px] py-2 md:py-2.5 border border-gray-200/80 bg-white/90 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all text-sm md:text-base shadow-sm"
                />
                <button
                  onClick={handleOpenYearSelector}
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center gap-1 px-2 md:px-3 py-1.5 md:py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-semibold text-xs md:text-sm whitespace-nowrap"
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span>选择年度</span>
                </button>
              </div>
            )}
            {!useCustomAges && (
              <span className="text-xs md:text-sm text-gray-600 hidden sm:inline">默认：1-9, 10, 15, 20, 25, 30, 35, 40, 60, 80, 100</span>
            )}
          </div>
        </div>
      </div>

      {/* 计算器模态框 */}
      <Calculator
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        onConfirm={(value) => {
          if (calculatorField === 'age') {
            setCustomerAge(value);
          } else if (calculatorField === 'premium') {
            setPaymentAmount(value);
          }
        }}
        initialValue={calculatorField === 'age' ? customerAge : paymentAmount}
        title={calculatorField === 'age' ? '输入客户年龄' : '输入年缴保费'}
        min={calculatorField === 'age' ? 0 : 2000}
        max={calculatorField === 'age' ? 100 : undefined}
      />

      {/* 产品选择器模态框 */}
      {showProductSelector && currentCompanyForSelection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-xl sm:rounded-3xl shadow-2xl w-full max-w-[340px] sm:max-w-md md:max-w-lg max-h-[88vh] overflow-hidden flex flex-col">
            {/* 标题栏 */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-3 py-2 sm:px-6 sm:py-4 flex-shrink-0">
              <h3 className="text-sm sm:text-2xl font-bold text-white text-center leading-tight">{currentCompanyForSelection.name} - 选择产品</h3>
              <p className="text-white/80 text-[11px] sm:text-sm text-center mt-0.5 sm:mt-1">该公司有 {currentCompanyForSelection.products.length} 个{paymentYears}年期产品，可多选（选完全部产品将自动确认）</p>
            </div>

            {/* 产品列表（多选模式） */}
            <div className="p-2 sm:p-6 overflow-y-auto flex-1">
              <div className="space-y-2 sm:space-y-3">
                {currentCompanyForSelection.products.map((product) => {
                  const isSelected = tempSelectedProducts.includes(product.product_id);
                  return (
                    <label
                      key={product.product_id}
                      className={`
                        flex items-center w-full p-2 sm:p-4 rounded-lg sm:rounded-2xl text-left transition-all cursor-pointer
                        ${isSelected
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg scale-[1.02] ring-2 sm:ring-4 ring-purple-300'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-900 hover:scale-[1.01] hover:shadow-md'
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleProductToggle(product.product_id)}
                        className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500 mr-2 sm:mr-4 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'} break-words leading-tight`}>
                          {product.product_name}
                        </div>
                        {product.standard_data && (
                          <div className={`text-[10px] sm:text-sm mt-0.5 sm:mt-1 ${isSelected ? 'text-white/80' : 'text-gray-600'}`}>
                            {product.standard_data.standard.length} 个年度数据
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="ml-1.5 sm:ml-4 bg-white/20 rounded-full p-0.5 sm:p-2 flex-shrink-0">
                          <Check className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white stroke-[3]" />
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="px-2.5 py-2 sm:px-6 sm:py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-1.5 sm:gap-3 flex-shrink-0">
              <div className="text-[10px] sm:text-sm text-gray-600">
                已选 <span className="font-bold text-indigo-600">{tempSelectedProducts.length}</span> 个
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3">
                <button
                  onClick={() => {
                    setShowProductSelector(false);
                    setCurrentCompanyForSelection(null);
                    setTempSelectedProducts([]);
                  }}
                  className="px-2.5 py-1.5 sm:px-6 sm:py-2.5 bg-gray-200 text-gray-700 rounded-md sm:rounded-xl hover:bg-gray-300 transition-all font-semibold text-[11px] sm:text-base"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmProductSelection}
                  className="px-2.5 py-1.5 sm:px-6 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md sm:rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-semibold text-[11px] sm:text-base"
                >
                  确认选择
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* 年份选择器模态框 */}
      {showYearSelector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] md:max-h-[80vh] overflow-hidden">
            {/* 标题栏 */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-3 py-2 md:px-6 md:py-4">
              <h3 className="text-lg md:text-2xl font-bold text-white text-center">选择显示年度</h3>
              <p className="text-white/80 text-xs md:text-sm text-center mt-0.5 md:mt-1">已选择 {selectedYears.length} 个年度</p>
            </div>

            {/* 操作按钮栏 */}
            <div className="px-2 py-2 md:px-6 md:py-3 bg-gray-50 border-b border-gray-200 space-y-2 md:space-y-3">
              {/* 快捷操作按钮 */}
              <div className="flex items-center justify-between gap-2 md:gap-3">
                <button
                  onClick={handleSelectAllYears}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-xs md:text-sm font-semibold"
                >
                  全选
                </button>
                <button
                  onClick={handleClearAllYears}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-all text-xs md:text-sm font-semibold"
                >
                  清空
                </button>
              </div>

              {/* 范围输入 */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <input
                  type="text"
                  value={yearRangeInput}
                  onChange={(e) => setYearRangeInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyYearRange();
                    }
                  }}
                  placeholder="输入范围，如：1-4"
                  className="flex-1 px-2 py-1.5 md:px-4 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs md:text-sm"
                />
                <button
                  onClick={handleApplyYearRange}
                  className="px-3 py-1.5 md:px-6 md:py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all text-xs md:text-sm font-semibold whitespace-nowrap shadow-md"
                >
                  应用
                </button>
              </div>
            </div>

            {/* 年份网格 */}
            <div className="p-2 md:p-6 overflow-y-auto max-h-[60vh] md:max-h-[50vh]">
              <div className="grid grid-cols-5 md:grid-cols-6 gap-1.5 md:gap-3">
                {availableYears.map(year => {
                  const isSelected = selectedYears.includes(year);
                  return (
                    <button
                      key={year}
                      onClick={() => handleYearToggle(year)}
                      className={`
                        px-2 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl text-sm md:text-lg font-bold transition-all
                        ${isSelected
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg scale-105 ring-1 md:ring-2 ring-purple-400'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                        }
                      `}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="px-2 py-2 md:px-6 md:py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 md:gap-3">
              <button
                onClick={() => setShowYearSelector(false)}
                className="px-4 py-2 md:px-6 md:py-2.5 bg-gray-200 text-gray-700 rounded-lg md:rounded-xl hover:bg-gray-300 transition-all font-semibold text-xs md:text-base"
              >
                取消
              </button>
              <button
                onClick={handleConfirmYears}
                className="px-4 py-2 md:px-6 md:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg md:rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-semibold text-xs md:text-base"
              >
                确认选择
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyComparisonCC;