import os
import json
import sys
import random
import time
import django
import requests

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

try:
    django.setup()
    from api.models import CustomerCase
except Exception as e:
    print(f"Error: Could not setup Django: {e}")
    sys.exit(1)

# API配置 - 使用 aiionly.com 服务
API_URL = "https://api.aiionly.com/v1/chat/completions"
API_KEY = "sk-b4fc88a5350b6686b9cf5ff462e106c1d1639b5dfa023f1328684ee82cfb2b77"
MODEL_NAME = "gemini-3-flash-preview"

# 📌 标签池定义 (Tag Pool)
# 主标签（4个，必选其一）
PRIMARY_TAGS = ["基础认知", "重疾保障", "理财储蓄", "理赔售后"]

# 辅助标签（12个，可选1-2个）
SECONDARY_TAGS = [
    "避坑指南", "法律风险", "高赞回答", "实操攻略",
    "产品对比", "条款解读", "理赔案例", "税务筹划",
    "资产配置", "监管政策", "常见误区", "专业进阶"
]

# 总标签数：4个主标签 + 12个辅助标签 = 16个

# 🔥 香港保险精品问答话题库 (HK Insurance Q&A & Insights)
# 涵盖避坑、理财、重疾、理赔等核心痛点，侧重老百姓关心的真实问题
TOPIC_SEEDS = [
    # --- 1. 灵魂拷问：到底值不值？(Value & Comparison) ---
    "同样的保额，为什么香港保险比内地保险便宜？是坑还是真划算？(Price Difference)",
    "我有内地医保和百万医疗险了，还有必要去香港买保险吗？(Necessity)",
    "香港储蓄险前两年退保一分钱拿不回？为什么现金价值这么低？(Surrender Pitfall)",
    "都说香港保险'严进宽出'，到底'严'在哪？体检稍微有点小毛病会被拒保吗？(Underwriting Strictness)",

    # --- 2. 理赔实操：钱怎么拿？(Claims & Money) ---
    "人在内地生病了，理赔必须亲自去香港吗？要在香港住院才能赔吗？(Remote Claims)",
    "理赔下来的几十万美金支票，我在内地怎么兑换成人民币？(Fund Repatriation)",
    "香港保险公司会倒闭吗？如果倒闭了我的保单谁来管？(Insolvency Protection)",
    "如果不小心忘记交保费了，保单会立刻失效吗？怎么补救？(Lapse & Reinstatement)",
    "内地三甲医院的诊断书，香港保险公司认不认？有没有'黑名单'医院？(Hospital Recognition)",

    # --- 3. 重疾避坑：防拒赔 (Critical Illness Pitfalls) ---
    "香港重疾险的'癌症多次赔付'，要求间隔3年还是1年？这里的猫腻即使经纪人也不一定告诉你 (Multiple Claims Trap)",
    "甲状腺结节、乳腺结节投保时没说，几年后得癌了会被拒赔吗？(Non-disclosure Risk)",
    "'原位癌'和'早期癌症'是一回事吗？香港保险赔不赔？(Carcinoma in situ)",
    "心脏支架手术，在香港算轻症还是重症？跟内地定义不一样要小心！(Heart Stent Definition)",

    # --- 4. 理财与传承：给孩子和自己 (Wealth & Legacy) ---
    "给刚出生的宝宝买香港储蓄险，真的能存出千万教育金吗？数据实测 (Education Fund)",
    "我想给孩子存钱，是选'更换受保人'功能强的，还是收益高的？(Policy Change Option)",
    "香港保单能避债吗？如果我做生意破产了，这笔钱会被法院查封吗？(Asset Protection)",
    "离婚时，我给孩子买的香港保单会被当作夫妻共同财产分割吗？(Divorce Risk)",
    "我想用香港保单做养老金，60岁开始每年领钱，能领多久？(Retirement Income)",
    "怎么用一张保单实现'富过三代'？详解保单拆分和无限次更名功能 (Legacy Planning)",
    
    # --- 5. 常见误区与谣言 (Myths) ---
    "听说香港保险不受内地法律保护，这就是'地下保单'吗？真相是什么？(Legal Status)",
    "现在去香港买保险，保费还能直接刷内地银行卡吗？(Payment Methods 2026)",
    "香港保险的'不可争议条款'是免死金牌吗？是不是骗保两年后也能赔？(Incontestability Myth)",
    "找保险经纪人买还是找银行买？后续服务到底有什么区别？(Broker vs Bank)",

    # --- 6. 专业进阶与标准问答 (Professional & Standard FAQs) ---
    "香港保险公司的'信用评级'（如S&P, Moody's）怎么看？对投保人意味着什么？(Credit Ratings)",
    "保单持有人、受保人、受益人、后备持有人：深度解析这四个角色的权利与义务 (Policy Roles)",
    "香港保险业监管局（IA）是如何监管保险公司的？保单持有人的合法权益由谁保障？(Regulatory Framework)",
    "什么是'保费融资'（Premium Financing）？银行贷款买保险的杠杆原理与风险测评 (Premium Financing Deep Dive)",
    "如何解读香港保险计划书中的'悲观情境'与'乐观情境'？GN16指引下的合规演示 (Benefit Illustration)",
    "香港信托与保险结合（Insurance Trust）：成立门槛、费用及资产隔离效果详解 (Trust Structure)",

    # --- 7. 投保实操：签单流程与注意事项 (Application Process & Practicality) ---
    "第一次去香港买保险，需要准备什么资料？身份证、通行证、住址证明都有什么要求？(Required Documents)",
    "香港保险必须本人去香港签单吗？可以代签吗？疫情后有什么新规定？(In-person Signing)",
    "投保时的'健康告知'到底要说到什么程度？感冒、体检异常要不要告知？(Health Declaration Scope)",
    "如果体检查出小毛病（如高血压、脂肪肝），香港保险公司会直接拒保还是加费承保？(Underwriting Outcomes)",
    "我有社保和内地商业保险，买香港保险时需要告知吗？会影响核保吗？(Existing Coverage Disclosure)",
    "投保后多久可以拿到正式保单？电子保单和纸质保单有什么区别？(Policy Delivery)",
    "香港保险的'冷静期'是多少天？如果后悔了怎么退保？能退多少钱？(Cooling-off Period)",
    "保费是用港币还是美元支付？汇率波动会影响我的收益吗？(Currency & FX Risk)",
    "首次缴费后，第二年的保费怎么交？必须去香港吗？可以自动扣款吗？(Premium Payment Methods)",
    "如果我的工作、收入、家庭情况发生变化，需要通知保险公司吗？(Policy Updates)",

    # --- 8. 计划书条款解读：看懂那些'坑' (Policy Document Interpretation) ---
    "计划书上的'保证现金价值'和'非保证现金价值'到底什么意思？哪个靠谱？(Cash Value Types)",
    "为什么计划书上写'预期回报6%'，但实际IRR只有3-4%？数字陷阱在哪？(IRR Trap)",
    "计划书里的'保单年度'和'保单周年日'是一回事吗？什么时候可以取钱？(Policy Year vs Anniversary)",
    "看到计划书上有'等候期'、'生存期'、'观察期'，这三个到底有什么区别？(Waiting Periods)",
    "重疾险计划书里的'早期危疾'赔20%，'严重疾病'赔100%，怎么区分？(Illness Severity Tiers)",
    "计划书上写'保额每年递增3%'，是保证的还是非保证的？怎么判断？(Guaranteed vs Non-guaranteed Benefits)",
    "'免付保费保障'是什么？如果我残疾了，保险公司真的会帮我交保费吗？(Premium Waiver)",
    "计划书上的'身故赔偿'和'退保价值'哪个高？什么情况下赔身故？(Death Benefit vs Surrender Value)",
    "看到计划书里有'保单贷款'功能，利率多少？借款会影响收益吗？(Policy Loan)",
    "计划书最后一页的'重要事项'和'不保事项'，有哪些坑一定要注意？(Exclusions & Fine Print)",
    "为什么同一个产品，不同经纪给的计划书收益数字不一样？有猫腻吗？(Illustration Variations)",
    "计划书上的'总保费'和'总缴保费'不一样？哪个才是我真正要交的钱？(Premium Terminology)",

    # --- 9. 客户常见顾虑与决策困境 (Customer Hesitations & Dilemmas) ---
    "我在内地有工作，每年去香港一趟很麻烦，香港保险后续服务会不会很不方便？(Service Accessibility)",
    "万一以后香港和内地关系变化，我的保单会受影响吗？有没有政治风险？(Political Risk)",
    "我年收入只有20万，每年交5万保费会不会太激进？怎么判断自己的承受能力？(Affordability Assessment)",
    "纠结要不要给孩子买香港保险：万一孩子以后不需要这笔钱呢？会不会浪费？(Education Fund Necessity)",
    "重疾险保额买50万够不够？如果不够，以后可以加保吗？(Coverage Adequacy)",
    "已经35岁了，现在买重疾险会不会太晚？保费会不会很贵？(Age & Insurability)",
    "想给父母买香港保险，但他们已经55岁了，还能买吗？有什么限制？(Senior Insurance)",
    "如果我移民了（比如去加拿大、美国），香港保单还能继续有效吗？(Immigration Impact)",
    "看到某个产品IRR很高，但保险公司不是很有名，敢不敢买？(Brand vs Return)",
    "经纪说这款产品'限时优惠'、'马上停售'，是真的还是销售话术？怎么判断？(Sales Pressure Tactics)",
]

def generate_new_topic():
    """Generate a new unique topic using aiionly.com API"""
    try:
        # 随机选择一个搜索关键词方向（更加多样化和开放）
        search_directions = [
            # 基础场景
            "香港保险 常见问题",
            "香港保险 避坑",
            "香港保险 投保流程",
            "香港保险 理赔实操",

            # 产品类型
            "香港储蓄险 2026",
            "香港重疾险 最新",
            "香港医疗险 对比",
            "香港年金险 养老",
            "香港定期寿险",

            # 公司对比
            "友邦 vs 保诚 2026",
            "宏利 vs 万通 哪个好",
            "香港保险公司排名",
            "安盛 新产品",

            # 人群场景
            "00后 买香港保险",
            "中产家庭 香港保险配置",
            "高净值人群 香港保单",
            "新手爸妈 给孩子买保险",
            "40岁+ 重疾险 还能买吗",

            # 热点话题
            "香港保险 新政策 2026",
            "香港保险 AI核保",
            "香港保险 数字人民币",
            "香港保险 线上投保",
            "CRS 香港保单",

            # 具体痛点
            "香港保险 健康告知 技巧",
            "香港保险 计划书 陷阱",
            "香港保单 理赔被拒",
            "香港保险 退保 损失",
            "香港保险 保单贷款",

            # 跨境相关
            "移民加拿大 香港保单",
            "跨境税务 香港保险",
            "美元贬值 香港保单",
            "大湾区 香港保险",

            # 服务细节
            "香港保险 经纪人服务",
            "香港保险 续期缴费",
            "香港保险 保单变更",
            "香港保险 客服体验",

            # 新兴话题
            "香港保险 ChatGPT 分析",
            "香港保险 小红书 推荐",
            "香港保险 直播间 靠谱吗",
            "香港保险 网红产品 真相"
        ]

        search_query = random.choice(search_directions)

        prompt = f"""
        **任务**：基于搜索关键词"{search_query}"，从当前真实的网络讨论、新闻动态、用户评论中提炼出1个热门或有价值的香港保险问答话题。

        **核心要求**：
        1. **必须原创**：避免生成老生常谈的问题，要挖掘新角度、新场景、新痛点
        2. **贴近现实**：基于2026年最新的行业动态、政策变化、产品更新
        3. **具体场景化**：不要泛泛而谈，要针对具体人群、具体产品、具体场景
        4. **引发共鸣**：能让读者产生"这就是我想问的"或"没想到还有这个问题"的感觉
        5. **可操作性**：问题应该能给出实操建议，而非纯理论探讨

        **话题来源灵感**（开放式，不限于此）：
        - 📱 社交媒体讨论：小红书、知乎、微信群里大家在问什么？
        - 📰 最新新闻：保险公司新产品、监管新政策、行业新变化
        - 💬 真实客户咨询：签单现场、理赔过程中遇到的实际困惑
        - 🔥 争议话题：经纪人不愿说的、条款容易误解的、容易踩坑的
        - 🆕 新兴场景：数字货币出金、跨境税务、AI核保、线上签单
        - 🌏 地域差异：深圳客户 vs 上海客户、一线城市 vs 二线城市
        - 👥 人群细分：新手父母、高净值人群、移民家庭、自由职业者
        - 🏢 产品创新：新功能、新保障、新玩法、新组合

        **创新角度示例**（启发思路，不要照搬）：
        - "2026年香港保险公司开始接受数字人民币缴费了吗？如何操作？"
        - "在深圳工作的00后，第一次买香港保险应该注意什么？"
        - "香港保险公司开始用AI审核健康告知了？会更严格还是更宽松？"
        - "离婚协议里写明香港保单归孩子，法院认可吗？怎么操作才有效？"
        - "香港保险理赔款打到内地银行卡，会被银行问资金来源吗？"
        - "计划移民加拿大，香港保单要不要提前退？还是可以继续持有？"
        - "香港保险经纪人跳槽了，我的保单服务会受影响吗？"
        - "同一家公司的旧产品和新产品，哪个更值得买？"

        **输出要求**：
        - 直接返回一个问题（50-80字）
        - 不要编号、不要前缀、不要引号
        - 问题要具体、新颖、接地气
        - 避免生成已经被过度讨论的老话题
        """

        # 构建API请求
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}"
        }

        payload = {
            "model": MODEL_NAME,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 200,
            "temperature": 0.8
        }

        # 发送请求
        response = requests.post(
            API_URL,
            headers=headers,
            json=payload,
            timeout=60
        )

        if response.status_code == 200:
            response_data = response.json()
            topic = response_data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
            # 清理可能的多余字符
            topic = topic.replace('"', '').replace('**', '').strip()
            return topic
        else:
            print(f"⚠️ Topic generation API error: {response.status_code} - {response.text[:200]}")
            return random.choice(TOPIC_SEEDS)

    except Exception as e:
        print(f"⚠️ Topic generation error: {e}")
        # Fallback to original seeds
        return random.choice(TOPIC_SEEDS)

def generate_qa_content(seed):
    """Generate high-quality Q&A content using aiionly.com API with gemini-3-pro-preview"""
    try:
        prompt = f"""
        【高质量内容生成指令】
        主题："{seed}"

        **目标**：生成一篇适合普通人阅读的"香港保险高赞问答"。
        **风格**：
        - **讲人话**：拒绝掉书袋，用大白话解释复杂条款。
        - **有态度**：客观中立但要有观点，敢于揭露行业潜规则或常见误区。
        - **有干货**：必须包含实操建议或数据对比，让读者觉得"赚到了"。

        **JSON Output Structure (Fields Mapping):**
        - **title**: 基于"{seed}"生成一个更吸引人的标题（可以改写，但保留核心意思）.
        - **category**: 固定填写 "港险问答".
        - **tags**: 标签列表，最多3个标签。
            - 第一个标签（主标签）必须从以下4个中选择一个：["基础认知", "重疾保障", "理财储蓄", "理赔售后"]
            - 后续1-2个标签（辅助标签）从以下12个中选择：["避坑指南", "法律风险", "高赞回答", "实操攻略", "产品对比", "条款解读", "理赔案例", "税务筹划", "资产配置", "监管政策", "常见误区", "专业进阶"]
        - **content**: 【高赞回答内容 + 参考资料】：
            请模拟一位资深、犀利的保险专家的口吻进行回答。

            **写作要求**：
            - 自由组织内容结构，不要使用固定的章节模板
            - 根据话题特点灵活安排内容层次
            - 用Markdown标题（###）自然划分段落，标题要贴合具体话题
            - 可以用"举个栗子"、案例分析、对比表格等方式辅助说明
            - 揭露常见误区、提供实操建议、引用真实数据
            - 语言风格：专业但接地气，有观点但不强行灌输
            - ⚠️ **重要禁忌**：避免讨论"分红实现率"、"红利演示"、"分红能不能兑现"等分红相关敏感话题

            **可选元素**（根据话题选择使用）：
            - 核心结论陈述
            - 误区澄清
            - 条款解读
            - 场景案例
            - 实操建议
            - 参考文献（格式：[1] 来源名称。例如：[1] 香港保监局 GN16）

            （总字数要求：600-1000字，排版要舒服，多用短句）.
        - **key_points**: 3-5条"省流版"重点（每条简练有力，适合截图发朋友圈）.

        **Technical Requirements:**
        - 必须返回严格的 JSON 格式，不要包含其他文字。
        - 语言：中文。
        - 风格：知乎高赞/专业科普风。
        """

        # 构建API请求
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}"
        }

        payload = {
            "model": MODEL_NAME,
            "messages": [
                {
                    "role": "system",
                    "content": "你是一位资深的香港保险专家，擅长用通俗易懂的语言解释复杂的保险问题。你必须严格按照JSON格式输出，不要包含任何其他文字或解释。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 4000,
            "temperature": 0.7,
            "response_format": {"type": "json_object"}
        }

        # 发送请求
        response = requests.post(
            API_URL,
            headers=headers,
            json=payload,
            timeout=120
        )

        if response.status_code == 200:
            response_data = response.json()
            content_text = response_data.get('choices', [{}])[0].get('message', {}).get('content', '')

            if content_text:
                # 解析JSON响应
                try:
                    return json.loads(content_text)
                except json.JSONDecodeError as je:
                    print(f"⚠️ JSON parsing error: {je}")
                    print(f"   Raw response: {content_text[:500]}")
                    return None
            else:
                print("⚠️ Empty response from API")
                return None
        else:
            print(f"⚠️ API error: {response.status_code} - {response.text[:200]}")
            return None

    except requests.exceptions.Timeout:
        print(f"⚠️ Request timeout")
        return None
    except Exception as e:
        print(f"⚠️ Generation Error: {e}")
        return None

def save_case(case_data):
    # Handle case where API returns a list instead of dict
    if isinstance(case_data, list):
        if len(case_data) == 0:
            print(f"⚠️ Empty case data list")
            return
        case_data = case_data[0]  # Take first element

    # Validate case_data is a dictionary
    if not isinstance(case_data, dict):
        print(f"⚠️ Invalid case data type: {type(case_data)}")
        return

    # Check for required title field
    if 'title' not in case_data:
        print(f"⚠️ Missing title field in case data")
        return

    # Check for duplicate titles to avoid spamming
    if CustomerCase.objects.filter(title=case_data['title']).exists():
        print(f"Skipping duplicate: {case_data['title']}")
        return

    try:
        # Limit tags to maximum 3
        tags = case_data.get('tags', [])
        if len(tags) > 3:
            tags = tags[:3]

        CustomerCase.objects.create(
            # Core Q&A fields
            title=case_data.get('title'),                         # Question
            category='港险问答',                                   # Fixed category
            tags=tags,                                            # Tags from AI (max 3)
            content=case_data.get('content', ''),                 # Answer (main content) - 使用content字段
            key_points=case_data.get('key_points', []),           # Key takeaways

            # Placeholder fields (required by model but not used for Q&A)
            customer_age=35,
            annual_income=0,
            family_structure='',  # Empty for Q&A
            insurance_needs='',   # Not used for Q&A
            case_description='',  # 港险问答不使用case_description
            recommended_products=[],
            total_annual_premium=0,
            budget_suggestion='',
            is_active=True
        )
        print(f"✅ SAVED Q&A: {case_data['title']} (Category: {case_data.get('category')})")
    except Exception as e:
        print(f"❌ DB Error: {e}")

def main():
    print("🔥 Starting 'HK Insurance Knowledge Base' Generator (AI-Powered Topics)")
    print("   - Mode: Dynamic topic generation + Google Search")
    print("   - Style: Expert Q&A with flexible structure")
    print("--------------------------------------------------")

    consecutive_failures = 0
    max_consecutive_failures = 3

    while True:
        # Generate new unique topic using AI
        current_time = time.strftime("%H:%M:%S")
        print(f"\n[{current_time}] 💡 Generating new topic...")
        seed = generate_new_topic()
        print(f"   📌 Topic: {seed}")

        case_data = generate_qa_content(seed)

        if case_data:
            save_case(case_data)
            consecutive_failures = 0  # Reset failure counter on success
        else:
            print("   -> Failed to generate content.")
            consecutive_failures += 1

        # If too many consecutive failures, use fallback seed
        if consecutive_failures >= max_consecutive_failures:
            print(f"   ⚠️ {consecutive_failures} consecutive failures, using fallback seed")
            seed = random.choice(TOPIC_SEEDS)
            consecutive_failures = 0

        print("   -> Sleeping for 10s...")
        time.sleep(10)

if __name__ == "__main__":
    main()
