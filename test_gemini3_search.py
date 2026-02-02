#!/usr/bin/env python3
"""Quick test for Gemini 3 Flash with Google Search"""
import os
import json
from google import genai
from google.genai import types

API_KEY = "AIzaSyCx6-wxKZGTQVviHWgiMx_-awdaNWrYuL8"

def test_gemini3_search():
    """Test Gemini 3 Flash Preview with Google Search"""
    try:
        print("🔍 Testing Gemini 3 Flash Preview with Google Search...")

        # Initialize client
        client = genai.Client(api_key=API_KEY)

        # Simple test prompt
        prompt = """
        搜索关于"香港保险理赔争议案例"的真实新闻，并返回JSON格式：
        {
            "title": "案例标题",
            "summary": "案例摘要（100字以内）"
        }
        """

        # Create content
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )
        ]

        # Configure with Google Search
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            tools=[
                types.Tool(
                    google_search=types.GoogleSearch()
                )
            ]
        )

        print("📡 Sending request to Gemini 3 Flash Preview...")

        # Generate content
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=contents,
            config=config
        )

        # Display result
        if response.text:
            print("\n✅ Success! Response:")
            print("=" * 60)
            result = json.loads(response.text)
            print(json.dumps(result, indent=2, ensure_ascii=False))
            print("=" * 60)
            return True
        else:
            print("❌ Empty response")
            return False

    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_gemini3_search()
    exit(0 if success else 1)
