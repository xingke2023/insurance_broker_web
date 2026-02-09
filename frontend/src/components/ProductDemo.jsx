import { useAppNavigate } from '../hooks/useAppNavigate';
import { ArrowLeft, Play, Pause, MessageCircle, Bot, Zap, FileText } from 'lucide-react';
import { useState, useRef } from 'react';

function ProductDemo() {
  const onNavigate = useAppNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  const toggleVideo = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-800 via-slate-800 to-gray-800 shadow-2xl sticky top-0 z-50 border-b border-gray-600/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('home')}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-xl transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">产品功能演示</h1>
                <p className="text-xs text-gray-400 hidden sm:block">Telegram 智能计划书制作机器人</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
            <Bot className="w-4 h-4" />
            OpenClaw Bot 自动化产品演示
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            一句话，自动生成保险计划书
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            通过 微信、WhatsApp、Telegram 机器人，只需输入产品名称和客户信息，系统自动启动浏览器、填写表单、生成PDF计划书，全程无需人工操作。
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: MessageCircle, title: '自然语言输入', desc: '像聊天一样告诉机器人客户信息' },
            { icon: Zap, title: '全自动生成', desc: '自动启动浏览器、填写表单、生成PDF' },
            { icon: FileText, title: '即时返回', desc: '几十秒内返回完整计划书PDF文件' },
          ].map((item, i) => (
            <div key={i} className="bg-white/80 backdrop-blur rounded-2xl p-5 border border-gray-200/60 shadow-sm">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3">
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Demo content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Screenshot */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                对话流程截图
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Telegram 机器人交互过程</p>
            </div>
            <div className="p-4">
              <img
                src="/asset/648b31a9cb6cfb10f9de43a073a02015.png"
                alt="Telegram Bot 计划书制作演示"
                className="w-full rounded-xl shadow-sm border border-gray-100"
              />
            </div>
          </div>

          {/* Video */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                操作视频演示
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">完整自动化流程录屏</p>
            </div>
            <div className="p-4">
              <div className="relative rounded-xl overflow-hidden bg-black shadow-sm">
                <video
                  ref={videoRef}
                  src="/asset/92251a4f8786637755439a051cd6dac2.mp4"
                  className="w-full"
                  controls
                  playsInline
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  poster="/asset/648b31a9cb6cfb10f9de43a073a02015.png"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <div className="inline-flex flex-wrap justify-center gap-3">
            <button
              onClick={() => onNavigate('home')}
              className="px-6 py-2.5 bg-gray-800 text-white rounded-xl font-semibold text-sm hover:bg-gray-700 transition-all shadow-sm hover:shadow-md"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDemo;
