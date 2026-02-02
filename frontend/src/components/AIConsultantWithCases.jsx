import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL, API_BASE_URL } from '../config';
import {
  UserIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  XMarkIcon,
  ArrowLeftIcon,
  TagIcon,
  MagnifyingGlassIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const AIConsultantWithCases = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // AI顾问表单数据 - 简化为自由文本输入
  const [userInput, setUserInput] = useState('');

  // 客户案例数据
  const [allCases, setAllCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [selectedStages, setSelectedStages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [casesLoading, setCasesLoading] = useState(true);

  // 理财顾问气泡状态
  const [showAdvisorBubble, setShowAdvisorBubble] = useState(false);
  const [advisorMessage, setAdvisorMessage] = useState('');
  const [advisorChatHistory, setAdvisorChatHistory] = useState([]);
  const [advisorTyping, setAdvisorTyping] = useState(false);

  // 人生阶段配置
  const lifeStages = [
    { value: '扶幼保障期', label: '扶幼保障期', icon: '👶', color: 'bg-pink-100 text-pink-700 border-pink-300' },
    { value: '收入成长期', label: '收入成长期', icon: '📈', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: '责任高峰期', label: '责任高峰期', icon: '💼', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    { value: '责任递减期', label: '责任递减期', icon: '🏡', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    { value: '退休期', label: '退休期', icon: '🏖️', color: 'bg-green-100 text-green-700 border-green-300' }
  ];


  // 获取所有案例
  useEffect(() => {
    const fetchAllCases = async () => {
      setCasesLoading(true);

      try {
        const response = await axios.get(`${API_URL}/customer-cases/`, {
          params: { page_size: 100 }
        });

        if (response.data.success) {
          const cases = response.data.data.results || [];
          setAllCases(cases);
          setFilteredCases(cases);
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

    // 按阶段筛选
    if (selectedStages.length > 0) {
      filtered = filtered.filter(c => {
        const caseTags = c.tags || [];
        return selectedStages.some(stage => caseTags.includes(stage));
      });
    }

    // 按关键词搜索
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
  }, [selectedStages, searchQuery, allCases]);


  const toggleStage = (stage) => {
    setSelectedStages(prev =>
      prev.includes(stage)
        ? prev.filter(s => s !== stage)
        : [...prev, stage]
    );
  };

  const getStageConfig = (stage) => {
    return lifeStages.find(s => s.value === stage) || lifeStages[0];
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 验证输入不为空
    if (!userInput.trim()) {
      setError('请输入您的需求');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('token');

      // 使用自由文本输入
      const requestData = {
        user_input: userInput.trim()
      };

      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // 调用AI分析接口（假设有一个自由文本分析的端点）
      const response = await axios.post(
        `${API_URL}/ai-consultant/analyze-text`,
        requestData,
        { headers }
      );

      if (response.data.success) {
        setResult(response.data.data);
        setTimeout(() => {
          document.getElementById('results-section')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 100);
      } else {
        setError(response.data.message || 'AI分析失败');
      }
    } catch (err) {
      console.error('AI分析失败:', err);
      if (err.response?.status === 429) {
        setError('请求过于频繁，请稍后再试');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('AI分析失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUserInput('');
    setResult(null);
    setError(null);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // 理财顾问气泡功能
  const handleAdvisorSendMessage = () => {
    if (!advisorMessage.trim()) return;

    const newUserMsg = {
      type: 'user',
      content: advisorMessage,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    setAdvisorChatHistory(prev => [...prev, newUserMsg]);
    setAdvisorMessage('');
    setAdvisorTyping(true);

    setTimeout(() => {
      const aiResponse = {
        type: 'ai',
        content: '感谢您的咨询！我是您的专属理财顾问小智。\n\n根据您的需求，我建议：\n1. 优先考虑保障型保险（医疗、重疾）\n2. 根据家庭收入合理配置储蓄型保险\n3. 预算建议为年收入的10-15%\n\n您可以参考上方的客户案例库，或填写上方的AI智能分析表单获取详细方案。',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };
      setAdvisorChatHistory(prev => [...prev, aiResponse]);
      setAdvisorTyping(false);
    }, 1500);
  };

  const quickQuestions = [
    '我该买什么保险？',
    '如何配置家庭保险？',
    '保费预算建议？',
    '储蓄险 vs 投资险？'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                返回
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">AI智能保险顾问 & 客户案例库</h1>
                  <p className="text-sm text-gray-500">获取个性化保险方案，参考真实案例</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* AI顾问区域 */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-xl p-6 mb-6 text-white">
            <div className="flex items-start space-x-4">
              <SparklesIcon className="h-10 w-10 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">AI智能理财顾问</h2>
                <p className="text-indigo-100">
                  输入您的需求，AI将为您量身定制专业的保险理财方案
                </p>
              </div>
            </div>
          </div>

          {/* 表单 - 简化为大输入框 */}
          {!result && (
            <div id="ai-consultant-form" className="bg-white rounded-xl shadow-lg p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 大输入框 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    请描述您的需求
                  </label>
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    rows="8"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-base"
                    placeholder="例如：我今年35岁，男性，年收入80万港币，已婚有一个5岁的孩子。希望为家庭配置重疾保险和储蓄险，预算每年10万左右。关注子女教育金和家庭保障..."
                  />
                  <div className="mt-2 flex items-start space-x-2 text-sm text-gray-500">
                    <SparklesIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-indigo-500" />
                    <p>
                      建议包含：年龄、性别、年收入、家庭状况、保险需求、预算等信息，AI将为您提供个性化建议
                    </p>
                  </div>
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                    <div className="flex items-center">
                      <XMarkIcon className="h-5 w-5 text-red-500 mr-2" />
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {/* 提交按钮 */}
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    清空
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>AI分析中...</span>
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-5 w-5" />
                        <span>获取AI推荐</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* AI推荐结果 */}
          {result && (
            <div id="results-section" className="bg-white rounded-xl shadow-lg p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">AI推荐方案</h2>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-2"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  <span>重新咨询</span>
                </button>
              </div>

              {/* AI建议 */}
              {result.ai_analysis && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 rounded-lg">
                  <h3 className="text-lg font-bold mb-3 flex items-center">
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    AI专业建议
                  </h3>
                  <div className="text-indigo-50 whitespace-pre-line leading-relaxed text-sm">
                    {result.ai_analysis}
                  </div>
                </div>
              )}

              {/* 推荐产品 */}
              {result.recommended_products && result.recommended_products.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    推荐产品 ({result.recommended_products.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.recommended_products.map((product, index) => (
                      <div
                        key={index}
                        className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all hover:border-indigo-300"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-base text-gray-900 mb-1">
                              {product.product_name || '产品名称'}
                            </h4>
                            <p className="text-sm text-gray-600">{product.company || '保险公司'}</p>
                          </div>
                          {product.match_score !== undefined && (
                            <div className={`px-2 py-1 rounded-full text-xs font-bold ${getScoreColor(product.match_score)}`}>
                              {product.match_score}分
                            </div>
                          )}
                        </div>

                        {product.annual_premium && (
                          <div className="bg-indigo-50 rounded-lg p-3 mb-3">
                            <p className="text-xs text-indigo-600 mb-1">年缴保费</p>
                            <p className="text-xl font-bold text-indigo-600">
                              HK${product.annual_premium.toLocaleString()}
                            </p>
                          </div>
                        )}

                        {product.reason && (
                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-600 mb-1 font-medium">推荐理由</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{product.reason}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 客户案例库区域 */}
        <div>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-xl p-6 mb-6 text-white">
            <div className="flex items-start space-x-4">
              <TagIcon className="h-10 w-10 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">客户案例库</h2>
                <p className="text-purple-100">
                  参考真实客户案例，了解不同人生阶段的保险配置方案
                </p>
              </div>
            </div>
          </div>

          {/* 筛选区 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            {/* 搜索框 */}
            <div className="mb-3">
              <div className="relative max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="关键词搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 横向人生阶段标签 */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                人生阶段:
              </label>
              <div className="flex flex-wrap gap-2 flex-1">
                {lifeStages.map(stage => (
                  <button
                    key={stage.value}
                    onClick={() => toggleStage(stage.value)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg border-2 transition-all text-sm ${
                      selectedStages.includes(stage.value)
                        ? stage.color + ' border-current'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-1.5">{stage.icon}</span>
                    <span className="font-medium">{stage.label}</span>
                    <span className="ml-1.5 text-xs">
                      ({allCases.filter(c => (c.tags || []).includes(stage.value)).length})
                    </span>
                  </button>
                ))}
                {selectedStages.length > 0 && (
                  <button
                    onClick={() => setSelectedStages([])}
                    className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                  >
                    清除筛选
                  </button>
                )}
              </div>
            </div>
          </div>

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
                <TagIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">没有找到匹配的案例</h3>
                <p className="text-gray-500">请尝试调整筛选条件或搜索关键词</p>
              </div>
            )}

            {!casesLoading && filteredCases.length > 0 && (
              <div className="space-y-3">
                {filteredCases.map((caseItem) => {
                  const mainStage = caseItem.tags && caseItem.tags.length > 0 ? caseItem.tags[0] : '综合案例';
                  const stageConfig = getStageConfig(mainStage);

                  return (
                    <div
                      key={caseItem.id}
                      onClick={() => handleViewDetail(caseItem)}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4 border border-gray-200 cursor-pointer group"
                    >
                      <div className="flex items-start space-x-3">
                        {/* 左侧图标 */}
                        <div className="flex-shrink-0">
                          {caseItem.case_image ? (
                            <img
                              src={`${API_BASE_URL}${caseItem.case_image}`}
                              alt={caseItem.title}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                              <UserIcon className="h-8 w-8 text-purple-600" />
                            </div>
                          )}
                        </div>

                        {/* 中间内容 */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-1 mb-2">
                            {caseItem.title || `${caseItem.customer_age}岁 · ${caseItem.insured_gender || '未知'} · ${caseItem.family_structure}`}
                          </h3>

                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${stageConfig.color}`}>
                              <span className="mr-1">{stageConfig.icon}</span>
                              {stageConfig.label}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              <UserIcon className="h-3 w-3 mr-1" />
                              {caseItem.customer_age}岁{caseItem.insured_gender ? ` · ${caseItem.insured_gender}` : ''}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              <CurrencyDollarIcon className="h-3 w-3 mr-1" />
                              年缴 HK${parseFloat(caseItem.total_annual_premium).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 line-clamp-1">
                            {caseItem.case_description || caseItem.insurance_needs || '暂无描述'}
                          </p>
                        </div>

                        {/* 右侧箭头 */}
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <EyeIcon className="h-5 w-5 text-purple-600" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 浮动理财顾问气泡按钮 */}
      {!showAdvisorBubble && (
        <button
          onClick={() => setShowAdvisorBubble(true)}
          className="fixed bottom-8 right-8 z-50 group"
        >
          {/* 脉冲动画背景 */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-ping opacity-75"></div>

          {/* 顾问头像 */}
          <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl transform transition-all duration-300 group-hover:scale-110">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>

          {/* 悬停提示气泡 */}
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white px-4 py-2 rounded-lg shadow-lg whitespace-nowrap">
              <span className="text-gray-700 font-medium text-sm">点击咨询理财顾问</span>
            </div>
          </div>
        </button>
      )}

      {/* 理财顾问聊天对话框 */}
      {showAdvisorBubble && (
        <div className="fixed bottom-8 right-8 z-50 w-96 max-w-[calc(100vw-4rem)]">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col h-[500px]">
            {/* 对话框头部 */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold">理财顾问小智</h3>
                  <p className="text-xs text-blue-100">在线为您服务</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdvisorBubble(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* 聊天消息区 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {advisorChatHistory.length === 0 && (
                <div className="text-center py-6">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm">请描述您的需求</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 mb-2">快速提问：</p>
                    {quickQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => setAdvisorMessage(q)}
                        className="block w-full px-3 py-2 bg-white text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors text-left text-sm"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {advisorChatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      msg.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 shadow'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.type === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}

              {advisorTyping && (
                <div className="flex justify-start">
                  <div className="bg-white px-3 py-2 rounded-2xl shadow">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 输入框 */}
            <div className="p-3 border-t bg-white rounded-b-2xl">
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={advisorMessage}
                  onChange={(e) => setAdvisorMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdvisorSendMessage()}
                  placeholder="输入您的问题..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={handleAdvisorSendMessage}
                  disabled={!advisorMessage.trim()}
                  className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => {
                  setShowAdvisorBubble(false);
                  document.getElementById('ai-consultant-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full hover:from-green-600 hover:to-emerald-700 transition-all text-xs font-medium"
              >
                填写详细表单获取完整分析
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
                <XMarkIcon className="h-5 w-5 text-gray-600" />
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
                        <span className="mr-1">{stageConfig.icon}</span>
                        {stageConfig.label}
                      </span>
                    );
                  })}
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedCase.title || `${selectedCase.customer_age}岁 · ${selectedCase.family_structure}`}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                    <UserIcon className="h-4 w-4 mr-1.5 text-purple-600" />
                    客户信息
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">年龄</span>
                      <span className="font-semibold text-gray-900">{selectedCase.customer_age}岁</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">年收入</span>
                      <span className="font-semibold text-gray-900">
                        {selectedCase.income_display || `HK$${parseFloat(selectedCase.annual_income).toLocaleString()}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 block mb-1">家庭状况</span>
                      <span className="font-semibold text-gray-900">{selectedCase.family_structure}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 flex flex-col justify-center">
                  <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                    <CurrencyDollarIcon className="h-4 w-4 mr-1.5 text-green-600" />
                    年缴保费总额
                  </h4>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedCase.premium_display || `HK$${parseFloat(selectedCase.total_annual_premium).toLocaleString()}`}
                  </p>
                  {selectedCase.product_count && (
                    <p className="text-xs text-gray-600 mt-1">
                      共 {selectedCase.product_count} 个产品
                    </p>
                  )}
                </div>
              </div>

              {selectedCase.key_points && selectedCase.key_points.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                    <TagIcon className="h-4 w-4 mr-1.5 text-indigo-600" />
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

              {selectedCase.case_description && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">案例说明</h4>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedCase.case_description}
                  </p>
                </div>
              )}

              {selectedCase.insurance_needs && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">保险需求</h4>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedCase.insurance_needs}
                  </p>
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
    </div>
  );
};

export default AIConsultantWithCases;
