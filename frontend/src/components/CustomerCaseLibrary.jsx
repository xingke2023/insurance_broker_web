import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL, API_BASE_URL } from '../config';
import {
  ArrowLeftIcon,
  XMarkIcon,
  UserIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ShareIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const CustomerCaseLibrary = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCases, setTotalCases] = useState(0);
  const casesPerPage = 12; // 每页显示12个案例（3列x4行）

  // 获取所有案例
  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);
      setError(null);

      try {
        // 先获取总数
        const countResponse = await axios.get(
          `${API_URL}/customer-cases/`,
          { params: { page_size: 1 } }
        );

        let total = 0;
        if (countResponse.data.success) {
          total = countResponse.data.data.count || 0;
          setTotalCases(total);
        }

        // 然后获取所有数据
        const response = await axios.get(
          `${API_URL}/customer-cases/`,
          { params: { page_size: Math.max(total, 1000) } }
        );

        if (response.data.success) {
          setCases(response.data.data.results || []);
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

    fetchCases();
  }, []);

  // 获取案例详情
  const handleViewDetail = async (caseItem) => {
    try {
      const response = await axios.get(
        `${API_URL}/customer-cases/${caseItem.id}/`
      );

      if (response.data.success) {
        setSelectedCase(response.data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('获取案例详情失败:', err);
      alert('获取案例详情失败，请稍后重试');
    }
  };

  // 分享案例
  const handleShare = (caseItem) => {
    const shareText = `【保险案例分享】${caseItem.title}\n\n客户情况：${caseItem.customer_age}岁，${caseItem.family_structure}\n年收入：HK$${caseItem.annual_income.toLocaleString()}\n年缴保费：HK$${caseItem.total_annual_premium.toLocaleString()}`;

    if (navigator.share) {
      navigator.share({
        title: caseItem.title,
        text: shareText,
      }).catch(err => console.error('分享失败:', err));
    } else {
      // 复制到剪贴板
      navigator.clipboard.writeText(shareText).then(() => {
        alert('案例信息已复制到剪贴板！');
      });
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
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
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <DocumentTextIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">客户案例库</h1>
                  <p className="text-sm text-gray-500">真实案例，专业参考</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 案例统计信息卡片 */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-700 rounded-2xl shadow-xl p-6 mb-8 text-white">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-12 w-12 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">真实客户案例库</h2>
              <p className="text-white/90 text-lg">
                共收录 {totalCases} 个真实案例，涵盖不同年龄、收入和家庭结构的保险配置方案
              </p>
            </div>
          </div>
        </div>

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
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
            <div className="flex items-center">
              <XMarkIcon className="h-6 w-6 text-red-500 mr-3" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && cases.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无案例</h3>
            <p className="text-gray-500">该阶段暂时没有案例，请选择其他阶段查看</p>
          </div>
        )}

        {/* 案例列表 - Grid布局 */}
        {!loading && !error && cases.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cases.slice((currentPage - 1) * casesPerPage, currentPage * casesPerPage).map((caseItem) => (
              <div
                key={caseItem.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group cursor-pointer"
                onClick={() => handleViewDetail(caseItem)}
              >
                {/* 案例信息 */}
                <div className="p-6">
                  {/* 标题 */}
                  <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {caseItem.title}
                  </h3>

                  {/* 案例描述预览 */}
                  {caseItem.case_description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {caseItem.case_description}
                    </p>
                  )}

                  {/* 关键要点预览 */}
                  {caseItem.key_points && caseItem.key_points.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>关键要点</span>
                      </div>
                      <ul className="space-y-1">
                        {caseItem.key_points.slice(0, 2).map((point, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start">
                            <span className="text-indigo-500 mr-2">•</span>
                            <span className="line-clamp-1">{point}</span>
                          </li>
                        ))}
                      </ul>
                      {caseItem.key_points.length > 2 && (
                        <p className="text-xs text-gray-400 mt-1">
                          还有 {caseItem.key_points.length - 2} 个要点...
                        </p>
                      )}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewDetail(caseItem)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                    >
                      查看详情
                    </button>
                    <button
                      onClick={() => handleShare(caseItem)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ShareIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              ))}
            </div>

            {/* 分页控件和总数显示 */}
            <div className="mt-8">
              {Math.ceil(cases.length / casesPerPage) > 1 ? (
                <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    setCurrentPage(prev => Math.max(1, prev - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(cases.length / casesPerPage) }, (_, i) => i + 1).map((pageNum) => {
                    const totalPages = Math.ceil(cases.length / casesPerPage);
                    // 显示逻辑：首页、尾页、当前页及其前后各1页
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white font-semibold'
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
                  onClick={() => {
                    setCurrentPage(prev => Math.min(Math.ceil(cases.length / casesPerPage), prev + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === Math.ceil(cases.length / casesPerPage)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                  <span className="ml-4 text-sm text-gray-600">
                    共 {totalCases} 条案例，第 {currentPage}/{Math.ceil(cases.length / casesPerPage)} 页
                  </span>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-600 bg-white rounded-lg shadow-sm py-3 px-4 border border-gray-200">
                  共 {totalCases} 条案例
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 案例详情弹窗 */}
      {showDetailModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen px-4 py-8 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* 弹窗头部 */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-gray-900">{selectedCase.title}</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* 弹窗内容 */}
              <div className="p-8">
                {/* 案例配图 */}
                {selectedCase.case_image && (
                  <div className="mb-8 rounded-xl overflow-hidden">
                    <img
                      src={`${API_BASE_URL}${selectedCase.case_image}`}
                      alt={selectedCase.title}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}

                {/* 客户信息汇总 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">年龄</p>
                    <p className="text-lg font-bold text-gray-900">{selectedCase.customer_age}岁</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">家庭结构</p>
                    <p className="text-lg font-bold text-gray-900">{selectedCase.family_structure}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">年收入</p>
                    <p className="text-lg font-bold text-gray-900">{selectedCase.income_display}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">年缴保费</p>
                    <p className="text-lg font-bold text-indigo-600">{selectedCase.premium_display}</p>
                  </div>
                </div>

                {/* 家庭结构 */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <UsersIcon className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-gray-900">家庭结构</h3>
                  </div>
                  <p className="text-gray-700">{selectedCase.family_structure}</p>
                </div>

                {/* 保险需求 */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <ShieldCheckIcon className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-gray-900">保险需求</h3>
                  </div>
                  <p className="text-gray-700 whitespace-pre-line">{selectedCase.insurance_needs}</p>
                </div>

                {/* 案例详细说明 */}
                {selectedCase.case_description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">案例说明</h3>
                    <div className="prose max-w-none">
                      <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                        {selectedCase.case_description}
                      </p>
                    </div>
                  </div>
                )}

                {/* 关键要点 */}
                {selectedCase.key_points && selectedCase.key_points.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">关键要点</h3>
                    <div className="space-y-3">
                      {selectedCase.key_points.map((point, idx) => (
                        <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </div>
                          <p className="text-gray-700 flex-1">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 预算建议 */}
                {selectedCase.budget_suggestion && (
                  <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <p className="text-sm text-blue-600 font-semibold mb-1">预算建议</p>
                    <p className="text-gray-700">{selectedCase.budget_suggestion}</p>
                  </div>
                )}

                {/* 推荐产品列表 */}
                {selectedCase.recommended_products && selectedCase.recommended_products.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      推荐产品配置 ({selectedCase.recommended_products.length}个)
                    </h3>
                    <div className="space-y-4">
                      {selectedCase.recommended_products.map((product, idx) => (
                        <div key={idx} className="border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-lg text-gray-900 mb-1">
                                {product.product_name || '产品名称'}
                              </h4>
                              <p className="text-sm text-gray-600">{product.company || '保险公司'}</p>
                            </div>
                            {product.coverage_type && (
                              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                                {product.coverage_type}
                              </span>
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
                              <p className="text-sm text-gray-600 mb-1 font-medium">推荐理由</p>
                              <p className="text-sm text-gray-700">{product.reason}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 底部操作按钮 */}
                <div className="flex space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => handleShare(selectedCase)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                  >
                    <ShareIcon className="h-5 w-5" />
                    <span>分享案例</span>
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 隐藏滚动条样式 */}
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default CustomerCaseLibrary;
