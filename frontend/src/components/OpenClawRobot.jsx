import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Search,
  Bell,
  BarChart3,
  ArrowLeft,
  ChevronRight,
  MessageCircle,
  Play,
  X,
  CheckCheck,
  Send,
  Sparkles,
  PenTool,
  Video,
  Megaphone,
  CalendarCheck,
  BookOpen,
  Briefcase,
} from 'lucide-react';

const features = [
  {
    id: 'plan-builder',
    title: '制作计划书',
    desc: '快速生成专业的保险计划书，支持多种产品方案，一键导出PDF',
    icon: FileText,
    color: 'from-blue-500 to-indigo-600',
    shadow: 'shadow-blue-200',
    path: '/plan-builder',
    tag: '核心功能',
    tagColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'plan-management',
    title: '查询保单信息',
    desc: '查看客户保单详情、保额、缴费状态及历史记录，随时掌握保单动态',
    icon: Search,
    color: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-200',
    path: '/plan-management',
    tag: '数据查询',
    tagColor: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'notification',
    title: '缴费通知推送',
    desc: '自动检测缴费到期日，通过微信/短信提前提醒客户，减少保单失效风险',
    icon: Bell,
    color: 'from-orange-500 to-amber-500',
    shadow: 'shadow-orange-200',
    path: null,
    tag: '即将上线',
    tagColor: 'bg-orange-100 text-orange-600',
    disabled: true,
  },
  {
    id: 'comparison',
    title: '计划书对比和分析',
    desc: '多产品横向对比保额、现金价值、IRR收益率，智能分析最优方案',
    icon: BarChart3,
    color: 'from-purple-500 to-violet-600',
    shadow: 'shadow-purple-200',
    path: '/company-comparison',
    tag: '智能分析',
    tagColor: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'knowledge-base',
    title: '知识库查询',
    desc: '智能检索该保险公司所有计划书、产品条款、常见问题及核保规则，秒级获取专业解答',
    icon: BookOpen,
    color: 'from-cyan-500 to-sky-600',
    shadow: 'shadow-cyan-200',
    path: null,
    tag: '即将上线',
    tagColor: 'bg-cyan-100 text-cyan-700',
    disabled: true,
  },
];

// 聊天演示动画组件
export function PhoneDemo({ onClose, companyName, companySeed }) {
  // phase: 0=等待 1=打字msg1 2=msg1已发 3=bot typing1 4=bot reply1
  //        5=打字msg2 6=msg2已发 7=bot typing2 8=bot reply2
  //        9=打字msg3 10=msg3已发 11=bot typing3 12=bot reply3
  const [phase, setPhase] = useState(0);
  const [typed1, setTyped1] = useState('');
  const [typed2, setTyped2] = useState('');
  const [typed3, setTyped3] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const chatRef = useRef(null);

  const msg1 = `请帮我制作一份${companyName.replace('OpenClaw', '')}×××计划书\n10岁男孩年缴5万美金`;
  const msg1flat = msg1.replace('\n', '');
  const reply1 = `✅ ${companyName.replace('OpenClaw', '')}×××计划书已为您制作完成！\n\n👦 受保人：10岁男孩\n💵 年缴保费：USD 50,000\n📋 计划书已包含保障详情、年度现金价值表及多种缴费方案\n\n请查收！如需修改随时告知 😊`;
  const msg2 = `请帮我查询宏利保单号为\nMH2024-8527的保单信息`;
  const msg2flat = msg2.replace('\n', '');
  const reply2 = `📋 保单查询结果\n\n保单号：MH2024-8527\n产品：宏利宏挚传承终身寿险\n受保人：李小明（男，10岁）\n保额：USD 500,000\n年缴保费：USD 50,000\n缴费年期：10年\n保单状态：✅ 有效\n下次缴费日：2026-06-15\n已缴总额：USD 50,000`;
  const msg3 = `帮我对比A和B两份计划书\n哪个回报更高？`;
  const msg3flat = msg3.replace('\n', '');
  const reply3 = `📊 对比分析结果\n\n─────────────────\n计划书A  vs  计划书B\n─────────────────\n💰 第10年现金价值\nA：USD 480,000\nB：USD 510,000\n\n📈 IRR内部回报率\nA：4.2%　B：4.8%\n\n🏆 第20年总回报\nA：USD 1,120,000\nB：USD 1,350,000\n─────────────────\n✅ 综合建议：计划书B回报更优，第20年高出约20%，适合长期储蓄目标 😊`;

  const scrollToBottom = () => setTimeout(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, 80);

  // phase 0 → 1
  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 600);
    return () => clearTimeout(t);
  }, []);

  // 打字 msg1
  useEffect(() => {
    if (phase !== 1) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped1(msg1flat.slice(0, i));
      if (i >= msg1flat.length) { clearInterval(iv); setTimeout(() => setPhase(2), 400); }
    }, 55);
    return () => clearInterval(iv);
  }, [phase]);

  // phase 2 → 3
  useEffect(() => {
    if (phase !== 2) return;
    scrollToBottom();
    const t = setTimeout(() => setPhase(3), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  // phase 3 → 4
  useEffect(() => {
    if (phase !== 3) return;
    const t = setTimeout(() => { setPhase(4); scrollToBottom(); }, 1400);
    return () => clearTimeout(t);
  }, [phase]);

  // phase 4 → 5（停顿后开始第二条消息）
  useEffect(() => {
    if (phase !== 4) return;
    const t = setTimeout(() => setPhase(5), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  // 打字 msg2
  useEffect(() => {
    if (phase !== 5) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped2(msg2flat.slice(0, i));
      if (i >= msg2flat.length) { clearInterval(iv); setTimeout(() => setPhase(6), 400); }
    }, 55);
    return () => clearInterval(iv);
  }, [phase]);

  // phase 6 → 7
  useEffect(() => {
    if (phase !== 6) return;
    scrollToBottom();
    const t = setTimeout(() => setPhase(7), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  // phase 7 → 8
  useEffect(() => {
    if (phase !== 7) return;
    const t = setTimeout(() => { setPhase(8); scrollToBottom(); }, 1400);
    return () => clearTimeout(t);
  }, [phase]);

  // phase 8 → 9（停顿后开始第三条消息）
  useEffect(() => {
    if (phase !== 8) return;
    const t = setTimeout(() => setPhase(9), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  // 打字 msg3
  useEffect(() => {
    if (phase !== 9) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped3(msg3flat.slice(0, i));
      if (i >= msg3flat.length) { clearInterval(iv); setTimeout(() => setPhase(10), 400); }
    }, 55);
    return () => clearInterval(iv);
  }, [phase]);

  // phase 10 → 11
  useEffect(() => {
    if (phase !== 10) return;
    scrollToBottom();
    const t = setTimeout(() => setPhase(11), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  // phase 11 → 12
  useEffect(() => {
    if (phase !== 11) return;
    const t = setTimeout(() => { setPhase(12); scrollToBottom(); }, 1800);
    return () => clearTimeout(t);
  }, [phase]);

  // 光标闪烁
  useEffect(() => {
    const iv = setInterval(() => setShowCursor(c => !c), 480);
    return () => clearInterval(iv);
  }, []);

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const isTyping = phase === 3 || phase === 7 || phase === 11;

  const UserBubble = ({ text, sent }) => (
    <div className="flex justify-end">
      <div className="max-w-[78%]">
        <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-sm px-3 py-2 shadow-sm">
          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">{text}</p>
          {sent && (
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className="text-[10px] text-gray-400">{timeStr}</span>
              <CheckCheck className="w-3 h-3 text-blue-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const BotBubble = ({ text }) => (
    <div className="flex items-end gap-1.5">
      <div className="w-6 h-6 rounded-full bg-white overflow-hidden flex-shrink-0 shadow-sm">
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${companySeed}`} alt="" className="w-full h-full" />
      </div>
      <div className="max-w-[80%]">
        <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm">
          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">{text}</p>
          <div className="flex justify-end mt-0.5">
            <span className="text-[10px] text-gray-400">{timeStr}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const TypingIndicator = () => (
    <div className="flex items-end gap-1.5">
      <div className="w-6 h-6 rounded-full bg-white overflow-hidden flex-shrink-0 shadow-sm">
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${companySeed}`} alt="" className="w-full h-full" />
      </div>
      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full"
              style={{ animation: `typingBounce 1s infinite ${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <button onClick={onClose}
        className="fixed top-4 right-4 z-[201] w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors">
        <X className="w-4 h-4 text-gray-700" />
      </button>
      <div onClick={e => e.stopPropagation()} className="relative">

        {/* 手机外壳 */}
        <div className="w-[300px] sm:w-[320px] bg-gray-900 rounded-[40px] p-2.5 shadow-2xl shadow-black/50 border border-gray-700">
          <div className="absolute -left-1 top-24 w-1 h-8 bg-gray-700 rounded-l-sm"></div>
          <div className="absolute -left-1 top-36 w-1 h-12 bg-gray-700 rounded-l-sm"></div>
          <div className="absolute -right-1 top-32 w-1 h-14 bg-gray-700 rounded-r-sm"></div>

          <div className="bg-[#ECE5DD] rounded-[32px] overflow-hidden flex flex-col" style={{ height: '600px' }}>

            {/* 状态栏 */}
            <div className="bg-[#075E54] px-4 pt-3 pb-1 flex items-center justify-between relative">
              <span className="text-white text-xs font-medium">{timeStr}</span>
              <div className="w-16 h-5 bg-gray-900 rounded-full absolute left-1/2 -translate-x-1/2 top-2"></div>
              <div className="flex gap-1 items-center">
                <div className="w-3 h-2 border border-white rounded-sm relative">
                  <div className="absolute inset-0.5 bg-white rounded-sm"></div>
                </div>
                <span className="text-white text-xs">●●●</span>
              </div>
            </div>

            {/* 聊天顶栏 */}
            <div className="bg-[#075E54] px-3 py-2 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white overflow-hidden flex-shrink-0 shadow">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${companySeed}`} alt="" className="w-full h-full" />
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold text-sm leading-tight">{companyName}</div>
                <div className="text-green-200 text-[10px]">{isTyping ? '正在输入...' : '在线'}</div>
              </div>
            </div>

            {/* 聊天内容 */}
            <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5b0' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>

              <div className="flex justify-center">
                <span className="bg-[#e1ddd8] text-gray-500 text-[10px] px-3 py-0.5 rounded-full shadow-sm">今天</span>
              </div>

              {/* 消息1：用户 */}
              {phase >= 1 && (
                <UserBubble
                  text={phase === 1 ? typed1 + (showCursor ? '|' : '') : msg1flat}
                  sent={phase >= 2}
                />
              )}

              {/* 机器人 typing 1 */}
              {phase === 3 && <TypingIndicator />}

              {/* 回复1：机器人 */}
              {phase >= 4 && <BotBubble text={reply1} />}

              {/* 消息2：用户 */}
              {phase >= 5 && (
                <UserBubble
                  text={phase === 5 ? typed2 + (showCursor ? '|' : '') : msg2flat}
                  sent={phase >= 6}
                />
              )}

              {/* 机器人 typing 2 */}
              {phase === 7 && <TypingIndicator />}

              {/* 回复2：机器人 */}
              {phase >= 8 && <BotBubble text={reply2} />}

              {/* 消息3：用户 */}
              {phase >= 9 && (
                <UserBubble
                  text={phase === 9 ? typed3 + (showCursor ? '|' : '') : msg3flat}
                  sent={phase >= 10}
                />
              )}

              {/* 机器人 typing 3 */}
              {phase === 11 && <TypingIndicator />}

              {/* 回复3：机器人 */}
              {phase >= 12 && <BotBubble text={reply3} />}
            </div>

            {/* 输入栏 */}
            <div className="bg-[#F0F0F0] px-2 py-2 flex items-center gap-2">
              <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-gray-400 shadow-sm">输入消息...</div>
              <div className="w-9 h-9 bg-[#075E54] rounded-full flex items-center justify-center flex-shrink-0 shadow">
                <Send className="w-4 h-4 text-white" />
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

export default function OpenClawRobot() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showDemo, setShowDemo] = useState(false);

  const companyName = searchParams.get('name') || 'OpenClaw机器人助手';
  const companySeed = searchParams.get('seed') || 'OpenClaw';
  const companyDesc = searchParams.get('desc') || '';
  const shortName = companyName.replace('OpenClaw', '').trim();

  const allFeatures = [
    ...features,
    {
      id: 'wealth-planner',
      title: `${shortName}财富规划师`,
      desc: `专属${shortName}产品的财富规划顾问，为客户量身定制保障方案与长期资产配置策略，提供专业投保建议`,
      icon: Briefcase,
      color: 'from-rose-500 to-pink-600',
      shadow: 'shadow-rose-200',
      path: null,
      tag: '即将上线',
      tagColor: 'bg-rose-100 text-rose-700',
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-100">

      {/* Demo Modal */}
      {showDemo && (
        <PhoneDemo
          onClose={() => setShowDemo(false)}
          companyName={companyName}
          companySeed={companySeed}
        />
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-gray-800 via-slate-800 to-gray-800 shadow-xl sticky top-0 z-40 border-b border-gray-600/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </button>
          <div className="w-px h-5 bg-gray-600"></div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg overflow-hidden flex items-center justify-center shadow">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${companySeed}`} alt={companyName} className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">{companyName}</h1>
              {companyDesc && <p className="text-gray-400 text-xs">{companyDesc}</p>}
            </div>
          </div>
          <div className="ml-auto">
            <a
              href="https://wa.me/85262645180"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-all hover:scale-105 active:scale-95 shadow"
            >
              <MessageCircle className="w-4 h-4" />
              联系销售专员
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-gray-800 via-slate-700 to-gray-800 py-10 sm:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
          <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center flex-shrink-0">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${companySeed}`} alt={companyName} className="w-full h-full" />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 leading-tight">
              您好，我是{companyName}机器人助手
            </h2>
            <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
              我可以帮您制作计划书、查询保单信息、推送缴费通知，<br className="hidden sm:block" />
              以及对比分析多份计划书，让您的工作更高效。
            </p>
            <div className="flex flex-wrap gap-2 mt-5 justify-center sm:justify-start">
              {[
                { label: '制作计划书', color: 'bg-blue-500/80 border-blue-400/60' },
                { label: '查询保单',   color: 'bg-emerald-500/80 border-emerald-400/60' },
                { label: '缴费提醒',   color: 'bg-orange-500/80 border-orange-400/60' },
                { label: '对比分析',   color: 'bg-purple-500/80 border-purple-400/60' },
              ].map(({ label, color }) => (
                <span key={label} className={`flex items-center gap-1.5 px-3 py-1.5 ${color} backdrop-blur text-white text-xs font-semibold rounded-lg border shadow-sm`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80 inline-block"></span>
                  {label}
                </span>
              ))}
              {/* 演示按钮 */}
              <button
                onClick={() => setShowDemo(true)}
                className="flex items-center gap-2.5 px-7 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-extrabold text-base rounded-full shadow-xl shadow-orange-400/50 hover:shadow-orange-400/70 hover:scale-105 active:scale-95 transition-all ring-2 ring-white/30"
              >
                <Play className="w-5 h-5 fill-white" />
                查看演示
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
          我能帮您做什么
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {allFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                type="button"
                disabled={f.disabled}
                onClick={() => f.path && navigate(f.path)}
                className={`group relative bg-white rounded-2xl p-5 sm:p-6 shadow-md ${f.shadow} hover:shadow-xl transition-all duration-300 text-left flex items-start gap-4 border border-gray-100
                  ${f.disabled ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer'}`}
              >
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-base sm:text-lg font-bold text-gray-900">{f.title}</h4>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${f.tagColor}`}>{f.tag}</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
                {!f.disabled && (
                  <ChevronRight className="flex-shrink-0 w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
