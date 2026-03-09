"""
港险营销话术数据导入脚本
运行方式：python manage.py seed_sales_scripts
"""
from django.core.management.base import BaseCommand
from api.models import SalesScriptCategory, SalesScript


CATEGORIES = [
    {'name': '初次了解港险', 'icon': '🌟', 'description': '客户对香港保险完全不了解，需要基础介绍', 'sort_order': 1},
    {'name': '担心安全性', 'icon': '🔒', 'description': '客户担心香港保险公司会倒闭或钱不安全', 'sort_order': 2},
    {'name': '比较内地保险', 'icon': '⚖️', 'description': '客户觉得内地保险一样，不理解港险优势', 'sort_order': 3},
    {'name': '担心汇率风险', 'icon': '💱', 'description': '客户担心港币/美元汇率波动影响收益', 'sort_order': 4},
    {'name': '嫌保费太贵', 'icon': '💰', 'description': '客户觉得保费太高，预算有限', 'sort_order': 5},
    {'name': '收益问题', 'icon': '📈', 'description': '客户问收益是否有保证、能有多少', 'sort_order': 6},
    {'name': '理赔问题', 'icon': '🏥', 'description': '客户担心在内地无法理赔或理赔麻烦', 'sort_order': 7},
    {'name': '犹豫不决', 'icon': '🤔', 'description': '客户说"再考虑考虑"，需要临门一脚', 'sort_order': 8},
    {'name': '子女教育金', 'icon': '👨‍👩‍👧', 'description': '为孩子未来教育做规划的话术', 'sort_order': 9},
    {'name': '养老规划', 'icon': '🌅', 'description': '退休养老储蓄规划话术', 'sort_order': 10},
    {'name': '资产传承', 'icon': '💎', 'description': '高净值客户资产传承与隔离话术', 'sort_order': 11},
    {'name': '手续与流程', 'icon': '📋', 'description': '客户询问购买流程、需要什么证件', 'sort_order': 12},
]


SCRIPTS = [
    # ===== 初次了解港险 =====
    {
        'category_name': '初次了解港险',
        'title': '什么是香港保险？',
        'customer_question': '香港保险是什么？和普通保险有什么区别？',
        'script_content': (
            '香港保险其实就是在香港买的保险，和内地保险最大的不同有三点：\n\n'
            '第一，香港保险是用港币或美元计价的，相当于您的资产做了一次货币多元化配置，天然抵御人民币单边风险；\n\n'
            '第二，香港保险公司的资金是投向全球市场的——美股、欧债、亚太等等，这让它的长期收益潜力比内地保险更高；\n\n'
            '第三，香港的保险监管非常严格，由保监局统一监管，有完善的投保人保障机制。\n\n'
            '简单来说：买香港保险，是在用保险的壳子，做全球资产配置。'
        ),
        'follow_up_question': '您现在主要想解决什么问题？是资产增值、子女教育、还是养老规划呢？',
        'key_points': ['货币多元化', '全球投资', '严格监管', '保险壳做资产配置'],
        'applicable_product_type': 'all',
        'applicable_customer_type': 'all',
        'is_featured': True,
        'sort_order': 1,
    },
    {
        'category_name': '初次了解港险',
        'title': '为什么要去香港买保险？',
        'customer_question': '我在内地就能买保险，为什么要专门跑去香港买？',
        'script_content': (
            '这个问题问得非常好，我来举个实际数字对比：\n\n'
            '同样是一个35岁女性，投保储蓄险，每年存10万，存5年。\n'
            '内地某大型保险公司：20年后总现金价值约65万左右；\n'
            '香港某主流储蓄险：20年后保证+非保证价值预计在90万-110万之间。\n\n'
            '差距大约是30%-70%，这是因为香港保险的资金可以全球配置，长期复利效果更强。\n\n'
            '而且，您的资产里多了一部分美元或港元计价的资产，本身就是一种风险分散。\n\n'
            '去香港签单也不麻烦，通常一天就能搞定，很多客户顺便当成一次购物周末游。'
        ),
        'follow_up_question': '您方便的话，我们可以找一个周末一起去香港，整个流程我来帮您安排好。',
        'key_points': ['用数字对比说话', '全球配置优势', '强调便利性'],
        'applicable_product_type': 'savings',
        'applicable_customer_type': 'all',
        'is_featured': True,
        'sort_order': 2,
    },

    # ===== 担心安全性 =====
    {
        'category_name': '担心安全性',
        'title': '香港保险公司会倒闭吗？',
        'customer_question': '万一香港保险公司倒闭了怎么办？我的钱还拿得回来吗？',
        'script_content': (
            '您的担心非常合理，钱的安全是第一位的，我来给您解释一下香港的保障机制：\n\n'
            '第一，香港保监局要求所有保险公司必须保持充足的偿付能力，定期接受审查，门槛比内地更严格；\n\n'
            '第二，香港有《保险业条例》，保险公司的资产必须单独托管，不能挪作他用，和公司运营资金完全隔离；\n\n'
            '第三，香港保险业监管局设有"投保人保障计划"，即使保险公司出现问题，也有一定的赔偿保障；\n\n'
            '第四，目前在香港经营的都是友邦、保诚、宏利这类拥有上百年历史的国际顶级保险集团，财务极为稳健。\n\n'
            '过去150年，香港从未发生过保险公司倒闭导致客户血本无归的案例。'
        ),
        'follow_up_question': '您对哪家保险公司比较感兴趣？友邦、保诚还是宏利？我可以给您介绍各家的产品特点。',
        'key_points': ['监管机制', '资产隔离', '百年历史品牌', '零倒闭案例'],
        'applicable_product_type': 'all',
        'applicable_customer_type': 'all',
        'is_featured': True,
        'sort_order': 1,
    },
    {
        'category_name': '担心安全性',
        'title': '钱放香港安全吗？',
        'customer_question': '把这么多钱放香港，我心里不踏实，万一政策变了怎么办？',
        'script_content': (
            '理解您的顾虑，这是很多内地客户最初都会问到的问题。\n\n'
            '首先，香港是独立的法律体系，实行"一国两制"，保险合同受香港法律保护，与内地政策完全独立；\n\n'
            '其次，您购买的是保险合同，不是银行存款——保险公司的资产由保监局监管，是独立托管的；\n\n'
            '再者，很多内地高净值家庭、企业家，正是因为看中了香港资产与内地资产的"隔离性"，才选择在香港配置一部分资产，这本身就是一种风险管理；\n\n'
            '从历史来看，1997回归、2003年SARS、2019年社会事件，香港保险公司都正常运营，客户利益从未受损。'
        ),
        'follow_up_question': '其实很多像您这样的客户，在香港配置的金额都在家庭总资产的20%-30%，您目前大概有多少资金在考虑做配置呢？',
        'key_points': ['法律独立', '资产隔离', '高净值客户的共同选择', '历史验证'],
        'applicable_product_type': 'all',
        'applicable_customer_type': 'high_net_worth',
        'is_featured': False,
        'sort_order': 2,
    },

    # ===== 比较内地保险 =====
    {
        'category_name': '比较内地保险',
        'title': '内地保险和港险有什么区别？',
        'customer_question': '内地也有很多保险公司，产品也不差，为什么要舍近求远？',
        'script_content': (
            '内地保险当然也有好产品，我来客观说说两者的核心差异：\n\n'
            '【收益方面】\n'
            '内地储蓄险的预定利率受监管限制，目前上限是2.5%；香港储蓄险的分红险历史实现率普遍在90%以上，长期复利效果更强。\n\n'
            '【货币方面】\n'
            '内地保险是人民币计价；香港保险是港币/美元计价，天然实现了货币分散。\n\n'
            '【重疾险方面】\n'
            '香港重疾险的保额普遍比内地高30%-50%，而且保费更低，因为香港人均寿命更长、医疗数据更好。\n\n'
            '【资产传承方面】\n'
            '香港保险可以设置多层受益人，传承结构更灵活，遗产规划工具更完善。\n\n'
            '两者不是非此即彼，很多客户是内地保险+香港保险都有配置，互补使用。'
        ),
        'follow_up_question': '您现在内地有配置保险吗？我可以帮您看看两边怎么搭配更合理。',
        'key_points': ['客观对比', '收益差异有数据', '货币分散', '互补而非替代'],
        'applicable_product_type': 'all',
        'applicable_customer_type': 'all',
        'is_featured': True,
        'sort_order': 1,
    },
    {
        'category_name': '比较内地保险',
        'title': '内地重疾险和香港重疾险哪个好？',
        'customer_question': '内地重疾险保障也挺全的，香港重疾险有什么特别的吗？',
        'script_content': (
            '两者各有特点，我来直接对比：\n\n'
            '同样是30岁男性，购买100万重疾保额，保终身：\n'
            '内地某主流重疾险：年缴约1.2万-1.5万；\n'
            '香港某主流重疾险（折合人民币）：年缴约0.8万-1万，且保额是美元，折合人民币约700万+。\n\n'
            '香港重疾险的优势：\n'
            '① 保费更低、保额更高（因为香港核保标准基于本地较好的健康数据）\n'
            '② 保障病种更广（部分产品保障100种以上疾病）\n'
            '③ 美元计价，医疗通货膨胀保障更强（尤其未来海外就医需求）\n'
            '④ 多次赔付设计更成熟\n\n'
            '当然，香港重疾险需要亲赴香港签单，这是主要的不便之处。'
        ),
        'follow_up_question': '您或家人目前有重疾险配置吗？我可以帮您看看保障缺口在哪里。',
        'key_points': ['用实际数字对比', '强调美元保额', '客观承认不便'],
        'applicable_product_type': 'critical_illness',
        'applicable_customer_type': 'all',
        'is_featured': False,
        'sort_order': 2,
    },

    # ===== 担心汇率风险 =====
    {
        'category_name': '担心汇率风险',
        'title': '汇率风险怎么看？',
        'customer_question': '港币美元如果贬值了，我的收益不就没了吗？',
        'script_content': (
            '这个问题问得很专业！汇率风险确实存在，但我们要从两面来看：\n\n'
            '【风险的一面】\n'
            '如果人民币大幅升值，您的港险换回人民币时确实会有汇兑损失。\n\n'
            '【机会的一面】\n'
            '过去20年，人民币整体处于升值趋势，但从更长周期看，没有任何货币是单向走的。美元是全球储备货币，长期相对稳定。\n\n'
            '【更重要的视角】\n'
            '汇率风险本身就是您持有美元/港元资产的价值所在。您在香港买保险，本质上是在做"货币多元化配置"。如果您所有资产都是人民币，那才是在承担100%的单一货币风险。\n\n'
            '很多客户的逻辑是：人民币资产我已经有很多了，用保险的形式持有一部分美元资产，是给自己加了一道保险。'
        ),
        'follow_up_question': '您目前资产中，人民币资产大概占多少比例？这样我能帮您判断配置多少港险比较合适。',
        'key_points': ['承认风险存在', '长周期视角', '货币分散的价值', '引导思考单一货币风险'],
        'applicable_product_type': 'savings',
        'applicable_customer_type': 'all',
        'is_featured': True,
        'sort_order': 1,
    },

    # ===== 嫌保费太贵 =====
    {
        'category_name': '嫌保费太贵',
        'title': '保费太贵了，我负担不起',
        'customer_question': '每年要交这么多钱，压力太大了，有没有便宜一点的？',
        'script_content': (
            '完全理解，保费的确需要量力而行。我们来看看几个角度：\n\n'
            '【灵活缴费期选择】\n'
            '同一款产品，您可以选择5年缴、10年缴、20年缴。缴费年期越长，每年的保费就越低，您可以根据自己的现金流来选择最舒适的方式。\n\n'
            '【保额可以调整】\n'
            '比如储蓄险，从2万美元起步也可以，不一定要买10万美元。先建立一个账户，后续有余力再追加。\n\n'
            '【换个视角看"贵"】\n'
            '比如每年存5万，存5年，总投入25万，20年后这笔钱可能变成45万-60万，这其实是一个非常好的强制储蓄工具，而且是美元资产。\n\n'
            '您每年大概可以拿出多少做这个配置呢？我帮您找一个最合适的方案。'
        ),
        'follow_up_question': '您目前每年的结余大概是多少？我们按照您的实际情况来定制方案。',
        'key_points': ['灵活缴费期', '保额可调整', '换视角看保费', '引导说出预算'],
        'applicable_product_type': 'savings',
        'applicable_customer_type': 'all',
        'is_featured': False,
        'sort_order': 1,
    },
    {
        'category_name': '嫌保费太贵',
        'title': '我钱都投了其他地方',
        'customer_question': '我的钱都放在基金/股票/房产里了，没有多余的钱买保险。',
        'script_content': (
            '您投资意识很强，这很好！我反而想和您探讨一个问题：\n\n'
            '基金、股票、房产，这些资产有一个共同点——流动性和价值都可能随市场大幅波动。\n\n'
            '而香港储蓄险的优势恰恰是：\n'
            '① 保证现金价值部分不会随市场下跌\n'
            '② 强制储蓄，不会被短期冲动消费或套现\n'
            '③ 美元计价，与您的人民币资产形成对冲\n\n'
            '很多高净值客户不是因为"没钱"买港险，而是主动把部分资金从高风险资产里拿出来，放进这个"安全垫"。\n\n'
            '比如您股票账户有100万，拿出10%-20%放进保险，剩下的继续投资，整体资产组合的风险反而降低了。'
        ),
        'follow_up_question': '您现在的资产配置大概是什么比例？我可以帮您看看保险在里面应该占多少合适。',
        'key_points': ['肯定投资意识', '强调不同资产的互补', '安全垫概念', '资产配置视角'],
        'applicable_product_type': 'savings',
        'applicable_customer_type': 'high_net_worth',
        'is_featured': False,
        'sort_order': 2,
    },

    # ===== 收益问题 =====
    {
        'category_name': '收益问题',
        'title': '收益有保证吗？',
        'customer_question': '你说的收益都是预测的，万一没达到怎么办？保证的部分有多少？',
        'script_content': (
            '这个问题问得非常关键，我来给您拆解清楚：\n\n'
            '香港储蓄险的收益分两部分：\n\n'
            '【保证部分】写进合同，白纸黑字，无论市场好坏都必须兑现。通常占总价值的50%-70%。\n\n'
            '【非保证部分】来自保险公司的投资分红，取决于公司投资表现。这部分不保证，但各大公司历史实现率都有公开数据。\n\n'
            '以保诚为例，过去20年分红实现率维持在95%以上；宏利、友邦也类似。\n\n'
            '您可以把保证部分当作"兜底"——即使非保证分红一分没有，您的保证收益也能超过银行定存。\n\n'
            '我建议您这样看待它：把保证收益当成最低预期，非保证部分当成额外惊喜，这样的心态买这个产品会非常舒适。'
        ),
        'follow_up_question': '我可以给您看一下具体产品的保证/非保证比例，以及历史分红实现率，您方便的话我发给您看看？',
        'key_points': ['拆解保证与非保证', '历史实现率数据', '设定合理预期', '兜底思维'],
        'applicable_product_type': 'savings',
        'applicable_customer_type': 'all',
        'is_featured': True,
        'sort_order': 1,
    },
    {
        'category_name': '收益问题',
        'title': '收益能超过内地理财吗？',
        'customer_question': '我银行有年化3.5%的理财产品，香港保险能比这个高吗？',
        'script_content': (
            '短期来看，银行理财的流动性确实更好，收益也相对稳定。但我们来看长期：\n\n'
            '银行理财产品一般是1-3年期，到期后需要重新找产品，而且随着利率下行，未来的3.5%很可能变成2.5%甚至更低。\n\n'
            '香港储蓄险是锁定长期收益的工具：\n'
            '以某款主流产品为例，按保证+历史非保证分红计算：\n'
            '- 10年内部回报率（IRR）约3%-4%\n'
            '- 20年IRR约5%-6%\n'
            '- 30年IRR可达6%-7%\n\n'
            '而且这是美元计价的收益，如果人民币继续温和贬值，换算成人民币的实际收益会更高。\n\n'
            '银行理财解决的是短期流动性需求；港险解决的是长期财富积累和传承。两者的功能不同，最好都有配置。'
        ),
        'follow_up_question': '您这笔资金大概需要多少年后才会用到？如果是5年以上不急用，港险的长期复利优势会非常明显。',
        'key_points': ['承认短期劣势', '强调长期复利', 'IRR数据对比', '两种工具互补'],
        'applicable_product_type': 'savings',
        'applicable_customer_type': 'all',
        'is_featured': False,
        'sort_order': 2,
    },

    # ===== 理赔问题 =====
    {
        'category_name': '理赔问题',
        'title': '在内地能理赔吗？',
        'customer_question': '我人在内地，万一出险了，去香港理赔是不是很麻烦？',
        'script_content': (
            '现在理赔其实比您想象的方便多了，我来说说实际流程：\n\n'
            '【储蓄险】基本不涉及理赔概念，取钱的时候直接网上申请，把钱转到您的香港账户就好，全程线上。\n\n'
            '【重疾险】如果在内地就医，您需要：\n'
            '① 收集诊断证明、病历、发票等材料\n'
            '② 材料公证翻译（各大城市都有代办，费用几百元）\n'
            '③ 提交给香港保险公司，通常30-90天内赔付\n\n'
            '很多保险公司在内地一线城市有服务中心，甚至可以派专员上门协助准备材料。\n\n'
            '值得注意的是：香港重疾险理赔不审查您是在哪里治病的，内地医院出具的诊断报告同样有效，这一点比很多人想象的要方便。\n\n'
            '而且保额是美元，如果未来想去海外就医，这笔钱更好用。'
        ),
        'follow_up_question': '我们的服务包含理赔协助，签单之后如果遇到任何理赔问题，我都会全程帮您跟进，您不需要自己去和保险公司周旋。',
        'key_points': ['分储蓄险和重疾险说', '强调线上操作', '公证流程简化', '经纪人协助理赔'],
        'applicable_product_type': 'all',
        'applicable_customer_type': 'all',
        'is_featured': True,
        'sort_order': 1,
    },

    # ===== 犹豫不决 =====
    {
        'category_name': '犹豫不决',
        'title': '客户说"再考虑考虑"',
        'customer_question': '这个我还需要考虑一下，等我想清楚了再说。',
        'script_content': (
            '当然，这么重要的决定确实需要想清楚。我想帮您梳理一下，您主要在顾虑哪方面？\n\n'
            '通常客户考虑的点有这几个：\n'
            '① 对产品还不够了解？——我可以再详细讲解，或者给您发详细资料\n'
            '② 资金安排上有顾虑？——我们可以看看有没有更合适的保费方案\n'
            '③ 需要和家人商量？——完全理解，要不要我约个时间一起给您爱人也介绍一下？\n'
            '④ 还在对比其他产品？——没问题，我可以帮您做一个横向对比\n\n'
            '有一点想提醒您：香港储蓄险是有投保年龄限制的，越年轻投保，保费越低，收益积累时间越长。每晚一年，差距都会累积。\n\n'
            '不需要今天就决定，但我希望您的"考虑"是有方向的，不是让它一直搁着。'
        ),
        'follow_up_question': '您最大的顾虑是哪一点呢？我们今天就把这一点说清楚。',
        'key_points': ['找出真实顾虑', '提供解决方案', '年龄成本意识', '推动往前走'],
        'applicable_product_type': 'all',
        'applicable_customer_type': 'all',
        'is_featured': True,
        'sort_order': 1,
    },
    {
        'category_name': '犹豫不决',
        'title': '等等再说，现在不着急',
        'customer_question': '我现在不急，等过段时间再考虑吧。',
        'script_content': (
            '我完全尊重您的节奏，不过想跟您分享一个真实案例：\n\n'
            '我有一位客户，39岁，两年前和您一样说"再等等"，后来40岁生日前夕来问我，发现40岁以后同款产品的保费高了约15%，而且部分产品已经不再接受他这个年龄投保了。\n\n'
            '保险这件事，等的成本是看不见的——\n'
            '每等一年，投保年龄大一岁，保费高一些；\n'
            '每等一年，复利积累少一年；\n'
            '每等一年，身体状况可能有变化，到时候能不能投保都是问题。\n\n'
            '当然，如果您现在真的有更紧迫的资金需求，那等等完全没问题。\n'
            '但如果只是"不急"，我建议您至少先把方案定下来，资料递上去，保留一个申请资格。'
        ),
        'follow_up_question': '您大概什么时候资金上会比较宽裕？我们可以先把方案设计好，等您准备好了随时可以行动。',
        'key_points': ['真实案例', '等待的隐性成本', '区分真实原因', '降低行动门槛'],
        'applicable_product_type': 'all',
        'applicable_customer_type': 'all',
        'is_featured': False,
        'sort_order': 2,
    },

    # ===== 子女教育金 =====
    {
        'category_name': '子女教育金',
        'title': '为孩子准备教育金',
        'customer_question': '我想给孩子存一笔教育金，香港保险适合吗？',
        'script_content': (
            '非常适合！香港储蓄险做教育金有几个天然优势：\n\n'
            '【美元资产，对应海外教育】\n'
            '孩子将来如果去英美澳读书，学费是美元/英镑计价的，而您的保单恰好是美元，不需要再担心汇率换算的损失。\n\n'
            '【强制储蓄，不被挪用】\n'
            '教育金最怕的是"被借用"——生意周转、应急支出……保单的资金天然有"心理隔离"，不到孩子用钱时不动它。\n\n'
            '【时间越早越好】\n'
            '举个例子：孩子3岁时开始，每年存5万人民币，存5年，到孩子18岁读大学时，这笔钱在港险里可能已经变成55万-70万人民币等值的美元资产。\n\n'
            '【传承功能】\n'
            '如果孩子不需要用这笔钱（比如拿到了奖学金），这个账户可以继续增值，作为婚嫁金、创业金甚至传给下一代。'
        ),
        'follow_up_question': '孩子现在几岁了？越早开始积累的时间越长，我帮您算算具体的方案。',
        'key_points': ['美元对应海外学费', '强制储蓄不挪用', '用具体数字说话', '灵活传承'],
        'applicable_product_type': 'savings',
        'applicable_customer_type': 'young_family',
        'is_featured': True,
        'sort_order': 1,
    },

    # ===== 养老规划 =====
    {
        'category_name': '养老规划',
        'title': '用港险做养老规划',
        'customer_question': '我想规划退休养老，香港保险能帮我实现吗？',
        'script_content': (
            '港险做养老规划是非常成熟的用法，我来给您设计一下思路：\n\n'
            '【现在存钱阶段】\n'
            '选择储蓄险，每年存一定金额，存5-10年，然后让它自动增值。\n\n'
            '【退休领钱阶段】\n'
            '很多香港储蓄险支持"部分提取"功能——您退休后可以每年提取一笔钱作为生活费，剩余资金继续在账户里增值，这就形成了一个"活的养老金"。\n\n'
            '举个实际例子：\n'
            '45岁开始，每年存10万，存10年，共投入100万。\n'
            '65岁退休时，账户价值约200万-250万（美元计价约28万-35万）。\n'
            '之后每年取10万，可以取25年以上，账户里还有剩余。\n\n'
            '【最大的优势】\n'
            '这笔养老金是美元资产，如果退休后想住在海外或者子女在海外，这笔钱会非常好用。而且放在保险里，不容易被子女或其他人"借走"，真正属于您自己的养老保障。'
        ),
        'follow_up_question': '您计划几岁退休？现在每年大概可以拿出多少做养老储备？我帮您做一个详细的规划表。',
        'key_points': ['存钱和领钱两阶段', '部分提取功能', '具体数字演示', '资产保全功能'],
        'applicable_product_type': 'savings',
        'applicable_customer_type': 'retirement',
        'is_featured': True,
        'sort_order': 1,
    },

    # ===== 资产传承 =====
    {
        'category_name': '资产传承',
        'title': '资产传承与财富隔离',
        'customer_question': '我想把一部分资产传给下一代，又不想让太多人知道，有什么好办法？',
        'script_content': (
            '这是很多企业家和高净值客户的核心需求，香港保险在这方面有独特的优势：\n\n'
            '【私密性】\n'
            '保险合同是您和保险公司之间的私人契约，不需要公证、不需要登记，不属于公开信息，资产配置对外完全不透明。\n\n'
            '【直达受益人】\n'
            '保险赔付是直接打给受益人的，不经过遗产程序，不需要等待，也不受其他债权人追索（在合法合规的前提下）。\n\n'
            '【多层受益人设计】\n'
            '您可以设置：第一受益人（配偶）、第二受益人（子女）、第三受益人（孙辈）……实现财富的跨代传承规划。\n\n'
            '【防离婚风险】\n'
            '如果您担心子女婚姻风险，可以将保单设计为子女的个人财产，这样即使子女离婚，保单资产也不计入夫妻共同财产。\n\n'
            '这些功能，在内地保险产品里是比较难实现的。'
        ),
        'follow_up_question': '您希望将来把资产主要传给谁？我可以帮您设计一个受益人架构方案。',
        'key_points': ['私密性', '绕过遗产程序', '多层受益人', '防离婚风险'],
        'applicable_product_type': 'whole_life',
        'applicable_customer_type': 'asset_inheritance',
        'is_featured': True,
        'sort_order': 1,
    },

    # ===== 手续与流程 =====
    {
        'category_name': '手续与流程',
        'title': '买港险需要什么手续？',
        'customer_question': '买香港保险需要准备什么？流程复杂吗？',
        'script_content': (
            '流程非常简单，我来给您说一下：\n\n'
            '【需要准备的材料】\n'
            '① 内地身份证（必须）\n'
            '② 护照（部分公司要求）\n'
            '③ 香港银行账户（用于缴费和取款，我可以帮您同步开户）\n'
            '④ 保费资金（可以从内地银行卡直接转到香港账户）\n\n'
            '【购买流程】\n'
            '① 选好产品和方案（我帮您完成）\n'
            '② 安排时间赴港签单（通常半天就够）\n'
            '③ 在香港见保险顾问，签署投保书\n'
            '④ 缴纳首期保费\n'
            '⑤ 保险公司审核（通常1-2周）\n'
            '⑥ 收到保单，完成！\n\n'
            '【重要提示】\n'
            '必须本人亲赴香港签单，在内地签的保单是无效的，这是香港监管规定。\n'
            '很多客户选择周末去，上午签单，下午购物，当天返回，非常方便。'
        ),
        'follow_up_question': '您有香港银行账户吗？没有的话我可以帮您安排同步开户，一次搞定。',
        'key_points': ['材料清单具体', '流程步骤清晰', '强调必须亲赴香港', '周末一日游'],
        'applicable_product_type': 'all',
        'applicable_customer_type': 'all',
        'is_featured': True,
        'sort_order': 1,
    },
    {
        'category_name': '手续与流程',
        'title': '资金怎么转到香港？',
        'customer_question': '钱怎么转过去？有外汇管制，每年只能换5万美元吧？',
        'script_content': (
            '您了解得很准确，个人每年有5万美元的购汇额度，但缴费方式其实很灵活：\n\n'
            '【方式一：香港银行账户】\n'
            '在香港开一个银行账户，平时可以通过跨境汇款把人民币转过去，在香港换成港元/美元后再缴费。很多银行对跨境汇款没有特别限制。\n\n'
            '【方式二：现金携带】\n'
            '每次出境可携带不超过等值2万人民币的现金（包括港币），直接在香港存入银行账户。\n\n'
            '【方式三：境外收入】\n'
            '如果您有境外收入来源，可以直接用于缴费。\n\n'
            '【方式四：年度购汇额度】\n'
            '每人每年5万美元的购汇额度，家庭里几个人合起来就有好几十万的额度，通常足够覆盖保费。\n\n'
            '我会提前帮您规划资金安排，确保每年缴费顺畅，这是我的服务内容之一。'
        ),
        'follow_up_question': '您每年需要缴费大概多少？我们可以一起规划一下资金的转移方式。',
        'key_points': ['多种缴费方式', '家庭合并购汇', '提供资金安排服务'],
        'applicable_product_type': 'all',
        'applicable_customer_type': 'all',
        'is_featured': False,
        'sort_order': 2,
    },
]


class Command(BaseCommand):
    help = '导入港险营销话术初始数据'

    def handle(self, *args, **options):
        self.stdout.write('开始导入话术数据...')

        # 创建分类
        category_map = {}
        for cat_data in CATEGORIES:
            cat, created = SalesScriptCategory.objects.update_or_create(
                name=cat_data['name'],
                defaults={
                    'icon': cat_data['icon'],
                    'description': cat_data['description'],
                    'sort_order': cat_data['sort_order'],
                    'is_active': True,
                }
            )
            category_map[cat_data['name']] = cat
            status = '创建' if created else '更新'
            self.stdout.write(f'  {status}分类：{cat.icon} {cat.name}')

        # 创建话术
        created_count = 0
        updated_count = 0
        for script_data in SCRIPTS:
            category = category_map[script_data['category_name']]
            script, created = SalesScript.objects.update_or_create(
                category=category,
                title=script_data['title'],
                defaults={
                    'customer_question': script_data['customer_question'],
                    'script_content': script_data['script_content'],
                    'follow_up_question': script_data['follow_up_question'],
                    'key_points': script_data['key_points'],
                    'applicable_product_type': script_data['applicable_product_type'],
                    'applicable_customer_type': script_data['applicable_customer_type'],
                    'is_featured': script_data['is_featured'],
                    'is_active': True,
                    'sort_order': script_data['sort_order'],
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ 导入完成！'
            f'\n   分类：{len(CATEGORIES)} 个'
            f'\n   话术：新建 {created_count} 条，更新 {updated_count} 条'
        ))
