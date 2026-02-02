import json
import urllib.request
import time
import os

API_KEY = "AIzaSyCx6-wxKZGTQVviHWgiMx_-awdaNWrYuL8"

def analyze_case(case_data):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key={API_KEY}"
    
    prompt = f"""
    You are a professional wealth manager. Analyze this case in CHINESE.
    
    Profile: Age {case_data['customer_age']}, Income {case_data['annual_income']}, Family {case_data['family_structure']}
    Needs: {case_data['insurance_needs']}
    Description: {case_data['case_description']}
    
    Task:
    1. "Customer Case Analysis" (【客户案例分析】): Analyze risks and pain points.
    2. "Wealth Management Planning" (【财富管理规划】): Explain strategic logic (Leverage, Cash Flow, etc.).
    
    Return ONLY a valid JSON object with keys: "analysis", "planning".
    """
    
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"}
    }
    
    req = urllib.request.Request(url, method="POST")
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req, data=json.dumps(data).encode('utf-8'), timeout=60) as f:
            res_data = f.read().decode('utf-8')
            content = json.loads(res_data)['candidates'][0]['content']['parts'][0]['text']
            return json.loads(content)
    except Exception as e:
        print(f"Error: {e}")
        return None

def process_file():
    if not os.path.exists('pending_cases.json'):
        return

    with open('pending_cases.json', 'r', encoding='utf-8') as f:
        cases = json.load(f)
    
    results = []
    print(f"Processing {len(cases)} cases...")
    
    for i, case in enumerate(cases):
        print(f"[{i+1}/{len(cases)}] Analyzing: {case['title']}")
        analysis = analyze_case(case)
        if analysis:
            case['analysis_result'] = analysis
            results.append(case)
            time.sleep(1) # Be nice to the API
    
    with open('analyzed_cases.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(results)} analyzed cases.")

if __name__ == "__main__":
    process_file()
