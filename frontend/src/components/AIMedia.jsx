import React, { useRef, useState } from 'react';
import { useAppNavigate } from '../hooks/useAppNavigate';
import {
  ArrowLeft,
  Target,
  PenTool,
  Send,
  Terminal,
  Database,
  Clapperboard,
  Zap,
  CheckCircle2,
  MousePointer2,
  ChevronRight,
  TrendingUp,
  Hash,
  Activity,
  Video,
  Share2,
} from 'lucide-react';

const AIMedia = () => {
  const onNavigate = useAppNavigate();

  const systemRefs = {
    sensitivity: useRef(null),
    production: useRef(null),
    publishing: useRef(null),
    control: useRef(null),
  };

  const [activeTab, setActiveTab] = useState('sensitivity');

  const scrollToSystem = (id) => {
    setActiveTab(id);
    const element = systemRefs[id].current;
    if (element) {
      const offset = 120;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const modules = [
    { id: 'sensitivity', title: '一、主题推送：热点敏感度', icon: Target, color: 'text-red-400', bg: 'bg-red-500/10' },
    { id: 'production', title: '二、内容制作：AI 创作工厂', icon: PenTool, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { id: 'publishing', title: '三、全网发布：自适应分发', icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'control', title: '四、控制终端', icon: Terminal, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 font-sans antialiased">
      {/* Simple top nav */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
        <button
          onClick={() => onNavigate('ai-hub')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          返回 AI Hub
        </button>
        <div className="text-sm font-bold tracking-widest uppercase text-slate-500 font-mono">AI Media</div>
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          控制台
        </button>
      </div>

      {/* 1. Hero Section */}
      <div className="relative pt-48 pb-24 px-6 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(147,51,234,0.1),transparent_50%)]" />
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <button
            onClick={() => onNavigate('ai-hub')}
            className="inline-flex items-center space-x-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all mb-12 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold tracking-widest uppercase">返回 AI 赋能中心</span>
          </button>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8">
            AI赋能营销：<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">自媒体运营助手</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-400 max-w-4xl mx-auto leading-relaxed font-light">
            通过 "热点敏感度" 捕捉流量密码，利用 "AI 创作工厂" 重塑内容价值。<br />
            专为香港保险团队打造的一站式闭环营销矩阵。
          </p>
        </div>
      </div>

      {/* 2. Sticky Switcher */}
      <div className="sticky top-[57px] z-40 bg-black/90 backdrop-blur-xl border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-24">
            <div className="flex flex-1 justify-center lg:justify-start gap-4 md:gap-10 overflow-x-auto">
              {modules.map((m) => (
                <button
                  key={m.id}
                  onClick={() => scrollToSystem(m.id)}
                  className={`relative flex items-center space-x-3 px-2 py-4 transition-all duration-300 ${
                    activeTab === m.id ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-70'
                  }`}
                >
                  <m.icon className={`w-5 h-5 ${activeTab === m.id ? m.color : 'text-white'}`} />
                  <span className={`text-base font-bold whitespace-nowrap ${activeTab === m.id ? 'text-white' : 'text-slate-400'}`}>
                    {m.title}
                  </span>
                  {activeTab === m.id && (
                    <div className={`absolute bottom-0 left-0 w-full h-1 ${m.color.replace('text', 'bg')}`} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Modules */}
      <div className="max-w-7xl mx-auto px-6 py-32 space-y-64">

        {/* Module 01: Sensitivity System */}
        <section ref={systemRefs.sensitivity} className="scroll-mt-48">
          <div className="grid lg:grid-cols-12 gap-20 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold uppercase tracking-widest mb-8">
                Module 01: Sensitivity System
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-10 italic">一、主题推送系统：热点敏感度</h2>

              <div className="space-y-12">
                <div className="p-8 rounded-[3rem] bg-white/[0.03] border border-white/5">
                  <h3 className="text-2xl font-bold mb-6 flex items-center text-red-400">
                    <TrendingUp className="w-6 h-6 mr-3" /> 什么是热点敏感度？
                  </h3>
                  <div className="grid md:grid-cols-3 gap-8 text-base leading-relaxed text-slate-400">
                    {[
                      { title: '懂垂直领域需求', desc: '洞察 AI 编程、自媒体运营、跨境电商等垂直领域经纪人的核心痛点。' },
                      { title: '懂话题火爆逻辑', desc: '识别具有争议性、实用性、情绪共鸣的话题，确保文案不自嗨。' },
                      { title: '懂平台推送差异', desc: '区分公众号深度文、小红书种草、抖音娱乐等不同平台的调性。' },
                    ].map((item, i) => (
                      <div key={i} className="space-y-3">
                        <div className="font-bold text-white text-lg">{item.title}</div>
                        <p>{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-bold tracking-widest uppercase text-slate-300">推送来源与自定义能力</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { title: '1. 来源：给一个网址', desc: '输入特定 URL，AI 深度捕捉该页面的热点与核心逻辑' },
                      { title: '2. 推荐来源', desc: '系统基于 90+ 顶级行业博客源每日定时推送' },
                      { title: '3. 自定义来源', desc: '自由订阅您关注的国内外门户、论坛或自媒体' },
                    ].map((s, i) => (
                      <div key={i} className="px-6 py-6 rounded-3xl bg-white/5 border border-white/10">
                        <div className="font-bold text-white text-lg mb-3">{s.title}</div>
                        <div className="text-slate-400 text-sm leading-relaxed">{s.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 text-slate-300 text-lg leading-relaxed">
                  <p>
                    如果你没有热点敏感度，AI 只会帮你生产{' '}
                    <span className="text-white font-bold italic underline decoration-red-500">"没人看的内容"</span>。
                  </p>
                  <p className="text-base text-slate-400">
                    我们的系统逐个 review 各平台数据，抓取 90 个顶级博客、公众号、小红书、知乎、YouTube、X、Instagram、Reddit 等全网源，从论坛评论中提取用户关注点，进行深度舆情分析。
                  </p>
                  <div className="p-6 bg-red-500/5 border-l-4 border-red-500 rounded-r-3xl text-base italic leading-relaxed">
                    "我们的工程师拥有多年 SEO 经验，确保第一步抓住热点自然蹭流量。没有意义的文案会造成流量流失。"
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 pt-20 lg:pt-0">
              <div className="bg-[#0A0A0A] rounded-[3rem] border border-white/10 p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Activity className="w-24 h-24 text-red-500" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-10 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-3" /> 流量提升监测系统
                </h4>
                <div className="space-y-8">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-base font-bold mb-4">每日 RSS 精选日报生成器</div>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">并发抓取 90 个源</span>
                        <span className="text-red-400 font-mono font-bold">10路并发/15s超时</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">时间窗口过滤</span>
                        <span className="text-slate-300">24h / 48h / 7d</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">AI 三维评分筛选</span>
                        <span className="text-emerald-400">相关性+质量+时效性</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-sm text-red-400 font-bold mb-3 uppercase tracking-widest">结构化摘要输出</div>
                    <div className="space-y-3 text-sm text-slate-400">
                      <p className="flex items-center"><ChevronRight className="w-4 h-4 mr-2 text-red-500" /> 中文标题翻译</p>
                      <p className="flex items-center"><ChevronRight className="w-4 h-4 mr-2 text-red-500" /> 4-6 句核心内容摘要</p>
                      <p className="flex items-center"><ChevronRight className="w-4 h-4 mr-2 text-red-500" /> AI 生成推荐理由与写作清单</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Module 02: Production System */}
        <section ref={systemRefs.production} className="scroll-mt-48">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-bold uppercase tracking-widest mb-8">
            Module 02: Production System
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-12 italic">二、保险业内容制作系统</h2>

          <div className="grid md:grid-cols-2 gap-10 mb-16">
            <div className="p-10 rounded-[3.5rem] bg-white/[0.03] border border-white/10 group hover:border-orange-500/30 transition-all">
              <div className="flex items-center space-x-5 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                  <Hash className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold italic text-white">文章类：公众号、图文、知乎</h3>
              </div>
              <p className="text-base text-slate-400 leading-relaxed">
                适用于发布公众号文章/图文、知乎文章、小红书图文。在确定主题后，AI 自动匹配写作素材、进行排版优化、自动生成封面图及配图，形成完整文案。
              </p>
            </div>
            <div className="p-10 rounded-[3.5rem] bg-white/[0.03] border border-white/10 group hover:border-blue-500/30 transition-all">
              <div className="flex items-center space-x-5 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Video className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold italic text-white">视频类：视频号、抖音</h3>
              </div>
              <p className="text-base text-slate-400 leading-relaxed">
                核心在于"创意系统"的故事编排，通过内置的数字人类视频、动画视频制作、分镜场景故事制作，将枯燥文案转化为极具表现力的剧情、短剧或漫画动画系列。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
            {[
              { title: '依据敏感度主题推荐', desc: '每一篇内容都紧贴实时流量热点，告别自嗨式创作。' },
              { title: '庞大港险知识库支撑', desc: '基于 3418 条专业 Q&A，确保每一句话都有理有据。' },
              { title: '产品数据分析赋能', desc: '集成专门的精算对比系统，支持各类对比样式的精准输出。' },
              { title: '故事化/剧情化重塑', desc: '将枯燥的说教、广告文案变成故事、剧情、连续剧或动画。' },
              { title: '全自动生成与推送', desc: '实现从内容生成到每日定时推送的全链路自动化。' },
              { title: '全平台爆款改写', desc: '支持网页、公众号、视频、音频的全平台内容一键改写。' },
            ].map((char, i) => (
              <div key={i} className="flex space-x-5 p-6 rounded-3xl bg-white/[0.02] border border-white/5 items-center">
                <CheckCircle2 className="w-6 h-6 text-orange-400 flex-shrink-0" />
                <div>
                  <div className="text-base font-bold mb-1 text-white">{char.title}</div>
                  <div className="text-sm text-slate-500 leading-normal">{char.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-12 md:p-16 rounded-[4rem] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 relative overflow-hidden">
            <h3 className="text-3xl font-black mb-12 flex items-center italic">
              <Database className="w-8 h-8 mr-4 text-orange-400" /> 行业内最大规模内容素材库支撑
            </h3>

            <div className="grid lg:grid-cols-2 gap-20">
              <div className="space-y-12">
                <div className="space-y-6">
                  <div className="text-lg font-black text-orange-400 uppercase tracking-widest border-b border-white/5 pb-3">01. 权威数据与情报源</div>
                  <ul className="space-y-4 text-base text-slate-400 leading-relaxed">
                    <li className="flex items-start"><span className="text-orange-500 mr-3">•</span> 所有保司资料、门户网站新闻、最新优惠政策、宣传文案。</li>
                    <li className="flex items-start"><span className="text-orange-500 mr-3">•</span> 年度总结实现率、突发事件舆情、国内外媒体新闻汇总。</li>
                    <li className="flex items-start"><span className="text-orange-500 mr-3">•</span> 港险原始档案库：不同缴费年限与方案下的精算数据报表。</li>
                  </ul>
                </div>
                <div className="space-y-6">
                  <div className="text-lg font-black text-orange-400 uppercase tracking-widest border-b border-white/5 pb-3">02. 3418 条专业港险知识 Q&A</div>
                  <p className="text-base text-slate-400 leading-relaxed">
                    涵盖重疾保障、理财储蓄、理赔售后、避坑指南、法律风险、实操攻略、条款解读、税务筹划、资产配置、监管政策、常见误区等 15 大维度。
                  </p>
                </div>
              </div>

              <div className="p-10 rounded-[3.5rem] bg-white/[0.03] border border-white/10 relative">
                <div className="text-lg font-black text-blue-400 uppercase tracking-widest mb-8 italic">03. 1000 个港险精选案例</div>
                <div className="grid grid-cols-1 gap-5 text-sm text-slate-400">
                  <div className="flex items-start"><span className="text-blue-500 mr-3 font-bold">/</span> 豪门富商私生子信托与资产隔离方案</div>
                  <div className="flex items-start"><span className="text-blue-500 mr-3 font-bold">/</span> 中产家庭因 ICU 或房贷断供一夜返贫复盘</div>
                  <div className="flex items-start"><span className="text-blue-500 mr-3 font-bold">/</span> 婚姻破裂中夫妻、情人的保单受益权争夺实录</div>
                  <div className="flex items-start"><span className="text-blue-500 mr-3 font-bold">/</span> 企业家破产后保单资产保全的法律逻辑</div>
                  <div className="flex items-start"><span className="text-blue-500 mr-3 font-bold">/</span> CRS 监管与遗产税下的高净值财富合法转移</div>
                </div>
                <div className="mt-10 p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl text-sm italic text-slate-300 leading-relaxed">
                  "所有案例均以真实法律逻辑和保险条款为底层支撑，深度呈现资产隔离、财富传承、婚姻保护、税务筹划与重疾保障五大场景价值。"
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Module 03: Publishing System */}
        <section ref={systemRefs.publishing} className="scroll-mt-48">
          <div className="grid lg:grid-cols-2 gap-20 items-center p-16 rounded-[4rem] bg-white/[0.02] border border-white/5">
            <div>
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold uppercase tracking-widest mb-8">
                Module 03: Distribution System
              </div>
              <h2 className="text-4xl font-black mb-10 italic tracking-tight">三、保险业内容发布系统</h2>
              <div className="space-y-6 text-lg text-slate-400 leading-relaxed mb-10">
                <p className="flex items-center">
                  <CheckCircle2 className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0" />
                  每个平台的样式自适应排版优化功能
                </p>
                <p className="flex items-center">
                  <CheckCircle2 className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0" />
                  确定发布的平台，目前支持公众号、小红书、抖音、知乎自动推送
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {['微信公众号', '小红书', '抖音/视频号', '知乎平台'].map((p) => (
                  <div key={p} className="flex items-center space-x-4 px-6 py-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-base font-bold text-white">{p}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <Share2 className="w-48 h-48 text-blue-500/10 animate-pulse" />
            </div>
          </div>
        </section>

        {/* Module 04: Control System */}
        <section ref={systemRefs.control} className="scroll-mt-48">
          <div className="grid lg:grid-cols-12 gap-20 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-bold uppercase tracking-widest mb-8">
                Module 04: Supreme Control
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-10 tracking-tight italic">四、AI 自媒体控制终端</h2>
              <div className="text-xl text-slate-300 mb-12 font-light leading-relaxed space-y-6">
                <p>把这些东西的控制终端掌握在您的手中</p>
                <p className="text-2xl text-white font-bold italic border-l-4 border-purple-500 pl-6">
                  "你是操盘手，使用控制台去控制这套系统的运转"
                </p>
              </div>

              <div className="bg-[#020202] rounded-[2.5rem] border border-white/5 p-10 font-mono text-sm text-purple-400/80 mb-12 shadow-2xl">
                <div className="flex space-x-3 mb-8 opacity-30">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center"><span className="mr-4 text-slate-700 font-bold">$</span> media-hub --launch --all-modules</div>
                  <div className="text-slate-600 pl-8">&gt;&gt; Executing parallel fetch (90 blog sources)...</div>
                  <div className="text-slate-600 pl-8">&gt;&gt; Analyzing 1000 cases &amp; 3418 Q&As...</div>
                  <div className="text-emerald-500 font-bold mt-4 animate-pulse pl-8">&gt;&gt;&gt; STATUS: FULL CONTROL ACTIVE.</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-center gap-6">
              <button
                onClick={() => onNavigate('ai-social-media-hub')}
                className="w-full px-12 py-6 rounded-3xl bg-purple-600 text-white font-black text-lg hover:bg-purple-500 hover:scale-[1.02] transition-all flex items-center justify-center group shadow-2xl shadow-purple-900/20"
              >
                启动 AI 自媒体运营
                <MousePointer2 className="ml-3 w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
              <button
                onClick={() => onNavigate('wechat-content-creator')}
                className="w-full px-12 py-6 rounded-3xl bg-white/5 border border-white/10 text-white font-black text-lg hover:bg-white/10 transition-all text-center"
              >
                港险文案制作工具
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-24 bg-black">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-4 mb-10 opacity-40">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black text-base">MD</div>
            <span className="font-black text-2xl tracking-tighter uppercase">MacroData AI</span>
          </div>
          <p className="text-slate-600 text-sm tracking-widest uppercase">
            © 2026 MacroData AI Intelligence. 赋能每一位专业的香港保险经纪人。
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AIMedia;
