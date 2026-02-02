import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../hooks/useAppNavigate';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { isInMiniProgram, redirectToMiniProgramLogin, redirectToMiniProgramLogout } from '../utils/miniProgramUtils';
import {
  UserCircleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CogIcon,
  BellIcon,
  ClockIcon,
  FolderIcon,
  GlobeAltIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  LightBulbIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

function Dashboard() {
  const onNavigate = useAppNavigate();
  const { user, logout, loading } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    nickname: ''  // 添加微信昵称字段
  });
  const [saving, setSaving] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(1);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // 页面加载状态
  const [isLoading, setIsLoading] = useState(true);

  // IP形象数据
  const [ipImage, setIpImage] = useState(null);

  // 是否正在执行退出登录
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 图片预览模态框
  const [showImagePreview, setShowImagePreview] = useState(false);

  // 模拟页面加载完成
  useEffect(() => {
    // 模拟数据加载过程
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // 800ms 后隐藏加载动画

    return () => clearTimeout(timer);
  }, []);

  // 获取用户保存的IP形象
  useEffect(() => {
    const fetchIpImage = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          console.log('❌ Dashboard IP形象: 未找到token');
          return;
        }

        console.log('🔍 Dashboard IP形象: 开始获取...');
        const response = await axios.get(`${API_BASE_URL}/api/ip-image/saved`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('✅ Dashboard IP形象: API响应', response.data);

        if (response.data.status === 'success' && response.data.has_saved) {
          console.log('✅ Dashboard IP形象: 设置图片数据', response.data.data);
          setIpImage(response.data.data);
        } else {
          console.log('⚠️ Dashboard IP形象: 未保存或状态异常', {
            status: response.data.status,
            has_saved: response.data.has_saved
          });
        }
      } catch (error) {
        console.error('❌ 获取IP形象失败:', error);
        console.error('❌ 错误详情:', error.response?.data);
      }
    };

    fetchIpImage();
  }, []);

  // 初始化微信 JS-SDK（用于小程序 WebView）
  useEffect(() => {
    console.log('🔧 [Dashboard] 初始化微信 JS-SDK');
    console.log('🔧 [Dashboard] window.wx 状态:', typeof window.wx);
    console.log('🔧 [Dashboard] window.wx.miniProgram 状态:', typeof window.wx?.miniProgram);

    // 检查是否在小程序环境
    if (typeof window !== 'undefined') {
      // 等待 JS-SDK 加载完成
      const checkWxReady = () => {
        if (typeof window.wx !== 'undefined' && window.wx.miniProgram) {
          console.log('✅ [Dashboard] 微信 JS-SDK 已就绪');
          console.log('✅ [Dashboard] wx.miniProgram 方法:', Object.keys(window.wx.miniProgram));
        } else {
          console.log('⏳ [Dashboard] 等待微信 JS-SDK 加载...');
          setTimeout(checkWxReady, 100);
        }
      };

      setTimeout(checkWxReady, 100);
    }
  }, []);

  // 检测登录状态（作为ProtectedRoute的额外保障）
  useEffect(() => {
    console.log('🔍 [Dashboard] useEffect 触发 - 检测登录状态');
    console.log('  - loading:', loading);
    console.log('  - user:', user ? `已登录(${user.id})` : '未登录');
    console.log('  - isLoggingOut:', isLoggingOut);

    // 等待 AuthContext loading 完成
    if (loading) {
      console.log('  ⏳ AuthContext 正在加载，跳过检测');
      return;
    }

    // 如果正在执行退出登录，不进行检测
    if (isLoggingOut) {
      console.log('  🚪 正在执行退出登录，跳过检测');
      return;
    }

    // 检查URL中是否有miniapp_token，如果有说明正在处理登录
    const urlParams = new URLSearchParams(window.location.search);
    const hasMiniappToken = urlParams.has('miniapp_token');
    if (hasMiniappToken) {
      console.log('  ⏳ URL中有miniapp_token，正在处理登录，跳过检测');
      return;
    }

    // 如果用户未登录（这应该被ProtectedRoute拦截，但作为额外保障）
    if (!user) {
      console.log('⚠️ [Dashboard] 检测到未登录状态（ProtectedRoute可能未生效）');
      const inMiniProgram = isInMiniProgram();
      console.log('  - 是否在小程序中:', inMiniProgram);

      if (inMiniProgram) {
        console.log('⚠️ [Dashboard] 小程序环境中未登录,准备跳转到登录页');
        // 等待 JS-SDK 加载完成后再跳转
        const timer = setTimeout(() => {
          console.log('🔄 [Dashboard] 执行跳转到小程序登录页');
          redirectToMiniProgramLogin();
        }, 500);

        return () => clearTimeout(timer);
      } else {
        console.log('⚠️ [Dashboard] 普通浏览器中未登录，强制跳转到首页');
        // 直接跳转到首页
        window.location.href = '/';
      }
    } else {
      console.log('✅ [Dashboard] 登录状态正常，继续显示页面');
    }
  }, [user, loading, isLoggingOut]);

  // 跳转到小程序支付
  const handleMiniProgramPay = async () => {
    try {
      // 调用后端生成 URL Scheme
      const response = await axios.post(`${API_BASE_URL}/api/wechat/generate-scheme`, {
        path: 'pages/index/index',
        query: ''
      });

      if (response.data.code === 200) {
        const scheme = response.data.data.scheme;

        // 检测是否在微信浏览器中
        const isWeChat = navigator.userAgent.toLowerCase().indexOf('micromessenger') !== -1;

        if (isWeChat) {
          // 在微信中直接跳转
          window.location.href = scheme;
        } else {
          // 不在微信中，提示用户
          alert('请在微信中打开此链接，或扫描小程序码\n\n小程序名称：保险计划书助手');
        }
      } else {
        alert(response.data.message || '生成跳转链接失败');
      }
    } catch (error) {
      console.error('生成小程序链接失败:', error);
      alert('生成跳转链接失败，请稍后重试\n\n您也可以在微信中搜索"保险计划书助手"小程序');
    }
  };

  // 跳转到小程序支付页面（WebView方式）
  const handleMiniPayInWebView = () => {
    // 检测是否在微信小程序的WebView中
    if (typeof wx !== 'undefined' && wx.miniProgram) {
      // 在小程序WebView中，可以直接跳转
      wx.miniProgram.navigateTo({
        url: '/pages/payment/payment?amount=1'
      });
    } else {
      // 不在小程序WebView中
      alert('此功能仅在微信小程序中打开的网页内可用\n\n请通过小程序首页的"打开网页版"按钮进入');
    }
  };

  // 检测是否在小程序环境中
  const isInMiniProgram = () => {
    // 方法1: 检查 wx.miniProgram (需要 JS-SDK)
    const hasMiniProgram = typeof window !== 'undefined' &&
                          typeof window.wx !== 'undefined' &&
                          typeof window.wx.miniProgram !== 'undefined';

    // 方法2: 检查 __wxjs_environment
    const hasWxEnvironment = typeof window !== 'undefined' &&
                            window.__wxjs_environment === 'miniprogram';

    // 方法3: 检查 user-agent
    const userAgent = navigator.userAgent || '';
    const hasWxUserAgent = userAgent.toLowerCase().indexOf('miniprogram') > -1;

    console.log('🔍 [Dashboard] 小程序环境检测:');
    console.log('  - window.wx 存在:', typeof window.wx !== 'undefined');
    console.log('  - window.wx.miniProgram 存在:', hasMiniProgram);
    console.log('  - __wxjs_environment:', window.__wxjs_environment);
    console.log('  - UserAgent:', userAgent);
    console.log('  - UserAgent包含miniprogram:', hasWxUserAgent);

    return hasMiniProgram || hasWxEnvironment || hasWxUserAgent;
  };

  // 检查用户是否有访问"计划书分步骤分析"的权限
  // 允许的用户组：'plan_analyzer' 或管理员（is_staff）
  const canAccessPlanAnalyzer = () => {
    if (!user) return false;

    // 管理员可以访问所有功能
    if (user.is_staff) return true;

    // 检查用户是否在 'plan_analyzer' 组
    if (user.groups && Array.isArray(user.groups)) {
      return user.groups.includes('plan_analyzer');
    }

    return false;
  };

  // 工具分类
  const toolCategories = [
    {
      category: '产品与计划书',
      tools: [
        { name: '港险产品对比', icon: ChartBarIcon, action: () => onNavigate('company-comparison'), color: 'from-purple-500 via-purple-600 to-pink-700', show: true },
        { name: '港险产品目录', icon: FolderIcon, action: () => onNavigate('insurance-products'), color: 'from-cyan-500 via-blue-600 to-indigo-700', show: true },
        { name: '香港各大保险公司名单', icon: UserGroupIcon, action: () => onNavigate('insurance-companies'), color: 'from-emerald-500 via-teal-600 to-cyan-700', show: true },
      ]
    },
    {
      category: '港险顾问与港险案例分析',
      tools: [
        { name: '港险顾问', icon: SparklesIcon, action: () => onNavigate('customer-cases'), color: 'from-blue-500 via-cyan-600 to-teal-700', show: true },
        { name: '港险案例汇编', icon: DocumentTextIcon, action: () => onNavigate('customer-case-library'), color: 'from-indigo-500 via-purple-600 to-pink-700', show: true },
      ]
    },
    {
      category: '港险销售赋能工具',
      tools: [
        { name: '计划书分析', icon: FolderIcon, action: () => onNavigate('plan-management'), color: 'from-blue-500 via-blue-600 to-indigo-700', show: true },
        { name: '计划书制作', icon: DocumentTextIcon, action: () => onNavigate('plan-builder'), color: 'from-purple-500 via-purple-600 to-pink-700', show: true },
        { name: '打造个人IP形象', icon: SparklesIcon, action: () => onNavigate('ip-image-generator'), color: 'from-pink-500 via-rose-600 to-rose-700', show: true },
        { name: '宣传图制作(基于个人IP)', icon: DocumentTextIcon, action: () => onNavigate('content-image-generator'), color: 'from-rose-500 via-red-600 to-red-700', show: true },
        { name: '视频制作', icon: SparklesIcon, action: () => onNavigate('video-projects'), color: 'from-red-500 via-orange-600 to-orange-700', show: true },
        { name: '个性化语音制作', icon: DevicePhoneMobileIcon, action: () => onNavigate('text-to-speech'), color: 'from-orange-500 via-amber-600 to-amber-700', show: true },
        { name: '我的图片库', icon: FolderIcon, action: () => onNavigate('media-library'), color: 'from-emerald-500 via-green-600 to-green-700', show: true },
        { name: '公众号写作及排版工具', icon: GlobeAltIcon, action: () => window.open('https://write.xingke888.com/editor', '_blank'), color: 'from-amber-500 via-yellow-600 to-yellow-700', show: true },
        { name: '产品海报分析工具', icon: SparklesIcon, action: () => onNavigate('poster-analyzer'), color: 'from-green-500 via-teal-600 to-teal-700', show: true },
        { name: 'PDF页脚擦除工具', icon: DocumentTextIcon, action: () => onNavigate('pdf-footer-remover'), color: 'from-teal-500 via-cyan-600 to-cyan-700', show: true },
        { name: 'PDF工具箱 Pro', icon: DocumentTextIcon, action: () => onNavigate('pdf-footer-remover2'), color: 'from-purple-500 via-fuchsia-600 to-pink-700', show: true },
      ]
    }
  ];

  // 打开编辑模态框
  const openEditModal = () => {
    console.log('🔍 [Dashboard] 打开编辑模态框');
    console.log('🔍 [Dashboard] 用户信息:', user);
    console.log('🔍 [Dashboard] 微信信息:', user?.wechat);
    console.log('🔍 [Dashboard] 微信昵称:', user?.wechat?.nickname);

    setEditForm({
      full_name: user?.full_name || '',
      email: user?.email || '',
      nickname: user?.wechat?.nickname || ''  // 加载微信昵称
    });
    setShowEditModal(true);
  };

  // 保存个人资料
  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      // 确保axios包含认证header
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('请先登录');
        return;
      }

      // 1. 更新基本资料（姓名、邮箱）
      const profileResponse = await axios.put(
        `${API_BASE_URL}/api/auth/profile/`,
        {
          full_name: editForm.full_name,
          email: editForm.email
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // 2. 如果有微信用户信息且昵称有变化，更新微信昵称
      if (user?.wechat && editForm.nickname && editForm.nickname !== user.wechat.nickname) {
        await axios.post(
          `${API_BASE_URL}/api/wechat/update-profile`,
          {
            nickname: editForm.nickname
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
      }

      // 更新本地用户信息
      const updatedUser = {
        ...user,
        email: profileResponse.data.user.email,
        full_name: profileResponse.data.user.full_name,
        first_name: profileResponse.data.user.first_name,
        last_name: profileResponse.data.user.last_name,
      };

      // 如果更新了微信昵称，同步到本地
      if (user?.wechat && editForm.nickname) {
        updatedUser.wechat = {
          ...user.wechat,
          nickname: editForm.nickname
        };
      }

      localStorage.setItem('user', JSON.stringify(updatedUser));

      // 关闭模态框并提示成功
      setShowEditModal(false);
      alert('个人资料更新成功');

      // 刷新页面以更新用户信息
      window.location.reload();
    } catch (error) {
      console.error('保存个人资料失败:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || '更新失败，请重试';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // 处理退出登录点击
  const handleLogoutClick = () => {
    console.log('==========================================');
    console.log('🚪 [Dashboard] 点击退出登录按钮');
    console.log('🚪 [Dashboard] 当前用户:', user);
    console.log('🚪 [Dashboard] 用户类型:', user?.wechat ? '微信用户' : '网站用户');

    // 设置退出登录标志，防止登录状态检测干扰
    setIsLoggingOut(true);
    console.log('🚪 [Dashboard] 已设置 isLoggingOut = true');

    // 判断是否为微信用户
    const isWeChatUser = user?.wechat !== undefined && user?.wechat !== null;
    console.log('🚪 [Dashboard] isWeChatUser:', isWeChatUser);

    // 检测是否在小程序中
    const inMiniProgram = isInMiniProgram();
    console.log('🚪 [Dashboard] isInMiniProgram():', inMiniProgram);
    console.log('🚪 [Dashboard] window.wx:', typeof window.wx);
    console.log('🚪 [Dashboard] window.wx.miniProgram:', typeof window.wx?.miniProgram);

    // 如果是微信用户且在小程序环境中，使用小程序退出方式
    if (isWeChatUser && inMiniProgram) {
      console.log('🚪 [Dashboard] ✅ 条件满足：微信用户 + 小程序环境');
      console.log('🚪 [Dashboard] 执行小程序退出登录流程');

      // 使用工具函数处理小程序退出登录，传递 logout 函数来清除 Web 端存储
      redirectToMiniProgramLogout(
        logout, // Web 端的 logout 函数
        () => {
          // 如果跳转失败，显示错误提示
          console.log('🚪 [Dashboard] ❌ 小程序退出登录失败');
          alert('退出登录失败，请关闭页面后重新打开小程序');
          setIsLoggingOut(false); // 重置标志
        }
      );
    } else {
      // 微信用户在普通浏览器中，或非微信用户（网站注册用户），使用网站退出方式
      console.log('🚪 [Dashboard] ⚠️ 条件不满足，使用网站退出方式');
      console.log('🚪 [Dashboard] 执行网站退出登录');
      logout();
      onNavigate('home');
    }
    console.log('==========================================');
  };

  // 微信支付
  const handleWechatPay = async () => {
    try {
      setPaymentLoading(true);

      // 调用后端创建订单
      const response = await axios.post(`${API_BASE_URL}/api/payment/create-jsapi`, {
        amount: paymentAmount,
        description: '充值服务'
      });

      if (response.data.code === 200) {
        const paymentData = response.data.data.payment;

        // 检查微信JS-SDK是否已加载
        if (typeof WeixinJSBridge === 'undefined') {
          alert('请在微信内置浏览器中打开，或者确保微信JS-SDK已加载');
          return;
        }

        // 调用微信支付
        WeixinJSBridge.invoke(
          'getBrandWCPayRequest',
          {
            appId: paymentData.appId,
            timeStamp: paymentData.timeStamp,
            nonceStr: paymentData.nonceStr,
            package: paymentData.package,
            signType: paymentData.signType,
            paySign: paymentData.paySign
          },
          function (res) {
            if (res.err_msg === 'get_brand_wcpay_request:ok') {
              alert('支付成功！');
              setShowPaymentModal(false);
            } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
              alert('支付已取消');
            } else {
              alert('支付失败：' + res.err_msg);
            }
          }
        );
      } else {
        alert(response.data.message || '创建订单失败');
      }
    } catch (error) {
      console.error('支付错误:', error);
      alert(error.response?.data?.message || '支付失败，请重试');
    } finally {
      setPaymentLoading(false);
    }
  };

  // 加载动画组件
  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
          <p className="mt-4 text-gray-600 text-sm font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-200 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-4 sm:py-5">
        {/* Welcome Section - Minimal Style */}
        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-0.5 drop-shadow-sm">
            你好，{user?.wechat?.nickname || user?.full_name}
          </h2>
          <p className="text-xs text-gray-600">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>

        {/* IP Image Section - Above Quick Actions */}
        <div className="mb-4">
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 border border-purple-200/50 rounded-xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all">
            <div className="flex items-center gap-3">
              {ipImage ? (
                <div className="relative group cursor-pointer" onClick={() => setShowImagePreview(true)}>
                  <img
                    src={ipImage.generated_image_url}
                    alt="个人IP形象"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shadow-md ring-2 ring-white transition-all group-hover:ring-purple-400 group-hover:shadow-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-xl transition-all flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 shadow-md ring-2 ring-white flex items-center justify-center">
                  <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">个人IP形象</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2">
                  {ipImage ? (ipImage.prompt || '专属IP形象') : '打造专属个人IP形象，让您的品牌更具辨识度'}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {ipImage ? (
                    <>
                      <button
                        onClick={() => onNavigate('ip-image-generator')}
                        className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all text-xs sm:text-sm font-medium shadow-sm hover:shadow-md"
                      >
                        <SparklesIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        打造个人IP
                      </button>
                      <button
                        onClick={() => onNavigate('membership-plans')}
                        className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-white border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-all text-xs sm:text-sm font-medium shadow-sm"
                      >
                        <CreditCardIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        会员计划
                      </button>
                      <button
                        onClick={() => onNavigate('settings')}
                        className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-xs sm:text-sm font-medium shadow-sm"
                      >
                        <CogIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        设置
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onNavigate('ip-image-generator')}
                        className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all text-xs sm:text-sm font-medium shadow-sm hover:shadow-md"
                      >
                        <SparklesIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        立即创建
                      </button>
                      <button
                        onClick={() => onNavigate('membership-plans')}
                        className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-white border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-all text-xs sm:text-sm font-medium shadow-sm"
                      >
                        <CreditCardIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        会员计划
                      </button>
                      <button
                        onClick={() => onNavigate('settings')}
                        className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-xs sm:text-sm font-medium shadow-sm"
                      >
                        <CogIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        设置
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Quick Actions - Categorized */}
          {toolCategories.map((category, catIndex) => {
            // 计算当前分类之前所有工具的数量，用于序号连续编号
            let previousToolsCount = 0;
            for (let i = 0; i < catIndex; i++) {
              previousToolsCount += toolCategories[i].tools.filter(t => t.show).length;
            }

            return (
              <div key={catIndex}>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 drop-shadow-sm flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                  {category.category}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                  {category.tools.filter(tool => tool.show).map((tool, toolIndex) => (
                    <button
                      key={toolIndex}
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
                      {/* 序号标签 - 左上角四分之一圆 */}
                      <div className="absolute top-0 left-0 bg-white/20 backdrop-blur-sm rounded-br-full w-8 h-8 flex items-center justify-center z-10">
                        <span className="text-xs font-bold text-white drop-shadow-md -translate-x-0.5 -translate-y-0.5">{previousToolsCount + toolIndex + 1}</span>
                      </div>
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/10 to-transparent transition-opacity ${tool.disabled ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'} duration-300`}></div>
                      <tool.icon className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 text-white flex-shrink-0 transition-transform group-hover:scale-110 drop-shadow-lg" />
                      <h3 className="relative z-10 text-xs sm:text-sm font-semibold text-white tracking-tight leading-tight drop-shadow-md">
                        {tool.name}
                      </h3>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Profile Section - Clean Table Style */}
        <div className="mt-4 bg-white border border-gray-200/80 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-xl">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
              个人信息
            </h3>
          </div>

          <div className="p-3">
            {/* 微信用户信息 */}
            {user?.wechat && (
              <div className="mb-2 pb-2 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  {user.wechat.avatar ? (
                    <img
                      src={user.wechat.avatar}
                      alt="微信头像"
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-blue-100"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-blue-100 shadow-sm"
                    style={{display: user.wechat.avatar ? 'none' : 'flex'}}
                  >
                    {user.wechat.nickname?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-1">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900">{user.wechat.nickname}</p>
                      <span className="px-1 py-0.5 bg-green-50 text-green-600 text-[10px] sm:text-xs rounded font-medium border border-green-200">
                        微信
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">微信登录</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center py-1 border-b border-gray-50">
                <label className="text-[10px] sm:text-xs font-medium text-gray-500 w-16 sm:w-20">姓名</label>
                <p className="text-xs sm:text-sm text-gray-900 flex-1">{user?.full_name}</p>
              </div>
              <div className="flex items-center py-1 border-b border-gray-50">
                <label className="text-[10px] sm:text-xs font-medium text-gray-500 w-16 sm:w-20">邮箱</label>
                <p className="text-xs sm:text-sm text-gray-900 flex-1 break-all">{user?.email}</p>
              </div>
              {user?.wechat && (
                <>
                  <div className="flex items-center py-1 border-b border-gray-50">
                    <label className="text-[10px] sm:text-xs font-medium text-gray-500 w-16 sm:w-20">微信昵称</label>
                    <p className="text-xs sm:text-sm text-gray-900 flex-1">{user.wechat.nickname}</p>
                  </div>
                  {user.wechat.phone && (
                    <div className="flex items-center py-1 border-b border-gray-50">
                      <label className="text-[10px] sm:text-xs font-medium text-gray-500 w-16 sm:w-20">手机号</label>
                      <p className="text-xs sm:text-sm text-gray-900 flex-1">{user.wechat.phone}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-gray-100">
              <button
                onClick={openEditModal}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow"
              >
                编辑个人资料
              </button>
            </div>
          </div>
        </div>

        {/* 退出登录按钮 */}
        <div className="mt-3 flex justify-center">
          <button
            onClick={handleLogoutClick}
            className="px-4 py-1.5 text-xs sm:text-sm bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-red-600 hover:border-red-300 transition-colors font-medium shadow-sm"
          >
            退出登录
          </button>
        </div>
      </div>

      {/* 微信支付模态框 */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white rounded-t-xl">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></div>
                微信支付
              </h3>
            </div>
            <div className="p-4">

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    支付金额（元）
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg sm:text-xl font-semibold text-center"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-blue-900">微信安全支付</p>
                      <p className="text-[10px] sm:text-xs text-blue-700 mt-0.5">请在微信浏览器中打开此页面</p>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] sm:text-xs text-gray-500 space-y-1 bg-gray-50 rounded-lg p-2">
                  <p>• 支付前请确认金额正确</p>
                  <p>• 支付完成后请勿重复支付</p>
                  <p>• 如有问题请联系客服</p>
                </div>
              </div>

              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={paymentLoading}
                  className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium text-xs sm:text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleWechatPay}
                  disabled={paymentLoading || paymentAmount <= 0}
                  className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 font-medium text-xs sm:text-sm shadow-sm"
                >
                  {paymentLoading ? (
                    <span>支付中...</span>
                  ) : (
                    <>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.5 2A5.5 5.5 0 003 7.5v9A5.5 5.5 0 008.5 22h7a5.5 5.5 0 005.5-5.5v-9A5.5 5.5 0 0015.5 2h-7zm0 2h7A3.5 3.5 0 0119 7.5v9a3.5 3.5 0 01-3.5 3.5h-7A3.5 3.5 0 015 16.5v-9A3.5 3.5 0 018.5 4z"/>
                      </svg>
                      <span>微信支付</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑个人资料模态框 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white rounded-t-xl">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                编辑个人资料
              </h3>
            </div>

            <div className="p-4">
              <div className="space-y-3">
                {/* 微信昵称 - 仅在微信用户时显示 */}
                {user?.wechat && (
                  <div>
                    <label className="block text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      微信昵称
                    </label>
                    <input
                      type="text"
                      value={editForm.nickname}
                      onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                      placeholder="请输入微信昵称"
                      maxLength={100}
                    />
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      修改后将在小程序和网页中同步显示
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    姓名
                  </label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    placeholder="请输入姓名"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    placeholder="请输入邮箱"
                  />
                </div>
              </div>

              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                  className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium text-xs sm:text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs sm:text-sm shadow-sm"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 图片预览模态框 */}
      {showImagePreview && ipImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImagePreview(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full">
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowImagePreview(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 图片容器 */}
            <div
              className="bg-white rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={ipImage.generated_image_url}
                alt="个人IP形象大图"
                className="w-full h-auto object-contain max-h-[75vh]"
              />

              {/* 图片信息 */}
              {ipImage.prompt && (
                <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 border-t border-gray-200">
                  <p className="text-xs sm:text-sm text-gray-700 text-center">{ipImage.prompt}</p>
                </div>
              )}
            </div>

            {/* 提示文字 */}
            <p className="text-white text-center mt-3 text-xs sm:text-sm">点击任意位置关闭</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
