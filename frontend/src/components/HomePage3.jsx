import React from 'react';
import { useAppNavigate } from '../hooks/useAppNavigate';
import {
  Sparkles,
  Briefcase,
  Megaphone,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

const AIHub = () => {
  const onNavigate = useAppNavigate();

  const categories = [
    {
      title: 'AI赋能办公：流程自动化',
      subtitle: '全面提升团队日常办公与客户服务效率',
      description: '集成计划书自动生成、保司数据提取、产品智能对比及AI财务顾问，让团队告别低效手动操作。',
      icon: Briefcase,
      path: '/ai-office',
      color: 'blue',
      bgClass: 'bg-blue-500/10',
      borderClass: 'border-blue-500/20',
      textClass: 'text-blue-400',
      glowClass: 'bg-blue-500/10',
      glowHoverClass: 'group-hover:bg-blue-500/20',
      features: ['计划书自动分析系统', 'AI财务顾问咨询', '多保司产品对比', 'PDF工具箱 Pro'],
    },
    {
      title: 'AI赋能营销：自媒体运营',
      subtitle: '港险经纪人专属的个人品牌获客引擎',
      description: '基于全港最大的保险内容库，实现热点敏感度监控、全自动内容制作及多平台一键发布。',
      icon: Megaphone,
      path: '/ai-media',
      color: 'purple',
      bgClass: 'bg-purple-500/10',
      borderClass: 'border-purple-500/20',
      textClass: 'text-purple-400',
      glowClass: 'bg-purple-500/10',
      glowHoverClass: 'group-hover:bg-purple-500/20',
      features: ['热点敏感度推送', '保险业内容制作', '全平台自动发布', '港险文案自动化制作'],
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30">
      {/* Simple top nav */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          返回主页
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-widest uppercase text-slate-500 font-mono">
          MacroData AI
        </div>
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          控制台
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative pt-40 pb-16 px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-blue-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-[30%] left-[10%] w-[300px] h-[300px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            <span>AI 驱动的香港保险经纪人未来</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
            为港险团队及经纪人赋能
          </h1>

          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-4 leading-relaxed font-medium">
            专为香港保险经纪团队打造的AI赋能办公及营销解决方案
          </p>
        </div>
      </div>

      {/* Main Categories */}
      <div className="max-w-7xl mx-auto px-6 pb-32 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {categories.map((item, index) => (
            <div
              key={index}
              onClick={() => onNavigate(item.path)}
              className="group relative p-10 md:p-14 rounded-[3rem] bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer overflow-hidden flex flex-col h-full"
            >
              {/* Card Background Glow */}
              <div className={`absolute -top-24 -right-24 w-80 h-80 blur-[100px] rounded-full transition-all duration-700 ${item.glowClass} ${item.glowHoverClass}`} />

              <div className="relative z-10 flex-grow">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-10 border group-hover:scale-110 transition-transform duration-500 ${item.bgClass} ${item.borderClass}`}>
                  <item.icon className={`w-8 h-8 ${item.textClass}`} />
                </div>

                <h2 className="text-4xl font-bold mb-4 tracking-tight">{item.title}</h2>
                <h3 className={`text-xl font-semibold mb-8 ${item.textClass}`}>{item.subtitle}</h3>

                <p className="text-slate-400 text-lg mb-12 leading-relaxed">
                  {item.description}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-12">
                  {item.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                      <span className="text-sm text-slate-300 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 pt-8 border-t border-white/5 flex items-center justify-between group/link">
                <span className="text-lg font-bold">进入业务模块</span>
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover/link:bg-white text-white group-hover/link:text-black transition-all">
                  <ArrowRight className="w-5 h-5 group-hover/link:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="max-w-7xl mx-auto px-6 pb-20 text-center border-t border-white/5 pt-20">
        <p className="text-slate-500 font-mono text-sm tracking-widest uppercase mb-4">MacroData AI Intelligence Platform</p>
        <h2 className="text-2xl font-bold opacity-30 tracking-tighter">THE FUTURE OF INSURANCE IS HERE</h2>
      </div>
    </div>
  );
};

export default AIHub;
