import os
import json
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

try:
    django.setup()
    from api.models import CustomerCase
except Exception as e:
    print(f"Error: Could not setup Django: {e}")
    sys.exit(1)

def main():
    if not os.path.exists('new_case_buffer.json'):
        print("No buffer file found.")
        return

    try:
        with open('new_case_buffer.json', 'r', encoding='utf-8') as f:
            case_data = json.load(f)
            
        if CustomerCase.objects.filter(title=case_data['title']).exists():
            print(f"Duplicate case: {case_data['title']}")
        else:
            CustomerCase.objects.create(
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
            print(f"Imported: {case_data['title']}")
            
        # Clean up buffer
        os.remove('new_case_buffer.json')
            
    except Exception as e:
        print(f"Import Error: {e}")

if __name__ == "__main__":
    main()
