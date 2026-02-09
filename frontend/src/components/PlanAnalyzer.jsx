import React, { useState, useEffect } from 'react';
import { Upload, Trash2, FileText, Image as ImageIcon, Loader2, Save, CheckCircle, List, X, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../hooks/useAppNavigate';
import { authFetch } from '../utils/authFetch';
import * as pdfjsLib from 'pdfjs-dist';

// 配置 PDF.js worker - 使用 unpkg CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// 使用相对路径，通过nginx代理到不同服务
// /api/upload -> nginx代理到 localhost:5003/api/paddle-ocr/pdf (PaddleOCR)
// /api/start, /api/progress, /api/result -> nginx代理到 yu.xingke888.com (通义千问)
const API_BASE_URL = '';

function PlanAnalyzer() {
  const onNavigate = useAppNavigate();
  const { user } = useAuth();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFilePath, setUploadedFilePath] = useState('');
  const [prompt, setPrompt] = useState('<image>\n<|grounding|>Convert the document to markdown.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [taskId, setTaskId] = useState('');
  const [resultDir, setResultDir] = useState('');
  const [parseCompleted, setParseCompleted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileStructure, setFileStructure] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [progress, setProgress] = useState({ step: 0, message: '', percentage: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ step: 0, message: '', percentage: 0 }); // 保存进度
  const [backgroundTasks, setBackgroundTasks] = useState([]);
  const [showTaskList, setShowTaskList] = useState(false);
  const [completedTasks, setCompletedTasks] = useState(new Set()); // 防止重复处理已完成的任务
  const [hasStartedAnalysis, setHasStartedAnalysis] = useState(false); // 记录是否已经开始分析
  const [loadingTaskId, setLoadingTaskId] = useState(null); // 记录正在加载的任务ID
  const [autoSaveTriggered, setAutoSaveTriggered] = useState(false); // 记录是否已触发自动保存
  const [isViewingExistingDoc, setIsViewingExistingDoc] = useState(false); // 标记是否正在查看已存在的文档
  const fetchingDirsRef = React.useRef(new Set()); // 追踪正在获取的目录，防止重复请求
  const fetchingFilesRef = React.useRef(new Set()); // 追踪正在获取的文件，防止重复请求
  const eventSourcesRef = React.useRef(new Map()); // 存储所有活跃的SSE连接

  // 快速检测PDF是否包含表格元素
  const detectTableInPDF = async (file) => {
    try {
      console.log('🔍 开始检测PDF表格...');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      console.log(`📄 PDF总页数: ${pdf.numPages}`);

      // 只检查前6页（保险计划书的表格通常在前几页）
      const pagesToCheck = Math.min(pdf.numPages, 6);

      for (let pageNum = 1; pageNum <= pagesToCheck; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // 提取文本
        const pageText = textContent.items.map(item => item.str).join(' ');

        // 检测表格特征：
        // 1. 包含HTML表格标签（有些PDF会保留）
        // 2. 包含大量数字和制表符
        // 3. 包含表格相关关键词
        const hasTableMarkers = /<table|<tr|<td/i.test(pageText);
        const hasTableKeywords = /年度|保单年度|退保金|现金价值|保险金额|累计|表格/i.test(pageText);

        // 统计数字和特殊字符（表格通常有很多数字）
        const digitCount = (pageText.match(/\d/g) || []).length;
        const textLength = pageText.length;
        const digitRatio = textLength > 0 ? digitCount / textLength : 0;

        console.log(`📊 第${pageNum}页: 长度=${textLength}, 数字比例=${digitRatio.toFixed(2)}, 包含表格关键词=${hasTableKeywords}`);

        // 如果发现表格特征，返回true
        if (hasTableMarkers || (hasTableKeywords && digitRatio > 0.15)) {
          console.log(`✅ 在第${pageNum}页检测到表格元素`);
          return true;
        }
      }

      console.log('❌ 未检测到表格元素');
      return false;
    } catch (error) {
      console.error('PDF检测出错:', error);
      // 出错时返回true，允许继续处理（避免误拦截）
      return true;
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // 检查文件类型
      if (file.type !== 'application/pdf') {
        alert('请上传PDF文件');
        return;
      }

      // 添加创建时间到文件对象
      file.createdAt = new Date().toISOString();

      // 先检测PDF是否包含表格（检测前不显示预览）
      setIsUploading(true);
      const hasTable = await detectTableInPDF(file);

      if (!hasTable) {
        alert('检测到上传的PDF文件不是计划书。请上传计划书文件。');
        setIsUploading(false);
        return;
      }

      // 检测通过后才显示预览
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // 有表格，继续上传
      console.log('✅ PDF检测通过，开始上传文件...');
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    setIsUploading(true);
    setParseCompleted(false);
    setSelectedFile(null);
    setUploadedFilePath('');
    setTaskId('');
    setResultDir('');
    setHasStartedAnalysis(false); // 重置分析状态，允许新文件分析
    setAutoSaveTriggered(false); // 重置自动保存状态
    setSaveProgress({ step: 0, message: '', percentage: 0 }); // 重置保存进度

    try {
      const formData = new FormData();
      formData.append('file', file);

      // 只上传文件，暂不进行OCR（需要点击"开始分析"才OCR）
      // 这里需要一个简单的文件上传接口，或者先保存文件路径
      // 暂时使用本地 Blob URL
      const blobUrl = URL.createObjectURL(file);
      setUploadedFilePath(blobUrl);
      setIsUploading(false);

      console.log('✅ 文件已准备就绪，等待开始分析');
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setUploadedFile(null);
      alert('文件准备失败：' + error.message);
    }
  };

  const handleDelete = () => {
    setUploadedFile(null);
    setPreviewUrl('');
    setUploadedFilePath('');
    setParseCompleted(false);
    setSelectedFile(null);
    setTaskId('');
    setResultDir('');
    setProgress({ step: 0, message: '' });
    setHasStartedAnalysis(false); // 重置分析状态
    setAutoSaveTriggered(false); // 重置自动保存状态
    setSaveProgress({ step: 0, message: '', percentage: 0 }); // 重置保存进度
  };

  // 从后端加载未完成的任务
  const loadPendingTasks = async () => {
    if (!user?.id) return;

    try {
      console.log('🔍 查询未完成任务...');
      const response = await authFetch(`/api/ocr/documents/pending/?user_id=${user.id}`);
      const data = await response.json();

      if (data.status === 'success' && data.count > 0) {
        console.log(`✅ 找到 ${data.count} 个未完成任务`);

        // 映射文档到任务列表
        const tasks = data.data.map(doc => {
          // 根据processing_stage计算进度和状态
          const stageProgress = {
            'ocr_pending': 5,
            'pending': 8,
            'ocr_processing': 10,
            'ocr_completed': 15,
            'extracting_basic_info': 25,
            'basic_info_completed': 35,
            'extracting_tablesummary': 45,
            'tablesummary_completed': 55,
            'extracting_table': 65,
            'table_completed': 75,
            'extracting_wellness_table': 82,
            'wellness_table_completed': 88,
            'extracting_summary': 94,
            'all_completed': 100
          };

          const progress = stageProgress[doc.processing_stage] || 10;

          // 根据status和processing_stage确定state
          let state = 'running';
          if (doc.processing_stage === 'all_completed' || doc.status === 'completed') {
            state = 'finished';
          } else if (progress >= 10 && progress < 100) {
            state = 'processing';
          }

          return {
            task_id: doc.id.toString(),
            file_name: doc.file_name,
            file_size: 0,
            state: state,
            progress: progress,
            created_at: doc.created_at,
            processing_stage: doc.processing_stage,
            // 不设置result_dir，强制使用数据库模式
            result_dir: null
          };
        });

        // 按创建时间倒序排序，只保留最新的8条
        const sortedTasks = tasks
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 8);

        setBackgroundTasks(sortedTasks);
        saveTasksToLocal(sortedTasks);

        // 只有未完成任务时才自动打开任务列表
        const incompleteTasks = sortedTasks.filter(t => t.state !== 'finished');
        if (incompleteTasks.length > 0) {
          setShowTaskList(true);
        }
      } else {
        console.log('✅ 没有未完成任务');
      }
    } catch (error) {
      console.error('❌ 查询未完成任务失败:', error);
    }
  };

  // 加载本地保存的后台任务和后端未完成任务
  useEffect(() => {
    // 先加载localStorage中的任务
    const savedTasks = localStorage.getItem('backgroundTasks');
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      // 按创建时间倒序排序，只保留最新的8条
      const sortedTasks = tasks
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 8);
      setBackgroundTasks(sortedTasks);
      saveTasksToLocal(sortedTasks); // 更新localStorage

      // 恢复未完成的任务
      sortedTasks.forEach(task => {
        if (task.state !== 'finished' && task.state !== 'error') {
          resumeTask(task.task_id);
        }
      });
    }

    // 从后端加载未完成任务
    loadPendingTasks();

    // 清理函数：组件卸载时关闭所有SSE连接
    return () => {
      eventSourcesRef.current.forEach((eventSource, taskId) => {
        console.log('清理SSE连接:', taskId);
        eventSource.close();
      });
      eventSourcesRef.current.clear();
    };
  }, [user]);

  // 监听文件内容变化，自动触发保存
  useEffect(() => {
    // 如果是查看已存在的文档，不触发自动保存
    if (isViewingExistingDoc) {
      console.log('⚠️ 正在查看已存在的文档，跳过自动保存');
      return;
    }

    if (fileContent && parseCompleted && !autoSaveTriggered && !isSaving) {
      console.log('✅ 检测到OCR内容，自动触发保存流程');
      setAutoSaveTriggered(true);
      // 延迟执行保存，确保状态已更新
      setTimeout(() => {
        handleSave();
      }, 1000);
    }
  }, [fileContent, parseCompleted, autoSaveTriggered, isSaving, isViewingExistingDoc]);

  // 保存后台任务到本地
  const saveTasksToLocal = (tasks) => {
    localStorage.setItem('backgroundTasks', JSON.stringify(tasks));
  };

  // 轮询任务进度（SSE失败时的备用方案）
  const startPolling = (currentTaskId) => {
    console.log('🔄 启动轮询模式:', currentTaskId);

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/progress/${currentTaskId}`);
        const data = await response.json();

        if (data.status === 'success') {
          const progressPercent = data.progress || 0;

          console.log(`轮询进度: ${progressPercent}%`);

          // 更新进度
          setProgress({
            step: progressPercent >= 100 ? 4 : progressPercent >= 60 ? 3 : progressPercent >= 30 ? 2 : 1,
            message: progressPercent >= 100 ? '解析完成！' : `正在处理中... ${progressPercent}%`,
            percentage: progressPercent
          });

          updateBackgroundTask(currentTaskId, {
            progress: progressPercent,
            state: data.state === 'finished' ? 'finished' : 'running'
          });

          // 任务完成，停止轮询
          if (data.state === 'finished' || progressPercent >= 100) {
            clearInterval(pollInterval);
            console.log('✅ 轮询检测到任务完成，获取结果');
            fetchTaskResult(currentTaskId);
          }
        } else if (data.status === 'error') {
          clearInterval(pollInterval);
          console.error('❌ 任务失败:', data.message);
          updateBackgroundTask(currentTaskId, {
            state: 'error',
            error: data.message
          });
        }
      } catch (error) {
        console.error('轮询出错:', error);
        // 继续轮询，不停止
      }
    }, 5000); // 每5秒轮询一次

    // 5分钟后超时停止轮询
    setTimeout(() => {
      clearInterval(pollInterval);
      console.log('⏱️ 轮询超时，停止轮询');
    }, 300000);
  };

  // 使用SSE连接监听任务进度
  const connectSSE = (currentTaskId) => {
    // 如果该任务已经有SSE连接，先关闭旧连接
    if (eventSourcesRef.current.has(currentTaskId)) {
      console.log('关闭旧的SSE连接:', currentTaskId);
      eventSourcesRef.current.get(currentTaskId).close();
    }

    // 构建SSE URL
    const sseUrl = `${API_BASE_URL}/api/stream/progress/${currentTaskId}`;
    console.log('连接SSE:', sseUrl);

    const eventSource = new EventSource(sseUrl);
    let hasCompleted = false; // 防止重复处理完成事件

    eventSource.onopen = () => {
      console.log('SSE连接成功:', currentTaskId);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('收到SSE消息:', data);

        if (data.task_id === currentTaskId) {
          const progressPercent = data.progress || 0;

          // 更新当前显示的任务进度
          setProgress(prev => ({
            step: progressPercent >= 100 ? 4 : progressPercent >= 60 ? 3 : progressPercent >= 30 ? 2 : 1,
            message: progressPercent >= 100 ? '解析完成！' : `正在处理中... ${progressPercent}%`,
            percentage: progressPercent
          }));

          // 更新后台任务列表
          updateBackgroundTask(currentTaskId, {
            progress: progressPercent,
            state: progressPercent >= 100 ? 'finished' : 'running'
          });

          // 如果完成且未处理过，获取结果
          if (progressPercent >= 100 && !hasCompleted) {
            hasCompleted = true; // 标记已处理，防止重复
            console.log('任务完成，开始获取结果:', currentTaskId);
            fetchTaskResult(currentTaskId);
            // 关闭SSE连接
            eventSource.close();
            eventSourcesRef.current.delete(currentTaskId);
          }
        }
      } catch (error) {
        console.error('解析SSE消息失败:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE错误:', error);
      // 连接错误时，从Map中移除
      eventSource.close();
      eventSourcesRef.current.delete(currentTaskId);

      // SSE失败时，启动轮询作为备用方案
      console.log('⚠️ SSE连接失败，切换到轮询模式:', currentTaskId);
      startPolling(currentTaskId);
    };

    // 存储到Map中
    eventSourcesRef.current.set(currentTaskId, eventSource);

    return eventSource;
  };

  // 恢复任务监听
  const resumeTask = async (taskId) => {
    try {
      // 检查任务状态
      const response = await fetch(`${API_BASE_URL}/api/progress/${taskId}`);
      const data = await response.json();

      if (data.status === 'success') {
        if (data.state === 'finished') {
          // 任务已完成，获取结果
          fetchTaskResult(taskId);
        } else if (data.state !== 'error') {
          // 任务仍在进行，连接SSE
          connectSSE(taskId);
        }
      }
    } catch (error) {
      console.error('恢复任务失败:', error);
    }
  };

  // 获取任务结果
  const fetchTaskResult = async (currentTaskId) => {
    // 防止重复处理同一个任务
    if (completedTasks.has(currentTaskId)) {
      console.log('任务已处理过，跳过重复调用:', currentTaskId);
      return;
    }

    // 标记任务为正在处理
    setCompletedTasks(prev => new Set(prev).add(currentTaskId));

    try {
      const resultRes = await fetch(`${API_BASE_URL}/api/result/${currentTaskId}`);
      const resultData = await resultRes.json();

      if (resultData.status === 'success' && resultData.state === 'finished') {
        // 更新后台任务状态
        updateBackgroundTask(currentTaskId, {
          state: 'finished',
          progress: 100,
          result_dir: resultData.result_dir,
          completed_at: new Date().toISOString()
        });

        // 如果是当前显示的任务，更新UI
        setTaskId(prevTaskId => {
          if (prevTaskId === currentTaskId) {
            setResultDir(resultData.result_dir);
            setParseCompleted(true);
            setIsProcessing(false);
            setProgress({ step: 4, message: '解析完成！', percentage: 100 });
            fetchFileStructure(resultData.result_dir);
          }
          return prevTaskId;
        });
      }
    } catch (error) {
      console.error('获取任务结果失败:', error);
      // 标记任务失败
      updateBackgroundTask(currentTaskId, {
        state: 'error',
        error: error.message
      });
      // 失败时从已完成集合中移除，允许重试
      setCompletedTasks(prev => {
        const next = new Set(prev);
        next.delete(currentTaskId);
        return next;
      });
    }
  };

  // 更新后台任务
  const updateBackgroundTask = (taskId, updates) => {
    setBackgroundTasks(prevTasks => {
      const newTasks = prevTasks.map(task =>
        task.task_id === taskId ? { ...task, ...updates } : task
      );
      saveTasksToLocal(newTasks);
      return newTasks;
    });
  };

  // 添加后台任务（新任务添加到开头，只保留最新的8条）
  const addBackgroundTask = (task) => {
    setBackgroundTasks(prevTasks => {
      // 新任务添加到数组开头
      const newTasks = [task, ...prevTasks].slice(0, 8);
      saveTasksToLocal(newTasks);
      return newTasks;
    });
  };

  // 删除后台任务
  const removeBackgroundTask = (taskId) => {
    setBackgroundTasks(prevTasks => {
      const newTasks = prevTasks.filter(task => task.task_id !== taskId);
      saveTasksToLocal(newTasks);
      return newTasks;
    });
  };

  const handleStartParsing = async () => {
    if (!uploadedFile) {
      alert('请先上传文件');
      return;
    }

    setIsProcessing(true);
    setHasStartedAnalysis(true); // 标记已经开始分析
    setParseCompleted(false);
    setResultDir('');
    setProgress({ step: 1, message: '正在上传文件...', percentage: 5 });

    // 重置查看已存在文档的标记和自动保存标记（这是新任务）
    setIsViewingExistingDoc(false);
    setAutoSaveTriggered(true); // 异步模式下不需要自动保存，直接标记为true

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      if (user?.id) {
        formData.append('user_id', user.id);
      }

      console.log('🚀 开始异步上传PDF...');

      // 调用异步上传API（使用authFetch携带认证token）
      const response = await authFetch('/api/ocr/upload-async/', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('📦 上传响应:', data);

      if (data.status === 'success') {
        const documentId = data.document_id;
        console.log('✅ 文件上传成功，文档ID:', documentId);

        setProgress({ step: 2, message: '已上传，后台正在OCR识别...', percentage: 10 });
        setTaskId(documentId.toString());

        // 添加到后台任务列表
        const newTask = {
          task_id: documentId.toString(),
          file_name: uploadedFile.name,
          file_size: uploadedFile.size,
          state: 'running',
          progress: 10,
          created_at: new Date().toISOString(),
          processing_stage: 'ocr_pending',
          result_dir: null
        };
        addBackgroundTask(newTask);
        setShowTaskList(true);

        // 开始轮询状态
        startPollingStatus(documentId);

        setIsProcessing(false);

        alert('文件已上传成功！OCR识别正在后台处理，您可以安全地离开此页面。');
      } else {
        console.error('❌ 上传失败:', data);
        throw new Error(data.message || data.error || '上传失败');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('上传失败：' + error.message);
      setIsProcessing(false);
      setHasStartedAnalysis(false);
      setProgress({ step: 0, message: '', percentage: 0 });
    }
  };

  // 轮询文档处理状态
  const startPollingStatus = (documentId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ocr/documents/${documentId}/status/`);

        if (response.status === 404) {
          clearInterval(pollInterval);
          console.error('❌ 文档已被删除');
          removeBackgroundTask(documentId.toString());
          return;
        }

        const data = await response.json();

        if (data.status === 'success') {
          const { processing_stage, progress_percentage } = data.data;

          // 更新后台任务进度
          updateBackgroundTask(documentId.toString(), {
            progress: progress_percentage,
            processing_stage: processing_stage,
            state: processing_stage === 'all_completed' ? 'finished' : 'running'
          });

          // 如果完成或出错，停止轮询
          if (processing_stage === 'all_completed' || processing_stage === 'error') {
            clearInterval(pollInterval);
            console.log(`✅ 任务完成: ${documentId}`);
          }
        }
      } catch (err) {
        console.error('轮询状态出错:', err);
      }
    }, 3000); // 每3秒轮询一次

    // 10分钟后停止轮询
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 600000);
  };

  // 返回计划书列表
  const handleNavigateHome = () => {
    // 关闭所有SSE连接
    eventSourcesRef.current.forEach((eventSource, taskId) => {
      console.log('关闭SSE连接:', taskId);
      eventSource.close();
    });
    eventSourcesRef.current.clear();

    setIsProcessing(false);
    onNavigate && onNavigate('plan-management');
  };

  // 查看任务详情
  const handleViewTask = async (task) => {
    setLoadingTaskId(task.task_id); // 记录正在加载的任务ID
    try {
      console.log('📖 查看任务详情:', task);

      // 检查任务是否已完成
      if (task.state !== 'finished' && task.processing_stage !== 'all_completed') {
        alert('任务尚未完成');
        setLoadingTaskId(null);
        return;
      }

      // 直接跳转到文档详情页面
      console.log('✅ 跳转到文档详情页面:', task.task_id);
      onNavigate && onNavigate(`/document/${task.task_id}`);
      return;

      // 旧逻辑：从数据库加载文档详情（已废弃）
      /*
      const response = await authFetch(`/api/ocr/documents/${task.task_id}/`);
      const data = await response.json();

      if (data.status === 'success') {
        const doc = data.data;
        console.log('✅ 加载文档详情成功:', doc);

        // 设置标记：正在查看已存在的文档，禁止自动保存
        setIsViewingExistingDoc(true);
        setAutoSaveTriggered(true); // 同时标记已触发保存，防止重复

        // 设置基本状态
        setTaskId(task.task_id);
        setParseCompleted(true);
        setProgress({ step: 4, message: '解析完成！', percentage: 100 });

        // 设置文件内容（OCR结果）
        if (doc.content) {
          setFileContent(doc.content);
        }

        // 恢复任务的文件信息
        if (task.file_name) {
          const mockFile = {
            name: task.file_name,
            size: task.file_size || 0,
            createdAt: task.created_at
          };
          setUploadedFile(mockFile);
        }

        // 如果有result_dir，使用旧的文件结构方式（兼容旧任务）
        if (task.result_dir) {
          console.log('📁 使用result_dir模式加载文件结构');
          setResultDir(task.result_dir);
          await fetchFileStructure(task.result_dir);
        } else {
          // 新方式：数据已在数据库中，直接标记为完成
          console.log('💾 使用数据库模式，内容已加载');
          setResultDir(''); // 清空result_dir
        }

        setShowTaskList(false);
      } else {
        throw new Error(data.message || '加载失败');
      }
      */
    } catch (error) {
      console.error('加载任务结果失败:', error);
      alert('加载任务结果失败，请重试');
    } finally {
      setLoadingTaskId(null); // 清除加载状态
    }
  };

  const fetchFileStructure = async (dir) => {
    // 防止重复获取同一个目录（使用 ref 追踪）
    if (fetchingDirsRef.current.has(dir)) {
      console.log('⚠️ 目录正在获取中，跳过重复请求:', dir);
      return;
    }

    // 标记开始获取
    fetchingDirsRef.current.add(dir);
    console.log('✅ 开始获取文件结构，目录:', dir);

    try {
      const response = await fetch(`${API_BASE_URL}/api/folder?path=${encodeURIComponent(dir)}`);
      const data = await response.json();
      console.log('文件结构API响应:', data);

      if (data.status === 'success') {
        const children = data.children || [];
        console.log('原始文件列表:', children);

        // 过滤掉 *det.mmd 文件，只保留 *.mmd 文件（不包含det结尾的）
        const filteredChildren = children.filter(file => {
          if (file.name.endsWith('.mmd')) {
            // 排除 *det.mmd 文件
            return !file.name.endsWith('det.mmd');
          }
          return true; // 保留其他类型的文件
        });

        console.log('过滤后的文件列表:', filteredChildren);
        setFileStructure(filteredChildren);

        // 自动选择并显示第一个 .mmd 文件
        const firstMmdFile = filteredChildren.find(file =>
          file.type === 'file' && file.name.endsWith('.mmd')
        );

        console.log('找到的第一个mmd文件:', firstMmdFile);
        if (firstMmdFile) {
          await handleFileClick(firstMmdFile);
        } else {
          console.warn('没有找到.mmd文件');
        }
      }
    } catch (error) {
      console.error('Error fetching file structure:', error);
    } finally {
      // 完成后移除标记（延迟移除，确保同步调用也能拦截）
      setTimeout(() => {
        fetchingDirsRef.current.delete(dir);
        console.log('🔄 目录获取完成，移除标记:', dir);
      }, 100);
    }
  };

  const handleFileClick = async (file) => {
    if (file.type === 'file') {
      const filePath = file.path;

      // 防止重复获取同一个文件
      if (fetchingFilesRef.current.has(filePath)) {
        console.log('⚠️ 文件正在加载中，跳过重复请求:', filePath);
        return;
      }

      // 标记开始获取
      fetchingFilesRef.current.add(filePath);
      console.log('✅ 正在加载文件:', file.name, filePath);

      setSelectedFile(file);

      try {
        const response = await fetch(`${API_BASE_URL}/api/file/content?path=${encodeURIComponent(filePath)}`);
        const data = await response.json();
        console.log('文件内容API响应:', data);

        // 兼容两种响应格式：
        // 1. {status: 'success', content: '...'}
        // 2. {content: '...'}（直接返回content）
        let content = '';
        if (data.status === 'success') {
          content = data.content || '';
        } else if (data.content) {
          // 没有status字段，但有content字段
          content = data.content;
        } else {
          console.error('API返回的数据格式不正确:', data);
          content = '';
        }

        console.log('设置文件内容，长度:', content.length);
        console.log('内容前100字符:', content.substring(0, 100));
        setFileContent(content);
      } catch (error) {
        console.error('获取文件内容出错:', error);
      } finally {
        // 完成后移除标记
        setTimeout(() => {
          fetchingFilesRef.current.delete(filePath);
          console.log('🔄 文件加载完成，移除标记:', filePath);
        }, 100);
      }
    }
  };

  const handleSave = async () => {
    if (!fileContent) {
      alert('没有可保存的内容');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveProgress({
      message: '正在保存到数据库...',
      percentage: 0,
      processing_stage: 'saving'  // 自定义状态：正在保存
    });

    try {
      // 保存到数据库（后端会自动启动异步任务）
      const response = await fetch('/api/ocr/save/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_name: uploadedFile?.name || selectedFile?.name || 'unknown.pdf',
          ocr_content: fileContent,
          task_id: taskId,
          result_dir: resultDir,
          user_id: user?.id
        }),
      });

      const data = await response.json();
      console.log('保存响应:', data);

      if (data.status === 'success') {
        const documentId = data.document_id;
        setSaveProgress({
          message: '已保存！后台正在分析...',
          percentage: 5,
          processing_stage: 'pending'  // 保存完成，等待处理
        });

        // 开始轮询后端处理状态
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await authFetch(`/api/ocr/documents/${documentId}/status/`);

            // 处理文档被删除的情况（404）
            if (statusRes.status === 404) {
              console.error('❌ 文档已被删除（验证失败）');
              clearInterval(pollInterval);
              setIsSaving(false);

              // 从后台任务列表中移除
              removeBackgroundTask(documentId.toString());

              // 显示错误并重置UI
              alert('文档验证失败：上传的文件不是有效的保险计划书，已自动删除。请上传正确的计划书文件。');
              setSaveProgress({ step: 0, message: '', percentage: 0 });
              setProgress({ step: 0, message: '', percentage: 0 });
              setHasStartedAnalysis(false); // 重置分析状态，允许重新上传
              return;
            }

            const statusData = await statusRes.json();

            if (statusData.status === 'success') {
              const { processing_stage, progress_percentage } = statusData.data;

              // 更新进度条
              const stageMessages = {
                'pending': '等待处理...',
                'ocr_processing': '正在OCR识别文档...',
                'ocr_completed': 'OCR识别完成，开始提取信息',
                'extracting_basic_info': '正在提取基本信息...',
                'basic_info_completed': '基本信息提取完成',
                'extracting_tablesummary': '正在分析表格结构...',
                'tablesummary_completed': '表格结构分析完成',
                'extracting_table': '正在提取退保价值表...',
                'table_completed': '退保价值表提取完成',
                'extracting_wellness_table': '正在提取无忧选表...',
                'wellness_table_completed': '无忧选表提取完成',
                'extracting_summary': '正在提取计划书概要...',
                'all_completed': '全部完成！',
                'error': '处理出错'
              };

              const message = stageMessages[processing_stage] || '处理中...';

              setSaveProgress({
                message,
                percentage: progress_percentage,
                processing_stage  // 添加processing_stage到状态中
              });

              // 如果完成或出错，停止轮询
              if (processing_stage === 'all_completed' || processing_stage === 'error') {
                clearInterval(pollInterval);
                setIsSaving(false);

                if (processing_stage === 'all_completed') {
                  setSaveSuccess(true);
                  setTimeout(() => {
                    setSaveSuccess(false);
                    setSaveProgress({ step: 0, message: '', percentage: 0 });
                    setProgress({ step: 0, message: '', percentage: 0 }); // 重置OCR进度
                  }, 5000);
                } else if (processing_stage === 'error') {
                  // 处理出错，但文档已经在webhook中被删除或标记
                  alert('文档处理失败：上传的文件可能不是保险计划书，请上传正确的计划书文件');
                  setSaveProgress({ step: 0, message: '', percentage: 0 });
                  setProgress({ step: 0, message: '', percentage: 0 });
                }
              }
            }
          } catch (err) {
            console.error('轮询状态出错:', err);
          }
        }, 3000); // 每3秒轮询一次

        // 设置超时（5分钟后停止轮询）
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsSaving(false);
        }, 300000);

      } else {
        alert(`保存失败: ${data.message}`);
        setSaveProgress({ step: 0, message: '', percentage: 0 });
        setIsSaving(false);
      }
    } catch (error) {
      console.error('保存出错:', error);
      alert('保存失败：无法连接到服务器');
      setSaveProgress({ step: 0, message: '', percentage: 0 });
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4">
          {/* 返回按钮 */}
          <div className="mb-3">
            <button
              onClick={() => onNavigate && onNavigate('plan-management')}
              className="px-3 md:px-4 py-1.5 md:py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all text-sm md:text-base whitespace-nowrap shadow-sm border border-gray-200"
            >
              ← 返回计划书列表
            </button>
          </div>

          {/* 标题 - 居中 */}
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl text-gray-800 font-bold tracking-wide">
              计划书智能分析工具
            </h1>
            <p className="mt-1 md:mt-2 text-gray-600 text-xs md:text-sm">AI驱动的行业智能化解决方案</p>
          </div>
        </div>
      </header>

      {/* 后台任务列表弹窗 */}
      {showTaskList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Clock className="w-6 h-6" />
                后台任务列表
              </h2>
              <button
                onClick={() => setShowTaskList(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-all"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {backgroundTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>暂无后台任务</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {backgroundTasks
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 8)
                    .map((task) => (
                    <div
                      key={task.task_id}
                      className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-primary-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 mb-1">{task.file_name}</h3>
                          <p className="text-xs text-gray-500">任务ID: {task.task_id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.state === 'running' && (
                            <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              处理中
                            </span>
                          )}
                          {task.state === 'finished' && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              已完成
                            </span>
                          )}
                          {task.state === 'error' && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              失败
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 进度条 */}
                      {task.state === 'running' && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">进度</span>
                            <span className="text-xs font-semibold text-primary-700">{task.progress || 0}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary-600 to-blue-600 transition-all duration-300"
                              style={{ width: `${task.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>创建时间: {new Date(task.created_at).toLocaleString('zh-CN')}</span>
                        <div className="flex gap-2">
                          {task.state === 'finished' && (
                            <button
                              onClick={() => handleViewTask(task)}
                              disabled={loadingTaskId === task.task_id}
                              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                                loadingTaskId === task.task_id
                                  ? 'bg-gray-400 text-white cursor-not-allowed'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {loadingTaskId === task.task_id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  正在加载中
                                </>
                              ) : (
                                '查看结果'
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => removeBackgroundTask(task.task_id)}
                            className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Left Panel - File Upload */}
          <div className="space-y-3 md:space-y-4">
            {/* Upload Controls */}
            <div className="flex gap-2">
              <button
                onClick={() => document.getElementById('file-input')?.click()}
                disabled={isUploading}
                className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-dashed border-primary-300 hover:border-primary-500 rounded-lg transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                    <span className="hidden sm:inline">上传中...</span>
                    <span className="sm:hidden">上传中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="hidden sm:inline">上传PDF文件</span>
                    <span className="sm:hidden">上传PDF</span>
                  </>
                )}
              </button>
              <input
                id="file-input"
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              <button
                onClick={handleDelete}
                disabled={!uploadedFile}
                className="px-3 md:px-4 py-2.5 md:py-3 bg-white hover:bg-red-50 border-2 border-gray-300 hover:border-red-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </div>

            {/* File Preview */}
            <div className="bg-white rounded-xl border-2 border-primary-200 shadow-lg p-3 md:p-6 h-[120px] md:h-[500px] overflow-auto">
              {previewUrl ? (
                <div className="w-full h-full">
                  {uploadedFile?.type === 'application/pdf' ? (
                    <>
                      {/* 桌面端：显示 iframe 预览 */}
                      <iframe
                        src={previewUrl}
                        className="hidden md:block w-full h-full rounded-lg border border-gray-300"
                        title="PDF Preview"
                      />
                      {/* 手机端：显示提示信息 */}
                      <div className="md:hidden flex items-center justify-start h-full text-left gap-3 px-2">
                        <FileText className="h-10 w-10 text-primary-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 mb-0.5">PDF 已上传</p>
                          <p className="text-xs text-gray-500 truncate">{uploadedFile?.name}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Upload className="h-8 w-8 md:h-16 md:w-16 mb-1 md:mb-4 opacity-30" />
                  <p className="text-xs md:text-base">请上传文件以预览</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-3 md:space-y-4">
            {/* Start Analysis Button and Background Tasks Button */}
            <div className="flex gap-2">
              <button
                onClick={handleStartParsing}
                disabled={!uploadedFile || isUploading || hasStartedAnalysis}
                className="flex-1 px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-xl shadow-lg hover:from-primary-700 hover:to-blue-700 hover:shadow-xl transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base md:text-lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>正在分析中...</span>
                  </>
                ) : (
                  '开始分析'
                )}
              </button>

              {/* 后台任务按钮 */}
              {backgroundTasks.length > 0 && (
                <button
                  onClick={() => setShowTaskList(true)}
                  className="relative px-3 md:px-4 py-3 md:py-4 bg-white border-2 border-primary-500 text-primary-700 hover:bg-primary-50 rounded-xl shadow-lg font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap text-sm md:text-base"
                  title="后台任务"
                >
                  <List className="w-4 h-4 md:w-5 md:h-5" />
                  <span>后台任务</span>
                  {backgroundTasks.filter(t => t.state === 'running').length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {backgroundTasks.filter(t => t.state === 'running').length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* 后台未完成任务列表 */}
            {backgroundTasks.filter(t => t.state === 'running').length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 p-3 md:p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs md:text-sm font-semibold text-amber-900 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    后台处理中的任务 ({backgroundTasks.filter(t => t.state === 'running').length})
                  </h3>
                </div>

                {/* 提示信息 */}
                <div className="mb-3 p-2 md:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs md:text-sm text-blue-800 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="flex-1">
                      <strong className="font-semibold">提示：</strong>
                      任务正在后台处理中，您可以安全地离开此页面或关闭浏览器。后台会继续工作，稍后返回查看结果即可。
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  {backgroundTasks.filter(t => t.state === 'running').map((task, index) => (
                    <div key={task.task_id} className="bg-white rounded-lg p-2 md:p-3 border border-amber-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs md:text-sm font-medium text-gray-800 truncate" title={task.file_name}>
                            {index + 1}. {task.file_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            进度: {task.progress || 0}%
                          </p>
                        </div>
                        <button
                          onClick={() => removeBackgroundTask(task.task_id)}
                          className="p-1 hover:bg-red-100 rounded transition-all flex-shrink-0"
                          title="删除任务"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                      {/* 进度条 */}
                      <div className="mt-2 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary-600 to-blue-600 h-full transition-all duration-500"
                          style={{ width: `${task.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Indicator */}
            {isProcessing && (
              <div className="bg-primary-50 rounded-xl border-2 border-primary-200 p-3 md:p-4">
                <h3 className="text-xs md:text-sm font-semibold text-navy-800 mb-2 md:mb-3">处理进度</h3>

                {/* 百分比进度条 */}
                <div className="mb-3 md:mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">总体进度</span>
                    <span className="text-xs font-bold text-primary-700">{progress.percentage || 0}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-600 via-blue-600 to-navy-600 transition-all duration-500"
                      style={{ width: `${progress.percentage || 0}%` }}
                    />
                  </div>
                </div>

                {/* 步骤指示器 */}
                <div className="space-y-1.5 md:space-y-2">
                  {[
                    { step: 1, label: '初始化' },
                    { step: 2, label: '处理中' },
                    { step: 3, label: '获取结果' },
                    { step: 4, label: '完成' }
                  ].map(({ step, label }) => (
                    <div key={step} className="flex items-center gap-2 md:gap-3">
                      {progress.step > step ? (
                        <div className="h-4 w-4 md:h-5 md:w-5 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="h-2.5 w-2.5 md:h-3 md:w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : progress.step === step ? (
                        <Loader2 className="h-4 w-4 md:h-5 md:w-5 text-primary-600 animate-spin" />
                      ) : (
                        <div className="h-4 w-4 md:h-5 md:w-5 border-2 border-gray-300 rounded-full" />
                      )}
                      <span className={`text-xs md:text-sm ${progress.step >= step ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                {progress.message && (
                  <p className="mt-2 md:mt-3 text-xs md:text-sm text-primary-700 font-semibold">{progress.message}</p>
                )}
              </div>
            )}

            {/* MMD Content Preview - 解析完成后直接显示 */}
            {parseCompleted && (
              <div className="space-y-3 md:space-y-4">
                <div className="bg-white rounded-xl border-2 border-primary-200 shadow-lg">
                  <div className="bg-gradient-to-r from-primary-100 to-blue-100 px-3 md:px-4 py-2 md:py-3 border-b border-primary-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-2">
                      <h3 className="text-xs md:text-sm font-semibold text-gray-700">
                        📄 OCR解析结果
                      </h3>
                      {saveSuccess && (
                        <div className="w-full sm:w-auto px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm bg-green-500 text-white">
                          <CheckCircle className="h-4 w-4" />
                          <span>已保存到数据库</span>
                        </div>
                      )}
                    </div>

                    {/* 分析进度 - 任务列表 */}
                    {(isProcessing || isSaving || (saveProgress.percentage > 0 && saveProgress.processing_stage !== 'all_completed') || (progress.percentage > 0 && progress.percentage < 100 && hasStartedAnalysis)) && (
                      <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            分析进度
                          </h4>
                          <span className="text-sm font-bold text-blue-700">
                            {(() => {
                              // 计算总体进度：OCR占20%，其他任务占80%
                              const ocrProgress = parseCompleted ? 20 : (progress.percentage * 0.2);
                              const otherProgress = saveProgress.percentage ? (saveProgress.percentage * 0.8) : 0;
                              return Math.round(ocrProgress + otherProgress);
                            })()}%
                          </span>
                        </div>

                        {/* 总体进度条 */}
                        <div className="mb-4">
                          <div className="h-2 bg-white rounded-full overflow-hidden shadow-inner">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                              style={{
                                width: `${(() => {
                                  const ocrProgress = parseCompleted ? 20 : (progress.percentage * 0.2);
                                  const otherProgress = saveProgress.percentage ? (saveProgress.percentage * 0.8) : 0;
                                  return Math.round(ocrProgress + otherProgress);
                                })()}%`
                              }}
                            />
                          </div>
                        </div>

                        {/* 任务步骤列表 */}
                        <div className="space-y-2.5">
                          {[
                            {
                              id: 'ocr',
                              label: '🔍 OCR识别文档内容',
                              processingStages: ['ocr_pending', 'ocr_processing'],
                              completedStages: ['ocr_completed', 'extracting_tablecontent', 'tablecontent_completed', 'extracting_basic_info', 'basic_info_completed', 'extracting_tablesummary', 'tablesummary_completed', 'extracting_table', 'table_completed', 'extracting_wellness_table', 'wellness_table_completed', 'extracting_summary', 'all_completed']
                            },
                            {
                              id: 'basic_info',
                              label: '💼 提取基本信息',
                              processingStages: ['extracting_basic_info'],
                              completedStages: ['basic_info_completed', 'extracting_tablesummary', 'tablesummary_completed', 'extracting_table', 'table_completed', 'extracting_wellness_table', 'wellness_table_completed', 'extracting_summary', 'all_completed']
                            },
                            {
                              id: 'tablesummary',
                              label: '📋 分析表格结构',
                              processingStages: ['extracting_tablesummary'],
                              completedStages: ['tablesummary_completed', 'extracting_table', 'table_completed', 'extracting_wellness_table', 'wellness_table_completed', 'extracting_summary', 'all_completed']
                            },
                            {
                              id: 'table1',
                              label: '📊 提取退保价值表',
                              processingStages: ['extracting_table'],
                              completedStages: ['table_completed', 'extracting_wellness_table', 'wellness_table_completed', 'extracting_summary', 'all_completed']
                            },
                            {
                              id: 'table2',
                              label: '💰 提取无忧选表',
                              processingStages: ['extracting_wellness_table'],
                              completedStages: ['wellness_table_completed', 'extracting_summary', 'all_completed']
                            },
                            {
                              id: 'summary',
                              label: '📝 提取计划书概要',
                              processingStages: ['extracting_summary'],
                              completedStages: ['all_completed']
                            }
                          ].map(({ id, label, checkCompleted, checkProcessing, checkEnabled, processingStages, completedStages }) => {
                            const currentStage = saveProgress.processing_stage || '';

                            let isCompleted, isProcessing, isDisabled;

                            // 特殊处理函数
                            if (checkCompleted && checkProcessing) {
                              // OCR任务
                              isCompleted = checkCompleted();
                              isProcessing = checkProcessing();
                              isDisabled = false;
                            } else if (checkCompleted) {
                              // 保存任务
                              isCompleted = checkCompleted(currentStage);
                              isProcessing = processingStages && processingStages.includes(currentStage);
                              isDisabled = checkEnabled ? !checkEnabled() : false;
                            } else {
                              // 其他任务
                              isCompleted = completedStages && completedStages.includes(currentStage);
                              isProcessing = processingStages && processingStages.includes(currentStage);
                              isDisabled = false;
                            }

                            return (
                              <div
                                key={id}
                                className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${
                                  isCompleted ? 'bg-green-100 border border-green-300' :
                                  isProcessing ? 'bg-blue-100 border border-blue-300 shadow-md' :
                                  isDisabled ? 'bg-gray-50 border border-gray-200 opacity-60' :
                                  'bg-white border border-gray-200'
                                }`}
                              >
                                {/* 状态图标 */}
                                {isCompleted ? (
                                  <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                ) : isProcessing ? (
                                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin flex-shrink-0" />
                                ) : (
                                  <div className="h-6 w-6 border-2 border-gray-300 rounded-full flex-shrink-0 bg-white" />
                                )}

                                {/* 任务名称 */}
                                <span className={`text-sm flex-1 ${
                                  isCompleted ? 'text-green-800 font-medium line-through' :
                                  isProcessing ? 'text-blue-900 font-semibold' :
                                  'text-gray-600'
                                }`}>
                                  {label}
                                </span>

                                {/* 状态标签 */}
                                {isCompleted && (
                                  <span className="text-xs px-2 py-0.5 bg-green-500 text-white rounded-full font-medium">
                                    完成
                                  </span>
                                )}
                                {isProcessing && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded-full font-medium animate-pulse">
                                    进行中
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* 当前状态消息 */}
                        {saveProgress.message && (
                          <div className="mt-3 p-2 bg-white rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-800 font-medium text-center">{saveProgress.message}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 任务基本信息 */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mt-3">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">任务ID:</span>
                        <span className="font-mono" title={taskId}>{taskId || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium whitespace-nowrap">文件名:</span>
                        <span>{uploadedFile?.name || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">创建时间:</span>
                        <span>{uploadedFile?.createdAt ? new Date(uploadedFile.createdAt).toLocaleString('zh-CN') : '-'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 md:p-6 min-h-[300px] md:min-h-[400px] max-h-[500px] md:max-h-[600px] overflow-auto bg-gray-50">
                    {fileContent ? (
                      <pre className="text-xs md:text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                        {fileContent}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mb-2" />
                        <p className="text-sm md:text-base">正在加载内容...</p>
                        <p className="text-xs mt-2">selectedFile: {selectedFile ? '✓' : '✗'}</p>
                        <p className="text-xs">fileContent length: {fileContent?.length || 0}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default PlanAnalyzer;
