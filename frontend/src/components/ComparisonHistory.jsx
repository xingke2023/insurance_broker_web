import { useState, useEffect } from 'react';
import { List, Eye, Trash2, Loader2, ArrowLeft, FileText, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../hooks/useAppNavigate';
import { authFetch } from '../utils/authFetch';

const API_BASE_URL = '';

function ComparisonHistory() {
  const onNavigate = useAppNavigate();
  const { user } = useAuth();

  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComparison, setSelectedComparison] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchComparisons();
  }, []);

  // 获取对比历史列表
  const fetchComparisons = async () => {
    try {
      setLoading(true);
      const response = await authFetch(`${API_BASE_URL}/api/comparison/list_comparisons/`);
      
      if (!response.ok) {
        throw new Error('获取对比历史失败');
      }

      const data = await response.json();
      setComparisons(data);
    } catch (error) {
      console.error('获取对比历史失败:', error);
      alert('获取对比历史失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 查看对比详情
  const handleViewDetail = async (comparisonId) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/api/comparison/${comparisonId}/get_comparison/`);
      
      if (!response.ok) {
        throw new Error('获取对比详情失败');
      }

      const data = await response.json();
      setSelectedComparison(data);
      setShowDetail(true);
    } catch (error) {
      console.error('获取对比详情失败:', error);
      alert('获取对比详情失败，请重试');
    }
  };

  // 删除对比记录
  const handleDelete = async (comparisonId) => {
    if (!window.confirm('确定要删除这条对比记录吗？')) {
      return;
    }

    try {
      const response = await authFetch(`${API_BASE_URL}/api/comparison/${comparisonId}/`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      // 刷新列表
      fetchComparisons();
      alert('删除成功');
    } catch (error) {
      console.error('删除对比记录失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 返回列表视图
  const handleBackToList = () => {
    setShowDetail(false);
    setSelectedComparison(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {!showDetail ? (
          <>
            {/* 列表视图 */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">对比历史记录</h1>
                <p className="text-gray-600">查看您的所有计划书对比分析记录</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => onNavigate('/plan-analyzer2')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  新建对比
                </button>
                <button
                  onClick={() => onNavigate('/dashboard')}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  返回首页
                </button>
              </div>
            </div>

            {/* 对比记录列表 */}
            {comparisons.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <List className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">暂无对比记录</h3>
                <p className="text-gray-600 mb-6">您还没有创建任何对比分析</p>
                <button
                  onClick={() => onNavigate('/plan-analyzer2')}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  立即创建对比
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {comparisons.map(comparison => (
                  <div
                    key={comparison.id}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {comparison.comparison_title}
                        </h3>

                        {/* 对比的计划书 */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            <FileText className="w-4 h-4" />
                            {comparison.document1_name}
                          </span>
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                            <FileText className="w-4 h-4" />
                            {comparison.document2_name}
                          </span>
                          {comparison.document3_name && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm">
                              <FileText className="w-4 h-4" />
                              {comparison.document3_name}
                            </span>
                          )}
                        </div>

                        {/* 创建时间 */}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {formatDate(comparison.created_at)}
                        </div>

                        {/* 状态标签 */}
                        <div className="mt-3">
                          {comparison.status === 'completed' && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                              已完成
                            </span>
                          )}
                          {comparison.status === 'processing' && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                              分析中
                            </span>
                          )}
                          {comparison.status === 'failed' && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                              失败
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetail(comparison.id)}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(comparison.id)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* 详情视图 */}
            <div className="mb-6">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                返回列表
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedComparison?.comparison_title}
                </h2>
                <div className="text-sm text-gray-500">
                  {formatDate(selectedComparison?.created_at)}
                </div>
              </div>

              {/* 对比的计划书列表 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">对比计划书</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedComparison?.document1_detail && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-700 mb-2">计划书 1</h4>
                      <p className="text-sm text-gray-700">{selectedComparison.document1_detail.file_name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {selectedComparison.document1_detail.insurance_company} - {selectedComparison.document1_detail.insurance_product}
                      </p>
                    </div>
                  )}
                  {selectedComparison?.document2_detail && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-700 mb-2">计划书 2</h4>
                      <p className="text-sm text-gray-700">{selectedComparison.document2_detail.file_name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {selectedComparison.document2_detail.insurance_company} - {selectedComparison.document2_detail.insurance_product}
                      </p>
                    </div>
                  )}
                  {selectedComparison?.document3_detail && (
                    <div className="bg-pink-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-pink-700 mb-2">计划书 3</h4>
                      <p className="text-sm text-gray-700">{selectedComparison.document3_detail.file_name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {selectedComparison.document3_detail.insurance_company} - {selectedComparison.document3_detail.insurance_product}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI生成的对比总结 */}
              <div className="prose max-w-none">
                <div
                  dangerouslySetInnerHTML={{ 
                    __html: selectedComparison?.comparison_summary || '<p>暂无对比分析结果</p>' 
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ComparisonHistory;
