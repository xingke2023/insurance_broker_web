"""
保险公司信息智能爬虫服务
使用 Gemini 3 Flash Preview 抓取保险公司官网的新闻和产品信息
"""
import os
import re
import json
import base64
import requests
from datetime import datetime, date
from typing import Dict, List, Optional, Tuple
from bs4 import BeautifulSoup
from google import genai
from google.genai import types
from django.conf import settings


class InsuranceScraperService:
    """保险公司信息爬虫服务"""

    def __init__(self):
        """初始化爬虫服务"""
        # 从环境变量或 settings 中读取 API Key
        self.api_key = os.getenv('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not configured in environment or settings")

        self.client = genai.Client(api_key=self.api_key)
        self.model = 'gemini-3-flash-preview'  # 使用 Gemini 3 Flash Preview（支持搜索）

        # ✨ 启用 Google 搜索功能
        self.use_google_search = True

        # 11家保险公司映射
        self.company_mapping = {
            '友邦': 'aia',
            '保诚': 'prudential',
            '宏利': 'manulife',
            '永明': 'sunlife',
            '安盛': 'axa',
            '中银': 'bocgroup',
            '国寿': 'chinalife',
            '富卫': 'fwd',
            '立桥': 'prudence',
            '萬通': 'yf',
            '周大福': 'ctf'
        }

    def fetch_webpage(self, url: str, timeout: int = 30) -> Optional[str]:
        """
        获取网页内容

        Args:
            url: 网页URL
            timeout: 超时时间（秒）

        Returns:
            网页HTML内容，失败返回None
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            }

            response = requests.get(url, headers=headers, timeout=timeout, verify=False)
            response.raise_for_status()
            response.encoding = response.apparent_encoding

            return response.text

        except Exception as e:
            print(f"❌ 获取网页失败 [{url}]: {str(e)}")
            return None

    def analyze_webpage_with_gemini(self, url: str, html_content: str, analysis_type: str = 'company_news') -> Dict:
        """
        使用 Gemini 分析网页内容

        Args:
            url: 网页URL
            html_content: 网页HTML内容
            analysis_type: 分析类型 ('company_news' 或 'product_promotion')

        Returns:
            分析结果字典
        """
        try:
            # 清理HTML，只保留主要内容
            soup = BeautifulSoup(html_content, 'html.parser')

            # 移除script、style等无用标签
            for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
                tag.decompose()

            # 提取文本内容
            text_content = soup.get_text(separator='\n', strip=True)

            # 限制长度（Gemini有输入限制）
            if len(text_content) > 50000:
                text_content = text_content[:50000]

            # 构建提示词
            if analysis_type == 'company_news':
                prompt = f"""你是一个专业的保险行业信息提取专家。请分析以下保险公司网页内容，提取公司新闻、优惠信息、公告等。

网页URL: {url}

网页内容:
{text_content}

请提取以下信息（以JSON格式返回）：
{{
    "items": [
        {{
            "title": "新闻标题",
            "content_type": "news/announcement/brochure/video/article/press_release/report/other",
            "description": "新闻描述或摘要",
            "url": "完整的链接地址",
            "published_date": "发布日期（YYYY-MM-DD格式，如果没有就留空）",
            "pdf_url": "PDF链接（如果有）",
            "is_featured": true/false
        }}
    ]
}}

要求：
1. 提取所有相关的新闻、优惠、公告信息
2. URL必须是完整的绝对路径（包含协议和域名）
3. 如果是相对路径，请根据页面URL补全
4. published_date格式必须是YYYY-MM-DD，如2024-01-15
5. is_featured用于标记重要/精选的新闻
6. 只返回JSON，不要有其他文字

请开始分析："""

            else:  # product_promotion
                prompt = f"""你是一个专业的保险产品信息提取专家。请分析以下保险产品网页内容，提取产品资料、推广信息、产品说明等。

网页URL: {url}

网页内容:
{text_content}

请提取以下信息（以JSON格式返回）：
{{
    "product_name": "产品名称",
    "product_url": "产品官网链接",
    "promotions": [
        {{
            "title": "资料标题",
            "content_type": "news/brochure/guide/video/article/other",
            "description": "资料描述或摘要",
            "url": "完整的链接地址",
            "published_date": "发布日期（YYYY-MM-DD格式，如果没有就留空）",
            "pdf_url": "PDF链接（如果有）"
        }}
    ]
}}

要求：
1. 提取产品相关的所有资料、小册子、说明、视频等
2. URL必须是完整的绝对路径（包含协议和域名）
3. 如果是相对路径，请根据页面URL补全
4. published_date格式必须是YYYY-MM-DD
5. 优先提取PDF资料链接
6. 只返回JSON，不要有其他文字

请开始分析："""

            # 调用 Gemini API
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )

            # 解析响应
            result_text = response.text.strip()

            # 清理可能的markdown代码块标记
            if result_text.startswith('```json'):
                result_text = result_text[7:]
            if result_text.startswith('```'):
                result_text = result_text[3:]
            if result_text.endswith('```'):
                result_text = result_text[:-3]

            result_text = result_text.strip()

            # 解析JSON
            data = json.loads(result_text)

            return {
                'success': True,
                'data': data
            }

        except json.JSONDecodeError as e:
            print(f"❌ JSON解析失败: {str(e)}")
            print(f"原始响应: {result_text[:500]}")
            return {
                'success': False,
                'error': f'JSON解析失败: {str(e)}',
                'raw_response': result_text[:500]
            }

        except Exception as e:
            print(f"❌ Gemini分析失败: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def search_company_url_with_gemini(self, company_name: str, company_name_en: str = '') -> Optional[str]:
        """
        使用 Gemini + Google 搜索查找保险公司官网

        Args:
            company_name: 公司中文名（如"宏利"）
            company_name_en: 公司英文名（如"Manulife"）

        Returns:
            公司官网URL，失败返回None
        """
        try:
            print(f"   → 使用 Gemini + Google 搜索查找 {company_name} 官网...")

            # 构建搜索查询
            search_query = f"{company_name} {company_name_en} 香港 官网 保险".strip()

            # 使用 Gemini 的 Google 搜索功能
            # 注意：需要使用支持搜索的配置
            response = self.client.models.generate_content(
                model=self.model,
                contents=f"""请帮我找到{company_name}（{company_name_en}）香港保险公司的官方网站。

要求：
1. 返回官方网站的完整URL（必须是https开头）
2. 优先返回中文版本的首页
3. 确保是香港分公司的网站（.hk域名）
4. 只返回URL，不要其他文字

搜索关键词：{search_query}""",
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    # 启用 Google 搜索
                    tools=[types.Tool(google_search=types.GoogleSearch())]
                )
            )

            result_text = response.text.strip()

            # 提取URL
            url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
            urls = re.findall(url_pattern, result_text)

            if urls:
                official_url = urls[0]
                print(f"   ✅ 找到官网: {official_url}")
                return official_url
            else:
                print(f"   ❌ 未找到URL")
                return None

        except Exception as e:
            print(f"   ❌ 搜索失败: {str(e)}")
            return None

    def search_product_url_with_gemini(self, company_name: str, product_name: str) -> Optional[str]:
        """
        使用 Gemini + Google 搜索查找产品页面URL

        Args:
            company_name: 公司名称
            product_name: 产品名称

        Returns:
            产品页面URL，失败返回None
        """
        try:
            print(f"   → 使用 Gemini + Google 搜索查找产品: {product_name}...")

            # 构建搜索查询
            search_query = f"{company_name} {product_name} 香港 保险 官网"

            # 使用 Gemini 的 Google 搜索功能
            response = self.client.models.generate_content(
                model=self.model,
                contents=f"""请帮我找到{company_name}公司的"{product_name}"产品的官方介绍页面。

要求：
1. 返回产品官方介绍页面的完整URL（必须是https开头）
2. 确保是该产品的详细介绍页面，不是列表页
3. 优先返回中文版本
4. 只返回URL，不要其他文字

搜索关键词：{search_query}""",
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    # 启用 Google 搜索
                    tools=[types.Tool(google_search=types.GoogleSearch())]
                )
            )

            result_text = response.text.strip()

            # 提取URL
            url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
            urls = re.findall(url_pattern, result_text)

            if urls:
                product_url = urls[0]
                print(f"   ✅ 找到产品页: {product_url}")
                return product_url
            else:
                print(f"   ❌ 未找到URL")
                return None

        except Exception as e:
            print(f"   ❌ 搜索失败: {str(e)}")
            return None

    def find_company_pages(self, company_url: str) -> Dict[str, str]:
        """
        使用 Gemini 查找公司的新闻页面和产品列表页面

        Args:
            company_url: 公司官网首页URL

        Returns:
            包含新闻页面和产品页面URL的字典
        """
        try:
            html_content = self.fetch_webpage(company_url)
            if not html_content:
                return {'news_page': None, 'products_page': None}

            soup = BeautifulSoup(html_content, 'html.parser')

            # 提取所有链接
            all_links = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                text = link.get_text(strip=True)

                # 转换为绝对URL
                if href.startswith('/'):
                    href = company_url.rstrip('/') + href
                elif not href.startswith('http'):
                    continue

                all_links.append({'url': href, 'text': text})

            # 使用 Gemini 识别新闻和产品页面
            prompt = f"""你是保险网站导航专家。请分析以下链接列表，找出新闻页面和产品列表页面的URL。

公司官网: {company_url}

网站链接列表:
{json.dumps(all_links[:50], ensure_ascii=False, indent=2)}

请返回JSON格式：
{{
    "news_page": "新闻/优惠/公告页面的完整URL（最相关的一个）",
    "products_page": "产品列表/产品中心页面的完整URL（最相关的一个）"
}}

提示：
- 新闻页面可能包含关键词：新闻、资讯、优惠、公告、promotions、news、offers等
- 产品页面可能包含关键词：产品、计划、保障、products、plans等
- 如果找不到，返回null
- 只返回JSON，不要其他文字

请开始分析："""

            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )

            result_text = response.text.strip()

            # 清理markdown标记
            if result_text.startswith('```json'):
                result_text = result_text[7:]
            if result_text.startswith('```'):
                result_text = result_text[3:]
            if result_text.endswith('```'):
                result_text = result_text[:-3]

            result_text = result_text.strip()
            data = json.loads(result_text)

            return data

        except Exception as e:
            print(f"❌ 查找页面失败: {str(e)}")
            return {'news_page': None, 'products_page': None}

    def download_pdf(self, pdf_url: str) -> Optional[str]:
        """
        下载PDF文件并转换为Base64

        Args:
            pdf_url: PDF文件URL

        Returns:
            Base64编码的PDF内容，失败返回None
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }

            response = requests.get(pdf_url, headers=headers, timeout=30, verify=False)
            response.raise_for_status()

            # 转换为Base64
            pdf_base64 = base64.b64encode(response.content).decode('utf-8')

            return pdf_base64

        except Exception as e:
            print(f"❌ 下载PDF失败 [{pdf_url}]: {str(e)}")
            return None

    def scrape_company_news(self, company_id: int, company_name: str, company_url: str) -> Dict:
        """
        抓取公司新闻

        Args:
            company_id: 公司ID
            company_name: 公司名称
            company_url: 公司官网URL

        Returns:
            抓取结果
        """
        try:
            print(f"\n🔍 开始抓取 {company_name} 的公司新闻...")
            print(f"   官网: {company_url}")

            # 1. 查找新闻页面
            print("   → 查找新闻页面...")
            pages = self.find_company_pages(company_url)
            news_page = pages.get('news_page') or company_url

            print(f"   → 新闻页面: {news_page}")

            # 2. 获取新闻页面内容
            html_content = self.fetch_webpage(news_page)
            if not html_content:
                return {
                    'success': False,
                    'error': '无法获取新闻页面内容'
                }

            # 3. 使用 Gemini 分析提取新闻
            print("   → 使用 Gemini 分析新闻内容...")
            result = self.analyze_webpage_with_gemini(news_page, html_content, 'company_news')

            if not result['success']:
                return result

            news_items = result['data'].get('items', [])
            print(f"   ✅ 提取到 {len(news_items)} 条新闻")

            # 4. 保存到数据库
            from .models import CompanyNews, InsuranceCompany

            company = InsuranceCompany.objects.get(id=company_id)
            created_count = 0
            updated_count = 0

            for item in news_items:
                try:
                    # 检查是否已存在（根据URL）
                    url = item.get('url', '')
                    if url:
                        existing = CompanyNews.objects.filter(company=company, url=url).first()

                        # 解析发布日期
                        published_date = None
                        if item.get('published_date'):
                            try:
                                published_date = datetime.strptime(item['published_date'], '%Y-%m-%d').date()
                            except:
                                published_date = date.today()

                        # 下载PDF（如果有）
                        pdf_base64 = None
                        if item.get('pdf_url'):
                            print(f"   → 下载PDF: {item['pdf_url'][:50]}...")
                            pdf_base64 = self.download_pdf(item['pdf_url'])

                        if existing:
                            # 更新现有记录
                            existing.title = item.get('title', '')
                            existing.content_type = item.get('content_type', 'news')
                            existing.description = item.get('description', '')
                            existing.published_date = published_date
                            existing.is_featured = item.get('is_featured', False)
                            if pdf_base64:
                                existing.content = pdf_base64  # 存储PDF的Base64
                            existing.save()
                            updated_count += 1
                        else:
                            # 创建新记录
                            CompanyNews.objects.create(
                                company=company,
                                title=item.get('title', ''),
                                content_type=item.get('content_type', 'news'),
                                description=item.get('description', ''),
                                content=pdf_base64 or '',
                                url=url,
                                published_date=published_date,
                                is_featured=item.get('is_featured', False),
                                is_active=True
                            )
                            created_count += 1

                except Exception as e:
                    print(f"   ⚠️ 保存新闻失败: {str(e)}")
                    continue

            print(f"   ✅ 完成！新增 {created_count} 条，更新 {updated_count} 条")

            return {
                'success': True,
                'company_name': company_name,
                'created': created_count,
                'updated': updated_count,
                'total': len(news_items)
            }

        except Exception as e:
            print(f"   ❌ 抓取失败: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def scrape_product_promotions(self, product_id: int, product_name: str, product_url: str) -> Dict:
        """
        抓取产品推广信息

        Args:
            product_id: 产品ID
            product_name: 产品名称
            product_url: 产品页面URL

        Returns:
            抓取结果
        """
        try:
            print(f"\n🔍 开始抓取产品推广信息: {product_name}")
            print(f"   产品页面: {product_url}")

            # 1. 获取产品页面内容
            html_content = self.fetch_webpage(product_url)
            if not html_content:
                return {
                    'success': False,
                    'error': '无法获取产品页面内容'
                }

            # 2. 使用 Gemini 分析提取产品资料
            print("   → 使用 Gemini 分析产品资料...")
            result = self.analyze_webpage_with_gemini(product_url, html_content, 'product_promotion')

            if not result['success']:
                return result

            data = result['data']
            promotions = data.get('promotions', [])
            print(f"   ✅ 提取到 {len(promotions)} 条资料")

            # 3. 保存到数据库
            from .models import ProductPromotion, InsuranceProduct

            product = InsuranceProduct.objects.get(id=product_id)
            created_count = 0
            updated_count = 0

            for item in promotions:
                try:
                    # 检查是否已存在（根据URL）
                    url = item.get('url', '')
                    if url:
                        existing = ProductPromotion.objects.filter(product=product, url=url).first()

                        # 解析发布日期
                        published_date = None
                        if item.get('published_date'):
                            try:
                                published_date = datetime.strptime(item['published_date'], '%Y-%m-%d').date()
                            except:
                                published_date = date.today()

                        # 下载PDF（如果有）
                        pdf_base64 = None
                        if item.get('pdf_url'):
                            print(f"   → 下载PDF: {item['pdf_url'][:50]}...")
                            pdf_base64 = self.download_pdf(item['pdf_url'])

                        if existing:
                            # 更新现有记录
                            existing.title = item.get('title', '')
                            existing.content_type = item.get('content_type', 'brochure')
                            existing.description = item.get('description', '')
                            existing.published_date = published_date
                            if pdf_base64:
                                existing.pdf_base64 = pdf_base64
                            existing.save()
                            updated_count += 1
                        else:
                            # 创建新记录
                            ProductPromotion.objects.create(
                                product=product,
                                title=item.get('title', ''),
                                content_type=item.get('content_type', 'brochure'),
                                description=item.get('description', ''),
                                url=url,
                                pdf_base64=pdf_base64 or '',
                                published_date=published_date,
                                is_active=True
                            )
                            created_count += 1

                except Exception as e:
                    print(f"   ⚠️ 保存资料失败: {str(e)}")
                    continue

            print(f"   ✅ 完成！新增 {created_count} 条，更新 {updated_count} 条")

            return {
                'success': True,
                'product_name': product_name,
                'created': created_count,
                'updated': updated_count,
                'total': len(promotions)
            }

        except Exception as e:
            print(f"   ❌ 抓取失败: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def scrape_all_companies(self) -> Dict:
        """
        抓取所有保险公司的新闻

        Returns:
            抓取结果汇总
        """
        from .models import InsuranceCompany

        companies = InsuranceCompany.objects.filter(is_active=True)
        results = []

        print(f"\n{'='*60}")
        print(f"  开始抓取 {companies.count()} 家保险公司的新闻")
        print(f"{'='*60}")

        for company in companies:
            if not company.website_url:
                print(f"\n⚠️  {company.name} 没有配置官网URL，跳过")
                continue

            result = self.scrape_company_news(
                company_id=company.id,
                company_name=company.name,
                company_url=company.website_url
            )

            results.append({
                'company_name': company.name,
                'result': result
            })

        print(f"\n{'='*60}")
        print(f"  抓取完成！")
        print(f"{'='*60}\n")

        return {
            'success': True,
            'results': results
        }


# 延迟创建单例实例（避免导入时初始化）
scraper_service = None

def get_scraper_service():
    """获取爬虫服务单例"""
    global scraper_service
    if scraper_service is None:
        scraper_service = InsuranceScraperService()
    return scraper_service
