import React, { useRef } from 'react';
import { useAppNavigate } from '../hooks/useAppNavigate';
import NavBar from './NavBar';
import { 
  ArrowLeft, 
  FileText, 
  Share2, 
  Search, 
  Database, 
  Eraser, 
  Bell, 
  CheckCircle2, 
  Plus,
  Rocket,
  Users,
  MessageSquare,
  ShieldCheck,
  Zap,
  Layout,
  Gift,
  MousePointer2,
  ChevronRight,
  BookOpen,
  HelpCircle,
  Cpu,
  Monitor,
  Smartphone
} from 'lucide-react';

const AIOffice = () => {
  const onNavigate = useAppNavigate();
  const oaSystemRef = useRef(null);
  const planSystemRef = useRef(null);

  const scrollToOA = () => {
    oaSystemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToPlan = () => {
    planSystemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const coreTools = [
    { title: '计划书自动生成', icon: FileText, path: '/plan-generation', color: 'blue' },
    { title: '数据自动提取', icon: Database, path: '/plan-management', color: 'purple' },
    { title: '计划书擦除工具', icon: Eraser, path: '/pdf-footer-remover2', color: 'orange' },
    { title: '保司通知推送', icon: Bell, path: '/dashboard', color: 'red' },
    { title: '全港产品查询', icon: Search, path: '/insurance-products', color: 'indigo' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <NavBar />
      
      {/* 1. Header Section */}
      <div className="pt-32 pb-20 px-6 bg-white border-b border-slate-200 overflow-hidden relative">
        <div className="max-w-7xl mx-auto">
          <button 
            onClick={() => onNavigate('ai-hub')}
            className="group flex items-center space-x-2 text-slate-400 hover:text-blue-600 transition-colors mb-12"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">返回 AI 赋能中心</span>
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-bold uppercase mb-6">
                AI Office Suite
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight text-slate-900">
                AI赋能办公：流程自动化
              </h1>
              <p className="text-xl text-slate-500 leading-relaxed mb-8">
                不仅是工具集成，更是您的数字化办公室。通过 AI 驱动的自动化流程，
                将繁琐的保单管理、客户答疑与团队赋能转化为极致的生产力。
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={scrollToOA}
                  className="px-8 py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-blue-600 transition-all flex items-center shadow-xl shadow-slate-900/10"
                >
                  公众号系统
                  <ChevronRight className="ml-2 w-5 h-5" />
                </button>
                <button 
                  onClick={scrollToPlan}
                  className="px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold hover:bg-slate-50 transition-all flex items-center shadow-xl shadow-slate-900/5"
                >
                  计划书生成系统
                  <ChevronRight className="ml-2 w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {coreTools.map((tool, i) => (
                <div 
                  key={i}
                  onClick={() => onNavigate(tool.path.substring(1))}
                  className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <tool.icon className="w-6 h-6 text-slate-400 group-hover:text-blue-600 mb-3 transition-colors" />
                  <div className="font-bold text-sm">{tool.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 -skew-x-12 translate-x-1/2 pointer-events-none" />
      </div>

      {/* 2. Featured Section: 公众号系统 (The centerpiece) */}
      <section ref={oaSystemRef} className="max-w-7xl mx-auto px-6 py-24 scroll-mt-24">
        <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl shadow-blue-500/5">
          {/* Section Header */}
          <div className="p-12 md:p-16 border-b border-slate-100 bg-gradient-to-br from-blue-50 to-transparent">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="max-w-2xl">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/40">
                  <Share2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-4">港险团队公众号系统</h2>
                <p className="text-lg text-slate-500">
                  一站式连接互联网准客户、现有客户与团队成员。基于庞大的港险数据库，
                  打造 7x24 小时在线的智能服务矩阵。
                </p>
              </div>
              <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <div className="text-sm font-bold text-slate-400 uppercase mb-2">AI 知识库支撑</div>
                <div className="text-3xl font-black text-blue-600">3418+</div>
                <div className="text-xs text-slate-400">专业问答条目</div>
              </div>
            </div>
          </div>

          {/* Three Dimensions */}
          <div className="grid grid-cols-1 lg:grid-cols-3">
            
            {/* Dimension 1: 准客户 */}
            <div className="p-10 md:p-12 border-b lg:border-b-0 lg:border-r border-slate-100">
              <div className="flex items-center space-x-3 mb-8">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600"><Users className="w-5 h-5" /></div>
                <h3 className="text-xl font-bold">面向互联网准客户</h3>
              </div>
              <ul className="space-y-6">
                {[
                  { title: 'AI 保险问答助理', desc: '基于庞大数据库，提供投保常识、基本知识、条款注意事项等智能解答。' },
                  { title: '售前售后咨询', desc: '涵盖公司品牌、服务信息、产品问答及实时查询。' },
                  { title: '智能产品推荐', desc: '根据客户需求，AI 自动匹配并推荐最合适的港险方案。' }
                ].map((item, idx) => (
                  <li key={idx} className="group">
                    <div className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{item.title}</div>
                    <div className="text-sm text-slate-500 leading-relaxed">{item.desc}</div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Dimension 2: 现有客户 */}
            <div className="p-10 md:p-12 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/30">
              <div className="flex items-center space-x-3 mb-8">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><ShieldCheck className="w-5 h-5" /></div>
                <h3 className="text-xl font-bold">面向现有客户</h3>
              </div>
              <ul className="space-y-6">
                {[
                  { title: '投保/续保查询', desc: '客户可随时查询个人保单状态、缴费记录及续保详情。' },
                  { title: '主动通知推送', desc: '系统自动发送缴费提醒、续保预警及关键保单变动通知。' },
                  { title: '推荐奖励机制', desc: '内置老带新激励系统，通过数字化方式促进存量客户裂变。' }
                ].map((item, idx) => (
                  <li key={idx} className="group">
                    <div className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{item.title}</div>
                    <div className="text-sm text-slate-500 leading-relaxed">{item.desc}</div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Dimension 3: 团队成员 */}
            <div className="p-10 md:p-12">
              <div className="flex items-center space-x-3 mb-8">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600"><Zap className="w-5 h-5" /></div>
                <h3 className="text-xl font-bold">面向团队成员</h3>
              </div>
              <ul className="space-y-6">
                {[
                  { title: '内容素材直供', desc: '每日推送精选主题、文案、视频，助力经纪人打造专业自媒体。' },
                  { title: '展业辅助工具', desc: '一键生成计划书、概要、宣传海报及产品对比图。' },
                  { title: '实时签单辅助', desc: '签单过程中遇阻？AI 基于详细条款与知识库实时提供问答辅助。' }
                ].map((item, idx) => (
                  <li key={idx} className="group">
                    <div className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{item.title}</div>
                    <div className="text-sm text-slate-500 leading-relaxed">{item.desc}</div>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Special Feature: Signing Support */}
          <div className="p-8 md:p-12 bg-slate-900 text-white relative overflow-hidden">
             <div className="absolute right-0 top-0 p-12 opacity-10"><MessageSquare className="w-48 h-48" /></div>
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="max-w-2xl">
                  <h3 className="text-2xl font-bold mb-4 flex items-center">
                    <Layout className="w-6 h-6 mr-3 text-blue-400" />
                    签单实时问答辅助系统
                  </h3>
                  <p className="text-slate-400 text-sm">
                    汇集 1000+ 签单过程中的疑难杂症，通过特定计划书条款分析与港险基础知识库，
                    为经纪人提供“耳返式”的即时应答支持，确保签单成功率。
                  </p>
                </div>
                <button className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors font-bold whitespace-nowrap">
                  立即部署系统
                </button>
             </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Section: 计划书生成系统 */}
      <section ref={planSystemRef} className="max-w-7xl mx-auto px-6 py-24 scroll-mt-24">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-600 text-xs font-bold uppercase mb-6">
              Plan Generation
            </div>
            <h2 className="text-4xl font-black mb-8 tracking-tight">港险团队计划书生成系统</h2>
            <div className="space-y-8">
              {[
                { title: '自然语言指令', icon: MessageSquare, desc: '通过微信或 Telegram 发送简单的客户信息及需求。' },
                { title: '全自动云端填写', icon: Monitor, desc: '系统自动模拟人工操作，登录保司官网完成复杂的表单填写。' },
                { title: '秒级原件返回', icon: FileText, desc: '几十秒内生成并返回保司官方 PDF 计划书。' }
              ].map((item, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => onNavigate('plan-generation')}
              className="mt-12 px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all flex items-center shadow-xl shadow-blue-500/20"
            >
              了解系统详情
              <ChevronRight className="ml-2 w-5 h-5" />
            </button>
          </div>
          <div className="lg:w-1/2 relative">
             <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full" />
             <div className="relative p-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                <img 
                  src="/asset/648b31a9cb6cfb10f9de43a073a02015.png" 
                  alt="Plan Builder Screenshot" 
                  className="rounded-2xl w-full"
                />
             </div>
          </div>
        </div>
      </section>

      {/* 4. Other Tools Grid */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-200">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">更多数字化办公工具</h2>
          <p className="text-slate-500">除了上述核心系统，我们还提供以下单项提效工具</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: '数据自动提取', icon: Database, desc: 'AI 自动分析 PDF，提取利益表与 IRR 数据。', path: '/plan-management' },
            { title: '计划书擦除', icon: Eraser, desc: '快速擦除页眉页脚与个人信息。', path: '/pdf-footer-remover2' },
            { title: '查询系统', icon: Search, desc: '全港主流保险产品库极速检索。', path: '/insurance-products' },
            { title: '通知推送', icon: Bell, desc: '各大保司最新优惠与政策实时推送。', path: '/dashboard' }
          ].map((tool, i) => (
            <div 
              key={i}
              onClick={() => onNavigate(tool.path.substring(1))}
              className="bg-white p-8 rounded-3xl border border-slate-200 hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-blue-50 transition-colors">
                <tool.icon className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">{tool.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">{tool.desc}</p>
              <div className="text-blue-600 font-bold text-xs flex items-center">
                立即使用 <ChevronRight className="ml-1 w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Footer Message */}
      <div className="bg-slate-900 py-24 text-center px-6">
         <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">让 AI 成为您团队的超级大脑</h2>
         <p className="text-slate-400 max-w-2xl mx-auto mb-12 text-lg">
           立即集成港险 AI 赋能系统，开启您的智能化展业之旅。
         </p>
         <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="px-10 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20">
              预约演示
            </button>
            <button className="px-10 py-4 rounded-2xl bg-white/5 text-white border border-white/10 font-bold hover:bg-white/10 transition-all">
              联系顾问
            </button>
         </div>
      </div>
    </div>
  );
};

export default AIOffice;
