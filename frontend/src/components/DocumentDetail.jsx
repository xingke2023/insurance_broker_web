import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Building2, Calendar, DollarSign, FileText, Loader2, AlertCircle, MessageSquare, Send, X, ChevronDown, ChevronUp, Table, Eye } from 'lucide-react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Collapse states - 默认全部折叠
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isTableSummaryOpen, setIsTableSummaryOpen] = useState(false); // 表格分析基本情况折叠状态
  const [isTable1Open, setIsTable1Open] = useState(false); // 新增：保单价值表折叠状态
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [isPlanTablesOpen, setIsPlanTablesOpen] = useState(false); // 表格列表折叠状态
  const [isContentOpen, setIsContentOpen] = useState(false); // 默认折叠内容区域
  const [isTableContentOpen, setIsTableContentOpen] = useState(false); // 表格内容折叠状态

  // Reanalyze table content states
  const [reanalyzingTableContent, setReanalyzingTableContent] = useState(false);
  const [tableContentReanalyzeError, setTableContentReanalyzeError] = useState(null);

  // Reanalyze table summary states
  const [reanalyzingTableSummary, setReanalyzingTableSummary] = useState(false);
  const [tableSummaryReanalyzeError, setTableSummaryReanalyzeError] = useState(null);

  // Reextract tablecontent function
  const handleReextractTableContent = async () => {
    if (reanalyzingTableContent) return;

    setReanalyzingTableContent(true);
    setTableContentReanalyzeError(null);

    try {
      console.log('🔄 正在触发重新提取表格源代码，文档ID:', id);
      const response = await authFetch(`/api/ocr/documents/${id}/reextract-tablecontent/`, {
        method: 'POST'
      });

      const data = await response.json();
      console.log('📦 API返回:', data);

      if (data.status === 'success') {
        console.log('✅ 表格源代码重新提取任务已启动');
        // 启动轮询检查状态
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await authFetch(`/api/ocr/documents/${id}/status/`);
            const statusData = await statusResponse.json();

            if (statusData.status === 'success') {
              const stage = statusData.data.processing_stage;

              // 如果完成，刷新文档详情
              if (stage === 'all_completed' || stage === 'tablecontent_completed') {
                clearInterval(pollInterval);
                await fetchDocumentDetail();
                setReanalyzingTableContent(false);
                console.log('✅ 表格源代码重新提取完成！');
              }
            }
          } catch (err) {
            console.error('轮询状态出错:', err);
          }
        }, 3000); // 每3秒轮询一次

        // 60秒后停止轮询
        setTimeout(() => {
          clearInterval(pollInterval);
          if (reanalyzingTableContent) {
            setReanalyzingTableContent(false);
            setTableContentReanalyzeError('表格源代码重新提取超时，请刷新页面查看');
          }
        }, 60000);
      } else {
        setReanalyzingTableContent(false);
        setTableContentReanalyzeError(data.message || '触发表格源代码重新提取失败');
      }
    } catch (error) {
      console.error('❌ 触发表格源代码重新提取失败:', error);
      setReanalyzingTableContent(false);
      setTableContentReanalyzeError('网络错误，请稍后重试');
    }
  };

  // Reextract table1 function
  const handleReextractTable1 = async () => {
    if (reextractingTable1) return;

    setReextractingTable1(true);
    setTable1ReextractError(null);

    try {
      console.log('🔄 正在触发重新提取保单价值表，文档ID:', id);
      const response = await authFetch(`/api/ocr/documents/${id}/reextract-table1/`, {
        method: 'POST'
      });

      const data = await response.json();
      console.log('📦 API返回:', data);

      if (data.status === 'success') {
        console.log('✅ 保单价值表重新提取任务已启动');
        // 启动轮询检查状态
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await authFetch(`/api/ocr/documents/${id}/status/`);
            const statusData = await statusResponse.json();

            if (statusData.status === 'success') {
              const stage = statusData.data.processing_stage;

              // 如果完成，刷新文档详情
              if (stage === 'all_completed') {
                clearInterval(pollInterval);
                await fetchDocumentDetail();
                setReextractingTable1(false);
                console.log('✅ 保单价值表重新提取完成！');
              }
            }
          } catch (err) {
            console.error('轮询状态出错:', err);
          }
        }, 3000); // 每3秒轮询一次

        // 60秒后停止轮询
        setTimeout(() => {
          clearInterval(pollInterval);
          if (reextractingTable1) {
            setReextractingTable1(false);
            setTable1ReextractError('保单价值表重新提取超时，请刷新页面查看');
          }
        }, 60000);
      } else {
        setReextractingTable1(false);
        setTable1ReextractError(data.message || '触发保单价值表重新提取失败');
      }
    } catch (error) {
      console.error('❌ 触发保单价值表重新提取失败:', error);
      setReextractingTable1(false);
      setTable1ReextractError('网络错误，请稍后重试');
    }
  };

  // Reanalyze table summary function
  const handleReanalyzeTableSummary = async () => {
    if (reanalyzingTableSummary) return;

    setReanalyzingTableSummary(true);
    setTableSummaryReanalyzeError(null);

    try {
      console.log('🔄 正在触发重新分析表格，文档ID:', id);
      const response = await authFetch(`/api/ocr/documents/${id}/reanalyze-tables/`, {
        method: 'POST'
      });

      const data = await response.json();
      console.log('📦 API返回:', data);

      if (data.status === 'success') {
        console.log('✅ 表格重新分析任务已启动');
        // 启动轮询检查状态
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await authFetch(`/api/ocr/documents/${id}/status/`);
            const statusData = await statusResponse.json();

            if (statusData.status === 'success') {
              const stage = statusData.data.processing_stage;

              // 如果完成，刷新文档详情
              if (stage === 'all_completed' || stage === 'tablesummary_completed') {
                clearInterval(pollInterval);
                await fetchDocumentDetail();
                setReanalyzingTableSummary(false);
                console.log('✅ 表格重新分析完成！');
              }
            }
          } catch (err) {
            console.error('轮询状态出错:', err);
          }
        }, 3000); // 每3秒轮询一次

        // 60秒后停止轮询
        setTimeout(() => {
          clearInterval(pollInterval);
          if (reanalyzingTableSummary) {
            setReanalyzingTableSummary(false);
            setTableSummaryReanalyzeError('表格重新分析超时，请刷新页面查看');
          }
        }, 60000);
      } else {
        setReanalyzingTableSummary(false);
        setTableSummaryReanalyzeError(data.message || '触发表格重新分析失败');
      }
    } catch (error) {
      console.error('❌ 触发表格重新分析失败:', error);
      setReanalyzingTableSummary(false);
      setTableSummaryReanalyzeError('网络错误，请稍后重试');
    }
  };

  // Re-OCR function
  const handleReOCR = async () => {
    if (reOCRing) return;

    setReOCRing(true);
    setReOCRError(null);

    try {
      console.log('🔄 正在触发重新OCR识别，文档ID:', id);
      const response = await authFetch(`/api/ocr/documents/${id}/re-ocr/`, {
        method: 'POST'
      });

      const data = await response.json();
      console.log('📦 API返回:', data);

      if (data.status === 'success') {
        console.log('✅ 重新OCR识别任务已启动');

        // 立即刷新一次，获取最新状态
        await fetchDocumentDetail();

        // 启动轮询检查状态
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await authFetch(`/api/ocr/documents/${id}/status/`);
            const statusData = await statusResponse.json();

            if (statusData.status === 'success') {
              const stage = statusData.data.processing_stage;
              console.log('📊 当前处理阶段:', stage);

              // 如果OCR完成（包括所有后续阶段），刷新并停止
              if (stage === 'all_completed' ||
                  stage === 'ocr_completed' ||
                  stage.includes('completed')) {
                clearInterval(pollInterval);
                await fetchDocumentDetail();
                setReOCRing(false);
                console.log('✅ 重新OCR识别完成！');
              }
            }
          } catch (err) {
            console.error('轮询状态出错:', err);
          }
        }, 3000); // 每3秒轮询一次

        // 120秒后停止轮询
        setTimeout(() => {
          clearInterval(pollInterval);
          if (reOCRing) {
            setReOCRing(false);
            console.log('⏱️ 轮询超时，但任务可能仍在后台执行');
          }
        }, 120000);
      } else {
        setReOCRing(false);
        setReOCRError(data.message || '触发重新OCR识别失败');
      }
    } catch (error) {
      console.error('❌ 触发重新OCR识别失败:', error);
      setReOCRing(false);
      setReOCRError('网络错误，请稍后重试');
    }
  };

  // Chat states
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatMessagesEndRef = useRef(null);

  // Extract summary states
  const [extractingSummary, setExtractingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // Extract basic info states
  const [extractingBasicInfo, setExtractingBasicInfo] = useState(false);
  const [basicInfoError, setBasicInfoError] = useState(null);

  // Reanalyze tables states
  const [reanalyzingTables, setReanalyzingTables] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState(null);

  // Re-OCR states
  const [reOCRing, setReOCRing] = useState(false);
  const [reOCRError, setReOCRError] = useState(null);

  // Reextract table1 states
  const [reextractingTable1, setReextractingTable1] = useState(false);
  const [table1ReextractError, setTable1ReextractError] = useState(null);

  useEffect(() => {
    fetchDocumentDetail();
  }, [id]);

  // 检测URL参数，自动打开聊天窗口
  useEffect(() => {
    if (searchParams.get('openChat') === 'true' && document) {
      handleOpenChat();
    }
  }, [searchParams, document]);

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

  const formatNumber = (num) => {
    if (!num) return '-';
    return Number(num).toLocaleString('zh-CN');
  };

  const formatCurrency = (num) => {
    if (!num) return '-';
    return `¥${formatNumber(num)}`;
  };

  // Extract basic info function
  const handleExtractBasicInfo = async () => {
    if (extractingBasicInfo) return;

    setExtractingBasicInfo(true);
    setBasicInfoError(null);

    try {
      console.log('💼 正在触发提取基本信息，文档ID:', id);
      const response = await authFetch(`/api/ocr/documents/${id}/extract-basic-info/`, {
        method: 'POST'
      });

      const data = await response.json();
      console.log('📦 API返回:', data);

      if (data.status === 'success') {
        console.log('✅ 基本信息提取任务已启动');
        // 启动轮询检查状态
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await authFetch(`/api/ocr/documents/${id}/status/`);
            const statusData = await statusResponse.json();

            if (statusData.status === 'success') {
              const stage = statusData.data.processing_stage;

              // 如果完成，刷新文档详情
              if (stage === 'basic_info_completed' || stage === 'all_completed') {
                clearInterval(pollInterval);
                await fetchDocumentDetail();
                setExtractingBasicInfo(false);
                console.log('✅ 基本信息提取完成！');
              }
            }
          } catch (err) {
            console.error('轮询状态出错:', err);
          }
        }, 3000); // 每3秒轮询一次

        // 30秒后停止轮询
        setTimeout(() => {
          clearInterval(pollInterval);
          if (extractingBasicInfo) {
            setExtractingBasicInfo(false);
            setBasicInfoError('基本信息提取超时，请刷新页面查看');
          }
        }, 30000);
      } else {
        setExtractingBasicInfo(false);
        setBasicInfoError(data.message || '触发基本信息提取失败');
      }
    } catch (error) {
      console.error('❌ 触发基本信息提取失败:', error);
      setExtractingBasicInfo(false);
      setBasicInfoError('网络错误，请稍后重试');
    }
  };

  // Reanalyze tables function
  const handleReanalyzeTables = async () => {
    if (reanalyzingTables) return;

    setReanalyzingTables(true);
    setReanalyzeError(null);

    try {
      console.log('🔄 正在触发重新分析表格，文档ID:', id);
      const response = await authFetch(`/api/ocr/documents/${id}/reanalyze-tables/`, {
        method: 'POST'
      });

      const data = await response.json();
      console.log('📦 API返回:', data);

      if (data.status === 'success') {
        console.log('✅ 表格重新分析任务已启动');
        // 启动轮询检查状态
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await authFetch(`/api/ocr/documents/${id}/status/`);
            const statusData = await statusResponse.json();

            if (statusData.status === 'success') {
              const stage = statusData.data.processing_stage;

              // 如果完成，刷新文档详情
              if (stage === 'all_completed') {
                clearInterval(pollInterval);
                await fetchDocumentDetail();
                setReanalyzingTables(false);
                console.log('✅ 表格重新分析完成！');
              }
            }
          } catch (err) {
            console.error('轮询状态出错:', err);
          }
        }, 3000); // 每3秒轮询一次

        // 60秒后停止轮询
        setTimeout(() => {
          clearInterval(pollInterval);
          if (reanalyzingTables) {
            setReanalyzingTables(false);
            setReanalyzeError('表格重新分析超时，请刷新页面查看');
          }
        }, 60000);
      } else {
        setReanalyzingTables(false);
        setReanalyzeError(data.message || '触发表格重新分析失败');
      }
    } catch (error) {
      console.error('❌ 触发表格重新分析失败:', error);
      setReanalyzingTables(false);
      setReanalyzeError('网络错误，请稍后重试');
    }
  };

  // Extract summary function
  const handleExtractSummary = async () => {
    if (extractingSummary) return;

    setExtractingSummary(true);
    setSummaryError(null);

    try {
      console.log('📝 正在触发提取概要，文档ID:', id);
      const response = await authFetch(`/api/ocr/documents/${id}/extract-summary/`, {
        method: 'POST'
      });

      const data = await response.json();
      console.log('📦 API返回:', data);

      if (data.status === 'success') {
        console.log('✅ 概要提取任务已启动');
        // 启动轮询检查状态
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await authFetch(`/api/ocr/documents/${id}/status/`);
            const statusData = await statusResponse.json();

            if (statusData.status === 'success') {
              const stage = statusData.data.processing_stage;

              // 如果完成，刷新文档详情
              if (stage === 'all_completed') {
                clearInterval(pollInterval);
                await fetchDocumentDetail();
                setExtractingSummary(false);
                console.log('✅ 概要提取完成！');
              }
            }
          } catch (err) {
            console.error('轮询状态出错:', err);
          }
        }, 3000); // 每3秒轮询一次

        // 30秒后停止轮询
        setTimeout(() => {
          clearInterval(pollInterval);
          if (extractingSummary) {
            setExtractingSummary(false);
            setSummaryError('概要提取超时，请刷新页面查看');
          }
        }, 30000);
      } else {
        setExtractingSummary(false);
        setSummaryError(data.message || '触发概要提取失败');
      }
    } catch (error) {
      console.error('❌ 触发概要提取失败:', error);
      setExtractingSummary(false);
      setSummaryError('网络错误，请稍后重试');
    }
  };

  // Chat functions
  const handleOpenChat = () => {
    setShowChatModal(true);
    if (chatMessages.length === 0) {
      setChatMessages([{
        role: 'assistant',
        content: '您好！我是计划书助手，可以帮您解答关于这份保险计划书的问题。请问有什么可以帮您的吗？',
        timestamp: new Date()
      }]);
    }
  };

  const handleCloseChat = () => {
    setShowChatModal(false);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    const tempAssistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    setChatMessages(prev => [...prev, tempAssistantMessage]);

    try {
      const response = await authFetch(`/api/ocr/documents/${id}/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: chatMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const json = JSON.parse(data);
              if (json.content) {
                accumulatedContent += json.content;
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    ...newMessages[newMessages.length - 1],
                    content: accumulatedContent
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('解析流式数据失败:', e);
            }
          }
        }
      }

      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          isStreaming: false
        };
        return newMessages;
      });

    } catch (error) {
      console.error('发送消息失败:', error);
      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: '抱歉，连接失败，请稍后重试。',
          timestamp: new Date(),
          isStreaming: false
        };
        return newMessages;
      });
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

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
            onClick={() => navigate('/plan-management')}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
          >
            返回列表
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
          {/* 移动端：垂直布局 */}
          <div className="flex flex-col gap-3 sm:hidden">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/plan-management')}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">返回</span>
              </button>
              <button
                onClick={handleOpenChat}
                disabled={document.processing_stage !== 'all_completed'}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg shadow transition-all ${
                  document.processing_stage !== 'all_completed'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">计划书助手</span>
              </button>
            </div>
            <h1 className="text-base font-bold text-gray-800 line-clamp-2 break-words">{document.file_name}</h1>
          </div>

          {/* 桌面端：水平布局 */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <button
                onClick={() => navigate('/plan-management')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>返回列表</span>
              </button>
              <div className="h-6 w-px bg-gray-300 flex-shrink-0"></div>
              <h1 className="text-xl font-bold text-gray-800 truncate">{document.file_name}</h1>
            </div>
            <button
              onClick={handleOpenChat}
              disabled={document.processing_stage !== 'all_completed'}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg shadow transition-all flex-shrink-0 ${
                document.processing_stage !== 'all_completed'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>计划书助手</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4 space-y-2 sm:space-y-4">

        {/* 错误状态提示 */}
        {document && document.processing_stage === 'error' && (
          <div className="w-full bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 mb-1">文档处理失败</h3>
                <p className="text-xs text-red-800 mb-2">
                  {document.error_message || '上传的文件可能不是保险计划书，请检查文件内容后重新上传。'}
                </p>
              </div>
              <button
                onClick={() => navigate('/plan-management')}
                className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
              >
                返回列表
              </button>
            </div>
          </div>
        )}

        {/* 处理状态提示 */}
        {document && document.processing_stage !== 'all_completed' && document.processing_stage !== 'error' && (
          <div className="w-full bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-900 mb-1">文档正在处理中</h3>
                <p className="text-xs text-amber-800 mb-2">
                  该计划书正在后台分析中，部分信息可能尚未提取完成。您可以稍后刷新页面查看完整结果。
                </p>
                <div className="flex items-center gap-2 text-xs text-amber-700">
                  <span className="font-medium">当前阶段:</span>
                  <span className="px-2 py-0.5 bg-amber-100 rounded">
                    {document.processing_stage === 'ocr_pending' && 'OCR识别待处理'}
                    {document.processing_stage === 'ocr_processing' && '正在OCR识别文档...'}
                    {document.processing_stage === 'ocr_completed' && '✅ OCR识别已完成'}
                    {document.processing_stage === 'pending' && '等待分析'}
                    {document.processing_stage === 'extracting_tablecontent' && '正在提取表格源代码...'}
                    {document.processing_stage === 'tablecontent_completed' && '表格源代码已完成'}
                    {document.processing_stage === 'extracting_tablesummary' && '正在分析表格结构...'}
                    {document.processing_stage === 'tablesummary_completed' && '表格结构已完成'}
                    {document.processing_stage === 'extracting_table_html' && '正在提取表格HTML...'}
                    {document.processing_stage === 'extracting_basic_info' && '正在提取基本信息'}
                    {document.processing_stage === 'basic_info_completed' && '基本信息已完成'}
                    {document.processing_stage === 'extracting_table' && '正在提取退保价值表'}
                    {document.processing_stage === 'table_completed' && '退保价值表已完成'}
                    {document.processing_stage === 'extracting_wellness_table' && '正在提取无忧选表'}
                    {document.processing_stage === 'wellness_table_completed' && '无忧选表已完成'}
                    {document.processing_stage === 'extracting_summary' && '正在提取计划书概要'}
                    {!document.processing_stage && '处理中'}
                  </span>
                </div>
              </div>
              <button
                onClick={fetchDocumentDetail}
                className="px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 transition-colors flex-shrink-0"
              >
                刷新
              </button>
            </div>
          </div>
        )}

        {/* 1. 基本信息卡片 */}
        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-2 sm:-mx-4 px-2 sm:px-4 py-1 rounded"
            onClick={() => setIsBasicInfoOpen(!isBasicInfoOpen)}
          >
            <div className="flex items-center space-x-1.5">
              <User className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm sm:text-base font-semibold text-gray-800">基本信息</h2>
            </div>
            {isBasicInfoOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {/* 紧凑的横向布局 */}
          {isBasicInfoOpen && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm mt-2">
            {/* 如果没有任何基本信息，显示处理中提示或提取按钮 */}
            {!document.insured_name && !document.insured_age && !document.insured_gender &&
             !document.insurance_company && !document.insurance_product &&
             !document.sum_assured && !document.annual_premium && (
              document.processing_stage === 'extracting_basic_info' || extractingBasicInfo ? (
                <div className="w-full text-center py-4 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  <p className="text-xs">正在提取基本信息...</p>
                </div>
              ) : document.processing_stage === 'ocr_completed' ? (
                <div className="w-full text-center py-4">
                  <p className="text-xs text-gray-500 mb-3">暂无基本信息</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExtractBasicInfo();
                    }}
                    disabled={extractingBasicInfo}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-md"
                  >
                    {extractingBasicInfo ? '提取中...' : '💼 提取基本信息'}
                  </button>
                  {basicInfoError && (
                    <p className="mt-2 text-xs text-red-500">{basicInfoError}</p>
                  )}
                </div>
              ) : (
                <div className="w-full text-center py-4 text-gray-500">
                  <p className="text-xs">请等待OCR识别完成后再提取基本信息</p>
                </div>
              )
            )}

            {/* 受保人 */}
            {document.insured_name && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">姓名:</span>
                <span className="font-medium text-gray-800">{document.insured_name}</span>
              </div>
            )}
            {document.insured_age && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">年龄:</span>
                <span className="font-medium text-gray-800">{document.insured_age}岁</span>
              </div>
            )}
            {document.insured_gender && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">性别:</span>
                <span className="font-medium text-gray-800">{document.insured_gender}</span>
              </div>
            )}

            {/* 分隔符 */}
            {(document.insured_name || document.insured_age || document.insured_gender) && (document.insurance_company || document.insurance_product) && (
              <div className="hidden sm:block w-px h-4 bg-gray-300"></div>
            )}

            {/* 保险产品 */}
            {document.insurance_company && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">公司:</span>
                <span className="font-medium text-gray-800">{document.insurance_company}</span>
              </div>
            )}
            {document.insurance_product && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">产品:</span>
                <span className="font-medium text-gray-800 max-w-[200px] truncate" title={document.insurance_product}>{document.insurance_product}</span>
              </div>
            )}

            {/* 分隔符 */}
            {(document.insurance_company || document.insurance_product) && (document.sum_assured || document.annual_premium) && (
              <div className="hidden sm:block w-px h-4 bg-gray-300"></div>
            )}

            {/* 保费信息 */}
            {document.sum_assured && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">保额:</span>
                <span className="font-medium text-gray-800">{formatCurrency(document.sum_assured)}</span>
              </div>
            )}
            {document.annual_premium && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">年缴:</span>
                <span className="font-medium text-gray-800">{formatCurrency(document.annual_premium)}</span>
              </div>
            )}
            {document.payment_years && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">缴费:</span>
                <span className="font-medium text-gray-800">{document.payment_years}年</span>
              </div>
            )}
            {document.total_premium && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">总保费:</span>
                <span className="font-medium text-gray-800">{formatCurrency(document.total_premium)}</span>
              </div>
            )}
            {document.insurance_period && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">期限:</span>
                <span className="font-medium text-gray-800">{document.insurance_period}</span>
              </div>
            )}
          </div>
          )}
        </div>

        {/* 2. 计划书概要卡片 */}
        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-2 sm:-mx-4 px-2 sm:px-4 py-1 rounded"
            onClick={() => setIsSummaryOpen(!isSummaryOpen)}
          >
            <div className="flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-green-500" />
              <h2 className="text-sm sm:text-base font-semibold text-gray-800">计划书概要</h2>
            </div>
            {isSummaryOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {isSummaryOpen && (
            <>
              {document.summary && typeof document.summary === 'string' && document.summary.trim().length > 0 ? (
                <div className="mt-3 prose prose-sm max-w-none">
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw]}
                    className="text-xs sm:text-sm text-gray-600 leading-relaxed"
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-base sm:text-lg font-bold text-gray-900 mt-4 mb-3" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-sm sm:text-base font-semibold text-gray-800 mt-4 mb-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-xs sm:text-sm font-medium text-gray-700 mt-3 mb-1" {...props} />,
                      p: ({node, ...props}) => <p className="text-xs sm:text-sm text-gray-600 mb-2 leading-relaxed" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 mb-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 mb-2" {...props} />,
                      li: ({node, ...props}) => <li className="text-xs sm:text-sm text-gray-600" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-gray-800" {...props} />,
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full border-collapse border border-gray-300" {...props} />
                        </div>
                      ),
                      thead: ({node, ...props}) => <thead className="bg-gray-100" {...props} />,
                      tbody: ({node, ...props}) => <tbody {...props} />,
                      tr: ({node, ...props}) => <tr className="border-b border-gray-300" {...props} />,
                      th: ({node, ...props}) => <th className="border border-gray-300 px-2 sm:px-4 py-1 sm:py-2 text-left text-xs sm:text-sm font-semibold text-gray-700" {...props} />,
                      td: ({node, ...props}) => <td className="border border-gray-300 px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm text-gray-600" {...props} />,
                    }}
                  >
                    {document.summary}
                  </ReactMarkdown>
                </div>
              ) : document.processing_stage === 'extracting_summary' || extractingSummary ? (
                <div className="mt-3 text-center py-6 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  <p className="text-xs">正在提取计划书概要...</p>
                </div>
              ) : document.processing_stage === 'all_completed' ? (
                <div className="mt-3 text-center py-6">
                  <p className="text-xs text-gray-500 mb-3">暂无计划书概要</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExtractSummary();
                    }}
                    disabled={extractingSummary}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-md"
                  >
                    {extractingSummary ? '提取中...' : '📝 提取计划书概要'}
                  </button>
                  {summaryError && (
                    <p className="mt-2 text-xs text-red-500">{summaryError}</p>
                  )}
                </div>
              ) : (
                <div className="mt-3 text-center py-6 text-gray-500">
                  <p className="text-xs">请等待文档处理完成后再提取概要</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 3. 计划书表格分析基本情况 */}
        {document.tablesummary && (
          <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4">
            <div className="flex items-center justify-between -mx-2 sm:-mx-4 px-2 sm:px-4 py-1">
              <div
                className="flex items-center space-x-1.5 cursor-pointer hover:bg-gray-50 flex-1 py-1 -mx-2 px-2 rounded"
                onClick={() => setIsTableSummaryOpen(!isTableSummaryOpen)}
              >
                <Table className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm sm:text-base font-semibold text-gray-800">计划书表格分析基本情况</h2>
                {isTableSummaryOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReanalyzeTableSummary();
                }}
                disabled={reanalyzingTableSummary || !document.content}
                className="ml-2 flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white text-xs rounded-lg hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                title={!document.content ? '无OCR内容，无法重新分析' : '重新分析表格'}
              >
                {reanalyzingTableSummary ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">分析中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">重新分析</span>
                  </>
                )}
              </button>
            </div>
            {tableSummaryReanalyzeError && (
              <div className="mt-2 text-xs text-red-500 px-2">{tableSummaryReanalyzeError}</div>
            )}

            {isTableSummaryOpen && (
              <div className="mt-3 text-xs sm:text-sm leading-relaxed">
                <div className="prose prose-sm max-w-none bg-gray-50 rounded p-3">
                  <pre className="whitespace-pre-wrap font-sans text-gray-700">{document.tablesummary}</pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. 保单价值表卡片 - 显示table1字段内容 */}
        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4">
          <div className="flex items-center justify-between -mx-2 sm:-mx-4 px-2 sm:px-4 py-1">
            <div
              className="flex items-center space-x-1.5 cursor-pointer hover:bg-gray-50 flex-1 py-1 -mx-2 px-2 rounded"
              onClick={() => setIsTable1Open(!isTable1Open)}
            >
              <Table className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm sm:text-base font-semibold text-gray-800">保单价值表</h2>
              {document.table1 && document.table1.data && document.table1.data.length > 0 && (
                <span className="text-xs text-gray-500">
                  ({document.table1.table_name || '退保价值表'} - {document.table1.row_count || document.table1.data.length} 行)
                </span>
              )}
              {isTable1Open ? (
                <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReextractTable1();
              }}
              disabled={reextractingTable1 || !document.tablesummary}
              className="ml-2 flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              title={!document.tablesummary ? '无表格分析结果，无法提取' : '重新提取保单价值表'}
            >
              {reextractingTable1 ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="hidden sm:inline">提取中...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">重新提取</span>
                </>
              )}
            </button>
          </div>
          {table1ReextractError && (
            <div className="mt-2 text-xs text-red-500 px-2">{table1ReextractError}</div>
          )}

          {isTable1Open && (
            <>
              {document.table1 && document.table1.data && document.table1.data.length > 0 ? (
                <div className="overflow-x-auto -mx-2 sm:mx-0 mt-3">
                  <div className="mb-2 text-xs text-gray-600">
                    <strong>表格名称:</strong> {document.table1.table_name || '退保价值表'}
                  </div>
                  <table className="w-full text-xs border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        {/* 支持数组格式和对象格式 */}
                        {Array.isArray(document.table1.data[0])
                          ? document.table1.fields?.map((field, idx) => (
                              <th key={idx} className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                                {field}
                              </th>
                            ))
                          : Object.keys(document.table1.data[0]).map((col, idx) => (
                              <th key={idx} className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                                {col}
                              </th>
                            ))
                        }
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {document.table1.data.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          {/* 支持数组格式和对象格式 */}
                          {Array.isArray(row)
                            ? row.map((cell, colIdx) => (
                                <td key={colIdx} className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-800 whitespace-nowrap">
                                  {cell !== null && cell !== undefined ? cell : '-'}
                                </td>
                              ))
                            : Object.keys(document.table1.data[0]).map((col, colIdx) => (
                                <td key={colIdx} className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-800 whitespace-nowrap">
                                  {row[col] !== null && row[col] !== undefined ? row[col] : '-'}
                                </td>
                              ))
                          }
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-3 text-center py-6">
                  <p className="text-xs text-gray-500 mb-3">暂无保单价值表数据</p>
                  {document.tablesummary ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReextractTable1();
                      }}
                      disabled={reextractingTable1}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-md"
                    >
                      {reextractingTable1 ? '提取中...' : '📊 提取保单价值表'}
                    </button>
                  ) : (
                    <p className="text-xs text-gray-400">请先完成表格分析</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 5. 计划书表格列表卡片 */}
        {document?.plan_tables && document.plan_tables.length > 0 && (
          <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4">
            <div className="flex items-center justify-between -mx-2 sm:-mx-4 px-2 sm:px-4 py-1">
              <div
                className="flex items-center space-x-1.5 cursor-pointer hover:bg-gray-50 flex-1 py-1 -mx-2 px-2 rounded"
                onClick={() => setIsPlanTablesOpen(!isPlanTablesOpen)}
              >
                <Table className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm sm:text-base font-semibold text-gray-800">计划书表格列表</h2>
                <span className="text-xs text-gray-500">({document.plan_tables.length} 个表格)</span>
                {isPlanTablesOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReanalyzeTables();
                }}
                disabled={reanalyzingTables || !document.tablecontent}
                className="ml-2 flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                title={!document.tablecontent ? '无表格内容，无法重新分析' : '重新分析表格'}
              >
                {reanalyzingTables ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">分析中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">重新分析</span>
                  </>
                )}
              </button>
            </div>
            {reanalyzeError && (
              <div className="mt-2 text-xs text-red-500 px-2">{reanalyzeError}</div>
            )}

            {/* 表格列表 */}
            {isPlanTablesOpen && (
              <div className="mt-3 space-y-2">
                {document.plan_tables.map((table) => (
                  <div
                    key={table.id}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                          {table.table_number}
                        </span>
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {table.table_name}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
                        <span>{table.row_count} 行</span>
                        {table.fields && (
                          <span className="truncate max-w-xs">{table.fields}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => window.open(`/table/${table.id}`, '_blank')}
                      className="ml-3 flex-shrink-0 inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      查看表格
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. 计划书内容卡片 */}
        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4">
          <div className="flex items-center justify-between -mx-2 sm:-mx-4 px-2 sm:px-4 py-1">
            <div
              className="flex items-center space-x-1.5 cursor-pointer hover:bg-gray-50 rounded flex-1"
              onClick={() => setIsContentOpen(!isContentOpen)}
            >
              <FileText className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm sm:text-base font-semibold text-gray-800">计划书内容</h2>
              {document.content && (
                <span className="text-xs text-gray-500">({document.content_length?.toLocaleString() || 0} 字符)</span>
              )}
              {isContentOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReOCR();
              }}
              disabled={reOCRing || !document.file_path}
              className="ml-2 flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              title={!document.file_path ? '无PDF文件，无法重新OCR' : '重新OCR识别'}
            >
              {reOCRing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="hidden sm:inline">识别中...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">重新OCR</span>
                </>
              )}
            </button>
          </div>
          {reOCRError && (
            <div className="mt-2 text-xs text-red-500 px-2">{reOCRError}</div>
          )}

          {isContentOpen && (
            document.content ? (
              <div className="bg-gray-50 rounded-lg p-2 sm:p-3 max-h-60 sm:max-h-80 overflow-y-auto mt-2 sm:mt-3">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-snug">
                  {document.content}
                </pre>
              </div>
            ) : (
              <div className="mt-2 text-center py-6 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                <p className="text-xs">OCR内容解析中...</p>
              </div>
            )
          )}
        </div>

        {/* 7. 表格页面内容卡片 */}
        {document.tablecontent && (
          <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4">
            <div className="flex items-center justify-between -mx-2 sm:-mx-4 px-2 sm:px-4 py-1">
              <div
                className="flex items-center space-x-1.5 cursor-pointer hover:bg-gray-50 rounded flex-1"
                onClick={() => setIsTableContentOpen(!isTableContentOpen)}
              >
                <Table className="w-4 h-4 text-teal-500" />
                <h2 className="text-sm sm:text-base font-semibold text-gray-800">表格页面内容</h2>
                <span className="text-xs text-gray-500">({document.tablecontent.length.toLocaleString()} 字符)</span>
                {isTableContentOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReextractTableContent();
                }}
                disabled={reanalyzingTableContent || !document.content}
                className="ml-2 flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-xs rounded-lg hover:from-teal-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                title={!document.content ? '无OCR内容，无法重新提取' : '重新提取表格源代码'}
              >
                {reanalyzingTableContent ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">提取中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">重新提取</span>
                  </>
                )}
              </button>
            </div>
            {tableContentReanalyzeError && (
              <div className="mt-2 text-xs text-red-500 px-2">{tableContentReanalyzeError}</div>
            )}

            {isTableContentOpen && (
              <div className="bg-gray-50 rounded-lg p-2 sm:p-3 max-h-60 sm:max-h-80 overflow-y-auto mt-2 sm:mt-3">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-snug">
                  {document.tablecontent}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* 8. 底部按钮 - 进入内容编辑器 */}
        <div className="w-full">
          <button
            onClick={() => navigate(`/document/${id}/content-editor`)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center space-x-2 font-medium"
          >
            <FileText className="w-5 h-5" />
            <span>进入计划书内容编辑器</span>
          </button>
        </div>

      </div>

      {/* 聊天助手对话框 */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[calc(100vh-2rem)] sm:h-[600px] flex flex-col">
            {/* 对话框头部 */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                <h3 className="text-base sm:text-lg font-semibold">计划书助手</h3>
              </div>
              <button
                onClick={handleCloseChat}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4 bg-gray-50">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2 sm:p-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 shadow'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    ) : (
                      <div className="text-xs sm:text-sm prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-800 prose-strong:text-gray-900 prose-ul:text-gray-800 prose-ol:text-gray-800 prose-li:text-gray-800">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 shadow rounded-lg p-2 sm:p-3">
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* 输入框 */}
            <div className="p-2 sm:p-4 border-t bg-white rounded-b-2xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="输入您的问题..."
                  className="flex-1 px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={chatLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">发送</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentDetail;
