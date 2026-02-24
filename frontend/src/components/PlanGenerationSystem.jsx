import React from 'react';
import { useAppNavigate } from '../hooks/useAppNavigate';
import NavBar from './NavBar';
import { 
  ArrowLeft, 
  Rocket, 
  MessageSquare, 
  Zap, 
  FileText, 
  Bot, 
  MousePointer2, 
  Layers, 
  Monitor, 
  ShieldCheck,
  ChevronRight,
  PlayCircle,
  Smartphone,
  CheckCircle2,
  Cpu
} from 'lucide-react';

const PlanGenerationSystem = () => {
  const onNavigate = useAppNavigate();

  const workflowSteps = [
    {
      title: '自然语言指令',
      desc: '经纪人通过微信、WhatsApp 或 Telegram 发送简单的客户信息及产品需求。',
      icon: MessageSquare,
      color: 'blue'
    },
    {
      title: 'OpenClaw 智能解析',
      desc: 'AI 自动解析指令，识别保司、险种、保额、缴费年限及提取方案。',
      icon: Cpu,
      color: 'purple'
    },
    {
      title: '自动化云端生成',
      desc: '系统自动启动浏览器，登录保司官网，模拟人工填写表单并生成官方 PDF。',
      icon: Monitor,
      color: 'indigo'
    },
    {
      title: '秒级极速返回',
      desc: '生成完毕后，系统立即将完整的计划书 PDF 原始文件发回给经纪人。',
      icon: Zap,
      color: 'emerald'
    }
  ];

  const features = [
    {
      title: '全自动流程',
      desc: '无需手动登录保司官网，无需繁琐的表单输入，全程 AI 自动化处理。',
      icon: Rocket
    },
    {
      title: '跨平台支持',
      desc: '支持手机端微信、WhatsApp 或 Telegram，随时随地在外面与客户聊天时即可生成。',
      icon: Smartphone
    },
    {
      title: '官方原件输出',
      desc: '生成的计划书为保司系统导出的原始 PDF，确保数据的权威性与专业性。',
      icon: FileText
    },
    {
      title: '复杂方案定制',
      desc: '支持设置不同的提取年份、金额，以及保单转换、增加受保人等复杂操作选项。',
      icon: Layers
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <NavBar />
      
      {/* Hero Section */}
      <div className="relative pt-40 pb-24 px-6 overflow-hidden bg-slate-50">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
          <div className="lg:w-1/2">
            <button 
              onClick={() => onNavigate('ai-office')}
              className="group flex items-center space-x-2 text-slate-400 hover:text-blue-600 transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold uppercase tracking-widest">返回办公赋能中心</span>
            </button>
            
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-600 text-xs font-bold mb-6">
              <Rocket className="w-4 h-4" />
              <span>NEXT-GEN PROPOSAL ENGINE</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-[1.1]">
              港险团队<br />
              <span className="text-blue-600">计划书自动生成</span>
            </h1>
            
            <p className="text-xl text-slate-500 leading-relaxed mb-10 max-w-xl">
              告别手动录入。只需一句话，系统自动启动浏览器、模拟人工填写表单，秒级生成保司官方计划书 PDF。
            </p>
            
            <div className="flex flex-wrap gap-4">
              <button className="px-10 py-5 rounded-2xl bg-slate-900 text-white font-bold hover:bg-blue-600 transition-all flex items-center shadow-2xl shadow-slate-900/20">
                立即体验演示
                <PlayCircle className="ml-2 w-5 h-5" />
              </button>
              <button className="px-10 py-5 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold hover:bg-slate-50 transition-all">
                查看视频
              </button>
            </div>
          </div>
          
          <div className="lg:w-1/2 relative">
             <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full" />
             <div className="relative bg-white p-4 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-slate-200">
                <img 
                  src="/asset/648b31a9cb6cfb10f9de43a073a02015.png" 
                  alt="System Demo" 
                  className="rounded-[2rem] w-full"
                />
                <div className="absolute -bottom-8 -left-8 p-6 bg-white rounded-3xl shadow-2xl border border-slate-100 hidden md:block">
                   <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                         <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                         <div className="text-xs text-slate-400 font-bold">GENERATION SUCCESS</div>
                         <div className="text-sm font-black">Manulife - 盈富传承 5年</div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* 2. Workflow Section */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20">
           <h2 className="text-4xl font-black mb-6">全自动化生成流程</h2>
           <p className="text-lg text-slate-500 max-w-2xl mx-auto">
             通过最先进的 OpenClaw 控制系统，我们将复杂的保司后台操作封装成简单的对话体验。
           </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {workflowSteps.map((step, i) => (
             <div key={i} className="relative group">
                {i < 3 && (
                  <div className="hidden lg:block absolute top-10 left-full w-full h-px bg-slate-200 z-0 -translate-x-8" />
                )}
                <div className="relative z-10 bg-white p-8 rounded-3xl border border-slate-200 group-hover:border-blue-500 group-hover:shadow-2xl group-hover:shadow-blue-500/10 transition-all">
                   <div className={`w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                      <step.icon className={`w-7 h-7 text-blue-600`} />
                   </div>
                   <h3 className="text-xl font-bold mb-4">{step.title}</h3>
                   <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-300 text-xs">
                   0{i+1}
                </div>
             </div>
           ))}
        </div>
      </section>

      {/* 3. Core Capabilities */}
      <section className="bg-slate-900 py-32 text-white overflow-hidden relative">
         <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
         <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
               <div>
                  <h2 className="text-4xl md:text-5xl font-black mb-10 leading-tight">
                    重新定义<br />
                    保险经纪人的展业方式
                  </h2>
                  <div className="space-y-8">
                    {features.map((f, i) => (
                      <div key={i} className="flex items-start space-x-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <f.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                           <h4 className="text-xl font-bold mb-2">{f.title}</h4>
                           <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-6">
                     <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10">
                        <div className="text-4xl font-black text-blue-400 mb-2">90%</div>
                        <div className="text-xs uppercase font-bold tracking-widest text-slate-500">效率提升</div>
                     </div>
                     <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10">
                        <div className="text-4xl font-black text-emerald-400 mb-2">20+</div>
                        <div className="text-xs uppercase font-bold tracking-widest text-slate-500">支持保司</div>
                     </div>
                  </div>
                  <div className="space-y-6 pt-12">
                     <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10">
                        <div className="text-4xl font-black text-purple-400 mb-2">0</div>
                        <div className="text-xs uppercase font-bold tracking-widest text-slate-500">人工介入</div>
                     </div>
                     <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10">
                        <div className="text-4xl font-black text-orange-400 mb-2">24/7</div>
                        <div className="text-xs uppercase font-bold tracking-widest text-slate-500">在线运行</div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* 4. CTA */}
      <section className="py-32 text-center px-6">
         <div className="max-w-4xl mx-auto bg-blue-600 rounded-[4rem] p-16 text-white shadow-2xl shadow-blue-500/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            <div className="relative z-10">
               <h2 className="text-4xl font-black mb-8">准备好体验极致效率了吗？</h2>
               <p className="text-xl text-blue-100 mb-12">
                 加入我们，让您的团队率先进入港险 AI 办公新时代。
               </p>
               <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <button className="px-12 py-5 rounded-2xl bg-white text-blue-600 font-black text-lg hover:bg-slate-100 transition-all shadow-xl">
                    申请系统演示
                  </button>
                  <button className="px-12 py-5 rounded-2xl bg-blue-700 text-white font-black text-lg hover:bg-blue-800 transition-all">
                    联系我们
                  </button>
               </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 text-center text-slate-400 text-xs">
         © 2026 MacroData AI. 香港保险团队智能化解决方案领先者。
      </footer>
    </div>
  );
};

export default PlanGenerationSystem;
