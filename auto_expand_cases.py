import os
import json
import sys
import random
import time
import django
from google import genai
from google.genai import types

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

try:
    django.setup()
    from api.models import CustomerCase
except Exception as e:
    print(f"Error: Could not setup Django: {e}")
    sys.exit(1)

API_KEY = "AIzaSyCx6-wxKZGTQVviHWgiMx_-awdaNWrYuL8"

# 🔥 爆款吸睛话题库 (Clickbait & High Drama)
# 共计 150+ 个高冲击力话题
STORY_SEEDS = [
    # 豪门秘辛与私密资产 (Secrets of the Rich)
    "私生子信托：百亿富豪突发心梗，私生子凭一张保单拿走5000万，原配竟无法冻结？ (Illegitimate Child Asset Protection)",
    "名媛的后路：嫁入豪门前偷偷买的1000万年金，成了她离婚被净身出户后的唯一救命稻草 (Secret Pre-nup Insurance)",
    "消失的海外账户：CRS令下，富商海外资产裸奔，唯独这张大额保单完美隐身 (Asset Hiding vs Compliance)",

    # 中产阶级滑铁卢 (Middle Class Nightmares)
    "ICU里的碎钞机：年薪百万的总监，因父亲住进ICU两个月，卖房卖车一夜返贫 (Medical Bankruptcy)",
    "中产猝死悲歌：35岁二胎爸爸过劳死，留下1000万房贷和全职太太，房子惨被银行收回 (Mortgage Foreclosure)",
    "留学断供危机：父亲企业破产倒闭，留美女儿因交不起学费被迫辍学打黑工 (Education Fund Failure)",

    # 法律与人性的博弈 (Legal Battles)
    "防不胜防的借条：好心帮亲戚担保借款，结果亲戚跑路，自己的婚房被法院查封拍卖 (Guarantor Liability)",
    "黄昏恋的算计：父亲执意娶保姆，子女如何通过"不可撤销受益人"守住母亲留下的遗产？ (Remarriage Inheritance War)",
    "合伙人反目：公司CTO意外身故，其泼辣妻子大闹董事会，逼得CEO不得不解散公司 (Business Partner Dispute)",

    # 移民与全球税务 (Global Tax Traps)
    "移民监的代价：卖了北京四合院移民美国，结果被IRS征收40%遗产税，几代人积蓄缩水一半 (US Estate Tax Trap)",
    "两地分居的悲剧：丈夫在香港买房，妻子在内地带娃，离婚时保单现金价值竟成为争夺焦点 (Cross-border Divorce)",

    # 极端的爱与控制 (Control & Legacy)
    "给败家子的紧箍咒：担心儿子吸毒赌博，母亲设立"每顿饭只给500块"的防败家信托保单 (Spendthrift Control)",
    "特殊儿童的托孤：自闭症孩子父母的终极担忧——"我死后，谁来管他的钱不被骗？" (Special Needs Protection)",

    # 婚外情与资产保护 (Affair & Asset Protection)
    "小三上位记：富豪离婚，原配发现丈夫早已把2亿保单受益人改成情人和私生子 (Mistress Beneficiary)",
    "包养协议的破产：企业家给小三每月50万生活费，破产后保单成唯一无法追讨的资产 (Mistress Allowance Bankruptcy)",
    "二奶村的保险战争：深圳富豪养3个情人，每人一张千万保单，死后受益人互相起诉 (Multiple Mistresses Insurance War)",
    "隐形配偶陷阱：香港富豪娶内地女星为二房，遗产分配时大房用保单完胜 (Second Wife Trap)",
    "离婚前的资产转移：妻子发现离婚协议签署前3天，丈夫悄悄购买5000万保单 (Pre-divorce Asset Transfer)",

    # 豪门继承战争 (Inheritance Wars)
    "遗嘱之外的胜利：豪门长子被剥夺继承权，但母亲20年前买的保单让他躺赢 (Beyond the Will)",
    "代孕婴儿的保单：富豪通过代孕生子，在美国为婴儿购买信托保单规避遗产税 (Surrogacy Insurance Trust)",
    "赌王启示录：澳门赌王何鸿燊的遗产分配，保单如何避开争产大战 (Macau Tycoon Legacy)",
    "养子反噬：收养的干儿子变受益人，亲生子女遗产争夺中发现千万保单早已转移 (Adopted Son Betrayal)",
    "豪门私生子的保险护身符：富豪猝死，私生子凭不可撤销受益人保单对抗原配 (Illegitimate Child Shield)",

    # 避税与资产隔离 (Tax Evasion & Asset Protection)
    "CRS围猎下的逃生通道：内地富豪海外账户被查，香港大额保单成最后避风港 (CRS Escape Route)",
    "移民美国的遗产税噩梦：卖掉上海豪宅移民，去世后IRS征收40%遗产税，子女倾家荡产 (US Estate Tax Nightmare)",
    "新加坡家族办公室：富豪通过新加坡设立家族信托+保单，资产完全隔离债权人 (Singapore Family Office)",
    "离岸保单的灰色地带：温州炒房团通过香港保单转移资产，银行无法冻结 (Offshore Policy Grey Zone)",
    "破产清算的漏网之鱼：企业家欠债3亿被强制执行，唯独5000万保单现金价值无法追偿 (Bankruptcy Loophole)",

    # 人性与金钱博弈 (Human Nature vs Money)
    "赌徒的最后一张牌：赌博欠债2000万，妻子早年购买的保单成唯一不被追债的资产 (Gambler's Last Card)",
    "吸毒儿子的信托保单：富豪担心儿子吸毒败家，设立每月只能领5万的保单信托 (Drug Addict Son Trust)",
    "植物人的现金价值之争：丈夫车祸成植物人，婆婆和妻子争夺保单退保权 (Vegetative State Cash Value)",
    "癌症晚期的资产转移：企业家确诊癌症后疯狂购买保单，半年后去世，债权人追讨失败 (Terminal Cancer Asset Transfer)",
    "精神病院的保单争夺：富婆被儿子送进精神病院，儿子企图解除母亲千万保单 (Mental Hospital Policy Battle)",

    # 跨境婚姻陷阱 (Cross-border Marriage Traps)
    "涉外婚姻的保单战争：香港男娶内地女，离婚时发现妻子早已把保单受益人改成娘家人 (Cross-border Marriage War)",
    "假结婚真骗保：富豪被美女骗婚，婚后立即购买大额保单并指定妻子为受益人 (Fake Marriage Insurance Fraud)",
    "绿卡陷阱：为拿美国绿卡假结婚，配偶要求购买百万美金保单作为安全保证 (Green Card Trap)",
    "跨国离婚的管辖权之战：香港保单在内地法院能否分割？前妻的胜诉之路 (Cross-border Jurisdiction Battle)",

    # 医疗与重疾真相 (Medical & Critical Illness)
    "ICU里的阶级差距：年薪200万的高管，父亲ICU住2个月花光积蓄，没买高端医疗险的代价 (ICU Class Divide)",
    "癌症确诊后的理赔拒绝：重疾险拒赔案例——5年前体检异常未告知，保险公司胜诉 (Cancer Claim Rejection)",
    "器官移植的天价账单：肝移植手术200万，普通医疗险拒赔，高端医疗险全额理赔 (Organ Transplant Bill)",

    # 企业家风险 (Entrepreneur Risks)
    "对赌协议的破产：创业者签对赌失败，个人资产被冻结，唯独保单现金价值幸存 (Valuation Adjustment Bankruptcy)",
    "股权质押爆仓：上市公司老板股权质押爆仓，银行追债发现早已配置3000万保单 (Share Pledge Explosion)",
    "连带担保的噩梦：好心帮朋友公司担保，朋友跑路，自己房产被查封但保单安全 (Joint Guarantee Nightmare)",

    # 小三与情人的保险战争 (Mistress Insurance Wars) - 扩展20个
    "网红小三的保单逆袭：抖音女主播成富豪情人，3年后凭不可撤销保单分走8000万 (Internet Celebrity Mistress)",
    "双面人生的保险局：企业家香港有正妻，深圳养小三，两边各买5000万保单 (Double Life Insurance Scheme)",
    "大学生情人的信托陷阱：60岁富商包养22岁女大学生，为她设立每月10万生活费的保单信托 (Sugar Baby Trust)",
    "离婚冷静期的保单大战：丈夫在离婚冷静期悄悄把3000万保单受益人改成情人 (Cooling-off Period Betrayal)",
    "小三怀孕的保险筹码：情人怀孕后要求购买2000万保单作为'封口费' (Pregnancy Insurance Blackmail)",
    "KTV公主的保单骗局：富商在KTV认识女孩，被骗购买千万保单后人间蒸发 (KTV Girl Insurance Scam)",
    "秘书上位的20年布局：女秘书从25岁开始，每年劝老板为她买保单，20年后成最大受益人 (Secretary's Long Game)",
    "同性情人的保单之争：富豪与男性情人关系，家人发现保单受益人是'好兄弟' (Same-sex Lover Insurance)",
    "小三联盟的集体维权：富商去世，5个情人发现彼此存在，保单受益人竟然写了6个人 (Mistress Alliance)",
    "整容小三的身份迷局：情人整容后用新身份成为保单受益人，原配无法证明是同一人 (Plastic Surgery Identity)",
    "直播打赏的保单回报：富豪给女主播打赏2000万，主播要求转化为保单受益权 (Live Streaming Reward)",
    "代孕妈妈的保险保障：富豪为代孕妈妈购买高额保险，孩子出生后引发继承权争议 (Surrogacy Insurance)",
    "跨国小三的避税天堂：内地富商在新加坡为泰国情人购买美金保单，完美避开三地监管 (Cross-border Mistress Tax Haven)",
    "夜总会妈妈桑的保险帝国：夜总会老板为10个红牌小姐各买保单，形成复杂受益人网络 (Nightclub Insurance Empire)",
    "明星经纪人的隐秘关系：影帝与女经纪人地下情，保单受益人写成'商业伙伴' (Celebrity Agent Affair)",
    "拆迁暴发户的小三军团：温州拆迁户一夜暴富，在深圳养3个情人，每人一张保单 (Demolition Millionaire Harem)",
    "海天盛筵的保单交易：富豪在游艇派对认识嫩模，承诺购买保单换取陪伴 (Yacht Party Insurance Deal)",
    "女企业家的小鲜肉困局：女富豪包养小20岁男模，分手时小鲜肉要求保单补偿 (Cougar's Toy Boy Insurance)",
    "网恋杀猪盘的保单终局：女富婆被'高富帅'网恋诈骗，购买保单后对方消失 (Online Romance Scam)",
    "变性情人的保单继承：富商情人变性后，法律身份改变导致保单受益人争议 (Transgender Lover Inheritance)",

    # 遗产争夺战升级版 (Inheritance Wars Extended) - 扩展20个
    "试管婴儿的继承权之争：富豪去世5年后，冷冻胚胎被前妻使用，孩子要求分遗产 (IVF Baby Inheritance)",
    "海外私生子的DNA鉴定：美国女子带孩子回国，DNA证明是已故富豪私生子，要求保单受益权 (Overseas DNA Battle)",
    "同母异父的保单战争：母亲生前为不同父亲的三个孩子各买保单，金额差异引发仇恨 (Half-siblings Insurance War)",
    "继子女的反向继承：富豪再婚后领养继子女，亲生子女发现父亲为继子买了更多保险 (Stepchildren Inheritance)",
    "失散多年的孪生兄弟：富豪去世后，失散40年的双胞胎哥哥出现要求分保单 (Long-lost Twin Brother)",
    "被拐儿童的寻亲保单：企业家儿子30年前被拐，找到后发现父亲一直为他购买保单 (Trafficked Child Insurance)",
    "养老院的遗产猎人：护工悉心照顾孤寡富豪10年，老人去世前把保单受益人改成护工 (Nursing Home Hunter)",
    "老年痴呆的保单修改：子女发现父亲老年痴呆期间，保姆诱导修改保单受益人 (Dementia Policy Change)",
    "遗嘱执行人的黑幕：律师担任遗嘱执行人，私自侵占死者保单现金价值 (Executor Embezzlement)",
    "假死骗保的家族闹剧：富豪假死测试子女真心，发现儿女为争保单反目成仇 (Fake Death Test)",
    "人工授精的父亲之争：富豪去世，妻子用其冷冻精子生子，与前妻子女争夺保单 (Posthumous Conception)",
    "基因编辑婴儿的法律真空：富豪通过基因编辑技术生育，孩子继承权引发法律争议 (Gene-edited Baby Inheritance)",
    "代际复仇的保单布局：爷爷痛恨儿子，把5亿保单直接传给孙子，儿子无法继承 (Generational Revenge)",
    "宗教信仰的遗产冲突：富豪信教后把保单捐给教会，子女起诉教会洗脑 (Religious Inheritance Conflict)",
    "黑帮大佬的保单传承：黑社会老大金盆洗手，为儿子购买保单洗白财产 (Triad Boss Legacy)",
    "被判死刑的保单争夺：富豪被判死刑后，妻子与父母争夺保单受益权 (Death Row Insurance)",
    "植物人苏醒的保单归属：富豪昏迷10年，家人分完保单后突然苏醒要求返还 (Coma Patient Awakening)",
    "性别认同的继承难题：富豪儿子变性后，遗嘱中'长子'的定义引发法律争议 (Gender Identity Inheritance)",
    "克隆人的继承权幻想：未来科技下，富豪克隆人是否有权继承保单？ (Clone Inheritance Fiction)",
    "AI数字遗嘱的纠纷：富豪用AI留下数字遗嘱，子女质疑是否为本人真实意愿 (AI Will Dispute)",

    # 离婚财产分割的保单陷阱 (Divorce Insurance Traps) - 扩展20个
    "闪婚闪离的保单骗局：结婚3个月就离婚，女方要求分割丈夫婚前购买的千万保单 (Flash Marriage Scam)",
    "全职太太的保单反击：离婚时丈夫隐瞒海外保单，太太通过CRS信息交换发现 (Housewife's Counterattack)",
    "净身出户协议的保单漏洞：女方签署净身出户协议，但保留早年购买的保单受益权 (Clean Break Loophole)",
    "假离婚的保单转移：夫妻为买房假离婚，丈夫趁机把保单受益人改成母亲 (Fake Divorce Transfer)",
    "婚内财产协议的保单条款：婚前协议规定每年购买保额递增的保单，离婚时成争议焦点 (Prenup Insurance Clause)",
    "家暴受害者的保单补偿：妻子遭受家暴10年，法院判决丈夫用保单作为精神赔偿 (Domestic Violence Compensation)",
    "出轨证据的保单代价：丈夫出轨被抓现行，为求和解同意把保单受益人改为妻子 (Infidelity Insurance Price)",
    "跨国离婚的保单管辖：香港保单在内地能否分割？律师费花掉保单一半价值 (Cross-border Divorce Jurisdiction)",
    "同性婚姻的保单难题：同性伴侣在台湾结婚，回内地后无法变更保单受益人 (Same-sex Marriage Insurance)",
    "事实婚姻的保单之争：未登记结婚但同居20年，女方能否要求分割保单？ (Common-law Marriage Insurance)",
    "冷冻胚胎的抚养权与保单：离婚时争夺冷冻胚胎，法院判决胚胎归属方获得保单 (Frozen Embryo Custody)",
    "婚姻冷暴力的保单赔偿：妻子长期遭受冷暴力，心理医生诊断抑郁症，要求保单补偿 (Cold Violence Compensation)",
    "赌博败家的保单保护：丈夫赌博欠债千万，妻子离婚后保单成唯一不被追债资产 (Gambling Husband Protection)",
    "产后抑郁的保单争夺：妻子产后抑郁跳楼自杀，丈夫与岳父母争夺保单现金价值 (Postpartum Depression Insurance)",
    "啃老族的保单断供：富豪父母为啃老儿子买保单，儿子离婚时前妻要求分割 (NEET Son Insurance)",
    "代孕离婚的保单归属：夫妻通过代孕生子，离婚时孩子抚养权与保单受益权冲突 (Surrogacy Divorce Insurance)",
    "性冷淡的离婚理由：妻子以丈夫性冷淡为由起诉离婚，要求分割保单作为补偿 (Sexless Marriage Compensation)",
    "婆媳矛盾的保单战争：婆婆要求儿子离婚，儿媳发现婆婆是丈夫保单受益人 (Mother-in-law Insurance War)",
    "男方出轨后的保单赠与：丈夫出轨后悔，自愿把保单受益人改为妻子求原谅 (Repentance Insurance Gift)",
    "女方职场性骚扰后的离婚：妻子在职场遭性骚扰，丈夫怀疑妻子出轨要求离婚分保单 (Sexual Harassment Divorce)",

    # 医疗破产与保险真相 (Medical Bankruptcy Truth) - 扩展20个
    "白血病儿童的百万账单：3岁孩子确诊白血病，治疗3年花费800万，父母卖房卖车 (Childhood Leukemia Bankruptcy)",
    "罕见病的天价药物：渐冻症患者需要进口药，每年600万，医保不报销 (Rare Disease Drug Cost)",
    "癌症靶向药的理赔拒绝：肺癌患者使用靶向药年花100万，保险公司以实验性治疗为由拒赔 (Targeted Therapy Rejection)",
    "ICU住院的阶级鸿沟：普通ICU每天1万，VIP ICU每天10万，高端医疗险差距显现 (ICU Class Divide)",
    "器官移植的黑市与保险：肝衰竭患者等不到合法器官，黑市移植200万且保险不赔 (Black Market Organ)",
    "赴美就医的破产之路：癌症患者赴美就医，质子治疗500万，回国后倾家荡产 (Overseas Medical Bankruptcy)",
    "老年痴呆的护理费用：父亲老年痴呆需24小时护工，每月3万护理费连续10年 (Dementia Care Cost)",
    "植物人的长期治疗：车祸成植物人，医疗费每月5万，家人不舍放弃 (Vegetative State Long-term Cost)",
    "烧伤整形的天价账单：工厂爆炸全身烧伤，整形手术100次，费用超千万 (Burn Injury Cosmetic Surgery)",
    "早产儿的保温箱费用：7个月早产儿在保温箱3个月，每天3万，父母借遍亲友 (Premature Baby Incubator)",
    "心脏支架的过度医疗：老人被安装7个心脏支架，花费80万后质疑过度医疗 (Heart Stent Over-treatment)",
    "牙科种植的隐形破产：满口种植牙花费100万，中产家庭月供断裂 (Dental Implant Bankruptcy)",
    "抑郁症的长期治疗：重度抑郁症患者住院治疗2年，心理咨询费累计50万 (Depression Long-term Treatment)",
    "试管婴儿的失败成本：夫妻尝试试管婴儿10次，累计花费150万仍未成功 (IVF Failure Cost)",
    "癌症复发的绝望：第一次治疗花光积蓄，5年后复发，家人选择放弃治疗 (Cancer Recurrence Despair)",
    "罕见病药物的慈善困局：药企慈善赠药项目突然停止，患者陷入绝境 (Charity Drug Program Termination)",
    "海外就医的汇率损失：赴日就医遇日元升值，原定预算200万变成300万 (Overseas Medical Currency Loss)",
    "医疗事故的赔偿难题：手术失败成植物人，医院只赔50万，家属长期维权 (Medical Malpractice Compensation)",
    "安宁疗护的道德选择：癌症晚期患者，继续治疗还是安宁疗护？保险公司拒绝安宁费用 (Palliative Care Ethics)",
    "新冠后遗症的长期费用：新冠重症康复后，肺纤维化需长期治疗，医保报销有限 (Long COVID Treatment Cost)",

    # 企业家破产与保单保护 (Entrepreneur Bankruptcy & Insurance) - 扩展20个
    "P2P爆雷的保单自救：P2P平台创始人跑路前，为家人购买大额保单隔离资产 (P2P Collapse Self-rescue)",
    "矿难赔偿的保单规避：煤矿老板矿难后欠赔偿款2亿，早已转移资产到保单 (Mining Disaster Compensation Evasion)",
    "炒房断供的保单幸存：温州炒房客断供30套房，银行追债发现只有保单无法冻结 (Property Speculation Foreclosure)",
    "比特币崩盘的保险后路：币圈大佬爆仓欠债10亿，妻子的保单成唯一资产 (Crypto Crash Insurance Backup)",
    "股市配资爆仓的家破人亡：股民配资炒股亏损5000万，保单被法院认定不可追偿 (Stock Margin Call Bankruptcy)",
    "直播带货翻车的债务危机：网红主播假货事件赔偿5亿，提前转移资产到保单 (Live Streaming Scandal Debt)",
    "餐饮连锁的疫情倒闭：餐饮老板疫情期间关店100家，欠债3亿但保单安全 (Restaurant Chain Bankruptcy)",
    "房地产开发商的跑路：楼盘烂尾后老板失联，债权人发现其海外保单无法执行 (Property Developer Escape)",
    "影视投资的血本无归：明星投资电影亏损2亿，债权人起诉发现资产早已转入保单 (Film Investment Loss)",
    "奢侈品代购的海关查扣：代购被查偷税5000万，冻结所有资产但保单幸存 (Luxury Goods Smuggling)",
    "足疗会所的扫黄打非：足疗城老板被抓，资产查封但妻子保单不受影响 (Massage Parlor Crackdown)",
    "地下钱庄的洗钱案：地下钱庄老板被判刑，洗钱20亿但保单不属于犯罪所得 (Underground Banking Money Laundering)",
    "电信诈骗的资产追缴：诈骗团伙头目被抓，诈骗3亿但家人保单无法追缴 (Telecom Fraud Asset Recovery)",
    "A股割韭菜的证监罚款：上市公司实控人被罚10亿，卖股卖房但保单现金价值保留 (Stock Market Manipulation Fine)",
    "民间借贷的高利贷崩盘：放高利贷老板被判非法经营，债权人无法追偿其保单 (Usury Collapse)",
    "传销组织的资产冻结：传销头目被判刑，资产全部冻结但配偶保单不属于涉案财产 (Pyramid Scheme Asset Freeze)",
    "假疫苗事件的天价赔偿：疫苗企业老板赔偿100亿，早已为子女购买境外保单 (Fake Vaccine Compensation)",
    "网约车平台的劳务纠纷：网约车公司倒闭欠司机工资5亿，老板资产转移到保单 (Ride-hailing Platform Labor Dispute)",
    "区块链项目的诈骗崩盘：区块链项目方卷款10亿跑路，投资者发现老板家人有大额保单 (Blockchain Scam Collapse)",
    "直销公司的传销定性：直销公司被定性传销，老板资产冻结但保单在境外司法管辖外 (MLM Company Asset Freeze)",

    # 税务筹划与CRS围猎 (Tax Planning & CRS Crackdown) - 扩展20个
    "明星阴阳合同的税务补缴：女明星被查偷税8亿，补税后仅剩香港保单资产 (Celebrity Tax Evasion)",
    "网红直播的税务稽查：头部主播被追税13亿，家人提前配置保单避险 (Influencer Tax Audit)",
    "海外代购的偷税漏税：代购年入5000万未纳税，被查后资产冻结但配偶保单安全 (Cross-border Shopping Tax Evasion)",
    "跨境电商的税务黑洞：跨境电商老板偷税3亿，提前通过保单转移资产 (Cross-border E-commerce Tax)",
    "离岸公司的CRS暴露：香港离岸公司被CRS披露，税务局追缴遗产税，唯独保单豁免 (Offshore Company CRS Disclosure)",
    "瑞士银行账户的终结：瑞士不再保密，富豪海外账户被中国税务局查询，转投香港保单 (Swiss Bank Account End)",
    "新加坡家族办公室的税务天堂：富豪设立新加坡家族办公室，通过保单信托实现零遗产税 (Singapore Family Office Tax Haven)",
    "美国绿卡的全球征税陷阱：获得美国绿卡后，全球资产被IRS征税，后悔当初没配置保单 (US Green Card Tax Trap)",
    "移民前的资产转移时机：移民澳洲前3天购买大额保单，移民局质疑资产来源 (Pre-immigration Asset Transfer)",
    "房产税试点的避税方案：上海房产税扩大试点，富豪抛售房产转买保单 (Property Tax Pilot Avoidance)",
    "赠与税开征的保单对策：国家讨论开征赠与税，富豪提前为子女购买大额保单 (Gift Tax Countermeasure)",
    "遗产税立法的财富大转移：遗产税立法在即，富豪扎堆购买巨额保单避税 (Inheritance Tax Legislation Rush)",
    "双边税收协定的保单豁免：中美税收协定中，保单现金价值不列入征税范围 (Bilateral Tax Treaty Exemption)",
    "海外信托的CRS穿透：海外信托被CRS穿透，保单信托成为新的避税工具 (Trust CRS Penetration)",
    "数字货币的税务追踪：比特币富豪被税务局盯上，变现后购买保单避税 (Cryptocurrency Tax Tracking)",
    "艺术品拍卖的税务筹划：拍卖行拍出天价艺术品，买家用保单支付避税 (Art Auction Tax Planning)",
    "股权转让的个税优化：股权转让个税20%，通过保单架构降低税负 (Equity Transfer Tax Optimization)",
    "离婚分割的税务成本：离婚分割房产需缴巨额税，改用保单分割节省成本 (Divorce Tax Cost Savings)",
    "慈善捐赠的税收抵扣：富豪捐赠保单给慈善机构，实现税收抵扣与资产保全双赢 (Charity Donation Tax Deduction)",
    "家族信托的税务穿透风险：内地拟立法穿透家族信托，保单成为新的避税载体 (Family Trust Tax Penetration Risk)",

    # 极端人性测试与保险 (Extreme Human Nature Tests) - 扩展10个
    "死刑犯的保单传承：死刑犯临刑前，家人争夺其早年购买的保单现金价值 (Death Row Insurance Inheritance)",
    "器官捐献的保单奖励：富豪承诺捐献所有器官，保险公司提供保单奖励 (Organ Donation Insurance Reward)",
    "安乐死的保单纠纷：癌症患者在瑞士安乐死，国内保险公司拒绝理赔 (Euthanasia Insurance Dispute)",
    "冷冻人复活的保单归属：富豪冷冻遗体等待复活，保单现金价值如何处理？ (Cryonics Insurance Ownership)",
    "太空旅行的保险保障：亿万富翁太空旅行意外，天价保单引发理赔争议 (Space Travel Insurance)",
    "极限运动的保险除外：跳伞爱好者意外身亡，保险公司以危险运动为由拒赔 (Extreme Sports Exclusion)",
    "自杀的保单理赔期：抑郁症患者购买保单3年后自杀，家人申请理赔成功 (Suicide Policy Claim Period)",
    "安乐死合法化后的保单：台湾安乐死合法化，保险公司修改条款排除安乐死理赔 (Euthanasia Legalization Impact)",
    "脑机接口的保险定义：富豪植入脑机接口后成半机械人，保险公司质疑是否为人类 (Brain-computer Interface Definition)",
    "基因编辑的保险歧视：基因编辑婴儿长大后购买保险，保险公司以基因改造为由拒保 (Gene Editing Insurance Discrimination)"
]

def generate_story_case(seed):
    """Generate a case study using Gemini 3 Flash with Google Search"""
    try:
        # Initialize Gemini client
        client = genai.Client(api_key=API_KEY)

        prompt = f"""
        【全网搜索指令】
        利用Google搜索能力，寻找关于 "{seed}" 的真实案例、法庭判决、保险理赔争议或财富管理新闻。

        要求：
        1. 必须基于真实的法律逻辑或保险条款（参考香港友邦、保诚、安盛、万通等公司的产品逻辑）。
        2. 将搜寻到的信息转化为一个高冲击力的案例研究。

        **JSON Output Structure:**
        - **title**: 震撼的真实案例标题.
        - **tags**: 从中选择2-3个: ["高端医疗", "财富传承", "家庭支柱", "重疾保障", "教育金", "退休规划", "税务筹划", "资产隔离", "中产危机", "豪门秘辛"].
        - **insurance_needs**: 【深度故事还原】详细描述案例背景、人物、冲突和转折（至少300字）。
        - **case_description**: 【专家毒辣点评】深度分析法律漏洞、资产风险及保险的保护作用（至少200字）。
        - **key_points**: 3-5条残酷的真相或专业建议（每条30-50字）。

        **Technical Requirements:**
        - 返回 JSON 格式。
        - 语言：中文。
        - 所有字段必须填写，不能为空。
        """

        # Create content with Google Search tool
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )
        ]

        # Configure generation with Google Search and JSON output
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            tools=[
                types.Tool(
                    google_search=types.GoogleSearch()
                )
            ]
        )

        # Generate content
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=contents,
            config=config
        )

        # Parse JSON response
        if response.text:
            return json.loads(response.text)
        else:
            print("⚠️ Empty response from API")
            return None

    except Exception as e:
        print(f"⚠️ Generation Error: {e}")
        return None

def save_case(case_data):
    # Handle case where API returns a list instead of dict
    if isinstance(case_data, list):
        if len(case_data) == 0:
            print(f"⚠️ Empty case data list")
            return
        case_data = case_data[0]  # Take first element

    # Validate case_data is a dictionary
    if not isinstance(case_data, dict):
        print(f"⚠️ Invalid case data type: {type(case_data)}")
        return

    # Check for required title field
    if 'title' not in case_data:
        print(f"⚠️ Missing title field in case data")
        return

    if CustomerCase.objects.filter(title=case_data['title']).exists():
        print(f"Skipping duplicate: {case_data['title']}")
        return

    try:
        CustomerCase.objects.create(
            title=case_data.get('title'),
            category='港险案例',  # Explicitly set category for story cases
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
        print(f"✅ SAVED BLOCKBUSTER: {case_data['title']}")
    except Exception as e:
        print(f"❌ DB Error: {e}")

def main():
    print("🔥 Starting 'HIGH DRAMA' Financial Story Engine")
    print("   - Topics: Betrayal, Bankruptcy, Secret Assets")
    print("   - Style: Financial Thriller")
    print("--------------------------------------------------")
    
    while True:
        seed = random.choice(STORY_SEEDS)
        current_time = time.strftime("%H:%M:%S")
        print(f"\n[{current_time}] 🎬 Directing: {seed}")
        
        case_data = generate_story_case(seed)
        
        if case_data:
            save_case(case_data)
        else:
            print("   -> Cut! (Failed)")
            
        print("   -> Sleeping for 120s...")
        time.sleep(120)

if __name__ == "__main__":
    main()