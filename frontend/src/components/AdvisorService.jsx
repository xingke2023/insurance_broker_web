import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from './NavBar';
import {
  Shield,
  BarChart3,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Users,
  Search,
  Zap,
  ArrowRight,
  Phone,
  ArrowLeft
} from 'lucide-react';

const AdvisorService = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState('dark');

  const advantages = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "打破利潤衝突",
      description: "全港首創保險產品精算評分體系，踢爆「魔鬼條款」。我們的顧問為受薪員工，不收佣金，從根本上杜絕為高佣金而推銷劣質產品的行為。",
      color: "blue"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "全港保司嚴選",
      description: "利用 MacroData 強大的後台數據庫，實時對比全港 20+ 家保司產品。根據您的需求，利用 AI 模型從保障、回報、條款等多維度篩選最優方案。",
      color: "indigo"
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "獨立理賠支持",
      description: "設有獨立理賠專家團隊，專注於為客戶爭取權益。在理賠發生時，我們站在客戶一邊與保司周旋，確保每一份保單都能獲得公平、快速的賠付。",
      color: "cyan"
    }
  ];

  const services = [
    {
      title: "中立產品比較",
      details: [
        "基於精算模型，公正評分全港主流產品",
        "透明化對比保費、保障額及回報率",
        "揭露隱藏條款及細則"
      ]
    },
    {
      title: "專業方案規劃",
      details: [
        "1對1需求分析，量身定制保險組合",
        "涵蓋人壽、醫療、危疾及儲蓄分紅",
        "優化保費支出，實現最高性價比"
      ]
    },
    {
      title: "全程售後跟進",
      details: [
        "協助處理投保申請及核保跟進",
        "年度保单檢視，確保保障與時俱進",
        "專業理賠支援，拒絕「孤兒保單」"
      ]
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-700 ${theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <NavBar theme={theme} activePage="advisor-service" onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />

      <main className="pt-32 pb-20">
        {/* Hero Section */}
        <section className="relative px-6 py-20 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] animate-pulse bg-blue-900/20 pointer-events-none"></div>
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-8 backdrop-blur-md">
              <Zap className="w-4 h-4" />
              <span>專業 · 中立 · 客觀</span>
            </div>
            <h1 className={`text-4xl sm:text-6xl font-black mb-8 leading-tight tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              您的專業保險<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">數據顧問</span>
            </h1>
            <p className={`text-xl max-w-3xl mx-auto leading-relaxed font-light ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              MacroData 提供全港領先的第三方保險數據分析服務。我們不代表保險公司，我們只代表您的利益。
              通過大數據與精算模型，助您「買得對、賠得足」。
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-6">
              <button className="px-10 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 flex items-center gap-2 group">
                <MessageSquare className="w-5 h-5" />
                立即免費諮詢
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* Why Us Section */}
        <section className="px-6 py-20 bg-slate-900/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>為何選擇 MacroData？</h2>
              <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {advantages.map((adv, idx) => (
                <div key={idx} className={`p-10 rounded-[40px] border transition-all duration-500 group ${theme === 'dark' ? 'bg-slate-900/50 border-white/5 hover:bg-slate-800/80 hover:border-blue-500/30' : 'bg-white border-slate-100 shadow-sm hover:shadow-2xl'}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    {adv.icon}
                  </div>
                  <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{adv.title}</h3>
                  <p className={`leading-relaxed font-light ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{adv.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Detail */}
        <section className="px-6 py-24">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div>
                <h2 className={`text-3xl sm:text-5xl font-bold mb-8 leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  從數據分析到<br />
                  <span className="text-blue-500">完善的保障方案</span>
                </h2>
                <p className={`text-lg mb-12 font-light ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  我們的服務涵蓋保險生命週期的每一個階段。利用專有的 Actuarial Score (精算評分)，我們為您在全港過千款產品中淘劣存優。
                </p>
                <div className="space-y-8">
                  {services.map((service, idx) => (
                    <div key={idx} className="flex gap-6">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{service.title}</h4>
                        <ul className="space-y-2">
                          {service.details.map((detail, dIdx) => (
                            <li key={dIdx} className={`flex items-center gap-2 text-sm font-light ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                              <CheckCircle2 className="w-4 h-4 text-blue-500" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-blue-600 rounded-[60px] blur-3xl opacity-20 animate-pulse"></div>
                <div className={`relative rounded-[60px] border p-8 md:p-12 overflow-hidden ${theme === 'dark' ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200 shadow-2xl'}`}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                      <Search className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>全港保險大數據</h4>
                      <p className="text-xs text-slate-500">實時更新 · 深度分析</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {[
                      { label: "產品收錄", value: "1,200+", color: "bg-blue-500" },
                      { label: "精算評分條目", value: "50,000+", color: "bg-indigo-500" },
                      { label: "理賠案例庫", value: "5,000+", color: "bg-cyan-500" }
                    ].map((stat, sIdx) => (
                      <div key={sIdx}>
                        <div className="flex justify-between mb-2">
                          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{stat.label}</span>
                          <span className="text-sm font-bold text-blue-500">{stat.value}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${stat.color} rounded-full`} style={{ width: '85%', opacity: 1 - sIdx * 0.15 }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-12 p-6 rounded-3xl border border-dashed ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                    <p className={`text-sm italic leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      "我們致力於解決香港保險市場的信息不對稱問題。通過專業的數據分析，讓每一位客戶都能在公平、透明的情況下選擇保障。"
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
                      <div>
                        <p className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>MacroData 專家團隊</p>
                        <p className="text-[10px] text-slate-500">資深精算師及理賠專家</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-20">
          <div className="max-w-5xl mx-auto">
            <div className={`rounded-[50px] p-12 md:p-20 text-center relative overflow-hidden ${theme === 'dark' ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-slate-900 text-white'}`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <h2 className="text-3xl sm:text-5xl font-black text-white mb-8 tracking-tight">準備好為您的保障升級了嗎？</h2>
              <p className="text-blue-100 text-lg mb-12 max-w-2xl mx-auto font-light">
                聯繫我們的專業顧問，獲取免費的產品對比報告或保單檢視服務。
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                <button className="px-12 py-5 bg-white text-blue-700 rounded-2xl font-black text-xl hover:bg-blue-50 transition-all shadow-2xl flex items-center gap-3">
                  <Phone className="w-6 h-6" />
                  預約專業諮詢
                </button>
                <button 
                  onClick={() => navigate('/insurance-products')}
                  className="px-12 py-5 bg-blue-500/20 backdrop-blur-md border border-white/20 text-white rounded-2xl font-bold text-xl hover:bg-white/10 transition-all flex items-center gap-3"
                >
                  查看產品評分
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Decoration */}
      <div className={`fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent pointer-events-none ${theme === 'dark' ? 'opacity-100' : 'opacity-20'}`} />
    </div>
  );
};

export default AdvisorService;
