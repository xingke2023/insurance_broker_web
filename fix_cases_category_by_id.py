import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

django.setup()

from api.models import CustomerCase

def fix_cases_by_id():
    # 设定阈值 ID
    ID_THRESHOLD = 957
    
    # 查找 ID < 957 的所有案例
    cases_to_fix = CustomerCase.objects.filter(id__lt=ID_THRESHOLD)
    
    # 批量更新为 '港险案例'
    updated_count = cases_to_fix.update(category='港险案例')
    
    print(f"✅ Successfully updated {updated_count} cases (ID < {ID_THRESHOLD}) to category '港险案例'.")

if __name__ == "__main__":
    fix_cases_by_id()
