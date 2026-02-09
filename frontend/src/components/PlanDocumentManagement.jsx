import React, { useState, useEffect } from 'react';
import { FileText, Eye, Calendar, ArrowLeft, Loader2, Search, Trash2, GitCompare, RefreshCw, Clock, X, CheckCircle, MessageSquare, Download, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../hooks/useAppNavigate';
import axios from 'axios';
import * as XLSX from 'xlsx';

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
  const [customAgesInput, setCustomAgesInput] = useState('1,2,3,4,5,6,7,8,9,10-100');
  const [useCustomAges, setUseCustomAges] = useState(true);
  const [documentProgress, setDocumentProgress] = useState({}); // 存储每个文档的处理进度
  const [showProgressModal, setShowProgressModal] = useState(false); // 显示进度模态框
  const [progressModalDocId, setProgressModalDocId] = useState(null); // 当前查看进度的文档ID
  const [loadingTimeout, setLoadingTimeout] = useState(false); // 加载超时标记
  const [showSearchBar, setShowSearchBar] = useState(false); // 控制搜索框显示
  const [dailyQuota, setDailyQuota] = useState(null); // 每日限额状态

  // 分页相关状态（服务端分页）
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // 每页10条
  const [totalCount, setTotalCount] = useState(0); // 总记录数
  const [totalPages, setTotalPages] = useState(0); // 总页数

  // 列显示控制（可自定义）
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    // 从 localStorage 读取保存的设置
    const saved = localStorage.getItem('planManagementVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('解析列设置失败:', e);
      }
    }
    // 默认只显示提取总额和退保价值
    return {
      total_premiums_paid: false,                  // 已缴保费
      guaranteed_cash_value: false,                // 保证现金价值
      non_guaranteed_cash_value: false,            // 非保证现金价值
      total_cash_value: false,                     // 总现金价值
      withdrawal_amount: true,                     // 提取总额
      surrender_value_after_withdrawal: true       // 退保价值
    };
  });

  // 辅助函数：安全地将字符串或数字转换为整数，移除千位分隔符
  const safeParseInt = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'string') {
      // 移除千位分隔符（逗号）和空格
      const cleaned = value.replace(/,/g, '').replace(/\s/g, '');
      const parsed = parseInt(cleaned, 10);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  // 辅助函数：格式化数字显示（添加千位分隔符）
  const formatNumber = (value) => {
    const num = safeParseInt(value);
    return num !== null ? num.toLocaleString('zh-CN') : '-';
  };

  useEffect(() => {
    // 设置页面标题
    const originalTitle = document.title;
    document.title = '计划书分析与对比工具';

    console.log('📄 [PlanDocumentManagement] useEffect触发 - authLoading:', authLoading, 'user:', user);
    // 等待认证完成后再获取文档列表
    if (!authLoading) {
      console.log('📄 [PlanDocumentManagement] 认证完成，开始获取文档列表');
      fetchDocuments(1); // 初始加载第1页
    } else {
      console.log('📄 [PlanDocumentManagement] 认证中，等待完成...');
    }

    // 组件卸载时恢复原标题
    return () => {
      document.title = originalTitle;
    };
  }, [authLoading, user]);

  // 监听搜索和筛选条件变化，重新获取第1页数据
  useEffect(() => {
    if (!authLoading) {
      console.log('🔍 搜索或筛选条件变化，重新获取第1页数据');
      fetchDocuments(1);
    }
  }, [searchTerm, filterStatus]);

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

  // 获取每日限额状态
  const fetchDailyQuota = async () => {
    try {
      const response = await axios.get('/api/ocr/daily-quota/');
      if (response.data.status === 'success') {
        setDailyQuota(response.data.data);
        console.log('📊 每日限额:', response.data.data);
      }
    } catch (error) {
      console.error('❌ 获取每日限额失败:', error);
    }
  };

  // 监听用户认证状态，获取每日限额
  useEffect(() => {
    if (!authLoading && user) {
      fetchDailyQuota();
    }
  }, [authLoading, user]);

  const fetchDocuments = async (page = currentPage) => {
    setLoading(true);
    setLoadingTimeout(false);

    // 切换页面时清空选中的文档（避免选中的是其他页的文档）
    if (page !== currentPage) {
      setSelectedIds([]);
    }

    // 设置15秒超时提示
    const timeoutTimer = setTimeout(() => {
      if (loading) {
        setLoadingTimeout(true);
      }
    }, 15000);

    try {
      // 构建查询参数（服务端分页）
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      // 添加搜索参数
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      // 添加状态筛选参数
      if (filterStatus && filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      const url = `/api/ocr/documents/?${params.toString()}`;
      console.log('📊 获取文档列表 - user:', user, 'page:', page, 'search:', searchTerm, 'status:', filterStatus);
      console.log('📡 请求URL:', url);

      // 添加超时控制（30秒）
      const response = await axios.get(url, {
        timeout: 30000
      });
      const data = response.data;
      console.log('📦 API返回数据:', data);

      if (data.status === 'success') {
        setDocuments(data.data || []);
        setTotalCount(data.total_count || 0);
        setTotalPages(data.total_pages || 0);
        setCurrentPage(data.current_page || page);
        console.log(`✅ 第 ${data.current_page}/${data.total_pages} 页，本页 ${data.count} 条，共 ${data.total_count} 条记录`);
      }
    } catch (error) {
      console.error('获取文档列表失败:', error);
      if (error.response?.status === 401) {
        console.error('❌ 认证失败，token已过期，正在尝试刷新...');
        // Token过期会自动触发刷新，等待2秒后重试一次
        setTimeout(() => {
          console.log('🔄 重新尝试获取文档列表...');
          fetchDocuments(page);
        }, 2000);
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.error('❌ 请求超时，网络响应缓慢');
        alert('网络响应缓慢，请检查网络连接后重试');
      }
    } finally {
      clearTimeout(timeoutTimer);
      setLoading(false);
      setLoadingTimeout(false);
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
      // 只选择当前页的文档
      setSelectedIds(paginatedDocuments.map(doc => doc.id));
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
        console.log('table1.data:', doc.table1.data);
        console.log('data是数组:', Array.isArray(doc.table1.data));
        console.log('data长度:', doc.table1.data?.length);
      }

      // 判断table1是否有值：支持三种格式
      // 1. 新格式（Gemini）: {policy_info: {...}, surrender_value_table: [...]}
      // 2. 标准格式: {table_name: "...", fields: [...], data: [...], policy_info: {...}}
      // 3. 旧格式: {data: [...], fields: [...]}
      let hasTable = false;
      let table1Obj = null;

      if (doc.table1) {
        // 统一转换为对象
        if (typeof doc.table1 === 'string') {
          try {
            table1Obj = JSON.parse(doc.table1);
            console.log('table1是字符串，解析后的keys:', Object.keys(table1Obj));
          } catch (e) {
            // 不是JSON，检查是否为非空字符串
            hasTable = doc.table1.trim().length > 0;
            console.log('table1是非JSON字符串，长度:', doc.table1.trim().length);
          }
        } else if (typeof doc.table1 === 'object') {
          table1Obj = doc.table1;
          console.log('table1是对象，keys:', Object.keys(table1Obj));
        }

        // 检查对象中是否有有效数据
        if (table1Obj) {
          // 格式1：新格式（Gemini）
          if (table1Obj.surrender_value_table &&
              Array.isArray(table1Obj.surrender_value_table) &&
              table1Obj.surrender_value_table.length > 0) {
            hasTable = true;
            console.log('✅ 检测到新格式（surrender_value_table），长度:', table1Obj.surrender_value_table.length);
          }
          // 格式2 & 3：标准格式/旧格式（有data数组）
          else if (table1Obj.data &&
                   Array.isArray(table1Obj.data) &&
                   table1Obj.data.length > 1) {
            hasTable = true;
            console.log('✅ 检测到data格式，data长度:', table1Obj.data.length);
          }
          // 没有匹配的格式
          else {
            console.log('❌ table1存在但格式不匹配');
            console.log('   - 有surrender_value_table?', !!table1Obj.surrender_value_table);
            console.log('   - 有data?', !!table1Obj.data);
            console.log('   - data是数组?', Array.isArray(table1Obj.data));
            console.log('   - data长度:', table1Obj.data?.length);
          }
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
      const currentAge = doc.insured_age || 0;
      let tableData = [];

      // 解析 table1 数据，支持新旧两种格式
      const table1 = typeof doc.table1 === 'string' ? JSON.parse(doc.table1) : doc.table1;

      if (table1.surrender_value_table && Array.isArray(table1.surrender_value_table)) {
        // 新格式：JSON 对象数组
        tableData = table1.surrender_value_table;
        tableData.forEach(row => {
          const policyYear = row['保单年度'] || row['保單年度'] || row.policy_year;
          if (policyYear) {
            // 保单年度转换为年龄
            allAges.add(currentAge + parseInt(policyYear) - 1);
          }
        });
      } else if (table1.data && Array.isArray(table1.data)) {
        // 旧格式：二维数组
        tableData = table1.data;
        const fields = table1.fields || [];

        // 第一行是英文字段名，从第二行开始才是数据
        const dataRows = tableData.slice(1);

        // 从data数组的第一行（英文字段名）找到policy_year字段的索引
        const englishFields = tableData[0] || [];
        const policyYearIndex = englishFields.findIndex(f =>
          f === 'policy_year' || (typeof f === 'string' && f.toLowerCase().includes('policy_year'))
        );

        dataRows.forEach(row => {
          const policyYear = policyYearIndex >= 0 ? row[policyYearIndex] : row[0];

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
      }
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
        // 检查是否为范围格式 (例如: "1-9" 或 "20-40" 或 "1 - 6")
        if (input.includes('-') && !/[岁歲]/.test(input)) {
          const parts = input.split('-').map(p => p.trim()).filter(p => p);
          if (parts.length === 2) {
            const start = parseInt(parts[0]);
            const end = parseInt(parts[1]);
            if (!isNaN(start) && !isNaN(end) && start <= end) {
              // 展开范围内的所有年度（保单年度）
              for (let policyYear = start; policyYear <= end; policyYear++) {
                const policyYearKey = `policyYear_${policyYear}`;
                customAges.add(policyYearKey);
                ageDisplayMap[policyYearKey] = { type: 'policyYear', value: policyYear };
              }
            }
          }
        }
        // 检查是否带"岁"或"歲"
        else if (/[岁歲]/.test(input)) {
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
      // ⚠️ 修复：先解析 table1 字符串为对象
      let table1Obj = doc.table1;
      if (typeof doc.table1 === 'string') {
        try {
          table1Obj = JSON.parse(doc.table1);
        } catch (e) {
          console.error('❌ 解析 table1 失败:', doc.file_name, e);
          table1Obj = {};
        }
      }

      const tableData = table1Obj?.data || [];
      const ageData = {};

      // 第一行是英文字段名，从第二行开始才是数据
      const englishFields = tableData[0] || [];
      const dataRows = tableData.slice(1);

      // 从英文字段名行找到各字段的索引（支持多种字段名）
      const fieldIndexes = {
        policy_year: englishFields.findIndex(f => f === 'policy_year'),
        age: englishFields.findIndex(f => f === 'age'),
        total_premiums_paid: englishFields.findIndex(f =>
          f === 'total_premiums_paid' ||
          f === 'total_premium_paid' ||
          f === 'premiums_paid'
        ),
        guaranteed_cash_value: englishFields.findIndex(f =>
          f === 'guaranteed_cash_value' ||
          f === 'guaranteed'
        ),
        // 非保证现金价值：可能是终期红利或保额增值红利
        non_guaranteed_cash_value: englishFields.findIndex(f =>
          f === 'non_guaranteed_cash_value' ||
          f === 'terminal_bonus_cash_value' ||  // 终期红利
          f === 'reversionary_bonus_cash_value' ||  // 保额增值红利
          f === 'terminal_dividend' ||
          f === 'non_guaranteed'
        ),
        // 总现金价值：退保发还金额总额
        total_cash_value: englishFields.findIndex(f =>
          f === 'total_cash_value' ||
          f === 'surrender_value_after_withdrawal' ||  // 退保发还金额总额（最常见）
          f === 'total_surrender_value' ||
          f === 'total_value' ||
          f === 'total'
        ),
        withdrawal_amount: englishFields.findIndex(f => f === 'withdrawal_amount')
      };

      console.log('📊 文档:', doc.file_name);
      console.log('tableData长度:', tableData.length);
      console.log('英文字段:', englishFields);
      console.log('字段索引:', fieldIndexes);
      console.log('数据行数:', dataRows.length);
      if (dataRows.length > 0) {
        console.log('第一行数据:', dataRows[0]);
        console.log('最后一行数据:', dataRows[dataRows.length - 1]);

        // 详细检查字段索引是否正确
        console.log('🔍 字段匹配检查:');
        console.log('  - total_premiums_paid索引:', fieldIndexes.total_premiums_paid, '→ 值:', dataRows[0][fieldIndexes.total_premiums_paid]);
        console.log('  - guaranteed_cash_value索引:', fieldIndexes.guaranteed_cash_value, '→ 值:', dataRows[0][fieldIndexes.guaranteed_cash_value]);
        console.log('  - non_guaranteed_cash_value索引:', fieldIndexes.non_guaranteed_cash_value, '→ 值:', dataRows[0][fieldIndexes.non_guaranteed_cash_value]);
        console.log('  - total_cash_value索引:', fieldIndexes.total_cash_value, '→ 值:', dataRows[0][fieldIndexes.total_cash_value]);
      }

      // 如果没找到字段，尝试使用默认索引（假设字段顺序）
      if (fieldIndexes.policy_year === -1) fieldIndexes.policy_year = 0;

      targetAges.forEach(targetAgeOrKey => {
        const currentAge = doc.insured_age || 0;
        let rowData = null;

        // 判断是保单年度键还是年龄
        if (typeof targetAgeOrKey === 'string' && targetAgeOrKey.startsWith('policyYear_')) {
          // 是保单年度键
          const policyYearValue = parseInt(targetAgeOrKey.split('_')[1]);

          // 在数据中查找对应的保单年度
          rowData = dataRows.find(row => {
            const policyYear = row[fieldIndexes.policy_year];
            // 纯数字匹配保单年度（支持数字和字符串数字）
            if (typeof policyYear === 'number') {
              return policyYear === policyYearValue;
            }
            if (typeof policyYear === 'string') {
              const yearNum = parseInt(policyYear.replace(/,/g, ''));
              if (!isNaN(yearNum)) {
                return yearNum === policyYearValue;
              }
            }
            return false;
          });
        } else {
          // 是年龄
          const targetAge = targetAgeOrKey;
          const targetPolicyYear = targetAge - currentAge;

          // 遍历所有记录，尝试两种匹配方式
          rowData = dataRows.find(row => {
            const policyYear = row[fieldIndexes.policy_year];

            // 方式1：检查是否是年龄格式（带"岁"或"歲"）
            if (typeof policyYear === 'string' && /[岁歲]/.test(policyYear)) {
              const match = policyYear.match(/\d+/);
              const age = match ? parseInt(match[0]) : 0;
              return age === targetAge;
            }

            // 方式2：纯数字都按保单年度匹配（支持number和string）
            if (typeof policyYear === 'number') {
              return policyYear === targetPolicyYear;
            }

            // 方式3：字符串数字按保单年度匹配
            if (typeof policyYear === 'string') {
              const yearNum = parseInt(policyYear.replace(/,/g, ''));
              if (!isNaN(yearNum)) {
                return yearNum === targetPolicyYear;
              }
            }

            return false;
          });
        }

        // 将行数据转换为对象格式
        let yearData = null;
        if (rowData) {
          console.log(`🔍 提取年龄/年度 ${targetAgeOrKey} 的数据:`);
          console.log('  - rowData:', rowData);
          console.log('  - policy_year [${fieldIndexes.policy_year}]:', rowData[fieldIndexes.policy_year]);
          console.log('  - total_premiums_paid [${fieldIndexes.total_premiums_paid}]:', rowData[fieldIndexes.total_premiums_paid]);
          console.log('  - total_cash_value [${fieldIndexes.total_cash_value}]:', rowData[fieldIndexes.total_cash_value]);

          yearData = {
            policy_year: rowData[fieldIndexes.policy_year],
            age: fieldIndexes.age >= 0 ? rowData[fieldIndexes.age] : undefined,
            total_premiums_paid: fieldIndexes.total_premiums_paid >= 0 ? rowData[fieldIndexes.total_premiums_paid] : undefined,
            guaranteed_cash_value: fieldIndexes.guaranteed_cash_value >= 0 ? rowData[fieldIndexes.guaranteed_cash_value] : undefined,
            non_guaranteed_cash_value: fieldIndexes.non_guaranteed_cash_value >= 0 ? rowData[fieldIndexes.non_guaranteed_cash_value] : undefined,
            total_cash_value: fieldIndexes.total_cash_value >= 0 ? rowData[fieldIndexes.total_cash_value] : undefined,
            withdrawal_amount: fieldIndexes.withdrawal_amount >= 0 ? rowData[fieldIndexes.withdrawal_amount] : undefined
          };

          console.log('  - 提取后的yearData:', yearData);
        } else {
          console.log(`❌ 年龄/年度 ${targetAgeOrKey} 没有找到对应的rowData`);
        }

        ageData[targetAgeOrKey] = {
          policy_year: yearData ? yearData.policy_year : undefined,
          age: yearData ? yearData.age : undefined,
          total_premiums_paid: yearData ? yearData.total_premiums_paid : undefined,
          guaranteed_cash_value: yearData ? yearData.guaranteed_cash_value : undefined,
          non_guaranteed_cash_value: yearData ? yearData.non_guaranteed_cash_value : undefined,
          total_cash_value: yearData ? yearData.total_cash_value : undefined,
          withdrawal_amount: yearData ? (yearData.withdrawal_amount || 0) : 0,
          // 兼容旧的字段名
          surrender_value_after_withdrawal: yearData ? yearData.total_cash_value : undefined
        };

        console.log(`✅ 年龄/年度 ${targetAgeOrKey} 最终数据:`, ageData[targetAgeOrKey]);
      });

      console.log('最终ageData:', ageData);

      return {
        id: doc.id,
        name: doc.insurance_product || doc.file_name,
        insuredName: doc.insured_name || '-',
        company: doc.insurance_company || '-',
        currentAge: doc.insured_age || 0,
        ageData
      };
    });

    console.log('======= 最终对比数据 =======');
    console.log('选中的文档数量:', selectedDocs.length);
    console.log('生成的产品数量:', comparison.length);
    console.log('目标年龄点:', targetAges);
    console.log('目标年龄点数量:', targetAges.length);
    comparison.forEach((product, index) => {
      console.log(`\n产品${index + 1}:`, product.name);
      console.log('  - ID:', product.id);
      console.log('  - 当前年龄:', product.currentAge);
      console.log('  - ageData键数量:', Object.keys(product.ageData).length);
      console.log('  - ageData所有键:', Object.keys(product.ageData));
      if (targetAges.length > 0) {
        console.log('  - 第一个年龄点数据:', product.ageData[targetAges[0]]);
      }
    });

    const comparisonResult = {
      products: comparison,
      targetAges,
      ageDisplayMap // 保存显示映射信息
    };

    // 暴露到window方便调试
    window.comparisonData = comparisonResult;
    console.log('完整对比数据已保存到 window.comparisonData');

    setComparisonData(comparisonResult);
    setShowComparison(true);
  };

  // 导出Excel函数
  const handleExportExcel = () => {
    if (!comparisonData || !comparisonData.products || comparisonData.products.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    try {
      // 准备Excel数据
      const excelData = [];

      // 1. 添加标题行
      excelData.push(['计划书对比统计表']);
      excelData.push(['生成时间: ' + new Date().toLocaleString('zh-CN')]);
      excelData.push([]); // 空行

      // 2. 添加产品基本信息
      excelData.push(['产品基本信息']);
      const infoHeaders = ['序号', '产品名称', '受保人', '当前年龄', '性别', '年缴保费', '缴费期'];
      excelData.push(infoHeaders);

      comparisonData.products.forEach((product, index) => {
        const doc = documents.find(d => d.id === product.id);
        excelData.push([
          index + 1,
          product.name,
          product.insuredName,
          product.currentAge + '岁',
          doc?.insured_gender || '-',
          doc?.annual_premium ? parseInt(doc.annual_premium).toLocaleString('zh-CN') : '-',
          doc?.payment_years ? `${doc.payment_years}年` : '-'
        ]);
      });

      excelData.push([]); // 空行

      // 3. 添加对比数据表格
      excelData.push(['产品对比数据']);

      // 表头第一行：保单年度 + 产品名称（每个产品占3列）
      const headerRow1 = ['保单年度终结'];
      comparisonData.products.forEach(product => {
        headerRow1.push(product.name, '', ''); // 合并3列
      });
      excelData.push(headerRow1);

      // 表头第二行：保单年度 + 字段名称
      const headerRow2 = [''];
      comparisonData.products.forEach(() => {
        headerRow2.push('已缴保费', '提取总额', '退保价值');
      });
      excelData.push(headerRow2);

      // 数据行
      comparisonData.targetAges.forEach(ageOrKey => {
        const displayInfo = comparisonData.ageDisplayMap?.[ageOrKey];
        let displayText;
        if (displayInfo?.type === 'policyYear') {
          displayText = displayInfo.value;
        } else {
          displayText = ageOrKey;
        }

        const row = [displayText];
        comparisonData.products.forEach(product => {
          const ageData = product.ageData[ageOrKey] || {};

          // 已缴保费
          const totalPremiums = ageData.total_premiums_paid !== undefined && ageData.total_premiums_paid !== null
            ? (typeof ageData.total_premiums_paid === 'string'
                ? parseFloat(ageData.total_premiums_paid.replace(/,/g, ''))
                : ageData.total_premiums_paid)
            : 0;

          // 提取总额
          const withdrawal = ageData.withdrawal_amount !== undefined && ageData.withdrawal_amount !== null
            ? (typeof ageData.withdrawal_amount === 'string'
                ? parseFloat(ageData.withdrawal_amount.replace(/,/g, ''))
                : ageData.withdrawal_amount)
            : 0;

          // 退保价值
          const surrenderValue = ageData.surrender_value_after_withdrawal !== undefined && ageData.surrender_value_after_withdrawal !== null
            ? (typeof ageData.surrender_value_after_withdrawal === 'string'
                ? parseFloat(ageData.surrender_value_after_withdrawal.replace(/,/g, ''))
                : ageData.surrender_value_after_withdrawal)
            : 0;

          row.push(totalPremiums, withdrawal, surrenderValue);
        });
        excelData.push(row);
      });

      // 4. 创建工作簿
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // 5. 设置列宽
      const colWidths = [{ wch: 15 }]; // 第一列：保单年度
      comparisonData.products.forEach(() => {
        colWidths.push({ wch: 18 }, { wch: 15 }, { wch: 18 }); // 已缴保费、提取总额、退保价值
      });
      ws['!cols'] = colWidths;

      // 6. 合并单元格
      const merges = [];

      // 合并标题行
      merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: colWidths.length - 1 } });
      merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: colWidths.length - 1 } });
      merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: colWidths.length - 1 } });

      // 合并产品信息标题
      const infoStartRow = 6 + comparisonData.products.length; // "产品对比数据"行
      merges.push({ s: { r: infoStartRow, c: 0 }, e: { r: infoStartRow, c: colWidths.length - 1 } });

      // 合并产品名称单元格（每个产品占3列）
      const headerStartRow = infoStartRow + 1;
      comparisonData.products.forEach((product, index) => {
        const startCol = 1 + index * 3;
        const endCol = startCol + 2;
        merges.push({ s: { r: headerStartRow, c: startCol }, e: { r: headerStartRow, c: endCol } });
      });

      ws['!merges'] = merges;

      // 7. 设置单元格样式（数值列右对齐）
      const dataStartRow = infoStartRow + 3; // 数据从这一行开始
      const totalRows = dataStartRow + comparisonData.targetAges.length;

      // 遍历所有数据行
      for (let row = dataStartRow; row < totalRows; row++) {
        // 遍历所有列（跳过第一列的保单年度）
        for (let col = 1; col < colWidths.length; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (ws[cellAddress]) {
            // 设置数值格式：千位分隔符
            ws[cellAddress].z = '#,##0';
            // 设置右对齐
            if (!ws[cellAddress].s) ws[cellAddress].s = {};
            ws[cellAddress].s.alignment = { horizontal: 'right' };
          }
        }
      }

      // 8. 添加工作表到工作簿
      XLSX.utils.book_append_sheet(wb, ws, '产品对比');

      // 9. 生成文件名
      const fileName = `计划书对比统计表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}_${new Date().toLocaleTimeString('zh-CN').replace(/:/g, '')}.xlsx`;

      // 10. 导出文件（带样式）
      XLSX.writeFile(wb, fileName, { cellStyles: true });

      console.log('✅ Excel导出成功:', fileName);
    } catch (error) {
      console.error('❌ Excel导出失败:', error);
      alert('Excel导出失败，请查看控制台错误信息');
    }
  };

  // 切换列显示
  const toggleColumn = (columnKey) => {
    const newVisibleColumns = {
      ...visibleColumns,
      [columnKey]: !visibleColumns[columnKey]
    };
    setVisibleColumns(newVisibleColumns);
    // 保存到 localStorage
    localStorage.setItem('planManagementVisibleColumns', JSON.stringify(newVisibleColumns));
  };

  // 计算可见列数量
  const getVisibleColumnCount = () => {
    return Object.values(visibleColumns).filter(v => v).length;
  };

  const handleDeleteSelected = async (idsToDelete = null) => {
    // 使用传入的ID或当前选中的ID
    const deleteIds = idsToDelete || selectedIds;

    if (deleteIds.length === 0) {
      alert('请选择要删除的文档');
      return;
    }

    // 如果没有传入ID（批量删除），需要二次确认
    if (!idsToDelete && !confirm(`确定要删除选中的 ${deleteIds.length} 条记录吗？此操作不可恢复！`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await axios.delete('/api/ocr/documents/delete/', {
        data: { document_ids: deleteIds }
      });
      const data = response.data;

      if (data.status === 'success') {
        alert(`成功删除 ${data.deleted_count} 条记录`);
        setSelectedIds([]);
        fetchDocuments(currentPage); // 重新加载当前页
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

  // ⚠️ 服务端分页：过滤和分页逻辑已移至后端
  // documents 已经是当前页的数据，无需前端再次过滤和分页
  const paginatedDocuments = documents;
  const filteredDocuments = documents; // 用于兼容旧代码（全选等）

  // 如果正在查看产品对比
  if (showComparison && comparisonData) {
    console.log('🔍 当前显示的产品对比数据:');
    console.log('  - products数量:', comparisonData.products?.length);
    console.log('  - targetAges数量:', comparisonData.targetAges?.length);
    console.log('  - products列表:', comparisonData.products?.map(p => p.name));

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-2 md:p-4">
        <div className="max-w-[99%] mx-auto">
          {/* 对比表格 */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-blue-100">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-3 md:px-6 md:py-6">
              {/* 顶部按钮栏 */}
              <div className="mb-3 md:mb-4 flex items-center justify-between gap-1.5 md:gap-2 print:hidden overflow-x-auto">
                <button
                  onClick={() => setShowComparison(false)}
                  className="flex items-center gap-1.5 md:gap-2 px-2 py-1.5 md:px-3 md:py-2 bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl hover:bg-white/30 transition-all text-xs md:text-sm font-semibold text-white whitespace-nowrap flex-shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">返回列表</span>
                  <span className="sm:hidden">返回</span>
                </button>

                <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowColumnSelector(true)}
                    className="flex items-center gap-1.5 md:gap-2 px-2 py-1.5 md:px-3 md:py-2 bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl hover:bg-white/30 transition-all text-xs md:text-sm font-semibold text-white whitespace-nowrap"
                    title="自定义显示列"
                  >
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    <span className="hidden sm:inline">显示项</span>
                  </button>

                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 md:gap-2 px-2 py-1.5 md:px-3 md:py-2 bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl hover:bg-white/30 transition-all text-xs md:text-sm font-semibold text-white whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">导出Excel</span>
                    <span className="sm:hidden">Excel</span>
                  </button>
                </div>
              </div>

              {/* 标题 */}
              <h2 className="text-xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3 md:mb-4 tracking-wide text-center" style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif", textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>计划书对比统计表</h2>

              {/* 自定义年龄输入框 */}
              <div className="mt-3 md:mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3">
                <label className="flex items-center gap-2 text-white text-xs md:text-sm flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={useCustomAges}
                    onChange={(e) => setUseCustomAges(e.target.checked)}
                    className="w-3.5 h-3.5 md:w-4 md:h-4 rounded"
                  />
                  <span className="whitespace-nowrap">自定义显示年龄</span>
                </label>
                {useCustomAges && (
                  <div className="flex-1 w-full sm:w-auto flex gap-2">
                    <input
                      type="text"
                      value={customAgesInput}
                      onChange={(e) => setCustomAgesInput(e.target.value)}
                      placeholder="例如: 1,2,3,20-40,33岁"
                      className="flex-1 px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-gray-900 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-white"
                    />
                    <button
                      onClick={() => handleCompareProducts(selectedIds)}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-xs md:text-sm font-medium whitespace-nowrap"
                    >
                      应用
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 所有产品的受保人信息 */}
            {comparisonData.products.length > 0 && (
              <div className="px-3 py-2 md:px-6 md:py-3 bg-blue-50/50 border-b border-blue-200">
                <div className="text-[10px] md:text-xs lg:text-sm text-gray-700">
                  <span className="font-medium">受保人信息：</span>
                  {comparisonData.products.map((product, index) => {
                    const doc = documents.find(d => d.id === product.id);
                    return (
                      <span key={product.id}>
                        <span className="font-semibold text-indigo-700"> {index + 1}. {product.name}</span>
                        <span className="hidden sm:inline"> ({product.insuredName} | {product.currentAge}岁 / {doc?.insured_gender || '-'} | 年缴: {doc?.annual_premium ? parseInt(doc.annual_premium).toLocaleString('zh-CN') : '-'} | 缴费期: {doc?.payment_years ? `${doc.payment_years}年` : '-'})</span>
                        <span className="sm:hidden"> ({product.insuredName}/{product.currentAge}岁)</span>
                        {index < comparisonData.products.length - 1 && <span className="mx-0.5 md:mx-1">•</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-1 md:p-2 lg:p-3 overflow-x-auto">
              {console.log('🎯 渲染产品表，产品数量:', comparisonData.products.length)}
              {comparisonData.products.forEach((p, i) => console.log(`  产品${i + 1}:`, p.name, '- ID:', p.id))}
              <table className="w-full min-w-max shadow-sm text-[10px] md:text-xs">
                <thead>
                  <tr className="border-b-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                    <th className="px-0.5 py-2 md:px-1 md:py-3 text-center text-xs md:text-sm font-bold text-gray-800 sticky left-0 bg-gradient-to-r from-indigo-50 to-blue-50 z-10 border-r-2 border-indigo-200" style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>
                      <div className="leading-tight">
                        <div className="text-[10px] md:text-xs">保单</div>
                        <div className="text-[10px] md:text-xs">年度</div>
                        <div className="text-[10px] md:text-xs">终结</div>
                      </div>
                    </th>
                    {comparisonData.products.map((product, index) => (
                      <th key={product.id} className={`px-1 py-2 md:px-2 md:py-3 text-center bg-gradient-to-r from-indigo-50 to-blue-50 ${index < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`} colSpan={getVisibleColumnCount()}>
                        <div className="text-xs md:text-sm font-bold text-gray-800 truncate max-w-[100px] md:max-w-[150px] mx-auto" title={product.name} style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>{product.name}</div>
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b-2 border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <th className="px-0.5 py-1.5 md:px-1 md:py-2 text-center text-xs font-medium sticky left-0 bg-gradient-to-r from-blue-50 to-indigo-50 z-10 border-r-2 border-indigo-200"></th>
                    {(() => {
                      // 计算最后一个可见列
                      const columnOrder = ['total_premiums_paid', 'guaranteed_cash_value', 'non_guaranteed_cash_value', 'total_cash_value', 'withdrawal_amount', 'surrender_value_after_withdrawal'];
                      const visibleColumnNames = columnOrder.filter(col => visibleColumns[col]);
                      const lastVisibleColumn = visibleColumnNames[visibleColumnNames.length - 1];

                      return comparisonData.products.map((product, pIndex) => (
                        <React.Fragment key={`${product.id}-headers`}>
                          {visibleColumns.total_premiums_paid && (
                            <th className={`px-1 py-1.5 md:px-2 md:py-2 text-center text-[9px] md:text-[10px] font-semibold text-orange-700 whitespace-nowrap bg-gradient-to-r from-blue-50 to-indigo-50 ${lastVisibleColumn === 'total_premiums_paid' && pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                              已缴保费
                            </th>
                          )}
                          {visibleColumns.guaranteed_cash_value && (
                            <th className={`px-1 py-1.5 md:px-2 md:py-2 text-center text-[9px] md:text-[10px] font-semibold text-blue-700 whitespace-nowrap bg-gradient-to-r from-blue-50 to-indigo-50 ${lastVisibleColumn === 'guaranteed_cash_value' && pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                              保证现金
                            </th>
                          )}
                          {visibleColumns.non_guaranteed_cash_value && (
                            <th className={`px-1 py-1.5 md:px-2 md:py-2 text-center text-[9px] md:text-[10px] font-semibold text-orange-700 whitespace-nowrap bg-gradient-to-r from-blue-50 to-indigo-50 ${lastVisibleColumn === 'non_guaranteed_cash_value' && pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                              非保证
                            </th>
                          )}
                          {visibleColumns.total_cash_value && (
                            <th className={`px-1 py-1.5 md:px-2 md:py-2 text-center text-[9px] md:text-[10px] font-semibold text-indigo-700 whitespace-nowrap bg-gradient-to-r from-blue-50 to-indigo-50 ${lastVisibleColumn === 'total_cash_value' && pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                              总价值
                            </th>
                          )}
                          {visibleColumns.withdrawal_amount && (
                            <th className={`px-1 py-1.5 md:px-2 md:py-2 text-center text-[9px] md:text-[10px] font-semibold text-purple-700 whitespace-nowrap bg-gradient-to-r from-blue-50 to-indigo-50 ${lastVisibleColumn === 'withdrawal_amount' && pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                              提取总额
                            </th>
                          )}
                          {visibleColumns.surrender_value_after_withdrawal && (
                            <th className={`px-1 py-1.5 md:px-2 md:py-2 text-center text-[9px] md:text-[10px] font-semibold text-indigo-900 whitespace-nowrap bg-gradient-to-r from-blue-50 to-indigo-50 ${lastVisibleColumn === 'surrender_value_after_withdrawal' && pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                              退保价值
                            </th>
                          )}
                        </React.Fragment>
                      ));
                    })()}
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
                    } else {
                      // 统一显示保单年度（纯数字）
                      displayText = ageOrKey;
                    }

                    return (
                      <tr key={ageOrKey} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                        <td className="px-0.5 py-1.5 md:px-1 md:py-2 text-xs md:text-sm font-semibold text-gray-900 sticky left-0 bg-white z-10 border-r-2 border-indigo-200 text-center">
                          {displayText}
                        </td>
                      {comparisonData.products.map((product, pIndex) => {
                        const ageData = product.ageData[ageOrKey] || {};

                        // 调试：输出表格单元格的数据
                        if (pIndex === 0 && ageOrKey === comparisonData.targetAges[0]) {
                          console.log('🎨 [表格渲染] 第一个产品第一行数据:');
                          console.log('  - 产品名:', product.name);
                          console.log('  - 年龄/年度:', ageOrKey);
                          console.log('  - ageData:', ageData);
                          console.log('  - total_premiums_paid:', ageData.total_premiums_paid, '→ 格式化后:', formatNumber(ageData.total_premiums_paid));
                          console.log('  - withdrawal_amount:', ageData.withdrawal_amount);
                          console.log('  - surrender_value_after_withdrawal:', ageData.surrender_value_after_withdrawal, '→ 格式化后:', formatNumber(ageData.surrender_value_after_withdrawal));
                        }

                        // 计算最后一个可见列
                        const columnOrder = ['total_premiums_paid', 'guaranteed_cash_value', 'non_guaranteed_cash_value', 'total_cash_value', 'withdrawal_amount', 'surrender_value_after_withdrawal'];
                        const visibleColumnNames = columnOrder.filter(col => visibleColumns[col]);
                        const lastVisibleColumn = visibleColumnNames[visibleColumnNames.length - 1];

                        return (
                          <React.Fragment key={`${product.id}-${ageOrKey}`}>
                            {visibleColumns.total_premiums_paid && (
                              <td className={`px-0.5 py-1.5 md:px-1 md:py-2 text-[10px] md:text-xs text-orange-700 font-semibold text-center whitespace-nowrap ${lastVisibleColumn === 'total_premiums_paid' && pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                                {formatNumber(ageData.total_premiums_paid)}
                              </td>
                            )}
                            {visibleColumns.guaranteed_cash_value && (
                              <td className={`px-0.5 py-1.5 md:px-1 md:py-2 text-[10px] md:text-xs text-blue-700 font-medium text-center whitespace-nowrap ${lastVisibleColumn === 'guaranteed_cash_value' && pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                                {formatNumber(ageData.guaranteed_cash_value)}
                              </td>
                            )}
                            {visibleColumns.non_guaranteed_cash_value && (
                              <td className={`px-0.5 py-1.5 md:px-1 md:py-2 text-[10px] md:text-xs text-orange-600 font-medium text-center whitespace-nowrap ${lastVisibleColumn === 'non_guaranteed_cash_value' && pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                                {formatNumber(ageData.non_guaranteed_cash_value)}
                              </td>
                            )}
                            {visibleColumns.total_cash_value && (
                              <td className={`px-0.5 py-1.5 md:px-1 md:py-2 text-[10px] md:text-xs text-indigo-700 font-bold text-center whitespace-nowrap ${lastVisibleColumn === 'total_cash_value' && pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                                {formatNumber(ageData.total_cash_value)}
                              </td>
                            )}
                            {visibleColumns.withdrawal_amount && (
                              <td className={`px-0.5 py-1.5 md:px-1 md:py-2 text-[10px] md:text-xs text-purple-700 font-medium text-center whitespace-nowrap ${lastVisibleColumn === 'withdrawal_amount' && pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                                {ageData.withdrawal_amount !== undefined && ageData.withdrawal_amount !== null
                                  ? formatNumber(ageData.withdrawal_amount)
                                  : '0'}
                              </td>
                            )}
                            {visibleColumns.surrender_value_after_withdrawal && (
                              <td className={`px-0.5 py-1.5 md:px-1 md:py-2 text-[10px] md:text-xs text-indigo-900 font-bold text-center whitespace-nowrap ${lastVisibleColumn === 'surrender_value_after_withdrawal' && pIndex < comparisonData.products.length - 1 ? 'border-r-2 border-indigo-200' : ''}`}>
                                {formatNumber(ageData.surrender_value_after_withdrawal)}
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
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 md:p-4">
              <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* 标题栏 */}
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-3 py-2 md:px-4 md:py-2 flex items-center justify-between">
                  <div className="w-6 md:w-8"></div>
                  <h3 className="text-lg md:text-xl font-bold text-white text-center flex-1">自定义显示项</h3>
                  <button
                    onClick={() => setShowColumnSelector(false)}
                    className="text-white/80 hover:text-white transition-colors p-1"
                  >
                    <X className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>

                {/* 列选项 */}
                <div className="p-4 md:p-6 space-y-2 md:space-y-3">
                  <label className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={visibleColumns.total_premiums_paid}
                      onChange={() => toggleColumn('total_premiums_paid')}
                      className="w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="flex-1 text-xs md:text-sm font-medium text-gray-700">已缴保费</span>
                    <span className="text-[10px] md:text-xs text-orange-600 font-semibold">总保费</span>
                  </label>

                  <label className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={visibleColumns.guaranteed_cash_value}
                      onChange={() => toggleColumn('guaranteed_cash_value')}
                      className="w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex-1 text-xs md:text-sm font-medium text-gray-700">保证现金价值</span>
                    <span className="text-[10px] md:text-xs text-blue-600 font-semibold">保证</span>
                  </label>

                  <label className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={visibleColumns.non_guaranteed_cash_value}
                      onChange={() => toggleColumn('non_guaranteed_cash_value')}
                      className="w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="flex-1 text-xs md:text-sm font-medium text-gray-700">非保证现金价值</span>
                    <span className="text-[10px] md:text-xs text-orange-600 font-semibold">红利</span>
                  </label>

                  <label className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={visibleColumns.total_cash_value}
                      onChange={() => toggleColumn('total_cash_value')}
                      className="w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="flex-1 text-xs md:text-sm font-medium text-gray-700">总现金价值</span>
                    <span className="text-[10px] md:text-xs text-indigo-600 font-semibold">总价值</span>
                  </label>

                  <label className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={visibleColumns.withdrawal_amount}
                      onChange={() => toggleColumn('withdrawal_amount')}
                      className="w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="flex-1 text-xs md:text-sm font-medium text-gray-700">提取总额</span>
                    <span className="text-[10px] md:text-xs text-purple-600 font-semibold">提取</span>
                  </label>

                  <label className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={visibleColumns.surrender_value_after_withdrawal}
                      onChange={() => toggleColumn('surrender_value_after_withdrawal')}
                      className="w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-indigo-900 focus:ring-indigo-900"
                    />
                    <span className="flex-1 text-xs md:text-sm font-medium text-gray-700">退保价值</span>
                    <span className="text-[10px] md:text-xs text-indigo-900 font-semibold">退保</span>
                  </label>
                </div>

                {/* 底部说明 */}
                <div className="px-4 py-3 md:px-6 md:py-4 bg-gray-50 border-t border-gray-200">
                  <p className="text-[10px] md:text-xs text-gray-600 text-center">
                    已选择 <span className="font-semibold text-indigo-600">{getVisibleColumnCount()}</span> 个显示项
                  </p>
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
          {/* 顶部导航栏 */}
          <div className="mb-4 flex items-center gap-2 md:gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 bg-white rounded-lg shadow hover:shadow-md transition-all text-xs md:text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">返回</span>
            </button>

            {/* 搜索按钮 */}
            <button
              onClick={() => setShowSearchBar(!showSearchBar)}
              className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-lg shadow hover:shadow-md transition-all text-xs md:text-sm ${
                showSearchBar ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-700'
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">搜索</span>
            </button>

            {/* 刷新列表按钮 */}
            <button
              onClick={() => fetchDocuments(currentPage)}
              disabled={loading}
              className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 bg-white rounded-lg shadow hover:shadow-md transition-all text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">刷新</span>
            </button>
          </div>

          {/* 计划书分析与对比工具标题 */}
          <div className="mb-3 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">计划书分析与对比工具</h1>
          </div>

          {/* 统计信息和操作按钮 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <div className="text-2xl md:text-3xl font-bold text-indigo-600">{totalCount}</div>
                <div className="text-xs md:text-sm text-gray-600">份计划书</div>
              </div>
              {/* 每日限额提示 */}
              {dailyQuota && (
                <div className={`text-xs md:text-sm ${dailyQuota.remaining_count === 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                  今日已使用 <span className="font-bold">{dailyQuota.used_count}</span>/{dailyQuota.max_limit} 次
                  {dailyQuota.remaining_count === 0 && (
                    <span className="ml-2 text-red-600">（已达上限，请联系管理员）</span>
                  )}
                  {dailyQuota.remaining_count > 0 && dailyQuota.remaining_count <= 2 && (
                    <span className="ml-2 text-amber-600">（剩余 {dailyQuota.remaining_count} 次）</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
              {/* 添加计划书按钮（响应式） */}
              <button
                onClick={() => {
                  if (dailyQuota && !dailyQuota.can_upload) {
                    alert(`您今日的上传次数已达上限（${dailyQuota.max_limit}篇/天）。如需增加额度，请联系管理员。`);
                    return;
                  }
                  onNavigate && onNavigate('plan-analyzer');
                }}
                disabled={dailyQuota && !dailyQuota.can_upload}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-2.5 rounded-lg transition-all shadow-md text-sm md:text-base font-semibold whitespace-nowrap ${
                  dailyQuota && !dailyQuota.can_upload
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:shadow-lg'
                }`}
                title={dailyQuota && !dailyQuota.can_upload ? '今日上传次数已达上限，请联系管理员' : '添加新的计划书'}
              >
                <FileText className="w-4 md:w-5 h-4 md:h-5 flex-shrink-0" />
                <span>添加计划书</span>
              </button>

              {/* 计划书对比按钮（始终显示，响应式） */}
              <button
                onClick={() => {
                  if (selectedIds.length === 0) {
                    alert('请至少选择一个计划书进行对比');
                    return;
                  }
                  handleCompareProducts();
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg text-sm md:text-base font-semibold whitespace-nowrap"
              >
                <GitCompare className="w-4 md:w-5 h-4 md:h-5 flex-shrink-0" />
                <span>计划书对比</span>
                {selectedIds.length > 0 && (
                  <span className="bg-white/20 px-1.5 md:px-2 py-0.5 rounded-full text-xs md:text-sm">
                    {selectedIds.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 搜索和筛选区域（条件显示） */}
        {showSearchBar && (
          <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 mb-6">
            <div className="flex items-center gap-2">
              {/* 搜索框 */}
              <div className="flex-1 min-w-0 relative">
                <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索文件名..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 md:pl-10 pr-2 md:pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base"
                  autoFocus
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

              {/* 关闭按钮 */}
              <button
                onClick={() => {
                  setShowSearchBar(false);
                  setSearchTerm(''); // 关闭时清空搜索
                  setFilterStatus('all'); // 重置筛选
                }}
                className="flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                title="关闭搜索"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}


        {/* 文档列表 - 表格形式 */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">正在加载计划书列表...</p>
              {loadingTimeout ? (
                <div className="text-center max-w-md">
                  <p className="text-sm text-amber-600 font-medium mb-3">
                    ⚠️ 加载时间较长，可能的原因：
                  </p>
                  <ul className="text-sm text-gray-600 text-left mb-4 space-y-1">
                    <li>• 登录凭证已过期，正在自动刷新</li>
                    <li>• 网络连接较慢</li>
                    <li>• 服务器响应延迟</li>
                  </ul>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                      刷新页面
                    </button>
                    <button
                      onClick={() => onNavigate('/')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      返回首页
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center max-w-md">
                  {authLoading ? '正在验证登录状态...' : '请稍候...'}
                </p>
              )}
            </div>
          </div>
        ) : totalCount === 0 ? (
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
                        checked={selectedIds.length === paginatedDocuments.length && paginatedDocuments.length > 0}
                        onChange={handleSelectAll}
                        className="w-3 h-3 md:w-4 md:h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      文件名
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                      投保人信息
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分析状态
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedDocuments.map((doc) => (
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
                      <td className="px-2 md:px-4 py-2 md:py-3 text-sm text-gray-700 cursor-pointer" onClick={() => handleViewDocument(doc)}>
                        <div className="space-y-0.5 text-left">
                          {/* 第1行：姓名 + 年龄/性别 */}
                          <div className="flex flex-wrap gap-x-3">
                            {doc.insured_name && (
                              <div className="whitespace-nowrap">
                                <span className="text-gray-500">姓名:</span>
                                <span className="font-medium ml-1">{doc.insured_name}</span>
                              </div>
                            )}
                            {(doc.insured_age || doc.insured_gender) && (
                              <div className="whitespace-nowrap">
                                <span className="text-gray-500">年龄/性别:</span>
                                <span className="ml-1">{doc.insured_age || '-'} / {doc.insured_gender || '-'}</span>
                              </div>
                            )}
                          </div>

                          {/* 第2行：公司 */}
                          {doc.insurance_company && (
                            <div>
                              <span className="text-gray-500">公司:</span>
                              <span className="ml-1">{doc.insurance_company}</span>
                            </div>
                          )}

                          {/* 第3行：产品 */}
                          {doc.insurance_product && (
                            <div>
                              <span className="text-gray-500">产品:</span>
                              <span className="ml-1">{doc.insurance_product}</span>
                            </div>
                          )}

                          {/* 第4行：保额 + 年缴 + 缴费期 */}
                          <div className="flex flex-wrap gap-x-3">
                            {doc.sum_assured && (
                              <div className="whitespace-nowrap">
                                <span className="text-gray-500">保额:</span>
                                <span className="font-medium text-blue-600 ml-1">
                                  {parseInt(doc.sum_assured.toString().replace(/,/g, '')).toLocaleString('zh-CN')}
                                </span>
                              </div>
                            )}
                            {doc.annual_premium && (
                              <div className="whitespace-nowrap">
                                <span className="text-gray-500">年缴:</span>
                                <span className="font-medium text-green-600 ml-1">
                                  {parseInt(doc.annual_premium.toString().replace(/,/g, '')).toLocaleString('zh-CN')}
                                </span>
                              </div>
                            )}
                            {doc.payment_years && (
                              <div className="whitespace-nowrap">
                                <span className="text-gray-500">缴费期:</span>
                                <span className="ml-1">{doc.payment_years}年</span>
                              </div>
                            )}
                          </div>

                          {/* 第5行：总保费 + 期限 */}
                          <div className="flex flex-wrap gap-x-3">
                            {doc.total_premium && (
                              <div className="whitespace-nowrap">
                                <span className="text-gray-500">总保费:</span>
                                <span className="font-medium text-purple-600 ml-1">
                                  {parseInt(doc.total_premium.toString().replace(/,/g, '')).toLocaleString('zh-CN')}
                                </span>
                              </div>
                            )}
                            {doc.insurance_period && (
                              <div className="whitespace-nowrap">
                                <span className="text-gray-500">期限:</span>
                                <span className="ml-1">{doc.insurance_period}</span>
                              </div>
                            )}
                          </div>
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
                            disabled
                            className="inline-flex items-center justify-center gap-0.5 w-7 h-7 md:w-auto md:h-auto md:px-2 md:py-1.5 bg-gray-400 text-white text-xs rounded cursor-not-allowed opacity-50 whitespace-nowrap"
                            title="下载功能暂时禁用"
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`确定要删除 "${doc.file_name}" 吗？此操作不可恢复！`)) {
                                handleDeleteSelected([doc.id]);
                              }
                            }}
                            className="inline-flex items-center justify-center gap-0.5 w-7 h-7 md:w-auto md:h-auto md:px-2 md:py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors whitespace-nowrap"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="hidden lg:inline">删除</span>
                          </button>
                        </div>
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

              {/* 分页组件 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span>共 {totalCount} 条记录</span>
                    <span>|</span>
                    <span>第 {currentPage} / {totalPages} 页</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchDocuments(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      首页
                    </button>
                    <button
                      onClick={() => fetchDocuments(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => fetchDocuments(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下一页
                    </button>
                    <button
                      onClick={() => fetchDocuments(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      末页
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 手机端卡片视图 */}
            <div className="md:hidden space-y-4">
              {paginatedDocuments.map((doc) => (
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
                        // 检查是否为HTML内容（包含HTML标签）
                        const isHTML = /<[^>]+>/.test(summaryText);

                        if (isHTML) {
                          // 如果是HTML，提取纯文本内容用于预览
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = summaryText;
                          const plainText = tempDiv.textContent || tempDiv.innerText || '';

                          return (
                            <div className="text-xs text-gray-600">
                              <span className="text-gray-500">概要：</span>
                              <span className="line-clamp-2">{plainText.trim()}</span>
                            </div>
                          );
                        } else {
                          // 纯文本直接显示
                          return (
                            <div className="text-xs text-gray-600">
                              <span className="text-gray-500">概要：</span>
                              <span className="line-clamp-2">{summaryText}</span>
                            </div>
                          );
                        }
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
                        if (confirm(`确定要删除 "${doc.file_name}" 吗？此操作不可恢复！`)) {
                          setSelectedIds([doc.id]);
                          handleDeleteSelected();
                        }
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>删除</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* 手机端分页组件 */}
              {totalPages > 1 && (
                <div className="mt-4 bg-white rounded-xl shadow-lg p-4">
                  <div className="flex flex-col gap-3">
                    <div className="text-center text-sm text-gray-700">
                      <span>共 {totalCount} 条记录</span>
                      <span className="mx-2">|</span>
                      <span>第 {currentPage} / {totalPages} 页</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => fetchDocuments(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        首页
                      </button>
                      <button
                        onClick={() => fetchDocuments(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        上一页
                      </button>
                      <button
                        onClick={() => fetchDocuments(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        下一页
                      </button>
                      <button
                        onClick={() => fetchDocuments(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        末页
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
