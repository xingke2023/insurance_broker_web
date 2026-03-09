import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../hooks/useAppNavigate';
import { API_BASE_URL } from '../config';
import {
  ArrowLeft,
  Search,
  Copy,
  Star,
  StarOff,
  Sparkles,
  ChevronRight,
  MessageCircle,
  TrendingUp,
  BookOpen,
  Loader2,
  CheckCheck,
  X,
} from 'lucide-react';

const PRODUCT_TYPE_LABELS = {
  all: '全部产品',
  savings: '储蓄险',
  critical_illness: '重疾险',
  annuity: '年金险',
  whole_life: '终身寿险',
};

const CUSTOMER_TYPE_LABELS = {
  all: '全部客群',
  young_family: '年轻家庭',
  high_net_worth: '高净值',
  education: '子女教育',
  retirement: '养老规划',
  asset_inheritance: '资产传承',
};

function SalesTechniques() {
  const { user } = useAuth();
  const onNavigate = useAppNavigate();

  const [categories, setCategories] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // null = 全部
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all | featured | favorites
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // AI 生成
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiCopied, setAiCopied] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const searchTimer = useRef(null);

  const getToken = () => localStorage.getItem('access_token');

  // 加载分类
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/sales-scripts/categories/`)
      .then(r => r.json())
      .then(data => setCategories(data))
      .catch(console.error);
  }, []);

  // 加载话术
  useEffect(() => {
    loadScripts();
  }, [selectedCategoryId, activeTab]);

  const loadScripts = async (search = searchText) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategoryId) params.set('category_id', selectedCategoryId);
      if (activeTab === 'featured') params.set('featured', '1');
      if (search) params.set('search', search);

      const headers = {};
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url;
      if (activeTab === 'favorites') {
        url = `${API_BASE_URL}/api/sales-scripts/favorites/`;
      } else {
        url = `${API_BASE_URL}/api/sales-scripts/?${params}`;
      }

      const res = await fetch(url, { headers });
      const data = await res.json();
      setScripts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setScripts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (val) => {
    setSearchText(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadScripts(val), 400);
  };

  const handleCopy = async (script) => {
    const text = `【客户问题】\n${script.customer_question}\n\n【推荐话术】\n${script.script_content}${script.follow_up_question ? `\n\n【跟进问题】\n${script.follow_up_question}` : ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(script.id);
      setTimeout(() => setCopiedId(null), 2000);
      // 记录复制次数
      fetch(`${API_BASE_URL}/api/sales-scripts/${script.id}/copy/`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleFavorite = async (script) => {
    const token = getToken();
    if (!token) { alert('请先登录'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/sales-scripts/${script.id}/favorite/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setScripts(prev => prev.map(s =>
        s.id === script.id ? { ...s, is_favorited: data.is_favorited } : s
      ));
    } catch (e) {
      console.error(e);
    }
  };

  const handleExpand = (script) => {
    setExpandedId(prev => prev === script.id ? null : script.id);
    fetch(`${API_BASE_URL}/api/sales-scripts/${script.id}/view/`, { method: 'POST' });
  };

  const handleAiGenerate = async () => {
    if (!aiInput.trim()) return;
    const token = getToken();
    if (!token) { alert('请先登录后使用AI功能'); return; }
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sales-scripts/ai-generate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ customer_description: aiInput }),
      });
      const data = await res.json();
      if (data.success) {
        setAiResult(data);
      } else {
        alert(data.error || 'AI生成失败');
      }
    } catch (e) {
      alert('网络错误，请重试');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiCopy = async () => {
    if (!aiResult) return;
    const text = `【推荐话术】\n${aiResult.script_content}${aiResult.follow_up_question ? `\n\n【跟进问题】\n${aiResult.follow_up_question}` : ''}`;
    await navigator.clipboard.writeText(text);
    setAiCopied(true);
    setTimeout(() => setAiCopied(false), 2000);
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            返回首页
          </button>
          <div className="h-4 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-rose-400" />
            <span className="font-semibold text-white">港险营销话术</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setShowAiPanel(!showAiPanel); setAiResult(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showAiPanel
                  ? 'bg-violet-600 text-white'
                  : 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
              }`}
            >
              <Sparkles size={14} />
              AI 生成话术
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* 左侧分类栏 */}
        <aside className="w-52 flex-shrink-0">
          <div className="sticky top-20 space-y-1">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider px-3 mb-3">场景分类</p>

            {/* 全部 */}
            <button
              onClick={() => { setSelectedCategoryId(null); setActiveTab('all'); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                selectedCategoryId === null && activeTab === 'all'
                  ? 'bg-rose-500/20 text-rose-300 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <BookOpen size={14} />
                全部话术
              </span>
              <span className="text-xs text-gray-600">{scripts.length > 0 && !selectedCategoryId ? scripts.length : ''}</span>
            </button>

            {/* 精选 */}
            <button
              onClick={() => { setSelectedCategoryId(null); setActiveTab('featured'); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'featured'
                  ? 'bg-amber-500/20 text-amber-300 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Star size={14} />
              精选话术
            </button>

            {/* 我的收藏 */}
            {user && (
              <button
                onClick={() => { setSelectedCategoryId(null); setActiveTab('favorites'); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeTab === 'favorites'
                    ? 'bg-blue-500/20 text-blue-300 font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Star size={14} fill={activeTab === 'favorites' ? 'currentColor' : 'none'} />
                我的收藏
              </button>
            )}

            <div className="my-3 border-t border-gray-800" />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider px-3 mb-2">按场景筛选</p>

            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategoryId(cat.id); setActiveTab('all'); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                  selectedCategoryId === cat.id
                    ? 'bg-rose-500/20 text-rose-300 font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </span>
                <span className="text-xs text-gray-600 flex-shrink-0">{cat.script_count}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 min-w-0">

          {/* AI 生成面板 */}
          {showAiPanel && (
            <div className="mb-6 bg-gradient-to-br from-violet-900/40 to-purple-900/30 border border-violet-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-violet-400" />
                <h3 className="font-semibold text-violet-200">AI 生成个性化话术</h3>
                <button onClick={() => setShowAiPanel(false)} className="ml-auto text-gray-500 hover:text-gray-300">
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-gray-400 mb-3">描述客户的具体情况，AI 为你生成针对性话术</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAiGenerate()}
                  placeholder="例：客户40岁男性，企业主，担心港险不安全，已有内地保险"
                  className="flex-1 bg-gray-900/60 border border-violet-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-400 transition-colors"
                />
                <button
                  onClick={handleAiGenerate}
                  disabled={aiLoading || !aiInput.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  {aiLoading ? '生成中...' : '生成'}
                </button>
              </div>

              {/* AI 结果 */}
              {aiResult && (
                <div className="mt-4 space-y-3">
                  <div className="bg-gray-900/60 rounded-xl p-4">
                    <p className="text-xs text-violet-400 font-medium mb-2">推荐话术</p>
                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{aiResult.script_content}</p>
                  </div>
                  {aiResult.follow_up_question && (
                    <div className="bg-gray-900/60 rounded-xl p-4">
                      <p className="text-xs text-amber-400 font-medium mb-2">跟进问题</p>
                      <p className="text-sm text-gray-200">{aiResult.follow_up_question}</p>
                    </div>
                  )}
                  {aiResult.key_points?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {aiResult.key_points.map((p, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded-full">{p}</span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={handleAiCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600/50 hover:bg-violet-600 text-white text-sm rounded-lg transition-colors"
                  >
                    {aiCopied ? <CheckCheck size={14} /> : <Copy size={14} />}
                    {aiCopied ? '已复制' : '复制话术'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 搜索栏 + 标题 */}
          <div className="flex items-center gap-3 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">
                {activeTab === 'favorites' ? '我的收藏' : activeTab === 'featured' ? '精选话术' : selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : '全部话术'}
              </h2>
              {selectedCategory && (
                <p className="text-xs text-gray-500 mt-0.5">{selectedCategory.description}</p>
              )}
            </div>
            <div className="ml-auto relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchText}
                onChange={e => handleSearch(e.target.value)}
                placeholder="搜索话术..."
                className="bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 w-52 transition-colors"
              />
              {searchText && (
                <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* 话术列表 */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-gray-600" />
            </div>
          ) : scripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-600">
              <MessageCircle size={40} className="mb-3 opacity-30" />
              <p className="text-sm">暂无话术</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scripts.map(script => (
                <ScriptCard
                  key={script.id}
                  script={script}
                  isExpanded={expandedId === script.id}
                  isCopied={copiedId === script.id}
                  onExpand={() => handleExpand(script)}
                  onCopy={() => handleCopy(script)}
                  onFavorite={() => handleFavorite(script)}
                  isLoggedIn={!!user}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ScriptCard({ script, isExpanded, isCopied, onExpand, onCopy, onFavorite, isLoggedIn }) {
  const productLabel = PRODUCT_TYPE_LABELS[script.applicable_product_type] || script.applicable_product_type;
  const customerLabel = CUSTOMER_TYPE_LABELS[script.applicable_customer_type] || script.applicable_customer_type;

  return (
    <div className={`bg-gray-900 border rounded-2xl overflow-hidden transition-all duration-200 ${
      isExpanded ? 'border-rose-500/40' : 'border-gray-800 hover:border-gray-700'
    }`}>
      {/* 卡片头部 - 点击展开/收起 */}
      <div
        className="flex items-start gap-3 px-5 py-4 cursor-pointer"
        onClick={onExpand}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
              {script.category_icon} {script.category_name}
            </span>
            {script.is_featured && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                ⭐ 精选
              </span>
            )}
            {productLabel !== '全部产品' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {productLabel}
              </span>
            )}
            {customerLabel !== '全部客群' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                {customerLabel}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-white text-sm">{script.title}</h3>
          <p className="text-xs text-gray-500 mt-1 truncate">客户常问：{script.customer_question}</p>
        </div>
        <ChevronRight
          size={16}
          className={`text-gray-600 flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
        />
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-800 pt-4">
          {/* 客户常问 */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              客户常说
            </p>
            <p className="text-sm text-gray-300 italic">"{script.customer_question}"</p>
          </div>

          {/* 推荐话术 */}
          <div className="bg-gradient-to-br from-rose-900/20 to-red-900/10 border border-rose-500/20 rounded-xl p-4">
            <p className="text-xs text-rose-400 font-medium mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              推荐话术
            </p>
            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{script.script_content}</p>
          </div>

          {/* 跟进问题 */}
          {script.follow_up_question && (
            <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-4">
              <p className="text-xs text-amber-400 font-medium mb-2 flex items-center gap-1.5">
                <TrendingUp size={12} />
                跟进问题
              </p>
              <p className="text-sm text-amber-200/80">{script.follow_up_question}</p>
            </div>
          )}

          {/* 话术要点 */}
          {script.key_points?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-600">要点：</span>
              {script.key_points.map((point, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded-full border border-gray-700">
                  {point}
                </span>
              ))}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isCopied
                  ? 'bg-green-600 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {isCopied ? <CheckCheck size={14} /> : <Copy size={14} />}
              {isCopied ? '已复制' : '一键复制话术'}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onFavorite(); }}
              title={isLoggedIn ? (script.is_favorited ? '取消收藏' : '收藏') : '登录后可收藏'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
                script.is_favorited
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-gray-800 text-gray-400 hover:text-amber-400 border border-gray-700'
              }`}
            >
              <Star size={14} fill={script.is_favorited ? 'currentColor' : 'none'} />
              {script.is_favorited ? '已收藏' : '收藏'}
            </button>

            <span className="ml-auto text-xs text-gray-700">
              {script.copy_count > 0 && `${script.copy_count} 次复制`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesTechniques;
