#!/usr/bin/env python3
"""
测试公司新闻content字段功能
"""
import os
import sys
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import CustomerCase

# 测试数据
test_news = {
    'title': '【测试】友邦保险2025年Q4财报解读',
    'category': '公司新闻',
    'tags': ['友邦', '财报', '市场表现'],
    'content': '''### 1. 核心快讯：市场地位与最新动向

友邦保险（AIA）作为亚太区最大的独立上市人寿保险集团，2025年第四季度交出了一份亮眼的成绩单。新业务价值（NBV）同比增长18%，达到20亿美元，再次巩固其在香港保险市场的领导地位。

### 2. 深度解析：核心优势与数据表现

- **保费收入增长强劲**：总保费收入达350亿港币，同比增长15%
- **偿付能力充足**：集团偿付能力充足率达到428%，远超监管要求
- **数字化转型成效显著**：线上投保占比提升至45%

### 3. 行业视野：对投保人的影响

友邦稳健的财务表现和充裕的偿付能力意味着：
1. 保单持有人的权益得到更强保障
2. 分红型产品的派息稳定性提升
3. 理赔服务的持续优化

### 4. 参考资料 (References)

[1] [友邦保险集团2025年Q4业绩公告](https://www.aia.com/investor-relations)
[2] [彭博社：友邦NBV增长超预期](https://www.bloomberg.com/news/aia-2025q4)
''',
    'key_points': [
        'NBV同比增长18%，达20亿美元',
        '总保费收入350亿港币，增长15%',
        '偿付能力充足率428%，财务稳健',
        '数字化转型加速，线上投保占比45%'
    ]
}

def test_create_news():
    """测试创建公司新闻"""
    print("🧪 开始测试公司新闻content字段功能...\n")

    # 删除已存在的测试数据
    CustomerCase.objects.filter(title__contains='【测试】').delete()
    print("✅ 清理旧测试数据\n")

    # 创建新记录
    case = CustomerCase.objects.create(
        title=test_news['title'],
        category=test_news['category'],
        tags=test_news['tags'],
        content=test_news['content'],
        key_points=test_news['key_points'],

        # 占位字段
        customer_age=0,
        annual_income=0,
        family_structure='全市场',
        insurance_needs='保险公司动态调研',
        case_description='',
        recommended_products=[],
        total_annual_premium=0,
        budget_suggestion='参考市场信息',
        is_active=True
    )

    print(f"✅ 成功创建公司新闻记录")
    print(f"   ID: {case.id}")
    print(f"   标题: {case.title}")
    print(f"   分类: {case.category}")
    print(f"   标签: {case.tags}")
    print(f"   Content字段长度: {len(case.content)} 字符")
    print(f"   关键要点数: {len(case.key_points)} 条\n")

    # 验证读取
    retrieved = CustomerCase.objects.get(id=case.id)
    assert retrieved.content == test_news['content']
    assert retrieved.category == '公司新闻'
    assert len(retrieved.key_points) == 4

    print("✅ 数据验证通过")
    print(f"\n📋 Content字段预览（前200字符）：")
    print(retrieved.content[:200] + '...\n')

    print("🎉 测试完成！现在可以访问前端查看效果：")
    print("   http://your-domain/customer-case-library")
    print("   筛选：公司新闻")
    print(f"   查找标题：{test_news['title']}\n")

if __name__ == "__main__":
    test_create_news()
