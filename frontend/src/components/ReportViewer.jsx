import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

function ReportViewer() {
  const { lang } = useParams()
  const navigate = useNavigate()

  // 根据语言参数确定要显示的HTML文件
  const reportFile = lang === 'en' ? '/english_report.html' : '/chinese_report.html'
  const title = lang === 'en' ? 'English Report' : '中文报告'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                返回
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => navigate('/report/zh')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  lang === 'zh'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => navigate('/report/en')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  lang === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 报告内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <iframe
            src={reportFile}
            title={title}
            className="w-full"
            style={{ height: 'calc(100vh - 200px)', border: 'none' }}
          />
        </div>
      </div>
    </div>
  )
}

export default ReportViewer
