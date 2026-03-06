import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Login from './Login';
import Register from './Register';
import {
  BarChart3,
  MessageCircle,
  Phone,
  ChevronRight,
  X,
  Sun,
  Moon
} from 'lucide-react';

/**
 * Shared navigation bar component.
 *
 * Props:
 *  - theme: 'dark' | 'light' (default 'dark')
 *  - activePage: 'home' | 'insurance-products' | 'insurance-companies' | 'about' | null
 *  - onThemeToggle: optional callback for theme toggle button (if provided, theme toggle is shown)
 */
function NavBar({ activePage = null, onThemeToggle = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showConsult, setShowConsult] = useState(false);

  const isDark = true; // Force dark theme

  // Auto-detect active page from route if not provided
  const currentPage = activePage || (() => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/company-comparison')) return 'company-comparison';
    if (path.startsWith('/ai-hub') || path.startsWith('/ai-office') || path.startsWith('/ai-media') || path.startsWith('/plan-generation')) return 'ai-hub';
    if (path.startsWith('/insurance-products')) return 'insurance-products';
    if (path.startsWith('/insurance-companies')) return 'insurance-companies';
    if (path.startsWith('/insurance-class')) return 'insurance-class';
    if (path.startsWith('/advisor-service')) return 'advisor-service';
    return null;
  })();

  const navLinks = [
    { key: 'home', label: '首页', action: () => navigate('/') },
    { key: 'company-comparison', label: '產品對比', action: () => navigate('/company-comparison') },
    { key: 'insurance-products', label: '港險產品', action: () => navigate('/insurance-products') },
    { key: 'insurance-class', label: '港險課堂', action: () => navigate('/insurance-class') },
    { key: 'advisor-service', label: '顧問服務', action: () => navigate('/advisor-service') },
    { key: 'about', label: '关于MacroData', action: () => {
      if (location.pathname === '/') {
        document.getElementById('advisor-service')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/#advisor-service');
      }
    }},
  ];

  const isActive = (key) => currentPage === key;

  return (
    <>
      <header className={`fixed w-full top-0 z-50 backdrop-blur-xl border-b transition-all duration-500 shadow-lg ${isDark ? 'bg-slate-900/90 border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]' : 'bg-white/90 border-slate-200 shadow-slate-200/50'}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between h-24">
            {/* Logo and Title */}
            <div className="flex items-center gap-5 cursor-pointer group" onClick={() => navigate('/')}>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-3xl font-extrabold tracking-tighter leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>MacroData</h1>
                <p className={`text-[11px] font-bold tracking-[0.2em] uppercase mt-1.5 ${isDark ? 'text-blue-400/80' : 'text-blue-600/80'}`}>Insurance Intelligence</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden lg:flex items-center gap-12">
              {navLinks.map(link => (
                <button
                  key={link.key}
                  onClick={link.action}
                  className={`relative text-[15px] font-bold transition-colors group py-2 ${
                    isActive(link.key)
                      ? (isDark ? 'text-white' : 'text-blue-600')
                      : (isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-blue-600')
                  }`}
                >
                  {link.label}
                  <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 transition-transform origin-left ${
                    isActive(link.key) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}></span>
                </button>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle (optional) */}
              {onThemeToggle && (
                <button
                  onClick={onThemeToggle}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm ${isDark ? 'bg-slate-800 border-white/10 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              )}

              {/* Consultation Button */}
              <button
                onClick={() => setShowConsult(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-400 hover:to-teal-400 transition-all text-sm font-extrabold shadow-lg shadow-emerald-900/30 hover:shadow-emerald-600/30 hover:-translate-y-0.5"
              >
                <MessageCircle className="w-4 h-4" />
                產品諮詢
              </button>

              {/* Auth - only show dashboard when logged in */}
              {isAuthenticated && (
                <div className="flex items-center gap-4">
                  <span className={`text-sm hidden xl:inline font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Hi, {user?.full_name}</span>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all text-sm font-extrabold shadow-lg shadow-blue-900/40 hover:shadow-blue-600/40 hover:-translate-y-0.5"
                  >
                    {t('dashboard')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

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

      {/* Consultation Modal */}
      {showConsult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowConsult(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md p-8 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowConsult(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">產品諮詢</h3>
              <p className="text-sm text-slate-500 mt-1">歡迎透過以下方式聯繫我們的專業顧問</p>
            </div>

            <div className="space-y-4">
              {/* WeChat */}
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100 hover:bg-green-100 transition-colors">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM12.502 16.07c-.476.402-.476.402 0 0zM23.997 14.508c0-3.405-3.407-6.162-7.602-6.162s-7.602 2.757-7.602 6.162 3.407 6.162 7.602 6.162c.868 0 1.7-.126 2.477-.352a.72.72 0 01.595.082l1.573.92a.27.27 0 00.138.045c.133 0 .24-.11.24-.245 0-.06-.024-.12-.04-.177l-.322-1.224a.49.49 0 01.176-.55c1.598-1.146 2.765-2.93 2.765-4.661z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">微信 WeChat</p>
                  <p className="text-green-700 font-semibold text-base mt-0.5">MacroData_HK</p>
                </div>
              </div>

              {/* WhatsApp */}
              <a
                href="https://wa.me/85262645180"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors block"
              >
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">WhatsApp</p>
                  <p className="text-emerald-700 font-semibold text-base mt-0.5">+852 6264 5180</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NavBar;
