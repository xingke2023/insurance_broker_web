import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import CompanyIconDisplay from './CompanyIconDisplay';
import NavBar from './NavBar';
import {
  Search,
  ArrowLeft,
  Filter,
  TrendingUp,
  Shield,
  CircleDollarSign,
  Building2,
  LayoutGrid,
  List as ListIcon,
  Sparkles,
  Award,
  Star,
  Loader2,
  Check,
} from 'lucide-react';

const InsuranceProducts = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');

  // Filters
  const [filterCompanyId, setFilterCompanyId] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  // Categories Configuration
  const productCategories = [
    { value: 'all', label: '全部产品', icon: <LayoutGrid className="w-4 h-4" />, gradient: 'from-blue-400 to-indigo-500' },
    { value: '危疾', label: '危疾保障', icon: <Shield className="w-4 h-4" />, gradient: 'from-rose-400 to-pink-500' },
    { value: '储蓄', label: '储蓄理财', icon: <CircleDollarSign className="w-4 h-4" />, gradient: 'from-blue-500 to-cyan-500' },
    { value: '养老', label: '退休养老', icon: <TrendingUp className="w-4 h-4" />, gradient: 'from-emerald-400 to-teal-500' },
  ];

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [companiesRes, productsRes] = await Promise.all([
          axios.get(`${API_URL}/insurance-companies/`),
          axios.get(`${API_URL}/insurance-products/`)
        ]);

        setCompanies(companiesRes.data.data || companiesRes.data);
        setAllProducts(productsRes.data.data || productsRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      if (filterCompanyId !== 'all' && product.company?.id !== parseInt(filterCompanyId)) return false;
      if (selectedCategory !== 'all') {
        if (!product.product_category || !product.product_category.includes(selectedCategory)) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = product.product_name?.toLowerCase().includes(query);
        const matchCompany = product.company?.name?.toLowerCase().includes(query);
        if (!matchName && !matchCompany) return false;
      }
      return true;
    });
  }, [allProducts, filterCompanyId, selectedCategory, searchQuery]);

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] animate-pulse ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100/40'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] animate-pulse ${theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100/40'}`} style={{ animationDelay: '2s' }}></div>
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
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        
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

        .company-card-selected {
          background: ${theme === 'dark' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)'};
          border-color: #2563eb;
          box-shadow: 0 0 20px rgba(37, 99, 235, 0.2);
        }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .text-gradient {
          background: linear-gradient(to right, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* NavBar is fixed to 'dark' as requested */}
      <NavBar theme="dark" activePage="insurance-products" onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />

      <main className="relative z-10 max-w-[1600px] mx-auto px-6 pt-28 pb-20">
        <div className="mb-8 animate-fade-up text-center lg:text-left">
          <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-4 tracking-tighter leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            港險各公司熱門產品<span className="text-gradient">智能數據庫</span>
          </h2>

          {/* Company Quick Selector - Enhanced Design */}
          <div className="mt-4">
            <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-4 pb-4 px-1">
              {companies.map(company => {
                const isSelected = filterCompanyId === String(company.id);
                return (
                  <button
                    key={company.id}
                    onClick={() => setFilterCompanyId(isSelected ? 'all' : String(company.id))}
                    className={`group relative flex-shrink-0 w-28 h-16 sm:w-44 sm:h-24 rounded-2xl overflow-hidden transition-all duration-500 flex items-center justify-center ${
                      isSelected
                      ? 'company-card-selected scale-[1.05] z-10 bg-white ring-4 ring-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.3)]'
                      : `opacity-90 hover:opacity-100 hover:scale-[1.02] bg-white border border-slate-200 shadow-lg`
                    }`}
                    title={company.name}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <CompanyIconDisplay
                        iconUrl={company.icon}
                        companyName={company.name}
                        imgSizeClasses="w-full h-full max-h-[50%] sm:max-h-[60%] object-contain filter drop-shadow-sm"
                        textClasses="text-lg sm:text-2xl font-black text-slate-800"
                        fallbackBgClasses="bg-slate-100 rounded-xl"
                      />
                    </div>
                    {/* Hover Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-blue-500/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg z-20">
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Category Selector - More Elegant */}
          <div className="mt-8 flex flex-wrap gap-3 animate-fade-up delay-100">
            {productCategories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all font-bold text-sm lg:text-base border-2 ${
                  selectedCategory === cat.value
                  ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/20'
                  : `${theme === 'dark' 
                      ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`
                }`}
              >
                <div className={`p-1.5 rounded-lg ${selectedCategory === cat.value ? 'bg-white/20' : 'bg-blue-500/10 text-blue-500'}`}>
                  {cat.icon}
                </div>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full">
          {/* Header for Results */}
          <div className="flex items-center justify-between mb-8 animate-fade-up delay-200">
            <h3 className={`text-2xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              <LayoutGrid className="w-6 h-6 text-blue-500" />
              符合條件的產品
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                {filteredProducts.length} 款
              </span>
            </h3>
            
            <div className="flex items-center gap-2 glass-card p-1.5 rounded-xl">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <ListIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Product Grid/List - Full Width */}
          <div className="w-full">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="glass-card rounded-[32px] h-40 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" : "space-y-6"}>
                {filteredProducts.map((product, idx) => (
                  <div
                    key={product.id}
                    onClick={() => navigate(`/insurance-product/${product.id}`)}
                    className={`group relative glass-card rounded-[32px] p-6 transition-all duration-500 cursor-pointer animate-fade-up hover:scale-[1.03] hover:shadow-2xl border-2 ${theme === 'dark' ? 'hover:border-blue-500/50 hover:bg-slate-800/80' : 'hover:border-blue-500/30 hover:bg-white'}`}
                    style={{ animationDelay: `${(idx % 12) * 0.05}s` }}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'bg-white/5 text-blue-400 border border-white/5' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                          {product.company?.name}
                        </div>
                        {product.is_withdrawal && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider rounded-xl border border-emerald-500/20">
                            <CircleDollarSign className="w-3 h-3" />
                            Flexible Withdrawal
                          </div>
                        )}
                      </div>
                      
                      <h3 className={`text-2xl font-bold mb-2 leading-tight group-hover:text-blue-500 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} title={product.product_name}>
                        {product.product_name}
                      </h3>
                    </div>
                    
                    {/* Hover Glow Effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br from-blue-600/0 via-transparent to-blue-600/0 opacity-0 group-hover:opacity-10 transition-all duration-700 pointer-events-none rounded-[32px]`} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-[48px] p-24 text-center animate-fade-up">
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <Search className="w-12 h-12 text-slate-500" />
                </div>
                <h3 className={`text-3xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>未找到匹配產品</h3>
                <p className={`text-lg mb-10 max-w-md mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  嘗試調整您的搜索詞或篩選條件，或聯繫我們的專業顧問獲取幫助。
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterCompanyId('all');
                    setSelectedCategory('all');
                  }}
                  className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/30 hover:-translate-y-1"
                >
                  重置所有篩選
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Decoration */}
      <div className={`fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent pointer-events-none ${theme === 'dark' ? 'opacity-100' : 'opacity-20'}`} />

    </div>
  );
};

export default InsuranceProducts;
