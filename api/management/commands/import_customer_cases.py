"""
Django管理命令：批量导入客户案例数据

使用方法:
python manage.py import_customer_cases

或指定JSON文件:
python manage.py import_customer_cases --file cases.json
"""

from django.core.management.base import BaseCommand
from api.models import CustomerCase
import json


class Command(BaseCommand):
    help = '批量导入客户案例数据'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default=None,
            help='JSON文件路径（可选，不提供则使用示例数据）'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='导入前清空现有案例数据'
        )

    def handle(self, *args, **options):
        file_path = options['file']
        clear_existing = options['clear']

        # 如果指定了清空选项
        if clear_existing:
            count = CustomerCase.objects.all().count()
            if count > 0:
                self.stdout.write(self.style.WARNING(f'准备删除 {count} 个现有案例...'))
                CustomerCase.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('已清空现有案例数据'))

        # 如果提供了文件路径，从文件读取
        if file_path:
            self.stdout.write(f'从文件导入: {file_path}')
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    cases_data = json.load(f)
                self.import_cases(cases_data)
            except FileNotFoundError:
                self.stdout.write(self.style.ERROR(f'文件不存在: {file_path}'))
                return
            except json.JSONDecodeError as e:
                self.stdout.write(self.style.ERROR(f'JSON格式错误: {e}'))
                return
        else:
            # 使用示例数据
            self.stdout.write('使用示例数据...')
            cases_data = self.get_sample_data()
            self.import_cases(cases_data)

    def import_cases(self, cases_data):
        """导入案例数据"""
        success_count = 0
        error_count = 0

        for case_data in cases_data:
            try:
                # 检查是否已存在同标题的案例
                title = case_data.get('title')
                if CustomerCase.objects.filter(title=title).exists():
                    self.stdout.write(self.style.WARNING(f'案例已存在，跳过: {title}'))
                    continue

                # 创建案例
                case = CustomerCase.objects.create(**case_data)
                success_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ 创建案例: {case.title}'))

            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'✗ 创建失败: {case_data.get("title", "未知")} - {str(e)}'))

        # 输出统计信息
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(f'导入完成！'))
        self.stdout.write(f'成功: {success_count} 个')
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'失败: {error_count} 个'))
        self.stdout.write('='*60)

    def get_sample_data(self):
        """获取示例数据（15个案例，每个阶段3个）"""
        return [
            # ========== 扶幼保障期 (3个案例) ==========
            {
                'title': '30岁新婚夫妇保险规划',
                'life_stage': '扶幼保障期',
                'customer_age': 30,
                'annual_income': 600000,
                'family_structure': '新婚夫妇，计划1年内生育第一胎',
                'insurance_needs': '重点关注家庭保障和未来子女教育基金，需要平衡定期寿险、重疾保险和储蓄保险',
                'budget_suggestion': '年收入的12-15%',
                'recommended_products': [
                    {
                        'product_name': '终身储蓄计划',
                        'company': '友邦保险',
                        'annual_premium': 40000,
                        'coverage_type': '储蓄',
                        'reason': '为未来子女教育提供资金积累'
                    },
                    {
                        'product_name': '多重保障危疾保险',
                        'company': '保诚保险',
                        'annual_premium': 25000,
                        'coverage_type': '重疾',
                        'reason': '覆盖夫妇双方，保障家庭经济支柱'
                    },
                    {
                        'product_name': '定期寿险',
                        'company': '宏利保险',
                        'annual_premium': 8000,
                        'coverage_type': '寿险',
                        'reason': '低成本高保额，保障家庭责任期'
                    }
                ],
                'total_annual_premium': 73000,
                'case_description': '该夫妇处于家庭建立初期，收入稳定但需要为未来做好规划。推荐方案以储蓄和保障为主，总保费约占年收入的12%，符合合理范围。储蓄计划用于子女未来教育，重疾保险保障夫妇双方健康，定期寿险以低成本提供高额保障。建议每2-3年根据家庭变化调整保险配置。',
                'key_points': [
                    '30岁新婚夫妇，年收入60万',
                    '计划1年内生育第一胎',
                    '储蓄、重疾、寿险三重保障组合',
                    '总保费7.3万，占收入12%',
                    '为未来子女教育和家庭责任做好准备'
                ],
                'sort_order': 10,
                'is_active': True
            },
            {
                'title': '28岁年轻父母保障方案',
                'life_stage': '扶幼保障期',
                'customer_age': 28,
                'annual_income': 500000,
                'family_structure': '已婚，1个子女（6个月）',
                'insurance_needs': '新手父母，需要为孩子提供全面保障，同时确保家庭经济支柱的保障充足',
                'budget_suggestion': '年收入的10-12%',
                'recommended_products': [
                    {
                        'product_name': '儿童医疗保险',
                        'company': '友邦保险',
                        'annual_premium': 15000,
                        'coverage_type': '医疗',
                        'reason': '为新生儿提供全面医疗保障'
                    },
                    {
                        'product_name': '父母重疾保险',
                        'company': '保诚保险',
                        'annual_premium': 30000,
                        'coverage_type': '重疾',
                        'reason': '保障父母健康，确保家庭收入稳定'
                    },
                    {
                        'product_name': '教育储蓄计划',
                        'company': '宏利保险',
                        'annual_premium': 20000,
                        'coverage_type': '储蓄',
                        'reason': '从小开始积累教育基金'
                    }
                ],
                'total_annual_premium': 65000,
                'case_description': '年轻父母最关心的是孩子的健康和未来教育。推荐方案包含儿童医疗、父母重疾和教育储蓄三大保障。总保费6.5万，占年收入13%。重点是尽早为孩子建立医疗保障，同时父母作为家庭经济支柱也需要充足的重疾保障。',
                'key_points': [
                    '28岁年轻父母，宝宝6个月大',
                    '年收入50万，家庭责任刚开始',
                    '儿童医疗+父母重疾+教育储蓄',
                    '总保费6.5万，占收入13%',
                    '尽早建立全面家庭保障体系'
                ],
                'sort_order': 11,
                'is_active': True
            },
            {
                'title': '32岁二胎家庭保险配置',
                'life_stage': '扶幼保障期',
                'customer_age': 32,
                'annual_income': 800000,
                'family_structure': '已婚，2个子女（3岁、5岁）',
                'insurance_needs': '二胎家庭，家庭开支增加，需要更全面的保障和充足的教育金规划',
                'budget_suggestion': '年收入的15-18%',
                'recommended_products': [
                    {
                        'product_name': '家庭综合医疗保险',
                        'company': '友邦保险',
                        'annual_premium': 40000,
                        'coverage_type': '医疗',
                        'reason': '全家四口的医疗保障'
                    },
                    {
                        'product_name': '双倍重疾保险',
                        'company': '保诚保险',
                        'annual_premium': 50000,
                        'coverage_type': '重疾',
                        'reason': '父母双倍保障，应对大病风险'
                    },
                    {
                        'product_name': '双子女教育金计划',
                        'company': '宏利保险',
                        'annual_premium': 60000,
                        'coverage_type': '储蓄',
                        'reason': '为两个孩子同时储备教育资金'
                    }
                ],
                'total_annual_premium': 150000,
                'case_description': '二胎家庭面临更大的经济压力和责任。推荐方案包含全家医疗、父母双倍重疾保障和双子女教育金。总保费15万，占年收入18.75%。虽然保费较高，但考虑到两个孩子的未来教育和家庭风险保障，这是合理且必要的配置。',
                'key_points': [
                    '32岁二胎家庭，两个学龄前儿童',
                    '年收入80万，家庭开支较大',
                    '全家医疗+父母重疾+双子女教育金',
                    '总保费15万，占收入18.75%',
                    '保费虽高但保障全面，符合二胎家庭需求'
                ],
                'sort_order': 12,
                'is_active': True
            },

            # ========== 收入成长期 (3个案例) ==========
            {
                'title': '35岁单身专业人士保险规划',
                'life_stage': '收入成长期',
                'customer_age': 35,
                'annual_income': 800000,
                'family_structure': '单身，独居',
                'insurance_needs': '重点关注重疾保障和储蓄规划，为未来退休和可能的家庭建立做准备',
                'budget_suggestion': '年收入的10-15%',
                'recommended_products': [
                    {
                        'product_name': '储蓄计划A',
                        'company': '友邦保险',
                        'annual_premium': 50000,
                        'coverage_type': '储蓄',
                        'reason': '稳健增值，长期收益可观'
                    },
                    {
                        'product_name': '重疾保险B',
                        'company': '保诚保险',
                        'annual_premium': 30000,
                        'coverage_type': '重疾',
                        'reason': '全面覆盖100种重疾'
                    }
                ],
                'total_annual_premium': 80000,
                'case_description': '该客户处于职业上升期，收入稳定且有较强的储蓄能力。推荐配置储蓄和重疾保障的平衡组合，总保费约占年收入的10%，符合合理范围。储蓄计划用于未来财富积累，重疾保险提供全面健康保障。',
                'key_points': [
                    '35岁单身专业人士，年收入80万',
                    '重点关注职业发展和未来家庭规划',
                    '配置储蓄和重疾保障的平衡组合',
                    '总保费约占年收入的10%，符合合理范围'
                ],
                'sort_order': 20,
                'is_active': True
            },
            {
                'title': '33岁事业上升期保障方案',
                'life_stage': '收入成长期',
                'customer_age': 33,
                'annual_income': 900000,
                'family_structure': '已婚无子女，双职工',
                'insurance_needs': '事业上升期，收入增长快，需要加强保障并开始长期储蓄规划',
                'budget_suggestion': '年收入的12-15%',
                'recommended_products': [
                    {
                        'product_name': '高端医疗保险',
                        'company': '友邦保险',
                        'annual_premium': 35000,
                        'coverage_type': '医疗',
                        'reason': '全球医疗网络，高端医疗服务'
                    },
                    {
                        'product_name': '多次赔付重疾险',
                        'company': '保诚保险',
                        'annual_premium': 45000,
                        'coverage_type': '重疾',
                        'reason': '多次赔付，长期保障更安心'
                    },
                    {
                        'product_name': '万用寿险',
                        'company': '宏利保险',
                        'annual_premium': 40000,
                        'coverage_type': '寿险+储蓄',
                        'reason': '灵活调整，兼顾保障与储蓄'
                    }
                ],
                'total_annual_premium': 120000,
                'case_description': '双职工家庭，事业上升期，收入增长迅速。推荐配置高端医疗、多次赔付重疾和万用寿险。总保费12万，占年收入13.3%。这个阶段收入高，应该提升保障品质，为未来家庭变化预留灵活空间。',
                'key_points': [
                    '33岁双职工家庭，事业上升期',
                    '年收入90万，收入增长快',
                    '高端医疗+多次赔付重疾+万用寿险',
                    '总保费12万，占收入13.3%',
                    '保障品质提升，为未来预留灵活空间'
                ],
                'sort_order': 21,
                'is_active': True
            },
            {
                'title': '37岁高收入人群保险配置',
                'life_stage': '收入成长期',
                'customer_age': 37,
                'annual_income': 1500000,
                'family_structure': '已婚，1个子女（2岁）',
                'insurance_needs': '高收入家庭，需要高保额保障和财富传承规划',
                'budget_suggestion': '年收入的10-12%',
                'recommended_products': [
                    {
                        'product_name': '大额重疾保险',
                        'company': '友邦保险',
                        'annual_premium': 80000,
                        'coverage_type': '重疾',
                        'reason': '高保额，匹配高收入水平'
                    },
                    {
                        'product_name': '终身寿险',
                        'company': '保诚保险',
                        'annual_premium': 60000,
                        'coverage_type': '寿险',
                        'reason': '财富传承，保障家庭未来'
                    },
                    {
                        'product_name': '子女教育基金',
                        'company': '宏利保险',
                        'annual_premium': 40000,
                        'coverage_type': '储蓄',
                        'reason': '高端教育规划，国际化教育储备'
                    }
                ],
                'total_annual_premium': 180000,
                'case_description': '高收入家庭，年收入150万。推荐大额重疾、终身寿险和子女教育基金。总保费18万，占年收入12%。高收入需要高保额，保障要匹配生活水平。同时开始考虑财富传承和子女的高端教育规划。',
                'key_points': [
                    '37岁高收入家庭，年收入150万',
                    '已有2岁子女，生活品质高',
                    '大额重疾+终身寿险+教育基金',
                    '总保费18万，占收入12%',
                    '高保额保障+财富传承规划'
                ],
                'sort_order': 22,
                'is_active': True
            },

            # ========== 责任高峰期 (3个案例) ==========
            {
                'title': '40岁中年家庭全面保障规划',
                'life_stage': '责任高峰期',
                'customer_age': 40,
                'annual_income': 1200000,
                'family_structure': '已婚，2个子女（10岁、13岁），有房贷',
                'insurance_needs': '需要完善的家庭保障，包括重疾、医疗、寿险，同时继续为子女教育和退休储蓄',
                'budget_suggestion': '年收入的15-18%',
                'recommended_products': [
                    {
                        'product_name': '万用寿险计划',
                        'company': '友邦保险',
                        'annual_premium': 80000,
                        'coverage_type': '储蓄+寿险',
                        'reason': '兼顾保障与储蓄，灵活调整'
                    },
                    {
                        'product_name': '多次赔付重疾保险',
                        'company': '保诚保险',
                        'annual_premium': 60000,
                        'coverage_type': '重疾',
                        'reason': '多次赔付，保障更全面'
                    },
                    {
                        'product_name': '高端医疗保险',
                        'company': '宏利保险',
                        'annual_premium': 30000,
                        'coverage_type': '医疗',
                        'reason': '全球医疗网络，无限额保障'
                    },
                    {
                        'product_name': '子女教育基金',
                        'company': '友邦保险',
                        'annual_premium': 50000,
                        'coverage_type': '储蓄',
                        'reason': '专款专用，保证子女教育资金'
                    }
                ],
                'total_annual_premium': 220000,
                'case_description': '该家庭处于责任高峰期，是家庭财务压力最大的阶段。需要完善的风险保障和持续的财富积累。推荐方案包含储蓄、重疾、医疗、寿险四大保障，总保费22万，占年收入18%。万用寿险提供灵活的保障和储蓄功能，多次赔付重疾保险确保长期保障，高端医疗保险提供全球优质医疗资源，子女教育基金专款专用。建议每年评估调整，确保保障充足。',
                'key_points': [
                    '40岁中年家庭，年收入120万',
                    '2个子女正值教育关键期',
                    '有房贷负担，需要充足保障',
                    '四重保障：储蓄+重疾+医疗+寿险',
                    '总保费22万，占收入18%',
                    '兼顾当前保障和未来规划'
                ],
                'sort_order': 30,
                'is_active': True
            },
            {
                'title': '45岁家庭责任期保障升级',
                'life_stage': '责任高峰期',
                'customer_age': 45,
                'annual_income': 1500000,
                'family_structure': '已婚，2个子女（15岁、17岁），有房贷和车贷',
                'insurance_needs': '子女即将进入大学，需要充足的教育资金和家庭保障，同时开始退休规划',
                'budget_suggestion': '年收入的18-20%',
                'recommended_products': [
                    {
                        'product_name': '大额终身寿险',
                        'company': '友邦保险',
                        'annual_premium': 100000,
                        'coverage_type': '寿险',
                        'reason': '高保额，保障家庭责任期'
                    },
                    {
                        'product_name': '多次赔付重疾保险',
                        'company': '保诚保险',
                        'annual_premium': 80000,
                        'coverage_type': '重疾',
                        'reason': '年龄渐长，重疾风险增加'
                    },
                    {
                        'product_name': '大学教育专项基金',
                        'company': '宏利保险',
                        'annual_premium': 70000,
                        'coverage_type': '储蓄',
                        'reason': '保证两个孩子的大学教育资金'
                    },
                    {
                        'product_name': '退休年金计划',
                        'company': '友邦保险',
                        'annual_premium': 50000,
                        'coverage_type': '年金',
                        'reason': '开始为退休生活储备'
                    }
                ],
                'total_annual_premium': 300000,
                'case_description': '45岁是家庭责任最重的时期。两个孩子即将进入大学，教育支出大幅增加。推荐方案包含大额寿险、重疾保险、教育基金和退休年金。总保费30万，占年收入20%。这个阶段保费较高但必要，需要在保障家庭责任的同时开始为退休做准备。',
                'key_points': [
                    '45岁家庭责任高峰期，年收入150万',
                    '两个子女即将进入大学，教育支出大',
                    '大额寿险+重疾+教育基金+退休年金',
                    '总保费30万，占收入20%',
                    '保费高峰期，兼顾当前责任和退休规划'
                ],
                'sort_order': 31,
                'is_active': True
            },
            {
                'title': '42岁单亲家庭保障方案',
                'life_stage': '责任高峰期',
                'customer_age': 42,
                'annual_income': 800000,
                'family_structure': '单亲，2个子女（8岁、12岁）',
                'insurance_needs': '单亲家庭，经济支柱唯一，需要加倍重视保障，确保万一情况下子女生活无忧',
                'budget_suggestion': '年收入的20-25%',
                'recommended_products': [
                    {
                        'product_name': '高额定期寿险',
                        'company': '友邦保险',
                        'annual_premium': 50000,
                        'coverage_type': '寿险',
                        'reason': '单亲家庭必备，保障子女未来'
                    },
                    {
                        'product_name': '重疾保险',
                        'company': '保诚保险',
                        'annual_premium': 45000,
                        'coverage_type': '重疾',
                        'reason': '唯一经济支柱，必须有充足保障'
                    },
                    {
                        'product_name': '子女教育信托计划',
                        'company': '宏利保险',
                        'annual_premium': 60000,
                        'coverage_type': '储蓄',
                        'reason': '确保子女教育资金，信托保护'
                    },
                    {
                        'product_name': '全家医疗保险',
                        'company': '友邦保险',
                        'annual_premium': 25000,
                        'coverage_type': '医疗',
                        'reason': '三人医疗保障'
                    }
                ],
                'total_annual_premium': 180000,
                'case_description': '单亲家庭面临更大的风险和责任。作为唯一经济支柱，必须有充足的保障。推荐方案包含高额寿险、重疾保险、教育信托和医疗保险。总保费18万，占年收入22.5%。虽然保费占比高，但这是单亲家庭的必要配置，尤其是寿险和教育信托，确保万一情况下子女生活和教育无忧。',
                'key_points': [
                    '42岁单亲家庭，唯一经济支柱',
                    '年收入80万，抚养两个子女',
                    '高额寿险+重疾+教育信托+医疗',
                    '总保费18万，占收入22.5%',
                    '保费占比高但必要，确保子女未来无忧'
                ],
                'sort_order': 32,
                'is_active': True
            },

            # ========== 责任递减期 (3个案例) ==========
            {
                'title': '50岁中年转型期保障规划',
                'life_stage': '责任递减期',
                'customer_age': 50,
                'annual_income': 1000000,
                'family_structure': '已婚，2个子女已成年独立',
                'insurance_needs': '子女独立，家庭责任减轻，重点转向退休规划和医疗保障',
                'budget_suggestion': '年收入的12-15%',
                'recommended_products': [
                    {
                        'product_name': '退休年金计划',
                        'company': '友邦保险',
                        'annual_premium': 80000,
                        'coverage_type': '年金',
                        'reason': '为退休生活提供稳定收入'
                    },
                    {
                        'product_name': '高端医疗保险',
                        'company': '保诚保险',
                        'annual_premium': 40000,
                        'coverage_type': '医疗',
                        'reason': '年龄渐长，医疗需求增加'
                    },
                    {
                        'product_name': '长期护理保险',
                        'company': '宏利保险',
                        'annual_premium': 30000,
                        'coverage_type': '护理',
                        'reason': '提前规划长期护理需求'
                    }
                ],
                'total_annual_premium': 150000,
                'case_description': '50岁是人生的转折点，子女独立后家庭责任减轻，应该调整保险配置重点。推荐方案从家庭保障转向个人退休和健康保障。年金计划提供退休收入，医疗保险应对健康风险，长期护理保险提前规划未来可能的护理需求。总保费15万，占年收入15%。',
                'key_points': [
                    '50岁中年，子女已独立',
                    '年收入100万，家庭责任减轻',
                    '退休年金+医疗+长期护理',
                    '总保费15万，占收入15%',
                    '从家庭保障转向个人退休规划'
                ],
                'sort_order': 40,
                'is_active': True
            },
            {
                'title': '55岁退休准备期保障方案',
                'life_stage': '责任递减期',
                'customer_age': 55,
                'annual_income': 800000,
                'family_structure': '已婚，子女已成家立业',
                'insurance_needs': '即将退休，需要加强医疗和护理保障，优化退休收入规划',
                'budget_suggestion': '年收入的10-12%',
                'recommended_products': [
                    {
                        'product_name': '终身医疗保险',
                        'company': '友邦保险',
                        'annual_premium': 50000,
                        'coverage_type': '医疗',
                        'reason': '终身医疗保障，无需担心续保'
                    },
                    {
                        'product_name': '长期护理保险',
                        'company': '保诚保险',
                        'annual_premium': 35000,
                        'coverage_type': '护理',
                        'reason': '失能护理保障，减轻子女负担'
                    }
                ],
                'total_annual_premium': 85000,
                'case_description': '55岁已接近退休，保险配置应该简化，重点关注医疗和护理。建议保留终身医疗保险和长期护理保险。总保费8.5万，占年收入10.6%。这个阶段不建议投入过多新的保费，应该盘活现有保单，必要时可以考虑退保部分储蓄型保险以增加流动资金。',
                'key_points': [
                    '55岁即将退休，子女已成家',
                    '年收入80万，准备退休生活',
                    '终身医疗+长期护理',
                    '总保费8.5万，占收入10.6%',
                    '简化保险配置，重点关注健康'
                ],
                'sort_order': 41,
                'is_active': True
            },
            {
                'title': '58岁财富传承规划方案',
                'life_stage': '责任递减期',
                'customer_age': 58,
                'annual_income': 1500000,
                'family_structure': '已婚，2个子女已成家，有孙辈',
                'insurance_needs': '财富积累丰厚，需要考虑财富传承和税务规划',
                'budget_suggestion': '根据资产规模灵活配置',
                'recommended_products': [
                    {
                        'product_name': '终身寿险（大额）',
                        'company': '友邦保险',
                        'annual_premium': 200000,
                        'coverage_type': '寿险',
                        'reason': '财富传承，税务规划工具'
                    },
                    {
                        'product_name': '高端医疗保险',
                        'company': '保诚保险',
                        'annual_premium': 50000,
                        'coverage_type': '医疗',
                        'reason': '高品质医疗服务'
                    },
                    {
                        'product_name': '长期护理保险',
                        'company': '宏利保险',
                        'annual_premium': 40000,
                        'coverage_type': '护理',
                        'reason': '长期护理保障'
                    }
                ],
                'total_annual_premium': 290000,
                'case_description': '高净值家庭，年收入150万，财富积累丰厚。推荐配置大额终身寿险进行财富传承规划，同时保留高端医疗和长期护理保险。总保费29万，占年收入19.3%。大额寿险不仅提供保障，更是税务规划和财富传承的重要工具。',
                'key_points': [
                    '58岁高净值家庭，年收入150万',
                    '子女已成家，开始考虑财富传承',
                    '大额寿险+高端医疗+长期护理',
                    '总保费29万，占收入19.3%',
                    '财富传承规划+税务优化'
                ],
                'sort_order': 42,
                'is_active': True
            },

            # ========== 退休期 (3个案例) ==========
            {
                'title': '60岁退休人士保险调整方案',
                'life_stage': '退休期',
                'customer_age': 60,
                'annual_income': 400000,
                'family_structure': '已退休夫妇，子女已独立',
                'insurance_needs': '调整保险结构，减少寿险保额，加强医疗和护理保障，优化资产配置',
                'budget_suggestion': '现有保单保费+部分退休金',
                'recommended_products': [
                    {
                        'product_name': '终身医疗保险',
                        'company': '保诚保险',
                        'annual_premium': 50000,
                        'coverage_type': '医疗',
                        'reason': '终身保障，应对老年医疗需求'
                    },
                    {
                        'product_name': '长期护理保险',
                        'company': '友邦保险',
                        'annual_premium': 30000,
                        'coverage_type': '护理',
                        'reason': '失能护理保障，减轻子女负担'
                    },
                    {
                        'product_name': '即期年金',
                        'company': '宏利保险',
                        'annual_premium': 1000000,
                        'coverage_type': '年金',
                        'reason': '一次性投入，终身领取稳定现金流'
                    }
                ],
                'total_annual_premium': 80000,
                'case_description': '该退休夫妇已度过家庭责任期，子女独立，保险需求转向医疗和护理保障。建议保留现有储蓄型保单，减少寿险保额，加强医疗和护理保障。即期年金提供稳定现金流，补充退休收入。总年缴保费8万（不含即期年金的一次性投入），符合退休预算。重点关注健康管理和生活品质，确保安享晚年。',
                'key_points': [
                    '60岁退休夫妇，被动收入40万/年',
                    '子女已独立，无家庭负担',
                    '重点关注医疗和护理保障',
                    '即期年金提供稳定现金流',
                    '优化资产配置，确保退休生活品质',
                    '定期体检，积极健康管理'
                ],
                'sort_order': 50,
                'is_active': True
            },
            {
                'title': '65岁乐享退休生活方案',
                'life_stage': '退休期',
                'customer_age': 65,
                'annual_income': 300000,
                'family_structure': '已退休，与配偶同住',
                'insurance_needs': '简化保险配置，保留必要的医疗和护理保障',
                'budget_suggestion': '每月退休金的15-20%',
                'recommended_products': [
                    {
                        'product_name': '终身医疗保险',
                        'company': '友邦保险',
                        'annual_premium': 40000,
                        'coverage_type': '医疗',
                        'reason': '终身医疗保障'
                    },
                    {
                        'product_name': '长期护理保险',
                        'company': '保诚保险',
                        'annual_premium': 25000,
                        'coverage_type': '护理',
                        'reason': '护理保障，减轻家人负担'
                    }
                ],
                'total_annual_premium': 65000,
                'case_description': '65岁已正式退休，保险配置应该极简化，只保留必要的医疗和护理保险。总保费6.5万，占被动收入21.7%。这个阶段最重要的是享受退休生活，保持健康，定期体检。保险主要起到补充医疗保障的作用。',
                'key_points': [
                    '65岁退休，被动收入30万/年',
                    '与配偶同住，享受退休生活',
                    '保留终身医疗+长期护理',
                    '总保费6.5万，占收入21.7%',
                    '简化保险，注重生活品质和健康'
                ],
                'sort_order': 51,
                'is_active': True
            },
            {
                'title': '70岁银发族健康保障方案',
                'life_stage': '退休期',
                'customer_age': 70,
                'annual_income': 250000,
                'family_structure': '退休多年，偶尔与子女同住',
                'insurance_needs': '年龄较大，重点关注医疗保障和可能的护理需求',
                'budget_suggestion': '根据实际需求配置',
                'recommended_products': [
                    {
                        'product_name': '老年医疗保险',
                        'company': '友邦保险',
                        'annual_premium': 35000,
                        'coverage_type': '医疗',
                        'reason': '针对老年人的医疗保障'
                    },
                    {
                        'product_name': '居家护理服务',
                        'company': '保诚保险',
                        'annual_premium': 20000,
                        'coverage_type': '护理',
                        'reason': '提供居家护理服务'
                    }
                ],
                'total_annual_premium': 55000,
                'case_description': '70岁银发族，健康是最大的财富。保险配置极简，只保留老年医疗和居家护理服务。总保费5.5万，占被动收入22%。这个年龄段购买新保险比较困难且保费高昂，建议盘活现有保单，必要时考虑政府医疗资源。重点是保持健康生活方式，定期体检，及早发现和治疗疾病。',
                'key_points': [
                    '70岁银发族，被动收入25万/年',
                    '健康是最大的财富',
                    '老年医疗+居家护理',
                    '总保费5.5万，占收入22%',
                    '极简保险配置，注重健康管理'
                ],
                'sort_order': 52,
                'is_active': True
            },
        ]
