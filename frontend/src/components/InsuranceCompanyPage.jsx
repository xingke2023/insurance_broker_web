import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import CompanyIconDisplay from './CompanyIconDisplay';

function InsuranceCompanyPage() {
  const { companyCode } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCompanyRequests();
  }, [companyCode]);

  const fetchCompanyRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const response = await axios.get(
        `${API_BASE_URL}/api/insurance-companies/${companyCode}/requests/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.status === 'success') {
        setCompany(response.data.company);
        setRequests(response.data.data);
      }
    } catch (err) {
      console.error('获取请求配置失败:', err);
      setError('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestClick = (request) => {
    // 跳转到API调用页面
    navigate(`/api-call/${companyCode}/${encodeURIComponent(request.request_name)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/plan-builder')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/plan-builder')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>返回</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {company?.name}保险产品
            </h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 宏利特殊产品按钮 */}
        {companyCode === 'manulife' && (
          <div className="mb-6">
            <a
              href="https://api1.hongkong-insurance.com/product/6/payload-form1"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 p-6 text-white group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-bold mb-2">
                    🌲 宏利宏挚传承保障计划
                  </h3>
                  <p className="text-green-50 text-base">
                    点击跳转到产品表单页面
                  </p>
                </div>
                <svg
                  className="h-8 w-8 text-white group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </a>
          </div>
        )}

        {/* API请求列表 */}
        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg">该保险公司暂无可用的产品工具</p>
            <p className="text-gray-400 text-sm mt-2">请联系管理员添加产品配置</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => (
              <button
                key={request.id}
                onClick={() => handleRequestClick(request)}
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 p-6 text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {request.request_name}
                    </h3>
                    {request.insurance_product && (
                      <p className="text-sm text-gray-600 mb-2">
                        {request.insurance_product}
                      </p>
                    )}
                  </div>
                  {request.requires_bearer_token && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      🔐 需要Token
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="font-medium mr-2">请求方法:</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                      {request.request_method}
                    </span>
                  </div>

                  {request.configurable_fields && request.configurable_fields.length > 0 && (
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="font-medium mr-2">可配置字段:</span>
                      <span className="text-blue-600 font-medium">
                        {request.configurable_fields.length} 个
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 font-mono truncate max-w-[200px]">
                      {new URL(request.request_url).hostname}
                    </span>
                    <svg
                      className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default InsuranceCompanyPage;
