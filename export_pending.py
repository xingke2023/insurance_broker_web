import os
import json
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from api.models import CustomerCase

def export_pending_cases():
    cases = CustomerCase.objects.exclude(insurance_needs__contains="【客户案例分析】")
    export_data = []
    
    for case in cases:
        export_data.append({
            "id": case.id,
            "title": case.title,
            "customer_age": case.customer_age,
            "annual_income": str(case.annual_income),
            "family_structure": case.family_structure,
            "insurance_needs": case.insurance_needs,
            "recommended_products": case.recommended_products,
            "case_description": case.case_description
        })
    
    with open('pending_cases.json', 'w', encoding='utf-8') as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)
    
    print(f"Exported {len(export_data)} pending cases.")

if __name__ == "__main__":
    export_pending_cases()
