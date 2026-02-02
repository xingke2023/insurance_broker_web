import os
import json
import urllib.request
import sys
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
try:
    django.setup()
    from api.models import CustomerCase
except Exception as e:
    print(f"Error: Could not setup Django: {e}")
    sys.exit(1)

API_KEY = "AIzaSyCx6-wxKZGTQVviHWgiMx_-awdaNWrYuL8"

def analyze_case_with_gemini(case_data):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key={API_KEY}"
    
    prompt = f"""
    You are a professional wealth manager and insurance consultant. Analyze the following customer case and provide two specific sections in CHINESE. 
    
    Customer Profile:
    - Age: {case_data.customer_age}
    - Income: {case_data.annual_income} HKD
    - Family: {case_data.family_structure}
    - Current Needs: {case_data.insurance_needs}
    - Products: {case_data.recommended_products}
    - Description: {case_data.case_description}

    Task:
    1. Write a "Customer Case Analysis" (【客户案例分析】): Analyze their financial vulnerability, life stage risks, and hidden pain points. Be professional and empathetic.
    2. Write a "Wealth Management Planning" (【财富管理规划】): Explain the STRATEGIC logic of the solution. Use terms like "Leverage", "Cash Flow", "Asset Isolation", "Tax Planning" where appropriate. 
    
    Return ONLY a valid JSON object with these two keys: "analysis" and "planning".
    """
    
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json"
        }
    }
    
    req = urllib.request.Request(url, method="POST")
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req, data=json.dumps(data).encode('utf-8'), timeout=60) as f:
            res_data = f.read().decode('utf-8')
            response_json = json.loads(res_data)
            content = response_json['candidates'][0]['content']['parts'][0]['text']
            return json.loads(content)
    except Exception as e:
        print(f"Error generating analysis: {e}")
        return None

def process_one_case():
    # Find ONE case that needs enrichment
    # We look for cases WITHOUT the specific headers in their fields
    case = CustomerCase.objects.exclude(insurance_needs__contains="【客户案例分析】").first()
    
    if not case:
        print("No more cases to enrich.")
        sys.exit(0) # Exit code 0 means done
        
    print(f"Analyzing case {case.id}: {case.title}...")
    
    result = analyze_case_with_gemini(case)
    
    if result:
        # Prepend analysis to existing needs
        case.insurance_needs = f"{result['analysis']}\n\n{case.insurance_needs}"
        
        # Prepend planning to existing description if not present
        if "【财富管理规划】" not in case.case_description:
            case.case_description = f"{result['planning']}\n\n{case.case_description}"
        
        case.save()
        print(f"Successfully enriched case {case.id}")
        sys.exit(1) # Exit code 1 means "did work, maybe more to do"
    else:
        print(f"Failed to analyze case {case.id}")
        sys.exit(2) # Exit code 2 means error

if __name__ == "__main__":
    process_one_case()
