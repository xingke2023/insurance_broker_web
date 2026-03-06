import { useState, useRef, useEffect } from 'react';
import { useAppNavigate } from '../hooks/useAppNavigate';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// 流程状态
const STEP = {
  IDLE: 'idle',
  UPLOADING_IMAGE: 'uploading_image',
  UPLOADING_AUDIO: 'uploading_audio',
  CHECKING_SUBJECT: 'checking_subject',
  SUBJECT_NOT_FOUND: 'subject_not_found',
  SUBMITTING_VIDEO: 'submitting_video',
  POLLING: 'polling',
  DONE: 'done',
  ERROR: 'error',
};

const STEP_LABELS = {
  [STEP.IDLE]: '',
  [STEP.UPLOADING_IMAGE]: '正在上传图片...',
  [STEP.UPLOADING_AUDIO]: '正在上传音频...',
  [STEP.CHECKING_SUBJECT]: '正在检测图片中的人物...',
  [STEP.SUBJECT_NOT_FOUND]: '未检测到人物',
  [STEP.SUBMITTING_VIDEO]: '正在提交视频生成任务...',
  [STEP.POLLING]: '视频生成中，请稍候...',
  [STEP.DONE]: '视频生成完成！',
  [STEP.ERROR]: '生成失败',
};

function getAuthToken() {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || '';
}

async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

export default function DigitalHuman() {
  const onNavigate = useAppNavigate();

  // 配置
  const [isConfigured, setIsConfigured] = useState(null);

  // 上传状态
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState('');

  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');

  // 流程
  const [step, setStep] = useState(STEP.IDLE);
  const [taskId, setTaskId] = useState('');
  const [pollStatus, setPollStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const pollTimerRef = useRef(null);

  // 加载配置
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/digital-human/config/`)
      .then(res => setIsConfigured(res.data.is_configured))
      .catch(() => setIsConfigured(false));
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // 选择图片
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.rsplit ? file.name.rsplit('.', 1)[1]?.toLowerCase() : file.name.split('.').pop().toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowed.includes(ext)) {
      alert(`不支持的图片格式: ${ext}，请上传 jpg/png/webp`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('图片不能超过 10MB');
      return;
    }
    setImageFile(file);
    setImageUrl('');
    setVideoUrl('');
    setErrorMsg('');
    setStep(STEP.IDLE);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // 选择音频
  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['mp3', 'wav', 'm4a', 'aac'];
    if (!allowed.includes(ext)) {
      alert(`不支持的音频格式: ${ext}，请上传 mp3/wav/m4a/aac`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('音频不能超过 50MB');
      return;
    }
    setAudioFile(file);
    setAudioUrl('');
    setVideoUrl('');
    setErrorMsg('');
    setStep(STEP.IDLE);
  };

  // 上传文件到服务器
  const uploadFile = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await authFetch(`${API_BASE_URL}/api/digital-human/upload-media/`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || '上传失败');
    return data.url;
  };

  // 开始生成
  const handleGenerate = async () => {
    if (!imageFile) {
      alert('请先上传人物图片');
      return;
    }
    if (!audioFile) {
      alert('请先上传音频文件');
      return;
    }

    setVideoUrl('');
    setErrorMsg('');
    setTaskId('');
    setPollStatus('');
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    try {
      // 1. 上传图片
      setStep(STEP.UPLOADING_IMAGE);
      const imgUrl = await uploadFile(imageFile, 'image');
      setImageUrl(imgUrl);

      // 2. 上传音频
      setStep(STEP.UPLOADING_AUDIO);
      const audUrl = await uploadFile(audioFile, 'audio');
      setAudioUrl(audUrl);

      // 3. 主体检测
      setStep(STEP.CHECKING_SUBJECT);
      const checkRes = await authFetch(`${API_BASE_URL}/api/digital-human/check-subject/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imgUrl }),
      });
      const checkData = await checkRes.json();
      if (!checkData.success) {
        setStep(STEP.ERROR);
        setErrorMsg(checkData.error || '主体检测失败');
        return;
      }
      if (!checkData.has_subject) {
        setStep(STEP.SUBJECT_NOT_FOUND);
        setErrorMsg(checkData.message || '图片中未检测到人物，请重新上传');
        return;
      }

      // 4. 提交视频生成
      setStep(STEP.SUBMITTING_VIDEO);
      const submitRes = await authFetch(`${API_BASE_URL}/api/digital-human/submit-video/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imgUrl, audio_url: audUrl }),
      });
      const submitData = await submitRes.json();
      if (!submitData.success) {
        setStep(STEP.ERROR);
        setErrorMsg(submitData.error || '提交视频生成失败');
        return;
      }

      const tid = submitData.task_id;
      setTaskId(tid);
      setStep(STEP.POLLING);
      setPollStatus('排队等待中');

      // 5. 轮询状态
      startPolling(tid);

    } catch (e) {
      setStep(STEP.ERROR);
      setErrorMsg(e.message || '生成过程出错');
    }
  };

  const startPolling = (tid) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    const poll = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/digital-human/video-status/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: tid }),
        });
        const data = await res.json();
        if (!data.success) {
          clearInterval(pollTimerRef.current);
          setStep(STEP.ERROR);
          setErrorMsg(data.error || '查询状态失败');
          return;
        }

        setPollStatus(data.status_label || data.status);

        if (data.is_done) {
          clearInterval(pollTimerRef.current);
          if (data.is_error) {
            setStep(STEP.ERROR);
            setErrorMsg(data.message || '视频生成失败');
          } else {
            setVideoUrl(data.video_url || '');
            setStep(STEP.DONE);
          }
        }
      } catch (e) {
        // 忽略网络抖动，继续轮询
        console.error('轮询错误:', e);
      }
    };

    // 立即执行一次，然后每3秒一次
    poll();
    pollTimerRef.current = setInterval(poll, 3000);

    // 30分钟后超时
    setTimeout(() => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        setStep(prev => prev === STEP.POLLING ? STEP.ERROR : prev);
        setErrorMsg(prev => prev || '视频生成超时，请重试');
      }
    }, 30 * 60 * 1000);
  };

  const handleReset = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setStep(STEP.IDLE);
    setImageFile(null);
    setImagePreview(null);
    setImageUrl('');
    setAudioFile(null);
    setAudioUrl('');
    setTaskId('');
    setPollStatus('');
    setVideoUrl('');
    setErrorMsg('');
  };

  const isProcessing = [
    STEP.UPLOADING_IMAGE, STEP.UPLOADING_AUDIO,
    STEP.CHECKING_SUBJECT, STEP.SUBMITTING_VIDEO, STEP.POLLING,
  ].includes(step);

  const canGenerate = imageFile && audioFile && !isProcessing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900">
      {/* 顶部导航 */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            返回仪表盘
          </button>
          <span className="text-white/30">/</span>
          <span className="text-white font-medium">数字人(快速模式)</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">数字人(快速模式)</h1>
          <p className="text-white/60 text-sm">上传人物图片 + 音频，一键生成数字人说话视频</p>
          {isConfigured === false && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              ⚠️ AKSK 未配置，请在 .env 中设置 BYTEDANCE_ACCESS_KEY / BYTEDANCE_SECRET_KEY
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左列：上传 */}
          <div className="space-y-5">
            {/* 图片上传 */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
              <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-bold">1</span>
                上传人物图片
              </h2>
              <p className="text-white/50 text-xs mb-3">支持 JPG / PNG / WebP，最大 10MB，需包含清晰人物正脸</p>

              <div
                onClick={() => !isProcessing && imageInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-400 hover:bg-white/5'}
                  ${imageFile ? 'border-purple-400' : 'border-white/20'}`}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="预览"
                    className="max-h-48 mx-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="py-6">
                    <div className="text-4xl mb-2">🖼️</div>
                    <p className="text-white/60 text-sm">点击选择图片</p>
                  </div>
                )}
              </div>
              {imageFile && (
                <p className="mt-2 text-purple-300 text-xs truncate">
                  ✓ {imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)
                </p>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* 音频上传 */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
              <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-bold">2</span>
                上传音频文件
              </h2>
              <p className="text-white/50 text-xs mb-3">支持 MP3 / WAV / M4A / AAC，最大 50MB</p>

              <div
                onClick={() => !isProcessing && audioInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-400 hover:bg-white/5'}
                  ${audioFile ? 'border-indigo-400' : 'border-white/20'}`}
              >
                <div className="text-4xl mb-2">{audioFile ? '🎵' : '🎤'}</div>
                <p className="text-white/60 text-sm">
                  {audioFile ? audioFile.name : '点击选择音频'}
                </p>
                {audioFile && (
                  <p className="text-indigo-300 text-xs mt-1">
                    {(audioFile.size / 1024).toFixed(0)} KB
                  </p>
                )}
              </div>
              <input
                ref={audioInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.aac"
                className="hidden"
                onChange={handleAudioChange}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all
                  ${canGenerate
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg hover:shadow-purple-500/30'
                    : 'bg-white/10 opacity-50 cursor-not-allowed'}`}
              >
                {isProcessing ? '处理中...' : '开始生成数字人视频'}
              </button>
              {(step !== STEP.IDLE) && (
                <button
                  onClick={handleReset}
                  disabled={isProcessing}
                  className="px-4 py-3 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all text-sm"
                >
                  重置
                </button>
              )}
            </div>
          </div>

          {/* 右列：进度与结果 */}
          <div className="space-y-5">
            {/* 进度状态 */}
            {step !== STEP.IDLE && (
              <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
                <h2 className="text-white font-semibold mb-4">处理进度</h2>
                <div className="space-y-3">
                  {[
                    { key: STEP.UPLOADING_IMAGE, label: '上传图片' },
                    { key: STEP.UPLOADING_AUDIO, label: '上传音频' },
                    { key: STEP.CHECKING_SUBJECT, label: '人物检测' },
                    { key: STEP.SUBMITTING_VIDEO, label: '提交任务' },
                    { key: STEP.POLLING, label: '视频生成' },
                    { key: STEP.DONE, label: '生成完成' },
                  ].map(({ key, label }) => {
                    const steps = [STEP.UPLOADING_IMAGE, STEP.UPLOADING_AUDIO, STEP.CHECKING_SUBJECT, STEP.SUBMITTING_VIDEO, STEP.POLLING, STEP.DONE];
                    const currentIdx = steps.indexOf(step);
                    const thisIdx = steps.indexOf(key);
                    const isDone = step === STEP.DONE ? thisIdx <= steps.indexOf(STEP.DONE) : thisIdx < currentIdx;
                    const isCurrent = thisIdx === currentIdx && step !== STEP.DONE && step !== STEP.ERROR && step !== STEP.SUBJECT_NOT_FOUND;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isDone ? 'bg-green-500 text-white' :
                          isCurrent ? 'bg-purple-500 text-white animate-pulse' :
                          'bg-white/10 text-white/30'
                        }`}>
                          {isDone ? '✓' : thisIdx + 1}
                        </div>
                        <span className={`text-sm ${isDone ? 'text-green-300' : isCurrent ? 'text-white' : 'text-white/30'}`}>
                          {label}
                          {isCurrent && key === STEP.POLLING && pollStatus && ` — ${pollStatus}`}
                        </span>
                        {isCurrent && (
                          <div className="ml-auto">
                            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 错误提示 */}
                {(step === STEP.ERROR || step === STEP.SUBJECT_NOT_FOUND) && (
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-300 text-sm">
                      {step === STEP.SUBJECT_NOT_FOUND ? '⚠️ ' : '❌ '}
                      {errorMsg}
                    </p>
                  </div>
                )}

                {/* task_id 显示 */}
                {taskId && (
                  <div className="mt-3 p-2 bg-white/5 rounded-lg">
                    <p className="text-white/40 text-xs">任务ID: <span className="text-white/60 font-mono">{taskId}</span></p>
                  </div>
                )}
              </div>
            )}

            {/* 视频结果 */}
            {step === STEP.DONE && videoUrl && (
              <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
                <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span>🎬</span> 生成结果
                </h2>
                <div className="rounded-xl overflow-hidden bg-black mb-3">
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    className="w-full max-h-80"
                  >
                    您的浏览器不支持视频播放
                  </video>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={videoUrl}
                    download="digital_human_video.mp4"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 text-center bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    ⬇️ 下载视频
                  </a>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 border border-white/20 text-white/70 hover:text-white rounded-lg text-sm transition-all"
                  >
                    重新生成
                  </button>
                </div>
                <p className="mt-2 text-yellow-400/70 text-xs text-center">
                  ⏰ 视频链接有效期约1小时，请及时下载保存
                </p>
              </div>
            )}

            {/* 完成但没有 video_url */}
            {step === STEP.DONE && !videoUrl && (
              <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
                <p className="text-yellow-300 text-sm">
                  ✅ 任务完成，但未返回视频链接。请联系技术支持或稍后重试。
                </p>
              </div>
            )}

            {/* 使用说明 */}
            {step === STEP.IDLE && (
              <div className="bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10">
                <h3 className="text-white/80 font-medium mb-3 text-sm">📋 使用说明</h3>
                <ul className="space-y-2 text-white/50 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>上传包含清晰人物正脸的图片（JPG/PNG/WebP）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>上传您想要数字人说的音频内容（MP3/WAV/M4A）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>系统会自动检测图片中的人物，并生成口型同步视频</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">•</span>
                    <span>生成视频链接有效期约1小时，请及时下载</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>请勿上传违规内容，严禁仿冒他人形象</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
