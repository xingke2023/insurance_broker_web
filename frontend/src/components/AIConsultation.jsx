import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const AIConsultation = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // 表单数据
  const [formData, setFormData] = useState({
    age: '',
    gender: '男',
    annual_income: '',
    life_stage: '',
    family_status: '',
    has_children: false,
    children_count: 0,
    main_concerns: [],
    budget: '',
  });

  // 主要关注点选项
  const concernOptions = [
    '意外保障',
    '医疗保障',
    '重疾保障',
    '家庭保障',
    '子女教育',
    '退休规划',
    '财富传承',
    '储蓄规划',
    '长期照护',
  ];

  // 人生阶段选项
  const lifeStageOptions = [
    '扶幼保障期',
    '收入成长期',
    '责任高峰期',
    '责任递减期',
    '退休期',
  ];

  // 家庭状况选项
  const familyStatusOptions = [
    '单身',
    '已婚',
    '已婚有子女',
  ];

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

    // 验证必填字段
    if (!formData.age || !formData.annual_income) {
      alert('请填写年龄和年收入');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/consultation/ai-recommend`,
        {
          age: parseInt(formData.age),
          gender: formData.gender,
          annual_income: parseFloat(formData.annual_income),
          life_stage: formData.life_stage,
          family_status: formData.family_status,
          has_children: formData.has_children,
          children_count: parseInt(formData.children_count) || 0,
          main_concerns: formData.main_concerns,
          budget: parseFloat(formData.budget) || 0,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setResult(response.data.data);
      } else {
        alert(response.data.error || 'AI咨询失败');
      }
    } catch (error) {
      console.error('AI咨询错误:', error);
      alert(error.response?.data?.error || 'AI咨询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      age: '',
      gender: '男',
      annual_income: '',
      life_stage: '',
      family_status: '',
      has_children: false,
      children_count: 0,
      main_concerns: [],
      budget: '',
    });
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 标题和返回按钮 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">AI智能保险咨询</h1>
            <p className="text-gray-600">根据您的个人情况，AI将为您推荐最合适的保险方案</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-white text-gray-700 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            返回Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：表单 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">请填写您的基本信息</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">基本信息</h3>

                <div className="grid grid-cols-2 gap-4">
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      性别
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="男">男</option>
                      <option value="女">女</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    年收入（港币） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="annual_income"
                    value={formData.annual_income}
                    onChange={handleInputChange}
                    min="0"
                    step="10000"
                    placeholder="例如：800000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* 人生阶段 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  人生阶段
                </label>
                <select
                  name="life_stage"
                  value={formData.life_stage}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">请选择</option>
                  {lifeStageOptions.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              {/* 家庭状况 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  家庭状况
                </label>
                <select
                  name="family_status"
                  value={formData.family_status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">请选择</option>
                  {familyStatusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* 子女信息 */}
              <div className="space-y-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="has_children"
                    checked={formData.has_children}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">有子女</span>
                </label>

                {formData.has_children && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      子女数量
                    </label>
                    <input
                      type="number"
                      name="children_count"
                      value={formData.children_count}
                      onChange={handleInputChange}
                      min="0"
                      max="10"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* 主要关注点 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  主要关注点（可多选）
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {concernOptions.map(concern => (
                    <label
                      key={concern}
                      className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.main_concerns.includes(concern)}
                        onChange={() => handleConcernToggle(concern)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{concern}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 预算 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  年缴保费预算（港币）
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  min="0"
                  step="5000"
                  placeholder="例如：50000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 按钮 */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  {loading ? '分析中...' : '获取AI推荐'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  重置
                </button>
              </div>
            </form>
          </div>

          {/* 右侧：结果展示 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">AI分析结果</h2>

            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
                <p className="text-gray-600">AI正在分析您的需求，请稍候...</p>
              </div>
            )}

            {!loading && !result && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>请填写左侧表单，获取AI推荐</p>
              </div>
            )}

            {!loading && result && (
              <div className="space-y-6">
                {/* 需求分析 */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">📊 需求分析</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{result.analysis}</p>
                </div>

                {/* 产品推荐 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 推荐产品</h3>
                  <div className="space-y-4">
                    {result.recommendations?.map((rec, index) => (
                      <div
                        key={index}
                        className="border-2 border-blue-200 rounded-lg p-5 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">
                                {rec.priority}
                              </span>
                              <h4 className="text-lg font-bold text-gray-800">{rec.product_name}</h4>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{rec.company_name}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {rec.suitability_score}
                            </div>
                            <div className="text-xs text-gray-500">适配度</div>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">推荐理由：</p>
                          <p className="text-sm text-gray-600 leading-relaxed">{rec.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 专业建议 */}
                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">💡 专业建议</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{result.advice}</p>
                </div>

                {/* 注意事项 */}
                <div className="bg-yellow-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">⚠️ 注意事项</h3>
                  <ul className="space-y-2">
                    {result.warnings?.map((warning, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-yellow-600 mt-1">•</span>
                        <span className="text-gray-700">{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConsultation;
