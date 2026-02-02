import React, { useState, useEffect } from 'react';
import { ArrowLeft, Table as TableIcon, Loader2, AlertCircle, Download } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';
import rehypeRaw from 'rehype-raw';

function TableDetail() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTableDetail();
  }, [tableId]);

  const fetchTableDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📡 正在获取表格详情，ID:', tableId);
      const response = await authFetch(`/api/ocr/tables/${tableId}/`);

      if (!response.ok) {
        console.error('❌ HTTP错误:', response.status, response.statusText);
        setError(`HTTP错误 ${response.status}: ${response.statusText}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('📦 API返回数据:', data);

      if (data.status === 'success') {
        console.log('✅ 表格数据加载成功');
        setTable(data.data);
      } else {
        console.error('❌ API返回错误:', data.message);
        setError(data.message || '获取表格详情失败');
      }
    } catch (error) {
      console.error('❌ 获取表格详情失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadHTML = () => {
    if (!table) return;

    const blob = new Blob([table.html_source], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.plan_document.file_name}_table${table.table_number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">正在加载表格...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">加载失败</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  if (!table) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="font-medium">返回</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <TableIcon className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg font-semibold text-gray-900">表格详情</h1>
              </div>
            </div>
            <button
              onClick={handleDownloadHTML}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4 mr-2" />
              下载HTML
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 表格信息卡片 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">所属文档</label>
              <p className="mt-1 text-sm text-gray-900">{table.plan_document.file_name}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">表格编号</label>
              <p className="mt-1 text-sm text-gray-900">表格 {table.table_number}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500 uppercase">表格名称</label>
              <p className="mt-1 text-base font-semibold text-gray-900">{table.table_name}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">总行数</label>
              <p className="mt-1 text-sm text-gray-900">{table.row_count} 行</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">创建时间</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(table.created_at).toLocaleString('zh-CN')}
              </p>
            </div>
            {table.fields && (
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase">字段列表</label>
                <p className="mt-1 text-sm text-gray-700">{table.fields}</p>
              </div>
            )}
          </div>
        </div>

        {/* 表格内容卡片 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">表格内容</h2>
            <span className="text-sm text-gray-500">
              HTML源代码 ({table.html_source.length.toLocaleString()} 字符)
            </span>
          </div>

          {/* HTML 渲染预览 */}
          <div className="border border-gray-300 rounded-lg overflow-x-auto">
            <div
              className="p-4"
              dangerouslySetInnerHTML={{ __html: table.html_source }}
              style={{
                // 为表格添加一些基础样式
                '--table-styles': `
                  table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.875rem;
                  }
                  th, td {
                    border: 1px solid #e5e7eb;
                    padding: 0.5rem;
                    text-align: left;
                  }
                  th {
                    background-color: #f9fafb;
                    font-weight: 600;
                    color: #374151;
                  }
                  tr:hover {
                    background-color: #f9fafb;
                  }
                `
              }}
            />
          </div>

          {/* HTML源代码查看 */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 select-none">
              查看HTML源代码
            </summary>
            <div className="mt-3 bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-snug">
                {table.html_source}
              </pre>
            </div>
          </details>
        </div>
      </div>

      {/* 添加表格样式 */}
      <style>{`
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 0.5rem;
          text-align: left;
        }
        th {
          background-color: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        tr:hover {
          background-color: #f9fafb;
        }
      `}</style>
    </div>
  );
}

export default TableDetail;
