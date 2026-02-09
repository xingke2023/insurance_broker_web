import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  'zh-CN': {
    translation: {
      // Header
      "header.title": "香港保險公司與香港保險產品專題網站",
      "header.subtitle": "香港保险行业AI智能化解决方案",
      "login": "登录",
      "register": "注册",
      "welcome": "欢迎，",
      "dashboard": "控制台",

      // HomePage
      "home.badge": "AI驱动的保险工具平台",
      "home.hero.title": "让保险业务",
      "home.hero.titleHighlight": "更智能更高效",
      "home.hero.description": "为保险从业者打造的AI智能工具平台，提供计划书分析、内容创作等核心功能，帮助您提升工作效率，专注于客户服务。",

      // Features
      "feature.planAssistant.title": "保险计划书助手",
      "feature.planAssistant.subtitle": "AI驱动的保险计划书分析专家",
      "feature.planAssistant.description": "上传保险计划书，AI自动识别并提取关键信息，支持多家计划书对比分析，提供多轮对话式问答，帮您快速理解复杂的保险条款和收益计算，为客户提供最优选择建议。",
      "feature.planAssistant.button": "开始使用",
      "feature.planAssistant.feat1": "高精度智能识别计划书内容",
      "feature.planAssistant.feat2": "智能提取受保人信息和保费数据",
      "feature.planAssistant.feat3": "保单年度收益统计与分析",
      "feature.planAssistant.feat4": "多家计划书比对及分析报表",
      "feature.planAssistant.feat5": "收益率自动计算与对比",
      "feature.planAssistant.feat6": "AI助手查询与解释计划书条款",

      "feature.aiWriting.title": "保險文案智能寫作及發佈工具",
      "feature.aiWriting.subtitle": "AI賦能的內容創作與多平台發布",
      "feature.aiWriting.description": "一站式保險營銷文案創作平台，AI智能生成專業內容，支持多平台一鍵發布，提升您的營銷效率。",
      "feature.aiWriting.button": "立即體驗",
      "feature.aiWriting.feat1": "AI智能生成保險文案",
      "feature.aiWriting.feat2": "多種風格模板選擇",
      "feature.aiWriting.feat3": "一鍵發布至多個平台",
      "feature.aiWriting.feat4": "SEO優化建議",
      "feature.aiWriting.feat5": "內容排程管理",
      "feature.aiWriting.feat6": "數據分析與洞察",

      // Highlights
      "highlight.title": "为什么选择我们？",
      "highlight.subtitle": "专业、高效、智能的保险工具平台",
      "highlight.speed.title": "极速响应",
      "highlight.speed.desc": "AI流式输出，实时反馈，无需等待，提升工作效率",
      "highlight.analysis.title": "智能分析",
      "highlight.analysis.desc": "自动识别文档内容，提取关键信息，准确率高达95%",
      "highlight.ai.title": "AI赋能",
      "highlight.ai.desc": "采用最新AI技术，持续优化升级，始终保持领先",

      // Stats
      "stats.users": "活跃用户",
      "stats.docs": "文档分析",
      "stats.accuracy": "准确率",
      "stats.service": "在线服务",

      // CTA
      "cta.title": "准备开始了吗？",
      "cta.subtitle": "立即注册，免费体验AI驱动的保险工具平台",
      "cta.start": "开始使用",
      "cta.register": "免费注册",
      "cta.login": "立即登录",

      // Footer
      "footer.title": "保险工具平台",
      "footer.desc": "AI驱动的专业保险工具",
      "footer.products": "产品",
      "footer.planTool": "计划书助手",
      "footer.writingTool": "文案工具",
      "footer.dataAnalysis": "数据分析",
      "footer.support": "支持",
      "footer.helpCenter": "帮助中心",
      "footer.tutorials": "使用教程",
      "footer.contact": "联系我们",
      "footer.about": "关于",
      "footer.aboutUs": "关于我们",
      "footer.privacy": "隐私政策",
      "footer.terms": "服务条款",
      "footer.copyright": "© 2025 HONGKONG MACRODATA TECHNOLOGY LIMITED. All rights reserved.",

      // Hero Section
      "hero.title": "大幅提升保险从业者工作效率的AI智能工具集",
      "search.placeholder": "搜索工具名称或功能...",

      // Categories
      "category.all": "全部",
      "category.analysis": "分析工具",
      "category.management": "管理工具",
      "category.marketing": "营销工具",
      "category.calculation": "计算工具",
      "category.training": "培训工具",
      "category.finance": "财务工具",
      "category.service": "服务工具",
      "category.storage": "存储工具",
      "category.compliance": "合规工具",
      "category.underwriting": "核保工具",
      "category.claims": "理赔工具",

      // Tools Section
      "tools.discover": "发现工具",
      "tools.subtitle": "选择适合您业务需求的专业工具",
      "tools.use": "立即使用",
      "tools.noResults": "未找到匹配的工具",
      "tools.tryOther": "尝试使用其他关键词搜索",

      // Tool Names
      "tool.underwriting": "智能核保助手",
      "tool.underwriting.desc": "基于AI的智能核保系统，快速评估风险，提高核保效率",
      "tool.calculator": "保费计算器",
      "tool.calculator.desc": "精准的保费计算工具，支持多种保险产品和费率模型",
      "tool.crm": "客户关系管理CRM",
      "tool.crm.desc": "全方位的客户关系管理，提升客户服务质量",
      "tool.policy": "保单管理",
      "tool.policy.desc": "高效的保单全生命周期管理系统",
      "tool.analytics": "数据分析仪表盘",
      "tool.analytics.desc": "可视化数据分析，洞察业务趋势和机会",
      "tool.claims": "理赔审核系统",
      "tool.claims.desc": "智能理赔审核，提高理赔处理效率和准确性",
      "tool.compliance": "合规检查工具",
      "tool.compliance.desc": "自动化合规检查，确保业务符合监管要求",
      "tool.renewal": "续保提醒系统",
      "tool.renewal.desc": "智能续保提醒，提高续保率和客户满意度",
      "tool.aiwriting": "保险文案智能写作及发布系统",
      "tool.aiwriting.desc": "AI驱动的保险营销文案创作与多平台一键发布",
      "tool.training": "培训学习平台",
      "tool.training.desc": "专业的保险知识培训和考试系统",
      "tool.commission": "佣金计算系统",
      "tool.commission.desc": "精准的佣金计算和结算管理系统",
      "tool.customer": "在线客服系统",
      "tool.customer.desc": "AI辅助的智能客服系统，提升客户体验，精准的回复",
      "tool.storage": "文档云存储",
      "tool.storage.desc": "安全的保险文档云端存储和管理系统",
      "tool.plananalyzer": "计划书智能分析工具",
      "tool.plananalyzer.desc": "使用AI技术智能解析保单文档，自动提取关键信息并生成分析报告",
      "tool.planmanage": "计划书管理",
      "tool.planmanage.desc": "查看和管理所有已保存的保险计划书文档",

      // Stats
      "stats.tools": "专业工具",
      "stats.users": "活跃用户",
      "stats.efficiency": "效率提升",
      "stats.satisfaction": "满意度",

      // Footer
      "footer.about": "关于我们",
      "footer.about.desc": "专注于为保险从业者提供专业的数字化工具和解决方案",
      "footer.products": "产品服务",
      "footer.underwriting": "核保工具",
      "footer.claims": "理赔系统",
      "footer.analytics": "数据分析",
      "footer.customer": "客户管理",
      "footer.help": "帮助中心",
      "footer.docs": "使用文档",
      "footer.videos": "视频教程",
      "footer.faq": "常见问题",
      "footer.contact": "联系我们",
      "footer.contactInfo": "联系方式",
      "footer.phone": "客服电话：852 62645180",
      "footer.email": "邮箱：client@xingke888.com",
      "footer.hours": "工作时间：周一至周五 9:00-18:00",
      "footer.copyright": "© 2025 HONGKONG MACRODATA TECHNOLOGY LIMITED. All rights reserved."
    }
  },
  'zh-TW': {
    translation: {
      // Header
      "header.title": "香港保險公司與香港保險產品專題網站",
      "header.subtitle": "香港保險行業AI智能化解決方案",
      "login": "登錄",
      "register": "註冊",
      "welcome": "歡迎，",
      "dashboard": "控制台",

      // HomePage
      "home.badge": "AI驅動的保險工具平台",
      "home.hero.title": "讓保險業務",
      "home.hero.titleHighlight": "更智能更高效",
      "home.hero.description": "為保險從業者打造的AI智能工具平台，提供計劃書分析、內容創作等核心功能，幫助您提升工作效率，專注於客戶服務。",

      // Features
      "feature.planAssistant.title": "保險計劃書助手",
      "feature.planAssistant.subtitle": "AI驅動的保險計劃書分析專家",
      "feature.planAssistant.description": "上傳保險計劃書，AI自動識別並提取關鍵信息，支持多家計劃書對比分析，提供多輪對話式問答，幫您快速理解複雜的保險條款和收益計算，為客戶提供最優選擇建議。",
      "feature.planAssistant.button": "開始使用",
      "feature.planAssistant.feat1": "高精度智能識別計劃書內容",
      "feature.planAssistant.feat2": "智能提取受保人信息和保費數據",
      "feature.planAssistant.feat3": "保單年度收益統計與分析",
      "feature.planAssistant.feat4": "多家計劃書比對及分析報表",
      "feature.planAssistant.feat5": "收益率自動計算與對比",
      "feature.planAssistant.feat6": "AI助手查詢與解釋計劃書條款",

      "feature.aiWriting.title": "保險文案智能寫作及發佈工具",
      "feature.aiWriting.subtitle": "AI賦能的內容創作與多平台發布",
      "feature.aiWriting.description": "一站式保險營銷文案創作平台，AI智能生成專業內容，支持多平台一鍵發布，提升您的營銷效率。",
      "feature.aiWriting.button": "立即體驗",
      "feature.aiWriting.feat1": "AI智能生成保險文案",
      "feature.aiWriting.feat2": "多種風格模板選擇",
      "feature.aiWriting.feat3": "一鍵發布至多個平台",
      "feature.aiWriting.feat4": "SEO優化建議",
      "feature.aiWriting.feat5": "內容排程管理",
      "feature.aiWriting.feat6": "數據分析與洞察",

      // Highlights
      "highlight.title": "為什麼選擇我們？",
      "highlight.subtitle": "專業、高效、智能的保險工具平台",
      "highlight.speed.title": "極速響應",
      "highlight.speed.desc": "AI流式輸出，實時反饋，無需等待，提升工作效率",
      "highlight.analysis.title": "智能分析",
      "highlight.analysis.desc": "自動識別文檔內容，提取關鍵信息，準確率高達95%",
      "highlight.ai.title": "AI賦能",
      "highlight.ai.desc": "採用最新AI技術，持續優化升級，始終保持領先",

      // Stats
      "stats.users": "活躍用戶",
      "stats.docs": "文檔分析",
      "stats.accuracy": "準確率",
      "stats.service": "在線服務",

      // CTA
      "cta.title": "準備開始了嗎？",
      "cta.subtitle": "立即註冊，免費體驗AI驅動的保險工具平台",
      "cta.start": "開始使用",
      "cta.register": "免費註冊",
      "cta.login": "立即登錄",

      // Footer
      "footer.title": "保險工具平台",
      "footer.desc": "AI驅動的專業保險工具",
      "footer.products": "產品",
      "footer.planTool": "計劃書助手",
      "footer.writingTool": "文案工具",
      "footer.dataAnalysis": "數據分析",
      "footer.support": "支持",
      "footer.helpCenter": "幫助中心",
      "footer.tutorials": "使用教程",
      "footer.contact": "聯繫我們",
      "footer.about": "關於",
      "footer.aboutUs": "關於我們",
      "footer.privacy": "隱私政策",
      "footer.terms": "服務條款",
      "footer.copyright": "© 2025 HONGKONG MACRODATA TECHNOLOGY LIMITED. All rights reserved.",

      // Hero Section
      "hero.title": "大幅提升保險從業者工作效率的AI智能工具集",
      "search.placeholder": "搜索工具名稱或功能...",

      // Categories
      "category.all": "全部",
      "category.analysis": "分析工具",
      "category.management": "管理工具",
      "category.marketing": "營銷工具",
      "category.calculation": "計算工具",
      "category.training": "培訓工具",
      "category.finance": "財務工具",
      "category.service": "服務工具",
      "category.storage": "存儲工具",
      "category.compliance": "合規工具",
      "category.underwriting": "核保工具",
      "category.claims": "理賠工具",

      // Tools Section
      "tools.discover": "發現工具",
      "tools.subtitle": "選擇適合您業務需求的專業工具",
      "tools.use": "立即使用",
      "tools.noResults": "未找到匹配的工具",
      "tools.tryOther": "嘗試使用其他關鍵詞搜索",

      // Tool Names
      "tool.underwriting": "智能核保助手",
      "tool.underwriting.desc": "基於AI的智能核保系統，快速評估風險，提高核保效率",
      "tool.calculator": "保費計算器",
      "tool.calculator.desc": "精準的保費計算工具，支持多種保險產品和費率模型",
      "tool.crm": "客戶關係管理CRM",
      "tool.crm.desc": "全方位的客戶關係管理，提升客戶服務質量",
      "tool.policy": "保單管理",
      "tool.policy.desc": "高效的保單全生命週期管理系統",
      "tool.analytics": "數據分析儀錶盤",
      "tool.analytics.desc": "可視化數據分析，洞察業務趨勢和機會",
      "tool.claims": "理賠審核系統",
      "tool.claims.desc": "智能理賠審核，提高理賠處理效率和準確性",
      "tool.compliance": "合規檢查工具",
      "tool.compliance.desc": "自動化合規檢查，確保業務符合監管要求",
      "tool.renewal": "續保提醒系統",
      "tool.renewal.desc": "智能續保提醒，提高續保率和客戶滿意度",
      "tool.aiwriting": "保險文案智能寫作及發佈系統",
      "tool.aiwriting.desc": "AI驅動的保險營銷文案創作與多平台一鍵發佈",
      "tool.training": "培訓學習平台",
      "tool.training.desc": "專業的保險知識培訓和考試系統",
      "tool.commission": "佣金計算系統",
      "tool.commission.desc": "精準的佣金計算和結算管理系統",
      "tool.customer": "在線客服系統",
      "tool.customer.desc": "AI輔助的智能客服系統，提升客戶體驗，精準的回覆",
      "tool.storage": "文檔雲存儲",
      "tool.storage.desc": "安全的保險文檔雲端存儲和管理系統",
      "tool.plananalyzer": "計劃書智能分析工具",
      "tool.plananalyzer.desc": "使用AI技術智能解析保單文檔，自動提取關鍵信息並生成分析報告",
      "tool.planmanage": "計劃書管理",
      "tool.planmanage.desc": "查看和管理所有已保存的保險計劃書文檔",

      // Stats
      "stats.tools": "專業工具",
      "stats.users": "活躍用戶",
      "stats.efficiency": "效率提升",
      "stats.satisfaction": "滿意度",

      // Footer
      "footer.about": "關於我們",
      "footer.about.desc": "專注於為保險從業者提供專業的數字化工具和解決方案",
      "footer.products": "產品服務",
      "footer.underwriting": "核保工具",
      "footer.claims": "理賠系統",
      "footer.analytics": "數據分析",
      "footer.customer": "客戶管理",
      "footer.help": "幫助中心",
      "footer.docs": "使用文檔",
      "footer.videos": "視頻教程",
      "footer.faq": "常見問題",
      "footer.contact": "聯繫我們",
      "footer.contactInfo": "聯繫方式",
      "footer.phone": "客服電話：852 62645180",
      "footer.email": "郵箱：client@xingke888.com",
      "footer.hours": "工作時間：週一至週五 9:00-18:00",
      "footer.copyright": "© 2025 HONGKONG MACRODATA TECHNOLOGY LIMITED. All rights reserved."
    }
  },
  'en': {
    translation: {
      // Header
      "header.title": "Hong Kong Insurance Companies and Products Portal",
      "header.subtitle": "AI-Driven Solutions for Hong Kong Insurance Industry",
      "login": "Login",
      "register": "Register",
      "welcome": "Welcome, ",
      "dashboard": "Dashboard",

      // HomePage
      "home.badge": "AI-Driven Insurance Tool Platform",
      "home.hero.title": "Make Insurance Business",
      "home.hero.titleHighlight": "Smarter and More Efficient",
      "home.hero.description": "An AI-powered tool platform built for insurance professionals, providing core features such as plan analysis and content creation to help you improve efficiency and focus on customer service.",

      // Features
      "feature.planAssistant.title": "Insurance Plan Assistant",
      "feature.planAssistant.subtitle": "AI-Powered Insurance Plan Analysis Expert",
      "feature.planAssistant.description": "Upload insurance plans, AI automatically recognizes and extracts key information, supports multi-plan comparison analysis, provides multi-round conversational Q&A, helps you quickly understand complex insurance terms and benefit calculations, and provides optimal recommendations for clients.",
      "feature.planAssistant.button": "Get Started",
      "feature.planAssistant.feat1": "High-precision intelligent recognition of plan content",
      "feature.planAssistant.feat2": "Intelligent extraction of insured information and premium data",
      "feature.planAssistant.feat3": "Policy year benefit statistics and analysis",
      "feature.planAssistant.feat4": "Multi-plan comparison and analysis reports",
      "feature.planAssistant.feat5": "Automatic calculation and comparison of return rates",
      "feature.planAssistant.feat6": "AI assistant to query and explain plan terms",

      "feature.aiWriting.title": "Insurance Content AI Writing & Publishing Tool",
      "feature.aiWriting.subtitle": "AI-Powered Content Creation and Multi-Platform Publishing",
      "feature.aiWriting.description": "One-stop insurance marketing content creation platform, AI intelligently generates professional content, supports one-click publishing to multiple platforms, enhancing your marketing efficiency.",
      "feature.aiWriting.button": "Try Now",
      "feature.aiWriting.feat1": "AI-powered insurance content generation",
      "feature.aiWriting.feat2": "Multiple style template options",
      "feature.aiWriting.feat3": "One-click publishing to multiple platforms",
      "feature.aiWriting.feat4": "SEO optimization suggestions",
      "feature.aiWriting.feat5": "Content scheduling management",
      "feature.aiWriting.feat6": "Data analysis and insights",

      // Highlights
      "highlight.title": "Why Choose Us?",
      "highlight.subtitle": "Professional, Efficient, Intelligent Insurance Tool Platform",
      "highlight.speed.title": "Lightning Fast",
      "highlight.speed.desc": "AI streaming output, real-time feedback, no waiting, boost productivity",
      "highlight.analysis.title": "Smart Analysis",
      "highlight.analysis.desc": "Automatic document recognition, extract key information with up to 95% accuracy",
      "highlight.ai.title": "AI Empowered",
      "highlight.ai.desc": "Using latest AI technology, continuous optimization and upgrades, always staying ahead",

      // Stats
      "stats.users": "Active Users",
      "stats.docs": "Documents Analyzed",
      "stats.accuracy": "Accuracy",
      "stats.service": "Online Service",

      // CTA
      "cta.title": "Ready to Get Started?",
      "cta.subtitle": "Register now for free to experience our AI-driven insurance tool platform",
      "cta.start": "Get Started",
      "cta.register": "Free Sign Up",
      "cta.login": "Login Now",

      // Footer
      "footer.title": "Insurance Tool Platform",
      "footer.desc": "AI-Driven Professional Insurance Tools",
      "footer.products": "Products",
      "footer.planTool": "Plan Assistant",
      "footer.writingTool": "Content Tools",
      "footer.dataAnalysis": "Data Analytics",
      "footer.support": "Support",
      "footer.helpCenter": "Help Center",
      "footer.tutorials": "Tutorials",
      "footer.contact": "Contact Us",
      "footer.about": "About",
      "footer.aboutUs": "About Us",
      "footer.privacy": "Privacy Policy",
      "footer.terms": "Terms of Service",
      "footer.copyright": "© 2025 HONGKONG MACRODATA TECHNOLOGY LIMITED. All rights reserved.",

      // Hero Section
      "hero.title": "AI-Powered Tools to Significantly Boost Productivity",
      "search.placeholder": "Search for tools or features...",

      // Categories
      "category.all": "All",
      "category.analysis": "Analytics",
      "category.management": "Management",
      "category.marketing": "Marketing",
      "category.calculation": "Calculation",
      "category.training": "Training",
      "category.finance": "Finance",
      "category.service": "Service",
      "category.storage": "Storage",
      "category.compliance": "Compliance",
      "category.underwriting": "Underwriting",
      "category.claims": "Claims",

      // Tools Section
      "tools.discover": "Discover Tools",
      "tools.subtitle": "Choose professional tools that fit your business needs",
      "tools.use": "Use Now",
      "tools.noResults": "No matching tools found",
      "tools.tryOther": "Try searching with different keywords",

      // Tool Names
      "tool.underwriting": "Smart Underwriting Assistant",
      "tool.underwriting.desc": "AI-based intelligent underwriting system for quick risk assessment and improved efficiency",
      "tool.calculator": "Premium Calculator",
      "tool.calculator.desc": "Accurate premium calculation tool supporting multiple insurance products and rate models",
      "tool.crm": "Customer Relationship Management CRM",
      "tool.crm.desc": "Comprehensive customer relationship management to enhance service quality",
      "tool.policy": "Policy Management",
      "tool.policy.desc": "Efficient full lifecycle policy management system",
      "tool.analytics": "Data Analytics Dashboard",
      "tool.analytics.desc": "Visual data analysis for business trends and opportunities insights",
      "tool.claims": "Claims Review System",
      "tool.claims.desc": "Intelligent claims review for improved processing efficiency and accuracy",
      "tool.compliance": "Compliance Checker",
      "tool.compliance.desc": "Automated compliance checks to ensure regulatory adherence",
      "tool.renewal": "Renewal Reminder System",
      "tool.renewal.desc": "Smart renewal reminders to improve retention rates and customer satisfaction",
      "tool.aiwriting": "Insurance Content AI Writing & Publishing System",
      "tool.aiwriting.desc": "AI-driven insurance marketing content creation with one-click multi-platform publishing",
      "tool.training": "Training & Learning Platform",
      "tool.training.desc": "Professional insurance knowledge training and examination system",
      "tool.commission": "Commission Calculation System",
      "tool.commission.desc": "Precise commission calculation and settlement management system",
      "tool.customer": "Online Customer Service System",
      "tool.customer.desc": "AI-assisted intelligent customer service system for enhanced customer experience with accurate responses",
      "tool.storage": "Document Cloud Storage",
      "tool.storage.desc": "Secure cloud storage and management system for insurance documents",
      "tool.plananalyzer": "Plan Analysis Tool",
      "tool.plananalyzer.desc": "AI-powered intelligent parsing of policy documents with automatic key information extraction and analysis reports",
      "tool.planmanage": "Plan Management",
      "tool.planmanage.desc": "View and manage all saved insurance plan documents",

      // Stats
      "stats.tools": "Professional Tools",
      "stats.users": "Active Users",
      "stats.efficiency": "Efficiency Boost",
      "stats.satisfaction": "Satisfaction",

      // Footer
      "footer.about": "About Us",
      "footer.about.desc": "Dedicated to providing professional digital tools and solutions for insurance professionals",
      "footer.products": "Products & Services",
      "footer.underwriting": "Underwriting Tools",
      "footer.claims": "Claims System",
      "footer.analytics": "Data Analytics",
      "footer.customer": "Customer Management",
      "footer.help": "Help Center",
      "footer.docs": "Documentation",
      "footer.videos": "Video Tutorials",
      "footer.faq": "FAQ",
      "footer.contact": "Contact Us",
      "footer.contactInfo": "Contact Information",
      "footer.phone": "Phone: 852 62645180",
      "footer.email": "Email: client@xingke888.com",
      "footer.hours": "Hours: Monday - Friday 9:00-18:00",
      "footer.copyright": "© 2025 HONGKONG MACRODATA TECHNOLOGY LIMITED. All rights reserved."
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh-TW', // 默认语言
    fallbackLng: 'zh-TW',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
