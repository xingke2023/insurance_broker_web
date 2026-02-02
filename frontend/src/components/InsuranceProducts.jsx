import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import {
  Search,
  ChevronRight,
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
  Star
} from 'lucide-react';

const InsuranceProducts = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCompanyId, setFilterCompanyId] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list');

  // Categories Configuration
  const productCategories = [
    { value: 'all', label: '全部产品', icon: <LayoutGrid className="w-4 h-4" />, gradient: 'from-violet-400 to-purple-500' },
    { value: '危疾', label: '危疾保障', icon: <Shield className="w-4 h-4" />, gradient: 'from-rose-400 to-pink-500' },
    { value: '储蓄', label: '储蓄理财', icon: <CircleDollarSign className="w-4 h-4" />, gradient: 'from-amber-400 to-orange-500' },
    { value: '养老', label: '退休养老', icon: <TrendingUp className="w-4 h-4" />, gradient: 'from-blue-400 to-cyan-500' },
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
        setAllProducts(productsRes.data.results || productsRes.data);
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-violet-50/40">
      {/* Custom Fonts & Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700;800&display=swap');

        * {
          font-family: 'Manrope', -apple-system, sans-serif;
        }

        .font-serif {
          font-family: 'Cormorant Garamond', Georgia, serif;
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideRight {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-fade-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }

        .animate-scale-in {
          animation: scaleIn 0.5s ease-out forwards;
        }

        .animate-slide-right {
          animation: slideRight 0.6s ease-out forwards;
        }

        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }

        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .glass-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
        }

        .shimmer-effect {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.8) 50%,
            transparent 100%
          );
          background-size: 1000px 100%;
        }

        .gradient-border {
          position: relative;
        }

        .gradient-border::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
      `}</style>

      {/* Floating Orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-violet-300/30 to-purple-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-br from-blue-300/30 to-cyan-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-pink-300/20 to-rose-400/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-bl from-violet-100/50 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-blue-100/40 via-transparent to-transparent" />

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 glass-effect border-b border-white/40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-105 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="hidden md:block">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider">Premium Collection</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                香港保险产品库
              </h1>
            </div>
          </div>

          <div className="flex-1 max-w-xl mx-8 relative group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="搜索产品或保险公司..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-5 py-4 glass-card border border-white/60 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 transition-all shadow-sm hover:shadow-md"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="w-12 h-12 rounded-2xl glass-card border border-white/60 flex items-center justify-center text-slate-600 hover:text-violet-600 hover:border-violet-300 transition-all shadow-sm hover:shadow-md"
            >
              {viewMode === 'grid' ? <ListIcon className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto px-8 py-16">
        {/* Hero Section - Compact */}
        <div className="mb-10 opacity-0 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-100 to-purple-100 border border-violet-200/50">
                <Award className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-700">精选产品库</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-6 text-sm text-slate-600">
                <span><span className="font-bold text-violet-600">{allProducts.length}</span> 款产品</span>
                <span><span className="font-bold text-blue-600">{companies.length}</span> 家公司</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="mb-8 space-y-4 opacity-0 animate-fade-up delay-200">
          {/* Company Filter */}
          <div className="glass-card rounded-2xl p-5 border border-white/60 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-700">保险公司</span>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={() => setFilterCompanyId('all')}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shadow-sm ${
                  filterCompanyId === 'all'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'glass-card border border-white/60 text-slate-600 hover:border-violet-300 hover:shadow-md'
                }`}
              >
                全部公司
              </button>
              {companies.map(company => (
                <button
                  key={company.id}
                  onClick={() => setFilterCompanyId(String(company.id))}
                  className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shadow-sm ${
                    filterCompanyId === String(company.id)
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                    : 'glass-card border border-white/60 text-slate-600 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  {company.name}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="glass-card rounded-2xl p-5 border border-white/60 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white shadow-md">
                <Filter className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-700">产品类别</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {productCategories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm ${
                    selectedCategory === cat.value
                    ? `bg-gradient-to-r ${cat.gradient} text-white shadow-lg`
                    : 'glass-card border border-white/60 text-slate-600 hover:shadow-md hover:border-violet-300'
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid/List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="glass-card rounded-3xl h-96 animate-pulse border border-white/60" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product, idx) => (
                <div
                  key={product.id}
                  onClick={() => navigate(`/insurance-product/${product.id}`)}
                  className={`group relative glass-card rounded-3xl p-8 border border-white/60 hover:border-violet-300 hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-500 cursor-pointer overflow-hidden opacity-0 animate-scale-in delay-${Math.min((idx + 4) * 100, 600)}`}
                >
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-purple-500/0 to-blue-500/0 group-hover:from-violet-500/5 group-hover:via-purple-500/5 group-hover:to-blue-500/5 transition-all duration-500 rounded-3xl" />

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                      <div className="w-16 h-16 rounded-2xl glass-card border border-white/80 p-3 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                        {product.company?.icon && (product.company.icon.startsWith('http') || product.company.icon.startsWith('/')) ? (
                          <img src={product.company.icon} alt={product.company.name} className="max-w-full max-h-full object-contain" />
                        ) : (
                          <span className="text-3xl">{product.company?.icon || '🏢'}</span>
                        )}
                      </div>
                      {product.is_withdrawal && (
                        <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-xs font-bold rounded-full shadow-lg shadow-emerald-500/30">
                          可灵活提取
                        </div>
                      )}
                    </div>

                    {/* Company Name */}
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      {product.company?.name}
                    </div>

                    {/* Product Name */}
                    <h3 className="text-2xl font-bold text-slate-800 mb-6 group-hover:text-violet-600 transition-colors duration-300 leading-tight min-h-[4rem] line-clamp-2">
                      {product.product_name}
                    </h3>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-6 border-t border-slate-200/60">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">类别</span>
                        <span className="text-sm font-bold text-slate-700">
                          {product.product_category || '综合保障'}
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300 shadow-lg shadow-purple-500/30">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Decorative Shimmer */}
                  <div className="absolute top-0 left-0 w-full h-full shimmer-effect opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ animation: 'shimmer 2s infinite' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product, idx) => (
                <div
                  key={product.id}
                  onClick={() => navigate(`/insurance-product/${product.id}`)}
                  className={`group relative glass-card rounded-2xl p-6 border border-white/60 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300 cursor-pointer flex items-center gap-8 overflow-hidden opacity-0 animate-fade-up delay-${Math.min((idx + 4) * 100, 600)}`}
                >
                  {/* Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-purple-500/0 to-blue-500/0 group-hover:from-violet-500/5 group-hover:via-purple-500/5 group-hover:to-transparent transition-all duration-500" />

                  {/* Icon */}
                  <div className="relative w-16 h-16 rounded-2xl glass-card border border-white/80 p-3 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 shrink-0">
                    {product.company?.icon && (product.company.icon.startsWith('http') || product.company.icon.startsWith('/')) ? (
                      <img src={product.company.icon} alt="" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-2xl">{product.company?.icon || '🏢'}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 relative min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {product.company?.name}
                      </span>
                      {product.is_withdrawal && (
                        <span className="px-3 py-1 bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-xs font-bold rounded-full shadow-md shadow-emerald-500/30">
                          可提取
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-violet-600 transition-colors duration-300 truncate">
                      {product.product_name}
                    </h3>
                  </div>

                  {/* Category & Arrow */}
                  <div className="hidden sm:flex items-center gap-8 relative shrink-0">
                    <div className="flex flex-col items-end gap-1 min-w-[100px]">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">类别</span>
                      <span className="text-sm font-bold text-slate-700">
                        {product.product_category || '综合保障'}
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white group-hover:translate-x-1 transition-all duration-300 shadow-lg shadow-purple-500/30">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="py-32 text-center glass-card rounded-3xl border border-white/60 shadow-xl opacity-0 animate-fade-up delay-400">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Search className="w-12 h-12 text-violet-400" />
            </div>
            <h3 className="text-3xl font-bold text-slate-800 mb-3">未找到相关产品</h3>
            <p className="text-slate-600 mb-12 max-w-md mx-auto leading-relaxed">
              抱歉，我们无法找到符合您当前筛选条件的产品。
              <br />
              请尝试更换搜索词或重置筛选条件。
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCompanyId('all');
                setSelectedCategory('all');
              }}
              className="px-10 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-105"
            >
              重置所有筛选
            </button>
          </div>
        )}
      </div>

      {/* Bottom Decoration */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-violet-400/30 to-transparent pointer-events-none" />
    </div>
  );
};

export default InsuranceProducts;
