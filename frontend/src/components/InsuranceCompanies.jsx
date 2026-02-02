import { useState, useEffect } from 'react';
import { useAppNavigate } from '../hooks/useAppNavigate';
import { ArrowLeftIcon, BuildingOfficeIcon, GlobeAltIcon, NewspaperIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config';

function InsuranceCompanies() {
  const onNavigate = useAppNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/insurance-companies/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取保险公司列表失败');
      }

      const data = await response.json();
      // 处理API返回格式：{status: 'success', data: [...]}
      const companiesData = data.data || data;
      // 确保是数组
      const companiesArray = Array.isArray(companiesData) ? companiesData : [];
      setCompanies(companiesArray.filter(company => company.is_active));
      setError(null);
    } catch (err) {
      console.error('获取保险公司列表失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyClick = (company) => {
    // 导航到公司详情页
    onNavigate(`insurance-company/${company.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 顶部导航 */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors mb-6"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            返回主页
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="flex items-center mb-2">
              <BuildingOfficeIcon className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">香港各大保险公司名单</h1>
            </div>
            <p className="text-gray-600 mt-2">
              浏览香港主要保险公司信息，查看公司产品、新闻动态和官方网站
            </p>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                共 {companies.length} 家保险公司
              </span>
            </div>
          </div>
        </div>

        {/* 保险公司网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div
              key={company.id}
              onClick={() => handleCompanyClick(company)}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group"
            >
              {/* 公司头部 - 使用渐变色 */}
              <div className={`bg-gradient-to-r ${company.color_gradient || 'from-indigo-500 to-indigo-600'} p-6`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {/* 公司图标/Logo */}
                    {company.icon ? (
                      company.icon.startsWith('http') || company.icon.startsWith('/') ? (
                        <img
                          src={company.icon}
                          alt={company.name}
                          className="h-12 w-12 object-contain bg-white rounded-lg p-1"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : (
                        <div className="text-4xl">
                          {company.icon}
                        </div>
                      )
                    ) : (
                      <BuildingOfficeIcon className="h-12 w-12 text-white" />
                    )}
                    <div style={{ display: 'none' }} className="flex items-center justify-center h-12 w-12 bg-white rounded-lg">
                      <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                  {company.website_url && (
                    <GlobeAltIcon className="h-6 w-6 text-white opacity-75 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>

              {/* 公司信息 */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {company.name}
                </h3>
                {company.name_en && (
                  <p className="text-sm text-gray-500 mb-3">{company.name_en}</p>
                )}

                {company.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {company.description}
                  </p>
                )}

                {/* 主打产品 */}
                {company.flagship_product && (
                  <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
                    <p className="text-xs text-indigo-600 font-semibold mb-1">主打产品</p>
                    <p className="text-sm text-gray-800">{company.flagship_product}</p>
                  </div>
                )}

                {/* 底部操作区 */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center text-sm text-gray-500">
                    <NewspaperIcon className="h-4 w-4 mr-1" />
                    查看详情
                  </div>
                  {company.website_url && (
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <GlobeAltIcon className="h-4 w-4 mr-1" />
                      官网
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 空状态 */}
        {companies.length === 0 && !loading && (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无保险公司数据</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default InsuranceCompanies;
