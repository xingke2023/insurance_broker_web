import { useState } from 'react';
import axios from 'axios';

/**
 * 通用 API 请求 Hook，自动处理超时、重试和错误
 *
 * @param {number} timeout - 请求超时时间（毫秒），默认30秒
 * @param {number} maxRetries - 401错误最大重试次数，默认1次
 */
export const useApiRequest = (timeout = 30000, maxRetries = 1) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 执行 API 请求
   *
   * @param {Function} requestFn - axios 请求函数
   * @param {Object} options - 选项
   * @param {Function} options.onSuccess - 成功回调
   * @param {Function} options.onError - 错误回调
   * @param {number} options.retryCount - 当前重试次数（内部使用）
   * @returns {Promise<any>} 返回响应数据或 null
   */
  const execute = async (requestFn, options = {}) => {
    const {
      onSuccess = null,
      onError = null,
      retryCount = 0
    } = options;

    setLoading(true);
    setError(null);

    try {
      console.log(`📡 [useApiRequest] 发起请求... (重试次数: ${retryCount})`);
      const response = await requestFn();
      console.log('✅ [useApiRequest] 请求成功');

      if (onSuccess) {
        onSuccess(response.data);
      }

      setLoading(false);
      return response.data;
    } catch (err) {
      console.error('❌ [useApiRequest] 请求失败:', err.message);

      // 401 错误：Token 过期，自动重试
      if (err.response?.status === 401 && retryCount < maxRetries) {
        console.log(`🔄 [useApiRequest] Token过期，${2}秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return execute(requestFn, { ...options, retryCount: retryCount + 1 });
      }

      // 超时错误
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        const timeoutError = {
          message: '请求超时，网络响应缓慢',
          code: 'TIMEOUT',
          isTimeout: true
        };
        setError(timeoutError);

        if (onError) {
          onError(timeoutError);
        }

        setLoading(false);
        return null;
      }

      // 其他错误
      const errorObj = {
        message: err.response?.data?.message || err.message || '请求失败',
        code: err.response?.status || err.code,
        isTimeout: false
      };
      setError(errorObj);

      if (onError) {
        onError(errorObj);
      }

      setLoading(false);
      return null;
    }
  };

  return {
    loading,
    error,
    execute
  };
};

export default useApiRequest;
