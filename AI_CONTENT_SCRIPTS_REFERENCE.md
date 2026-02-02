# AI内容生成脚本快速参考

## 📊 脚本总览

| 脚本名称 | 分类 | 生成频率 | 话题数 | 状态 |
|---------|------|---------|-------|------|
| `auto_generate_insurance_market_news.py` | 公司新闻 | 60秒 | 8个 | ✅ 使用content |
| `auto_generate_wealth_lifestyle_copy.py` | 精英生活 | 60秒 | 18个 | ✅ 使用content |
| `auto_generate_fulfillment_report.py` | 公司新闻 | 60秒 | 1个 | ✅ 使用content |
| `auto_expand_hk_qa.py` | 港险问答 | 60秒 | 40+个 | ✅ 使用content |

## 🚀 运行命令

```bash
# 公司新闻 - 保险市场资讯
python3 auto_generate_insurance_market_news.py

# 精英生活 - 高端财富生活方式
python3 auto_generate_wealth_lifestyle_copy.py

# 公司新闻 - 分红实现率报告
python3 auto_generate_fulfillment_report.py

# 港险问答 - 知识库问答
python3 auto_expand_hk_qa.py
```

## 📋 各脚本详情

### 1️⃣ auto_generate_insurance_market_news.py
**公司新闻 - 香港保险市场资讯**

**8个话题池**：
- 宏利香港：财报分析和市场占有率
- 友邦香港：信用评级和偿付能力
- 英国保诚：战略重点和分红稳定性
- 安盛香港：数字化理赔创新
- 汇丰人寿：高净值市场布局
- 周大福人寿：品牌重塑和市场定位
- 万通保险：年金市场和金融科技
- 中银人寿：离岸人民币和大湾区业务

**标签示例**：`["友邦", "财报", "大湾区"]`

**文章结构**：
```markdown
### 1. 核心快讯：市场地位与最新动向
### 2. 深度解析：核心优势与数据表现
### 3. 行业视野：对投保人的影响
### 4. 参考资料 (References)
```

---

### 2️⃣ auto_generate_wealth_lifestyle_copy.py
**精英生活 - 全球财富与生活方式**

**18个话题池（4大类）**：

**全球资产配置**（5个）：
- 2026全球核心城市房产投向
- 家族办公室核心逻辑
- 离岸信托资产保护
- CRS全球征税下税务配置
- 数字游民高净值版

**精英教育与传承**（4个）：
- 哈佛/牛津录取底层逻辑
- 家族传承财商培养
- IB/A-Level/AP选择
- 低龄留学最优路径

**高端生活美学**（5个）：
- 硅谷生物黑客与精准医疗
- 小众奢华旅行指南
- 艺术品收藏投资
- 全球顶级康养酒店
- 顶级私域俱乐部

**趋势洞察**（4个）：
- AI时代资产安全
- "老钱"消费观与静奢感
- 顶级商学院EMBA圈层
- 高净值人士个人IP

**主标签**（必选1个）：
- 全球资产、精英生活、家族传承、税务筹划

**辅助标签**（选1-2个）：
- 海外置业、子女教育、高端医疗、艺术收藏
- 移居指南、信托架构、生活美学、小众旅行
- 财富增值、法律合规、养老规划、个人品牌

**文章结构**：
```markdown
### 【引子：视野的高度决定人生的广度】
### 【趋势解析：看透底层的逻辑】
### 【避坑/实操：老钱的智慧】
### 【生活哲思：财富之外的意义】
### 【参考与出处】
```

---

### 3️⃣ auto_generate_fulfillment_report.py
**公司新闻 - 分红实现率深度报告**

**话题**：
- 香港保险分红实现率大盘点

**特点**：
- 深度对比多家保险公司
- 基于Google搜索获取实时数据
- 财报风格专业分析

**标签示例**：`["友邦香港", "英国保诚", "分红实现率"]`

**文章结构**（6段式）：
```markdown
### 1. 核心速递
### 2. 什么是分红实现率
### 3. 2025-2026香港保险公司分红实现率对比
### 4. 数据解读与投保建议
### 5. 常见误区澄清
### 6. 参考资料
```

---

### 4️⃣ auto_expand_hk_qa.py
**港险问答 - 知识库问答系统**

**40+个话题池（4大主题）**：

**避坑指南系列**：
- 香港保单真的能"保证"终身分红吗？
- 香港保险的"美元计价"真的比人民币保险更抗通胀吗？
- 为什么香港保险的"预期收益率"永远高于实际派息？
- 小心！香港保险的"免费退保"陷阱全解析
- 买了香港重疾险后去美国看病，理赔会被拒吗？

**收益真相系列**：
- 香港保险的IRR到底怎么算？
- 为什么香港储蓄险前10年退保会血亏？
- 香港保险宣称的"6%复利"到底是不是骗局？
- 香港保险的"非保证红利"到底能不能兑现？

**法律与合规系列**：
- 香港保险在大陆不受法律保护是真的吗？
- CRS和共同申报准则对香港保单有什么影响？
- 香港保单的受益人在大陆遗产税政策下如何处理？
- 大陆人持有香港保单算不算"海外资产"？

**理赔与售后系列**：
- 香港保险理赔为什么这么慢？
- 在大陆出险，香港保险公司会找各种理由拒赔吗？
- 香港保险公司会倒闭吗？
- 香港保险的续保问题如何解决？

**主标签**（必选1个）：
- 基础认知、重疾保障、理财储蓄、理赔售后

**辅助标签**（选1-2个）：
- 避坑指南、法律风险、高赞回答、实操攻略
- 产品对比、条款解读、理赔案例、税务筹划
- 资产配置、监管政策、常见误区、专业进阶

**文章结构**：
```markdown
### 1. 先说结论：是坑还是宝？
### 2. 误区粉碎机
### 3. 深度拆解（讲人话版）
### 4. 省流版重点 + 参考资料
```

---

## 🔧 技术架构

### AI模型
- **模型**：Google Gemini 3 Flash Preview (`gemini-3-flash-preview`)
- **工具**：Google搜索（实时数据）
- **输出**：JSON结构化数据

### 数据存储
```python
CustomerCase.objects.create(
    title='标题',
    category='分类',
    tags=['标签1', '标签2', '标签3'],
    content='完整Markdown文章',  # 新字段
    key_points=['要点1', '要点2', '要点3'],
    ...
)
```

### 去重机制
```python
if CustomerCase.objects.filter(title=data['title']).exists():
    print(f"Skipping duplicate: {data['title']}")
    return
```

## 📈 使用统计

### 前端分类
- 全部
- 精选案例（港险案例）
- 港险问答
- 公司新闻
- 精英生活

### 前端显示
- **港险案例**：显示完整案例信息（客户情况+产品推荐）
- **港险问答**：直接显示问答内容（省流版重点）
- **公司新闻**：直接显示新闻内容（核心速递）
- **精英生活**：直接显示文章内容（金句摘要）

## 💡 最佳实践

### 1. 后台运行（推荐）
```bash
# 使用nohup在后台运行
nohup python3 auto_generate_insurance_market_news.py > logs/market_news.log 2>&1 &
nohup python3 auto_generate_wealth_lifestyle_copy.py > logs/lifestyle.log 2>&1 &
nohup python3 auto_generate_fulfillment_report.py > logs/fulfillment.log 2>&1 &
nohup python3 auto_expand_hk_qa.py > logs/hk_qa.log 2>&1 &
```

### 2. 查看日志
```bash
tail -f logs/market_news.log
tail -f logs/lifestyle.log
tail -f logs/fulfillment.log
tail -f logs/hk_qa.log
```

### 3. 停止脚本
```bash
ps aux | grep auto_
kill -9 <PID>
```

### 4. 查看生成数据
```bash
python3 -c "
import os, sys, django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from api.models import CustomerCase

# 统计各分类数量
for category in ['公司新闻', '精英生活', '港险问答', '港险案例']:
    count = CustomerCase.objects.filter(category=category).count()
    print(f'{category}: {count}条')
"
```

## ⚠️ 注意事项

1. **API配额**：Gemini API有配额限制，注意监控使用量
2. **去重检查**：基于标题去重，避免重复生成
3. **内容质量**：定期检查生成内容质量，必要时调整Prompt
4. **数据库备份**：定期备份CustomerCase表数据

## 📚 相关文档

- `CONTENT_FIELD_MIGRATION_SUMMARY.md` - Content字段迁移总结
- `COMPANY_NEWS_CONTENT_FIELD.md` - 公司新闻字段功能说明
- `migrate_company_news_to_content.py` - 数据迁移脚本

---

**最后更新**：2026-01-29
**维护状态**：✅ 所有脚本已更新使用content字段
