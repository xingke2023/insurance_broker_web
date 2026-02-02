# 🤖 AI智能URL配置 - 使用Gemini + Google搜索

## 📋 概述

使用 **Gemini 3 Flash Preview** 的 **Google 搜索功能**，自动查找11家保险公司的官网URL和产品URL，无需手动输入！

---

## ✨ 核心优势

### 1. 全自动查找
- ✅ AI自动搜索和识别官方网站
- ✅ 智能过滤非官方链接
- ✅ 自动验证URL有效性

### 2. 智能匹配
- ✅ 根据公司名和产品名精准搜索
- ✅ 优先返回中文版本
- ✅ 自动识别香港保险公司网站

### 3. 批量处理
- ✅ 一键查找所有11家公司
- ✅ 批量查找产品URL
- ✅ 支持自定义查找数量

---

## 🚀 快速开始

### 方式1：全自动配置（推荐）

```bash
cd /var/www/harry-insurance2
python3 auto_find_urls_with_gemini.py
```

**操作菜单**：
```
1. 🔍 自动查找所有公司官网URL
2. 🎯 自动查找指定公司的产品URL
3. 🚀 批量查找所有公司的产品URL
4. 📊 查看当前配置状态
0. 退出
```

### 方式2：单独查找公司官网

```bash
python3 auto_find_urls_with_gemini.py
# 选择选项1：自动查找所有公司官网URL
```

**效果**：
```
📦 正在查找: 宏利 (Manulife)
   → 使用 Gemini + Google 搜索查找 宏利 官网...
   ✅ 找到官网: https://www.manulife.com.hk/zh-hk.html
   ✅ 保存成功

📦 正在查找: 友邦 (AIA)
   → 使用 Gemini + Google 搜索查找 友邦 官网...
   ✅ 找到官网: https://www.aia.com.hk/zh-hk.html
   ✅ 保存成功

...
```

### 方式3：查找产品URL

```bash
python3 auto_find_urls_with_gemini.py
# 选择选项2：自动查找指定公司的产品URL
# 输入公司代码: manulife
# 最多查找几个产品: 5
```

**效果**：
```
📦 公司: 宏利 (Manulife)
找到 5 个需要配置URL的产品

🎯 产品: 宏摯傳承保障計劃
   → 使用 Gemini + Google 搜索查找产品...
   ✅ 找到产品页: https://www.manulife.com.hk/.../genesis.html
   ✅ 保存成功

🎯 产品: 宏利環球精選
   → 使用 Gemini + Google 搜索查找产品...
   ✅ 找到产品页: https://www.manulife.com.hk/.../global-select.html
   ✅ 保存成功

...
```

---

## 🔧 技术实现

### Gemini Google搜索配置

爬虫服务使用了 Gemini 的 Google 搜索工具：

```python
# api/insurance_scraper_service.py

response = self.client.models.generate_content(
    model='gemini-2.0-flash-exp',
    contents=f"请帮我找到{company_name}香港保险公司的官方网站...",
    config=types.GenerateContentConfig(
        temperature=0.1,
        # ✨ 启用 Google 搜索
        tools=[types.Tool(google_search=types.GoogleSearch())]
    )
)
```

### 搜索策略

#### 1. 公司官网搜索
```
搜索关键词：{公司名} {英文名} 香港 官网 保险

示例：
- 宏利 Manulife 香港 官网 保险
- 友邦 AIA 香港 官网 保险
```

#### 2. 产品页面搜索
```
搜索关键词：{公司名} {产品名} 香港 保险 官网

示例：
- 宏利 宏摯傳承保障計劃 香港 保险 官网
- 友邦 充裕未来 香港 保险 官网
```

### URL提取和验证

```python
# 1. 从Gemini响应中提取URL
url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
urls = re.findall(url_pattern, result_text)

# 2. 取第一个匹配的URL（通常最准确）
official_url = urls[0]

# 3. 验证URL格式
# - 必须是https开头
# - 优先.hk域名（香港网站）
# - 自动过滤无效链接
```

---

## 📊 使用示例

### 示例1：配置所有公司官网

```bash
$ python3 auto_find_urls_with_gemini.py

请选择操作:
1. 🔍 自动查找所有公司官网URL
...

请输入选项: 1

🔍 使用 Gemini + Google 搜索自动查找公司官网

📦 正在查找: 友邦 (AIA)
   → 使用 Gemini + Google 搜索查找 友邦 官网...
   ✅ 找到官网: https://www.aia.com.hk/zh-hk.html
   ✅ 保存成功

📦 正在查找: 保诚 (Prudential)
   → 使用 Gemini + Google 搜索查找 保诚 官网...
   ✅ 找到官网: https://www.prudential.com.hk/zh-hk.html
   ✅ 保存成功

...

✅ 完成！成功: 11，失败: 0
```

### 示例2：查找宏利产品URL

```bash
$ python3 auto_find_urls_with_gemini.py

请选择操作:
2. 🎯 自动查找指定公司的产品URL

请输入公司代码: manulife
最多查找几个产品: 3

🔍 使用 Gemini + Google 搜索查找产品URL: manulife

📦 公司: 宏利 (Manulife)
找到 3 个需要配置URL的产品

🎯 产品: 宏摯傳承保障計劃
   → 使用 Gemini + Google 搜索查找产品...
   ✅ 找到产品页: https://www.manulife.com.hk/zh-hk/individual/products/save/savings/genesis.html
   ✅ 保存成功

🎯 产品: 宏利環球精選
   → 使用 Gemini + Google 搜索查找产品...
   ✅ 找到产品页: https://www.manulife.com.hk/zh-hk/individual/products/wealth/savings/global-select.html
   ✅ 保存成功

🎯 产品: 宏揚世代
   → 使用 Gemini + Google 搜索查找产品...
   ✅ 找到产品页: https://www.manulife.com.hk/zh-hk/individual/products/save/savings/prosperity.html
   ✅ 保存成功

✅ 完成！成功: 3，失败: 0
```

### 示例3：查看配置状态

```bash
$ python3 auto_find_urls_with_gemini.py

请选择操作:
4. 📊 查看当前配置状态

📊 当前配置状态

📦 友邦 (AIA)
   官网: ✅ https://www.aia.com.hk/zh-hk.html
   产品: 15 个，已配置URL: 8 个

📦 保诚 (Prudential)
   官网: ✅ https://www.prudential.com.hk/zh-hk.html
   产品: 12 个，已配置URL: 5 个

📦 宏利 (Manulife)
   官网: ✅ https://www.manulife.com.hk/zh-hk.html
   产品: 18 个，已配置URL: 12 个

...
```

---

## 💡 使用技巧

### 1. 避免API限额

Gemini API有调用限制，建议：

```python
# 每次查找后等待2秒
time.sleep(2)

# 分批查找产品（每次3-5个）
auto_find_product_urls('manulife', limit=3)

# 不要一次查找所有产品
```

### 2. 验证结果

AI查找的URL可能不准确，建议：

```bash
# 查找后立即验证
1. 访问URL确认是否正确
2. 查看配置状态
3. 手动修正错误的URL
```

### 3. 分阶段配置

```bash
# 第一阶段：配置所有公司官网
python3 auto_find_urls_with_gemini.py
# 选项1

# 第二阶段：逐个公司配置产品
# 先配置宏利
python3 auto_find_urls_with_gemini.py
# 选项2 -> manulife -> 5

# 再配置友邦
# 选项2 -> aia -> 5

# ...依次配置
```

### 4. 手动补充

AI可能无法找到所有产品URL，可以：

```python
# 使用 Admin 后台手动添加
http://localhost:8017/admin/

# 或使用 quick_setup_urls.py 添加已知URL
python3 quick_setup_urls.py
```

---

## 🔍 搜索质量优化

### 提示词优化

脚本使用了精心设计的提示词：

```python
# 公司官网搜索
prompt = f"""请帮我找到{company_name}（{company_name_en}）香港保险公司的官方网站。

要求：
1. 返回官方网站的完整URL（必须是https开头）
2. 优先返回中文版本的首页
3. 确保是香港分公司的网站（.hk域名）
4. 只返回URL，不要其他文字

搜索关键词：{search_query}"""

# 产品页面搜索
prompt = f"""请帮我找到{company_name}公司的"{product_name}"产品的官方介绍页面。

要求：
1. 返回产品官方介绍页面的完整URL
2. 确保是该产品的详细介绍页面，不是列表页
3. 优先返回中文版本
4. 只返回URL，不要其他文字

搜索关键词：{search_query}"""
```

### Temperature设置

```python
config=types.GenerateContentConfig(
    temperature=0.1,  # 低温度 = 更确定性的结果
    tools=[types.Tool(google_search=types.GoogleSearch())]
)
```

---

## 🛠️ 故障排除

### Q1: 找不到官网URL？

可能原因：
- 公司名称或英文名不准确
- 公司没有香港网站
- Google搜索结果质量问题

解决方案：
```python
# 手动指定URL
from api.models import InsuranceCompany
company = InsuranceCompany.objects.get(code='xxx')
company.website_url = 'https://correct-url.com'
company.save()
```

### Q2: API限额错误？

错误信息：
```
ResourceExhausted: 429 Too Many Requests
```

解决方案：
- 等待一段时间（1-2小时）
- 减少每次查找的数量
- 使用备用API Key

### Q3: 找到的URL不正确？

处理方式：
1. 查看配置状态确认
2. 手动访问URL验证
3. 在Admin后台修正
4. 重新运行查找

### Q4: 搜索速度慢？

优化建议：
- 每个公司间隔2秒
- 分批处理（每次3-5个产品）
- 在低峰时段运行

---

## 📈 最佳实践

### 1. 首次配置流程

```bash
# Step 1: 配置所有公司官网（约5分钟）
python3 auto_find_urls_with_gemini.py
# 选项1

# Step 2: 验证官网URL
python3 auto_find_urls_with_gemini.py
# 选项4

# Step 3: 配置重点产品URL（逐个公司）
python3 auto_find_urls_with_gemini.py
# 选项2 -> manulife -> 3
# 选项2 -> aia -> 3
# ...

# Step 4: 运行爬虫测试
python3 test_scraper.py
```

### 2. 定期更新

```bash
# 每月运行一次，更新URL
python3 auto_find_urls_with_gemini.py

# 检查失效的URL
# 重新查找变更的产品URL
```

### 3. 数据备份

```bash
# 配置前备份数据库
mysqldump -h localhost -P 8510 -u root -p insurancetools > backup.sql

# 配置后验证数据
python3 -c "from api.models import *; print(InsuranceCompany.objects.count())"
```

---

## 🔄 与其他配置工具对比

| 工具 | 方式 | 优势 | 适用场景 |
|------|------|------|---------|
| `auto_find_urls_with_gemini.py` | AI搜索 | 全自动、无需输入 | 首次配置 |
| `setup_insurance_urls.py` | 半自动 | 可手动指定 | 细节调整 |
| `quick_setup_urls.py` | 预设URL | 快速可靠 | 已知URL |

---

## 📞 技术支持

如遇问题：
1. 查看Django日志
2. 检查Gemini API配额
3. 验证网络连接
4. 查看[完整文档](./URL_SETUP_GUIDE.md)

---

## ✅ 验证清单

配置完成后检查：

- [ ] 11家公司都有官网URL
- [ ] 至少配置了部分产品URL
- [ ] 运行 `test_scraper.py` 无错误
- [ ] 能够成功抓取新闻
- [ ] 能够成功抓取产品资料

---

## 🎉 总结

使用 **Gemini 3 Flash Preview + Google 搜索**，实现了：

✅ **全自动配置** - AI自动查找URL
✅ **高准确度** - 优先返回官方网站
✅ **批量处理** - 一键配置所有公司
✅ **智能匹配** - 自动识别和验证
✅ **易于使用** - 交互式菜单操作

开始使用：
```bash
cd /var/www/harry-insurance2
python3 auto_find_urls_with_gemini.py
```
