import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../hooks/useAppNavigate';
import Login from './Login';
import Register from './Register';
import axios from 'axios';
import CompanyIconDisplay from './CompanyIconDisplay';
import NavBar from './NavBar';
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
  Loader2,
  ArrowLeft,
  ChevronRight,
  Shield,
  Star,
} from 'lucide-react';

function HomePage() {
  const onNavigate = useAppNavigate();
  const { t, i18n } = useTranslation();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [theme, setTheme] = useState('dark');

  // 获取保险公司数据
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await axios.get('/api/insurance-companies/standard-comparison/', {
          params: { payment_period: 5 } // 默认获取5年期的数据作为展示
        });
        if (response.data.status === 'success') {
          setCompanies(response.data.data || []);
        }
      } catch (error) {
        console.error('获取保险公司列表失败:', error);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  // 检测URL参数，如果有login=true则自动显示登录框
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'true') {
      setShowLogin(true);
      // 清除URL参数
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // 工具分类
  const toolCategories = [
    {
      category: '保险数据分析与对比',
      tools: [
        { name: '产品精算对比', icon: BarChart3, action: () => onNavigate('company-comparison'), color: 'from-blue-600 via-blue-700 to-indigo-800' },
        { name: '全港产品库', icon: Folder, action: () => onNavigate('insurance-products'), color: 'from-slate-700 via-slate-800 to-slate-900' },
        { name: '主流保司名录', icon: Users, action: () => onNavigate('insurance-companies'), color: 'from-blue-500 via-blue-600 to-blue-700' },
      ]
    },
    {
      category: '专业咨询与案例研究',
      tools: [
        { name: '在线顾问咨询', icon: Sparkles, action: () => isAuthenticated ? onNavigate('customer-cases') : setShowLogin(true), color: 'from-emerald-600 via-teal-700 to-cyan-800' },
        { name: '经典案例库', icon: BookOpen, action: () => onNavigate('customer-case-library'), color: 'from-indigo-600 via-purple-700 to-pink-800' },
      ]
    },
    {
      category: 'AI 数字化办公赋能',
      tools: [
        { name: '数据自动提取', icon: Folder, action: () => isAuthenticated ? onNavigate('plan-management') : setShowLogin(true), color: 'from-slate-600 via-slate-700 to-slate-800' },
        { name: 'AI 智能计划对比', icon: BarChart3, action: () => isAuthenticated ? onNavigate('plan-comparison') : setShowLogin(true), color: 'from-blue-600 via-indigo-700 to-purple-800' },
        { name: '计划书智能生成', icon: FileText, action: () => isAuthenticated ? onNavigate('plan-builder') : setShowLogin(true), color: 'from-blue-500 via-blue-600 to-indigo-700' },
        { name: '文档处理工具', icon: FileEdit, action: () => isAuthenticated ? onNavigate('pdf-footer-remover2') : setShowLogin(true), color: 'from-gray-600 via-gray-700 to-gray-800' },
        { name: '个人管理中心', icon: Sparkles, action: () => isAuthenticated ? onNavigate('dashboard') : setShowLogin(true), color: 'from-blue-800 via-slate-800 to-black' },
      ]
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-700 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <NavBar theme={theme} activePage="home" onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />

      {/* Hero Section */}
      <section className="relative h-[600px] sm:h-[700px] lg:h-[800px] overflow-hidden flex items-center justify-center transition-all duration-700">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1512100356356-de1b84283e18?q=80&w=1975&auto=format&fit=crop"
            alt="Hong Kong Skyline"
            className="w-full h-full object-cover transform scale-105 transition-transform duration-[20s] hover:scale-100"
          />
          <div className={`absolute inset-0 transition-opacity duration-700 bg-gradient-to-b ${
            theme === 'dark' 
              ? 'from-slate-900/90 via-slate-900/70 to-slate-950' 
              : 'from-white/60 via-white/40 to-slate-50'
          }`}></div>
          <div className={`absolute inset-0 transition-opacity duration-700 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${
            theme === 'dark' ? 'from-blue-900/30 via-transparent to-transparent' : 'from-blue-100/40 via-transparent to-transparent'
          }`}></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full text-left -mt-20 sm:-mt-32">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold mb-8 backdrop-blur-md animate-fade-in-up transition-all duration-500 ${
            theme === 'dark' 
              ? 'bg-blue-500/20 border-blue-400/30 text-blue-300' 
              : 'bg-blue-600/10 border-blue-600/20 text-blue-600'
          }`}>
            <Sparkles className="w-4 h-4" />
            <span>用數據說話 · 實現公平保險</span>
          </div>
          <h1 className={`text-4xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight drop-shadow-2xl animate-fade-in-up delay-100 transition-colors duration-500 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            香港保險第三方<br className="sm:hidden" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">數據評測與分析</span>平台
          </h1>
          <p className={`text-lg sm:text-xl lg:text-2xl mb-10 leading-relaxed max-w-2xl animate-fade-in-up delay-200 font-light transition-colors duration-500 ${
            theme === 'dark' ? 'text-gray-300' : 'text-slate-600'
          }`}>
            全港主要保险公司 product 深度对比 · 独立客观评分，運用先進算法進行深度精算對比。
            <br className="hidden sm:block" />
            为您剔除信息迷雾，还原产品真相，助您做出最明智的决策。
          </p>
          <div className="flex flex-col sm:flex-row justify-start gap-5 animate-fade-in-up delay-300">
            <button
              onClick={() => onNavigate('company-comparison')}
              className="px-10 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-5 h-5" />
              2026產品收益數據對比
            </button>
            <button
              onClick={() => {
                const section = document.getElementById('advisor-service');
                section?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-10 py-4 backdrop-blur-md border rounded-full font-bold text-lg transition-all hover:-translate-y-1 ${
                theme === 'dark' 
                  ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                  : 'bg-slate-900/5 border-slate-900/10 text-slate-900 hover:bg-slate-900/10'
              }`}
            >
              預約港險銷售專家
            </button>
          </div>
        </div>
      </section>

      {/* 保险公司及旗舰产品展示 - 新增 */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        {/* Background Decoration - Subtle for light theme */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl text-left">
              <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-6 tracking-tight">全港主流保司及旗舰产品</h2>
              <p className="text-xl text-slate-600 font-light leading-relaxed">
                实时同步全港 20+ 家主流保险公司数据，深度收录 100+ 款旗舰产品。
                <br className="hidden sm:block" />
                所有产品均经过精算模型标准化处理，确保对比的客观性與准确性。
              </p>
            </div>
            <button
              onClick={() => onNavigate('company-comparison')}
              className="px-8 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 rounded-xl transition-all shadow-sm font-semibold flex items-center gap-2 group"
            >
              <span>查看全部产品</span>
              <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {loadingCompanies ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-500 animate-pulse">正在加载保司数据...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 md:gap-4">
              {companies.map((company) => {
                const isFWD = company.name === '富卫' || company.name === 'FWD' || company.name.includes('富卫');
                const logoClasses = isFWD
                  ? "w-20 h-12 md:w-36 md:h-16"
                  : "w-32 h-16 md:w-52 md:h-26";
                
                return (
                  <div
                    key={company.id}
                    onClick={() => onNavigate(`insurance-company/${company.id}`)}
                    className="relative rounded-lg md:rounded-xl py-0.5 px-2 md:py-1 md:px-3 transition-all duration-300 cursor-pointer bg-white/95 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.35),0_8px_20px_rgba(0,0,0,0.15),0_4px_8px_rgba(0,0,0,0.1)] hover:scale-[1.03] hover:-translate-y-1 border-2 border-white/80 hover:border-indigo-300 flex flex-col h-full min-h-[180px] md:min-h-[220px]"
                  >
                    <div className={`flex items-center justify-center ${isFWD ? 'mt-4 md:mt-5 mb-2 md:mb-3' : '-mb-1'}`}>
                      <CompanyIconDisplay
                        iconUrl={company.icon}
                        companyName={company.name}
                        imgSizeClasses={logoClasses}
                        textClasses="text-4xl md:text-6xl"
                        fallbackBgClasses="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl md:rounded-2xl"
                      />
                    </div>

                    <div className={`text-center ${isFWD ? 'mt-1' : '-mt-2'} flex-1 flex flex-col justify-center pb-2`}>
                      <h3 className="text-sm md:text-lg font-bold text-gray-900 line-clamp-1 leading-none" style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>{company.name}</h3>
                      {company.name_en && (
                        <p className="text-[10px] md:text-xs text-gray-500 line-clamp-1 leading-none mt-1">{company.name_en}</p>
                      )}
                      
                      {company.products && company.products.length > 0 ? (
                        <div className="text-xs md:text-base text-indigo-700 font-bold px-0.5 leading-tight space-y-0.5 mt-2" style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>
                          {company.products.slice(0, 2).map((p, idx) => (
                            <div key={idx} className="break-words">{p.product_name}</div>
                          ))}
                        </div>
                      ) : (
                        company.flagship_product && (
                          <p className="text-xs md:text-base text-indigo-700 font-bold break-words px-0.5 leading-tight mt-2" style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}>
                            {company.flagship_product}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Advisor Service Section (About MacroData) - Grand & Detailed */}
      <section id="advisor-service" className="py-24 sm:py-32 bg-slate-50 relative overflow-hidden border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-20">
            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-8 tracking-tight">為何找 MacroData 買保險？</h2>
            <div className="inline-block">
              <p className="text-4xl sm:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
                用數據說話 · 實現公平保險
              </p>
              <div className="w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full opacity-20"></div>
            </div>
          </div>

          {/* Three Core Pillars - Detailed & Professional */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">打破利潤衝突</h3>
              <p className="text-slate-600 leading-relaxed">
                全港首創保險產品精算評分體系，踢爆「魔鬼條款」。我們的顧問為<span className="text-blue-600 font-bold">受薪員工，不收佣金</span>，從根本上杜絕為高佣金而推銷劣質產品的行為。
              </p>
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">全港保司嚴選</h3>
              <p className="text-slate-600 leading-relaxed">
                利用 MacroData 強大的後台數據庫，實時對比<span className="text-indigo-600 font-bold">全港 20+ 家保司產品</span>。根據您的需求，利用 AI 模型從保障、回報、條款等多維度篩選最優方案。
              </p>
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group">
              <div className="w-16 h-16 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">獨立理賠支持</h3>
              <p className="text-slate-600 leading-relaxed">
                設有<span className="text-cyan-600 font-bold">獨立理賠專家團隊</span>，專注於為客戶爭取權益。在理賠發生時，我們站在客戶一邊與保司周旋，確保每一份保單都能獲得公平、快速的賠付。
              </p>
            </div>
          </div>

          {/* Trust QA Section - Sleek & Conversational */}
          <div className="max-w-4xl mx-auto space-y-8 mb-24">
            <div className="flex items-start gap-6 animate-fade-in-up">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">?</div>
              <div className="bg-white p-6 sm:p-8 rounded-3xl rounded-tl-none border border-slate-200 shadow-sm max-w-2xl">
                <p className="text-slate-700 text-lg font-medium leading-relaxed">
                  每年全港約 1,000 宗保險投訴中，近半涉及顧問操守及理賠糾紛。我該如何判斷 MacroData 是否值得信賴？
                </p>
              </div>
            </div>
            <div className="flex items-start gap-6 flex-row-reverse animate-fade-in-up delay-100">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-blue-500 flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20">M</div>
              <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl rounded-tr-none shadow-2xl max-w-2xl border border-slate-800">
                <p className="text-slate-300 text-lg leading-relaxed">
                  MacroData 重視顧問培訓，<span className="text-white font-bold underline decoration-blue-500 decoration-4 underline-offset-8">講良心不講佣金</span>，致力於為消費者提供「買得對、賠得足」的保險服務。自 2022 年正式運營以來，憑藉數據透明化已獲得大量客戶好評。
                </p>
              </div>
            </div>
          </div>

          {/* Numbers Section - High Impact */}
          <div className="bg-white rounded-[50px] p-12 sm:p-16 shadow-sm border border-slate-100">
            <h3 className="text-2xl font-bold text-slate-900 mb-16 text-center uppercase tracking-[0.3em]">MacroData 重新定義港險購買新體驗</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="text-center px-4">
                <p className="text-5xl sm:text-6xl font-black text-blue-600 mb-4 tracking-tighter">200+</p>
                <p className="text-slate-500 text-lg font-bold">Google 5星好評</p>
              </div>
              <div className="text-center px-4 py-8 sm:py-0">
                <p className="text-5xl sm:text-6xl font-black text-blue-600 mb-4 tracking-tighter">9.8/10</p>
                <p className="text-slate-500 text-lg font-bold">服務滿意度</p>
              </div>
              <div className="text-center px-4 pt-8 sm:pt-0">
                <p className="text-5xl sm:text-6xl font-black text-blue-600 mb-4 tracking-tighter">89%</p>
                <p className="text-slate-500 text-lg font-bold">客戶推薦率</p>
              </div>
            </div>
            <div className="mt-20 flex justify-center">
              <button
                onClick={() => onNavigate('customer-cases')}
                className="px-12 py-5 bg-slate-900 text-white rounded-full font-bold text-xl hover:bg-slate-800 transition-all shadow-2xl hover:-translate-y-1.5 flex items-center gap-4 group"
              >
                <span>預約顧問諮詢</span>
                <Sparkles className="w-6 h-6 text-yellow-400 group-hover:animate-pulse" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 主要工具展示 */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">智能分析与辅助工具</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto font-light">
              结合尖端 AI 技术 with 精算逻辑，为您提供全方位的保险数据支持，让复杂的保险条款变得简单易懂。
            </p>
          </div>
          
          <div className="space-y-16">
            {toolCategories.map((category, catIndex) => (
            <div key={catIndex}>
              {/* 分类标题 */}
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-sm font-bold ring-4 ring-blue-50/50">
                  {catIndex + 1}
                </span>
                {category.category}
              </h3>

              {/* 工具网格 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
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
                    className={`group relative overflow-hidden bg-gradient-to-br ${tool.color} rounded-2xl px-5 py-5 shadow-lg shadow-blue-900/5 hover:shadow-xl hover:shadow-blue-900/10 transition-all duration-300 flex flex-col justify-between h-[140px] text-left ${
                      tool.disabled
                        ? 'opacity-50 cursor-not-allowed grayscale'
                        : 'hover:-translate-y-1 hover:scale-[1.02] cursor-pointer'
                    }`}
                  >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 p-3 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                       <tool.icon className="w-24 h-24 rotate-12" />
                    </div>
                    
                    <div className="relative z-10 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-3 group-hover:bg-white/20 transition-colors">
                      <tool.icon className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                    
                    <h4 className="relative z-10 text-base font-bold text-white tracking-wide drop-shadow-sm group-hover:translate-x-1 transition-transform">
                      {tool.name}
                    </h4>
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-full group-hover:translate-y-0"></div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
            <div className="col-span-2 sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-lg font-bold tracking-tight">MacroData</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed font-light">
                全港领先的第三方保险数据分析平台。<br/>
                致力于为您提供客观、公正、透明的保险决策支持。
              </p>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4 text-sm tracking-wide">产品与服务</h5>
              <ul className="space-y-3 text-sm font-light">
                <li><a href="#" className="hover:text-blue-400 transition-colors">智能计划书对比</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">全港保险产品库</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">专业顾问咨询</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4 text-sm tracking-wide">支持中心</h5>
              <ul className="space-y-3 text-sm font-light">
                <li><a href="#" className="hover:text-blue-400 transition-colors">使用指南</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">常见问题</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">联系我们</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4 text-sm tracking-wide">关于我们</h5>
              <ul className="space-y-3 text-sm font-light">
                <li><a href="#" className="hover:text-blue-400 transition-colors">公司简介</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">隐私政策</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">服务条款</a></li>
              </ul>
            </div>
          </div>

          {/* Login / Register in Footer */}
          {!isAuthenticated && (
            <div className="border-t border-slate-800 pt-8 mb-8 flex items-center justify-center gap-4">
              <button
                onClick={() => setShowLogin(true)}
                className="text-slate-400 hover:text-white transition-colors text-sm font-bold px-4 py-2 border border-slate-700 rounded-lg hover:border-slate-500"
              >
                {t('login')}
              </button>
              <button
                onClick={() => setShowRegister(true)}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all text-sm font-bold"
              >
                {t('register')}
              </button>
            </div>
          )}

          <div className={`${isAuthenticated ? 'border-t border-slate-800 pt-8' : ''} text-center text-xs text-slate-500 font-light`}>
            <p>&copy; {new Date().getFullYear()} MacroData. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Login Modal (for footer & feature cards) */}
      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}

      {/* Register Modal (for footer) */}
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
