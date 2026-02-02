import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

django.setup()

from api.models import CustomerCase

def migrate_categories():
    # 需要迁移的旧分类列表
    qa_categories = ['基础认知', '重疾保障', '理财储蓄', '理赔售后']
    
    # 查找这些分类的案例
    cases = CustomerCase.objects.filter(category__in=qa_categories)
    
    count = 0
    for case in cases:
        old_category = case.category
        
        # 将旧分类名作为标签添加到 tags
        current_tags = case.tags or []
        if old_category not in current_tags:
            # 插入到最前面作为主标签
            current_tags.insert(0, old_category)
            case.tags = current_tags
        
        # 更新分类为统一的 '港险问答'
        case.category = '港险问答'
        case.save()
        count += 1
        
    print(f"✅ Successfully migrated {count} Q&A cases to category '港险问答'.")

if __name__ == "__main__":
    migrate_categories()
