import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL, API_BASE_URL } from '../config';
import {
  ArrowLeftIcon,
  XMarkIcon,
  UserIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  TagIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const CustomerCaseLibraryForum = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allCases, setAllCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [selectedStages, setSelectedStages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);

  // 人生阶段标签配置
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
      setLoading(true);
      setError(null);

      try {
        // 直接获取所有案例
        const response = await axios.get(`${API_URL}/customer-cases/`, {
          params: { page_size: 100 }
        });

        if (response.data.success) {
          const cases = response.data.data.results || [];
          setAllCases(cases);
          setFilteredCases(cases);
        } else {
          setError('获取案例失败');
        }
      } catch (err) {
        console.error('获取案例失败:', err);
        setError('获取案例失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchAllCases();
  }, []);

  // 筛选案例
  useEffect(() => {
    let filtered = allCases;

    // 按阶段筛选（检查案例的tags数组）
    if (selectedStages.length > 0) {
      filtered = filtered.filter(c => {
        // 检查案例的tags数组是否包含任何选中的阶段
        const caseTags = c.tags || [];
        return selectedStages.some(stage => caseTags.includes(stage));
      });
    }

    // 按关键词搜索（不搜索人生阶段标签）
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title?.toLowerCase().includes(query) ||
        c.case_description?.toLowerCase().includes(query) ||
        c.insurance_needs?.toLowerCase().includes(query) ||
        c.family_structure?.toLowerCase().includes(query) ||
        c.customer_age?.toString().includes(query) ||
        c.annual_income?.toString().includes(query) ||
        c.total_annual_premium?.toString().includes(query)
      );
    }

    setFilteredCases(filtered);
  }, [selectedStages, searchQuery, allCases]);

  // 切换阶段筛选
  const toggleStage = (stage) => {
    setSelectedStages(prev =>
      prev.includes(stage)
        ? prev.filter(s => s !== stage)
        : [...prev, stage]
    );
  };

  // 获取阶段配置
  const getStageConfig = (stage) => {
    return lifeStages.find(s => s.value === stage) || lifeStages[0];
  };

  // 查看案例详情
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
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
              <h1 className="text-2xl font-bold text-gray-900">港险案例汇编</h1>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-full">
                {filteredCases.length} 个案例
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 顶部筛选区 - 横向布局 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          {/* 搜索按钮和搜索框 */}
          <div>
            {!showSearchBox ? (
              <button
                onClick={() => setShowSearchBox(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">搜索案例</span>
              </button>
            ) : (
              <div className="relative max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="关键词搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearchBox(false);
                    setSearchQuery('');
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 案例列表 */}
        <div>
          {/* 加载状态 */}
          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">加载案例中...</p>
              </div>
            </div>
          )}

          {/* 错误状态 */}
          {error && !loading && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* 空状态 */}
          {!loading && !error && filteredCases.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <TagIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">没有找到匹配的案例</h3>
              <p className="text-gray-500">请尝试调整筛选条件或搜索关键词</p>
            </div>
          )}

          {/* 案例列表 - 紧凑布局 */}
          {!loading && !error && filteredCases.length > 0 && (
            <div className="space-y-3">
              {filteredCases.map((caseItem) => {
                // 使用tags数组的第一个标签作为主阶段
                const mainStage = caseItem.tags && caseItem.tags.length > 0 ? caseItem.tags[0] : '综合案例';
                const stageConfig = getStageConfig(mainStage);

                return (
                  <div
                    key={caseItem.id}
                    onClick={() => handleViewDetail(caseItem)}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4 border border-gray-200 cursor-pointer group"
                  >
                    <div className="flex items-start space-x-3">
                      {/* 左侧图片/图标 - 更小 */}
                      <div className="flex-shrink-0">
                        {caseItem.case_image ? (
                          <img
                            src={`${API_BASE_URL}${caseItem.case_image}`}
                            alt={caseItem.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            <UserIcon className="h-8 w-8 text-indigo-600" />
                          </div>
                        )}
                      </div>

                      {/* 中间内容 */}
                      <div className="flex-1 min-w-0">
                        {/* 标题 */}
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-2">
                          {caseItem.title || `${caseItem.customer_age}岁 · ${caseItem.insured_gender || '未知'} · ${caseItem.family_structure}`}
                        </h3>

                        {/* 标签行 - 紧凑 */}
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
                            年收入 HK${parseFloat(caseItem.annual_income).toLocaleString()}
                          </span>
                        </div>

                        {/* 摘要 */}
                        <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                          {caseItem.case_description || caseItem.insurance_needs || '暂无描述'}
                        </p>

                        {/* 底部信息栏 - 紧凑 */}
                        <div className="flex items-center text-xs text-gray-500 space-x-3">
                          <span className="flex items-center">
                            <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                            {new Date(caseItem.created_at).toLocaleDateString('zh-CN')}
                          </span>
                          <span className="flex items-center">
                            年缴保费 HK${parseFloat(caseItem.total_annual_premium).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* 右侧箭头 */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 详情弹窗 - 紧凑布局 */}
      {showDetailModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* 弹窗头部 - 紧凑 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
              <h2 className="text-xl font-bold text-gray-900">案例详情</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* 弹窗内容 - 紧凑 */}
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* 案例配图 - 缩小 */}
              {selectedCase.case_image && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img
                    src={`${API_BASE_URL}${selectedCase.case_image}`}
                    alt={selectedCase.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {/* 标题和标签 - 紧凑 */}
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

              {/* 客户信息 + 关键要点 - 两列布局 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {/* 客户信息 */}
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

                {/* 年缴保费总额 */}
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

              {/* 保险需求 */}
              {selectedCase.insurance_needs && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 mb-4 border border-amber-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">保险需求</h4>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedCase.insurance_needs}
                  </p>
                </div>
              )}

              {/* 客户案例分析 */}
              {selectedCase.case_description && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 mb-4 border border-blue-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">客户案例分析</h4>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedCase.case_description}
                  </p>
                </div>
              )}

              {/* 关键要点 */}
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

              {/* 推荐产品 */}
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
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded whitespace-nowrap ml-2">
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

              {/* 预算建议 */}
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

export default CustomerCaseLibraryForum;
