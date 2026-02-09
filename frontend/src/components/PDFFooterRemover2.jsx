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
  EyeIcon,
  TableCellsIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

function PDFFooterRemover2() {
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
      secondLastPageAdvisor: { enabled: false, x: 0, y: 100, width: 200, height: 100 }, // 倒数第二页保险顾问姓名
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

  // 表格提取相关状态
  const [extractingTables, setExtractingTables] = useState(false);
  const [extractedTables, setExtractedTables] = useState([]);
  const [showTables, setShowTables] = useState(false);

  // 全文提取相关状态
  const [extractingText, setExtractingText] = useState(false);
  const [extractedText, setExtractedText] = useState(null);
  const [showText, setShowText] = useState(false);

  // Markdown表格提取相关状态
  const [extractingMarkdown, setExtractingMarkdown] = useState(false);
  const [markdownTables, setMarkdownTables] = useState('');
  const [showMarkdown, setShowMarkdown] = useState(false);

  // 固定删除的文字列表（不可见，始终生效）
  const defaultRemoveTexts = [
    // 英文版本
    "FORTSTONE",
    "FORTSTONE INT'L (HK) LIMITED",
    "FORTSTONE INT'L (HK) LIMITED (83520)",
    "FORTSTONE INT'L (HK)",
    "FORTSTONE INTERNATIONAL (HONG KONG) LIMITED",
    "LIMITED (83520)",

    // 繁体中文
    "富石國際(香港)有限公司",
    "富石國際（香港）有限公司",

    // 简体中文
    "富石国际(香港)有限公司",
    "富石国际（香港）有限公司",

    // 编号
    "34659708"
  ];

  // 用户自定义删除的文字列表（可见可编辑）
  const [removeTexts, setRemoveTexts] = useState(() => {
    const saved = localStorage.getItem('pdf_remove_texts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('解析保存的删除文字列表失败:', e);
      }
    }
    return []; // 默认为空，用户可自行添加
  });

  // 保存删除文字列表到localStorage
  useEffect(() => {
    localStorage.setItem('pdf_remove_texts', JSON.stringify(removeTexts));
  }, [removeTexts]);

  // 保险公司预设模板
  const companyTemplates = {
    manulife: {
      name: '宏利',
      icon: '🟢',
      areas: {
        headerFull: { enabled: false, height: 50 },
        headerLeft: { enabled: false, width: 100, height: 100 },
        headerRight: { enabled: false, width: 100, height: 100 },
        footerFull: { enabled: true, height: 83 },
        footerLeft: { enabled: false, width: 100, height: 100 },
        footerRight: { enabled: false, width: 100, height: 100 },
        secondLastPageAdvisor: { enabled: false, x: 50, y: 100, width: 500, height: 60 },
      }
    },
    prudential: {
      name: '保诚',
      icon: '🔴',
      areas: {
        headerFull: { enabled: false, height: 50 },
        headerLeft: { enabled: false, width: 100, height: 100 },
        headerRight: { enabled: false, width: 100, height: 100 },
        footerFull: { enabled: true, height: 78 },
        footerLeft: { enabled: false, width: 100, height: 100 },
        footerRight: { enabled: false, width: 100, height: 100 },
        secondLastPageAdvisor: { enabled: false, x: 0, y: 100, width: 200, height: 100 },
      }
    },
    aia: {
      name: '友邦',
      icon: '🔵',
      areas: {
        headerFull: { enabled: false, height: 50 },
        headerLeft: { enabled: false, width: 100, height: 100 },
        headerRight: { enabled: false, width: 100, height: 100 },
        footerFull: { enabled: true, height: 70 },
        footerLeft: { enabled: false, width: 100, height: 100 },
        footerRight: { enabled: false, width: 100, height: 100 },
        secondLastPageAdvisor: { enabled: false, x: 0, y: 100, width: 200, height: 100 },
      }
    },
    boclife: {
      name: '中银人寿',
      icon: '🟣',
      areas: {
        headerFull: { enabled: false, height: 50 },
        headerLeft: { enabled: false, width: 100, height: 100 },
        headerRight: { enabled: false, width: 100, height: 100 },
        footerFull: { enabled: true, height: 75 },
        footerLeft: { enabled: false, width: 100, height: 100 },
        footerRight: { enabled: false, width: 100, height: 100 },
        secondLastPageAdvisor: { enabled: false, x: 0, y: 100, width: 200, height: 100 },
      }
    },
    sunlife: {
      name: '永明',
      icon: '🟡',
      areas: {
        headerFull: { enabled: false, height: 50 },
        headerLeft: { enabled: false, width: 100, height: 100 },
        headerRight: { enabled: false, width: 100, height: 100 },
        footerFull: { enabled: true, height: 80 },
        footerLeft: { enabled: false, width: 100, height: 100 },
        footerRight: { enabled: false, width: 100, height: 100 },
        secondLastPageAdvisor: { enabled: false, x: 0, y: 100, width: 200, height: 100 },
      }
    },
    axa: {
      name: '安盛',
      icon: '🔶',
      areas: {
        headerFull: { enabled: false, height: 50 },
        headerLeft: { enabled: false, width: 100, height: 100 },
        headerRight: { enabled: true, width: 200, height: 58 },
        footerFull: { enabled: true, height: 63 },
        footerLeft: { enabled: false, width: 100, height: 100 },
        footerRight: { enabled: false, width: 100, height: 100 },
        secondLastPageAdvisor: { enabled: false, x: 0, y: 100, width: 200, height: 100 },
      }
    },
    custom: {
      name: '自定义',
      icon: '⚙️',
      areas: {
        headerFull: { enabled: false, height: 50 },
        headerLeft: { enabled: false, width: 100, height: 100 },
        headerRight: { enabled: false, width: 100, height: 100 },
        footerFull: { enabled: true, height: 50 },
        footerLeft: { enabled: false, width: 100, height: 100 },
        footerRight: { enabled: false, width: 100, height: 100 },
        secondLastPageAdvisor: { enabled: false, x: 0, y: 100, width: 200, height: 100 },
      }
    }
  };

  // 应用模板
  const applyTemplate = (templateKey) => {
    const template = companyTemplates[templateKey];
    if (template) {
      setRemoveAreas(template.areas);
    }
  };

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
      setExtractedTables([]);
      setShowTables(false);

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

  // 提取表格功能（PyMuPDF）
  const handleExtractTables = async () => {
    if (!selectedFile) {
      setError('请先选择PDF文件');
      return;
    }

    setExtractingTables(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf_file', selectedFile);

      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_BASE_URL}/api/pdf/extract-tables`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.status === 'success') {
        setExtractedTables(response.data.tables || []);
        setShowTables(true);
      } else {
        setError(response.data.message || '提取表格失败');
      }
    } catch (err) {
      console.error('提取表格失败:', err);
      setError(err.response?.data?.message || '提取表格失败，请重试');
    } finally {
      setExtractingTables(false);
    }
  };

  // 提取表格功能（pdfplumber）
  const handleExtractTablesPlumber = async () => {
    if (!selectedFile) {
      setError('请先选择PDF文件');
      return;
    }

    setExtractingTables(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf_file', selectedFile);

      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_BASE_URL}/api/pdf/extract-tables-plumber`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.status === 'success') {
        setExtractedTables(response.data.tables || []);
        setShowTables(true);
      } else {
        setError(response.data.message || '提取表格失败');
      }
    } catch (err) {
      console.error('提取表格失败:', err);
      setError(err.response?.data?.message || '提取表格失败，请重试');
    } finally {
      setExtractingTables(false);
    }
  };

  // 提取全文功能
  const handleExtractText = async () => {
    if (!selectedFile) {
      setError('请先选择PDF文件');
      return;
    }

    setExtractingText(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf_file', selectedFile);

      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_BASE_URL}/api/pdf/extract-text`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.status === 'success') {
        setExtractedText(response.data);
        setShowText(true);
        setShowTables(false);
        setShowMarkdown(false);
      } else {
        setError(response.data.message || '提取文本失败');
      }
    } catch (err) {
      console.error('提取文本失败:', err);
      setError(err.response?.data?.message || '提取文本失败，请重试');
    } finally {
      setExtractingText(false);
    }
  };

  // 提取Markdown表格功能
  const handleExtractMarkdown = async () => {
    if (!selectedFile) {
      setError('请先选择PDF文件');
      return;
    }

    setExtractingMarkdown(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf_file', selectedFile);

      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_BASE_URL}/api/pdf/extract-tables-markdown`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.status === 'success') {
        setMarkdownTables(response.data.markdown);
        setShowMarkdown(true);
        setShowTables(false);
        setShowText(false);
      } else {
        setError(response.data.message || '提取表格失败');
      }
    } catch (err) {
      console.error('提取Markdown表格失败:', err);
      if (err.response?.status === 404) {
        setError('PDF中未检测到表格');
      } else {
        setError(err.response?.data?.message || '提取表格失败，请重试');
      }
    } finally {
      setExtractingMarkdown(false);
    }
  };

  // 下载Markdown文件
  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownTables], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedFile.name.replace('.pdf', '')}_tables.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 下载表格为CSV（改进格式）
  const handleDownloadTable = (tableIndex, format = 'csv') => {
    const table = extractedTables[tableIndex];
    if (!table || !table.data) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'csv') {
      // CSV格式：使用引号包裹每个单元格，防止逗号冲突
      content = table.data.map(row =>
        row.map(cell => {
          // 转义双引号并用双引号包裹
          const escaped = String(cell).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')
      ).join('\n');

      // 添加UTF-8 BOM，确保Excel正确识别中文
      content = '\ufeff' + content;
      mimeType = 'text/csv;charset=utf-8;';
      filename = `table_${tableIndex + 1}_page${table.page}.csv`;
    } else if (format === 'txt') {
      // TXT格式：使用制表符分隔，更易读
      content = `表格 ${tableIndex + 1} (第${table.page}页)\n`;
      content += `共 ${table.rows} 行 × ${table.cols} 列\n`;
      content += `提取方法: ${table.method}\n`;
      content += '='.repeat(50) + '\n\n';

      content += table.data.map(row => row.join('\t')).join('\n');

      mimeType = 'text/plain;charset=utf-8;';
      filename = `table_${tableIndex + 1}_page${table.page}.txt`;
    } else if (format === 'markdown') {
      // Markdown格式：表格格式
      content = `## 表格 ${tableIndex + 1} (第${table.page}页)\n\n`;
      content += `**共 ${table.rows} 行 × ${table.cols} 列** | 提取方法: ${table.method}\n\n`;

      if (table.data.length > 0) {
        // 表头
        content += '| ' + table.data[0].join(' | ') + ' |\n';
        // 分隔线
        content += '| ' + table.data[0].map(() => '---').join(' | ') + ' |\n';
        // 数据行
        table.data.slice(1).forEach(row => {
          content += '| ' + row.join(' | ') + ' |\n';
        });
      }

      mimeType = 'text/markdown;charset=utf-8;';
      filename = `table_${tableIndex + 1}_page${table.page}.md`;
    }

    // 创建Blob并下载
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

      // 合并固定删除和用户自定义删除的文字列表
      const allRemoveTexts = [...defaultRemoveTexts, ...removeTexts];
      formData.append('remove_texts', JSON.stringify(allRemoveTexts));

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
      secondLastPageAdvisor: { enabled: false, x: 0, y: 100, width: 200, height: 100 },
    });
    setProcessedFileUrl(null);
    setError(null);
    setPdfDoc(null);
    setShowPreview(false);
    setPdfPassword('');
    setRequiresPassword(false);
    setExtractedTables([]);
    setShowTables(false);
    setExtractedText(null);
    setShowText(false);
    setMarkdownTables('');
    setShowMarkdown(false);
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
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="text-sm font-medium">返回首页</span>
            </button>

            <button
              onClick={() => onNavigate('pdf-footer-remover')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              <DocumentTextIcon className="w-5 h-5" />
              <span className="text-sm font-medium">旧版PDF工具</span>
            </button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <TrashIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">计划书处理工具</h1>
              <p className="text-sm text-gray-500 mt-1">页脚擦除 + 表格提取</p>
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

                {/* 功能按钮 */}
                {selectedFile && !processedFileUrl && (
                  <div className="space-y-3">
                    {/* 全文提取按钮 */}
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <h3 className="text-xs font-semibold text-purple-900 mb-2">全文提取</h3>
                      <button
                        onClick={handleExtractText}
                        disabled={extractingText}
                        className="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm hover:shadow-md font-medium flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
                      >
                        {extractingText ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            <span>提取中...</span>
                          </>
                        ) : (
                          <>
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>提取全文</span>
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-600 mt-2">
                        💡 提取PDF中的所有文字内容，表格自动转为Markdown格式
                      </p>
                    </div>

                    {/* 预览按钮（仅移动端显示） */}
                    {!showPreview && (
                      <button
                        onClick={handleOpenPreview}
                        className="lg:hidden w-full px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-sm hover:shadow-md font-medium flex items-center justify-center gap-2"
                      >
                        <EyeIcon className="w-5 h-5" />
                        <span>预览PDF</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 保险公司模板选择 - 紧凑版 */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-200">
                    <h3 className="text-xs font-semibold text-indigo-900 mb-2">📋 快速选择保险公司</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(companyTemplates).map(([key, template]) => (
                        <button
                          key={key}
                          onClick={() => applyTemplate(key)}
                          className="px-2 py-1 bg-white border border-indigo-200 rounded hover:border-indigo-500 hover:bg-indigo-50 transition-all text-xs font-medium text-gray-700 hover:text-indigo-900 flex items-center gap-1 whitespace-nowrap"
                        >
                          <span className="text-sm">{template.icon}</span>
                          <span>{template.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 页眉擦除设置 - 隐藏 */}
                {/* <div className="border-t border-gray-200 pt-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3">页眉擦除区域</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white border border-blue-300 rounded-lg p-2">
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={removeAreas.headerFull.enabled}
                            onChange={(e) => setRemoveAreas({
                              ...removeAreas,
                              headerFull: { ...removeAreas.headerFull, enabled: e.target.checked }
                            })}
                            className="w-3 h-3"
                          />
                          <span>通栏</span>
                        </label>
                        {removeAreas.headerFull.enabled && (
                          <input
                            type="number"
                            min="10"
                            max="200"
                            value={removeAreas.headerFull.height}
                            onChange={(e) => setRemoveAreas({
                              ...removeAreas,
                              headerFull: { ...removeAreas.headerFull, height: parseInt(e.target.value) || 50 }
                            })}
                            className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        )}
                      </div>

                      <div className="bg-white border border-blue-300 rounded-lg p-2">
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={removeAreas.headerLeft.enabled}
                            onChange={(e) => setRemoveAreas({
                              ...removeAreas,
                              headerLeft: { ...removeAreas.headerLeft, enabled: e.target.checked }
                            })}
                            className="w-3 h-3"
                          />
                          <span>左上</span>
                        </label>
                      </div>

                      <div className="bg-white border border-blue-300 rounded-lg p-2">
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={removeAreas.headerRight.enabled}
                            onChange={(e) => setRemoveAreas({
                              ...removeAreas,
                              headerRight: { ...removeAreas.headerRight, enabled: e.target.checked }
                            })}
                            className="w-3 h-3"
                          />
                          <span>右上</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div> */}

                {/* 页脚擦除设置 - 超紧凑版 */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <div className="bg-white border border-orange-300 rounded-lg p-2.5 space-y-2">
                      {/* 启用开关 */}
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={removeAreas.footerFull.enabled}
                          onChange={(e) => setRemoveAreas({
                            ...removeAreas,
                            footerFull: { ...removeAreas.footerFull, enabled: e.target.checked }
                          })}
                          className="w-3.5 h-3.5"
                        />
                        <span className="font-medium text-gray-700">页脚擦除</span>
                        {removeAreas.footerFull.enabled && (
                          <span className="ml-auto text-xs font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">
                            {removeAreas.footerFull.height}px · 从第{processStartPage}页
                          </span>
                        )}
                      </label>

                      {/* 参数设置 */}
                      {removeAreas.footerFull.enabled && (
                        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-gray-200">
                          {/* 擦除高度 */}
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">高度(px):</label>
                            <input
                              type="number"
                              min="10"
                              max="200"
                              value={removeAreas.footerFull.height}
                              onChange={(e) => setRemoveAreas({
                                ...removeAreas,
                                footerFull: { ...removeAreas.footerFull, height: parseInt(e.target.value) || 50 }
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="50"
                            />
                          </div>

                          {/* 起始页码 */}
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">起始页:</label>
                            <input
                              type="number"
                              min="1"
                              value={processStartPage}
                              onChange={(e) => setProcessStartPage(parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>


                {/* 删除指定文字 - 用户自定义 */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <h3 className="text-sm font-semibold text-red-900 mb-3">✂️ 额外删除文字</h3>
                    {removeTexts.length > 0 && (
                      <div className="space-y-2 mb-2">
                        {removeTexts.map((text, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={text}
                              onChange={(e) => {
                                const newTexts = [...removeTexts];
                                newTexts[index] = e.target.value;
                                setRemoveTexts(newTexts);
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="输入要删除的文字"
                            />
                            <button
                              onClick={() => {
                                const newTexts = removeTexts.filter((_, i) => i !== index);
                                setRemoveTexts(newTexts);
                              }}
                              className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                            >
                              删除
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setRemoveTexts([...removeTexts, ''])}
                      className="w-full px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      + 添加额外删除文字
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 系统已自动删除FORTSTONE相关文字，此处可添加其他需要删除的文字
                    </p>
                  </div>
                </div>

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
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <span>开始处理</span>
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
          </div>

          {/* 右侧：预览和结果区域 */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {processedFileUrl ? '处理结果' : showMarkdown ? 'Markdown表格' : showText ? '提取的文本' : showTables ? '提取的表格' : showPreview ? 'PDF预览' : '文件预览'}
              </h2>

              {/* 处理完成结果 */}
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
              ) : showMarkdown && markdownTables ? (
                /* Markdown表格提取结果 */
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-600">
                      Markdown格式表格
                    </div>
                    <button
                      onClick={handleDownloadMarkdown}
                      className="px-3 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors flex items-center gap-1"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      下载 .md
                    </button>
                  </div>

                  {/* Markdown预览 */}
                  <div className="max-h-[600px] overflow-y-auto bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-800">
                      {markdownTables}
                    </pre>
                  </div>

                  <button
                    onClick={() => setShowMarkdown(false)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                  >
                    关闭
                  </button>
                </div>
              ) : showText && extractedText ? (
                /* 全文提取结果 */
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-600">
                      共 {extractedText.total_pages} 页，{extractedText.total_chars} 个字符
                      {extractedText.total_tables > 0 && ` · ${extractedText.total_tables} 个表格`}
                    </div>
                    <button
                      onClick={() => {
                        const blob = new Blob([extractedText.full_text], { type: 'text/markdown;charset=utf-8' });
                        const link = document.createElement('a');
                        const url = URL.createObjectURL(blob);
                        link.setAttribute('href', url);
                        link.setAttribute('download', `${selectedFile.name.replace('.pdf', '')}_全文.md`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors flex items-center gap-1"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      下载 .md
                    </button>
                  </div>

                  {/* 全文显示 */}
                  <div className="max-h-[600px] overflow-y-auto bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-800">
                      {extractedText.full_text}
                    </pre>
                  </div>

                  {/* 按页显示统计 */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">各页统计</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {extractedText.pages.map((page, index) => (
                        <div key={index} className={`text-xs rounded p-2 ${page.has_tables ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-700">第{page.page}页：</span>
                            {page.has_tables && (
                              <span className="text-green-600 text-xs">📊 {page.table_count}表</span>
                            )}
                          </div>
                          <span className="text-gray-600">{page.char_count}字</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowText(false)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                  >
                    关闭
                  </button>
                </div>
              ) : showTables && extractedTables.length > 0 ? (
                /* 表格提取结果 */
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-600">
                      共提取到 {extractedTables.length} 个表格
                    </div>
                    {extractedTables[0]?.method && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        extractedTables[0].method === 'pdfplumber'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {extractedTables[0].method === 'pdfplumber' ? '精确提取' : '快速提取'}
                      </span>
                    )}
                  </div>
                  <div className="max-h-[600px] overflow-y-auto space-y-4">
                    {extractedTables.map((table, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">
                                表格 {index + 1} {table.page && `(第${table.page}页)`}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">
                                {table.rows} 行 × {table.cols} 列
                              </p>
                            </div>
                          </div>
                          {/* 下载格式选项 */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDownloadTable(index, 'csv')}
                              className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              title="下载为CSV格式（Excel可直接打开）"
                            >
                              📊 CSV
                            </button>
                            <button
                              onClick={() => handleDownloadTable(index, 'txt')}
                              className="flex-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                              title="下载为TXT格式（制表符分隔）"
                            >
                              📄 TXT
                            </button>
                            <button
                              onClick={() => handleDownloadTable(index, 'markdown')}
                              className="flex-1 px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                              title="下载为Markdown格式"
                            >
                              📝 MD
                            </button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs border-collapse border border-gray-300">
                            {/* 表头（第一行） */}
                            {table.data && table.data.length > 0 && (
                              <thead className="bg-gray-100">
                                <tr className="border-b-2 border-gray-400">
                                  {table.data[0].map((cell, cellIndex) => (
                                    <th key={cellIndex} className="px-2 py-2 border-r border-gray-300 font-semibold text-left text-gray-700">
                                      {cell}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                            )}
                            {/* 数据行（从第二行开始） */}
                            <tbody>
                              {table.data && table.data.slice(1, 6).map((row, rowIndex) => (
                                <tr key={rowIndex} className={`border-b border-gray-200 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="px-2 py-1 border-r border-gray-200 text-gray-600">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {table.data && table.data.length > 6 && (
                            <p className="text-xs text-gray-500 mt-2 text-center bg-gray-50 py-2 rounded">
                              ...还有 {table.data.length - 6} 行数据
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowTables(false)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                  >
                    关闭
                  </button>
                </div>
              ) : showPreview && pdfDoc ? (
                /* PDF预览 */
                <div className="space-y-4">
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                    <canvas ref={canvasRef} className="w-full h-auto" />
                  </div>

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

                  <button
                    onClick={() => setShowPreview(false)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                  >
                    关闭预览
                  </button>
                </div>
              ) : selectedFile ? (
                /* 文件信息 */
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
                </div>
              ) : (
                /* 无文件 */
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

export default PDFFooterRemover2;
