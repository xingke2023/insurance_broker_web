import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import {
  ArrowLeft,
  Building2,
  Shield,
  ChevronRight,
  Info,
  Globe,
  Hash,
  Package,
  Star,
  ExternalLink,
  MessageSquare,
  Newspaper,
  Calendar,
  Eye
} from 'lucide-react';

const InsuranceCompanyDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [products, setProducts] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('products');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('正在获取公司详情，ID:', id);
        console.log('API URL:', `${API_URL}/insurance-companies/${id}/`);

        // 获取公司信息
        const companyResponse = await axios.get(`${API_URL}/insurance-companies/${id}/`);
        console.log('公司信息响应:', companyResponse.data);
        setCompany(companyResponse.data.data || companyResponse.data);

        // 获取公司产品
        console.log('正在获取公司产品...');
        const productsResponse = await axios.get(`${API_URL}/insurance-products/?company=${id}`);
        console.log('产品列表响应:', productsResponse.data);
        setProducts(productsResponse.data.results || productsResponse.data);

        // 获取公司新闻
        try {
          console.log('正在获取公司新闻...');
          const newsResponse = await axios.get(`${API_URL}/company-news/?company=${id}`);
          console.log('新闻列表响应:', newsResponse.data);
          // 处理DRF分页格式: {count, next, previous, results: [...]}
          setNews(newsResponse.data.results || newsResponse.data || []);
        } catch (newsError) {
          console.error('获取公司新闻失败:', newsError);
          setNews([]);
        }

        console.log('所有数据加载完成');
      } catch (error) {
        console.error('获取公司详情失败:', error);
        console.error('错误详情:', {
          message: error.message,
          response: error.response,
          status: error.response?.status,
          data: error.response?.data
        });
        setError(error.response?.data?.message || error.message || '加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50 flex items-center justify-center relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-400/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="text-center relative z-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-slate-500 mt-4 font-bold tracking-tight">深度探索公司档案中...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-400/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[32px] shadow-2xl p-8 text-center border border-white relative z-10">
          <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Info className="w-10 h-10 text-rose-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">
            {error ? '加载失败' : '公司不存在'}
          </h3>
          <p className="text-slate-500 mb-8 font-medium">
            {error || '抱歉，我们无法找到该保险公司的详细信息。'}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/10"
            >
              重试加载
            </button>
            <button
              onClick={() => navigate('/insurance-products')}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10"
            >
              <ArrowLeft className="w-5 h-5" />
              返回产品库
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50 pb-20 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-400/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-fuchsia-400/5 rounded-full blur-[80px] pointer-events-none"></div>

      {/* 顶部导航 */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/insurance-products')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回产品库</span>
          </button>
          
          <div className="flex items-center gap-3">
             <button className="p-2.5 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
               <Globe className="w-5 h-5" />
             </button>
          </div>
        </div>
      </nav>

      {/* 公司 Hero */}
      <header className={`bg-gradient-to-br ${company.color_gradient || 'from-slate-800 to-slate-900'} pt-16 pb-32 text-white relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 skew-x-[-20deg] translate-x-1/3"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row gap-10 items-center md:items-start text-center md:text-left">
            <div className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-[40px] p-6 border border-white/20 shadow-2xl flex items-center justify-center">
              {company.icon && (company.icon.startsWith('http') || company.icon.startsWith('/')) ? (
                <img src={company.icon} alt={company.name} className="max-w-full max-h-full object-contain filter brightness-0 invert" />
              ) : (
                <span className="text-6xl">{company.icon || '🏦'}</span>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">{company.name}</h1>
              <p className="text-xl md:text-2xl text-white/70 font-medium mb-8 leading-relaxed max-w-2xl">
                {company.name_en || 'Professional Insurance & Wealth Management Services'}
              </p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-blue-300" />
                  <span className="text-sm font-bold tracking-wider uppercase">Code: {company.code}</span>
                </div>
                <div className="px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-300" />
                  <span className="text-sm font-bold tracking-wider uppercase">{products.length} 款在线产品</span>
                </div>
                {company.flagship_product && (
                  <div className="px-5 py-2.5 bg-amber-500/20 backdrop-blur-md rounded-2xl border border-amber-400/20 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-300" />
                    <span className="text-sm font-bold tracking-wider uppercase">明星产品: {company.flagship_product}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 左侧：公司档案 */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8">
              <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                公司档案
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">官方全称</label>
                  <div className="text-lg font-bold text-slate-900">{company.name}</div>
                </div>

                {company.name_en && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">英文名称</label>
                    <div className="text-lg font-bold text-slate-900">{company.name_en}</div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">简介与描述</label>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    {company.description || '作为香港领先的保险机构之一，该公司致力于为客户提供全面的风险保障与财富增值方案，在香港市场拥有卓越的品牌声誉与雄厚的资金实力。'}
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-100 flex gap-4">
                  <button className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                    <Globe className="w-4 h-4" />
                    访问官网
                  </button>
                  <button className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all">
                    <ExternalLink className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 客服信息卡片 */}
            <div className="bg-indigo-600 rounded-[32px] p-8 text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold">寻求专业建议？</h3>
              </div>
              <p className="text-indigo-100 mb-8 leading-relaxed">
                我们的资深理财顾问可以为您深度解读 {company.name} 的产品细节，并为您量身定制保障计划。
              </p>
              <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-lg">
                立即咨询顾问
              </button>
            </div>
          </div>

          {/* 右侧：产品矩阵与新闻 */}
          <div className="lg:col-span-8 space-y-8">
            {/* 标签页切换 */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-2 flex gap-2">
              <button
                onClick={() => setActiveTab('products')}
                className={`flex-1 py-3 px-6 rounded-3xl font-bold transition-all ${
                  activeTab === 'products'
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-4 h-4 inline mr-2" />
                在线产品 ({products.length})
              </button>
              <button
                onClick={() => setActiveTab('news')}
                className={`flex-1 py-3 px-6 rounded-3xl font-bold transition-all ${
                  activeTab === 'news'
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Newspaper className="w-4 h-4 inline mr-2" />
                公司动态 ({news.length})
              </button>
            </div>

            {/* 产品列表 */}
            {activeTab === 'products' && (
              <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-600" />
                    </div>
                    在线产品矩阵
                  </h2>
                  <div className="px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100 text-xs font-bold text-slate-500">
                    共计 {products.length} 款产品
                  </div>
                </div>

              {products.length === 0 ? (
                <div className="py-20 text-center">
                  <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold text-lg">暂无已收录的产品数据</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => navigate(`/insurance-product/${product.id}`)}
                      className="group bg-slate-50/50 rounded-3xl p-6 border border-slate-100 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[180px]"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-blue-600 uppercase tracking-widest border border-slate-100">
                            {product.product_category || '综合保障'}
                          </span>
                          {product.is_withdrawal && (
                             <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                          {product.product_name}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between mt-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">基准缴费</span>
                          <span className="text-sm font-bold text-slate-700">HK${parseFloat(product.annual_premium).toLocaleString()}</span>
                        </div>
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm border border-slate-100 group-hover:border-slate-900 group-hover:-translate-y-1">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            )}

            {/* 新闻列表 */}
            {activeTab === 'news' && (
              <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Newspaper className="w-5 h-5 text-blue-600" />
                    </div>
                    公司新闻与动态
                  </h2>
                  <div className="px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100 text-xs font-bold text-slate-500">
                    共计 {news.length} 条
                  </div>
                </div>

                {news.length === 0 ? (
                  <div className="py-20 text-center">
                    <Newspaper className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold text-lg">暂无新闻动态</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {news.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.url) {
                            // 增加浏览次数
                            axios.post(`${API_URL}/company-news/${item.id}/increment_view/`).catch(err => console.error(err));
                            window.open(item.url, '_blank');
                          }
                        }}
                        className={`group bg-slate-50/50 rounded-3xl p-6 border border-slate-100 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 ${item.url ? 'cursor-pointer' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-blue-600 uppercase tracking-widest border border-slate-100">
                            {item.content_type_display}
                          </span>
                          {item.is_featured && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-3">
                          {item.title}
                        </h3>

                        {item.description && (
                          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-4">
                            {item.published_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{item.published_date}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              <span>{item.view_count}</span>
                            </div>
                          </div>
                          {item.url && (
                            <ExternalLink className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 底部声明 */}
            <div className="bg-slate-100 rounded-3xl p-6 text-center border border-slate-200/50">
              <p className="text-xs text-slate-500 font-medium">
                免责声明：以上产品信息仅供参考，不构成任何形式的要约或投资建议。具体条款及保障范围请以保险公司签发的正式保单契约为准。
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default InsuranceCompanyDetail;