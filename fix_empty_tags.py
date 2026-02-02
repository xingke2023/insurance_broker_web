import os
import sys
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

try:
    django.setup()
    from api.models import CustomerCase
    
    # Find cases with empty tags created recently (assuming high IDs)
    # We can filter by those that have "High Drama" style titles or just empty tags
    empty_tag_cases = CustomerCase.objects.filter(tags=[])
    
    print(f"Found {empty_tag_cases.count()} cases with empty tags.")
    
    for case in empty_tag_cases:
        # Assign some default tags based on title content for better visibility
        new_tags = ["热门案例"] # Default tag
        
        if "信托" in case.title or "资产" in case.title or "豪门" in case.title:
            new_tags.append("财富传承")
            new_tags.append("资产隔离")
        elif "ICU" in case.title or "猝死" in case.title or "病" in case.title:
             new_tags.append("高端医疗")
             new_tags.append("重疾保障")
        elif "留学" in case.title or "教育" in case.title:
            new_tags.append("教育金")
            
        case.tags = new_tags
        case.save()
        print(f"Updated case '{case.title}' with tags: {new_tags}")
        
except Exception as e:
    print(f"Error: {e}")
