import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * 带超时提示的加载组件
 *
 * @param {Object} props
 * @param {string} props.message - 加载提示信息
 * @param {boolean} props.authLoading - 是否正在认证中
 * @param {number} props.timeoutSeconds - 超时时间（秒），默认15秒
 * @param {Function} props.onNavigate - 导航函数
 */
function LoadingWithTimeout({
  message = '正在加载...',
  authLoading = false,
  timeoutSeconds = 15,
  onNavigate = null
}) {
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, timeoutSeconds * 1000);

    return () => clearTimeout(timer);
  }, [timeoutSeconds]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-12">
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">{message}</p>

        {showTimeout ? (
          <div className="text-center max-w-md">
            <p className="text-sm text-amber-600 font-medium mb-3">
              ⚠️ 加载时间较长，可能的原因：
            </p>
            <ul className="text-sm text-gray-600 text-left mb-4 space-y-1">
              <li>• 登录凭证已过期，正在自动刷新</li>
              <li>• 网络连接较慢</li>
              <li>• 服务器响应延迟</li>
            </ul>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                刷新页面
              </button>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('/')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  返回首页
                </button>
              )}
              <button
                onClick={() => {
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('refresh_token');
                  localStorage.removeItem('user');
                  window.location.href = '/';
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                重新登录
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center max-w-md">
            {authLoading ? '正在验证登录状态...' : '请稍候...'}
          </p>
        )}
      </div>
    </div>
  );
}

export default LoadingWithTimeout;
