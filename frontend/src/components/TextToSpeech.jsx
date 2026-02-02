import { useState, useEffect } from 'react';
import { useAppNavigate } from '../hooks/useAppNavigate';
import { API_BASE_URL } from '../config';
import {
  SpeakerWaveIcon,
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  ArrowDownTrayIcon,
  UserIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

function TextToSpeech() {
  const onNavigate = useAppNavigate();

  // 标准语音状态
  const [activeTab, setActiveTab] = useState('standard');
  const [text, setText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('zh-CN-XiaoxiaoNeural');
  const [rate, setRate] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState(null);
  const [subtitleUrls, setSubtitleUrls] = useState(null); // 字幕文件URLs

  // 个人语音状态
  const [personalVoices, setPersonalVoices] = useState([]);
  const [selectedPersonalVoice, setSelectedPersonalVoice] = useState('');
  const [personalText, setPersonalText] = useState('');
  const [personalRate, setPersonalRate] = useState(0);
  const [personalPitch, setPersonalPitch] = useState(0);
  const [isPersonalLoading, setIsPersonalLoading] = useState(false);
  const [personalAudioUrl, setPersonalAudioUrl] = useState(null);
  const [isPersonalPlaying, setIsPersonalPlaying] = useState(false);
  const [personalAudioElement, setPersonalAudioElement] = useState(null);

  // 创建个人语音状态
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [voiceName, setVoiceName] = useState('');
  const [voiceSampleFile, setVoiceSampleFile] = useState(null);

  // 录音状态
  const [isRecordingSample, setIsRecordingSample] = useState(false);
  const [sampleRecordingTime, setSampleRecordingTime] = useState(0);
  const [sampleMediaRecorder, setSampleMediaRecorder] = useState(null);
  const [sampleAudioPreview, setSampleAudioPreview] = useState(null);

  // 获取标准语音列表
  useEffect(() => {
    fetchVoices();
  }, []);

  // 获取个人语音列表
  useEffect(() => {
    fetchPersonalVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tts/voices/`);
      const data = await response.json();
      if (data.status === 'success') {
        setVoices(data.voices);
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error);
    }
  };

  const fetchPersonalVoices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/personal-voice/`);
      const data = await response.json();
      if (data.status === 'success') {
        setPersonalVoices(data.voices);
        if (data.voices.length > 0 && !selectedPersonalVoice) {
          setSelectedPersonalVoice(data.voices[0].voice_id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch personal voices:', error);
    }
  };

  // 按语言分组语音
  const groupedVoices = [
    { label: '中文（普通话）', voices: voices.filter(v => v.language === 'zh-CN') },
    { label: '粤语', voices: voices.filter(v => v.language === 'zh-HK') },
    { label: '台湾话', voices: voices.filter(v => v.language === 'zh-TW') },
    { label: '英语（美国）', voices: voices.filter(v => v.language === 'en-US') },
    { label: '英语（英国）', voices: voices.filter(v => v.language === 'en-GB') },
  ].filter(group => group.voices.length > 0);

  // 标准语音合成
  const handleSynthesize = async () => {
    if (!text.trim()) {
      alert('请输入要转换的文本');
      return;
    }

    setIsLoading(true);
    setAudioUrl(null);
    setSubtitleUrls(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tts/synthesize/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: selectedVoice,
          rate: `${rate}%`,
          pitch: `${pitch}%`,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setAudioUrl(`${API_BASE_URL}${data.audio_url}`);
        // 保存字幕URL
        setSubtitleUrls({
          json: data.subtitle_url,
          srt: data.srt_url,
          vtt: data.vtt_url,
        });
        alert('语音合成成功！');
      } else {
        alert(data.message || '语音合成失败');
      }
    } catch (error) {
      console.error('Synthesis error:', error);
      alert('语音合成失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  // 个人语音合成
  const handlePersonalSynthesize = async () => {
    if (!personalText.trim()) {
      alert('请输入要转换的文本');
      return;
    }

    if (!selectedPersonalVoice) {
      alert('请选择个人语音');
      return;
    }

    setIsPersonalLoading(true);
    setPersonalAudioUrl(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/personal-voice/synthesize/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: personalText,
          voice_id: selectedPersonalVoice,
          rate: `${personalRate}%`,
          pitch: `${personalPitch}%`,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setPersonalAudioUrl(`${API_BASE_URL}${data.audio_url}`);
        alert('个人语音合成成功！');
      } else {
        alert(data.message || '个人语音合成失败');
      }
    } catch (error) {
      console.error('Personal synthesis error:', error);
      alert('个人语音合成失败');
    } finally {
      setIsPersonalLoading(false);
    }
  };

  // 创建个人语音
  const handleCreatePersonalVoice = async () => {
    // 验证必填项：只需要语音名称和语音样本
    if (!voiceName) {
      alert('请填写语音名称');
      return;
    }

    if (!voiceSampleFile) {
      alert('请上传语音样本音频文件');
      return;
    }

    setIsCreating(true);

    try {
      const formData = new FormData();
      formData.append('voice_name', voiceName);
      formData.append('voice_sample', voiceSampleFile);

      const response = await fetch(`${API_BASE_URL}/api/personal-voice/create/`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.status === 'success') {
        alert('个人语音创建成功！');
        // 重置表单
        setVoiceName('');
        setVoiceSampleFile(null);
        setSampleAudioPreview(null);
        setShowCreateForm(false);
        fetchPersonalVoices();
      } else {
        alert(data.message || '创建个人语音失败');
      }
    } catch (error) {
      console.error('Create personal voice error:', error);
      alert('创建个人语音失败');
    } finally {
      setIsCreating(false);
    }
  };

  // 录音计时器
  useEffect(() => {
    let interval;
    if (isRecordingSample) {
      interval = setInterval(() => {
        setSampleRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setSampleRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingSample]);

  // 开始录音 - 语音样本
  const startSampleRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 使用浏览器支持的音频格式
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/mp4' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // 使用实际的录制格式
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        const audioFile = new File([audioBlob], 'sample_recording.webm', { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        setVoiceSampleFile(audioFile);
        setSampleAudioPreview(audioUrl);

        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setSampleMediaRecorder(mediaRecorder);
      setIsRecordingSample(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('无法访问麦克风，请确保已授予麦克风权限');
    }
  };

  // 停止录音 - 语音样本
  const stopSampleRecording = () => {
    if (sampleMediaRecorder && sampleMediaRecorder.state !== 'inactive') {
      sampleMediaRecorder.stop();
      setIsRecordingSample(false);
    }
  };

  // 清除录音 - 语音样本
  const clearSampleRecording = () => {
    setVoiceSampleFile(null);
    setSampleAudioPreview(null);
    setSampleRecordingTime(0);
  };

  // 格式化时间显示
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 删除个人语音
  const handleDeletePersonalVoice = async (voiceId) => {
    if (!confirm('确定要删除这个个人语音吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/personal-voice/${voiceId}/delete/`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.status === 'success') {
        alert('个人语音已删除');
        fetchPersonalVoices();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('删除失败');
    }
  };

  // 播放/暂停控制
  const handlePlayPause = (isPersonal) => {
    const url = isPersonal ? personalAudioUrl : audioUrl;
    const audio = isPersonal ? personalAudioElement : audioElement;
    const setAudio = isPersonal ? setPersonalAudioElement : setAudioElement;
    const playing = isPersonal ? isPersonalPlaying : isPlaying;
    const setPlaying = isPersonal ? setIsPersonalPlaying : setIsPlaying;

    if (!url) return;

    if (!audio) {
      const newAudio = new Audio(url);
      newAudio.addEventListener('ended', () => setPlaying(false));
      newAudio.addEventListener('error', () => {
        alert('音频播放失败');
        setPlaying(false);
      });
      setAudio(newAudio);
      newAudio.play();
      setPlaying(true);
    } else {
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        audio.play();
        setPlaying(true);
      }
    }
  };

  const handleDownload = (url) => {
    if (!url) return;

    const link = document.createElement('a');
    link.href = url;
    link.download = `tts_${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('开始下载音频文件');
  };

  // 下载字幕文件
  const handleDownloadSubtitle = (url, format) => {
    if (!url) return;

    const link = document.createElement('a');
    link.href = `${API_BASE_URL}${url}`;
    link.download = `subtitle_${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 清理音频元素
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.remove();
      }
      if (personalAudioElement) {
        personalAudioElement.pause();
        personalAudioElement.remove();
      }
    };
  }, [audioElement, personalAudioElement]);

  return (
    <div className="min-h-screen bg-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI语音合成</h1>
              <p className="text-sm text-gray-600">使用Azure认知服务将文本转换为自然语音</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('standard')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'standard'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <SpeakerWaveIcon className="w-5 h-5" />
                标准语音
              </div>
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'personal'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <UserIcon className="w-5 h-5" />
                个人语音
              </div>
            </button>
          </div>
        </div>

        {/* Standard Voice Tab */}
        {activeTab === 'standard' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                输入文本内容
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="在此输入要转换为语音的文本内容..."
                className="w-full h-40 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                maxLength={5000}
              />
              <div className="text-sm text-gray-500 mt-2">
                {text.length} / 5000 字符
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  选择语音
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                >
                  {groupedVoices.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.voices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    语速: {rate > 0 ? `+${rate}%` : `${rate}%`}
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="10"
                    value={rate}
                    onChange={(e) => setRate(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>慢速</span>
                    <span>正常</span>
                    <span>快速</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    音调: {pitch > 0 ? `+${pitch}%` : `${pitch}%`}
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="10"
                    value={pitch}
                    onChange={(e) => setPitch(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>低沉</span>
                    <span>正常</span>
                    <span>高亢</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSynthesize}
                disabled={isLoading || !text.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    合成中...
                  </>
                ) : (
                  <>
                    <SpeakerWaveIcon className="w-5 h-5" />
                    生成语音
                  </>
                )}
              </button>
            </div>

            {audioUrl && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm p-6 border-2 border-green-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">语音已生成</h3>
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => handlePlayPause(false)}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {isPlaying ? (
                      <>
                        <PauseIcon className="w-5 h-5" />
                        暂停播放
                      </>
                    ) : (
                      <>
                        <PlayIcon className="w-5 h-5" />
                        播放语音
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDownload(audioUrl)}
                    className="flex-1 bg-white border-2 border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    下载音频
                  </button>
                </div>

                {/* 字幕下载区域 */}
                {subtitleUrls && (
                  <div className="border-t-2 border-green-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">下载字幕文件</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleDownloadSubtitle(subtitleUrls.json, 'json')}
                        className="bg-white border-2 border-gray-300 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        JSON
                      </button>
                      <button
                        onClick={() => handleDownloadSubtitle(subtitleUrls.srt, 'srt')}
                        className="bg-white border-2 border-gray-300 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        SRT
                      </button>
                      <button
                        onClick={() => handleDownloadSubtitle(subtitleUrls.vtt, 'vtt')}
                        className="bg-white border-2 border-gray-300 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        VTT
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      字幕包含字符级别时间戳，可用于视频编辑、卡拉OK等场景
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Personal Voice Tab */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            {/* Create Personal Voice Form */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-sm p-6 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <PlusIcon className="w-6 h-6" />
                  创建个人语音
                </h3>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  {showCreateForm ? '隐藏' : '展开'}
                </button>
              </div>

              {showCreateForm && (
                <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                  {/* 语音名称 - 必填 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      语音名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                      placeholder="例如：我的声音"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                    />
                  </div>

                  {/* 语音样本 - 必填 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      语音样本 <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      录制10-60秒的语音样本，可以朗读任何内容。音质越清晰，生成效果越好。
                    </p>

                    {!voiceSampleFile ? (
                      <div className="space-y-2">
                        {/* 录音按钮 */}
                        {!isRecordingSample ? (
                          <button
                            type="button"
                            onClick={startSampleRecording}
                            className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                            开始录音
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopSampleRecording}
                            className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <div className="w-3 h-3 bg-white animate-pulse"></div>
                            停止录音 ({formatTime(sampleRecordingTime)})
                          </button>
                        )}

                        {/* 或上传文件 */}
                        <div className="text-center text-sm text-gray-500">或</div>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => setVoiceSampleFile(e.target.files?.[0] || null)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* 录音预览 */}
                        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-green-700">
                              ✓ 音频已就绪
                            </span>
                            <button
                              type="button"
                              onClick={clearSampleRecording}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              清除
                            </button>
                          </div>
                          {sampleAudioPreview && (
                            <audio controls className="w-full mt-2" src={sampleAudioPreview} />
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        💡 <strong>建议朗读内容：</strong>大家好，我是[你的名字]。今天天气不错，心情也很好。我喜欢在阳光明媚的日子里出去走走，感受大自然的美好。
                      </p>
                    </div>
                  </div>

                  {/* 提交按钮 */}
                  <button
                    onClick={handleCreatePersonalVoice}
                    disabled={isCreating}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        创建中...（可能需要30秒-5分钟）
                      </>
                    ) : (
                      <>
                        <PlusIcon className="w-5 h-5" />
                        创建个人语音
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Personal Voices List */}
            {personalVoices.length > 0 ? (
              <>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">我的个人语音样本</h3>
                  <div className="space-y-2">
                    {personalVoices.map((voice) => (
                      <div
                        key={voice.id}
                        className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                      >
                        <div>
                          <h4 className="font-semibold text-gray-900">{voice.name}</h4>
                          <p className="text-sm text-gray-500">
                            配音员: {voice.voice_talent_name} | 公司: {voice.company_name}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeletePersonalVoice(voice.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Use Personal Voice */}
                <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      选择个人语音样本
                    </label>
                    <select
                      value={selectedPersonalVoice}
                      onChange={(e) => setSelectedPersonalVoice(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                    >
                      {personalVoices.map((voice) => (
                        <option key={voice.voice_id} value={voice.voice_id}>
                          {voice.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      输入想要生成的个人语音文本内容
                    </label>
                    <textarea
                      value={personalText}
                      onChange={(e) => setPersonalText(e.target.value)}
                      placeholder="在此输入要转换为语音的文本内容..."
                      className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
                      maxLength={5000}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        语速: {personalRate > 0 ? `+${personalRate}%` : `${personalRate}%`}
                      </label>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="10"
                        value={personalRate}
                        onChange={(e) => setPersonalRate(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        音调: {personalPitch > 0 ? `+${personalPitch}%` : `${personalPitch}%`}
                      </label>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="10"
                        value={personalPitch}
                        onChange={(e) => setPersonalPitch(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handlePersonalSynthesize}
                    disabled={isPersonalLoading || !personalText.trim() || !selectedPersonalVoice}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isPersonalLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        合成中...
                      </>
                    ) : (
                      <>
                        <SpeakerWaveIcon className="w-5 h-5" />
                        生成个人语音
                      </>
                    )}
                  </button>
                </div>

                {personalAudioUrl && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-sm p-6 border-2 border-purple-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">个人语音已生成</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handlePlayPause(true)}
                        className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                      >
                        {isPersonalPlaying ? (
                          <>
                            <PauseIcon className="w-5 h-5" />
                            暂停播放
                          </>
                        ) : (
                          <>
                            <PlayIcon className="w-5 h-5" />
                            播放语音
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDownload(personalAudioUrl)}
                        className="flex-1 bg-white border-2 border-purple-600 text-purple-600 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        下载音频
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <UserIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">还没有个人语音，请先创建一个</p>
              </div>
            )}
          </div>
        )}

        {/* Usage Guide */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">使用说明</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-700 mb-1">标准语音</h4>
              <ul className="space-y-1 ml-4">
                <li>• 支持20+种中文语音和多种英语语音</li>
                <li>• 可调节语速和音调</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-1">个人语音</h4>
              <ul className="space-y-1 ml-4">
                <li>• 上传5-90秒的清晰语音样本创建个性化语音</li>
                <li>• 需要录制同意声明音频</li>
                <li>• 创建后可用于任意文本的语音合成</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TextToSpeech;
