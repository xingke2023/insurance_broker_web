#!/bin/bash

# 1. Generate JSON using curl (Bypasses Python network restrictions)
# We pick a random prompt from a list (simplified for shell)
TOPICS=("Fresh Graduate HK Insurance" "Single Mom HK Insurance" "DINK Couple HK Insurance" "Retired Couple HK Insurance" "Business Owner HK Insurance")
RANDOM_TOPIC=${TOPICS[$RANDOM % ${#TOPICS[@]}]}

echo "Generating case for: $RANDOM_TOPIC..."

curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=AIzaSyCx6-wxKZGTQVviHWgiMx_-awdaNWrYuL8" \
-H "Content-Type: application/json" \
-d "{
  \"contents\": [{
    \"parts\": [{
      \"text\": \"You are a professional insurance consultant. Generate 1 realistic Hong Kong insurance client case for: $RANDOM_TOPIC. Use REAL products from AIA/Prudential/Manulife. Return ONLY a JSON object with: title, tags (list), customer_age (int), annual_income (number), family_structure, insurance_needs (include 【客户案例分析】), recommended_products (list), total_annual_premium (number), case_description (include 【财富管理规划】), key_points (list), budget_suggestion.\"
    }]
  }],
  \"generationConfig\": {
    \"response_mime_type\": \"application/json\"
  }
}" > temp_response.json

# 2. Extract the actual JSON content from Gemini response structure
# Python is fine for text processing, just not networking here apparently
python3 -c "import json, sys; 
try:
    data = json.load(open('temp_response.json')); 
    content = data['candidates'][0]['content']['parts'][0]['text'];
    print(content)
except: sys.exit(1)" > new_case_buffer.json

# 3. Run the Importer
if [ -s new_case_buffer.json ]; then
    python3 auto_import_cases.py
    rm new_case_buffer.json
    rm temp_response.json
else
    echo "Generation failed."
fi
