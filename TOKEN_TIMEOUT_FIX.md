# Token 超时问题解决方案

## 问题描述

用户长时间未登录后（Token过期），访问 `plan-management` 等页面时会出现：
- 页面长时间显示加载状态
- 用户不知道发生了什么
- 无法判断是网络问题还是登录过期

## 根本原因

1. JWT Token 默认过期时间较短
2. Token 刷新过程中前端没有超时提示
3. 网络慢或刷新失败时，页面会一直卡在 loading 状态

## 解决方案

### 1. axios 拦截器优化 ✅

**文件**: `frontend/src/utils/axiosConfig.js`

**改进内容**:
- 所有请求默认30秒超时
- Token 刷新10秒超时
- 添加详细的控制台日志
- 超时错误专门处理

```javascript
// 设置默认超时时间
if (!config.timeout) {
  config.timeout = 30000; // 30秒
}

// Token 刷新超时控制
const response = await axios.post(`${API_BASE_URL}/api/auth/token/refresh/`, {
  refresh: refreshToken
}, {
  timeout: 10000 // 10秒
});
```

### 2. PlanDocumentManagement 页面优化 ✅

**文件**: `frontend/src/components/PlanDocumentManagement.jsx`

**改进内容**:
- 15秒超时提示
- 友好的加载界面
- Token 过期自动重试（1次）
- 提供"刷新页面"、"返回首页"、"重新登录"按钮

**关键代码**:
```javascript
// 添加超时检测
const [loadingTimeout, setLoadingTimeout] = useState(false);

// 15秒后显示超时提示
const timeoutTimer = setTimeout(() => {
  if (loading) {
    setLoadingTimeout(true);
  }
}, 15000);

// 401 错误自动重试
if (error.response?.status === 401) {
  console.error('❌ 认证失败，token已过期，正在尝试刷新...');
  setTimeout(() => {
    fetchDocuments(); // 2秒后重试
  }, 2000);
}
```

### 3. 通用组件创建 ✅

#### LoadingWithTimeout 组件

**文件**: `frontend/src/components/LoadingWithTimeout.jsx`

**用途**: 可复用的加载组件，自动处理超时提示

**使用方法**:
```jsx
import LoadingWithTimeout from './LoadingWithTimeout';

{loading && (
  <LoadingWithTimeout
    message="正在加载计划书列表..."
    authLoading={authLoading}
    timeoutSeconds={15}
    onNavigate={onNavigate}
  />
)}
```

#### useApiRequest Hook

**文件**: `frontend/src/hooks/useApiRequest.js`

**用途**: 统一的 API 请求 Hook，自动处理超时、重试和错误

**使用方法**:
```jsx
import { useApiRequest } from '../hooks/useApiRequest';

const { loading, error, execute } = useApiRequest();

const loadData = async () => {
  await execute(
    () => axios.get('/api/ocr/documents/'),
    {
      onSuccess: (data) => setDocuments(data.data),
      onError: (err) => console.error(err)
    }
  );
};
```

## 用户体验改进

### 改进前
❌ 页面一直显示转圈加载
❌ 用户不知道发生了什么
❌ 无法判断问题原因
❌ 无法手动处理

### 改进后
✅ 15秒后显示超时提示
✅ 明确提示可能的原因（登录过期、网络慢、服务器延迟）
✅ 提供多个操作选项（刷新页面、返回首页、重新登录）
✅ Token 过期自动重试
✅ 详细的控制台日志便于调试

## 建议后续优化的页面

以下页面也需要应用相同的改进：

1. **DocumentDetail.jsx** - 文档详情页
2. **PlanAnalyzer.jsx** - 计划书分析页
3. **Dashboard.jsx** - 首页仪表盘
4. **PosterAnalyzer.jsx** - 海报分析页

### 优化步骤

对于每个页面：

1. 使用 `LoadingWithTimeout` 组件替换原有的 loading 状态
2. 或使用 `useApiRequest` Hook 统一处理 API 请求
3. 添加超时控制和自动重试逻辑

## 测试建议

### 测试场景1：Token 过期
1. 登录系统
2. 等待 Token 过期（或手动删除 localStorage 中的 access_token）
3. 访问 `/plan-management` 页面
4. 预期：15秒后显示超时提示，自动尝试刷新 token

### 测试场景2：网络慢
1. 使用浏览器开发者工具限制网络速度（Slow 3G）
2. 访问 `/plan-management` 页面
3. 预期：显示加载中，15秒后显示超时提示

### 测试场景3：Refresh Token 过期
1. 手动删除 localStorage 中的 refresh_token
2. 访问需要认证的页面
3. 预期：自动跳转到登录页

## 日志说明

改进后的系统会在控制台输出详细日志：

```
🔄 Token已过期，正在刷新...
✅ Token刷新成功
📡 [useApiRequest] 发起请求... (重试次数: 0)
✅ [useApiRequest] 请求成功
```

或错误日志：

```
❌ Token刷新失败: timeout of 10000ms exceeded
❌ Token刷新超时，网络可能存在问题
❌ 认证失败，token已过期，正在尝试刷新...
🔄 重新尝试获取文档列表...
```

## 配置参数

可调整的参数：

| 参数 | 位置 | 默认值 | 说明 |
|------|------|--------|------|
| 请求超时 | axiosConfig.js | 30000ms | 普通请求超时时间 |
| Token刷新超时 | axiosConfig.js | 10000ms | Token刷新超时时间 |
| 超时提示延迟 | LoadingWithTimeout | 15000ms | 显示超时提示的延迟 |
| 401重试次数 | useApiRequest | 1次 | Token过期重试次数 |
| 401重试延迟 | PlanDocumentManagement | 2000ms | 重试前等待时间 |

## 部署说明

1. **前端重启**:
   ```bash
   cd /var/www/harry-insurance2
   ./start-frontend.sh
   ```

2. **验证服务**:
   ```bash
   ps aux | grep vite | grep harry-insurance
   curl http://localhost:8008
   ```

3. **清除浏览器缓存**: 用户需要强制刷新页面（Ctrl+Shift+R）

## 维护建议

1. 定期检查控制台日志，监控 Token 刷新频率
2. 如果 Token 刷新失败率高，考虑增加 Token 有效期
3. 监控请求超时情况，必要时调整超时参数
4. 收集用户反馈，优化超时提示的文案

## 更新日期

2026-02-04
