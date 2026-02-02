import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import {
  UserIcon,
  CurrencyDollarIcon,
  UsersIcon,
  HeartIcon,
  ChartBarIcon,
  SparklesIcon,
  XMarkIcon,
  ArrowLeftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const AIConsultant = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 表单数据
  const [formData, setFormData] = useState({
    age: '',
    gender: '男',
    annual_income: '',
    life_stage: '',
    family_status: '单身',
    has_children: false,
    children_count: 0,
    children_ages: '',
    main_concerns: [],
    budget: '',
    special_requirements: ''
  });

  // 人生阶段选项
  const lifeStageOptions = [
    { value: '扶幼保障期', label: '扶幼保障期 (25-35岁)', description: '建立家庭，子女出生' },
    { value: '收入成长期', label: '收入成长期 (30-40岁)', description: '事业上升，收入增长' },
    { value: '责任高峰期', label: '责任高峰期 (40-50岁)', description: '子女教育，家庭责任重' },
    { value: '责任递减期', label: '责任递减期 (50-60岁)', description: '子女独立，准备退休' },
    { value: '退休期', label: '退休期 (60岁以上)', description: '退休生活，健康管理' }
  ];

  // 家庭状况选项
  const familyStatusOptions = [
    { value: '单身', label: '单身', icon: '👤' },
    { value: '已婚无子女', label: '已婚无子女', icon: '👫' },
    { value: '已婚有子女', label: '已婚有子女', icon: '👨‍👩‍👧' },
    { value: '单亲家庭', label: '单亲家庭', icon: '👨‍👧' }
  ];

  // 保险需求选项
  const concernOptions = [
    { value: '重疾保障', label: '重疾保障', icon: '💊', color: 'from-red-500 to-pink-500' },
    { value: '医疗保障', label: '医疗保障', icon: '🏥', color: 'from-blue-500 to-cyan-500' },
    { value: '储蓄', label: '储蓄规划', icon: '💰', color: 'from-green-500 to-emerald-500' },
    { value: '子女教育', label: '子女教育', icon: '🎓', color: 'from-purple-500 to-indigo-500' },
    { value: '退休规划', label: '退休规划', icon: '🏖️', color: 'from-orange-500 to-amber-500' },
    { value: '寿险保障', label: '寿险保障', icon: '🛡️', color: 'from-gray-500 to-slate-500' },
    { value: '意外保障', label: '意外保障', icon: '⚠️', color: 'from-yellow-500 to-orange-500' },
    { value: '财富传承', label: '财富传承', icon: '🏛️', color: 'from-indigo-500 to-purple-500' }
  ];

  // 根据家庭状况自动设置has_children
  useEffect(() => {
    if (formData.family_status === '已婚有子女' || formData.family_status === '单亲家庭') {
      setFormData(prev => ({ ...prev, has_children: true }));
    } else {
      setFormData(prev => ({ ...prev, has_children: false, children_count: 0, children_ages: '' }));
    }
  }, [formData.family_status]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleConcernToggle = (concern) => {
    setFormData(prev => ({
      ...prev,
      main_concerns: prev.main_concerns.includes(concern)
        ? prev.main_concerns.filter(c => c !== concern)
        : [...prev.main_concerns, concern]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 验证必填字段
    if (!formData.age || !formData.annual_income || !formData.life_stage) {
      setError('请填写年龄、年收入和人生阶段');
      return;
    }

    if (formData.main_concerns.length === 0) {
      setError('请至少选择一个保险需求');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('token');

      // 构建请求数据
      const requestData = {
        age: parseInt(formData.age),
        gender: formData.gender,
        annual_income: parseFloat(formData.annual_income),
        life_stage: formData.life_stage,
        family_status: formData.family_status,
        has_children: formData.has_children,
        children_count: parseInt(formData.children_count) || 0,
        children_ages: formData.children_ages,
        main_concerns: formData.main_concerns,
        budget: parseFloat(formData.budget) || 0,
        special_requirements: formData.special_requirements
      };

      // 构建请求头（token可选）
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.post(
        `${API_URL}/ai-consultant/consult`,
        requestData,
        { headers }
      );

      if (response.data.success) {
        setResult(response.data.data);
        // 滚动到结果区域
        setTimeout(() => {
          document.getElementById('results-section')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 100);
      } else {
        setError(response.data.message || '获取推荐失败');
      }
    } catch (err) {
      console.error('AI咨询失败:', err);
      if (err.response?.status === 429) {
        setError('请求过于频繁，请稍后再试（每分钟最多3次，每小时最多20次）');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('AI咨询失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      age: '',
      gender: '男',
      annual_income: '',
      life_stage: '',
      family_status: '单身',
      has_children: false,
      children_count: 0,
      children_ages: '',
      main_concerns: [],
      budget: '',
      special_requirements: ''
    });
    setResult(null);
    setError(null);
  };

  // 匹配度颜色
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // 匹配度等级
  const getScoreLabel = (score) => {
    if (score >= 80) return '高度推荐';
    if (score >= 60) return '推荐';
    if (score >= 40) return '可考虑';
    return '不太适合';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                返回
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">AI智能保险顾问</h1>
                  <p className="text-sm text-gray-500">专业的保险配置建议</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 系统介绍横幅 - 始终显示 */}
        <div className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 rounded-3xl shadow-2xl overflow-hidden mb-8">
          {/* 装饰性背景 */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-400 to-pink-500 rounded-full blur-3xl transform -translate-x-32 translate-y-32"></div>
          </div>

          <div className="relative z-10 p-8 md:p-12">
            {/* 标题区 */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl shadow-lg mb-4">
                <SparklesIcon className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                AI智能保险顾问系统(AI最优化金融配置方案)
              </h2>
              <p className="text-lg text-cyan-200 font-medium">
                Intelligent Insurance Consultant System (IICS)
              </p>
            </div>

            {/* 核心介绍 */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/20 mb-6">
              <p className="text-white/90 text-base md:text-lg leading-relaxed text-justify">
                本项目致力于研发并产业化一款专为<span className="text-cyan-300 font-semibold">香港保险市场</span>设计的"智能保险顾问系统"。该系统以<span className="text-cyan-300 font-semibold">数据与算法为核心驱动力</span>，通过深度学习引擎实现保险计划书的<span className="text-cyan-300 font-semibold">高精度解析与自动化对比</span>，并基于融合精算数据、用户行为及历史保单特征的<span className="text-cyan-300 font-semibold">多因子动态模型</span>，构建个性化的智能推荐体系。
              </p>
              <p className="text-white/90 text-base md:text-lg leading-relaxed text-justify mt-4">
                系统能够依据用户多维财务目标与风险画像，进行<span className="text-cyan-300 font-semibold">量化分析与收益模拟</span>，智能化输出科学、可追溯的优化理财方案，切实解决保险中介市场存在的条款复杂、对比低效、规划依赖经验等痛点。同时，<span className="text-cyan-300 font-semibold">全流程数字化设计</span>显著提升了服务合规性与运营效率。
              </p>
            </div>

            {/* 核心功能亮点 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-xl p-5 border border-blue-400/30 hover:shadow-lg hover:shadow-blue-500/20 transition-all">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-bold text-lg">OCR智能解析</h3>
                </div>
                <p className="text-blue-100 text-sm leading-relaxed">
                  深度学习技术自动识别保险计划书，精准提取关键条款与数据
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-5 border border-purple-400/30 hover:shadow-lg hover:shadow-purple-500/20 transition-all">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg">多因子分析</h3>
                </div>
                <p className="text-purple-100 text-sm leading-relaxed">
                  基于多维度评分模型，科学匹配客户需求与产品特性
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-sm rounded-xl p-5 border border-emerald-400/30 hover:shadow-lg hover:shadow-emerald-500/20 transition-all">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <CheckCircleIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg">合规高效</h3>
                </div>
                <p className="text-emerald-100 text-sm leading-relaxed">
                  数字化流程确保服务标准化，提升行业合规与效率水平
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 服务介绍卡片 */}
        {!result && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <SparklesIcon className="h-12 w-12" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">智能保险规划服务</h2>
                <p className="text-indigo-100 mb-4">
                  基于您的个人情况和需求，AI将为您推荐最适合的保险产品组合，帮助您做出明智的保险决策。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <ChartBarIcon className="h-5 w-5" />
                      <span className="font-semibold">智能匹配</span>
                    </div>
                    <p className="text-sm text-indigo-100">多维度评分算法</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <HeartIcon className="h-5 w-5" />
                      <span className="font-semibold">个性化推荐</span>
                    </div>
                    <p className="text-sm text-indigo-100">量身定制方案</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircleIcon className="h-5 w-5" />
                      <span className="font-semibold">专业分析</span>
                    </div>
                    <p className="text-sm text-indigo-100">AI深度解读</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 表单 */}
        {!result && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 基本信息 */}
              <div>
                <div className="flex items-center space-x-2 mb-6">
                  <UserIcon className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-xl font-bold text-gray-900">基本信息</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 年龄 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      年龄 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      min="18"
                      max="100"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="请输入年龄"
                    />
                  </div>

                  {/* 性别 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      性别
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    >
                      <option value="男">男</option>
                      <option value="女">女</option>
                    </select>
                  </div>

                  {/* 年收入 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      年收入 (港币) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="annual_income"
                      value={formData.annual_income}
                      onChange={handleInputChange}
                      min="0"
                      step="10000"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="例如：800000"
                    />
                    {formData.annual_income && (
                      <p className="mt-1 text-sm text-gray-500">
                        约 HK${parseFloat(formData.annual_income).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 人生阶段 */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <ChartBarIcon className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-xl font-bold text-gray-900">人生阶段</h3>
                  <span className="text-red-500">*</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {lifeStageOptions.map((stage) => (
                    <label
                      key={stage.value}
                      className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                        formData.life_stage === stage.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="life_stage"
                        value={stage.value}
                        checked={formData.life_stage === stage.value}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <span className="font-semibold text-gray-900 mb-1">{stage.label}</span>
                      <span className="text-xs text-gray-500">{stage.description}</span>
                      {formData.life_stage === stage.value && (
                        <CheckCircleIcon className="absolute top-2 right-2 h-5 w-5 text-indigo-600" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* 家庭状况 */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <UsersIcon className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-xl font-bold text-gray-900">家庭状况</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {familyStatusOptions.map((status) => (
                    <label
                      key={status.value}
                      className={`flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                        formData.family_status === status.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="family_status"
                        value={status.value}
                        checked={formData.family_status === status.value}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <span className="text-3xl mb-2">{status.icon}</span>
                      <span className="font-semibold text-gray-900">{status.label}</span>
                    </label>
                  ))}
                </div>

                {/* 子女信息 */}
                {formData.has_children && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        子女数量
                      </label>
                      <input
                        type="number"
                        name="children_count"
                        value={formData.children_count}
                        onChange={handleInputChange}
                        min="1"
                        max="10"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="例如：2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        子女年龄 (多个用逗号分隔)
                      </label>
                      <input
                        type="text"
                        name="children_ages"
                        value={formData.children_ages}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="例如：5, 8"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 保险需求 */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <HeartIcon className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-xl font-bold text-gray-900">保险需求</h3>
                  <span className="text-red-500">*</span>
                  <span className="text-sm text-gray-500">(可多选)</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {concernOptions.map((concern) => (
                    <label
                      key={concern.value}
                      className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                        formData.main_concerns.includes(concern.value)
                          ? 'border-indigo-600 bg-gradient-to-br ' + concern.color + ' text-white'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.main_concerns.includes(concern.value)}
                        onChange={() => handleConcernToggle(concern.value)}
                        className="sr-only"
                      />
                      <span className="text-3xl mb-2">{concern.icon}</span>
                      <span className={`font-semibold ${
                        formData.main_concerns.includes(concern.value) ? 'text-white' : 'text-gray-900'
                      }`}>
                        {concern.label}
                      </span>
                      {formData.main_concerns.includes(concern.value) && (
                        <CheckCircleIcon className="absolute top-2 right-2 h-5 w-5 text-white" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* 预算与其他需求 */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <CurrencyDollarIcon className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-xl font-bold text-gray-900">预算与其他需求</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      年缴保费预算 (港币，可选)
                    </label>
                    <input
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      min="0"
                      step="10000"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="例如：100000 (不填写则不限制预算)"
                    />
                    {formData.budget && (
                      <p className="mt-1 text-sm text-gray-500">
                        预算：HK${parseFloat(formData.budget).toLocaleString()} / 年
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      特殊需求或补充说明 (可选)
                    </label>
                    <textarea
                      name="special_requirements"
                      value={formData.special_requirements}
                      onChange={handleInputChange}
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      placeholder="例如：有慢性病史、特别关注某种疾病、偏好某家保险公司等..."
                    />
                  </div>
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <div className="flex items-center">
                    <XMarkIcon className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* 提交按钮 */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  重置
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>AI分析中...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-5 w-5" />
                      <span>获取AI推荐</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 结果展示 */}
        {result && (
          <div id="results-section" className="space-y-6">
            {/* 咨询摘要 */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">AI分析结果</h2>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-2"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  <span>重新咨询</span>
                </button>
              </div>

              {/* 客户信息摘要 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-600 mb-1">年龄</p>
                  <p className="text-lg font-bold text-gray-900">{result.customer_info?.age}岁</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">年收入</p>
                  <p className="text-lg font-bold text-gray-900">
                    HK${result.customer_info?.annual_income?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">人生阶段</p>
                  <p className="text-lg font-bold text-gray-900">{result.customer_info?.life_stage}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">家庭状况</p>
                  <p className="text-lg font-bold text-gray-900">{result.customer_info?.family_status}</p>
                </div>
              </div>

              {/* AI建议 */}
              {result.ai_analysis && (
                <div className="prose max-w-none">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-xl mb-6">
                    <h3 className="text-xl font-bold text-white mb-3 flex items-center">
                      <SparklesIcon className="h-6 w-6 mr-2" />
                      AI专业建议
                    </h3>
                    <div className="text-indigo-50 whitespace-pre-line leading-relaxed">
                      {result.ai_analysis}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 推荐产品列表 */}
            {result.recommended_products && result.recommended_products.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    推荐产品 ({result.recommended_products.length})
                  </h3>
                  {result.total_premium && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">预估年缴总保费</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        HK${result.total_premium.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {result.recommended_products.map((product, index) => (
                    <div
                      key={index}
                      className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all hover:border-indigo-300"
                    >
                      {/* 产品头部 */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-900 mb-1">
                            {product.product_name || '产品名称'}
                          </h4>
                          <p className="text-sm text-gray-600">{product.company || '保险公司'}</p>
                        </div>
                        {product.match_score !== undefined && (
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${getScoreColor(product.match_score)}`}>
                            {product.match_score}分
                          </div>
                        )}
                      </div>

                      {/* 年缴保费 */}
                      {product.annual_premium && (
                        <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                          <p className="text-sm text-indigo-600 mb-1">年缴保费</p>
                          <p className="text-2xl font-bold text-indigo-600">
                            HK${product.annual_premium.toLocaleString()}
                          </p>
                        </div>
                      )}

                      {/* 匹配度详情 */}
                      {product.match_details && (
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">年龄匹配</span>
                            <span className="font-semibold">{product.match_details.age_match}分</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">收入匹配</span>
                            <span className="font-semibold">{product.match_details.income_match}分</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">需求匹配</span>
                            <span className="font-semibold">{product.match_details.need_match}分</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">预算匹配</span>
                            <span className="font-semibold">{product.match_details.budget_match}分</span>
                          </div>
                        </div>
                      )}

                      {/* 推荐理由 */}
                      {product.reason && (
                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600 mb-1 font-medium">推荐理由</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{product.reason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 无推荐产品提示 */}
            {(!result.recommended_products || result.recommended_products.length === 0) && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
                <p className="text-yellow-800">
                  暂无符合您条件的推荐产品。建议：
                  <br />
                  1. 调整预算范围
                  <br />
                  2. 扩大保险需求范围
                  <br />
                  3. 联系专业顾问进行人工咨询
                </p>
              </div>
            )}

            {/* 缓存提示 */}
            {result.cached && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                <p className="text-blue-800 text-sm">
                  💡 本次结果来自缓存（1小时内有效），确保快速响应
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIConsultant;
