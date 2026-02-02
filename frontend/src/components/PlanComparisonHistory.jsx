import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../hooks/useAppNavigate';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { ArrowLeftIcon, DocumentTextIcon, TrashIcon, ArrowDownTrayIcon, EyeIcon } from '@heroicons/react/24/outline';

function PlanComparisonHistory() {
  const { user } = useAuth();
  const onNavigate = useAppNavigate();

  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComparison, setSelectedComparison] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // 加载对比历史
  useEffect(() => {
    loadComparisons();
  }, []);

  const loadComparisons = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/api/plan-comparison/history/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setComparisons(response.data.comparisons);
      }
    } catch (error) {
      console.error('加载对比历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 查看对比报告
  const viewReport = async (comparisonId) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await axios.get(
        `${API_BASE_URL}/api/plan-comparison/${comparisonId}/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSelectedComparison(response.data.comparison);
        setShowReportModal(true);
      }
    } catch (error) {
      console.error('加载对比报告失败:', error);
      alert('加载对比报告失败');
    }
  };

  // 下载PDF
  const downloadPdf = async (comparisonId, pdfNumber, pdfName) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await axios.get(
        `${API_BASE_URL}/api/plan-comparison/${comparisonId}/download/${pdfNumber}/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          responseType: 'blob'
        }
      );

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', pdfName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('下载PDF失败:', error);
      alert('下载PDF失败');
    }
  };

  // 删除对比记录
  const deleteComparison = async (comparisonId) => {
    if (!confirm('确定要删除这条对比记录吗？')) return;

    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await axios.delete(
        `${API_BASE_URL}/api/plan-comparison/${comparisonId}/delete/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        alert('删除成功');
        loadComparisons();
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* 头部导航 */}
        <div className="mb-4 sm:mb-8">
          <button
            onClick={() => onNavigate('plan-comparison')}
            className="inline-flex items-center gap-1 sm:gap-2 text-sm sm:text-base text-gray-600 hover:text-gray-900 transition-colors mb-3 sm:mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>返回对比页面</span>
          </button>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <DocumentTextIcon className="w-6 h-6 sm:w-9 sm:h-9 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">对比历史记录</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-0.5 sm:mt-1">查看历史对比报告，下载原始PDF文件</p>
            </div>
          </div>
        </div>

        {/* 历史记录列表 */}
        {loading ? (
          <div className="flex justify-center items-center py-12 sm:py-20">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : comparisons.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 text-center">
            <DocumentTextIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-600 text-base sm:text-lg">暂无对比记录</p>
            <button
              onClick={() => onNavigate('plan-comparison')}
              className="mt-3 sm:mt-4 px-5 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              开始对比
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {comparisons.map((comparison) => (
              <div
                key={comparison.id}
                className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                          对比分析 #{comparison.id}
                        </h3>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-500">
                        {new Date(comparison.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>

                    {/* PDF文件列表 */}
                    <div className="space-y-2 sm:ml-9">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <span className="text-xs sm:text-sm text-gray-600">计划书1:</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">{comparison.pdf1_name}</span>
                        <button
                          onClick={() => downloadPdf(comparison.id, 1, comparison.pdf1_name)}
                          disabled
                          className="text-xs text-gray-400 flex items-center gap-1 self-start cursor-not-allowed"
                          title="下载功能暂时禁用"
                        >
                          <ArrowDownTrayIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          下载
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <span className="text-xs sm:text-sm text-gray-600">计划书2:</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">{comparison.pdf2_name}</span>
                        <button
                          onClick={() => downloadPdf(comparison.id, 2, comparison.pdf2_name)}
                          disabled
                          className="text-xs text-gray-400 flex items-center gap-1 self-start cursor-not-allowed"
                          title="下载功能暂时禁用"
                        >
                          <ArrowDownTrayIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          下载
                        </button>
                      </div>

                      {comparison.pdf3_name && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <span className="text-xs sm:text-sm text-gray-600">计划书3:</span>
                          <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">{comparison.pdf3_name}</span>
                          <button
                            onClick={() => downloadPdf(comparison.id, 3, comparison.pdf3_name)}
                            disabled
                            className="text-xs text-gray-400 flex items-center gap-1 self-start cursor-not-allowed"
                            title="下载功能暂时禁用"
                          >
                            <ArrowDownTrayIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            下载
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => viewReport(comparison.id)}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                    >
                      <EyeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">查看报告</span>
                      <span className="sm:hidden">查看</span>
                    </button>
                    <button
                      onClick={() => deleteComparison(comparison.id)}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                    >
                      <TrashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">删除</span>
                      <span className="sm:hidden">删除</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 对比报告模态框 */}
      {showReportModal && selectedComparison && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col">
            {/* 模态框头部 */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">对比分析报告</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 模态框内容 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
              <style>
                {`
                  /* 移动端表格优化 */
                  @media (max-width: 640px) {
                    .prose table {
                      font-size: 0.75rem;
                      display: block;
                      overflow-x: auto;
                      -webkit-overflow-scrolling: touch;
                    }
                    .prose th,
                    .prose td {
                      padding: 0.375rem 0.5rem;
                      white-space: nowrap;
                    }
                    .prose h1 {
                      font-size: 1.25rem;
                      margin-top: 1rem;
                      margin-bottom: 0.75rem;
                    }
                    .prose h2 {
                      font-size: 1.125rem;
                      margin-top: 0.875rem;
                      margin-bottom: 0.625rem;
                    }
                    .prose h3 {
                      font-size: 1rem;
                      margin-top: 0.75rem;
                      margin-bottom: 0.5rem;
                    }
                    .prose p {
                      font-size: 0.875rem;
                      line-height: 1.5;
                      margin-top: 0.5rem;
                      margin-bottom: 0.5rem;
                    }
                    .prose ul,
                    .prose ol {
                      font-size: 0.875rem;
                      padding-left: 1.25rem;
                    }
                    .prose li {
                      margin-top: 0.25rem;
                      margin-bottom: 0.25rem;
                    }
                  }
                `}
              </style>
              <div
                className="prose prose-sm sm:prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedComparison.comparison_report }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlanComparisonHistory;
