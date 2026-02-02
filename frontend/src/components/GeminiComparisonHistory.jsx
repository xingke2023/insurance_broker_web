import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Download, Trash2, Eye, ArrowLeft, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../hooks/useAppNavigate';
import { authFetch } from '../utils/authFetch';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE_URL = '';

function GeminiComparisonHistory() {
  const onNavigate = useAppNavigate();
  const { user } = useAuth();
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 加载对比历史
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await authFetch(`${API_BASE_URL}/api/gemini-comparison/history/`);
      setComparisons(response.comparisons);
    } catch (err) {
      console.error('加载历史失败:', err);
      setError('加载历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 下载 PDF
  const handleDownloadPDF = async (comparisonId, pdfNumber, filename) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API_BASE_URL}/api/gemini-comparison/${comparisonId}/download/${pdfNumber}/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('下载失败');
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('下载PDF失败:', err);
      alert('下载失败: ' + err.message);
    }
  };

  // 删除对比报告
  const handleDelete = async (comparisonId) => {
    if (!window.confirm('确认删除此对比报告？')) {
      return;
    }

    try {
      await authFetch(`${API_BASE_URL}/api/gemini-comparison/${comparisonId}/delete/`, {
        method: 'DELETE'
      });

      // 从列表中移除
      setComparisons(prev => prev.filter(c => c.id !== comparisonId));
      alert('删除成功');
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败: ' + err.message);
    }
  };

  // 查看详情
  const handleViewDetail = (comparisonId) => {
    onNavigate(`/gemini-comparison/${comparisonId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">对比历史</h1>
            <p className="text-gray-600">查看所有计划书对比分析记录</p>
          </div>
          <button
            onClick={() => onNavigate('/plan-analyzer2')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回对比分析
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 p-4 rounded-lg border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* 对比历史列表 */}
        {comparisons.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无对比记录</h3>
            <p className="text-gray-500 mb-6">开始你的第一次计划书对比分析吧</p>
            <button
              onClick={() => onNavigate('/plan-analyzer2')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              开始对比分析
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {comparisons.map((comparison) => (
              <div key={comparison.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {comparison.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{comparison.created_at}</span>
                    </div>
                  </div>

                  {/* 状态标签 */}
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    comparison.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : comparison.status === 'processing'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {comparison.status === 'completed' ? '已完成' : comparison.status === 'processing' ? '分析中' : '失败'}
                  </div>
                </div>

                {/* 计划书列表 */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">对比的计划书：</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {comparison.file_names.map((filename, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate" title={filename}>
                            {filename}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDownloadPDF(comparison.id, index + 1, filename)}
                          disabled
                          className="ml-2 p-1 text-gray-400 flex-shrink-0 cursor-not-allowed"
                          title="下载功能暂时禁用"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleViewDetail(comparison.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    查看对比报告
                  </button>
                  <button
                    onClick={() => handleDelete(comparison.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 对比报告详情页面
function GeminiComparisonDetail() {
  const onNavigate = useAppNavigate();
  const { id } = useParams();
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDetail();
  }, [id]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const data = await authFetch(`${API_BASE_URL}/api/gemini-comparison/${id}/`);
      setComparison(data);
    } catch (err) {
      console.error('加载详情失败:', err);
      setError('加载对比报告失败');
    } finally {
      setLoading(false);
    }
  };

  // 下载 PDF
  const handleDownloadPDF = async (pdfNumber, filename) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API_BASE_URL}/api/gemini-comparison/${id}/download/${pdfNumber}/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('下载失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('下载PDF失败:', err);
      alert('下载失败: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 p-8 rounded-lg border border-red-200">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-700 text-center mb-4">{error}</h3>
            <div className="text-center">
              <button
                onClick={() => onNavigate('/gemini-comparison-history')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                返回历史列表
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{comparison.title}</h1>
            <p className="text-gray-600">{comparison.created_at}</p>
          </div>
          <button
            onClick={() => onNavigate('/gemini-comparison-history')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回历史
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {/* 对比的计划书列表 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">对比计划书</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {comparison.file_names.map((filename, index) => (
                <div key={index} className={`p-4 rounded-lg ${
                  index === 0 ? 'bg-blue-50' : index === 1 ? 'bg-purple-50' : 'bg-pink-50'
                }`}>
                  <h4 className={`font-semibold mb-2 ${
                    index === 0 ? 'text-blue-700' : index === 1 ? 'text-purple-700' : 'text-pink-700'
                  }`}>
                    计划书 {index + 1}
                  </h4>
                  <p className="text-sm text-gray-700 mb-3">{filename}</p>
                  <button
                    onClick={() => handleDownloadPDF(index + 1, filename)}
                    disabled
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-400 border border-gray-300 rounded-lg cursor-not-allowed w-full justify-center"
                    title="下载功能暂时禁用"
                  >
                    <Download className="w-4 h-4" />
                    下载PDF
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 对比报告内容 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">对比分析报告</h3>
            <div className="prose prose-blue max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto my-6">
                      <table className="min-w-full divide-y divide-gray-300 border border-gray-300" {...props} />
                    </div>
                  ),
                  th: ({node, ...props}) => (
                    <th className="px-4 py-3 bg-gray-100 text-left text-sm font-semibold text-gray-900 border border-gray-300" {...props} />
                  ),
                  td: ({node, ...props}) => (
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-300" {...props} />
                  ),
                }}
              >
                {comparison.report}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { GeminiComparisonHistory, GeminiComparisonDetail };
export default GeminiComparisonHistory;
