import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Loader2, AlertCircle, Send, RefreshCw, Table, ChevronDown, ChevronUp, TrendingUp, Target, Award } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function DocumentContentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [content, setContent] = useState('');
  const [userInput, setUserInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState('');
  const [extractedTables, setExtractedTables] = useState([]);
  const [tableSummary, setTableSummary] = useState('');
  const [table1Data, setTable1Data] = useState(null);
  const [table2Data, setTable2Data] = useState(null);
  const [isTablesOpen, setIsTablesOpen] = useState(true);
  const [isContentOpen, setIsContentOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isTable1Open, setIsTable1Open] = useState(true);
  const [isTable2Open, setIsTable2Open] = useState(true);
  const [updatingTableSummary, setUpdatingTableSummary] = useState(false);
  const [updatingSurrenderValue, setUpdatingSurrenderValue] = useState(false);
  const [updatingWellnessTable, setUpdatingWellnessTable] = useState(false);
  const [updatingPlanSummary, setUpdatingPlanSummary] = useState(false);
  const [planSummary, setPlanSummary] = useState('');
  const [isPlanSummaryOpen, setIsPlanSummaryOpen] = useState(true);

  useEffect(() => {
    fetchDocumentDetail();
  }, [id]);

  // 不再需要提取函数，直接使用 tablecontent 字段

  const fetchDocumentDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📡 正在获取文档详情，ID:', id);
      const response = await authFetch(`/api/ocr/documents/${id}/`);

      if (!response.ok) {
        console.error('❌ HTTP错误:', response.status, response.statusText);
        setError(`HTTP错误 ${response.status}: ${response.statusText}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('📦 API返回数据:', data);

      if (data.status === 'success') {
        console.log('✅ 文档数据加载成功');
        setDocument(data.data);
        const docContent = data.data.content || '';
        setContent(docContent);

        // 直接使用 tablecontent 字段
        const tableContent = data.data.tablecontent || '';
        // 将 tablecontent 转换为数组格式以适配现有显示逻辑
        if (tableContent) {
          setExtractedTables([{ id: 1, content: tableContent }]);
          console.log('📊 从数据库获取表格内容，长度:', tableContent.length);
        } else {
          setExtractedTables([]);
          console.log('📊 数据库中无表格内容');
        }

        // 获取 tablesummary 字段
        const tableSummaryContent = data.data.tablesummary || '';
        setTableSummary(tableSummaryContent);
        console.log('📋 从数据库获取表格概要，长度:', tableSummaryContent.length);

        // 获取 table1 字段（基本计划退保价值表）
        const table1Content = data.data.table1 || '';
        if (table1Content) {
          try {
            const table1Json = typeof table1Content === 'string' ? JSON.parse(table1Content) : table1Content;

            // 补全total字段（如果缺失）
            if (table1Json?.years) {
              table1Json.years = table1Json.years.map(year => {
                if (year.total === undefined || year.total === null) {
                  year.total = (year.guaranteed || 0) + (year.non_guaranteed || 0);
                }
                return year;
              });
            }

            setTable1Data(table1Json);
            console.log('📊 从数据库获取table1数据，记录数:', table1Json?.years?.length || 0);
          } catch (e) {
            console.error('❌ table1 JSON解析失败:', e);
            setTable1Data(null);
          }
        } else {
          setTable1Data(null);
        }

        // 获取 table2 字段（无忧选退保价值表）
        const table2Content = data.data.table2 || '';
        if (table2Content) {
          try {
            const table2Json = typeof table2Content === 'string' ? JSON.parse(table2Content) : table2Content;
            setTable2Data(table2Json);
            console.log('📊 从数据库获取table2数据，记录数:', table2Json?.years?.length || 0);
          } catch (e) {
            console.error('❌ table2 JSON解析失败:', e);
            setTable2Data(null);
          }
        } else {
          setTable2Data(null);
        }

        // 获取 summary 字段（计划书概要）
        const planSummaryContent = data.data.summary || '';
        setPlanSummary(planSummaryContent);
        console.log('📝 从数据库获取计划书概要，长度:', planSummaryContent.length);
      } else {
        console.error('❌ API返回错误:', data.message);
        setError(data.message || '获取文档详情失败');
      }
    } catch (error) {
      console.error('❌ 获取文档详情失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!userInput.trim() || processing) return;

    setProcessing(true);
    setResult(''); // 清空之前的结果

    try {
      console.log('📤 发送用户请求:', userInput);

      const response = await authFetch(`/api/content-editor/${id}/process/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_input: userInput
        }),
      });

      const data = await response.json();
      console.log('📥 收到响应:', data);

      if (data.status === 'success') {
        setResult(data.result);
        console.log('✅ 处理成功');
      } else {
        setResult(`错误: ${data.message || '处理失败'}`);
        console.error('❌ 处理失败:', data.message);
      }
    } catch (error) {
      console.error('❌ 发送请求失败:', error);
      setResult(`错误: 网络请求失败，请稍后重试`);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateTableSummary = async () => {
    if (updatingTableSummary) return;

    // 显示初始提示
    alert('正在调用AI分析表格结构，预计需要15-30秒，请耐心等待...');
    setUpdatingTableSummary(true);

    try {
      console.log('📤 发送更新表格概要请求');

      const response = await authFetch(`/api/content-editor/${id}/update-tablesummary/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 收到响应:', data);

      if (data.status === 'success') {
        setTableSummary(data.tablesummary);
        setIsSummaryOpen(true); // 自动展开显示
        console.log('✅ 表格概要更新成功');
        alert('表格概要更新成功！');
      } else {
        console.error('❌ 更新失败:', data.message);
        alert(`更新失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('❌ 更新表格概要失败:', error);
      if (error.name === 'AbortError') {
        alert('请求超时，DeepSeek API响应时间过长，请稍后重试');
      } else {
        alert('网络请求失败，请稍后重试');
      }
    } finally {
      setUpdatingTableSummary(false);
    }
  };

  const handleUpdateSurrenderValue = async () => {
    if (updatingSurrenderValue) return;

    // 显示初始提示
    alert('正在调用AI提取退保价值表数据，预计需要15-30秒，请耐心等待...');
    setUpdatingSurrenderValue(true);

    try {
      console.log('📤 发送更新退保价值表请求');

      const response = await authFetch(`/api/content-editor/${id}/update-surrender-value/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📥 收到响应:', data);

      if (data.status === 'success') {
        console.log('✅ 退保价值表更新成功');
        console.log('   数据条数:', data.table1?.years?.length || 0);
        alert(`退保价值表更新成功！共提取 ${data.table1?.years?.length || 0} 条数据`);
        // 可选：重新加载文档详情以刷新数据
        fetchDocumentDetail();
      } else {
        console.error('❌ 更新失败:', data.message);
        alert(`更新失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('❌ 更新退保价值表失败:', error);
      alert('网络请求失败，请稍后重试');
    } finally {
      setUpdatingSurrenderValue(false);
    }
  };

  // 处理更新无忧选退保价值表按钮点击
  const handleUpdateWellnessTable = async () => {
    if (updatingWellnessTable) return;

    // 显示初始提示
    alert('正在调用AI提取无忧选退保价值表数据，预计需要15-30秒，请耐心等待...');
    setUpdatingWellnessTable(true);

    try {
      const response = await authFetch(`/api/content-editor/${id}/update-wellness-table/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.status === 'success') {
        console.log('✅ 无忧选退保价值表更新成功');

        // 判断是否找到数据
        if (data.table2 === '' || data.table2 === null) {
          console.log('   未找到包含入息的表格');
          alert('未找到无忧选退保价值表（此计划书无包含入息的表格）');
        } else {
          console.log('   数据条数:', data.table2?.years?.length || 0);
          alert(`无忧选退保价值表更新成功！共提取 ${data.table2?.years?.length || 0} 条数据`);
        }

        // 刷新文档详情
        fetchDocumentDetail();
      } else {
        alert(data.message || '更新失败');
      }
    } catch (error) {
      console.error('❌ 更新无忧选退保价值表失败:', error);
      alert('网络请求失败，请稍后重试');
    } finally {
      setUpdatingWellnessTable(false);
    }
  };

  // 处理更新计划书概要按钮点击
  const handleUpdatePlanSummary = async () => {
    if (updatingPlanSummary) return;

    // 显示初始提示
    alert('正在调用AI生成计划书概要，预计需要30-60秒，请耐心等待...');
    setUpdatingPlanSummary(true);

    try {
      console.log('📤 发送更新计划书概要请求');

      const response = await authFetch(`/api/content-editor/${id}/update-plan-summary/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📥 收到响应:', data);

      if (data.status === 'success') {
        setPlanSummary(data.summary);
        setIsPlanSummaryOpen(true); // 自动展开显示
        console.log('✅ 计划书概要更新成功');
        alert('计划书概要更新成功！');
      } else {
        console.error('❌ 更新失败:', data.message);
        alert(`更新失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('❌ 更新计划书概要失败:', error);
      alert('网络请求失败，请稍后重试');
    } finally {
      setUpdatingPlanSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 text-center mb-2">加载失败</h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={() => navigate(`/document/${id}`)}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
          >
            返回详情页
          </button>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 text-center mb-2">文档未找到</h2>
          <p className="text-gray-600 text-center mb-4">未能加载文档数据</p>
          <button
            onClick={() => navigate('/plan-management')}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <button
                onClick={() => navigate(`/document/${id}`)}
                className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-gray-800 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">返回</span>
              </button>
              <div className="h-4 sm:h-6 w-px bg-gray-300 flex-shrink-0"></div>
              <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
                <h1 className="text-base sm:text-xl font-bold text-gray-800 truncate">编辑器</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">
                {result ? '✅ 已完成' : '等待处理'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-6">

        {/* 操作按钮组 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
            <button
              onClick={handleUpdateTableSummary}
              disabled={updatingTableSummary}
              className="px-2 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 sm:space-x-2"
            >
              {updatingTableSummary ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  <span>更新中...</span>
                </>
              ) : (
                <span className="truncate">表格概要</span>
              )}
            </button>
            <button
              onClick={handleUpdateSurrenderValue}
              disabled={updatingSurrenderValue}
              className="px-2 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs sm:text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 sm:space-x-2"
            >
              {updatingSurrenderValue ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  <span>更新中...</span>
                </>
              ) : (
                <span className="truncate">退保价值表</span>
              )}
            </button>
            <button
              onClick={handleUpdateWellnessTable}
              disabled={updatingWellnessTable}
              className="px-2 sm:px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-xs sm:text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 sm:space-x-2"
            >
              {updatingWellnessTable ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  <span>更新中...</span>
                </>
              ) : (
                <span className="truncate">无忧选表</span>
              )}
            </button>
            <button
              onClick={handleUpdatePlanSummary}
              disabled={updatingPlanSummary}
              className="px-2 sm:px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-xs sm:text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 sm:space-x-2"
            >
              {updatingPlanSummary ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  <span>更新中...</span>
                </>
              ) : (
                <span className="truncate">计划书概要</span>
              )}
            </button>
          </div>
        </div>

        {/* 文档基本信息 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{document.file_name}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
                {document.insured_name && (
                  <span className="truncate">受保人: {document.insured_name}</span>
                )}
                {document.insurance_product && (
                  <span className="truncate">产品: {document.insurance_product}</span>
                )}
                <span className="hidden sm:inline">内容: {content.length.toLocaleString()} 字符</span>
              </div>
            </div>
            <button
              onClick={fetchDocumentDetail}
              className="flex items-center justify-center space-x-1 sm:space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition text-xs sm:text-sm flex-shrink-0"
            >
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>刷新</span>
            </button>
          </div>
        </div>

        {/* 表格概要 (tablesummary) - 已隐藏 */}
        {false && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-2 rounded"
            onClick={() => setIsSummaryOpen(!isSummaryOpen)}
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">表格概要 (Table Summary)</h3>
              <span className="text-sm text-gray-500">
                {tableSummary ? `(${tableSummary.length} 字符)` : '(未生成)'}
              </span>
            </div>
            {isSummaryOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {isSummaryOpen && (
            <div className="mt-3">
              {tableSummary ? (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {tableSummary}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">暂无表格概要</p>
                  <p className="text-xs text-gray-400 mt-1">点击"更新tablesummary"按钮生成概要</p>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* 计划书概要 (summary) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-2 rounded"
            onClick={() => setIsPlanSummaryOpen(!isPlanSummaryOpen)}
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">计划书概要</h3>
              <span className="text-sm text-gray-500">
                {planSummary ? `(${planSummary.length} 字符)` : '(未生成)'}
              </span>
            </div>
            {isPlanSummaryOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {isPlanSummaryOpen && (
            <div className="mt-3">
              {planSummary ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: planSummary }}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">暂无计划书概要</p>
                  <p className="text-xs text-gray-400 mt-1">点击"更新计划书概要"按钮生成概要</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 基本计划退保价值表 (table1) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-2 rounded"
            onClick={() => setIsTable1Open(!isTable1Open)}
          >
            <div className="flex items-center space-x-2">
              <Table className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">基本计划退保价值表</h3>
              <span className="text-sm text-gray-500">
                {table1Data?.years?.length > 0 ? `(${table1Data.years.length} 条记录)` : '(暂不提供)'}
              </span>
            </div>
            {isTable1Open ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {isTable1Open && (
            <div className="mt-3">
              {table1Data?.years?.length > 0 ? (
                <div className="bg-blue-50 rounded-lg p-2 sm:p-4 overflow-x-auto border border-blue-200">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-blue-300">
                        <th className="px-1 sm:px-2 py-1 sm:py-2 text-left font-medium text-blue-900 text-xs sm:text-sm" colSpan="2">
                          <div className="flex items-center gap-1">
                            <span>保单年度</span>
                            <span className="text-gray-400">/</span>
                            <span>年龄</span>
                          </div>
                        </th>
                        <th className="px-1 sm:px-3 py-1 sm:py-2 text-right font-medium text-blue-900 text-xs sm:text-sm">保证金额</th>
                        <th className="px-1 sm:px-3 py-1 sm:py-2 text-right font-medium text-blue-900 text-xs sm:text-sm">总额</th>
                        <th className="px-1 sm:px-3 py-1 sm:py-2 text-right font-medium text-blue-900 text-xs sm:text-sm">单利%</th>
                        <th className="px-1 sm:px-3 py-1 sm:py-2 text-right font-medium text-blue-900 text-xs sm:text-sm">IRR%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table1Data.years.map((row, idx) => {
                        const annualPremium = document?.annual_premium ? parseInt(document.annual_premium) : 0;
                        const paymentYears = document?.payment_years ? parseInt(document.payment_years) : 0;
                        const actualInvestment = annualPremium * Math.min(row.policy_year, paymentYears);
                        const returnValue = row.total || 0;

                        // 计算实际年龄
                        const insuredAge = document?.insured_age ? parseInt(document.insured_age) : 0;
                        const actualAge = insuredAge > 0 ? insuredAge + parseInt(row.policy_year) : null;

                        // 年化单利
                        const simpleReturn = actualInvestment > 0 && returnValue > 0 && row.policy_year > 0
                          ? ((returnValue - actualInvestment) / actualInvestment / row.policy_year * 100)
                          : 0;

                        // IRR (内部收益率)
                        const irr = actualInvestment > 0 && returnValue > 0 && row.policy_year > 0
                          ? (Math.pow(returnValue / actualInvestment, 1 / row.policy_year) - 1) * 100
                          : 0;

                        return (
                          <tr key={idx} className="border-b border-blue-200 hover:bg-blue-100">
                            <td className="px-1 sm:px-2 py-1 sm:py-2 text-left text-gray-700" colSpan="2">
                              <div className="flex items-center gap-1">
                                <span>{row.policy_year}</span>
                                <span className="text-gray-400 text-xs">/</span>
                                <span>{actualAge ? `${actualAge}岁` : '-'}</span>
                              </div>
                            </td>
                            <td className="px-1 sm:px-3 py-1 sm:py-2 text-right text-gray-700">
                              {row.guaranteed ? row.guaranteed.toLocaleString() : '-'}
                            </td>
                            <td className="px-1 sm:px-3 py-1 sm:py-2 text-right text-gray-700 font-medium">
                              {row.total ? row.total.toLocaleString() : '-'}
                            </td>
                            <td className="px-1 sm:px-3 py-1 sm:py-2 text-right text-purple-600 font-semibold">
                              {!isNaN(simpleReturn) && simpleReturn !== 0 ? simpleReturn.toFixed(2) : '-'}
                            </td>
                            <td className="px-1 sm:px-3 py-1 sm:py-2 text-right text-green-600 font-semibold">
                              {!isNaN(irr) && irr !== 0 ? irr.toFixed(2) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">暂无基本计划退保价值表</p>
                  <p className="text-xs text-gray-400 mt-1">点击下方"更新退保价值表"按钮生成数据</p>
                </div>
              )}
            </div>
          )}

          {/* 投资回报可视化图表 */}
          {isTable1Open && table1Data?.years?.length > 0 && document?.annual_premium && document?.payment_years && (() => {
            // 安全计算投资总额
            const annualPremium = parseInt(document.annual_premium) || 0;
            const paymentYears = parseInt(document.payment_years) || 0;
            const totalInvestment = annualPremium * paymentYears;

            return (
            <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm sm:text-base font-semibold text-gray-800">投资回报可视化分析</h4>
              </div>

              {/* 关键指标 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-500">总投资</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {(totalInvestment).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-500">最终回报</p>
                  <p className="text-lg font-bold text-green-600">
                    {table1Data.years[table1Data.years.length - 1]?.total?.toLocaleString() || '-'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-500">回报倍数</p>
                  <p className="text-lg font-bold text-purple-600">
                    {((table1Data.years[table1Data.years.length - 1]?.total || 0) / (totalInvestment)).toFixed(2)}x
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-500">总增值</p>
                  <p className="text-lg font-bold text-orange-600">
                    {((table1Data.years[table1Data.years.length - 1]?.total || 0) - (totalInvestment)).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-500">回本年度</p>
                  <p className="text-lg font-bold text-teal-600">
                    {(() => {
                      // totalInvestment already defined
                      const breakEvenYear = table1Data.years.find(item => item.total >= totalInvestment);
                      return breakEvenYear ? `第${breakEvenYear.policy_year}年` : '未回本';
                    })()}
                  </p>
                </div>
              </div>

              {/* 分阶段收益率展示 */}
              <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Award className="w-5 h-5 text-blue-600" />
                  <h5 className="text-sm font-semibold text-gray-700">📊 分阶段收益率分析</h5>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(() => {
                    // totalInvestment already defined
                    const milestoneYears = [5, 10, 20, 30, 40, 50, 60, 70].filter(year =>
                      table1Data.years.some(item => item.policy_year === year)
                    );

                    return milestoneYears.map(year => {
                      const yearData = table1Data.years.find(item => item.policy_year === year);
                      if (!yearData) return null;

                      const actualInvestment = annualPremium * Math.min(year, paymentYears);
                      const returnValue = yearData.total;

                      // 年化单利
                      const simpleReturn = ((returnValue - actualInvestment) / actualInvestment / year * 100);

                      // IRR (内部收益率)
                      const irr = actualInvestment > 0 && returnValue > 0
                        ? (Math.pow(returnValue / actualInvestment, 1 / year) - 1) * 100
                        : 0;

                      return (
                        <div key={year} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                          <p className="text-xs text-gray-600 font-semibold mb-2">第 {year} 年</p>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">年化单利:</span>
                              <span className="text-sm font-bold text-blue-600">{simpleReturn.toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">IRR:</span>
                              <span className="text-sm font-bold text-rose-600">{irr.toFixed(2)}%</span>
                            </div>
                            <div className="pt-1 border-t border-blue-200">
                              <span className="text-xs text-gray-400">回报: {returnValue.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* 关键里程碑时间轴 */}
              <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Target className="w-5 h-5 text-amber-600" />
                  <h5 className="text-sm font-semibold text-gray-700">🎯 关键回报里程碑</h5>
                </div>
                <div className="relative">
                  {/* 时间轴线 */}
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-300 via-yellow-300 to-green-300"></div>

                  {/* 里程碑列表 */}
                  <div className="space-y-6">
                    {(() => {
                      // totalInvestment already defined
                      const milestones = [
                        {
                          label: '回本点',
                          multiplier: 1,
                          color: 'bg-red-500',
                          icon: '💰',
                          desc: '回报等于投资'
                        },
                        {
                          label: '1.5倍回报',
                          multiplier: 1.5,
                          color: 'bg-orange-500',
                          icon: '📈',
                          desc: '回报50%'
                        },
                        {
                          label: '2倍回报',
                          multiplier: 2,
                          color: 'bg-yellow-500',
                          icon: '🎯',
                          desc: '翻倍'
                        },
                        {
                          label: '3倍回报',
                          multiplier: 3,
                          color: 'bg-lime-500',
                          icon: '🚀',
                          desc: '3倍增长'
                        },
                        {
                          label: '4倍回报',
                          multiplier: 4,
                          color: 'bg-green-500',
                          icon: '💎',
                          desc: '4倍增长'
                        },
                        {
                          label: '5倍回报',
                          multiplier: 5,
                          color: 'bg-emerald-500',
                          icon: '👑',
                          desc: '5倍增长'
                        }
                      ];

                      return milestones.map((milestone, idx) => {
                        const targetAmount = totalInvestment * milestone.multiplier;
                        const reachedYear = table1Data.years.find(item => item.total >= targetAmount);

                        return (
                          <div key={idx} className="relative pl-20 group">
                            {/* 时间轴节点 */}
                            <div className={`absolute left-5 w-6 h-6 rounded-full ${milestone.color} flex items-center justify-center text-white text-xs font-bold shadow-lg z-10 group-hover:scale-125 transition-transform`}>
                              {reachedYear ? '✓' : '○'}
                            </div>

                            {/* 里程碑信息 */}
                            <div className={`bg-gradient-to-r ${reachedYear ? 'from-green-50 to-emerald-50 border-green-200' : 'from-gray-50 to-gray-100 border-gray-200'} rounded-lg p-3 border-2 transition-all group-hover:shadow-md`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span className="text-2xl">{milestone.icon}</span>
                                  <div>
                                    <h6 className="font-semibold text-gray-800 text-sm">{milestone.label}</h6>
                                    <p className="text-xs text-gray-500">{milestone.desc}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {reachedYear ? (
                                    <>
                                      <p className="text-lg font-bold text-green-600">第 {reachedYear.policy_year} 年</p>
                                      <p className="text-xs text-gray-500">
                                        回报: {reachedYear.total.toLocaleString()}
                                      </p>
                                      <p className="text-xs font-semibold text-rose-600 mt-1">
                                        IRR: {(() => {
                                          const actualInvestment = annualPremium * Math.min(reachedYear.policy_year, paymentYears);
                                          const irr = actualInvestment > 0 && reachedYear.total > 0
                                            ? (Math.pow(reachedYear.total / actualInvestment, 1 / reachedYear.policy_year) - 1) * 100
                                            : 0;
                                          return irr.toFixed(2);
                                        })()}%
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-sm text-gray-400">未达成</p>
                                  )}
                                </div>
                              </div>
                              {/* 进度条 */}
                              {!reachedYear && (
                                <div className="mt-2">
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                                      style={{
                                        width: `${Math.min((table1Data.years[table1Data.years.length - 1]?.total / targetAmount) * 100, 100)}%`
                                      }}
                                    ></div>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">
                                    需要: {targetAmount.toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* 图表区域 - 早期回报详细视图 */}
              <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">📍 前10年回报详细分析（重点关注期）</h5>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={table1Data.years.slice(0, 10).map(item => ({
                      ...item,
                      investment: annualPremium * Math.min(item.policy_year, paymentYears),
                      roi: ((item.total / (annualPremium * Math.min(item.policy_year, paymentYears))) * 100 - 100).toFixed(1)
                    }))}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="policy_year"
                      label={{ value: '保单年度', position: 'insideBottom', offset: -5 }}
                      stroke="#6b7280"
                    />
                    <YAxis
                      yAxisId="left"
                      label={{ value: '金额', angle: -90, position: 'insideLeft' }}
                      stroke="#6b7280"
                      tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      label={{ value: '回报率%', angle: 90, position: 'insideRight' }}
                      stroke="#8b5cf6"
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === '回报率') return `${value}%`;
                        return value.toLocaleString();
                      }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="investment"
                      stroke="#ef4444"
                      name="累计投资"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="total"
                      stroke="#10b981"
                      name="总回报"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="roi"
                      stroke="#8b5cf6"
                      name="回报率"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  🎯 关注前期：红线=投资 | 绿线=回报 | 紫虚线=回报率% | 回报超过投资即为盈利
                </p>
              </div>
            </div>
            );
          })()}
        </div>

        {/* 无忧选退保价值表 (table2) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-2 rounded"
            onClick={() => setIsTable2Open(!isTable2Open)}
          >
            <div className="flex items-center space-x-2">
              <Table className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">提取后退保价值表</h3>
              <span className="text-sm text-gray-500">
                {table2Data?.years?.length > 0 ? `(${table2Data.years.length} 条记录)` : '(暂不提供)'}
              </span>
            </div>
            {isTable2Open ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {isTable2Open && (
            <div className="mt-3">
              {table2Data?.years?.length > 0 ? (
                <div className="bg-purple-50 rounded-lg p-2 sm:p-4 overflow-x-auto border border-purple-200">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-purple-300">
                        <th className="px-1 sm:px-2 py-1 sm:py-2 text-left font-medium text-purple-900 text-xs sm:text-sm" colSpan="2">
                          <div className="flex items-center gap-1">
                            <span>保单年度</span>
                            <span className="text-gray-400">/</span>
                            <span>年龄</span>
                          </div>
                        </th>
                        <th className="px-1 sm:px-3 py-1 sm:py-2 text-right font-medium text-purple-900 text-xs sm:text-sm">年提取</th>
                        <th className="px-1 sm:px-3 py-1 sm:py-2 text-right font-medium text-purple-900 text-xs sm:text-sm hidden sm:table-cell">累计</th>
                        <th className="px-1 sm:px-3 py-1 sm:py-2 text-right font-medium text-purple-900 text-xs sm:text-sm">总额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table2Data.years.map((row, idx) => {
                        // 计算实际年龄
                        const insuredAge = document?.insured_age ? parseInt(document.insured_age) : 0;
                        const actualAge = insuredAge > 0 ? insuredAge + parseInt(row.policy_year) : null;

                        return (
                          <tr key={idx} className="border-b border-purple-200 hover:bg-purple-100">
                            <td className="px-1 sm:px-2 py-1 sm:py-2 text-left text-gray-700" colSpan="2">
                              <div className="flex items-center gap-1">
                                <span>{row.policy_year}</span>
                                <span className="text-gray-400 text-xs">/</span>
                                <span>{actualAge ? `${actualAge}岁` : '-'}</span>
                              </div>
                            </td>
                            <td className="px-1 sm:px-3 py-1 sm:py-2 text-right text-gray-700">
                              {row.withdraw !== undefined ? row.withdraw.toLocaleString() : '-'}
                            </td>
                            <td className="px-1 sm:px-3 py-1 sm:py-2 text-right text-gray-700 hidden sm:table-cell">
                              {row.withdraw_total !== undefined ? row.withdraw_total.toLocaleString() : '-'}
                            </td>
                            <td className="px-1 sm:px-3 py-1 sm:py-2 text-right text-gray-700 font-medium">
                              {row.total !== undefined ? row.total.toLocaleString() : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">暂无无忧选退保价值表</p>
                  <p className="text-xs text-gray-400 mt-1">点击下方"更新无忧选退保价值表"按钮生成数据</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 计划书Table内容 - 已隐藏 */}
        {false && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-2 rounded"
            onClick={() => setIsTablesOpen(!isTablesOpen)}
          >
            <div className="flex items-center space-x-2">
              <Table className="w-4 h-4 text-green-600" />
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">计划书Table内容</h3>
              <span className="text-sm text-gray-500">
                {extractedTables.length > 0 ? `(${extractedTables.length} 个表格)` : '(未检测到表格)'}
              </span>
            </div>
            {isTablesOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {isTablesOpen && (
            <div className="mt-3">
              {extractedTables.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto border border-gray-200">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {extractedTables.map(table => table.content).join('\n\n')}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Table className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">未检测到 &lt;table&gt; 标签</p>
                  <p className="text-xs text-gray-400 mt-1">系统会自动识别HTML表格标签</p>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* 用户输入区域 - 已隐藏 */}
        {false && (
        <>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="mb-3">
            <label className="block text-sm sm:text-base font-semibold text-gray-800 mb-2">
              输入您的要求
            </label>
            <p className="text-sm text-gray-600 mb-3">
              输入您想对这份计划书进行的操作或提出的问题，AI将基于计划书内容给出回答
            </p>
          </div>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && !processing) {
                handleSendRequest();
              }
            }}
            placeholder="例如：请总结这份计划书的核心保障内容&#10;例如：请分析这份保单的收益情况&#10;例如：请列出重要的时间节点&#10;&#10;按 Ctrl+Enter 快速发送"
            disabled={processing}
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-500">
              已输入: {userInput.length} 字符
            </span>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setUserInput('')}
                disabled={processing}
                className="text-sm text-gray-600 hover:text-gray-800 underline disabled:opacity-50"
              >
                清空
              </button>
              <button
                onClick={handleSendRequest}
                disabled={processing || !userInput.trim()}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>处理中...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>发送</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* AI返回结果区域 */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-green-600" />
                <span>AI 处理结果</span>
              </h3>
              <button
                onClick={() => setResult('')}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                清空结果
              </button>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  className="text-sm text-gray-700 leading-relaxed"
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-lg font-bold text-gray-900 mt-4 mb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-sm sm:text-base font-semibold text-gray-800 mt-3 mb-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-sm font-medium text-gray-700 mt-2 mb-1" {...props} />,
                    p: ({node, ...props}) => <p className="text-sm text-gray-700 mb-2 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 mb-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 mb-2" {...props} />,
                    li: ({node, ...props}) => <li className="text-sm text-gray-700" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                    code: ({node, inline, ...props}) =>
                      inline ?
                        <code className="bg-white px-1.5 py-0.5 rounded text-xs font-mono text-indigo-700 border border-indigo-200" {...props} /> :
                        <code className="block bg-white p-2 rounded text-xs font-mono text-gray-800 border border-gray-300 overflow-x-auto" {...props} />,
                  }}
                >
                  {result}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* 操作说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">使用说明</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 系统已自动提取文档中的所有表格并集中显示</li>
                <li>• 在输入框中输入您的要求或问题</li>
                <li>• 点击"发送"按钮或按 Ctrl+Enter 提交请求</li>
                <li>• AI将基于计划书内容分析并返回结果</li>
                <li>• 支持多轮提问，每次都会获得新的回答</li>
              </ul>
            </div>
          </div>
        </div>
        </>
        )}

        {/* 计划书完整内容（放在最后） - 已隐藏 */}
        {false && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-2 rounded"
            onClick={() => setIsContentOpen(!isContentOpen)}
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">计划书完整内容</h3>
              <span className="text-sm text-gray-500">OCR识别的原始文本</span>
            </div>
            {isContentOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {isContentOpen && (
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-200 mt-3">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {content || '暂无内容'}
              </pre>
            </div>
          )}
        </div>
        )}

      </div>
    </div>
  );
}

export default DocumentContentEditor;
