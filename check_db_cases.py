import os
import sys
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

try:
    django.setup()
    from api.models import CustomerCase
    
    count = CustomerCase.objects.count()
    print(f"Total Cases in DB: {count}")
    
    recent = CustomerCase.objects.order_by('-id')[:5]
    for case in recent:
        print(f"ID: {case.id}, Title: {case.title}, Active: {case.is_active}")
        
except Exception as e:
    print(f"Error: {e}")
