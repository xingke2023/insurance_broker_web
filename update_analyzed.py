import os
import json
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from api.models import CustomerCase

def update_db():
    if not os.path.exists('analyzed_cases.json'):
        print("No analyzed cases file found.")
        return

    with open('analyzed_cases.json', 'r', encoding='utf-8') as f:
        analyzed_cases = json.load(f)
        
    count = 0
    for item in analyzed_cases:
        try:
            case = CustomerCase.objects.get(id=item['id'])
            result = item['analysis_result']
            
            # Update fields
            case.insurance_needs = f"{result['analysis']}\n\n{case.insurance_needs}"
            
            if "【财富管理规划】" not in case.case_description:
                case.case_description = f"{result['planning']}\n\n{case.case_description}"
                
            case.save()
            count += 1
            print(f"Updated: {case.title}")
        except Exception as e:
            print(f"Error updating case {item['id']}: {e}")
            
    print(f"Successfully updated {count} cases.")

if __name__ == "__main__":
    update_db()
