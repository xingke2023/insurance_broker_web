import os
import json
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

def import_from_json(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        cases = json.load(f)

    saved_count = 0
    for case_data in cases:
        try:
            case = CustomerCase.objects.create(
                title=case_data.get('title'),
                tags=case_data.get('tags', []),
                customer_age=case_data.get('customer_age', 30),
                annual_income=case_data.get('annual_income', 0),
                family_structure=case_data.get('family_structure', ''),
                insurance_needs=case_data.get('insurance_needs', ''),
                recommended_products=case_data.get('recommended_products', []),
                total_annual_premium=case_data.get('total_annual_premium', 0),
                case_description=case_data.get('case_description', ''),
                key_points=case_data.get('key_points', []),
                budget_suggestion=case_data.get('budget_suggestion', ''),
                is_active=True
            )
            saved_count += 1
            print(f"Imported: {case.title}")
        except Exception as e:
            print(f"Error importing case {case_data.get('title')}: {e}")
    
    print(f"Successfully imported {saved_count} cases.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 import_cases.py <json_file>")
    else:
        import_from_json(sys.argv[1])
