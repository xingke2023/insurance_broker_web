import csv
import json
import urllib.request
import time
import os

API_KEY = "AIzaSyCx6-wxKZGTQVviHWgiMx_-awdaNWrYuL8"

def analyze_case(row):
    # row is a dict from csv.DictReader
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key={API_KEY}"
    
    prompt = f"""
    You are a professional wealth manager. Analyze this case in CHINESE.
    
    Profile: Age {row['customer_age']}, Income {row['annual_income']}, Family {row['family_structure']}
    Needs: {row['insurance_needs']}
    Description: {row['case_description']}
    
    Task:
    1. "Customer Case Analysis" (【客户案例分析】): Analyze risks and pain points.
    2. "Wealth Management Planning" (【财富管理规划】): Explain strategic logic.
    
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

def process_tsv():
    if not os.path.exists('raw_cases.txt'):
        print("No raw cases file found.")
        return

    # Generate SQL file
    sql_file = open('update_cases.sql', 'w', encoding='utf-8')
    
    with open('raw_cases.txt', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        
        for i, row in enumerate(reader):
            print(f"Analyzing case {row['id']}: {row['title']}")
            
            result = analyze_case(row)
            
            if result:
                # Escape for SQL
                new_needs = f"{result['analysis']}\n\n{row['insurance_needs']}".replace("'", "''")
                new_desc = f"{result['planning']}\n\n{row['case_description']}".replace("'", "''")
                
                # Check if Planning already exists to avoid double add
                if "【财富管理规划】" in row['case_description']:
                    sql = f"UPDATE customer_cases SET insurance_needs = '{new_needs}' WHERE id = {row['id']};\n"
                else:
                    sql = f"UPDATE customer_cases SET insurance_needs = '{new_needs}', case_description = '{new_desc}' WHERE id = {row['id']};\n"
                
                sql_file.write(sql)
                time.sleep(1) 
            else:
                print("Failed.")

    sql_file.close()
    print("Generated update_cases.sql")

if __name__ == "__main__":
    process_tsv()
