import os
import json
import sys
import random
import time
import django
from google import genai
from google.genai import types

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

try:
    django.setup()
    from api.models import CustomerCase
except Exception as e:
    print(f"Error: Could not setup Django: {e}")
    sys.exit(1)

# API Key - Using the one from the reference script
API_KEY = "AIzaSyCx6-wxKZGTQVviHWgiMx_-awdaNWrYuL8"

# 📌 标签池定义 (Tag Pool)
PRIMARY_TAGS = ["全球资产", "精英生活", "家族传承", "税务筹划"]
SECONDARY_TAGS = [
    "海外置业", "子女教育", "高端医疗", "艺术收藏",
    "移居指南", "信托架构", "生活美学", "小众旅行",
    "财富增值", "法律合规", "养老规划", "个人品牌"
]

# 🔥 全球财富与精英生活方式话题库 (Global Wealth & Elite Lifestyle Seeds)
TOPIC_SEEDS = [
    # --- 1. 全球视野与资产配置 (Global Asset Allocation) ---
    "2026年全球核心城市房产投向：除了伦敦和东京，还有哪些‘价值洼地’？",
    "家族办公室（Family Office）不再是亿万富翁的专属？普通中产如何复刻其核心逻辑？",
    "如何利用离岸信托保护家族资产？解析李嘉诚、梅艳芳背后的资产防火墙。",
    "CRS和全球征税环境下，如何合规进行海外税务身份配置？",
    "数字游民（Digital Nomad）高净值版：如何一边环游世界，一边通过被动收入实现资产增长？",

    # --- 2. 精英教育与后代培养 (Elite Education & Legacy) ---
    "从哈佛到牛津：除了砸钱，顶尖名校录取的‘底层逻辑’到底是什么？",
    "家族传承不只是钱：如何培养家族下一代的财商与领袖气质（Legacy Planning）？",
    "IB、A-Level还是AP？为孩子选择国际化赛道时，最容易踩的三个大坑。",
    "低龄留学的‘最优路径’：为什么新加坡和英国依然是高净值家庭的首选？",

    # --- 3. 高端生活美学与健康 (Lifestyle & Longevity) ---
    "硅谷大佬都在玩的‘生物黑客’（Biohacking）：如何通过精准医疗延长20年健康寿命？",
    "小众奢华旅行指南：避开人挤人的马尔代夫，这几个私密海岛才是精英的度假天花板。",
    "艺术品收藏投资：新手如何入局，才能既有格调又不被‘割韭菜’？",
    "高净值人群的‘身心重塑’：全球顶级隐世康养酒店（Wellness Retreat）测评。",
    "顶级私域俱乐部（Private Club）的入门门票：不仅是社交，更是资源的垂直对接。",

    # --- 4. 趋势洞察与商业逻辑 (Trends & Insight) ---
    "AI时代的资产安全：当技术革新颠覆职业，高净值人群该如何重新布局其核心资产？",
    "‘老钱’（Old Money）的消费观：为什么他们更看重‘静奢感’（Quiet Luxury）而非大Logo？",
    "如何建立高价值社交圈？解析顶级商学院（EMBA）背后的圈层折现逻辑。",
    "从个人IP到行业标杆：高净值人士如何建立具有长效影响力的‘个人名片’？",
]

def generate_lifestyle_content(seed):
    """Generate high-quality copywriting using Gemini 3 Flash with Google Search"""
    try:
        # Initialize Gemini client
        client = genai.Client(api_key=API_KEY)

        prompt = f"""
        【全网爆款文案搜索与创作指令】
        任务：利用Google搜索关于 "{seed}" 的最新趋势、专家深度见解、小红书/知乎高赞内容。
        
        目标：创作一篇具有“高级感”、“深度”且“极具吸引力”的精英生活/财富类文案。
        
        风格要求：
        1. **高级文风**：类似《智族GQ》、《Monocle》或《福布斯》的叙事风格。
        2. **情绪共鸣**：不仅是干货，更要触及读者对理想生活、家族未来的愿景或焦虑。
        3. **视觉排版**：支持Markdown，多用短句，层次分明，逻辑严密。

        **JSON Output Structure (Fields Mapping):**
        - **title**: {seed} (富有感染力的标题).
        - **category**: 固定填写 "精英生活".
        - **tags**: 标签列表，最多3个标签。
            - 第一个标签（主标签）从：{PRIMARY_TAGS} 中选一个。
            - 后续1-2个标签（辅助标签）从：{SECONDARY_TAGS} 中选。
        - **content**: 【深度正文内容】：
            建议结构（支持Markdown）：

            ### 【引子：视野的高度决定人生的广度】
            （用一个引人入胜的故事、数据或现状开篇，迅速抓住精英读者的注意力）

            ### 【趋势解析：看透底层的逻辑】
            （利用搜索到的最新干货，拆解 "{seed}" 背后不为人知的趋势或行业真相。要犀利、有穿透力）

            ### 【避坑/实操：老钱的智慧】
            （给出具体的、可操作的建议。模拟一位见过世面的资深顾问，分享如何规避风险、抓住机遇）

            ### 【生活哲思：财富之外的意义】
            （提升调性，探讨财富与生活、传承、自由的关系，留下回味）

            ### 【参考与出处】
            （列出搜索参考的权威来源或知名见解）

            （总字数要求：800-1200字，要求排版精美，语调优雅）。
        - **key_points**: 3-5条“金句版”总结（每条必须是金句，适合作为朋友圈/小红书的核心配文).

        **Technical Requirements:**
        - 返回 JSON 格式。
        - 语言：中文。
        - 目标平台：深度科普/高端社交媒体。
        """

        # Create content with Google Search tool
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )
        ]

        # Configure generation with Google Search and JSON output
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            tools=[
                types.Tool(
                    google_search=types.GoogleSearch()
                )
            ]
        )

        # Generate content
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=contents,
            config=config
        )

        # Parse JSON response
        if response.text:
            return json.loads(response.text)
        else:
            print("⚠️ Empty response from API")
            return None

    except Exception as e:
        print(f"⚠️ Generation Error: {e}")
        return None

def save_copy(case_data):
    # Handle list response
    if isinstance(case_data, list):
        if len(case_data) == 0:
            return
        case_data = case_data[0]

    if not isinstance(case_data, dict) or 'title' not in case_data:
        print(f"⚠️ Invalid data format")
        return

    # Check for duplicates
    if CustomerCase.objects.filter(title=case_data['title']).exists():
        print(f"Skipping duplicate: {case_data['title']}")
        return

    try:
        # Default values for CustomerCase model
        CustomerCase.objects.create(
            title=case_data.get('title'),
            category=case_data.get('category', '精英生活'),
            tags=case_data.get('tags', [])[:3],
            content=case_data.get('content', ''),  # 使用content字段
            key_points=case_data.get('key_points', []),

            # Fill mandatory fields with reasonable defaults for "Copywriting" type
            customer_age=40,
            annual_income=2000000, # 2M as a high-net-worth representative
            family_structure='精英家庭',
            insurance_needs='全球资产配置与品质生活',
            case_description='',  # 精英生活不使用case_description
            recommended_products=[],
            total_annual_premium=0,
            budget_suggestion='根据需求定制',
            is_active=True
        )
        print(f"✅ SAVED COPY: {case_data['title']}")
    except Exception as e:
        print(f"❌ DB Error: {e}")

def main():
    print("✨ Starting 'Global Wealth & Elite Lifestyle' Copywriter ✨")
    print("   - Strategy: Google Search Trends + Gemini 3 Flash")
    print("   - Output: High-end Copywriting for Social Media")
    print("--------------------------------------------------")
    
    while True:
        seed = random.choice(TOPIC_SEEDS)
        current_time = time.strftime("%H:%M:%S")
        print(f"\n[{current_time}] 🚀 Crafting content for: {seed}")
        
        case_data = generate_lifestyle_content(seed)
        
        if case_data:
            save_copy(case_data)
        else:
            print("   -> Failed to generate content.")
            
        print("   -> Resting for 60s...")
        time.sleep(60)

if __name__ == "__main__":
    main()
