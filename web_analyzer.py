#!/usr/bin/env python3
"""
通用网页智能分析工具（Playwright + Gemini）

使用方法：
# 基础模式（仅DOM提取）
python3 web_analyzer.py --url "https://example.com"

# 智能模式（Gemini分析）
python3 web_analyzer.py --url "https://example.com" --gemini

# 自定义分析要求
python3 web_analyzer.py --url "https://example.com" --gemini --prompt "重点提取技术文档"
"""

import os
import sys
import json
import subprocess
import argparse
from datetime import datetime
from urllib.parse import urlparse


def analyze_webpage(url: str, use_gemini: bool = False, custom_prompt: str = None,
                    use_proxy: bool = False, proxy_server: str = None,
                    proxy_username: str = None, proxy_password: str = None,
                    auto_retry_with_proxy: bool = True) -> dict:
    """
    分析网页内容

    Args:
        url: 目标网页URL
        use_gemini: 是否启用Gemini增强分析
        custom_prompt: 自定义分析提示词
        use_proxy: 是否使用代理
        proxy_server: 代理服务器地址（如：http://host:port）
        proxy_username: 代理用户名
        proxy_password: 代理密码
        auto_retry_with_proxy: 遇到验证时自动使用代理重试（默认True）

    Returns:
        分析结果字典
    """
    print(f"\n🚀 启动网页分析...")
    print(f"   URL: {url}")
    print(f"   模式: {'Gemini智能分析' if use_gemini else 'DOM基础提取'}")
    print(f"   代理: {'✅ 启用' if use_proxy else '❌ 未启用（自动模式）' if auto_retry_with_proxy else '❌ 未启用'}")

    # 生成任务ID
    parsed_url = urlparse(url)
    domain = parsed_url.netloc.replace('.', '-')
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    task_id = f"{domain}_{timestamp}"

    # 检查Playwright脚本
    scraper_script = "/tmp/playwright-web-analyzer.js"
    if not os.path.exists(scraper_script):
        raise FileNotFoundError(f"脚本不存在: {scraper_script}")

    # 准备命令
    playwright_skill_dir = "/home/ubuntu/.claude/skills/playwright-skill"
    cmd = ['node', os.path.join(playwright_skill_dir, 'run.js'), scraper_script]

    # 设置环境变量
    env = os.environ.copy()
    env['TARGET_URL'] = url
    env['TASK_ID'] = task_id
    env['USE_GEMINI'] = 'true' if use_gemini else 'false'
    env['OUTPUT_DIR'] = '/tmp'

    # 代理配置
    if use_proxy:
        env['USE_PROXY'] = 'true'
        if proxy_server:
            env['PROXY_SERVER'] = proxy_server
        if proxy_username:
            env['PROXY_USERNAME'] = proxy_username
        if proxy_password:
            env['PROXY_PASSWORD'] = proxy_password

    if use_gemini:
        gemini_api_key = os.getenv('GEMINI_API_KEY')
        if not gemini_api_key:
            raise ValueError("Gemini模式需要配置环境变量 GEMINI_API_KEY")
        env['GEMINI_API_KEY'] = gemini_api_key
        if custom_prompt:
            env['CUSTOM_PROMPT'] = custom_prompt

    # 执行Playwright
    try:
        result = subprocess.run(
            cmd,
            cwd=playwright_skill_dir,
            env=env,
            capture_output=True,
            text=True,
            timeout=90
        )

        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)

        if result.returncode != 0:
            raise RuntimeError(f"执行失败，返回码: {result.returncode}")

        # 读取结果
        output_file = f"/tmp/web-analysis-{task_id}.json"
        with open(output_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 检查是否遇到验证页面
        if auto_retry_with_proxy and not use_proxy:
            is_verification = (
                data.get('error') in ['微信验证页面', '验证页面', 'verification'] or
                data.get('verification') == True or
                data.get('analysis_method') == 'weixin-article-failed'
            )

            if is_verification and proxy_server:
                print("\n⚠️  检测到验证页面，自动启用代理重试...")
                print("="*60)

                # 使用代理重试
                return analyze_webpage(
                    url=url,
                    use_gemini=use_gemini,
                    custom_prompt=custom_prompt,
                    use_proxy=True,  # 启用代理
                    proxy_server=proxy_server,
                    proxy_username=proxy_username,
                    proxy_password=proxy_password,
                    auto_retry_with_proxy=False  # 避免无限递归
                )

        return data

    except subprocess.TimeoutExpired:
        raise RuntimeError("执行超时（90秒）")


def print_summary(data: dict):
    """打印分析摘要"""
    print("\n" + "="*60)
    print("📊 分析结果")
    print("="*60)
    print(f"URL: {data.get('url')}")
    print(f"模式: {data.get('analysis_method')}")
    print(f"时间: {data.get('analyzed_at')}")

    # 微信文章模式
    if 'weixin_article' in data:
        article = data['weixin_article']
        print(f"\n📰 微信公众号文章")
        print(f"标题: {article.get('title', '未提取')}")
        print(f"作者: {article.get('author', '未提取')}")
        print(f"发布时间: {article.get('publishTime', '未提取')}")
        print(f"正文长度: {article.get('contentLength', 0)} 字符")

        content = article.get('content', '')
        if content:
            preview = content[:150] + '...' if len(content) > 150 else content
            print(f"\n正文预览:\n{preview}")

    # Gemini分析模式
    elif 'gemini_analysis' in data:
        analysis = data['gemini_analysis']
        print(f"\n标题: {analysis.get('page_title', 'N/A')}")
        print(f"描述: {analysis.get('page_description', 'N/A')[:100]}...")

        items = analysis.get('content_items', [])
        print(f"\n内容项: {len(items)} 个")
        important = [i for i in items if i.get('is_important')]
        if important:
            print(f"重点内容: {len(important)} 个")
            for item in important[:5]:  # 只显示前5个
                print(f"  ⭐ {item.get('title')}")

    # DOM链接提取模式
    elif 'dom_links' in data:
        links = data['dom_links']
        print(f"\n提取链接: {len(links)} 个")
        pdf_count = len([l for l in links if l.get('type') == 'pdf'])
        video_count = len([l for l in links if l.get('type') == 'video'])
        article_count = len([l for l in links if l.get('type') == 'article'])
        if pdf_count:
            print(f"  PDF: {pdf_count} 个")
        if video_count:
            print(f"  视频: {video_count} 个")
        if article_count:
            print(f"  文章/新闻: {article_count} 个")

    # 错误模式
    elif 'error' in data:
        print(f"\n❌ 错误: {data.get('error')}")
        if data.get('verification'):
            print("⚠️  遇到微信验证页面，建议:")
            print("   1. 降低访问频率")
            print("   2. 更换IP地址")
            print("   3. 使用微信公众号API")

    print(f"\n输出文件:")
    for k, v in data.get('output_files', {}).items():
        print(f"  {k}: {v}")
    print("="*60 + "\n")


def main():
    parser = argparse.ArgumentParser(description='通用网页智能分析工具')
    parser.add_argument('--url', required=True, help='目标网页URL')
    parser.add_argument('--gemini', action='store_true', help='启用Gemini智能分析')
    parser.add_argument('--prompt', help='自定义分析提示词（配合--gemini使用）')

    # 代理参数
    parser.add_argument('--proxy', action='store_true', help='强制启用代理服务器')
    parser.add_argument('--proxy-server', help='代理服务器地址（如：http://host:port）')
    parser.add_argument('--proxy-user', help='代理用户名')
    parser.add_argument('--proxy-pass', help='代理密码')
    parser.add_argument('--no-auto-proxy', action='store_true', help='禁用遇到验证时自动使用代理')

    args = parser.parse_args()

    try:
        result = analyze_webpage(
            url=args.url,
            use_gemini=args.gemini,
            custom_prompt=args.prompt,
            use_proxy=args.proxy,
            proxy_server=args.proxy_server,
            proxy_username=args.proxy_user,
            proxy_password=args.proxy_pass,
            auto_retry_with_proxy=(not args.no_auto_proxy)  # 默认开启自动代理
        )
        print_summary(result)
        print("✅ 分析完成！")

    except Exception as e:
        print(f"\n❌ 错误: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
