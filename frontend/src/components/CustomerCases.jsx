import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL, API_BASE_URL } from '../config';
import ReactMarkdown from 'react-markdown';

const CustomerCases = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // 客户案例数据
  const [allCases, setAllCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [totalCasesCount, setTotalCasesCount] = useState(0); // 总案例数
  const [selectedStages, setSelectedStages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [casesLoading, setCasesLoading] = useState(true);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const casesPerPage = 10;

  // 搜索筛选展开状态
  const [showSearchFilter, setShowSearchFilter] = useState(false);

  // 人生阶段配置
  const lifeStages = [
    { value: '扶幼保障期', label: '扶幼保障期', icon: '👶', color: 'bg-pink-100 text-pink-700 border-pink-300' },
    { value: '收入成长期', label: '收入成长期', icon: '📈', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: '责任高峰期', label: '责任高峰期', icon: '💼', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    { value: '责任递减期', label: '责任递减期', icon: '🏡', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    { value: '退休期', label: '退休期', icon: '🏖️', color: 'bg-green-100 text-green-700 border-green-300' }
  ];

  // 模拟AI回复
  const handleSendMessage = () => {
    if (!userMessage.trim()) return;

    // 添加用户消息
    const newUserMsg = {
      type: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    setChatHistory(prev => [...prev, newUserMsg]);
    setUserMessage('');
    setIsTyping(true);

    // 模拟AI思考和回复
    setTimeout(() => {
      const aiResponse = {
        type: 'ai',
        content: '感谢您的咨询！我是您的专属理财顾问小智。\n\n根据您的需求，我建议：\n1. 优先考虑保障型保险（医疗、重疾）\n2. 根据家庭收入合理配置储蓄型保险\n3. 预算建议为年收入的10-15%\n\n如需更详细的个性化方案，请点击下方按钮获取AI智能分析。',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  // 快捷问题
  const quickQuestions = [
    '我30岁，该买什么保险？',
    '如何为家庭配置保险？',
    '储蓄险和投资险的区别？',
    '保费预算应该是多少？'
  ];

  const handleQuickQuestion = (question) => {
    setUserMessage(question);
  };

  // 获取所有案例
  useEffect(() => {
    const fetchAllCases = async () => {
      setCasesLoading(true);
      try {
        // 先获取总数
        const countResponse = await axios.get(`${API_URL}/customer-cases/`, {
          params: { page_size: 1 }
        });
        const totalCount = countResponse.data.success ? countResponse.data.data.count : 0;

        // 然后获取所有数据（使用总数作为page_size）
        const response = await axios.get(`${API_URL}/customer-cases/`, {
          params: { page_size: Math.max(totalCount, 1000) }  // 至少1000，确保获取所有数据
        });

        if (response.data.success) {
          const cases = response.data.data.results || [];
          console.log(`✅ 成功获取案例数量: ${cases.length}, 总数: ${totalCount}`);
          setAllCases(cases);
          setFilteredCases(cases);
          setTotalCasesCount(totalCount);
        }
      } catch (err) {
        console.error('获取案例失败:', err);
      } finally {
        setCasesLoading(false);
      }
    };
    fetchAllCases();
  }, []);

  // 筛选案例
  useEffect(() => {
    let filtered = allCases;
    if (selectedStages.length > 0) {
      filtered = filtered.filter(c => {
        const caseTags = c.tags || [];
        return selectedStages.some(stage => caseTags.includes(stage));
      });
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title?.toLowerCase().includes(query) ||
        c.case_description?.toLowerCase().includes(query) ||
        c.insurance_needs?.toLowerCase().includes(query) ||
        c.family_structure?.toLowerCase().includes(query)
      );
    }
    setFilteredCases(filtered);
    setCurrentPage(1); // 重置到第一页
  }, [selectedStages, searchQuery, allCases]);

  // 计算分页数据（后端已按 -id 倒序返回，最新的案例在最前面）
  const totalPages = Math.ceil(filteredCases.length / casesPerPage);
  const indexOfLastCase = currentPage * casesPerPage;
  const indexOfFirstCase = indexOfLastCase - casesPerPage;
  const currentCases = filteredCases.slice(indexOfFirstCase, indexOfLastCase);

  // 分页处理函数
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleStage = (stage) => {
    setSelectedStages(prev =>
      prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
    );
  };

  const getStageConfig = (stage) => {
    // 如果找不到匹配的配置，返回一个默认配置（不显示emoji）
    const config = lifeStages.find(s => s.value === stage);
    if (config) {
      return config;
    }
    // 默认配置：没有emoji图标
    return {
      value: stage,
      label: stage,
      icon: '', // 没有emoji
      color: 'bg-gray-100 text-gray-700 border-gray-300'
    };
  };

  const handleViewDetail = async (caseItem) => {
    try {
      const response = await axios.get(`${API_URL}/customer-cases/${caseItem.id}/`);
      if (response.data.success) {
        setSelectedCase(response.data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('获取案例详情失败:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* 装饰性背景元素 */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-40 right-20 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-40 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      {/* 顶部导航 */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-gray-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回Dashboard
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="font-medium">客户案例库</span>
          </div>
        </div>
      </div>

      {/* 主内容区 - 理财顾问介绍 */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            您的专属理财顾问
          </h1>
          <p className="text-base text-gray-600 mb-2">
            点击下方顾问头像，获取专业保险咨询服务
          </p>
          <p className="text-sm text-blue-600 font-medium leading-relaxed">
            我知道全香港所有保险公司所有产品的详细资料，您可以问我，我会给您客观的回答，香港保险从购买到缴费理赔的全部知识都可以问我
          </p>
        </div>

        {/* 理财顾问气泡 - 居中头像 */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setIsOpen(true)}
            className="group relative"
          >
            {/* 脉冲动画背景 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-ping opacity-75"></div>

            {/* 顾问头像 */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-xl transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl">
              <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>

            {/* 浮动提示 */}
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              <span className="text-gray-700 font-medium text-sm">点击咨询</span>
            </div>

            {/* 名字标签 */}
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white px-4 py-1.5 rounded-full shadow-lg">
              <span className="text-gray-800 font-bold text-base">智能顾问小智</span>
            </div>
          </button>
        </div>

      </div>

      {/* 客户案例库区域 */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-5 mb-5 text-white">
          <div className="flex items-start justify-between gap-4">
            {/* 左侧：标题和描述 */}
            <div className="flex items-start space-x-3 flex-1">
              <svg className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1.5">客户案例库</h2>
                <p className="text-purple-100 text-sm">
                  参考真实客户案例，了解不同人生阶段的保险配置方案
                </p>
              </div>
            </div>

            {/* 右侧：案例总数和搜索筛选按钮 */}
            <div className="flex items-center gap-3">
              {/* 总案例数显示 */}
              {!casesLoading && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 px-4 py-2.5 flex items-center gap-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-white whitespace-nowrap">
                    共 {totalCasesCount} 个案例
                  </span>
                </div>
              )}

              <button
                onClick={() => setShowSearchFilter(!showSearchFilter)}
                className="flex-shrink-0 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 px-4 py-2.5 hover:bg-white/20 transition-all flex items-center gap-2 group"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm font-medium text-white whitespace-nowrap">搜索筛选</span>
                {(searchQuery || selectedStages.length > 0) && (
                  <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full">
                    {selectedStages.length || ''}
                  </span>
                )}
                <svg
                  className={`w-4 h-4 text-white transition-transform ${showSearchFilter ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 筛选区（可折叠） */}
        {showSearchFilter && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 animate-fadeIn">
            {/* 搜索框 */}
            <div className="mb-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="搜索案例标题、需求、家庭结构..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* 人生阶段筛选 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <label className="text-sm font-semibold text-gray-700">
                  按人生阶段筛选
                </label>
                {selectedStages.length > 0 && (
                  <span className="text-xs text-purple-600 font-medium">
                    (已选 {selectedStages.length} 个)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {lifeStages.map(stage => (
                  <button
                    key={stage.value}
                    onClick={() => toggleStage(stage.value)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg border-2 transition-all text-sm ${
                      selectedStages.includes(stage.value)
                        ? stage.color + ' border-current shadow-sm'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-1.5">{stage.icon}</span>
                    <span className="font-medium">{stage.label}</span>
                    <span className="ml-1.5 text-xs opacity-75">
                      ({allCases.filter(c => (c.tags || []).includes(stage.value)).length})
                    </span>
                  </button>
                ))}
                {selectedStages.length > 0 && (
                  <button
                    onClick={() => setSelectedStages([])}
                    className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border-2 border-red-200 hover:border-red-300 font-medium"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    清除筛选
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 案例列表 */}
        <div>
          {casesLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-purple-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">加载案例中...</p>
              </div>
            </div>
          )}

          {!casesLoading && filteredCases.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <svg className="h-12 w-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">没有找到匹配的案例</h3>
              <p className="text-gray-500">请尝试调整筛选条件或搜索关键词</p>
            </div>
          )}

          {!casesLoading && filteredCases.length > 0 && (
            <>
              <div className="space-y-3">
                {currentCases.map((caseItem) => {
                  const mainStage = caseItem.tags && caseItem.tags.length > 0 ? caseItem.tags[0] : '综合案例';
                  const stageConfig = getStageConfig(mainStage);

                  return (
                    <div
                      key={caseItem.id}
                      onClick={() => handleViewDetail(caseItem)}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4 border border-gray-200 cursor-pointer group"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-gray-900 group-hover:text-purple-600 transition-colors mb-2">
                            {caseItem.title || `${caseItem.customer_age}岁 · ${caseItem.insured_gender || '未知'} · ${caseItem.family_structure}`}
                          </h3>

                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${stageConfig.color}`}>
                              {stageConfig.icon && <span className="mr-1">{stageConfig.icon}</span>}
                              {stageConfig.label}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              {caseItem.customer_age}岁{caseItem.insured_gender ? ` · ${caseItem.insured_gender}` : ''}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 line-clamp-1">
                            {caseItem.case_description || caseItem.insurance_needs || '暂无描述'}
                          </p>
                        </div>

                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 分页控件 */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      // 显示逻辑：首页、尾页、当前页及其前后各1页
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                              currentPage === pageNum
                                ? 'bg-purple-600 text-white font-semibold'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (
                        pageNum === currentPage - 2 ||
                        pageNum === currentPage + 2
                      ) {
                        return <span key={pageNum} className="px-2 text-gray-400">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <span className="ml-4 text-sm text-gray-600">
                    {(selectedStages.length > 0 || searchQuery.trim()) && filteredCases.length < totalCasesCount
                      ? `筛选出 ${filteredCases.length} 条（共 ${totalCasesCount} 条），第 ${currentPage}/${totalPages} 页`
                      : `共 ${totalCasesCount} 条案例，第 ${currentPage}/${totalPages} 页`
                    }
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 聊天对话框 */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
            {/* 对话框头部 */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg">智能顾问小智</h3>
                  <p className="text-sm text-blue-100">在线</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 聊天消息区 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {chatHistory.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-6">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-lg">请描述您的保险需求</p>
                  </div>

                  {/* 快捷问题 */}
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 mb-3">快速提问：</p>
                    {quickQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickQuestion(question)}
                        className="block w-full px-4 py-3 bg-white text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      msg.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 shadow'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                    <p className={`text-xs mt-2 ${msg.type === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl shadow">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-200"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-400"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 输入框 */}
            <div className="p-4 border-t bg-white rounded-b-2xl">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="请输入您的问题..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!userMessage.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>

              {/* AI咨询按钮 */}
              <button
                onClick={() => navigate('/ai-consultation')}
                className="w-full mt-3 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg font-medium"
              >
                获取完整AI智能分析报告
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 案例详情弹窗 */}
      {showDetailModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <h2 className="text-xl font-bold text-gray-900">案例详情</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
              >
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-80px)]">
              {selectedCase.case_image && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img
                    src={`${API_BASE_URL}${selectedCase.case_image}`}
                    alt={selectedCase.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              <div className="mb-4">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {selectedCase.tags && selectedCase.tags.map((tag, index) => {
                    const stageConfig = getStageConfig(tag);
                    return (
                      <span key={index} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${stageConfig.color}`}>
                        {stageConfig.icon && <span className="mr-1">{stageConfig.icon}</span>}
                        {stageConfig.label}
                      </span>
                    );
                  })}
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedCase.title || `${selectedCase.customer_age}岁 · ${selectedCase.family_structure}`}
                </h3>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-semibold text-gray-900">{selectedCase.customer_age}岁</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="font-semibold text-gray-900">{selectedCase.family_structure}</span>
                  {selectedCase.annual_income && parseFloat(selectedCase.annual_income) > 0 && (
                    <>
                      <span className="text-gray-400 mx-2">·</span>
                      <span className="text-gray-600">年收入</span>
                      <span className="font-semibold text-gray-900 ml-1">
                        {selectedCase.income_display || `HK$${parseFloat(selectedCase.annual_income).toLocaleString()}`}
                      </span>
                    </>
                  )}
                </p>
              </div>

              {selectedCase.insurance_needs && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">保险需求</h4>
                  <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700">
                    <ReactMarkdown>{selectedCase.insurance_needs}</ReactMarkdown>
                  </div>
                </div>
              )}

              {selectedCase.case_description && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">案例说明</h4>
                  <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700">
                    <ReactMarkdown>{selectedCase.case_description}</ReactMarkdown>
                  </div>
                </div>
              )}

              {selectedCase.key_points && selectedCase.key_points.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                    <svg className="h-4 w-4 mr-1.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    关键要点
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedCase.key_points.map((point, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="inline-block w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedCase.recommended_products && selectedCase.recommended_products.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">推荐产品</h4>
                  <div className="space-y-2">
                    {selectedCase.recommended_products.map((product, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between mb-1.5">
                          <div>
                            <h5 className="text-sm font-bold text-gray-900">{product.product_name}</h5>
                            <p className="text-xs text-gray-600">{product.company}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded whitespace-nowrap ml-2">
                            {product.coverage_type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 mb-1.5">{product.reason}</p>
                        <p className="text-xs font-semibold text-green-600">
                          年缴保费: HK${parseFloat(product.annual_premium).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCase.budget_suggestion && (
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-1.5">预算建议</h4>
                  <p className="text-sm text-gray-700">
                    {selectedCase.budget_suggestion}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        .animation-delay-400 {
          animation-delay: 400ms;
        }
      `}</style>
    </div>
  );
};

export default CustomerCases;
