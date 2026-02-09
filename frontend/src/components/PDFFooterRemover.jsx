import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAppNavigate } from '../hooks/useAppNavigate';
import {
  DocumentArrowUpIcon,
  ArrowLeftIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

function PDFFooterRemover() {
  const onNavigate = useAppNavigate();
  const [selectedFile, setSelectedFile] = useState(null);

  // 从localStorage读取自定义文字
  const [customText, setCustomText] = useState(() => {
    const saved = localStorage.getItem('pdf_custom_text');
    return saved || '';
  });

  const [pdfPassword, setPdfPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);

  // 处理开始页码（从第几页开始处理）- 从localStorage读取
  const [processStartPage, setProcessStartPage] = useState(() => {
    const saved = localStorage.getItem('pdf_process_start_page');
    return saved ? parseInt(saved) : 1;
  });

  // 处理结束页码（处理到第几页）- 从localStorage读取
  const [processEndPage, setProcessEndPage] = useState(() => {
    const saved = localStorage.getItem('pdf_process_end_page');
    return saved ? parseInt(saved) : 0; // 0表示到最后一页
  });

  // 起始页码（页码编号从几开始）- 从localStorage读取
  const [pageNumberStart, setPageNumberStart] = useState(() => {
    const saved = localStorage.getItem('pdf_page_number_start');
    return saved ? parseInt(saved) : 1;
  });

  // 页面范围选择 - 不自动保存到localStorage
  const [saveStartPage, setSaveStartPage] = useState(1);
  const [saveEndPage, setSaveEndPage] = useState(0); // 0表示到最后一页

  // 区域擦除设置（重新设计）- 从localStorage读取
  const [removeAreas, setRemoveAreas] = useState(() => {
    const saved = localStorage.getItem('pdf_remove_areas');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('解析保存的擦除区域失败:', e);
      }
    }
    return {
      headerFull: { enabled: false, height: 50 },      // 页眉-通栏
      headerLeft: { enabled: false, width: 100, height: 100 },  // 页眉-左上
      headerRight: { enabled: false, width: 100, height: 100 }, // 页眉-右上
      footerFull: { enabled: true, height: 50 },       // 页脚-通栏（默认启用）
      footerLeft: { enabled: false, width: 100, height: 100 },  // 页脚-左下
      footerRight: { enabled: false, width: 100, height: 100 }, // 页脚-右下
    };
  });

  const [processing, setProcessing] = useState(false);
  const [processedFileUrl, setProcessedFileUrl] = useState(null);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const canvasRef = React.useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const renderingRef = React.useRef(false); // 渲染锁，防止并发渲染

  // 保存自定义文字到localStorage
  useEffect(() => {
    localStorage.setItem('pdf_custom_text', customText);
  }, [customText]);

  // 保存处理开始页码到localStorage
  useEffect(() => {
    localStorage.setItem('pdf_process_start_page', processStartPage.toString());
  }, [processStartPage]);

  // 保存处理结束页码到localStorage
  useEffect(() => {
    localStorage.setItem('pdf_process_end_page', processEndPage.toString());
  }, [processEndPage]);

  // 保存起始页码编号到localStorage
  useEffect(() => {
    localStorage.setItem('pdf_page_number_start', pageNumberStart.toString());
  }, [pageNumberStart]);

  // 保存擦除区域设置到localStorage
  useEffect(() => {
    localStorage.setItem('pdf_remove_areas', JSON.stringify(removeAreas));
  }, [removeAreas]);

  // 加载PDF.js库
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // 渲染PDF页面
  const renderPage = async (pdf, pageNumber) => {
    // 检查渲染锁，避免并发渲染
    if (renderingRef.current) {
      console.log('渲染进行中，跳过重复请求');
      return;
    }

    renderingRef.current = true; // 获取渲染锁

    try {
      const page = await pdf.getPage(pageNumber);
      const canvas = canvasRef.current;
      if (!canvas) {
        console.warn('Canvas未准备好');
        renderingRef.current = false;
        return;
      }

      const context = canvas.getContext('2d');
      if (!context) {
        console.warn('无法获取Canvas上下文');
        renderingRef.current = false;
        return;
      }

      // 获取页面旋转角度
      const originalRotation = page.rotate || 0;

      // 如果页面是倒置的（180度），自动修正为0度
      // 如果页面是90或270度旋转，保持原样
      let correctedRotation = originalRotation;
      if (originalRotation === 180) {
        correctedRotation = 0; // 修正倒置页面
      }

      const viewport = page.getViewport({ scale: 1.5, rotation: correctedRotation });

      // 设置canvas尺寸前先清空
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      setCanvasHeight(viewport.height);

      // 清空canvas（设置尺寸会自动清空，但明确清空一次更保险）
      context.clearRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      // 渲染PDF内容
      await page.render(renderContext).promise;

      // 绘制擦除区域预览
      drawRemovalAreas(context, viewport.height, viewport.width);
    } catch (err) {
      console.error('渲染PDF页面失败:', err);
    } finally {
      renderingRef.current = false; // 释放渲染锁
    }
  };

  // 绘制擦除区域预览
  const drawRemovalAreas = (context, height, width) => {
    const scale = 1.5; // 匹配PDF渲染scale

    // 1. 页眉-通栏
    if (removeAreas.headerFull.enabled) {
      const h = removeAreas.headerFull.height * scale;
      context.fillStyle = 'rgba(239, 68, 68, 0.2)';
      context.fillRect(0, 0, width, h);
      context.strokeStyle = '#EF4444';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.moveTo(0, h);
      context.lineTo(width, h);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = '#EF4444';
      context.font = 'bold 12px Arial';
      context.fillText(`页眉-通栏（${removeAreas.headerFull.height}px）`, 10, h + 15);
    }

    // 2. 页眉-左上
    if (removeAreas.headerLeft.enabled) {
      const w = removeAreas.headerLeft.width * scale;
      const h = removeAreas.headerLeft.height * scale;
      context.fillStyle = 'rgba(59, 130, 246, 0.2)';
      context.fillRect(0, 0, w, h);
      context.strokeStyle = '#3B82F6';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.strokeRect(0, 0, w, h);
      context.setLineDash([]);
      context.fillStyle = '#3B82F6';
      context.font = 'bold 12px Arial';
      context.fillText(`左上（${removeAreas.headerLeft.width}×${removeAreas.headerLeft.height}）`, 5, h + 15);
    }

    // 3. 页眉-右上
    if (removeAreas.headerRight.enabled) {
      const w = removeAreas.headerRight.width * scale;
      const h = removeAreas.headerRight.height * scale;
      const x = width - w;
      context.fillStyle = 'rgba(59, 130, 246, 0.2)';
      context.fillRect(x, 0, w, h);
      context.strokeStyle = '#3B82F6';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.strokeRect(x, 0, w, h);
      context.setLineDash([]);
      context.fillStyle = '#3B82F6';
      context.font = 'bold 12px Arial';
      context.fillText(`右上（${removeAreas.headerRight.width}×${removeAreas.headerRight.height}）`, x + 5, h + 15);
    }

    // 4. 页脚-通栏
    if (removeAreas.footerFull.enabled) {
      const h = removeAreas.footerFull.height * scale;
      const y = height - h;
      context.fillStyle = 'rgba(239, 68, 68, 0.2)';
      context.fillRect(0, y, width, h);
      context.strokeStyle = '#EF4444';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = '#EF4444';
      context.font = 'bold 12px Arial';
      context.fillText(`页脚-通栏（${removeAreas.footerFull.height}px）`, 10, y - 5);
    }

    // 5. 页脚-左下
    if (removeAreas.footerLeft.enabled) {
      const w = removeAreas.footerLeft.width * scale;
      const h = removeAreas.footerLeft.height * scale;
      const y = height - h;
      context.fillStyle = 'rgba(59, 130, 246, 0.2)';
      context.fillRect(0, y, w, h);
      context.strokeStyle = '#3B82F6';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.strokeRect(0, y, w, h);
      context.setLineDash([]);
      context.fillStyle = '#3B82F6';
      context.font = 'bold 12px Arial';
      context.fillText(`左下（${removeAreas.footerLeft.width}×${removeAreas.footerLeft.height}）`, 5, y - 5);
    }

    // 6. 页脚-右下
    if (removeAreas.footerRight.enabled) {
      const w = removeAreas.footerRight.width * scale;
      const h = removeAreas.footerRight.height * scale;
      const x = width - w;
      const y = height - h;
      context.fillStyle = 'rgba(59, 130, 246, 0.2)';
      context.fillRect(x, y, w, h);
      context.strokeStyle = '#3B82F6';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.strokeRect(x, y, w, h);
      context.setLineDash([]);
      context.fillStyle = '#3B82F6';
      context.font = 'bold 12px Arial';
      context.fillText(`右下（${removeAreas.footerRight.width}×${removeAreas.footerRight.height}）`, x + 5, y - 5);
    }
  };

  // 当擦除区域设置改变时重新渲染
  useEffect(() => {
    if (pdfDoc && showPreview && canvasRef.current) {
      // 添加延迟确保canvas已完全挂载和准备好
      const timeoutId = setTimeout(() => {
        renderPage(pdfDoc, pageNum);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        // 清理时释放渲染锁
        renderingRef.current = false;
      };
    }
  }, [removeAreas, pdfDoc, pageNum, showPreview]);

  // 处理文件选择
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      setProcessedFileUrl(null);

      // 创建预览URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // 加载PDF用于预览
      if (window.pdfjsLib) {
        try {
          const loadingTask = window.pdfjsLib.getDocument(url);
          const pdf = await loadingTask.promise;
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setPageNum(1);

          // 电脑端自动显示预览
          // 检测是否为电脑端（屏幕宽度大于1024px）
          if (window.innerWidth >= 1024) {
            setShowPreview(true);
            // 渲染由useEffect统一处理，避免重复调用
          }
        } catch (err) {
          console.error('加载PDF失败:', err);
        }
      }
    } else {
      setError('请选择有效的PDF文件');
      setSelectedFile(null);
      setPreviewUrl(null);
      setPdfDoc(null);
    }
  };

  // 打开预览
  const handleOpenPreview = async () => {
    setShowPreview(true);
    // 渲染由useEffect统一处理
  };

  // 切换页面
  const changePage = (delta) => {
    const newPage = pageNum + delta;
    if (newPage >= 1 && newPage <= numPages) {
      setPageNum(newPage);
    }
  };

  // 处理PDF页脚擦除
  const handleRemoveFooter = async () => {
    if (!selectedFile) {
      setError('请先选择PDF文件');
      return;
    }

    setProcessing(true);
    setError(null);
    setProcessedFileUrl(null);

    try {
      const formData = new FormData();
      formData.append('pdf_file', selectedFile);
      formData.append('custom_text', customText);
      formData.append('process_start_page', processStartPage);
      formData.append('process_end_page', processEndPage);
      formData.append('page_number_start', pageNumberStart);
      formData.append('save_start_page', saveStartPage);
      formData.append('save_end_page', saveEndPage);
      if (pdfPassword) {
        formData.append('pdf_password', pdfPassword);
      }

      // 添加擦除区域参数
      formData.append('remove_areas', JSON.stringify(removeAreas));

      console.log('📤 发送PDF处理请求...');
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_BASE_URL}/api/pdf/remove-footer`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          responseType: 'blob'
        }
      );

      console.log('✅ 收到响应:', response.status, response.statusText);
      console.log('   响应大小:', response.data.size, 'bytes');
      console.log('   响应类型:', response.data.type);

      // 检查响应是否为PDF
      if (response.data.type === 'application/pdf') {
        // 创建下载链接
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        setProcessedFileUrl(url);
        setRequiresPassword(false);
        console.log('✅ PDF URL创建成功');
      } else {
        // 可能是错误响应被当作blob返回了
        console.error('❌ 响应不是PDF格式:', response.data.type);
        const text = await response.data.text();
        console.error('   响应内容:', text);
        setError('服务器返回了非PDF格式的响应');
      }

    } catch (err) {
      console.error('❌ 处理PDF失败:', err);
      console.error('   错误详情:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        statusText: err.response?.statusText
      });

      // 检查是否需要密码或其他错误
      if (err.response?.status === 400 || err.response?.status === 500) {
        try {
          // 如果响应是blob，尝试读取为文本
          if (err.response.data instanceof Blob) {
            const errorText = await err.response.data.text();
            console.log('   错误响应内容:', errorText);
            try {
              const errorData = JSON.parse(errorText);
              if (errorData.requires_password) {
                setRequiresPassword(true);
                setError('此PDF已加密，请输入密码');
              } else {
                setError(errorData.message || '处理PDF失败，请重试');
              }
            } catch (jsonErr) {
              setError(errorText || '处理PDF失败，请重试');
            }
          } else {
            setError(err.response?.data?.message || '处理PDF失败，请重试');
          }
        } catch (parseErr) {
          console.error('   解析错误响应失败:', parseErr);
          setError('处理PDF失败，请重试');
        }
      } else {
        setError(err.message || '处理PDF失败，请检查网络连接');
      }
    } finally {
      setProcessing(false);
    }
  };

  // 下载处理后的文件
  const handleDownload = () => {
    if (!processedFileUrl) return;

    const link = document.createElement('a');
    link.href = processedFileUrl;
    link.download = `${selectedFile.name.replace('.pdf', '')}_计划书.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 重置所有状态
  const handleReset = () => {
    setSelectedFile(null);
    setProcessStartPage(1);
    setProcessEndPage(0);
    setPageNumberStart(1);
    setSaveStartPage(1);
    setSaveEndPage(0);
    setRemoveAreas({
      headerFull: { enabled: false, height: 50 },
      headerLeft: { enabled: false, width: 100, height: 100 },
      headerRight: { enabled: false, width: 100, height: 100 },
      footerFull: { enabled: true, height: 50 },
      footerLeft: { enabled: false, width: 100, height: 100 },
      footerRight: { enabled: false, width: 100, height: 100 },
    });
    setProcessedFileUrl(null);
    setError(null);
    setPdfDoc(null);
    setShowPreview(false);
    setPdfPassword('');
    setRequiresPassword(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="text-sm font-medium">返回首页</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <TrashIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PDF页脚擦除工具</h1>
              <p className="text-sm text-gray-500 mt-1">上传PDF文件，自动移除页脚内容</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：上传和设置区域 */}
          <div className="space-y-6">
            {/* 文件上传卡片 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DocumentArrowUpIcon className="w-5 h-5 text-blue-600" />
                上传PDF文件
              </h2>

              <div className="space-y-4">
                {/* 文件选择区域 */}
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
                  >
                    <DocumentArrowUpIcon className="w-16 h-16 text-gray-400 group-hover:text-blue-500 transition-colors mb-3" />
                    <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                      {selectedFile ? selectedFile.name : '点击选择PDF文件'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">支持PDF格式，最大100MB</p>
                  </label>
                </div>

                {/* 预览按钮（仅移动端显示，电脑端自动预览） */}
                {selectedFile && !processedFileUrl && !showPreview && (
                  <button
                    onClick={handleOpenPreview}
                    className="w-full lg:hidden px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-sm hover:shadow-md font-medium flex items-center justify-center gap-2"
                  >
                    <EyeIcon className="w-5 h-5" />
                    <span>预览并调整页脚高度</span>
                  </button>
                )}

                {/* 页眉擦除设置 */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        页眉擦除区域
                      </h3>
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        自动记忆
                      </span>
                    </div>

                    {/* 三个选项在电脑端横向排列 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* 页眉-通栏 */}
                    <div className="bg-white border border-blue-300 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="headerFull"
                          checked={removeAreas.headerFull.enabled}
                          onChange={(e) => setRemoveAreas({
                            ...removeAreas,
                            headerFull: { ...removeAreas.headerFull, enabled: e.target.checked }
                          })}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <label htmlFor="headerFull" className="text-sm font-medium text-gray-700 cursor-pointer">
                          通栏（全宽）
                        </label>
                      </div>
                      {removeAreas.headerFull.enabled && (
                        <div className="mt-2 space-y-2">
                          <label className="block text-xs text-gray-600">高度（像素）</label>
                          <input
                            type="range"
                            min="10"
                            max="200"
                            value={removeAreas.headerFull.height}
                            onChange={(e) => setRemoveAreas({
                              ...removeAreas,
                              headerFull: { ...removeAreas.headerFull, height: parseInt(e.target.value) }
                            })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <input
                            type="number"
                            min="10"
                            max="500"
                            value={removeAreas.headerFull.height}
                            onChange={(e) => setRemoveAreas({
                              ...removeAreas,
                              headerFull: { ...removeAreas.headerFull, height: parseInt(e.target.value) || 50 }
                            })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* 页眉-左上 */}
                    <div className="bg-white border border-blue-300 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="headerLeft"
                          checked={removeAreas.headerLeft.enabled}
                          onChange={(e) => setRemoveAreas({
                            ...removeAreas,
                            headerLeft: { ...removeAreas.headerLeft, enabled: e.target.checked }
                          })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="headerLeft" className="text-sm font-medium text-gray-700 cursor-pointer">
                          左上角
                        </label>
                      </div>
                      {removeAreas.headerLeft.enabled && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">宽度</label>
                            <input
                              type="number"
                              min="10"
                              max="500"
                              value={removeAreas.headerLeft.width}
                              onChange={(e) => setRemoveAreas({
                                ...removeAreas,
                                headerLeft: { ...removeAreas.headerLeft, width: parseInt(e.target.value) || 100 }
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">高度</label>
                            <input
                              type="number"
                              min="10"
                              max="500"
                              value={removeAreas.headerLeft.height}
                              onChange={(e) => setRemoveAreas({
                                ...removeAreas,
                                headerLeft: { ...removeAreas.headerLeft, height: parseInt(e.target.value) || 100 }
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 页眉-右上 */}
                    <div className="bg-white border border-blue-300 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="headerRight"
                          checked={removeAreas.headerRight.enabled}
                          onChange={(e) => setRemoveAreas({
                            ...removeAreas,
                            headerRight: { ...removeAreas.headerRight, enabled: e.target.checked }
                          })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="headerRight" className="text-sm font-medium text-gray-700 cursor-pointer">
                          右上角
                        </label>
                      </div>
                      {removeAreas.headerRight.enabled && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">宽度</label>
                            <input
                              type="number"
                              min="10"
                              max="500"
                              value={removeAreas.headerRight.width}
                              onChange={(e) => setRemoveAreas({
                                ...removeAreas,
                                headerRight: { ...removeAreas.headerRight, width: parseInt(e.target.value) || 100 }
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">高度</label>
                            <input
                              type="number"
                              min="10"
                              max="500"
                              value={removeAreas.headerRight.height}
                              onChange={(e) => setRemoveAreas({
                                ...removeAreas,
                                headerRight: { ...removeAreas.headerRight, height: parseInt(e.target.value) || 100 }
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </div>

                {/* 页脚擦除设置 */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-orange-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        页脚擦除区域
                      </h3>
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        自动记忆
                      </span>
                    </div>

                    {/* 三个选项在电脑端横向排列 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* 页脚-通栏 */}
                    <div className="bg-white border border-orange-300 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="footerFull"
                          checked={removeAreas.footerFull.enabled}
                          onChange={(e) => setRemoveAreas({
                            ...removeAreas,
                            footerFull: { ...removeAreas.footerFull, enabled: e.target.checked }
                          })}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <label htmlFor="footerFull" className="text-sm font-medium text-gray-700 cursor-pointer">
                          通栏（全宽）
                        </label>
                      </div>
                      {removeAreas.footerFull.enabled && (
                        <div className="mt-2 space-y-2">
                          <label className="block text-xs text-gray-600">高度（像素）</label>
                          <input
                            type="range"
                            min="10"
                            max="200"
                            value={removeAreas.footerFull.height}
                            onChange={(e) => setRemoveAreas({
                              ...removeAreas,
                              footerFull: { ...removeAreas.footerFull, height: parseInt(e.target.value) }
                            })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <input
                            type="number"
                            min="10"
                            max="500"
                            value={removeAreas.footerFull.height}
                            onChange={(e) => setRemoveAreas({
                              ...removeAreas,
                              footerFull: { ...removeAreas.footerFull, height: parseInt(e.target.value) || 50 }
                            })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* 页脚-左下 */}
                    <div className="bg-white border border-orange-300 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="footerLeft"
                          checked={removeAreas.footerLeft.enabled}
                          onChange={(e) => setRemoveAreas({
                            ...removeAreas,
                            footerLeft: { ...removeAreas.footerLeft, enabled: e.target.checked }
                          })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="footerLeft" className="text-sm font-medium text-gray-700 cursor-pointer">
                          左下角
                        </label>
                      </div>
                      {removeAreas.footerLeft.enabled && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">宽度</label>
                            <input
                              type="number"
                              min="10"
                              max="500"
                              value={removeAreas.footerLeft.width}
                              onChange={(e) => setRemoveAreas({
                                ...removeAreas,
                                footerLeft: { ...removeAreas.footerLeft, width: parseInt(e.target.value) || 100 }
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">高度</label>
                            <input
                              type="number"
                              min="10"
                              max="500"
                              value={removeAreas.footerLeft.height}
                              onChange={(e) => setRemoveAreas({
                                ...removeAreas,
                                footerLeft: { ...removeAreas.footerLeft, height: parseInt(e.target.value) || 100 }
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 页脚-右下 */}
                    <div className="bg-white border border-orange-300 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="footerRight"
                          checked={removeAreas.footerRight.enabled}
                          onChange={(e) => setRemoveAreas({
                            ...removeAreas,
                            footerRight: { ...removeAreas.footerRight, enabled: e.target.checked }
                          })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="footerRight" className="text-sm font-medium text-gray-700 cursor-pointer">
                          右下角
                        </label>
                      </div>
                      {removeAreas.footerRight.enabled && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">宽度</label>
                            <input
                              type="number"
                              min="10"
                              max="500"
                              value={removeAreas.footerRight.width}
                              onChange={(e) => setRemoveAreas({
                                ...removeAreas,
                                footerRight: { ...removeAreas.footerRight, width: parseInt(e.target.value) || 100 }
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">高度</label>
                            <input
                              type="number"
                              min="10"
                              max="500"
                              value={removeAreas.footerRight.height}
                              onChange={(e) => setRemoveAreas({
                                ...removeAreas,
                                footerRight: { ...removeAreas.footerRight, height: parseInt(e.target.value) || 100 }
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </div>

                {/* 页码设置 */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">页码设置</h3>
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      自动记忆
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* 处理开始页码 */}
                    <div className="border border-gray-200 rounded-lg p-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        处理开始页码
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">从第</span>
                        <input
                          type="number"
                          min="1"
                          max={numPages || 999}
                          value={processStartPage}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setProcessStartPage(val);
                            // 如果开始页大于结束页且结束页不为0，自动调整结束页
                            if (processEndPage > 0 && val > processEndPage) {
                              setProcessEndPage(val);
                            }
                          }}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-xs text-gray-600">页开始处理</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        例如：3 = 跳过前2页
                      </p>
                    </div>

                    {/* 处理结束页码 */}
                    <div className="border border-gray-200 rounded-lg p-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        处理结束页码
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">处理到第</span>
                        <input
                          type="number"
                          min="0"
                          max={numPages || 999}
                          value={processEndPage}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            // 如果输入的结束页小于开始页且不为0，设置为开始页
                            if (val > 0 && val < processStartPage) {
                              setProcessEndPage(processStartPage);
                            } else {
                              setProcessEndPage(val);
                            }
                          }}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-xs text-gray-600">页（0=最后一页）</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {processEndPage === 0 ? '处理到最后一页' : `处理到第${processEndPage}页`}
                      </p>
                    </div>

                    {/* 起始页码（编号） */}
                    <div className="border border-gray-200 rounded-lg p-3 lg:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          起始页码编号
                        </label>
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          自动记忆
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">从原文件第</span>
                        <input
                          type="number"
                          min="1"
                          max={numPages || 999}
                          value={pageNumberStart}
                          onChange={(e) => setPageNumberStart(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-xs text-gray-600">页开始添加"第1页"</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        例如：3 = 原文件第3页显示"第1页"
                      </p>
                    </div>
                  </div>
                </div>

                {/* 页面范围选择 */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        只保存指定页面
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* 保存起始页 */}
                      <div className="bg-white border border-purple-300 rounded-lg p-3 shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          保存起始页
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">从第</span>
                          <input
                            type="number"
                            min="1"
                            max={numPages || 999}
                            value={saveStartPage}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setSaveStartPage(val);
                              // 如果起始页大于结束页且结束页不为0，自动调整结束页
                              if (saveEndPage > 0 && val > saveEndPage) {
                                setSaveEndPage(val);
                              }
                            }}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                          <span className="text-xs text-gray-600">页开始保存</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          只保留从这一页开始的内容
                        </p>
                      </div>

                      {/* 保存结束页 */}
                      <div className="bg-white border border-purple-300 rounded-lg p-3 shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          保存结束页
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">到第</span>
                          <input
                            type="number"
                            min="0"
                            max={numPages || 999}
                            value={saveEndPage}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              // 如果输入的结束页小于起始页且不为0，设置为起始页
                              if (val > 0 && val < saveStartPage) {
                                setSaveEndPage(saveStartPage);
                              } else {
                                setSaveEndPage(val);
                              }
                            }}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                          <span className="text-xs text-gray-600">页（0=最后一页）</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {saveEndPage === 0 ? '保存到最后一页' : `保存到第${saveEndPage}页`}
                        </p>
                      </div>
                    </div>

                    {/* 说明提示 */}
                    <div className="mt-3 bg-white border border-purple-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="text-xs text-gray-700">
                          <p className="font-medium text-purple-900 mb-1">使用示例：</p>
                          <ul className="space-y-1">
                            <li>• 保存第3-10页：起始页=3，结束页=10</li>
                            <li>• 保存第5页到最后：起始页=5，结束页=0</li>
                            <li>• 保存全部：起始页=1，结束页=0</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 自定义文字 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      页脚附加文字（可选）
                    </label>
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      自动记忆
                    </span>
                  </div>
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="例如：公司名称、部门等"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    此文字将显示在"第X頁，共X頁"下方，留空则不显示
                  </p>
                </div>

                {/* PDF密码输入框（仅在需要时显示） */}
                {requiresPassword && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-900">此PDF已加密</p>
                        <p className="text-xs text-yellow-700 mt-1">请输入密码以继续处理</p>
                      </div>
                    </div>
                    <input
                      type="password"
                      value={pdfPassword}
                      onChange={(e) => setPdfPassword(e.target.value)}
                      placeholder="请输入PDF密码"
                      className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>
                )}

                {/* 错误提示 */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <button
                    onClick={handleRemoveFooter}
                    disabled={!selectedFile || processing}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md font-medium flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>处理中...</span>
                      </>
                    ) : (
                      <>
                        <TrashIcon className="w-5 h-5" />
                        <span>移除页脚</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleReset}
                    disabled={processing}
                    className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    重置
                  </button>
                </div>
              </div>
            </div>

            {/* 使用说明 */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">使用说明</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                  <span>选择需要处理的PDF文件</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                  <span>勾选需要擦除的区域（页眉/页脚/角落）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                  <div>
                    <span className="font-medium">设置页码参数：</span>
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      <div>• 处理开始页码：从第几页开始擦除页脚</div>
                      <div>• 处理结束页码：处理到第几页（0=最后一页）</div>
                      <div>• 起始页码编号：从第几页开始添加"第1页"</div>
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</span>
                  <div>
                    <span className="font-medium">只保存指定页面（可选）：</span>
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      <div>• 保存起始页：从第几页开始保存</div>
                      <div>• 保存结束页：保存到第几页（0=最后一页）</div>
                      <div className="text-purple-600 font-medium">• 只会保存指定范围内的页面，其他页面丢弃</div>
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">5</span>
                  <span>电脑端自动预览，查看擦除区域范围</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">6</span>
                  <span>点击"移除页脚"处理并自动添加页码</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 右侧：预览和下载区域 */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {processedFileUrl ? '处理结果' : showPreview ? 'PDF预览' : '文件预览'}
              </h2>

              {processedFileUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center p-8 bg-green-50 border border-green-200 rounded-xl">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">处理完成！</h3>
                      <p className="text-sm text-gray-600">PDF页脚已成功移除</p>
                    </div>
                  </div>

                  <button
                    onClick={handleDownload}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm hover:shadow-md font-medium flex items-center justify-center gap-2"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span>下载处理后的PDF</span>
                  </button>

                  <button
                    onClick={handleReset}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                  >
                    处理新文件
                  </button>
                </div>
              ) : showPreview && pdfDoc ? (
                <div className="space-y-4">
                  {/* PDF Canvas */}
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                    <canvas ref={canvasRef} className="w-full h-auto" />
                  </div>

                  {/* 页面导航 */}
                  {numPages > 1 && (
                    <div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
                      <button
                        onClick={() => changePage(-1)}
                        disabled={pageNum <= 1}
                        className="px-3 py-1 bg-white border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        上一页
                      </button>
                      <span className="text-sm text-gray-600">
                        第 {pageNum} 页 / 共 {numPages} 页
                      </span>
                      <button
                        onClick={() => changePage(1)}
                        disabled={pageNum >= numPages}
                        className="px-3 py-1 bg-white border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        下一页
                      </button>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-blue-900">
                        <p className="font-medium">预览说明</p>
                        <ul className="mt-1 space-y-1 text-xs">
                          <li>• <span className="text-red-600 font-medium">红色区域</span>：通栏擦除区域（页眉/页脚）</li>
                          <li>• <span className="text-blue-600 font-medium">蓝色区域</span>：角落擦除区域</li>
                          <li>• 调整参数可实时查看擦除范围</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPreview(false)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                  >
                    关闭预览
                  </button>
                </div>
              ) : selectedFile ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                          <path d="M14 2v6h6"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-blue-900">
                        <p className="font-medium">文件已选择</p>
                        <p className="mt-1">点击"预览并调整页脚高度"按钮查看PDF并精确调整擦除区域</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <DocumentArrowUpIcon className="w-20 h-20 text-gray-300 mb-4" />
                  <p className="text-sm text-gray-500">暂无文件</p>
                  <p className="text-xs text-gray-400 mt-1">请在左侧选择PDF文件</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PDFFooterRemover;
