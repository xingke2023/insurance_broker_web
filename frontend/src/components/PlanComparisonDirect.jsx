import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../hooks/useAppNavigate';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { ArrowLeftIcon, DocumentTextIcon, SparklesIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

function PlanComparisonDirect() {
  const { user } = useAuth();
  const onNavigate = useAppNavigate();

  const [pdf1, setPdf1] = useState(null);
  const [pdf2, setPdf2] = useState(null);
  const [pdf3, setPdf3] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [comparisonId, setComparisonId] = useState(null);

  // 对话相关状态
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', content: '', streaming: false }
  const [userInput, setUserInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = React.useRef(null);
  const chatContainerRef = React.useRef(null);
  const streamingTextRef = React.useRef('');

  // 清理markdown代码块标记
  const cleanMarkdownCodeBlocks = (text) => {
    // 移除 ```html 和 ``` 标记
    let cleaned = text.replace(/```html\s*/gi, '');
    cleaned = cleaned.replace(/```\s*$/g, '');
    cleaned = cleaned.replace(/```$/g, '');
    return cleaned;
  };

  // 简单的Markdown转HTML（支持常见格式）
  const markdownToHtml = (text) => {
    if (!text || text.trim() === '') return '';

    let html = text.trim();

    // 如果已经是HTML（包含<div>、<table>等标签），直接返回
    if (/<(div|table|h[1-6]|p|ul|ol|li|br)\s*[^>]*>/i.test(html)) {
      return html;
    }

    // 否则进行简单的Markdown转换
    // 标题
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 粗体
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

    // 斜体
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // 列表（简单处理）
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');

    // 包裹li标签
    if (html.includes('<li>')) {
      html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }

    // 换行
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // 包裹段落（只在需要时）
    if (!html.startsWith('<') && html.length > 0) {
      html = '<p>' + html + '</p>';
    }

    return html;
  };

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 处理文件选择
  const handleFileChange = (e, pdfNumber) => {
    const file = e.target.files[0];
    if (file) {
      // 验证文件类型
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert('请上传PDF文件');
        return;
      }

      // 验证文件大小（限制50MB）
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('文件过大，请上传小于50MB的PDF文件');
        return;
      }

      if (pdfNumber === 1) setPdf1(file);
      else if (pdfNumber === 2) setPdf2(file);
      else if (pdfNumber === 3) setPdf3(file);
    }
  };

  // 开始对比（流式）
  const handleCompare = async () => {
    if (!pdf1 || !pdf2) {
      alert('请至少上传2份PDF计划书');
      return;
    }

    try {
      setComparing(true);
      streamingTextRef.current = '';

      // 添加系统消息
      setMessages([{ role: 'system', content: '正在分析计划书文件，请稍候...' }]);

      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('请先登录');
        setComparing(false);
        return;
      }

      const formData = new FormData();
      formData.append('pdf1', pdf1);
      formData.append('pdf2', pdf2);
      if (pdf3) {
        formData.append('pdf3', pdf3);
      }

      // 使用fetch发送请求并接收流式响应
      const response = await fetch(`${API_BASE_URL}/api/plan-comparison/compare/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // 创建助手消息（流式）
      setMessages(prev => [...prev.filter(m => m.role !== 'system'), { role: 'assistant', content: '', streaming: true }]);

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // 解码数据
        buffer += decoder.decode(value, { stream: true });

        // 处理SSE格式的数据
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一行（可能不完整）

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.error) {
                alert(data.error);
                setComparing(false);
                setMessages(prev => prev.filter(m => !m.streaming));
                return;
              }

              if (data.status === 'uploading' || data.status === 'analyzing') {
                // 更新系统消息
                setMessages(prev => {
                  const filtered = prev.filter(m => m.role !== 'system');
                  return [...filtered, { role: 'system', content: data.message }];
                });
              } else if (data.status === 'streaming') {
                streamingTextRef.current += data.chunk;
                // 更新助手消息内容，清理markdown标记并转换格式
                setMessages(prev => {
                  const newMessages = [...prev.filter(m => m.role !== 'system')];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg && lastMsg.streaming) {
                    const cleaned = cleanMarkdownCodeBlocks(streamingTextRef.current);
                    lastMsg.content = markdownToHtml(cleaned);
                  }
                  return newMessages;
                });
              } else if (data.status === 'completed') {
                // 完成流式输出，清理markdown标记并转换格式
                setComparisonId(data.comparison_id);
                setMessages(prev => {
                  const newMessages = [...prev.filter(m => m.role !== 'system')];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg && lastMsg.streaming) {
                    lastMsg.streaming = false;
                    const cleaned = cleanMarkdownCodeBlocks(streamingTextRef.current);
                    lastMsg.content = markdownToHtml(cleaned);
                  }
                  return newMessages;
                });
                setComparing(false);
              }
            } catch (e) {
              console.error('解析SSE数据失败:', e);
            }
          }
        }
      }

    } catch (error) {
      console.error('对比失败:', error);
      alert('对比失败，请重试');
      setComparing(false);
      setMessages(prev => prev.filter(m => !m.streaming));
    }
  };

  // 发送对话消息
  const handleSendMessage = async () => {
    if (!userInput.trim() || !comparisonId || isSending) return;

    const message = userInput.trim();
    setUserInput('');
    setIsSending(true);

    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: message }]);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('请先登录');
        setIsSending(false);
        return;
      }

      streamingTextRef.current = '';

      // 添加助手消息（流式）
      setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

      const response = await fetch(`${API_BASE_URL}/api/plan-comparison/${comparisonId}/chat/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.error) {
                alert(data.error);
                setMessages(prev => prev.filter(m => !m.streaming));
                setIsSending(false);
                return;
              }

              if (data.status === 'streaming') {
                streamingTextRef.current += data.chunk;
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg && lastMsg.streaming) {
                    const cleaned = cleanMarkdownCodeBlocks(streamingTextRef.current);
                    lastMsg.content = markdownToHtml(cleaned);
                  }
                  return newMessages;
                });
              } else if (data.status === 'completed') {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg && lastMsg.streaming) {
                    lastMsg.streaming = false;
                    const cleaned = cleanMarkdownCodeBlocks(streamingTextRef.current);
                    lastMsg.content = markdownToHtml(cleaned);
                  }
                  return newMessages;
                });
                setIsSending(false);
              }
            } catch (e) {
              console.error('解析SSE数据失败:', e);
            }
          }
        }
      }

    } catch (error) {
      console.error('发送消息失败:', error);
      alert('发送消息失败，请重试');
      setMessages(prev => prev.filter(m => !m.streaming));
      setIsSending(false);
    }
  };

  // 重新开始
  const handleReset = () => {
    setPdf1(null);
    setPdf2(null);
    setPdf3(null);
    setComparisonId(null);
    setMessages([]);
    streamingTextRef.current = '';
    setUserInput('');
  };

  // 查看历史记录
  const goToHistory = () => {
    onNavigate('comparison-history');
  };

  const hasStartedComparison = messages.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className={`${hasStartedComparison ? 'max-w-full' : 'max-w-7xl'} mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8`}>
        {/* 头部导航 */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3 sm:mb-4 text-sm sm:text-base"
          >
            <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>返回首页</span>
          </button>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <DocumentTextIcon className="w-6 h-6 sm:w-9 sm:h-9 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900">计划书智能对比</h1>
                <p className="text-xs sm:text-base text-gray-600 mt-0.5 sm:mt-1 hidden sm:block">AI分析对比，持续对话</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasStartedComparison && (
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm sm:text-base"
                >
                  🔄 重新开始
                </button>
              )}
              <button
                onClick={goToHistory}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm sm:text-base"
              >
                历史记录
              </button>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        {!hasStartedComparison ? (
          /* 上传PDF区域 */
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-1.5 sm:gap-2">
              {/* PDF 1 */}
              <div className="bg-white rounded-md shadow-sm p-1.5 sm:p-2 border border-gray-200">
                <h3 className="text-xs font-semibold text-gray-900 mb-1">计划书 1 <span className="text-red-500">*</span></h3>
                <div className="border border-dashed border-gray-300 rounded p-1.5 sm:p-2 hover:border-blue-500 transition-colors bg-gray-50">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileChange(e, 1)}
                    className="hidden"
                    id="pdf1-upload"
                  />
                  <label
                    htmlFor="pdf1-upload"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    {pdf1 ? (
                      <div className="text-center py-0.5">
                        <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mx-auto mb-0.5" />
                        <p className="text-xs text-gray-700 font-medium break-all line-clamp-1">{pdf1.name}</p>
                        <p className="text-xs text-blue-600 mt-0.5">更换</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-0.5" />
                        <p className="text-xs text-gray-700 font-medium">上传PDF</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* PDF 2 */}
              <div className="bg-white rounded-md shadow-sm p-1.5 sm:p-2 border border-gray-200">
                <h3 className="text-xs font-semibold text-gray-900 mb-1">计划书 2 <span className="text-red-500">*</span></h3>
                <div className="border border-dashed border-gray-300 rounded p-1.5 sm:p-2 hover:border-blue-500 transition-colors bg-gray-50">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileChange(e, 2)}
                    className="hidden"
                    id="pdf2-upload"
                  />
                  <label
                    htmlFor="pdf2-upload"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    {pdf2 ? (
                      <div className="text-center py-0.5">
                        <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mx-auto mb-0.5" />
                        <p className="text-xs text-gray-700 font-medium break-all line-clamp-1">{pdf2.name}</p>
                        <p className="text-xs text-blue-600 mt-0.5">更换</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-0.5" />
                        <p className="text-xs text-gray-700 font-medium">上传PDF</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* PDF 3 */}
              <div className="bg-white rounded-md shadow-sm p-1.5 sm:p-2 border border-gray-200">
                <h3 className="text-xs font-semibold text-gray-900 mb-1">计划书 3 <span className="text-gray-400 text-xs">(可选)</span></h3>
                <div className="border border-dashed border-gray-300 rounded p-1.5 sm:p-2 hover:border-blue-500 transition-colors bg-gray-50">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileChange(e, 3)}
                    className="hidden"
                    id="pdf3-upload"
                  />
                  <label
                    htmlFor="pdf3-upload"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    {pdf3 ? (
                      <div className="text-center py-0.5">
                        <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mx-auto mb-0.5" />
                        <p className="text-xs text-gray-700 font-medium break-all line-clamp-1">{pdf3.name}</p>
                        <p className="text-xs text-blue-600 mt-0.5">更换</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-0.5" />
                        <p className="text-xs text-gray-700 font-medium">上传PDF</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* 对比按钮 */}
            <div className="mt-1.5 sm:mt-3 flex justify-center">
              <button
                onClick={handleCompare}
                disabled={!pdf1 || !pdf2 || comparing}
                className="w-full sm:w-auto px-4 py-1.5 sm:px-6 sm:py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
              >
                <SparklesIcon className="w-4 h-4" />
                <span>开始AI对比分析</span>
              </button>
            </div>

            {/* 使用提示 */}
            <div className="mt-1.5 sm:mt-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-md p-2 sm:p-2.5 border border-blue-200">
              <h3 className="text-xs font-semibold text-gray-900 mb-0.5 sm:mb-1 flex items-center gap-1">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                使用说明
              </h3>
              <ul className="space-y-0.5 text-xs text-gray-700">
                <li className="flex items-start gap-1">
                  <span className="text-blue-600 font-bold flex-shrink-0">•</span>
                  <span>上传2-3份PDF，AI深度对比分析</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-blue-600 font-bold flex-shrink-0">•</span>
                  <span>分析完成后可继续提问</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-blue-600 font-bold flex-shrink-0">•</span>
                  <span>实时流式输出，无需等待</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-blue-600 font-bold flex-shrink-0">•</span>
                  <span>对比记录自动保存</span>
                </li>
              </ul>
            </div>
          </>
        ) : (
          /* 聊天界面 */
          <div className="" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
            {/* 消息列表 */}
            <div ref={chatContainerRef} className="">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'system' ? (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 bg-gray-100 px-3 sm:px-4 py-2 rounded-lg">
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-t-2 border-b-2 border-blue-600"></div>
                      <span>{msg.content}</span>
                    </div>
                  ) : msg.role === 'user' ? (
                    <div className="bg-blue-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] sm:max-w-[70%]">
                      <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="bg-gray-100 text-gray-900 px-1 sm:px-4 py-2 sm:py-2.5 rounded-2xl rounded-tl-sm max-w-[98%] sm:max-w-[100%]">
                      {msg.streaming && !msg.content ? (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                          <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-t-2 border-b-2 border-blue-600"></div>
                          <span>AI正在思考...</span>
                        </div>
                      ) : (
                        <>
                          <style>
                            {`
                              .chat-message {
                                color: #1f2937;
                                line-height: 1.6;
                              }

                              /* 标题样式 */
                              .chat-message h1 {
                                font-size: 1.5rem;
                                font-weight: 700;
                                margin-top: 1rem;
                                margin-bottom: 0.75rem;
                                color: #111827;
                              }

                              .chat-message h2 {
                                font-size: 1.25rem;
                                font-weight: 600;
                                margin-top: 0.875rem;
                                margin-bottom: 0.625rem;
                                color: #1f2937;
                              }

                              .chat-message h3 {
                                font-size: 1.125rem;
                                font-weight: 600;
                                margin-top: 0.75rem;
                                margin-bottom: 0.5rem;
                                color: #374151;
                              }

                              /* 段落样式 */
                              .chat-message p {
                                margin-top: 0.5rem;
                                margin-bottom: 0.5rem;
                                color: #374151;
                              }

                              /* 列表样式 */
                              .chat-message ul,
                              .chat-message ol {
                                margin-top: 0.5rem;
                                margin-bottom: 0.5rem;
                                padding-left: 1.5rem;
                                color: #374151;
                              }

                              .chat-message li {
                                margin-top: 0.25rem;
                                margin-bottom: 0.25rem;
                              }

                              /* 粗体、斜体 */
                              .chat-message strong {
                                font-weight: 700;
                                color: #111827;
                              }

                              .chat-message em {
                                font-style: italic;
                              }

                              /* 表格样式 */
                              .chat-message table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 0.75rem;
                                margin-bottom: 0.75rem;
                                font-size: 0.875rem;
                                background-color: white;
                              }

                              .chat-message th {
                                background-color: #f3f4f6;
                                color: #111827;
                                font-weight: 600;
                                padding: 0.5rem;
                                border: 1px solid #e5e7eb;
                                text-align: left;
                              }

                              .chat-message td {
                                padding: 0.5rem;
                                border: 1px solid #e5e7eb;
                                color: #374151;
                              }

                              .chat-message tr:nth-child(even) {
                                background-color: #f9fafb;
                              }

                              /* 代码样式 */
                              .chat-message code {
                                background-color: #f3f4f6;
                                color: #1f2937;
                                padding: 0.125rem 0.375rem;
                                border-radius: 0.25rem;
                                font-size: 0.875em;
                                font-family: monospace;
                              }

                              .chat-message pre {
                                background-color: #f3f4f6;
                                color: #1f2937;
                                padding: 0.75rem;
                                border-radius: 0.375rem;
                                overflow-x: auto;
                                margin-top: 0.5rem;
                                margin-bottom: 0.5rem;
                              }

                              .chat-message pre code {
                                background-color: transparent;
                                padding: 0;
                              }

                              /* 移动端优化 */
                              @media (max-width: 640px) {
                                .chat-message h1 {
                                  font-size: 1.125rem;
                                }
                                .chat-message h2 {
                                  font-size: 1rem;
                                }
                                .chat-message h3 {
                                  font-size: 0.9rem;
                                }
                                .chat-message p {
                                  font-size: 0.875rem;
                                }
                                .chat-message table {
                                  font-size: 0.7rem;
                                  display: block;
                                  overflow-x: auto;
                                  -webkit-overflow-scrolling: touch;
                                }
                                .chat-message th,
                                .chat-message td {
                                  padding: 0.25rem 0.375rem;
                                  white-space: nowrap;
                                }
                              }
                            `}
                          </style>
                          <div
                            className="chat-message"
                            dangerouslySetInnerHTML={{ __html: msg.content }}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入框（仅在对比完成后显示） */}
            {comparisonId && !comparing && (
              <div className="border-t border-gray-200 p-2 sm:p-4 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="继续提问..."
                    disabled={isSending}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!userInput.trim() || isSending}
                    className="px-3 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-shrink-0"
                  >
                    {isSending ? (
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline text-sm sm:text-base">发送</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlanComparisonDirect;
