import { useState, useRef, useEffect } from 'react';
import { useAppNavigate } from '../hooks/useAppNavigate';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const STATUS_LABELS = {
  0: { label: '未找到', color: 'text-gray-500', bg: 'bg-gray-100' },
  1: { label: '训练中...', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  2: { label: '训练成功 ✓', color: 'text-green-700', bg: 'bg-green-100' },
  3: { label: '训练失败', color: 'text-red-700', bg: 'bg-red-100' },
  4: { label: '已激活 ✓', color: 'text-green-700', bg: 'bg-green-100' },
};

function VoiceClone() {
  const onNavigate = useAppNavigate();

  // 配置状态
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);

  // 上传表单
  const [speakerId, setSpeakerId] = useState('');
  const [language, setLanguage] = useState(0);
  const [modelType, setModelType] = useState(1);
  const [audioFile, setAudioFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  // 音色列表
  const [speakers, setSpeakers] = useState([]);
  const [speakersLoading, setSpeakersLoading] = useState(false);
  const [speakersLoaded, setSpeakersLoaded] = useState(false);
  const [speakersTotal, setSpeakersTotal] = useState(0);

  // 合成试用
  const [synthText, setSynthText] = useState('你好，这是我的专属声音，欢迎使用声音复刻功能。');
  const [synthSpeakerId, setSynthSpeakerId] = useState('');
  const [synthModelType, setSynthModelType] = useState(1);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthResult, setSynthResult] = useState(null);

  // 状态查询
  const [queryId, setQueryId] = useState('');
  const [queryModelType, setQueryModelType] = useState(1);
  const [querying, setQuerying] = useState(false);
  const [statusResult, setStatusResult] = useState(null);
  const [autoPolling, setAutoPolling] = useState(false);
  const pollingRef = useRef(null);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/voice-clone/config/`);
        setConfig(res.data);
      } catch (e) {
        console.error('加载配置失败:', e);
      } finally {
        setConfigLoading(false);
      }
    };
    loadConfig();
  }, []);

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const supportedFormats = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/x-aac'];
    const ext = file.name.split('.').pop().toLowerCase();
    const supportedExts = ['wav', 'mp3', 'ogg', 'm4a', 'aac', 'pcm'];
    if (!supportedExts.includes(ext)) {
      alert(`不支持的格式: ${ext}，请上传 wav/mp3/ogg/m4a/aac/pcm 格式的音频`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      return;
    }
    setAudioFile(file);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!speakerId.trim()) {
      alert('请输入声音ID');
      return;
    }
    if (!audioFile) {
      alert('请选择音频文件');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('audio_file', audioFile);
    formData.append('speaker_id', speakerId.trim());
    formData.append('language', language);
    formData.append('model_type', modelType);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/voice-clone/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setUploadResult({ success: true, data: res.data });
      // 上传成功后自动填入查询框和合成框并开始轮询
      setQueryId(speakerId.trim());
      setQueryModelType(modelType);
      setSynthSpeakerId(speakerId.trim());
      setSynthModelType(modelType);
      startAutoPolling(speakerId.trim(), modelType);
    } catch (e) {
      const errMsg = e.response?.data?.error || e.message || '上传失败';
      setUploadResult({ success: false, error: errMsg });
    } finally {
      setUploading(false);
    }
  };

  const startAutoPolling = (id, mt) => {
    setAutoPolling(true);
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      queryStatus(id, mt, true);
    }, 10000);
  };

  const stopAutoPolling = () => {
    setAutoPolling(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const loadSpeakers = async () => {
    setSpeakersLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/voice-clone/speakers/`, { page_size: 50 });
      setSpeakers(res.data.speakers || []);
      setSpeakersTotal(res.data.total_count || 0);
      setSpeakersLoaded(true);
    } catch (e) {
      alert(e.response?.data?.error || '查询失败');
    } finally {
      setSpeakersLoading(false);
    }
  };

  const handleSynthesize = async () => {
    if (!synthSpeakerId.trim()) { alert('请输入声音ID'); return; }
    if (!synthText.trim()) { alert('请输入要合成的文本'); return; }
    setSynthesizing(true);
    setSynthResult(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/voice-clone/synthesize/`, {
        speaker_id: synthSpeakerId.trim(),
        text: synthText.trim(),
        model_type: synthModelType,
      });
      setSynthResult({ success: true, audio_url: res.data.audio_url });
    } catch (e) {
      setSynthResult({ success: false, error: e.response?.data?.error || e.message });
    } finally {
      setSynthesizing(false);
    }
  };

  const queryStatus = async (id, mt, isAutomatic = false) => {
    const targetId = (id || queryId).trim();
    const targetModelType = (mt !== undefined && mt !== null) ? mt : queryModelType;
    if (!targetId) {
      if (!isAutomatic) alert('请输入声音ID');
      return;
    }
    if (!isAutomatic) setQuerying(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/voice-clone/status/`, {
        speaker_id: targetId,
        model_type: targetModelType,
      });
      setStatusResult(res.data);

      // 训练完成或失败，停止轮询
      if (res.data.is_ready || res.data.status === 3) {
        stopAutoPolling();
      }
    } catch (e) {
      const errMsg = e.response?.data?.error || e.message || '查询失败';
      setStatusResult({ success: false, error: errMsg });
      if (isAutomatic) stopAutoPolling();
    } finally {
      if (!isAutomatic) setQuerying(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (configLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* 顶部导航 */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>返回首页</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">声音复刻</h1>
              <p className="text-sm text-gray-500">上传音频样本，训练专属AI音色（字节跳动 MegaTTS）</p>
            </div>
          </div>
        </div>

        {/* 未配置提示 */}
        {config && !config.is_configured && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-amber-800">API 尚未配置</p>
                <p className="text-sm text-amber-700 mt-1">
                  请在服务器的 <code className="bg-amber-100 px-1 rounded">.env</code> 文件中添加以下配置：
                </p>
                <pre className="mt-2 text-xs bg-amber-100 text-amber-900 p-3 rounded-lg">
{`BYTEDANCE_APPID=你的AppID
BYTEDANCE_TOKEN=你的Access Token`}
                </pre>
                <p className="text-xs text-amber-600 mt-1">
                  登录火山引擎控制台获取 AppID 和 Token：
                  <a href="https://console.volcengine.com/speech/app" target="_blank" rel="noreferrer"
                    className="underline ml-1">控制台</a>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 左侧：上传训练 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-700">1</span>
              上传训练音色
            </h2>

            {/* 声音ID */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                声音ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={speakerId}
                onChange={e => setSpeakerId(e.target.value)}
                placeholder="例如：S_xxxxxxxxxxxx（从控制台获取）"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <p className="text-xs text-gray-400 mt-1">在火山引擎控制台声音复刻页面获取专属 Speaker ID</p>
            </div>

            {/* 模型选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">模型类型</label>
              <select
                value={modelType}
                onChange={e => setModelType(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {config?.model_types?.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* 语种 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">语种</label>
              <select
                value={language}
                onChange={e => setLanguage(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {config?.languages?.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* 音频上传 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                音频文件 <span className="text-red-500">*</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                  audioFile
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'
                }`}
              >
                {audioFile ? (
                  <div>
                    <div className="text-violet-600 font-medium text-sm truncate">{audioFile.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{formatFileSize(audioFile.size)}</div>
                    <button
                      onClick={e => { e.stopPropagation(); setAudioFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="mt-2 text-xs text-red-500 hover:text-red-700"
                    >
                      移除文件
                    </button>
                  </div>
                ) : (
                  <div>
                    <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p className="text-sm text-gray-500">点击选择或拖拽音频文件</p>
                    <p className="text-xs text-gray-400 mt-1">支持 wav / mp3 / ogg / m4a / aac / pcm，最大 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".wav,.mp3,.ogg,.m4a,.aac,.pcm,audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                💡 建议：清晰安静的环境录制 10-60 秒普通话朗读音频，效果更佳
              </p>
            </div>

            {/* 上传按钮 */}
            <button
              onClick={handleUpload}
              disabled={uploading || !config?.is_configured}
              className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
                uploading || !config?.is_configured
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-sm hover:shadow-md'
              }`}
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  上传中，请稍候...
                </span>
              ) : '开始训练'}
            </button>

            {/* 上传结果 */}
            {uploadResult && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${
                uploadResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {uploadResult.success ? (
                  <div>
                    <p className="font-medium">✅ 上传成功！</p>
                    <p className="mt-1 text-xs">{uploadResult.data.message}</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">❌ 上传失败</p>
                    <p className="mt-1 text-xs">{uploadResult.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右侧：状态查询 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700">2</span>
              查询训练状态
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">声音ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={queryId}
                  onChange={e => setQueryId(e.target.value)}
                  placeholder="输入声音ID查询状态"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  onClick={() => queryStatus(null, null, false)}
                  disabled={querying || !config?.is_configured}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    querying || !config?.is_configured
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {querying ? '查询中...' : '查询'}
                </button>
              </div>
            </div>

            {/* 自动轮询状态 */}
            {autoPolling && (
              <div className="mb-4 flex items-center gap-2 text-xs text-violet-600 bg-violet-50 px-3 py-2 rounded-lg">
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>正在自动刷新状态（每10秒）</span>
                <button onClick={stopAutoPolling} className="ml-auto text-gray-500 hover:text-gray-700 underline">停止</button>
              </div>
            )}

            {/* 状态结果 */}
            {statusResult && (
              <div className={`p-4 rounded-xl border ${statusResult.success ? 'border-gray-100 bg-gray-50' : 'border-red-100 bg-red-50'}`}>
                {statusResult.success ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">训练状态</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        STATUS_LABELS[statusResult.status]?.bg || 'bg-gray-100'
                      } ${STATUS_LABELS[statusResult.status]?.color || 'text-gray-600'}`}>
                        {STATUS_LABELS[statusResult.status]?.label || '未知'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">声音ID</span>
                        <span className="font-mono text-xs text-gray-800 truncate max-w-[180px]">{statusResult.speaker_id}</span>
                      </div>
                      {statusResult.version && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">版本</span>
                          <span className="text-gray-800">{statusResult.version}</span>
                        </div>
                      )}
                      {statusResult.create_time && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">创建时间</span>
                          <span className="text-gray-800 text-xs">
                            {new Date(statusResult.create_time).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 试听音频 */}
                    {statusResult.demo_audio && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-gray-600 mb-2">试听样本</p>
                        <audio controls className="w-full h-10" src={statusResult.demo_audio}>
                          您的浏览器不支持音频播放
                        </audio>
                        <p className="text-xs text-gray-400 mt-1">⚠️ 试听链接有效期1小时，请及时下载保存</p>
                      </div>
                    )}

                    {statusResult.is_ready && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                        🎉 音色已就绪！可以使用此 Speaker ID 进行语音合成
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-red-700">
                    <p className="font-medium">查询失败</p>
                    <p className="mt-1 text-xs">{statusResult.error}</p>
                  </div>
                )}
              </div>
            )}

            {/* 使用说明 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <h3 className="text-sm font-medium text-gray-700 mb-3">使用说明</h3>
              <ol className="space-y-2 text-xs text-gray-600">
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center shrink-0 font-bold">1</span>
                  <span>登录<a href="https://console.volcengine.com/speech/app" target="_blank" rel="noreferrer" className="text-violet-600 underline">火山引擎控制台</a>，开通声音复刻服务并获取 AppID、Token 和 Speaker ID</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center shrink-0 font-bold">2</span>
                  <span>准备 10-60 秒清晰的朗读音频（支持 wav/mp3/m4a 等格式，最大 10MB）</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center shrink-0 font-bold">3</span>
                  <span>填写 Speaker ID，选择模型和语种，上传音频文件，点击「开始训练」</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center shrink-0 font-bold">4</span>
                  <span>训练通常需要 1-3 分钟，完成后可在「个性化语音制作」中使用复刻音色</span>
                </li>
              </ol>
            </div>

            {/* 错误码说明 */}
            <div className="mt-4">
              <details className="group">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  常见错误码说明
                </summary>
                <div className="mt-2 text-xs text-gray-500 space-y-1 pl-4">
                  <p><span className="font-mono">1101</span> 音频上传失败</p>
                  <p><span className="font-mono">1104</span> 声纹与名人相似度过高，无法复刻</p>
                  <p><span className="font-mono">1106</span> Speaker ID 已被使用，请换一个</p>
                  <p><span className="font-mono">1109</span> 音频内容与文本差异过大（WER检测）</p>
                  <p><span className="font-mono">1111</span> 未检测到说话声（AED检测）</p>
                  <p><span className="font-mono">1112</span> 信噪比过低，录音环境噪声太大</p>
                  <p><span className="font-mono">1123</span> 同一音色已达上传次数上限（10次）</p>
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* 第三区域：合成试用 */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">3</span>
            试用复刻音色合成
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              {/* 声音ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  声音ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={synthSpeakerId}
                  onChange={e => setSynthSpeakerId(e.target.value)}
                  placeholder="训练成功后的 Speaker ID"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              {/* 模型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
                <select
                  value={synthModelType}
                  onChange={e => setSynthModelType(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {config?.model_types?.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              {/* 文本 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  合成文本 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={synthText}
                  onChange={e => setSynthText(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="输入要合成的文本，最多2000字符"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{synthText.length}/2000</p>
              </div>
              <button
                onClick={handleSynthesize}
                disabled={synthesizing || !config?.is_configured}
                className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
                  synthesizing || !config?.is_configured
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-sm hover:shadow-md'
                }`}
              >
                {synthesizing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    合成中...
                  </span>
                ) : '开始合成'}
              </button>
            </div>

            {/* 合成结果 */}
            <div className="flex flex-col justify-center">
              {synthResult ? (
                synthResult.success ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-sm font-medium text-green-800 mb-3">✅ 合成成功，点击播放试听</p>
                    <audio
                      controls
                      className="w-full"
                      src={`${API_BASE_URL}${synthResult.audio_url}`}
                    >
                      您的浏览器不支持音频播放
                    </audio>
                    <a
                      href={`${API_BASE_URL}${synthResult.audio_url}`}
                      download
                      className="mt-3 inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900 underline"
                    >
                      下载音频
                    </a>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <p className="font-medium">❌ 合成失败</p>
                    <p className="mt-1 text-xs">{synthResult.error}</p>
                  </div>
                )
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15.536 8.464a5 5 0 010 7.072M12 9.5v5m0 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm6.364-9.364a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728" />
                  </svg>
                  <p className="text-sm">训练成功后，在此试听复刻效果</p>
                  <p className="text-xs mt-1">需先完成步骤1（上传训练）并等待训练完成</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 第4区域：我的音色列表 */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-700">4</span>
              我的音色列表
              {speakersLoaded && <span className="text-sm font-normal text-gray-400">（共 {speakersTotal} 个）</span>}
            </h2>
            <button
              onClick={loadSpeakers}
              disabled={speakersLoading || !config?.aksk_configured}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                speakersLoading || !config?.aksk_configured
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {speakersLoading ? '查询中...' : '刷新列表'}
            </button>
          </div>

          {!config?.aksk_configured && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 mb-4">
              需配置 <code className="bg-amber-100 px-1 rounded">BYTEDANCE_ACCESS_KEY</code> 和 <code className="bg-amber-100 px-1 rounded">BYTEDANCE_SECRET_KEY</code> 才能查询音色列表
            </div>
          )}

          {speakersLoaded && speakers.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">暂无音色，请先在火山引擎控制台下单购买</div>
          )}

          {speakers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Speaker ID</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">别名</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">状态</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">模型</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">剩余训练次数</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">到期时间</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {speakers.map((s, i) => {
                    const stateConfig = {
                      'Unknown':  { label: '未训练', cls: 'bg-gray-100 text-gray-600' },
                      'Training': { label: '训练中', cls: 'bg-yellow-100 text-yellow-700' },
                      'Success':  { label: '训练成功', cls: 'bg-green-100 text-green-700' },
                      'Active':   { label: '已激活', cls: 'bg-blue-100 text-blue-700' },
                      'Expired':  { label: '已过期', cls: 'bg-red-100 text-red-600' },
                      'Reclaimed':{ label: '已回收', cls: 'bg-gray-100 text-gray-500' },
                    }[s.state] || { label: s.state, cls: 'bg-gray-100 text-gray-600' };

                    const expireDate = s.expire_time
                      ? new Date(s.expire_time).toLocaleDateString('zh-CN')
                      : '-';

                    const modelLabel = s.resource_id === 'seed-icl-2.0' ? 'ICL 2.0' : 'ICL 1.0';

                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-xs text-gray-800">{s.speaker_id}</td>
                        <td className="py-2.5 px-3 text-gray-600">{s.alias || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stateConfig.cls}`}>
                            {stateConfig.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 text-xs">{modelLabel}</td>
                        <td className="py-2.5 px-3 text-center text-gray-600">
                          {s.available_training_times ?? '-'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 text-xs">{expireDate}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-2">
                            {/* 一键填入上传表单 */}
                            <button
                              onClick={() => { setSpeakerId(s.speaker_id); setSynthSpeakerId(s.speaker_id); setQueryId(s.speaker_id); }}
                              className="text-xs text-violet-600 hover:text-violet-800 underline"
                            >
                              填入
                            </button>
                            {/* 有试听音频则显示 */}
                            {s.demo_audio && (
                              <a href={s.demo_audio} target="_blank" rel="noreferrer"
                                className="text-xs text-teal-600 hover:text-teal-800 underline">
                                试听
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!speakersLoaded && (
            <div className="text-center py-6 text-gray-400 text-sm">
              点击「刷新列表」查询账号下所有已购买的音色
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default VoiceClone;
