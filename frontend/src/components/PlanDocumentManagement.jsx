import React, { useState, useEffect } from 'react';
import { FileText, Eye, Calendar, ArrowLeft, Loader2, Search, Trash2, GitCompare, RefreshCw, Clock, X, CheckCircle, MessageSquare, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../hooks/useAppNavigate';
import axios from 'axios';

function PlanDocumentManagement() {
  const onNavigate = useAppNavigate();
  const { user, loading: authLoading } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [customAgesInput, setCustomAgesInput] = useState('1,2,3,4,5,6,7,8,9,10,65岁,75岁,90岁,100岁');
  const [useCustomAges, setUseCustomAges] = useState(true);
  const [documentProgress, setDocumentProgress] = useState({}); // 存储每个文档的处理进度
  const [showProgressModal, setShowProgressModal] = useState(false); // 显示进度模态框
  const [progressModalDocId, setProgressModalDocId] = useState(null); // 当前查看进度的文档ID

  // 自定义显示列相关状态
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('planManagementVisibleColumns');
    if (saved) {
      return JSON.parse(saved);
    }
    // 默认显示所有列
    return {
      premiumsPaid: true,     // 已缴保费
      guaranteed: true,        // 保证价值
      total: true,             // 预期价值
      simpleReturn: true,      // 年化单利
      irr: true                // IRR
    };
  });

  useEffect(() => {
    // 设置页面标题
    const originalTitle = document.title;
    document.title = '計畫書分析與比對工具';

    console.log('📄 [PlanDocumentManagement] useEffect触发 - authLoading:', authLoading, 'user:', user);
    // 等待认证完成后再获取文档列表
    if (!authLoading) {
      console.log('📄 [PlanDocumentManagement] 认证完成，开始获取文档列表');
      fetchDocuments();
    } else {
      console.log('📄 [PlanDocumentManagement] 认证中，等待完成...');
    }

    // 组件卸载时恢复原标题
    return () => {
      document.title = originalTitle;
    };
  }, [authLoading, user]);

  // 轮询processing状态的文档进度
  useEffect(() => {
    const processingDocs = documents.filter(doc => doc.status === 'processing');

    if (processingDocs.length === 0) {
      return;
    }

    const fetchProgress = async () => {
      for (const doc of processingDocs) {
        try {
          const response = await axios.get(`/api/ocr/documents/${doc.id}/status/`);
          const data = response.data;

          if (data.status === 'success') {
            setDocumentProgress(prev => ({
              ...prev,
              [doc.id]: data.data
            }));

            // 如果已完成，刷新文档列表
            if (data.data.processing_stage === 'all_completed' || data.data.processing_stage === 'error') {
              fetchDocuments();
            }
          }
        } catch (error) {
          console.error(`获取文档${doc.id}进度失败:`, error);
        }
      }
    };

    // 立即获取一次
    fetchProgress();

    // 每3秒轮询一次
    const interval = setInterval(fetchProgress, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      // 使用 axios 发送请求，会自动添加认证 token
      const url = '/api/ocr/documents/';
      console.log('📊 获取文档列表 - user:', user);
      console.log('📡 请求URL:', url);

      const response = await axios.get(url);
      const data = response.data;
      console.log('📦 API返回数据:', data);

      if (data.status === 'success') {
        setDocuments(data.data || []);
        console.log('✅ 文档数量:', data.data?.length);
      }
    } catch (error) {
      console.error('获取文档列表失败:', error);
      if (error.response?.status === 401) {
        console.error('❌ 认证失败，可能需要重新登录');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (doc) => {
    // 跳转到文档详情页面
    onNavigate(`/document/${doc.id}`);
  };

  const handleOpenAssistant = (doc) => {
    // 跳转到文档详情页面并自动打开计划书助手
    onNavigate(`/document/${doc.id}?openChat=true`);
  };

  const handleDownloadPDF = async (doc) => {
    // 下载PDF文件
    if (!doc.file_path) {
      alert('PDF文件不存在');
      return;
    }

    try {
      // 使用file_path直接下载（file_path是完整URL路径）
      const link = document.createElement('a');
      link.href = doc.file_path;
      link.download = doc.file_name || 'document.pdf';
      link.target = '_blank';  // 在新标签页打开（浏览器会自动下载）
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 显示下载开始提示
      alert(`✅ 正在下载:\n${doc.file_name}`);
    } catch (error) {
      console.error('下载PDF失败:', error);
      alert('下载失败，请稍后重试');
    }
  };

  const handleViewProgress = async (docId) => {
    setProgressModalDocId(docId);
    setShowProgressModal(true);

    // 立即获取一次进度
    try {
      const response = await axios.get(`/api/ocr/documents/${docId}/status/`);
      const data = response.data;

      if (data.status === 'success') {
        setDocumentProgress(prev => ({
          ...prev,
          [docId]: data.data
        }));
      }
    } catch (error) {
      console.error(`获取文档${docId}进度失败:`, error);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredDocuments.map(doc => doc.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 保存显示列设置到localStorage
  useEffect(() => {
    localStorage.setItem('planManagementVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

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
      premiumsPaid: true,
      guaranteed: true,
      total: true,
      simpleReturn: true,
      irr: true
    });
  };

  // 计算显示的列数
  const getVisibleColumnCount = () => {
    return Object.values(visibleColumns).filter(v => v).length;
  };

  // 计算年化单利（与DocumentContentEditor保持一致）
  const calculateSimpleAnnualizedReturn = (totalValue, actualInvestment, holdingYears) => {
    if (!totalValue || !actualInvestment || !holdingYears || holdingYears <= 0 || actualInvestment <= 0) {
      return null;
    }
    // 年化单利 = (回报 - 投入) / 投入 / 年数 × 100%
    const simpleReturn = ((totalValue - actualInvestment) / actualInvestment / holdingYears) * 100;
    return simpleReturn;
  };

  // 计算IRR（修正版：保费期初缴纳，退保价值期末，使用牛顿迭代法）
  const calculateIRR = (annualPremium, paymentYears, totalValue, holdingYears) => {
    if (!annualPremium || !paymentYears || !totalValue || !holdingYears || holdingYears <= 0 || totalValue <= 0) {
      return null;
    }

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
    let rate = holdingYears > 50 ? 0.03 : 0.05;
    const maxIterations = 200;
    const precision = holdingYears > 50 ? 0.001 : 0.0001;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let derivative = 0;

      // 保费在期初缴纳：第1年保费在第0年末，第2年保费在第1年末...
      for (let year = 1; year <= holdingYears; year++) {
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

      // 退保价值在第holdingYears年末
      const finalFactor = Math.pow(1 + rate, holdingYears);
      npv += totalValue / finalFactor;
      derivative -= (totalValue * holdingYears) / Math.pow(1 + rate, holdingYears + 1);

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

  const handleCompareProducts = () => {
    if (selectedIds.length === 0) {
      alert('请先选择要对比的产品');
      return;
    }

    // 获取选中的文档
    const selectedDocs = documents.filter(doc => selectedIds.includes(doc.id));

    console.log('===== 开始检查选中的文档 =====');
    console.log('选中的文档数量:', selectedDocs.length);

    // 检查是否所有文档都有table1数据
    const docsWithoutTable = selectedDocs.filter(doc => {
      console.log('\n--- 检查文档 ---');
      console.log('文件名:', doc.file_name);
      console.log('table1:', doc.table1);
      console.log('table1 === null:', doc.table1 === null);
      console.log('table1 === undefined:', doc.table1 === undefined);
      console.log('table1类型:', typeof doc.table1);
      console.log('table1是否为对象:', doc.table1 && typeof doc.table1 === 'object');

      if (doc.table1 && typeof doc.table1 === 'object') {
        console.log('table1.keys:', Object.keys(doc.table1));
        console.log('table1.years:', doc.table1.years);
        console.log('years是数组:', Array.isArray(doc.table1.years));
        console.log('years长度:', doc.table1.years?.length);
      }

      // 判断table1是否有值：
      // 1. table1不为null/undefined
      // 2. table1不是空字符串
      // 3. 如果是对象，需要有years数组且长度>0
      let hasTable = false;

      if (doc.table1) {
        if (typeof doc.table1 === 'string') {
          // 如果是字符串，检查是否为空
          hasTable = doc.table1.trim().length > 0;
          console.log('table1是字符串，长度:', doc.table1.trim().length);
        } else if (typeof doc.table1 === 'object') {
          // 如果是对象，检查years数组
          hasTable = doc.table1.years &&
                    Array.isArray(doc.table1.years) &&
                    doc.table1.years.length > 0;
          console.log('table1是对象，hasTable:', hasTable);
        }
      }

      console.log('最终 hasTable 结果:', hasTable);
      console.log('返回 !hasTable (缺少表格):', !hasTable);
      return !hasTable;
    });

    console.log('\n===== 检查结果汇总 =====');
    console.log('没有table的文档数量:', docsWithoutTable.length);
    console.log('没有table的文档:', docsWithoutTable.map(d => d.file_name));

    if (docsWithoutTable.length > 0) {
      alert(`以下文档尚未分析年度价值表，请先进行分析：\n${docsWithoutTable.map(d => d.file_name).join('\n')}`);
      return;
    }

    // 动态计算所有文档的实际年龄范围
    let allAges = new Set();
    selectedDocs.forEach(doc => {
      const years = doc.table1?.years || [];
      const currentAge = doc.insured_age || 0;

      years.forEach(y => {
        const policyYear = y.policy_year;

        // 判断是年龄格式还是保单年度格式
        if (typeof policyYear === 'string' && /[岁歲]/.test(policyYear)) {
          // 年龄格式（带"岁"或"歲"）：直接提取年龄
          const match = policyYear.match(/\d+/);
          if (match) allAges.add(parseInt(match[0]));
        } else if (typeof policyYear === 'number') {
          // 纯数字：视为保单年度，计算对应年龄
          allAges.add(currentAge + policyYear);
        }
      });
    });

    // 从实际数据中选择关键年龄点
    const sortedAges = Array.from(allAges).sort((a, b) => a - b);
    let targetAges;

    // 如果用户输入了自定义年龄
    let ageDisplayMap = {}; // 用于记录每个年龄应该如何显示
    if (useCustomAges && customAgesInput.trim()) {
      // 解析用户输入（支持两种格式）
      // 支持全角逗号（，）和半角逗号（,）
      const inputs = customAgesInput
        .replace(/，/g, ',') // 将全角逗号转换为半角逗号
        .split(',')
        .map(item => item.trim())
        .filter(item => item);
      const customAges = new Set();

      inputs.forEach(input => {
        // 检查是否带"岁"或"歲"
        if (/[岁歲]/.test(input)) {
          // 带"岁"的是年龄，直接提取数字
          const match = input.match(/\d+/);
          if (match) {
            const age = parseInt(match[0]);
            if (allAges.has(age)) {
              customAges.add(age);
              ageDisplayMap[age] = { type: 'age', value: age }; // 标记为年龄
            }
          }
        } else {
          // 纯数字是保单年度
          const policyYear = parseInt(input);
          if (!isNaN(policyYear)) {
            // 使用特殊的键格式 "policyYear_X" 来标识保单年度
            const policyYearKey = `policyYear_${policyYear}`;
            customAges.add(policyYearKey);
            ageDisplayMap[policyYearKey] = { type: 'policyYear', value: policyYear };
          }
        }
      });

      targetAges = Array.from(customAges).sort((a, b) => {
        // 处理保单年度和年龄的混合排序
        const aIsPolicyYear = typeof a === 'string' && a.startsWith('policyYear_');
        const bIsPolicyYear = typeof b === 'string' && b.startsWith('policyYear_');

        if (aIsPolicyYear && bIsPolicyYear) {
          // 两个都是保单年度，按保单年度数字排序
          const aYear = parseInt(a.split('_')[1]);
          const bYear = parseInt(b.split('_')[1]);
          return aYear - bYear;
        } else if (aIsPolicyYear) {
          // a是保单年度，b是年龄，保单年度排在前面
          return -1;
        } else if (bIsPolicyYear) {
          // b是保单年度，a是年龄，保单年度排在前面
          return 1;
        } else {
          // 两个都是年龄，按数字排序
          return a - b;
        }
      });

      // 如果没有匹配的年龄，提示用户
      if (targetAges.length === 0) {
        alert('输入的年龄或保单年度在文档中没有对应数据，请检查输入');
        return;
      }
    } else {
      // 默认逻辑：自动选择关键年龄点
      targetAges = sortedAges.filter((age, index, arr) => {
        // 保留关键节点：首、尾、以及均匀分布的中间节点
        if (index === 0 || index === arr.length - 1) return true;
        // 每5年取一个点，或者特殊年龄（33, 65, 75, 90, 100）
        return age % 5 === 0 || [33, 65, 75, 90, 100].includes(age);
      }).slice(0, 15); // 最多显示15个年龄点
    }

    // 提取对比数据
    const comparison = selectedDocs.map(doc => {
      const years = doc.table1?.years || [];
      const ageData = {};

      targetAges.forEach(targetAgeOrKey => {
        const currentAge = doc.insured_age || 0;
        let yearData;

        // 判断是保单年度键还是年龄
        if (typeof targetAgeOrKey === 'string' && targetAgeOrKey.startsWith('policyYear_')) {
          // 是保单年度键
          const policyYearValue = parseInt(targetAgeOrKey.split('_')[1]);

          // 在数据中查找对应的保单年度
          yearData = years.find(y => {
            const policyYear = y.policy_year;
            // 纯数字匹配保单年度
            if (typeof policyYear === 'number') {
              return policyYear === policyYearValue;
            }
            return false;
          });
        } else {
          // 是年龄
          const targetAge = targetAgeOrKey;
          const targetPolicyYear = targetAge - currentAge;

          // 遍历所有记录，尝试两种匹配方式
          yearData = years.find(y => {
            const policyYear = y.policy_year;

            // 方式1：检查是否是年龄格式（带"岁"或"歲"）
            if (typeof policyYear === 'string' && /[岁歲]/.test(policyYear)) {
              const match = policyYear.match(/\d+/);
              const age = match ? parseInt(match[0]) : 0;
              return age === targetAge;
            }

            // 方式2：纯数字都按保单年度匹配
            if (typeof policyYear === 'number') {
              return policyYear === targetPolicyYear;
            }

            return false;
          });
        }

        ageData[targetAgeOrKey] = {
          guaranteed: yearData ? (yearData.guaranteed || yearData.guaranteed_cash_value) : undefined,
          total: yearData ? yearData.total : undefined
        };
      });

      return {
        id: doc.id,
        name: doc.insurance_product || doc.file_name,
        insuredName: doc.insured_name || '-',
        company: doc.insurance_company || '-',
        currentAge: doc.insured_age || 0,
        ageData
      };
    });

    setComparisonData({
      products: comparison,
      targetAges,
      ageDisplayMap // 保存显示映射信息
    });
    setShowComparison(true);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert('请选择要删除的文档');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedIds.length} 条记录吗？此操作不可恢复！`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await axios.delete('/api/ocr/documents/delete/', {
        data: { document_ids: selectedIds }
      });
      const data = response.data;

      if (data.status === 'success') {
        alert(`成功删除 ${data.deleted_count} 条记录`);
        setSelectedIds([]);
        fetchDocuments(); // 重新加载列表
      } else {
        alert(`删除失败：${data.message}`);
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除过程中发生错误');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'uploaded': 'bg-blue-100 text-blue-800',
      'processing': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      'uploaded': '已上传',
      'processing': '处理中',
      'completed': '分析完成',
      'failed': '失败'
    };
    return texts[status] || status;
  };

  // 过滤文档
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // 如果正在查看产品对比
  if (showComparison && comparisonData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* 返回按钮 */}
          <div className="mb-4 md:mb-6">
            <button
              onClick={() => setShowComparison(false)}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              返回列表
            </button>
          </div>

          {/* 对比表格 */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-4 md:px-8 md:py-6">
              {/* 标题和显示项按钮 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <h2 className="text-xl md:text-3xl font-bold text-white">产品对比分析</h2>
                  <p className="text-blue-100 mt-1 md:mt-2 text-sm md:text-base">对比 {comparisonData.products.length} 个产品在不同年龄的现金价值</p>
                </div>
                <button
                  onClick={() => setShowColumnSelector(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all text-sm font-semibold text-white whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <span className="hidden sm:inline">显示项</span>
                </button>
              </div>

              {/* 自定义年龄输入框 */}
              <div className="mt-4 flex items-center gap-3">
                <label className="flex items-center gap-2 text-white text-sm">
                  <input
                    type="checkbox"
                    checked={useCustomAges}
                    onChange={(e) => setUseCustomAges(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span>自定义显示年龄</span>
                </label>
                {useCustomAges && (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={customAgesInput}
                      onChange={(e) => setCustomAgesInput(e.target.value)}
                      placeholder="例如: 1,2,3,33岁,65歲 (纯数字=保单年度，带岁=年龄)"
                      className="flex-1 px-3 py-2 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white"
                    />
                    <button
                      onClick={() => handleCompareProducts(selectedIds)}
                      className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      应用
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 所有产品的受保人信息 */}
            {comparisonData.products.length > 0 && (
              <div className="px-4 md:px-8 py-3 bg-blue-50 border-b border-blue-200">
                <div className="text-xs md:text-sm text-gray-700">
                  <span className="font-medium">受保人信息：</span>
                  {comparisonData.products.map((product, index) => {
                    const doc = documents.find(d => d.id === product.id);
                    return (
                      <span key={product.id}>
                        <span className="font-semibold text-indigo-700"> {index + 1}. {product.name}</span>
                        <span> ({product.insuredName} | {product.currentAge}岁 / {doc?.insured_gender || '-'} | 年缴: {doc?.annual_premium ? parseInt(doc.annual_premium).toLocaleString('zh-CN') : '-'} | 缴费期: {doc?.payment_years ? `${doc.payment_years}年` : '-'})</span>
                        {index < comparisonData.products.length - 1 && <span className="mx-1">•</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-2 md:p-8 overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-gray-700 sticky left-0 bg-white z-10 border-r-2 border-gray-300">保单年度/年龄</th>
                    {comparisonData.products.map((product, index) => (
                      <th key={product.id} className={`px-2 md:px-4 py-2 md:py-3 text-center ${index < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`} colSpan={getVisibleColumnCount()}>
                        <div className="text-xs md:text-sm font-semibold text-gray-700 truncate" title={product.name}>{product.name}</div>
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-2 md:px-4 py-1 md:py-2 text-left text-xs font-medium text-gray-600 sticky left-0 bg-gray-50 z-10 border-r-2 border-gray-300"></th>
                    {comparisonData.products.map((product, pIndex) => (
                      <React.Fragment key={`${product.id}-headers`}>
                        {visibleColumns.premiumsPaid && (
                          <th className="px-2 md:px-4 py-1 md:py-2 text-center text-xs font-medium text-gray-600 whitespace-nowrap">
                            已缴保费
                          </th>
                        )}
                        {visibleColumns.guaranteed && (
                          <th className="px-2 md:px-4 py-1 md:py-2 text-center text-xs font-medium text-gray-600 whitespace-nowrap">
                            保证价值
                          </th>
                        )}
                        {visibleColumns.total && (
                          <th className="px-2 md:px-4 py-1 md:py-2 text-center text-xs font-medium text-gray-600 whitespace-nowrap">
                            预期价值
                          </th>
                        )}
                        {visibleColumns.simpleReturn && (
                          <th className="px-2 md:px-4 py-1 md:py-2 text-center text-xs font-medium text-gray-600 whitespace-nowrap">
                            年化单利
                          </th>
                        )}
                        {visibleColumns.irr && (
                          <th className={`px-2 md:px-4 py-1 md:py-2 text-center text-xs font-medium text-gray-600 whitespace-nowrap ${pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                            IRR
                          </th>
                        )}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.targetAges.map(ageOrKey => {
                    // 根据 ageDisplayMap 决定如何显示
                    const displayInfo = comparisonData.ageDisplayMap?.[ageOrKey];
                    let displayText;
                    if (displayInfo?.type === 'policyYear') {
                      // 保单年度：显示纯数字
                      displayText = displayInfo.value;
                    } else if (displayInfo?.type === 'age') {
                      displayText = `${ageOrKey}岁`; // 年龄：显示"XX岁"
                    } else {
                      displayText = `${ageOrKey}岁`; // 默认显示年龄格式
                    }

                    return (
                      <tr key={ageOrKey} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10 border-r-2 border-gray-300">
                          {displayText}
                        </td>
                      {comparisonData.products.map((product, pIndex) => {
                        const doc = documents.find(d => d.id === product.id);
                        const annualPremium = doc?.annual_premium ? parseInt(doc.annual_premium) : 0;
                        const paymentYears = doc?.payment_years ? parseInt(doc.payment_years) : 0;
                        const totalValue = product.ageData[ageOrKey]?.total;

                        // 计算持有年数
                        let holdingYears = 0;
                        if (displayInfo?.type === 'policyYear') {
                          holdingYears = displayInfo.value;
                        } else {
                          // 年龄格式，需要计算保单年度
                          const age = typeof ageOrKey === 'string' ? parseInt(ageOrKey.replace(/[^\d]/g, '')) : ageOrKey;
                          holdingYears = age - product.currentAge;
                        }

                        // 计算实际投入 = 年缴保费 × min(持有年数, 缴费年数)
                        const actualInvestment = annualPremium * Math.min(holdingYears, paymentYears);

                        // 计算年化单利
                        const simpleReturn = calculateSimpleAnnualizedReturn(totalValue, actualInvestment, holdingYears);

                        // 计算IRR（使用修正版：考虑期初缴费）
                        const irr = calculateIRR(annualPremium, paymentYears, totalValue, holdingYears);

                        return (
                          <React.Fragment key={`${product.id}-${ageOrKey}`}>
                            {visibleColumns.premiumsPaid && (
                              <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-orange-700 font-semibold text-center whitespace-nowrap">
                                {actualInvestment > 0 ? actualInvestment.toLocaleString('zh-CN') : '-'}
                              </td>
                            )}
                            {visibleColumns.guaranteed && (
                              <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-900 font-medium text-center whitespace-nowrap">
                                {product.ageData[ageOrKey]?.guaranteed !== undefined && product.ageData[ageOrKey]?.guaranteed !== null
                                  ? parseInt(product.ageData[ageOrKey].guaranteed).toLocaleString('zh-CN')
                                  : '-'}
                              </td>
                            )}
                            {visibleColumns.total && (
                              <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-indigo-900 font-medium text-center whitespace-nowrap">
                                {product.ageData[ageOrKey]?.total !== undefined && product.ageData[ageOrKey]?.total !== null
                                  ? parseInt(product.ageData[ageOrKey].total).toLocaleString('zh-CN')
                                  : '-'}
                              </td>
                            )}
                            {visibleColumns.simpleReturn && (
                              <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-purple-700 font-medium text-center whitespace-nowrap">
                                {simpleReturn !== null ? `${simpleReturn.toFixed(2)}%` : '-'}
                              </td>
                            )}
                            {visibleColumns.irr && (
                              <td className={`px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-green-700 font-bold text-center whitespace-nowrap ${pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                                {irr !== null ? `${irr.toFixed(2)}%` : '-'}
                              </td>
                            )}
                          </React.Fragment>
                        );
                      })}
                      </tr>
                    );
                  })}
                  {/* 100岁增长倍数 */}
                  <tr className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-200">
                    <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm font-bold text-green-800 whitespace-nowrap sticky left-0 bg-gradient-to-r from-green-50 to-emerald-50 z-10 border-r-2 border-gray-300">
                      增长倍数
                    </td>
                    {comparisonData.products.map((product, pIndex) => {
                      const doc = documents.find(d => d.id === product.id);
                      const annualPremium = doc?.annual_premium ? parseInt(doc.annual_premium) : 0;
                      const paymentYears = doc?.payment_years ? parseInt(doc.payment_years) : 0;
                      const valueAt100 = product.ageData[100]?.total || 0;
                      const holdingYearsAt100 = 100 - product.currentAge;

                      // 计算实际投入（100岁时）
                      const actualInvestment = annualPremium * Math.min(holdingYearsAt100, paymentYears);
                      const growthRate = actualInvestment > 0 ? (valueAt100 / actualInvestment).toFixed(2) : '-';

                      return (
                        <React.Fragment key={`${product.id}-growth`}>
                          {visibleColumns.premiumsPaid && (
                            <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-orange-700 font-semibold text-center whitespace-nowrap">
                              {actualInvestment > 0 ? actualInvestment.toLocaleString('zh-CN') : '-'}
                            </td>
                          )}
                          {visibleColumns.guaranteed && (
                            <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-gray-500 text-center whitespace-nowrap">
                              -
                            </td>
                          )}
                          {visibleColumns.total && (
                            <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm font-bold text-green-700 text-center whitespace-nowrap">
                              {growthRate !== '-' ? `${growthRate}x` : '-'}
                            </td>
                          )}
                          {visibleColumns.simpleReturn && (
                            <td className="px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-gray-500 text-center whitespace-nowrap">
                              -
                            </td>
                          )}
                          {visibleColumns.irr && (
                            <td className={`px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm text-gray-500 text-center whitespace-nowrap ${pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                              -
                            </td>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tr>
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
                    已选择 <span className="font-bold text-indigo-600">{getVisibleColumnCount()}</span> / 5 项
                  </div>
                </div>

                {/* 列选项 */}
                <div className="p-3 space-y-2">
                  <label className="flex items-center gap-3 p-2.5 bg-orange-50 rounded-lg hover:bg-orange-100 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.premiumsPaid}
                      onChange={() => handleToggleColumn('premiumsPaid')}
                      className="w-4 h-4 rounded text-orange-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">已缴保费</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.guaranteed}
                      onChange={() => handleToggleColumn('guaranteed')}
                      className="w-4 h-4 rounded text-gray-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">保证价值</div>
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
                      <div className="text-sm font-semibold text-gray-900">预期价值</div>
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
                      <div className="text-sm font-semibold text-gray-900">年化单利</div>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 pt-4 pb-8">
      <div className="max-w-[95%] mx-auto">
        {/* 头部 */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="mb-2 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg shadow hover:shadow-md transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>

          {/* 計畫書分析與比對工具标题 */}
          <div className="mb-3 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">計畫書分析與比對工具</h1>
          </div>

          {/* 统计信息和添加按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-indigo-600">{filteredDocuments.length}</div>
              <div className="text-sm text-gray-600">份计划书</div>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('plan-analyzer')}
              className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
            >
              <FileText className="w-4 h-4" />
              <span className="font-medium text-sm">添加计划书</span>
            </button>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 mb-6">
          {/* 搜索框、状态筛选和刷新按钮 */}
          <div className="flex items-center gap-2">
            {/* 搜索框 */}
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 md:pl-10 pr-2 md:pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base"
              />
            </div>

            {/* 状态筛选 */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 md:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base"
            >
              <option value="all">全部</option>
              <option value="uploaded">已上传</option>
              <option value="processing">处理中</option>
              <option value="completed">分析完成</option>
              <option value="failed">失败</option>
            </select>

            {/* 刷新按钮 */}
            <button
              onClick={fetchDocuments}
              disabled={loading}
              className="flex items-center justify-center gap-1 px-3 md:px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow text-sm md:text-base font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">刷新</span>
            </button>
          </div>

          {/* 操作按钮（仅在有选中时显示） */}
          {selectedIds.length > 0 && (
            <div className="flex gap-2 md:gap-4 mt-3">
              {/* 产品对比按钮 */}
              <button
                onClick={handleCompareProducts}
                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 text-sm md:text-base md:px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <GitCompare className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">产品对比</span>
                <span className="sm:hidden">对比</span>
                <span>({selectedIds.length})</span>
              </button>

              {/* 批量删除按钮 */}
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 text-sm md:text-base md:px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                    <span className="hidden sm:inline">删除中...</span>
                    <span className="sm:hidden">删除...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">删除</span>
                    <span className="sm:hidden">删除</span>
                    <span>({selectedIds.length})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 文档列表 - 表格形式 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600 mb-2">暂无计划书</p>
            <p className="text-gray-500">使用计划书智能分析工具上传并解析文档</p>
          </div>
        ) : (
          <>
            {/* 桌面端表格视图 */}
            <div className="hidden md:block bg-white rounded-xl shadow-lg overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredDocuments.length && filteredDocuments.length > 0}
                        onChange={handleSelectAll}
                        className="w-3 h-3 md:w-4 md:h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      文件名
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分析状态
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      受保人
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      年龄
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      性别
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      保险公司
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      产品
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      保额
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      年缴保费
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      缴费期
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      年度表
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      计划书概要
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => (
                    <React.Fragment key={doc.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 md:px-4 py-2 md:py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(doc.id)}
                          onChange={() => handleSelectOne(doc.id)}
                          className="w-3 h-3 md:w-4 md:h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 max-w-xs cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        <div className="flex items-center">
                          <FileText className="w-3 h-3 md:w-4 md:h-4 text-indigo-600 mr-1 md:mr-2 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 truncate" title={doc.file_name}>
                            {doc.file_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-center cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        <span className={`px-1.5 md:px-2 py-0.5 md:py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                          {getStatusText(doc.status)}
                        </span>
                      </td>
                      <td className="px-0.5 md:px-4 py-2 md:py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-0.5 md:gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewProgress(doc.id);
                            }}
                            className="inline-flex items-center justify-center gap-0.5 w-7 h-7 md:w-auto md:h-auto md:px-2 md:py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                            title="查看处理进度"
                          >
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="hidden lg:inline">进度</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPDF(doc);
                            }}
                            disabled={!doc.file_path}
                            className="inline-flex items-center justify-center gap-0.5 w-7 h-7 md:w-auto md:h-auto md:px-2 md:py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            title={doc.file_path ? "下载PDF" : "PDF文件不存在"}
                          >
                            <Download className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="hidden lg:inline">下载</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAssistant(doc);
                            }}
                            className="inline-flex items-center justify-center gap-0.5 w-7 h-7 md:w-auto md:h-auto md:px-2 md:py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs rounded hover:from-cyan-700 hover:to-blue-700 transition-colors whitespace-nowrap"
                            title="计划书助手"
                          >
                            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="hidden lg:inline">助手</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDocument(doc);
                            }}
                            className="inline-flex items-center justify-center gap-0.5 w-7 h-7 md:w-auto md:h-auto md:px-2 md:py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors whitespace-nowrap"
                            title="查看详情"
                          >
                            <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="hidden lg:inline">详情</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-sm text-gray-700 cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        {doc.insured_name || '-'}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-sm text-gray-700 text-center cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        {doc.insured_age || '-'}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-sm text-gray-700 text-center cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        {doc.insured_gender || '-'}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-sm text-gray-700 cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        {doc.insurance_company || '-'}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 max-w-xs text-sm text-gray-700 cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        <div className="truncate" title={doc.insurance_product}>
                          {doc.insurance_product || '-'}
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        {doc.sum_assured ? parseInt(doc.sum_assured).toLocaleString('zh-CN') : '-'}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        {doc.annual_premium ? parseInt(doc.annual_premium).toLocaleString('zh-CN') : '-'}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-sm text-gray-700 text-center cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        {doc.payment_years ? `${doc.payment_years}年` : '-'}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-center cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        {(() => {
                          // 检查table1是否有数据
                          let hasTable1 = false;
                          let recordCount = 0;

                          if (doc.table1) {
                            if (typeof doc.table1 === 'object' && doc.table1.years && Array.isArray(doc.table1.years)) {
                              hasTable1 = doc.table1.years.length > 0;
                              recordCount = doc.table1.years.length;
                            } else if (typeof doc.table1 === 'string' && doc.table1.trim().length > 0) {
                              hasTable1 = true;
                              recordCount = 0; // 字符串格式无法获取条数
                            }
                          }

                          if (hasTable1) {
                            return (
                              <span className="px-1.5 md:px-2 py-0.5 md:py-1 text-sm font-semibold bg-green-100 text-green-800 rounded-full">
                                {recordCount > 0 ? `${recordCount}条` : '已分析'}
                              </span>
                            );
                          } else {
                            return <span className="text-gray-400 text-sm">未分析</span>;
                          }
                        })()}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 max-w-md cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        {(() => {
                          let summaryText = '';
                          if (doc.summary) {
                            try {
                              // 尝试解析JSON字符串
                              if (typeof doc.summary === 'string') {
                                const parsed = JSON.parse(doc.summary);
                                summaryText = parsed.summary || doc.summary;
                              } else if (typeof doc.summary === 'object') {
                                // 如果是对象，提取summary字段
                                summaryText = doc.summary.summary || '';
                              }
                            } catch (e) {
                              // JSON解析失败，如果是字符串则直接使用
                              if (typeof doc.summary === 'string') {
                                summaryText = doc.summary;
                              }
                            }
                          }

                          // 确保summaryText是字符串且非空
                          if (summaryText && typeof summaryText === 'string' && summaryText.trim()) {
                            return (
                              <div className="text-sm text-gray-700 line-clamp-2" title={summaryText}>
                                {summaryText}
                              </div>
                            );
                          } else {
                            return <span className="text-gray-400 text-sm">未提取</span>;
                          }
                        })()}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-sm text-gray-500 cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        {new Date(doc.created_at).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 手机端卡片视图 */}
            <div className="md:hidden space-y-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl shadow-lg p-4 cursor-pointer hover:shadow-xl transition-shadow"
                  onClick={() => handleViewDocument(doc)}
                >
                  {/* 顶部：时间、状态 */}
                  <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                    <span>
                      {new Date(doc.created_at).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                      {getStatusText(doc.status)}
                    </span>
                  </div>

                  {/* 文件名和选框 */}
                  <div className="flex items-start gap-2 mb-2 pb-2 border-b border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(doc.id)}
                      onChange={() => handleSelectOne(doc.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 mt-0.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-gray-900 break-words line-clamp-1">{doc.file_name}</span>
                    </div>
                  </div>

                  {/* 受保人信息 */}
                  <div className="mb-1.5 pb-1.5 border-b border-gray-200">
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-700">
                      <span><span className="text-gray-500">受保人：</span><span className="font-medium">{doc.insured_name || '-'}</span></span>
                      <span className="text-gray-300">|</span>
                      <span><span className="text-gray-500">年龄：</span>{doc.insured_age || '-'}</span>
                      <span className="text-gray-300">|</span>
                      <span><span className="text-gray-500">性别：</span>{doc.insured_gender || '-'}</span>
                    </div>
                  </div>

                  {/* 保险信息 */}
                  <div className="mb-1.5 pb-1.5 border-b border-gray-200">
                    <div className="text-xs">
                      <span className="text-gray-500">保险公司：</span>
                      <span className="font-medium text-gray-900">{doc.insurance_company || '-'}</span>
                      <span className="text-gray-300 mx-1">|</span>
                      <span className="text-gray-500">产品：</span>
                      <span className="font-medium text-gray-900">{doc.insurance_product || '-'}</span>
                    </div>
                  </div>

                  {/* 保费信息 */}
                  <div className="mb-1.5 pb-1.5 border-b border-gray-200">
                    <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-xs">
                      <div>
                        <span className="text-gray-500">保额：</span>
                        <span className="font-bold text-gray-900">{doc.sum_assured ? parseInt(doc.sum_assured).toLocaleString('zh-CN') : '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">年缴：</span>
                        <span className="font-bold text-gray-900">{doc.annual_premium ? parseInt(doc.annual_premium).toLocaleString('zh-CN') : '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">缴费期：</span>
                        <span className="font-medium text-gray-900">{doc.payment_years ? `${doc.payment_years}年` : '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 计划书概要 */}
                  <div className="mb-3">
                    {(() => {
                      let summaryText = '';
                      if (doc.summary) {
                        try {
                          // 尝试解析JSON字符串
                          if (typeof doc.summary === 'string') {
                            const parsed = JSON.parse(doc.summary);
                            summaryText = parsed.summary || doc.summary;
                          } else if (typeof doc.summary === 'object') {
                            // 如果是对象，提取summary字段
                            summaryText = doc.summary.summary || '';
                          }
                        } catch (e) {
                          // JSON解析失败，如果是字符串则直接使用
                          if (typeof doc.summary === 'string') {
                            summaryText = doc.summary;
                          }
                        }
                      }

                      // 确保summaryText是字符串且非空
                      if (summaryText && typeof summaryText === 'string' && summaryText.trim()) {
                        return (
                          <div className="text-xs text-gray-600">
                            <span className="text-gray-500">概要：</span>
                            <span className="line-clamp-2">{summaryText}</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-xs text-gray-400">
                            <span className="text-gray-500">概要：</span>未提取
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-1.5 pt-3 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProgress(doc.id);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>进度</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAssistant(doc);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-colors whitespace-nowrap"
                    >
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>助手</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDocument(doc);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                    >
                      <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>详情</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPDF(doc);
                      }}
                      disabled={!doc.file_path}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      title={doc.file_path ? "下载PDF" : "PDF文件不存在"}
                    >
                      <Download className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>下载</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 进度查看模态框 */}
      {showProgressModal && progressModalDocId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* 头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-600" />
                文档处理进度
              </h2>
              <button
                onClick={() => setShowProgressModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-4 md:p-6">
              {documentProgress[progressModalDocId] ? (() => {
                const progress = documentProgress[progressModalDocId];
                const currentStage = progress.processing_stage || '';
                const doc = documents.find(d => d.id === progressModalDocId);

                return (
                  <div className="space-y-6">
                    {/* 文档信息 */}
                    {doc && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <span className="font-semibold text-gray-800">{doc.file_name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          ID: {doc.id} • 创建于 {new Date(doc.created_at).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    )}

                    {/* 总体进度 */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-800">总体进度</h3>
                        <span className="text-2xl font-bold text-blue-700">{progress.progress_percentage}%</span>
                      </div>
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${progress.progress_percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* 任务列表 */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-4">任务详情</h3>
                      <div className="space-y-3">
                        {[
                          { id: 'tablecontent', label: '📄 提取表格源代码', stages: ['extracting_tablecontent'], completedStages: ['tablecontent_completed', 'extracting_tablesummary', 'tablesummary_completed', 'extracting_table_html', 'all_completed'] },
                          { id: 'tablesummary', label: '📋 分析表格结构', stages: ['extracting_tablesummary'], completedStages: ['tablesummary_completed', 'extracting_table_html', 'all_completed'] },
                          { id: 'table_html', label: '📊 提取表格HTML', stages: ['extracting_table_html'], completedStages: ['all_completed'] }
                        ].map(({ id, label, stages, completedStages }) => {
                          const isProcessing = stages.includes(currentStage);
                          const isCompleted = completedStages.includes(currentStage);

                          return (
                            <div
                              key={id}
                              className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                                isCompleted ? 'bg-green-50 border-2 border-green-300' :
                                isProcessing ? 'bg-blue-50 border-2 border-blue-300 shadow-lg' :
                                'bg-gray-50 border-2 border-gray-200'
                              }`}
                            >
                              {/* 状态图标 */}
                              {isCompleted ? (
                                <CheckCircle className="h-7 w-7 text-green-600 flex-shrink-0" />
                              ) : isProcessing ? (
                                <Loader2 className="h-7 w-7 text-blue-600 animate-spin flex-shrink-0" />
                              ) : (
                                <div className="h-7 w-7 border-2 border-gray-300 rounded-full flex-shrink-0" />
                              )}

                              {/* 任务名称 */}
                              <span className={`text-base flex-1 ${
                                isCompleted ? 'text-green-800 font-semibold line-through' :
                                isProcessing ? 'text-blue-900 font-bold' :
                                'text-gray-600'
                              }`}>
                                {label}
                              </span>

                              {/* 状态标签 */}
                              {isCompleted && (
                                <span className="text-sm px-3 py-1 bg-green-500 text-white rounded-full font-semibold">
                                  ✓ 完成
                                </span>
                              )}
                              {isProcessing && (
                                <span className="text-sm px-3 py-1 bg-blue-500 text-white rounded-full font-semibold animate-pulse">
                                  ⟳ 进行中
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 状态信息 */}
                    <div className="space-y-3">
                      {progress.error_message && (
                        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl">
                          <p className="text-sm text-red-800 font-medium">
                            <span className="font-bold">错误：</span> {progress.error_message}
                          </p>
                        </div>
                      )}

                      {progress.last_processed_at && (
                        <div className="text-sm text-gray-500 text-center">
                          最后更新: {new Date(progress.last_processed_at).toLocaleString('zh-CN')}
                        </div>
                      )}

                      {currentStage === 'all_completed' && (
                        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-xl text-center">
                          <p className="text-green-800 font-bold text-lg">🎉 所有任务已完成！</p>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleViewProgress(progressModalDocId)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        刷新进度
                      </button>
                      <button
                        onClick={() => {
                          setShowProgressModal(false);
                          const doc = documents.find(d => d.id === progressModalDocId);
                          if (doc) handleViewDocument(doc);
                        }}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        查看详情
                      </button>
                    </div>
                  </div>
                );
              })() : (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlanDocumentManagement;
