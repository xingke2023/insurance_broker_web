import os
import json
import sys
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

def generate_fulfillment_report():
    """Generate a comprehensive Fulfillment Ratio report using Gemini 3 Flash with Google Search"""
    print("🔍 Searching for latest HK Insurance Fulfillment Ratios (2024-2025)...")
    
    try:
        # Initialize Gemini client
        client = genai.Client(api_key=API_KEY)

        prompt = """
        【香港保险分红实现率深度调研报告】
        
        **任务**：
        利用Google搜索功能，查询各大香港保险公司最新公布的“分红实现率” (Fulfillment Ratio) 数据（重点关注2024年公布的数据，即2023报告年度，以及2025年是否有最新更新）。
        
        **目标公司**：
        1. 友邦香港 (AIA)
        2. 英国保诚 (Prudential)
        3. 宏利 (Manulife)
        4. 安盛 (AXA)
        5. 富通/周大福人寿 (FTLife)
        6. 万通 (YF Life)
        7. 汇丰人寿 (HSBC Life)
        
        **内容要求**：
        请撰写一篇深度、客观的市场分析文章。
        
        **文章结构（Markdown）**：
        
        ### 1. 市场总览：2025年分红表现大盘点
        （概述整体市场表现。受高息环境/股市波动影响，整体达标情况如何？是普遍超预期还是不及预期？）
        
        ### 2. 核心红榜：谁是“分红王”？
        （列出分红实现率表现优秀（如连续多年>100%）的产品或公司。用数据说话，例如“某某产品的总现金价值比率达到了105%...”）
        
        ### 3. 重点公司详细数据盘点
        （请尽可能详细地列举各家公司的主打储蓄/重疾产品的分红数据。如果搜索结果有具体数字，请整理成清晰的列表或文字描述）
        *   **友邦 (AIA)**: [具体产品表现]
        *   **保诚 (Prudential)**: [具体产品表现，特别是隽升系列]
        *   **宏利 (Manulife)**: [具体产品表现]
        *   ...
        
        ### 4. 深度解读：分红实现率背后的玄机
        *   **什么是分红实现率？**（简短科普）
        *   **过往表现 ≠ 未来回报**：如何理性看待？
        *   **“悲观情境”与“乐观情境”**：GN16监管下的透明度提升。
        
        ### 5. 投保建议：2026年该怎么选？
        （基于分红数据，给投保人及投资者的客观建议。是选稳健型还是进取型？）

        **核心要求**：
        必须引用 **香港保险业监管局 (IA)** 的官方准则和披露数据作为最权威来源。所有提及的具体分红数据（如“102%”、“110%”）必须有据可查。

        ### 6. 参考资料 (References)
        （格式：[编号] [来源标题](URL)。**重要**：请仅列出你在本次Google搜索中**实际找到并参考**的网页链接。不要使用通用主页，尽可能提供直接指向数据源（如PDF报告或具体公告页）的深度链接。）
        
        **JSON Output Structure:**
        - **title**: "2025-2026香港保险分红实现率大盘点：谁在画饼，谁在发钱？" (或类似的吸睛标题)
        - **category**: "公司新闻"
        - **tags**: 标签列表，必须从文中重点分析的保险公司名称（如"友邦香港"、"英国保诚"）或核心产品名称（如"充裕未来"）中提取，最多3个。
        - **content**: (生成的Markdown正文)
        - **key_points**: 3-5条核心结论（例如：某某公司连续5年达标率100%等）。
        
        **Technical Requirements:**
        - 返回 JSON 格式。
        - 必须包含真实搜索到的数据，不要编造。如果某家数据未搜到，请注明“暂未披露具体数据”。
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

        # Parse JSON response
        if response.text:
            return json.loads(response.text)
        else:
            print("⚠️ Empty response from API")
            return None

    except Exception as e:
        print(f"⚠️ Generation Error: {e}")
        return None

def save_report(data):
    if not data:
        return

    # Handle list response
    if isinstance(data, list):
        data = data[0]

    try:
        title = data.get('title', '香港保险分红实现率报告')
        
        # Check duplicate
        if CustomerCase.objects.filter(title=title).exists():
            print(f"⚠️ Report already exists: {title}")
            # Optional: Update existing? For now, skip.
            return

        CustomerCase.objects.create(
            title=title,
            category=data.get('category', '公司新闻'),
            tags=data.get('tags', [])[:3],
            content=data.get('content', ''),  # 使用content字段
            key_points=data.get('key_points', []),

            # Default placeholders
            customer_age=0,
            annual_income=0,
            family_structure='全市场',
            insurance_needs='分红数据分析',
            case_description='',  # 公司新闻不使用case_description
            recommended_products=[],
            total_annual_premium=0,
            budget_suggestion='参考数据决策',
            is_active=True
        )
        print(f"✅ REPORT SAVED: {title}")
        print("------------------------------------------------")
        print(f"Key Points: {data.get('key_points')}")
        
    except Exception as e:
        print(f"❌ DB Save Error: {e}")

if __name__ == "__main__":
    print("🚀 Starting Fulfillment Ratio Analysis Generator...")
    data = generate_fulfillment_report()
    save_report(data)
