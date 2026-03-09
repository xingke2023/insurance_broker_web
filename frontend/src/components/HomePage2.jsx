import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../hooks/useAppNavigate';
import Login from './Login';
import Register from './Register';
import { PhoneDemo } from './OpenClawRobot';
import '../i18n';
import {
  Sparkles,
  Folder,
  FileText,
  Image,
  Video,
  Mic,
  ScanLine,
  FileEdit,
  PenTool,
  BookOpen,
  BarChart3,
  Users,
  Bot,
  Megaphone,
  CalendarCheck,
  MessageCircle as MessageCircleIcon,
  Play,
} from 'lucide-react';

function HomePage() {
  const onNavigate = useAppNavigate();
  const { t, i18n } = useTranslation();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // 检测URL参数，如果有login=true则自动显示登录框
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'true') {
      setShowLogin(true);
      // 清除URL参数
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };

  // OpenClaw机器人助手卡片
  const robotCards = [
    { name: '宏利OpenClaw', desc: 'Manulife', color: 'from-green-500 via-emerald-600 to-teal-700', seed: 'Manulife' },
    { name: '永明OpenClaw', desc: 'Sun Life', color: 'from-yellow-500 via-orange-500 to-orange-600', seed: 'SunLife' },
    { name: '友邦OpenClaw', desc: 'AIA', color: 'from-red-500 via-rose-600 to-pink-700', seed: 'AIA' },
    { name: '安盛OpenClaw', desc: 'AXA', color: 'from-blue-500 via-blue-600 to-indigo-700', seed: 'AXA' },
    { name: '保诚OpenClaw', desc: 'Prudential', color: 'from-red-700 via-red-800 to-rose-900', seed: 'Prudential' },
    { name: '富卫OpenClaw', desc: 'FWD', color: 'from-orange-500 via-orange-600 to-red-600', seed: 'FWD' },
    { name: '万通OpenClaw', desc: 'MassMutual', color: 'from-indigo-500 via-purple-600 to-violet-700', seed: 'MassMutual' },
    { name: '中国人寿OpenClaw', desc: 'China Life', color: 'from-red-600 via-red-700 to-red-900', seed: 'ChinaLife' },
  ];

  // 工具分类
  const toolCategories = [
    {
      category: '产品与计划书',
      tools: [
        { name: '港险产品对比', icon: BarChart3, action: () => onNavigate('company-comparison'), color: 'from-purple-500 via-purple-600 to-pink-700' },
        { name: '港险产品目录', icon: Folder, action: () => onNavigate('insurance-products'), color: 'from-cyan-500 via-blue-600 to-indigo-700' },
        { name: '香港各大保险公司名单', icon: Users, action: () => onNavigate('insurance-companies'), color: 'from-emerald-500 via-teal-600 to-cyan-700' },
      ]
    },
    {
      category: '港险顾问与港险案例分析',
      tools: [
        { name: '港险顾问', icon: Sparkles, action: () => isAuthenticated ? onNavigate('customer-cases') : setShowLogin(true), color: 'from-blue-500 via-cyan-600 to-teal-700' },
        { name: '港险案例汇编', icon: BookOpen, action: () => onNavigate('customer-case-library'), color: 'from-indigo-500 via-purple-600 to-pink-700' },
      ]
    },
    {
      category: '团队成员销售赋能工具',
      tools: [
        { name: '计划书概要与数据提取', icon: Folder, action: () => isAuthenticated ? onNavigate('plan-management') : setShowLogin(true), color: 'from-blue-500 via-blue-600 to-indigo-700' },
        { name: '计划书AI对比工具', icon: BarChart3, action: () => isAuthenticated ? onNavigate('plan-comparison') : setShowLogin(true), color: 'from-indigo-500 via-blue-600 to-cyan-700' },
        { name: '计划书制作', icon: FileText, action: () => isAuthenticated ? onNavigate('plan-builder') : setShowLogin(true), color: 'from-purple-500 via-purple-600 to-pink-700' },
        { name: '计划书擦除工具', icon: FileEdit, action: () => isAuthenticated ? onNavigate('pdf-footer-remover2') : setShowLogin(true), color: 'from-purple-500 via-fuchsia-600 to-pink-700' },
        { name: '个人办公助手', icon: Sparkles, action: () => isAuthenticated ? onNavigate('dashboard') : setShowLogin(true), color: 'from-pink-500 via-rose-600 to-rose-700' },
        { name: '港险视频分镜自动化制作工具', icon: Video, action: () => window.open('http://101.36.228.146:8081/', '_blank'), color: 'from-orange-500 via-amber-600 to-yellow-700' },
        { name: '港险文案自动化制作工具', icon: PenTool, action: () => isAuthenticated ? onNavigate('wechat-content-creator') : setShowLogin(true), color: 'from-teal-500 via-emerald-600 to-green-700' },
        { name: '自动推送工具', icon: Mic, action: () => {}, color: 'from-sky-500 via-blue-600 to-indigo-700', disabled: true },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-200 to-slate-100">
      {showDemo && (
        <PhoneDemo
          onClose={() => setShowDemo(false)}
          companyName="OpenClaw机器人助手"
          companySeed="OpenClaw"
        />
      )}
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-800 via-slate-800 to-gray-800 backdrop-blur-2xl shadow-2xl sticky top-0 z-50 border-b border-gray-600/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
            {/* First Row (Mobile) / Left Side (Desktop): Actions */}
            <div className="flex items-center justify-end sm:order-2 gap-1 sm:gap-2 md:gap-3">
              {/* Language Selector */}
              <select
                value={i18n.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-2 py-1 sm:px-3 sm:py-2 bg-gray-800/90 border border-gray-600/50 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-all"
              >
                <option value="zh-TW">繁中</option>
                <option value="zh-CN">简中</option>
                <option value="en">EN</option>
              </select>

              {/* Auth Buttons */}
              {isAuthenticated ? (
                <>
                  <span className="text-xs sm:text-sm text-gray-300 hidden md:inline font-medium">{t('welcome')}{user?.full_name}</span>
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className="px-2 py-1 sm:px-3 sm:py-2 md:px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all text-xs sm:text-sm font-semibold whitespace-nowrap shadow-[0_4px_12px_rgba(37,99,235,0.5)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.6)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {t('dashboard')}
                  </button>
                  <button
                    onClick={() => onNavigate('ai-hub')}
                    className="px-2 py-1 sm:px-3 sm:py-2 md:px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all text-xs sm:text-sm font-semibold whitespace-nowrap shadow-[0_4px_12px_rgba(124,58,237,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    新版主页
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="px-2 py-1 sm:px-3 sm:py-2 md:px-4 text-gray-300 hover:text-blue-400 transition-all text-xs sm:text-sm font-medium whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {t('login')}
                  </button>
                  <button
                    onClick={() => setShowRegister(true)}
                    className="px-2 py-1 sm:px-3 sm:py-2 md:px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all text-xs sm:text-sm font-semibold whitespace-nowrap shadow-[0_4px_12px_rgba(37,99,235,0.5)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.6)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {t('register')}
                  </button>
                </>
              )}
            </div>

            {/* Second Row (Mobile) / Right Side (Desktop): Logo and Title */}
            <div className="flex items-center gap-2 sm:gap-3 sm:order-1">
              <div className="hidden sm:flex w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(59,130,246,0.4)] transition-all">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight drop-shadow-lg">港险团队赋能工具</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-14 sm:py-20 lg:py-24 overflow-hidden flex items-center">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1508009603885-50cf7c579365?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            alt="Hong Kong Night"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/90 via-gray-900/75 to-indigo-950/95"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full space-y-12 lg:space-y-16">

          {/* Row 2: 香港保险经纪人打造个人IP辅助工具 - 通栏 */}
          <div className="w-full space-y-6">

            {/* 通栏标题行 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                  港险经纪人打造个人IP(获客)
                </h2>
                <p className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-400 mt-2">
                  方式一：全程代运营，让您专注销售。<br />方式二：使用我们的AI工具快速制作素材
                </p>
              </div>
              <div className="flex items-center gap-8 flex-shrink-0">
                {[{ num: '3', label: '篇图文/周' }, { num: '3', label: '个视频/周' }, { num: '2', label: '大平台' }].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-pink-400">{s.num}</div>
                    <div className="text-gray-400 text-sm mt-0.5">{s.label}</div>
                  </div>
                ))}
                <a
                  href="https://wa.me/85262645180"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-pink-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                >
                  <MessageCircleIcon className="w-4 h-4" />
                  立即咨询托管服务
                </a>
              </div>
            </div>

            {/* 6 服务项通栏 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-6">
              {[
                { icon: Sparkles,          color: 'from-yellow-400 to-orange-500',  bg: 'bg-yellow-500/20',  title: '热点话题推送(每日推送)', desc: '每周精选港险行业热点与爆款文案主题', href: null },
                { icon: PenTool,           color: 'from-blue-400 to-indigo-600',    bg: 'bg-blue-500/20',    title: '专业内容撰稿(港险故事)', desc: '量身撰写高转化率的保险营销内容', href: null },
                { icon: Video,             color: 'from-purple-400 to-pink-600',    bg: 'bg-purple-500/20',  title: '短视频制作(短剧制作)',   desc: '制作适合公众号与视频号的专业视频', href: 'https://video1.xingke888.com/' },
                { icon: Megaphone,         color: 'from-green-400 to-teal-600',     bg: 'bg-green-500/20',   title: '多平台发布(自动推送)',   desc: '统一发布至微信公众号及视频号', href: null },
                { icon: CalendarCheck,     color: 'from-rose-400 to-red-600',       bg: 'bg-rose-500/20',    title: '每周定期交付(代运营模式)', desc: '每周 3 篇图文 + 3 个视频', href: null },
                { icon: MessageCircleIcon, color: 'from-cyan-400 to-blue-500',      bg: 'bg-cyan-500/20',    title: '专属服务对接(资深精算师)', desc: '一对一专员，随时沟通修改意见', href: null },
              ].map((item, i) => {
                const Icon = item.icon;
                const cardClass = `flex items-center gap-4 ${item.bg} border border-white/10 rounded-2xl p-5 transition-colors hover:brightness-110`;
                const inner = (
                  <>
                    <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center shadow flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-base sm:text-lg">{item.title}</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </>
                );
                return item.href ? (
                  <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" className={cardClass + " cursor-pointer hover:border-white/30"}>
                    {inner}
                  </a>
                ) : (
                  <div key={i} className={cardClass}>
                    {inner}
                  </div>
                );
              })}
            </div>

          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          {/* 香港保险经纪人营销助手 */}
          <div className="w-full space-y-6">

            {/* 第二部分：其他工具 */}
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] mb-3">港险经纪人营销助手（1）</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                {[
                  { label: '港险储蓄产品对比', path: 'company-comparison',      color: 'from-purple-500 to-pink-600' },
                  { label: '港险营销话术', path: 'sales-techniques',          color: 'from-rose-500 to-red-600' },
                  { label: '计划书智能分析', path: null,                      color: 'from-violet-500 to-purple-600' },
                  { label: '香港保险公司名录', path: 'insurance-companies',     color: 'from-blue-500 to-indigo-600' },
                  { label: '香港保险产品目录', path: 'insurance-products',      color: 'from-cyan-500 to-teal-600' },
                  { label: '港险案例汇编',     path: 'customer-case-library',   color: 'from-orange-500 to-amber-600' },
                  { label: '港险销售顾问',     path: 'customer-cases',          color: 'from-green-500 to-emerald-600' },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => btn.path && onNavigate(btn.path)}
                    className={`w-full py-5 sm:py-8 lg:py-10 bg-gradient-to-r ${btn.color} text-white font-bold text-sm sm:text-base lg:text-xl rounded-xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 大标题 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-16 sm:mt-24">
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                港险经纪人营销助手（2）
              </h2>
              <button
                onClick={() => setShowDemo(true)}
                className="flex-shrink-0 self-start sm:self-auto flex items-center gap-2 px-5 py-3 sm:px-7 sm:py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-extrabold text-base sm:text-lg rounded-full shadow-xl shadow-orange-400/50 hover:shadow-orange-400/70 hover:scale-105 active:scale-95 transition-all ring-2 ring-white/30"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
                查看演示
              </button>
            </div>

            {/* 第一部分：OpenClaw机器人助手 */}
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {robotCards.map((robot, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      onNavigate(`/openclaw-robot?name=${encodeURIComponent(robot.name)}&seed=${robot.seed}&desc=${encodeURIComponent(robot.desc)}`);
                    }}
                    className={`group relative overflow-hidden bg-gradient-to-br ${robot.color} rounded-xl px-3 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.25)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-all duration-300 flex flex-row items-center gap-2.5 text-left hover:scale-[1.04] hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10 w-9 h-9 flex-shrink-0 bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-md">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${robot.seed}`} alt={robot.name} className="w-8 h-8 transition-transform group-hover:scale-110" />
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-xs sm:text-sm font-bold text-white leading-tight drop-shadow">{robot.name}</h3>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 社交平台图标 */}
            <div className="flex flex-col items-start gap-4 w-full">
              <p className="text-white/90 text-base sm:text-lg font-semibold text-left">OpenClaw随身助手｜快速接入企业微信、QQ、钉钉、飞书四大国内主流IM</p>
              <div className="grid grid-cols-6 gap-2 w-full sm:max-w-[60%]">
                {[
                  { url: 'https://dscache.tencent-cloud.cn/upload/nodir/qiyeweixin-f7b9aab81db67900c21f1a57391ee68800325c24.png', label: '企业微信' },
                  { url: 'https://dscache.tencent-cloud.cn/upload/nodir/qq-e48d98f03f029ea16f65eec7f37f87186f7f72f7.png', label: 'QQ' },
                  { url: 'https://dscache.tencent-cloud.cn/upload/nodir/feishu-3b144ec445baa06f08d96f36b917d8f975fb4396.png', label: '飞书' },
                  { url: 'https://dscache.tencent-cloud.cn/upload/nodir/dingding-52500deb47823b93cfbfe634614b86286cfdbaec.png', label: '钉钉' },
                  { url: 'https://dscache.tencent-cloud.cn/upload/nodir/telegram-b1a23be4b82c9859b51d93593e46e74f0c521c26.png', label: 'Telegram' },
                  { url: 'https://dscache.tencent-cloud.cn/upload/nodir/WhatsApp-9d83753c6ace06faa46284dd602d38a850b94107.png', label: 'WhatsApp' },
                ].map((icon) => (
                  <div key={icon.label} className="group cursor-pointer">
                    <div className="w-full py-px bg-white border border-white/20 rounded-xl flex items-center justify-center hover:opacity-90 hover:scale-105 transition-all duration-200 shadow-sm">
                      <img src={icon.url} alt={icon.label} className="w-full h-full object-contain" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 主要工具展示 */}
      <section className="py-6 sm:py-8 hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 space-y-5">
          {toolCategories.map((category, catIndex) => (
            <div key={catIndex}>
              {/* 分类标题 */}
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 drop-shadow-sm flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                {category.category}
              </h2>

              {/* 工具网格 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                {category.tools.map((tool, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!tool.disabled) {
                        tool.action();
                      }
                    }}
                    disabled={tool.disabled}
                    className={`group relative overflow-hidden bg-gradient-to-br ${tool.color} rounded-[14px] px-3 py-2.5 sm:px-4 sm:py-3 shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-all duration-300 flex items-center gap-2.5 sm:gap-3 text-left min-h-[60px] sm:min-h-[65px] ${
                      tool.disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 cursor-pointer'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/10 to-transparent transition-opacity ${tool.disabled ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'} duration-300`}></div>
                    <tool.icon className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 text-white flex-shrink-0 transition-transform group-hover:scale-110 drop-shadow-lg" />
                    <h3 className="relative z-10 text-sm sm:text-base font-semibold text-white tracking-tight leading-tight drop-shadow-md">
                      {tool.name}
                    </h3>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-2xl text-gray-700 py-6 sm:py-8 border-t border-white/50 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="col-span-2 sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(37,99,235,0.3)]">
                  <Sparkles className="w-3 h-3 text-white drop-shadow-sm" />
                </div>
                <span className="text-gray-900 text-sm font-bold drop-shadow-sm">{t('footer.title')}</span>
              </div>
              <p className="text-xs text-gray-600 font-medium">{t('footer.desc')}</p>
            </div>

            <div>
              <h5 className="text-gray-900 font-semibold mb-2 text-sm">{t('footer.products')}</h5>
              <ul className="space-y-1 text-xs">
                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">{t('footer.planTool')}</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">{t('footer.writingTool')}</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">{t('footer.dataAnalysis')}</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-gray-900 font-semibold mb-2 text-sm">{t('footer.support')}</h5>
              <ul className="space-y-1 text-xs">
                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">{t('footer.helpCenter')}</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">{t('footer.tutorials')}</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">{t('footer.contact')}</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-gray-900 font-semibold mb-2 text-sm">{t('footer.about')}</h5>
              <ul className="space-y-1 text-xs">
                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">{t('footer.aboutUs')}</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">{t('footer.privacy')}</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors font-medium">{t('footer.terms')}</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-300/50 pt-4 text-center text-xs">
            <p className="text-gray-600 font-medium">{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}

      {/* Register Modal */}
      {showRegister && (
        <Register
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
        />
      )}
    </div>
  );
}

export default HomePage;
