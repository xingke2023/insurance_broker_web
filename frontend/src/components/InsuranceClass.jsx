import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL, API_BASE_URL } from '../config';
import NavBar from './NavBar';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Share2,
  X,
  ChevronRight,
  ArrowRight,
  HelpCircle,
  FileText,
  Lightbulb,
  Award
} from 'lucide-react';

const InsuranceClass = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('港险问答'); // Default to Q&A for "Class"
  const [theme, setTheme] = useState('light');

  const CATEGORIES = [
    { id: '港险问答', name: '港險問答', icon: <HelpCircle className="w-4 h-4" /> },
    { id: '港险案例', name: '精選案例', icon: <Award className="w-4 h-4" /> },
    { id: '公司新闻', name: '市場動態', icon: <FileText className="w-4 h-4" /> },
    { id: '精英生活', name: '精英生活', icon: <Lightbulb className="w-4 h-4" /> }
  ];

  const QA_TAGS = [
    '全部', '基础认知', '重疾保障', '理财储蓄', '理赔售后',
    '避坑指南', '法律风险', '高赞回答', '实操攻略',
    '产品对比', '条款解读', '理赔案例', '税务筹划'
  ];
  const [activeTag, setActiveTag] = useState('全部');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCases, setTotalCases] = useState(0);
  const casesPerPage = 12;

  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);
      setError(null);
      setCurrentPage(1);

      try {
        const params = { page_size: 1 };
        if (activeCategory !== '全部') params.category = activeCategory;
        if (activeTag !== '全部') params.tags = activeTag;

        const countResponse = await axios.get(`${API_URL}/customer-cases/`, { params });
        let total = 0;
        if (countResponse.data.success) {
          total = countResponse.data.data.count || 0;
          setTotalCases(total);
        }

        const listParams = { 
            page_size: Math.max(total, 1000),
            ordering: '-created_at'
        };
        if (activeCategory !== '全部') listParams.category = activeCategory;
        if (activeTag !== '全部') listParams.tags = activeTag;

        const response = await axios.get(`${API_URL}/customer-cases/`, { params: listParams });

        if (response.data.success) {
          setCases(response.data.data.results || []);
        } else {
          setError('獲取數據失敗');
        }
      } catch (err) {
        console.error('獲取數據失敗:', err);
        setError('獲取數據失敗，請稍後重試');
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, [activeCategory, activeTag]);

  const handleViewDetail = async (caseItem) => {
    try {
      const response = await axios.get(`${API_URL}/customer-cases/${caseItem.id}/`);
      if (response.data.success) {
        setSelectedCase(response.data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('獲取詳情失敗:', err);
    }
  };

  const handleShare = (caseItem) => {
    const shareText = `【港險課堂】${caseItem.title}

查看詳情：${window.location.origin}/insurance-class`;
    if (navigator.share) {
      navigator.share({ title: caseItem.title, text: shareText }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareText).then(() => alert('鏈接已複製！'));
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-700 ${theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <NavBar theme="dark" activePage="insurance-class" onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-6 backdrop-blur-md">
            <BookOpen className="w-4 h-4" />
            <span>專業知識 · 真實案例 · 市場解析</span>
          </div>
          <h1 className={`text-4xl sm:text-5xl font-black mb-4 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            港險<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">智庫課堂</span>
          </h1>
          <p className={`text-lg font-light max-w-2xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            匯集全港主流保險知識，深入淺出解析避坑指南、條款解讀及真實理賠案例，助您成為精明的投保人。
          </p>
        </div>

        {/* Categories & Filter */}
        <div className="flex flex-col gap-6 mb-12">
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all font-bold text-sm lg:text-base border-2 ${
                  activeCategory === cat.id
                  ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/20'
                  : `${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`
                }`}
              >
                {cat.icon}
                {cat.name}
              </button>
            ))}
          </div>

          {activeCategory === '港险问答' && (
            <div className={`p-4 rounded-3xl border flex flex-wrap gap-2 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
              {QA_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    activeTag === tag
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                      : `${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={`rounded-[32px] h-64 animate-pulse ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white/5 rounded-[40px] border border-white/5">
            <HelpCircle className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {cases.slice((currentPage - 1) * casesPerPage, currentPage * casesPerPage).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleViewDetail(item)}
                  className={`group relative rounded-[32px] p-8 transition-all duration-500 cursor-pointer border-2 flex flex-col h-full ${
                    theme === 'dark' 
                      ? 'bg-white/5 border-white/5 hover:border-blue-500/50 hover:bg-slate-800/80' 
                      : 'bg-white border-slate-200 hover:border-blue-500/30 shadow-sm hover:shadow-2xl'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-xl border border-blue-500/20">
                      {item.category}
                    </span>
                    <Share2 
                      className="w-4 h-4 text-slate-500 hover:text-blue-500 transition-colors" 
                      onClick={(e) => { e.stopPropagation(); handleShare(item); }}
                    />
                  </div>
                  
                  <h3 className={`text-xl font-bold mb-4 leading-tight group-hover:text-blue-500 transition-colors line-clamp-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {item.title}
                  </h3>
                  
                  <p className={`text-sm font-light mb-8 line-clamp-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {(item.content || item.case_description || '').replace(/###?\s/g, '')}
                  </p>

                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-widest">Read Article</span>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600/10 text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalCases > casesPerPage && (
              <div className="mt-16 flex justify-center gap-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-6 py-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                >
                  Previous
                </button>
                <div className="flex items-center px-4 font-bold text-blue-500">
                  {currentPage} / {Math.ceil(totalCases / casesPerPage)}
                </div>
                <button
                  disabled={currentPage === Math.ceil(totalCases / casesPerPage)}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-6 py-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal */}
      {showDetailModal && selectedCase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
          <div className={`relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-[40px] border shadow-2xl ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-8 right-8 p-3 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-12">
              <div className="mb-8">
                <span className="px-4 py-1.5 bg-blue-600/10 text-blue-500 text-xs font-black uppercase tracking-widest rounded-full border border-blue-600/20 mb-6 inline-block">
                  {selectedCase.category}
                </span>
                <h2 className={`text-3xl md:text-4xl font-black leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {selectedCase.title}
                </h2>
              </div>

              {selectedCase.case_image && (
                <div className="mb-10 rounded-[32px] overflow-hidden border border-white/5 shadow-2xl">
                  <img src={`${API_BASE_URL}${selectedCase.case_image}`} alt="" className="w-full object-cover" />
                </div>
              )}

              <div className={`prose prose-lg max-w-none ${theme === 'dark' ? 'prose-invert prose-p:text-slate-400' : 'prose-slate'} mb-12`}>
                <div dangerouslySetInnerHTML={{ 
                  __html: (selectedCase.content || selectedCase.case_description || '')
                    .replace(/\n/g, '<br />')
                    .replace(/### (.*?)(<br \/>|$)/g, '<h3 class="text-2xl font-bold text-white mt-12 mb-6">$1</h3>')
                    .replace(/## (.*?)(<br \/>|$)/g, '<h2 class="text-3xl font-bold text-white mt-12 mb-8">$1</h2>')
                }} />
              </div>

              {selectedCase.key_points && selectedCase.key_points.length > 0 && (
                <div className={`p-10 rounded-[40px] border ${theme === 'dark' ? 'bg-blue-600/5 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-blue-500">
                    <CheckCircle2 className="w-6 h-6" />
                    知識要點總結
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedCase.key_points.map((point, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                          {idx + 1}
                        </div>
                        <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Decoration */}
      <div className={`fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent pointer-events-none ${theme === 'dark' ? 'opacity-100' : 'opacity-20'}`} />
    </div>
  );
};

export default InsuranceClass;
