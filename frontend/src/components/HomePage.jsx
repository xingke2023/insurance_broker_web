import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../hooks/useAppNavigate';
import Login from './Login';
import Register from './Register';
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
  Users
} from 'lucide-react';

function HomePage() {
  const onNavigate = useAppNavigate();
  const { t, i18n } = useTranslation();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
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
      category: '港险销售赋能工具',
      tools: [
        { name: '计划书概要与数据提取', icon: Folder, action: () => isAuthenticated ? onNavigate('plan-management') : setShowLogin(true), color: 'from-blue-500 via-blue-600 to-indigo-700' },
        { name: '计划书AI对比工具', icon: BarChart3, action: () => isAuthenticated ? onNavigate('plan-comparison') : setShowLogin(true), color: 'from-indigo-500 via-blue-600 to-cyan-700' },
        { name: '计划书制作', icon: FileText, action: () => isAuthenticated ? onNavigate('plan-builder') : setShowLogin(true), color: 'from-purple-500 via-purple-600 to-pink-700' },
        { name: '计划书擦除工具', icon: FileEdit, action: () => isAuthenticated ? onNavigate('pdf-footer-remover2') : setShowLogin(true), color: 'from-purple-500 via-fuchsia-600 to-pink-700' },
        { name: '个人办公助手', icon: Sparkles, action: () => isAuthenticated ? onNavigate('dashboard') : setShowLogin(true), color: 'from-pink-500 via-rose-600 to-rose-700' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-200 to-slate-100">
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
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight drop-shadow-lg">Openclaw港险办公流程自动化专家</h1>
                <p className="text-[10px] sm:text-xs text-gray-300 hidden sm:block font-medium">香港保险公司与保险产品AI赋能宣传专题网站</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[400px] sm:h-[500px] lg:h-[550px] overflow-hidden flex items-center justify-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            alt="Office Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/40 to-transparent"></div>
          <div className="absolute inset-0 bg-black/30"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
          <div className="max-w-3xl">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              港险办公Openclaw应用系统
            </h2>
            <div className="w-20 h-1.5 bg-blue-500 mb-6 rounded-full"></div>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-100 mb-10 leading-relaxed drop-shadow-lg font-medium max-w-2xl">
              涵盖计划书制作，各类消息提醒自动化办公，为港险从业者打造专业、高效的AI数字化办公体验。
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => onNavigate('product-demo')}
                className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-500 transition-all shadow-[0_8px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_28px_rgba(37,99,235,0.5)] hover:scale-105 active:scale-95"
              >
                产品功能演示
              </button>
              {!isAuthenticated && (
                <button
                  onClick={() => setShowRegister(true)}
                  className="px-8 py-3.5 bg-white/10 backdrop-blur-md border border-white/30 text-white rounded-2xl font-bold text-lg hover:bg-white/20 transition-all hover:scale-105 active:scale-95"
                >
                  免费注册
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 主要工具展示 */}
      <section className="py-6 sm:py-8">
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
                    <h3 className="relative z-10 text-xs sm:text-sm font-semibold text-white tracking-tight leading-tight drop-shadow-md">
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
