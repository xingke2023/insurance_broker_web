import { useState, useRef } from 'react';
import { useAppNavigate } from '../hooks/useAppNavigate';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import {
  Sparkles, TrendingUp, Flame, BookMarked, PenLine, ArrowLeft,
  ChevronRight, FileText, Send, CheckCircle2, Loader2, RefreshCw,
  Copy, Eye, Newspaper, Rss, Lightbulb, Settings2, Plus, X, Star,
  Zap, LayoutTemplate, CloudUpload, Clock, Calendar, AlertCircle,
  CheckCheck, Pencil,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: '选择选题', icon: Lightbulb },
  { id: 2, label: '确认主题', icon: Star },
  { id: 3, label: 'AI 写作', icon: PenLine },
  { id: 4, label: '发布草稿', icon: CloudUpload },
];

const TOPIC_TYPES = [
  {
    id: 'trending',
    label: '最新热点文案',
    desc: '结合当前财经热点、香港保险市场动态，生成高传播文章',
    icon: TrendingUp,
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    badge: '热门',
    badgeColor: 'bg-rose-500',
  },
  {
    id: 'viral',
    label: '爆款文案选题',
    desc: '基于历史10万+爆款文章模型，精准匹配最具传播力的港险选题角度',
    icon: Flame,
    gradient: 'from-amber-500 via-orange-500 to-yellow-500',
    badge: '爆款',
    badgeColor: 'bg-amber-500',
  },
  {
    id: 'recommended',
    label: '专业深度选题',
    desc: '面向有金融知识的读者，深度解析港险产品优势、配置逻辑',
    icon: BookMarked,
    gradient: 'from-violet-500 via-purple-500 to-indigo-500',
    badge: '精选',
    badgeColor: 'bg-violet-500',
  },
  {
    id: 'custom',
    label: '自定来源选题',
    desc: '输入自定义方向或关键词，AI 生成专属选题列表',
    icon: PenLine,
    gradient: 'from-teal-500 via-emerald-500 to-cyan-500',
    badge: '自定义',
    badgeColor: 'bg-teal-500',
  },
];

const ARTICLE_STYLES = [
  { id: 'practical', label: '实用干货', desc: '结构清晰，多用列表，重点突出可操作建议' },
  { id: 'story',     label: '故事叙述', desc: '以真实案例为主线，情感代入强，结尾引导转化' },
  { id: 'data',      label: '数据说话', desc: '大量引用具体数字、对比数据，增强说服力' },
  { id: 'qa',        label: '问答科普', desc: '常见问题+专业解答格式，适合知识科普类内容' },
];

export default function WechatContentCreator() {
  const onNavigate = useAppNavigate();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTopicType, setSelectedTopicType] = useState(null);
  const [customHint, setCustomHint] = useState('');

  // 选题列表
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopicInput, setCustomTopicInput] = useState('');

  // 文章写作
  const [articleStyle, setArticleStyle] = useState('practical');
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleLoading, setArticleLoading] = useState(false);
  const [articleStage, setArticleStage] = useState('');
  const [articleError, setArticleError] = useState('');
  const [copiedContent, setCopiedContent] = useState(false);

  // 公众号配置
  const [showOaConfig, setShowOaConfig] = useState(false);
  const [oaAppid, setOaAppid] = useState('');
  const [oaAppsecret, setOaAppsecret] = useState('');
  const [oaConfigSaving, setOaConfigSaving] = useState(false);
  const [oaConfigError, setOaConfigError] = useState('');
  const [oaConfigSuccess, setOaConfigSuccess] = useState('');
  const [hasOaConfig, setHasOaConfig] = useState(false);

  // 发布
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishDone, setPublishDone] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishTime, setPublishTime] = useState('immediate');
  const [scheduleTime, setScheduleTime] = useState('');

  const contentRef = useRef(null);

  const token = () => localStorage.getItem('access_token');

  const selectedTypeObj = TOPIC_TYPES.find(t => t.id === selectedTopicType);

  // ── 获取公众号配置状态 ────────────────────────────────────────────────────
  const fetchOaConfig = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/wechat-content/oa-config/`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setHasOaConfig(data.has_config);
    } catch (e) {}
  };

  // 组件挂载时检查配置
  useState(() => { fetchOaConfig(); }, []);

  // ── 保存公众号配置 ────────────────────────────────────────────────────────
  const handleSaveOaConfig = async () => {
    setOaConfigSaving(true);
    setOaConfigError('');
    setOaConfigSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/wechat-content/oa-config/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ appid: oaAppid, appsecret: oaAppsecret }),
      });
      const data = await res.json();
      if (data.success) {
        setOaConfigSuccess('公众号配置保存成功！');
        setHasOaConfig(true);
        setTimeout(() => setShowOaConfig(false), 1500);
      } else {
        setOaConfigError(data.error || '保存失败');
      }
    } catch (e) {
      setOaConfigError('网络错误，请重试');
    } finally {
      setOaConfigSaving(false);
    }
  };

  // ── 生成20个选题 ──────────────────────────────────────────────────────────
  const handleGenerateTopics = async () => {
    setTopicsLoading(true);
    setTopicsError('');
    setTopics([]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/wechat-content/generate-topics/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_type: selectedTopicType, custom_hint: customHint }),
      });
      const data = await res.json();
      if (data.success) {
        setTopics(data.topics);
      } else {
        setTopicsError(data.error || '生成失败');
      }
    } catch (e) {
      setTopicsError('网络错误，请重试');
    } finally {
      setTopicsLoading(false);
    }
  };

  // ── AI 写作 ───────────────────────────────────────────────────────────────
  const handleGenerateArticle = async () => {
    setArticleLoading(true);
    setArticleError('');
    setArticleContent('');

    const stages = [
      [0,    '正在分析选题角度…'],
      [2000, '正在构建文章结构…'],
      [5000, '正在进行 AI 写作…'],
      [10000,'正在优化文案语气…'],
    ];
    stages.forEach(([delay, msg]) => setTimeout(() => setArticleStage(msg), delay));

    try {
      const res = await fetch(`${API_BASE_URL}/api/wechat-content/generate-article/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic, style: articleStyle }),
      });
      const data = await res.json();
      if (data.success) {
        setArticleContent(data.content);
        setArticleTitle(data.title);
      } else {
        setArticleError(data.error || 'AI写作失败');
      }
    } catch (e) {
      setArticleError('网络错误，请重试');
    } finally {
      setArticleLoading(false);
      setArticleStage('');
    }
  };

  // ── 发布草稿 ──────────────────────────────────────────────────────────────
  const handlePublishDraft = async () => {
    if (!hasOaConfig) {
      setPublishError('请先配置公众号 AppID 和 AppSecret');
      setShowOaConfig(true);
      return;
    }
    setIsPublishing(true);
    setPublishError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/wechat-content/publish-draft/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: articleTitle,
          content: articleContent,
          digest: articleContent.replace(/[#*>\-\n]/g, '').slice(0, 120),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishDone(true);
      } else {
        setPublishError(data.error || '发布失败');
      }
    } catch (e) {
      setPublishError('网络错误，请重试');
    } finally {
      setIsPublishing(false);
    }
  };

  // ── 重置 ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setCurrentStep(1);
    setSelectedTopicType(null);
    setTopics([]);
    setSelectedTopic('');
    setArticleContent('');
    setArticleTitle('');
    setPublishDone(false);
    setPublishError('');
  };

  // ── 步骤进度条 ────────────────────────────────────────────────────────────
  const StepBar = () => (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done = currentStep > step.id;
        const active = currentStep === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                done ? 'bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.5)]'
                : active ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.6)] scale-110'
                : 'bg-white/10 border border-white/20'
              }`}>
                {done ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-white/40'}`} />}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${active ? 'text-white' : done ? 'text-emerald-400' : 'text-white/40'}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mb-4 mx-1 transition-all duration-500 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-white/15'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  // ── 步骤1：选择选题类型 + 生成选题 ───────────────────────────────────────
  const Step1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">AI 生成20个港险选题</h2>
        <p className="text-white/60 text-sm">选择选题方向，AI 自动推送20个高质量公众号选题</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOPIC_TYPES.map(type => {
          const Icon = type.icon;
          const isSelected = selectedTopicType === type.id;
          return (
            <button key={type.id} onClick={() => setSelectedTopicType(type.id)}
              className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 border ${
                isSelected ? 'border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.1)] scale-[1.02]' : 'border-white/10 hover:border-white/25 hover:scale-[1.01]'
              } bg-white/5 backdrop-blur-md`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${type.gradient} opacity-0 transition-opacity duration-300 ${isSelected ? 'opacity-15' : 'group-hover:opacity-8'}`} />
              {isSelected && <div className="absolute top-3 right-3"><CheckCircle2 className="w-5 h-5 text-white" /></div>}
              <div className="relative z-10 flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-base font-bold text-white">{type.label}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-bold ${type.badgeColor}`}>{type.badge}</span>
                  </div>
                  <p className="text-white/55 text-xs leading-relaxed">{type.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedTopicType === 'custom' && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <label className="text-xs text-white/50 mb-2 block flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5" /> 描述你想要的选题方向
          </label>
          <input
            type="text"
            value={customHint}
            onChange={e => setCustomHint(e.target.value)}
            placeholder="例：针对高净值客户的资产传承话题、子女教育金规划等"
            className="w-full bg-black/30 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
      )}

      {topicsError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {topicsError}
        </div>
      )}

      {topics.length > 0 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" /> AI 已生成 {topics.length} 个选题
            </p>
            <button onClick={handleGenerateTopics} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> 重新生成
            </button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {topics.map((topic, idx) => (
              <button key={idx} onClick={() => { setSelectedTopic(topic); setCurrentStep(2); }}
                className="w-full text-left px-4 py-3 rounded-xl border border-white/10 bg-white/3 hover:border-indigo-500/50 hover:bg-indigo-600/10 transition-all text-sm text-white/80 hover:text-white flex items-start gap-3 group"
              >
                <span className="text-white/30 text-xs font-mono mt-0.5 flex-shrink-0 group-hover:text-indigo-400">{String(idx + 1).padStart(2, '0')}</span>
                <span>{topic}</span>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-indigo-400 flex-shrink-0 ml-auto mt-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        disabled={!selectedTopicType || topicsLoading || (selectedTopicType === 'custom' && !customHint.trim())}
        onClick={handleGenerateTopics}
        className="w-full py-3.5 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-[0_8px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_12px_28px_rgba(99,102,241,0.45)] hover:scale-[1.01]"
      >
        {topicsLoading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> AI 正在生成20个选题…</>
        ) : (
          <><Sparkles className="w-5 h-5" /> {topics.length > 0 ? '重新生成20个选题' : '生成20个选题'}</>
        )}
      </button>
    </div>
  );

  // ── 步骤2：确认选题 + 选择写作风格 ───────────────────────────────────────
  const Step2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">确认选题 & 写作风格</h2>
        <p className="text-white/60 text-sm">确认要创作的选题，并选择文章风格</p>
      </div>

      {/* 已选选题 */}
      <div className="rounded-2xl bg-indigo-600/15 border border-indigo-500/30 p-5">
        <p className="text-xs text-indigo-400 font-medium mb-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> 已选选题
        </p>
        <div className="flex items-start gap-3">
          <p className="text-white font-semibold text-base flex-1 leading-relaxed">{selectedTopic}</p>
          <button onClick={() => setCurrentStep(1)} className="text-xs text-white/40 hover:text-white flex items-center gap-1 flex-shrink-0">
            <Pencil className="w-3 h-3" /> 更换
          </button>
        </div>
        {/* 可编辑标题 */}
        <div className="mt-3">
          <label className="text-xs text-white/40 mb-1 block">自定义修改标题（可选）</label>
          <input
            type="text"
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
            className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
          />
        </div>
      </div>

      {/* 写作风格 */}
      <div>
        <p className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-purple-400" /> 选择写作风格
        </p>
        <div className="grid grid-cols-2 gap-3">
          {ARTICLE_STYLES.map(style => (
            <button key={style.id} onClick={() => setArticleStyle(style.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                articleStyle === style.id
                  ? 'border-purple-500/60 bg-purple-600/20'
                  : 'border-white/10 bg-white/5 hover:border-white/25'
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${articleStyle === style.id ? 'text-white' : 'text-white/70'}`}>{style.label}</p>
              <p className="text-xs text-white/40 leading-relaxed">{style.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => setCurrentStep(1)}
          className="px-6 py-3 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all text-sm font-medium flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> 上一步
        </button>
        <button
          disabled={!selectedTopic.trim()}
          onClick={() => { setCurrentStep(3); handleGenerateArticle(); }}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-[0_6px_16px_rgba(99,102,241,0.35)] hover:scale-[1.01]"
        >
          <Zap className="w-4 h-4" /> 开始 AI 写作
        </button>
      </div>
    </div>
  );

  // ── 步骤3：AI 写作结果 ────────────────────────────────────────────────────
  const Step3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">AI 自动写作</h2>
        <p className="text-white/60 text-sm">基于选题，AI 正在生成专业的港险公众号文章</p>
      </div>

      {articleLoading ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-10 flex flex-col items-center justify-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-base mb-1">{articleStage}</p>
            <p className="text-white/40 text-xs">AI 写作引擎运转中，请稍候约15秒…</p>
          </div>
          <div className="w-full max-w-xs bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse rounded-full w-3/4" />
          </div>
        </div>
      ) : articleError ? (
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-red-300 text-sm">{articleError}</p>
          <button onClick={handleGenerateArticle}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> 重新生成
          </button>
        </div>
      ) : articleContent ? (
        <div className="space-y-4">
          {/* 标题 */}
          <div>
            <label className="text-xs text-white/50 mb-1.5 block font-medium">文章标题</label>
            <input
              type="text"
              value={articleTitle}
              onChange={e => setArticleTitle(e.target.value)}
              className="w-full bg-black/30 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/60 font-medium"
            />
          </div>

          {/* 内容 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-white/50 font-medium">
                文章正文（{articleContent.length} 字）
              </label>
              <button
                onClick={() => { navigator.clipboard.writeText(articleContent); setCopiedContent(true); setTimeout(() => setCopiedContent(false), 2000); }}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {copiedContent ? <><CheckCheck className="w-3.5 h-3.5" /> 已复制</> : <><Copy className="w-3.5 h-3.5" /> 复制全文</>}
              </button>
            </div>
            <textarea
              ref={contentRef}
              value={articleContent}
              onChange={e => setArticleContent(e.target.value)}
              rows={16}
              className="w-full bg-black/30 border border-white/15 rounded-xl px-4 py-3 text-sm text-white/80 font-mono leading-relaxed focus:outline-none focus:border-indigo-500/60 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setArticleContent(''); handleGenerateArticle(); }}
              className="px-5 py-3 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all text-sm font-medium flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> 重新生成
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-[0_6px_16px_rgba(99,102,241,0.35)] hover:scale-[1.01]"
            >
              <CloudUpload className="w-4 h-4" /> 下一步：发布草稿
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  // ── 步骤4：发布草稿 ───────────────────────────────────────────────────────
  const Step4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">发布到公众号草稿箱</h2>
        <p className="text-white/60 text-sm">一键将内容同步至微信公众号草稿箱，随时审核发布</p>
      </div>

      {publishDone ? (
        <div className="rounded-2xl bg-emerald-600/15 border border-emerald-500/30 p-10 flex flex-col items-center gap-5 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white mb-1">发布成功！</p>
            <p className="text-white/60 text-sm">文章已成功推送至公众号草稿箱</p>
            <p className="text-white/40 text-xs mt-1">请前往微信公众号后台审核后发布</p>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/15 transition-all"
          >
            创作下一篇
          </button>
        </div>
      ) : (
        <>
          {/* 公众号配置状态 */}
          <div className={`rounded-2xl p-5 border ${hasOaConfig ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${hasOaConfig ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <div>
                  <p className={`text-sm font-semibold ${hasOaConfig ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {hasOaConfig ? '公众号已连接' : '未配置公众号'}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {hasOaConfig ? '可以发布到草稿箱' : '需要配置公众号 AppID 和 AppSecret 才能发布'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOaConfig(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 flex-shrink-0"
              >
                <Settings2 className="w-3.5 h-3.5" /> {hasOaConfig ? '修改配置' : '立即配置'}
              </button>
            </div>
          </div>

          {/* 文章摘要 */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> 内容摘要
            </h3>
            <div className="space-y-2.5">
              {[
                { label: '文章标题', value: articleTitle },
                { label: '字数统计', value: `${articleContent.length} 字` },
                { label: '写作风格', value: ARTICLE_STYLES.find(s => s.id === articleStyle)?.label || '' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-white/40 text-xs w-16 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-white/80 text-sm leading-relaxed">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {publishError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {publishError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-3 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all text-sm font-medium flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> 上一步
            </button>
            <button
              disabled={isPublishing}
              onClick={handlePublishDraft}
              className="flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-[0_6px_16px_rgba(16,185,129,0.35)] hover:scale-[1.01]"
            >
              {isPublishing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 正在推送至草稿箱…</>
              ) : (
                <><Send className="w-4 h-4" /> 确认发布到草稿箱</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1 />;
      case 2: return <Step2 />;
      case 3: return <Step3 />;
      case 4: return <Step4 />;
      default: return <Step1 />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d1a]">
      {/* 背景光晕 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-600/12 blur-[100px]" />
        <div className="absolute bottom-[0%] left-[30%] w-[400px] h-[400px] rounded-full bg-teal-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/8 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('/dashboard')}
                className="w-9 h-9 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-[0_4px_12px_rgba(20,184,166,0.4)]">
                  <PenLine className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white leading-tight">自动选题推送及写作</h1>
                  <p className="text-[10px] text-white/40">AI生成选题 · 自动写作 · 一键发布草稿箱</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${hasOaConfig ? 'bg-emerald-500/15 border-emerald-500/25' : 'bg-white/5 border-white/10'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${hasOaConfig ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
                <span className={`text-xs font-medium ${hasOaConfig ? 'text-emerald-400' : 'text-white/40'}`}>
                  {hasOaConfig ? '公众号已连接' : '未配置公众号'}
                </span>
              </div>
              <button
                onClick={() => setShowOaConfig(true)}
                className="w-9 h-9 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all"
                title="公众号设置"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* 功能说明卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {[
              { icon: Sparkles, color: 'from-indigo-500 to-purple-500', title: '①  AI 生成20个选题', desc: '一键推送20个高质量港险选题，覆盖多种内容角度' },
              { icon: PenLine,  color: 'from-teal-500 to-emerald-500',  title: '②  AI 自动写作',     desc: '选定选题后，AI 生成1200-1800字专业公众号文章' },
              { icon: Send,     color: 'from-green-500 to-teal-500',    title: '③  一键发布草稿',    desc: '自动推送到你的微信公众号草稿箱，审核后即可发布' },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl bg-white/[0.03] border border-white/8 p-4 flex gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-0.5">{item.title}</h3>
                    <p className="text-xs text-white/45 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 主工作区 */}
          <div className="rounded-3xl bg-white/[0.03] border border-white/8 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-500" />
            <div className="p-6 sm:p-8">
              <StepBar />
              {renderStep()}
            </div>
          </div>
        </main>
      </div>

      {/* 公众号配置弹窗 */}
      {showOaConfig && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowOaConfig(false)}>
          <div className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Rss className="w-4 h-4 text-green-400" /> 绑定微信公众号
              </h3>
              <button onClick={() => setShowOaConfig(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-xs text-blue-300 space-y-1.5">
                <p className="font-semibold">获取方式：</p>
                <p>1. 登录 <span className="text-blue-200">mp.weixin.qq.com</span> 公众号后台</p>
                <p>2. 进入「设置与开发」→「基本配置」</p>
                <p>3. 复制 AppID 和 AppSecret</p>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1.5 block">公众号 AppID</label>
                <input
                  type="text"
                  value={oaAppid}
                  onChange={e => setOaAppid(e.target.value)}
                  placeholder="wx1234567890abcdef"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1.5 block">公众号 AppSecret</label>
                <input
                  type="password"
                  value={oaAppsecret}
                  onChange={e => setOaAppsecret(e.target.value)}
                  placeholder="32位密钥"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              {oaConfigError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {oaConfigError}
                </div>
              )}
              {oaConfigSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {oaConfigSuccess}
                </div>
              )}

              <button
                disabled={oaConfigSaving || !oaAppid || !oaAppsecret}
                onClick={handleSaveOaConfig}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {oaConfigSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> 验证中…</> : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
