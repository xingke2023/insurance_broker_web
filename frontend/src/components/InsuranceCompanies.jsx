import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import CompanyIconDisplay from './CompanyIconDisplay';
import NavBar from './NavBar';
import {
  ArrowLeft,
  Building2,
  Globe,
  Newspaper,
  Search,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Award
} from 'lucide-react';

function InsuranceCompanies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}/insurance-companies/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = response.data.data || response.data;
      const companiesArray = Array.isArray(data) ? data : [];
      setCompanies(companiesArray.filter(company => company.is_active));
    } catch (err) {
      console.error('获取保险公司列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const query = searchQuery.toLowerCase();
      return (
        company.name?.toLowerCase().includes(query) ||
        company.name_en?.toLowerCase().includes(query) ||
        company.description?.toLowerCase().includes(query)
      );
    });
  }, [companies, searchQuery]);

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] animate-pulse ${theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100/40'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] animate-pulse ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100/40'}`} style={{ animationDelay: '2s' }}></div>
        <div className={`absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full blur-[120px] ${theme === 'dark' ? 'bg-slate-900/40' : 'bg-slate-200/40'}`}></div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .glass-card {
          background: ${theme === 'dark' 
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)' 
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%)'};
          backdrop-filter: blur(20px);
          border: 1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(203, 213, 225, 0.5)'};
          box-shadow: ${theme === 'dark' 
            ? '0 20px 50px -12px rgba(0, 0, 0, 0.5)' 
            : '0 10px 25px -5px rgba(0, 0, 0, 0.05)'};
        }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .text-gradient {
          background: linear-gradient(to right, ${theme === 'dark' ? '#60a5fa, #a78bfa' : '#4f46e5, #7c3aed'});
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* NavBar is fixed to 'dark' as requested */}
      <NavBar theme="dark" activePage="insurance-companies" onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />

      <main className="relative z-10 max-w-[1600px] mx-auto px-6 pt-40 pb-20">
        {/* Page Hero */}
        <div className="mb-16 animate-fade-up text-center lg:text-left">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-6 backdrop-blur-md mx-auto lg:mx-0 ${theme === 'dark' ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border border-indigo-200 text-indigo-600'}`}>
            <ShieldCheck className="w-4 h-4" />
            <span>持牌監管認證 · 權威數據來源</span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-4xl">
              <h2 className={`text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tighter leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                香港主流<span className="text-gradient">保險公司名錄</span>
              </h2>
              <p className={`text-xl lg:text-2xl font-light leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                匯聚全港主流持牌保險公司，提供權威、透明的公司背景及產品概覽。
                <br className="hidden md:block" />
                目前深度收錄 <span className={`font-bold ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>{companies.length}</span> 家保險巨頭。
              </p>
            </div>
          </div>
        </div>

        {/* Companies Grid/List */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <div key={i} className="glass-card rounded-[32px] h-40 animate-pulse" />
            ))}
          </div>
        ) : filteredCompanies.length > 0 ? (
          <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8" : "space-y-4"}>
            {filteredCompanies.map((company, idx) => {
              return (
                <div
                  key={company.id}
                  onClick={() => navigate(`/insurance-company/${company.id}`)}
                  className={`group relative bg-white border border-slate-200 rounded-[32px] overflow-hidden transition-all duration-500 cursor-pointer animate-fade-up hover:scale-[1.05] shadow-lg hover:shadow-2xl`}
                  style={{ animationDelay: `${(idx % 12) * 0.05}s` }}
                >
                  {/* Pure Logo Area - More compact logo display */}
                  <div className={`h-28 sm:h-40 flex items-center justify-center transition-all duration-500 relative bg-white`}>
                    <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-indigo-500 to-transparent"></div>
                    <CompanyIconDisplay
                      iconUrl={company.icon}
                      companyName={company.name}
                      imgSizeClasses="w-full h-full max-h-[50%] sm:max-h-[60%] object-contain filter drop-shadow-md"
                      textClasses="text-xl md:text-2xl font-black text-slate-800"
                      fallbackBgClasses="bg-slate-100 rounded-2xl"
                    />
                    {company.website_url && (
                      <div className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-900/5 backdrop-blur-md flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                          <Globe className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  
                  {/* Hover Glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none rounded-[32px]`} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card rounded-[48px] p-24 text-center animate-fade-up">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Building2 className="w-12 h-12 text-slate-500" />
            </div>
            <h3 className={`text-3xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>未找到匹配的公司</h3>
            <p className={`text-lg mb-10 max-w-md mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              嘗試調整您的搜索詞。
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30 hover:-translate-y-1"
            >
              重置搜索
            </button>
          </div>
        )}
      </main>

      {/* Footer Decoration */}
      <div className={`fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent pointer-events-none ${theme === 'dark' ? 'opacity-100' : 'opacity-20'}`} />

    </div>
  );
}

export default InsuranceCompanies;
