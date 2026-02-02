"""
使用 Playwright 实际访问 Google 搜索查找保险公司和产品URL
通过真实浏览器自动化来获取准确的搜索结果
"""
import os
import re
import time
from typing import Optional, List, Dict
from playwright.sync_api import sync_playwright, Page, Browser
from urllib.parse import quote_plus


class PlaywrightScraperService:
    """Playwright爬虫服务 - 使用真实浏览器搜索"""

    def __init__(self, headless: bool = True):
        """
        初始化Playwright爬虫

        Args:
            headless: 是否使用无头模式（True=后台运行，False=显示浏览器）
        """
        self.headless = headless
        self.playwright = None
        self.browser = None

    def __enter__(self):
        """上下文管理器：启动浏览器"""
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(
            headless=self.headless,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器：关闭浏览器"""
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()

    def bing_search(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        """
        使用 Bing 搜索并返回结果（替代Google）

        Args:
            query: 搜索关键词
            max_results: 最多返回几个结果

        Returns:
            搜索结果列表
        """
        try:
            print(f"   → Bing 搜索: {query}")

            page = self.browser.new_page()
            page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })

            # Bing搜索URL
            search_url = f"https://www.bing.com/search?q={quote_plus(query)}"
            page.goto(search_url, wait_until='domcontentloaded', timeout=30000)

            time.sleep(2)  # 等待加载

            results = []

            # Bing的搜索结果选择器
            search_items = page.query_selector_all('li.b_algo')

            for item in search_items[:max_results]:
                try:
                    # 提取链接
                    link_elem = item.query_selector('h2 a')
                    if not link_elem:
                        continue

                    url = link_elem.get_attribute('href')
                    if not url or not url.startswith('http'):
                        continue

                    # Debug: 打印原始URL
                    print(f"   🔍 原始URL: {url[:200]}...")

                    # 解包 Bing 重定向URL
                    if 'bing.com/ck/a' in url:
                        import re
                        import urllib.parse
                        import base64
                        match = re.search(r'&u=a1([^&]+)', url)
                        if match:
                            encoded_url = match.group(1)
                            try:
                                # Bing使用Base64编码URL
                                decoded = base64.b64decode(encoded_url).decode('utf-8')
                                if decoded.startswith('http'):
                                    url = decoded
                            except:
                                # 如果不是Base64，尝试URL解码
                                try:
                                    real_url = urllib.parse.unquote(encoded_url)
                                    if real_url.startswith('http'):
                                        url = real_url
                                except:
                                    pass  # 保留原URL

                    # 提取标题
                    title = link_elem.inner_text()

                    # 提取描述
                    desc_elem = item.query_selector('div.b_caption p')
                    description = desc_elem.inner_text() if desc_elem else ''

                    results.append({
                        'title': title,
                        'url': url,
                        'description': description
                    })

                except Exception as e:
                    continue

            page.close()

            print(f"   ✅ 找到 {len(results)} 个结果")
            return results

        except Exception as e:
            print(f"   ❌ 搜索失败: {str(e)}")
            return []

    def google_search(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        """
        使用 Google 搜索并返回结果

        Args:
            query: 搜索关键词
            max_results: 最多返回几个结果

        Returns:
            搜索结果列表 [{'title': '', 'url': '', 'description': ''}]
        """
        try:
            print(f"   → Google 搜索: {query}")

            # 创建新页面
            page = self.browser.new_page()

            # 设置User-Agent
            page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            })

            # 访问Google搜索
            search_url = f"https://www.google.com/search?q={quote_plus(query)}&hl=zh-CN"

            try:
                page.goto(search_url, wait_until='domcontentloaded', timeout=30000)

                # 等待页面加载（尝试多个可能的选择器）
                try:
                    page.wait_for_selector('div#search, div#rso, div.g', timeout=10000)
                except:
                    # 可能遇到验证页面，等待一下
                    time.sleep(2)

            except Exception as e:
                print(f"   ⚠️ 页面加载警告: {str(e)}")
                # 继续尝试提取结果

            # 提取搜索结果
            results = []

            # 等待一下确保内容加载
            time.sleep(1)

            # 获取所有搜索结果项（尝试多种选择器）
            search_items = page.query_selector_all('div.g')

            # 如果找不到，尝试其他选择器
            if not search_items:
                search_items = page.query_selector_all('div[data-sokoban-container]')

            if not search_items:
                print(f"   ⚠️ 未找到搜索结果元素，尝试保存页面截图调试...")
                page.screenshot(path='/tmp/google_search_debug.png')
                print(f"   💾 截图已保存: /tmp/google_search_debug.png")

            for item in search_items[:max_results]:
                try:
                    # 提取标题和链接
                    link_elem = item.query_selector('a[href]')
                    if not link_elem:
                        continue

                    url = link_elem.get_attribute('href')
                    if not url or not url.startswith('http'):
                        continue

                    # 提取标题
                    title_elem = item.query_selector('h3')
                    title = title_elem.inner_text() if title_elem else ''

                    # 提取描述
                    desc_elem = item.query_selector('div.VwiC3b')
                    description = desc_elem.inner_text() if desc_elem else ''

                    results.append({
                        'title': title,
                        'url': url,
                        'description': description
                    })

                except Exception as e:
                    print(f"   ⚠️ 提取结果失败: {str(e)}")
                    continue

            page.close()

            print(f"   ✅ 找到 {len(results)} 个结果")
            return results

        except Exception as e:
            print(f"   ❌ 搜索失败: {str(e)}")
            return []

    def search_company_url(self, company_name: str, company_name_en: str = '') -> Optional[str]:
        """
        搜索保险公司官网URL

        Args:
            company_name: 公司中文名
            company_name_en: 公司英文名

        Returns:
            公司官网URL
        """
        try:
            # 构建搜索查询
            query = f"{company_name} {company_name_en} 香港 保险 官网".strip()

            # 执行Google搜索
            results = self.bing_search(query, max_results=5)

            if not results:
                return None

            # 分析搜索结果，找到最可能的官网
            for result in results:
                url = result['url']
                title = result['title'].lower()

                # 过滤条件
                # 1. 必须是https
                if not url.startswith('https://'):
                    continue

                # 2. 优先.hk域名（香港网站）
                if '.hk' not in url:
                    continue

                # 3. 排除明显的非官网链接
                excluded_keywords = ['facebook', 'linkedin', 'youtube', 'wikipedia',
                                    'wiki', 'blog', 'forum', 'review', 'news']
                if any(keyword in url.lower() for keyword in excluded_keywords):
                    continue

                # 4. 标题中包含公司名
                if company_name in title or (company_name_en and company_name_en.lower() in title):
                    print(f"   ✅ 找到官网: {url}")
                    print(f"      标题: {result['title']}")
                    return url

            # 如果没有找到理想结果，返回第一个.hk域名
            for result in results:
                url = result['url']
                if url.startswith('https://') and '.hk' in url:
                    print(f"   ℹ️  可能的官网: {url}")
                    return url

            print(f"   ❌ 未找到合适的官网URL")
            return None

        except Exception as e:
            print(f"   ❌ 搜索失败: {str(e)}")
            return None

    def search_product_url(self, company_name: str, product_name: str) -> Optional[str]:
        """
        搜索产品页面URL

        Args:
            company_name: 公司名称
            product_name: 产品名称

        Returns:
            产品页面URL
        """
        try:
            # 构建搜索查询
            query = f"{company_name} {product_name} 香港 保险 官网"

            # 执行Google搜索
            results = self.bing_search(query, max_results=5)

            if not results:
                return None

            # 分析搜索结果
            for result in results:
                url = result['url']
                title = result['title'].lower()

                # 过滤条件
                if not url.startswith('https://'):
                    continue

                # 排除非产品页面
                excluded_keywords = ['facebook', 'linkedin', 'youtube', 'blog',
                                    'news', 'forum', 'wikipedia']
                if any(keyword in url.lower() for keyword in excluded_keywords):
                    continue

                # 标题中包含产品名
                if product_name in title or any(word in title for word in product_name.split()):
                    print(f"   ✅ 找到产品页: {url}")
                    print(f"      标题: {result['title']}")
                    return url

            # 返回第一个结果
            if results:
                url = results[0]['url']
                print(f"   ℹ️  可能的产品页: {url}")
                return url

            print(f"   ❌ 未找到产品URL")
            return None

        except Exception as e:
            print(f"   ❌ 搜索失败: {str(e)}")
            return None

    def verify_url(self, url: str) -> bool:
        """
        验证URL是否可访问

        Args:
            url: 要验证的URL

        Returns:
            是否可访问
        """
        try:
            page = self.browser.new_page()
            response = page.goto(url, wait_until='domcontentloaded', timeout=15000)
            page.close()

            return response.status == 200

        except Exception as e:
            print(f"   ⚠️ URL验证失败: {str(e)}")
            return False

    def extract_product_links_from_page(self, url: str, company_name: str) -> List[Dict[str, str]]:
        """
        从产品列表页面提取所有产品链接

        Args:
            url: 产品列表页面URL
            company_name: 公司名称（用于过滤）

        Returns:
            产品链接列表 [{'name': '', 'url': ''}]
        """
        try:
            print(f"   → 分析页面: {url}")

            page = self.browser.new_page()
            page.goto(url, wait_until='networkidle', timeout=30000)

            # 提取所有链接
            links = page.query_selector_all('a[href]')

            product_links = []
            seen_urls = set()

            for link in links:
                try:
                    href = link.get_attribute('href')
                    text = link.inner_text().strip()

                    if not href or not text or len(text) < 2:
                        continue

                    # 转换为绝对URL
                    if href.startswith('/'):
                        base_url = '/'.join(url.split('/')[:3])
                        href = base_url + href
                    elif not href.startswith('http'):
                        continue

                    # 去重
                    if href in seen_urls:
                        continue

                    # 过滤明显的非产品链接
                    excluded_keywords = ['contact', 'about', 'login', 'logout',
                                        'search', 'faq', 'news', 'blog']
                    if any(keyword in href.lower() for keyword in excluded_keywords):
                        continue

                    # 过滤导航链接
                    if len(text) > 50 or '\n' in text:
                        continue

                    product_links.append({
                        'name': text,
                        'url': href
                    })

                    seen_urls.add(href)

                except Exception as e:
                    continue

            page.close()

            print(f"   ✅ 找到 {len(product_links)} 个链接")
            return product_links

        except Exception as e:
            print(f"   ❌ 页面分析失败: {str(e)}")
            return []


def search_company_url_with_playwright(company_name: str, company_name_en: str = '',
                                       headless: bool = True) -> Optional[str]:
    """
    使用 Playwright 搜索公司官网URL（便捷函数）

    Args:
        company_name: 公司中文名
        company_name_en: 公司英文名
        headless: 是否无头模式

    Returns:
        公司官网URL
    """
    with PlaywrightScraperService(headless=headless) as scraper:
        return scraper.search_company_url(company_name, company_name_en)


def search_product_url_with_playwright(company_name: str, product_name: str,
                                       headless: bool = True) -> Optional[str]:
    """
    使用 Playwright 搜索产品URL（便捷函数）

    Args:
        company_name: 公司名称
        product_name: 产品名称
        headless: 是否无头模式

    Returns:
        产品页面URL
    """
    with PlaywrightScraperService(headless=headless) as scraper:
        return scraper.search_product_url(company_name, product_name)
