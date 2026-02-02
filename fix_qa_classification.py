import os
import sys
import django
from django.db.models import Q

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

django.setup()

from api.models import CustomerCase

def fix_misclassified_qa():
    # 关键词特征，用于识别 QA 类文章
    qa_keywords = [
        '?', '？', 
        '如何', '怎么办', '步骤', '流程', 
        '详解', '解析', '指南', '攻略',
        '区别', '对比', 'VS', 
        '坑', '误区', '真相', '谣言',
        '定义', '条款', '原则',
        '汇入', '汇出', '理赔'
    ]
    
    # 查找当前分类为 '港险案例' 但标题像 QA 的文章
    # 注意：'港险案例' 通常是 "35岁...", "年入50万..." 这种标题
    
    query = Q(category='港险案例') & (
        Q(title__icontains='?') | 
        Q(title__icontains='？') |
        Q(title__icontains='如何') |
        Q(title__icontains='怎么办') |
        Q(title__icontains='详解') |
        Q(title__icontains='解析') |
        Q(title__icontains='指南')
    )
    
    potential_qa_cases = CustomerCase.objects.filter(query)
    
    count = 0
    print(f"Found {potential_qa_cases.count()} potential misclassified cases.")
    
    for case in potential_qa_cases:
        # 二次确认：真正的案例通常标题包含“岁”或“家庭”
        if '岁' in case.title and ('方案' in case.title or '配置' in case.title):
            print(f"Skipping likely real case: {case.title}")
            continue
            
        print(f"Fixing: {case.title}")
        case.category = '港险问答'
        
        # 尝试从标题或内容推断标签并添加
        tags = case.tags or []
        if '理赔' in case.title and '理赔售后' not in tags:
            tags.insert(0, '理赔售后')
        elif '分红' in case.title or '储蓄' in case.title and '理财储蓄' not in tags:
            tags.insert(0, '理财储蓄')
        elif '重疾' in case.title or '癌' in case.title and '重疾保障' not in tags:
            tags.insert(0, '重疾保障')
        elif '基础' in case.title or '原则' in case.title or '法律' in case.title and '基础认知' not in tags:
            tags.insert(0, '基础认知')
            
        case.tags = tags
        case.save()
        count += 1
        
    print(f"✅ Successfully fixed {count} cases to '港险问答'.")

if __name__ == "__main__":
    fix_misclassified_qa()
