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

# API Key
API_KEY = "AIzaSyCx6-wxKZGTQVviHWgiMx_-awdaNWrYuL8"

# 📌 话题池：涵盖财报、评级、战略、市场地位等
TOPIC_SEEDS = [
    "宏利香港 (Manulife) 最新年度/季度财报分析及在港市场占有率表现",
    "友邦香港 (AIA) 最新信用评级 (S&P/Moody's) 及资本偿付能力充足率(Solvency Ratio)报告",
    "英国保诚 (Prudential) 2025年最新战略重点及派发分红稳定性洞察",
    "安盛香港 (AXA) 数字化理赔服务创新及在香港市场的客户满意度评价",
    "汇丰人寿 (HSBC Life) 在香港高净值人群（HNW）市场的最新产品布局与增长数据",
    "周大福人寿 (CTF Life) 品牌重塑后的市场定位、核心竞争力及最新业务简报",
    "万通保险 (YF Life) 在年金市场及金融科技(InsurTech)方面的最新动态",
    "中银人寿在离岸人民币保险业务及大湾区跨境医疗保障中的最新进展",
]

def generate_market_info(seed):
    """Generate high-quality company market news using Gemini 3 Flash with Google Search"""
    print(f"🔍 Researching Market Info for: {seed}...")
    
    try:
        # Initialize Gemini client
        client = genai.Client(api_key=API_KEY)

        prompt = f"""
        【香港保险市场权威资讯调研指令】
        
        **任务**：
        针对主题 "{seed}"，利用Google搜索获取最新的财经新闻、公司官网公告、行业研究报告或权威媒体评述。
        
        **内容要求**：
        1. **财经风文案**：语调要专业、严谨且具有前瞻性，类似《华尔街日报》或《智通财经》的深度报道。
        2. **数据支撑**：尽可能包含财报数据、评级级别、增长百分比等具体信息。
        3. **深度链接**：在文末列出实际参考的来源。

        **JSON Output Structure:**
        - **title**: "{seed}" (或更具财经新闻感的标题).
        - **category**: "公司新闻"
        - **tags**: 标签列表，优先包含【保险公司名称】（如 "宏利", "保诚"），同时可包含核心业务关键词（如 "财报", "大湾区", "ESG", "数字化"），最多3个。
        - **content**:
            文章完整内容（Markdown格式）：
            ### 1. 核心快讯：市场地位与最新动向
            （简述该公司在行业内的地位及本次资讯的核心内容）

            ### 2. 深度解析：核心优势与数据表现
            （详细展开：包括财报亮点、评级优势、或战略转型的具体措施）

            ### 3. 行业视野：对投保人的影响
            （从专业角度分析，这些公司动态对现有保单持有人或潜在买家意味着什么？安全性、回报还是服务提升？）

            ### 4. 参考资料 (References)
            （格式：[编号] [来源标题](URL)。**必须是你在本次搜索中实际参考的网页深度链接**，确保链接直接指向相关公告或报道。）

        - **key_points**: 3-5条财经速递（每条概括一个核心数据点或结论）。

        **Technical Requirements:**
        - 返回 JSON 格式。
        - 严禁编造数据。如果无法搜到确切数据，请描述行业普遍趋势。
        """

        # Configure generation with Google Search and JSON output
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            tools=[types.Tool(google_search=types.GoogleSearch())]
        )

        # Generate content
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
            config=config
        )

        if response.text:
            return json.loads(response.text)
        else:
            return None

    except Exception as e:
        print(f"⚠️ Generation Error: {e}")
        return None

def save_case(data):
    if not data or 'title' not in data:
        return

    try:
        if CustomerCase.objects.filter(title=data['title']).exists():
            print(f"Skipping duplicate: {data['title']}")
            return

        CustomerCase.objects.create(
            title=data.get('title'),
            category='公司新闻',
            tags=data.get('tags', [])[:3],
            content=data.get('content', ''),  # 使用新的content字段
            key_points=data.get('key_points', []),

            # Default placeholders
            customer_age=0,
            annual_income=0,
            family_structure='全市场',
            insurance_needs='保险公司动态调研',
            case_description='',  # 公司新闻不使用case_description
            recommended_products=[],
            total_annual_premium=0,
            budget_suggestion='参考市场信息',
            is_active=True
        )
        print(f"✅ MARKET INFO SAVED: {data['title']} (Tags: {data.get('tags')})")
    except Exception as e:
        print(f"❌ DB Error: {e}")

def main():
    print("💹 Starting 'HK Insurance Market Intelligence' Collector...")
    while True:
        seed = random.choice(TOPIC_SEEDS)
        case_data = generate_market_info(seed)
        if case_data:
            save_case(case_data)
        
        print("   -> Resting for 60s...")
        time.sleep(60)

if __name__ == "__main__":
    main()
