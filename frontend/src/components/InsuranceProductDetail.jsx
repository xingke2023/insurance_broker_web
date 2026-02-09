import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  ArrowLeft,
  ChevronRight,
  Info,
  Shield,
  Target,
  TrendingUp,
  FileText,
  PieChart as PieChartIcon,
  CheckCircle2,
  Download,
  Calendar,
  DollarSign,
  Users,
  Search,
  BookOpen,
  Maximize2,
  Briefcase,
  MessageSquare,
  ExternalLink,
  Newspaper,
  BookText,
  Video,
  FileDown
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const InsuranceProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const iframeRef = React.useRef(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/insurance-products/${id}/`);
        const data = response.data.data;
        setProduct(data);
        
        if (data.plans && data.plans.length > 0) {
          const recommended = data.plans.find(p => p.is_recommended);
          setSelectedPlanId(recommended ? recommended.id : data.plans[0].id);
        }
      } catch (error) {
        console.error('获取产品详情失败:', error);
        setError('获取产品详情失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const selectedPlan = useMemo(() => {
    if (!product || !product.plans) return null;
    return product.plans.find(p => p.id === selectedPlanId);
  }, [product, selectedPlanId]);

  const surrenderValues = useMemo(() => {
    if (!selectedPlan || !selectedPlan.surrender_value_table) return [];
    try {
      const table = JSON.parse(selectedPlan.surrender_value_table);
      return Array.isArray(table) ? table : (table.standard || []);
    } catch (e) {
      console.error('解析退保价值表失败:', e);
      return [];
    }
  }, [selectedPlan]);

  // 清理 HTML 研究报告中的残余注释标签
  const cleanedResearchReport = useMemo(() => {
    if (!product?.product_research_report) return '';
    let report = product.product_research_report.trim();
    // 移除开头可能出现的 --> 源代码残余
    if (report.startsWith('-->')) {
      report = report.substring(3).trim();
    }
    // 移除可能存在的其他破碎注释
    report = report.replace(/^[^<]*-->/, '').trim();
    return report;
  }, [product]);

  const deathBenefits = useMemo(() => {
    return surrenderValues.slice(0, 30).map(row => ({
      year: `第${row.year}年`,
      guaranteed: parseFloat(row.guaranteed || 0),
      total: parseFloat(row.total || 0),
      premiums: parseFloat(row.premiums_paid || 0)
    }));
  }, [surrenderValues]);

  const chartData = useMemo(() => {
    return surrenderValues.slice(0, 30).map(row => ({
      year: `${row.year}年`,
      total: parseFloat(row.total || 0),
      guaranteed: parseFloat(row.guaranteed || 0),
      nonGuaranteed: parseFloat(row.non_guaranteed || 0)
    }));
  }, [surrenderValues]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50 flex items-center justify-center relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-400/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="text-center relative z-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-slate-500 mt-4 font-bold tracking-tight">精心准备产品详情中...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-400/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[32px] shadow-2xl p-8 text-center border border-white relative z-10">
          <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Info className="w-10 h-10 text-rose-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">{error || '产品不存在'}</h3>
          <p className="text-slate-500 mb-8 font-medium">抱歉，我们无法找到您请求的产品信息。</p>
          <button
            onClick={() => navigate('/insurance-products')}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10"
          >
            <ArrowLeft className="w-5 h-5" />
            返回产品列表
          </button>
        </div>
      </div>
    );
  }

  const company = product.company;

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
            <span>产品库</span>
          </button>
          
          <div className="hidden md:flex items-center gap-6">
            {['overview', 'plans', 'details', 'report'].map((tab) => (
              (tab !== 'report' || product.product_research_report) && (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-1 py-5 border-b-2 transition-all font-medium text-sm ${
                    activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'overview' ? '产品概览' : tab === 'plans' ? '保障方案' : tab === 'details' ? '详细条款' : '研究报告'}
                </button>
              )
            ))}
          </div>

          <div className="flex items-center gap-3">
            {product.plan_pdf_base64 && (
              <button className="p-2.5 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
                <Download className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero 区域 */}
      <header className={`relative overflow-hidden bg-gradient-to-br ${company.color_gradient || 'from-slate-800 to-slate-900'} pt-12 pb-24 text-white`}>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-[-20deg] translate-x-1/4"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center md:text-left">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/20 flex items-center justify-center shadow-2xl">
              {company.icon && (company.icon.startsWith('http') || company.icon.startsWith('/')) ? (
                <img src={company.icon} alt={company.name} className="max-w-full max-h-full object-contain filter brightness-0 invert" />
              ) : (
                <span className="text-5xl">{company.icon || '🏦'}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 tracking-tight">{product.product_name}</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-white/90">
                <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-xl text-sm font-bold border border-white/10">{company.name}</span>
                <span className="px-4 py-1.5 bg-blue-500/30 backdrop-blur-md rounded-xl text-sm font-bold border border-blue-400/20">{product.product_category || '保险产品'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-20">
        <div className="w-full space-y-8">

          {/* 官方链接和宣传材料 - 所有tab都显示 */}
          {(product.url || (product.promotions && product.promotions.length > 0)) && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
              {/* 官方网站链接 */}
              {product.url && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-blue-600" />
                    官方产品页面
                  </h3>
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-700 rounded-2xl font-bold hover:bg-blue-100 transition-all group"
                  >
                    <span>访问官方网站</span>
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </div>
              )}

              {/* 宣传材料列表 */}
              {product.promotions && product.promotions.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    产品资料与宣传
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {product.promotions.map((promo) => {
                      const icons = {
                        news: <Newspaper className="w-5 h-5" />,
                        brochure: <BookText className="w-5 h-5" />,
                        guide: <BookOpen className="w-5 h-5" />,
                        video: <Video className="w-5 h-5" />,
                        article: <FileText className="w-5 h-5" />,
                        other: <FileText className="w-5 h-5" />
                      };

                      const colors = {
                        news: 'bg-blue-50 text-blue-700 border-blue-100',
                        brochure: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                        guide: 'bg-purple-50 text-purple-700 border-purple-100',
                        video: 'bg-rose-50 text-rose-700 border-rose-100',
                        article: 'bg-amber-50 text-amber-700 border-amber-100',
                        other: 'bg-slate-50 text-slate-700 border-slate-100'
                      };

                      const colorClass = colors[promo.content_type] || colors.other;
                      const icon = icons[promo.content_type] || icons.other;

                      return (
                        <div
                          key={promo.id}
                          className={`p-5 rounded-2xl border ${colorClass} hover:shadow-md transition-all group`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="shrink-0 mt-0.5">{icon}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm mb-1 line-clamp-2">{promo.title}</h4>
                              <p className="text-xs opacity-75">{promo.content_type_display}</p>
                              {promo.published_date && (
                                <p className="text-xs opacity-60 mt-1">
                                  {new Date(promo.published_date).toLocaleDateString('zh-CN')}
                                </p>
                              )}
                            </div>
                          </div>

                          {promo.description && (
                            <p className="text-xs opacity-75 mb-3 line-clamp-2">{promo.description}</p>
                          )}

                          <div className="flex gap-2">
                            {promo.url && (
                              <a
                                href={promo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white rounded-xl text-xs font-bold hover:shadow-sm transition-all"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                查看
                              </a>
                            )}
                            {promo.pdf_file && (
                              <a
                                href={promo.pdf_file}
                                download
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white rounded-xl text-xs font-bold hover:shadow-sm transition-all"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                                下载
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 产品概览页签 */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* 适用人群 - 横向分布，不占用独立宽度 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">适保年龄</div>
                    <div className="text-lg font-black text-slate-900">
                      {product.target_age_min !== null ? `${product.target_age_min} - ${product.target_age_max} 岁` : '全年龄段'}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
                    <Briefcase className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">人生阶段</div>
                    <div className="text-lg font-black text-slate-900">{product.target_life_stage || '全阶段适用'}</div>
                  </div>
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                    <DollarSign className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">收入建议</div>
                    <div className="text-lg font-black text-slate-900">
                      {product.min_annual_income ? `HK$${parseFloat(product.min_annual_income).toLocaleString()}+` : '灵活配置'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 核心特点 */}
              {product.features && product.features.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-600" /> 核心产品优势
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {product.features.map((feature, idx) => (
                      <div key={idx} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                        <div className="text-blue-600 font-black text-2xl mb-2">0{idx + 1}</div>
                        <div className="text-slate-700 font-bold leading-relaxed">{feature}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 产品概要 */}
              {product.plan_summary && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <FileText className="w-6 h-6 text-slate-600" /> 产品深度概括
                  </h2>
                  <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: product.plan_summary }} />
                </div>
              )}
            </div>
          )}

          {/* 收益方案页签 */}
          {activeTab === 'plans' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-blue-600" /> 收益预测模型
                </h2>
                <div className="flex p-1 bg-slate-100 rounded-2xl">
                  {product.plans?.map(p => (
                    <button key={p.id} onClick={() => setSelectedPlanId(p.id)} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${selectedPlanId === p.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {p.payment_period}年期
                    </button>
                  ))}
                </div>
              </div>

              {selectedPlan && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100">
                    <div className="text-xs font-bold text-blue-600 uppercase mb-1">预期回报率</div>
                    <div className="text-3xl font-black text-slate-900">{selectedPlan.irr_rate || '5.8'}% <span className="text-sm font-normal text-slate-400">IRR</span></div>
                  </div>
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">年度保费</div>
                    <div className="text-3xl font-black text-slate-900">HK${parseFloat(selectedPlan.annual_premium).toLocaleString()}</div>
                  </div>
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">总缴费额</div>
                    <div className="text-3xl font-black text-slate-900">HK${parseFloat(selectedPlan.total_premium || 0).toLocaleString()}</div>
                  </div>
                </div>
              )}

              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(v) => `${(v/10000).toFixed(0)}w`} />
                    <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                    <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 研究报告页签 - 全屏宽度展示 */}
          {activeTab === 'report' && (
            <div className="w-full bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <Search className="w-7 h-7 text-blue-600" /> 专业研究报告分析
                </h2>
                <div className="flex gap-4">
                   <button onClick={() => {
                     const win = window.open('', '_blank');
                     win.document.write(product.product_research_report);
                     win.document.close();
                   }} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all">
                     <Maximize2 className="w-4 h-4" /> 全屏互动模式
                   </button>
                </div>
              </div>
                              <div className="w-full bg-white">
                                <iframe 
                                  ref={iframeRef}
                                  title="Research Report"
                                  srcDoc={cleanedResearchReport}
                                  className="w-full h-[900px] border-none"
                                  sandbox="allow-scripts allow-same-origin allow-popups"
                                />
                              </div>
              
            </div>
          )}

          {/* 详细条款 */}
          {activeTab === 'details' && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                            <BookOpen className="w-7 h-7 text-blue-600" /> 产品契约与详细条款
                          </h2>
                          <div className="prose prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: product.plan_details }} />
                        </div>
                      )}
            
                      {/* 底部预约咨询 - 重新加入并优化为宽幅设计 */}
                      <div className="mt-12 bg-gradient-to-r from-blue-600 via-indigo-700 to-blue-800 rounded-[40px] p-10 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
                        {/* 装饰性背景 */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-all duration-700"></div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                          <div className="text-center md:text-left">
                            <h3 className="text-3xl font-black mb-3 tracking-tight">对此产品感兴趣？</h3>
                            <p className="text-blue-100 text-lg font-medium max-w-xl">
                              我们的资深理财顾问为您提供专属的保障方案规划和深度解析，让您选得明白，买得放心。
                            </p>
                          </div>
                          <div className="shrink-0 w-full md:w-auto">
                            <button className="w-full md:w-auto px-10 py-5 bg-white text-blue-700 rounded-2xl font-black text-lg hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3">
                              <MessageSquare className="w-6 h-6" />
                              立即预约专业咨询
                            </button>
                          </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-center md:justify-start">
                          <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                            <span>Professional Insurance Consulting</span>
                            <span className="w-1.5 h-1.5 bg-white/20 rounded-full"></span>
                            <span>Expert Financial Planning</span>
                            <span className="w-1.5 h-1.5 bg-white/20 rounded-full"></span>
                            <span>Trusted Service</span>
                          </div>
                        </div>
                      </div>
            
                    </div>
                  </div>
                </div>
              );
            };
            
            export default InsuranceProductDetail;
            