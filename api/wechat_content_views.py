"""
自动选题推送及写作 API
功能：
1. 生成20个港险选题（Gemini AI）
2. 根据选题 AI 写作（Gemini AI）
3. 发布到用户设置的公众号草稿箱（微信公众号 API）
4. 获取/保存用户的公众号配置
"""
import json
import os
import requests
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response


# ── 1. 生成20个港险选题 ──────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_topics(request):
    """
    生成20个港险选题
    请求体：{ "topic_type": "trending" | "viral" | "recommended" | "custom", "custom_hint": "..." }
    """
    topic_type = request.data.get('topic_type', 'viral')
    custom_hint = request.data.get('custom_hint', '').strip()

    type_prompts = {
        'trending': '最新热点类：结合当前财经新闻、香港保险市场动态、汇率走势等时事热点',
        'viral':    '爆款传播类：参考历史10万+文章特征，标题吸引眼球，内容实用落地',
        'recommended': '深度专业类：面向有一定金融知识的读者，重点解析港险产品优势、配置逻辑',
        'custom':   f'自定义方向：{custom_hint}',
    }
    type_desc = type_prompts.get(topic_type, type_prompts['viral'])

    prompt = f"""你是一位专注香港保险领域的公众号内容策划专家。
请为一位香港保险经纪人的公众号，生成20个高质量选题。

选题方向：{type_desc}

要求：
1. 每个选题必须是完整的文章标题（不是关键词），适合直接用作公众号推文标题
2. 标题要抓人眼球，有明确的受众（内地中产、高净值、年轻家庭等）
3. 内容涵盖：储蓄险、重疾险、养老规划、子女教育、资产配置、客户案例等不同维度
4. 部分标题可以用数字、设问、对比等技巧增强吸引力
5. 只返回标题列表，每行一个，不需要编号和其他说明

直接返回20个标题："""

    try:
        from google import genai
        from google.genai import types

        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            return Response({'error': 'AI服务未配置'}, status=500)

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=[types.Content(role='user', parts=[types.Part.from_text(text=prompt)])]
        )

        lines = [l.strip() for l in response.text.strip().split('\n') if l.strip()]
        # 过滤掉可能混入的序号前缀
        topics = []
        for line in lines:
            # 去掉 "1. " "1、" 等序号
            import re
            clean = re.sub(r'^[\d]+[\.、\)）]\s*', '', line).strip()
            if clean:
                topics.append(clean)

        return Response({'success': True, 'topics': topics[:20]})

    except Exception as e:
        return Response({'error': f'生成选题失败：{str(e)}'}, status=500)


# ── 2. AI 写作 ───────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_article(request):
    """
    根据选题生成公众号文章
    请求体：{ "topic": "文章标题", "style": "practical|story|data|qa" }
    """
    topic = request.data.get('topic', '').strip()
    style = request.data.get('style', 'practical')

    if not topic:
        return Response({'error': '请提供文章选题'}, status=400)

    style_desc = {
        'practical': '实用干货风格：结构清晰，多用列表和小标题，重点突出可操作建议',
        'story':     '故事叙述风格：以真实客户案例为主线，情感代入强，结尾引导转化',
        'data':      '数据说话风格：大量引用具体数字、对比数据、图表描述，增强说服力',
        'qa':        '问答科普风格：以"常见问题+专业解答"格式，适合知识科普类内容',
    }.get(style, '实用干货风格')

    prompt = f"""你是一位专注香港保险领域的公众号签约作者，拥有10年保险从业经验。

请为以下选题撰写一篇完整的微信公众号文章：
选题：{topic}
写作风格：{style_desc}

写作要求：
1. 文章长度：1200-1800字（适合公众号阅读）
2. 结构完整：导语（引发共鸣）→ 正文（3-4个小节）→ 结尾（行动号召）
3. 语言亲切自然，避免过于推销感，像朋友分享干货
4. 适当使用加粗、列表，增强可读性（用 Markdown 格式）
5. 包含1-2个真实感强的客户案例或数据（可虚构但要真实可信）
6. 结尾要有明确的行动号召（联系顾问、预约咨询等）
7. 不要出现"AI生成"等字样

请直接输出文章正文（Markdown格式），不需要其他说明："""

    try:
        from google import genai
        from google.genai import types

        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            return Response({'error': 'AI服务未配置'}, status=500)

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=[types.Content(role='user', parts=[types.Part.from_text(text=prompt)])]
        )

        content = response.text.strip()
        word_count = len(content)

        return Response({
            'success': True,
            'title': topic,
            'content': content,
            'word_count': word_count,
        })

    except Exception as e:
        return Response({'error': f'AI写作失败：{str(e)}'}, status=500)


# ── 3. 公众号配置 ────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def wechat_oa_config(request):
    """
    获取或保存用户的公众号配置
    POST 请求体：{ "appid": "...", "appsecret": "..." }
    """
    from django.contrib.auth.models import User

    config_key = f'wechat_oa_config_{request.user.id}'

    if request.method == 'GET':
        config = cache.get(config_key) or {}
        # 不返回 appsecret 明文
        return Response({
            'has_config': bool(config.get('appid')),
            'appid': config.get('appid', ''),
            'appid_preview': config.get('appid', '')[:8] + '****' if config.get('appid') else '',
        })

    # POST：保存配置
    appid = request.data.get('appid', '').strip()
    appsecret = request.data.get('appsecret', '').strip()

    if not appid or not appsecret:
        return Response({'error': '请填写 AppID 和 AppSecret'}, status=400)

    # 验证 AppID/AppSecret 是否有效（尝试获取 access token）
    verify_url = f'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appid}&secret={appsecret}'
    try:
        r = requests.get(verify_url, timeout=10)
        data = r.json()
        if 'errcode' in data:
            return Response({'error': f'公众号配置验证失败：{data.get("errmsg", "unknown error")} (errcode: {data["errcode"]})'}, status=400)

        # 保存到缓存（7天有效期）
        cache.set(config_key, {
            'appid': appid,
            'appsecret': appsecret,
            'access_token': data['access_token'],
            'token_expires': data.get('expires_in', 7200),
        }, 7 * 24 * 3600)

        return Response({'success': True, 'message': '公众号配置保存成功'})

    except requests.RequestException as e:
        return Response({'error': f'网络请求失败：{str(e)}'}, status=500)


def _get_oa_access_token(user_id):
    """获取公众号 access_token（自动刷新）"""
    config_key = f'wechat_oa_config_{user_id}'
    config = cache.get(config_key)

    if not config or not config.get('appid'):
        return None, '未配置公众号，请先在设置中添加公众号 AppID 和 AppSecret'

    # 尝试刷新 token
    appid = config['appid']
    appsecret = config['appsecret']
    url = f'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appid}&secret={appsecret}'

    try:
        r = requests.get(url, timeout=10)
        data = r.json()
        if 'access_token' not in data:
            return None, f'获取公众号 Token 失败：{data.get("errmsg", "unknown")}'
        return data['access_token'], None
    except Exception as e:
        return None, f'网络错误：{str(e)}'


# ── 4. 发布到公众号草稿箱 ────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def publish_draft(request):
    """
    发布文章到微信公众号草稿箱
    请求体：{
      "title": "文章标题",
      "content": "HTML或Markdown内容",
      "cover_image_url": "封面图URL（可选）",
      "digest": "文章摘要（可选，最多120字）"
    }
    """
    title = request.data.get('title', '').strip()
    content = request.data.get('content', '').strip()
    cover_image_url = request.data.get('cover_image_url', '').strip()
    digest = request.data.get('digest', '').strip()

    if not title or not content:
        return Response({'error': '标题和内容不能为空'}, status=400)

    # 获取 access_token
    access_token, err = _get_oa_access_token(request.user.id)
    if err:
        return Response({'error': err}, status=400)

    # Markdown 转 HTML
    html_content = _markdown_to_wechat_html(content)

    # 处理封面图（如果提供了URL，先上传到微信素材库）
    thumb_media_id = ''
    if cover_image_url:
        thumb_media_id, upload_err = _upload_cover_image(access_token, cover_image_url)
        if upload_err:
            # 封面图上传失败不阻断，继续发布
            thumb_media_id = ''

    # 构建草稿
    article = {
        'title': title,
        'content': html_content,
        'digest': digest[:120] if digest else title[:60],
        'content_source_url': '',
        'author': '',
        'need_open_comment': 0,
        'only_fans_can_comment': 0,
    }
    if thumb_media_id:
        article['thumb_media_id'] = thumb_media_id

    draft_url = f'https://api.weixin.qq.com/cgi-bin/draft/add?access_token={access_token}'
    payload = {'articles': [article]}

    try:
        r = requests.post(draft_url, json=payload, timeout=15)
        data = r.json()

        if data.get('errcode', 0) != 0:
            return Response({'error': f'发布草稿失败：{data.get("errmsg", "unknown")} (errcode: {data.get("errcode")})'}, status=400)

        return Response({
            'success': True,
            'media_id': data.get('media_id', ''),
            'message': '文章已成功推送到公众号草稿箱！请前往公众号后台审核发布。',
        })

    except requests.RequestException as e:
        return Response({'error': f'网络请求失败：{str(e)}'}, status=500)


def _markdown_to_wechat_html(md_text):
    """将 Markdown 转换为适合微信公众号的 HTML"""
    import re

    html = md_text

    # 标题
    html = re.sub(r'^### (.+)$', r'<h3 style="font-size:17px;font-weight:bold;margin:20px 0 10px;color:#1a1a1a;">\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2 style="font-size:19px;font-weight:bold;margin:24px 0 12px;color:#1a1a1a;">\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.+)$', r'<h1 style="font-size:22px;font-weight:bold;margin:24px 0 14px;color:#1a1a1a;">\1</h1>', html, flags=re.MULTILINE)

    # 加粗
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)

    # 斜体
    html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)

    # 引用
    html = re.sub(r'^> (.+)$', r'<blockquote style="border-left:4px solid #1677ff;padding:10px 16px;background:#f0f7ff;margin:12px 0;color:#444;">\1</blockquote>', html, flags=re.MULTILINE)

    # 无序列表
    html = re.sub(r'^[-*] (.+)$', r'<li style="margin:6px 0;">\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'(<li[^>]*>.*</li>\n?)+', r'<ul style="padding-left:20px;margin:10px 0;">\g<0></ul>', html)

    # 有序列表
    html = re.sub(r'^\d+\. (.+)$', r'<li style="margin:6px 0;">\1</li>', html, flags=re.MULTILINE)

    # 水平线
    html = re.sub(r'^---$', r'<hr style="border:none;border-top:1px solid #eee;margin:20px 0;">', html, flags=re.MULTILINE)

    # 段落换行
    paragraphs = html.split('\n\n')
    result = []
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        if p.startswith('<h') or p.startswith('<ul') or p.startswith('<blockquote') or p.startswith('<hr'):
            result.append(p)
        else:
            p = p.replace('\n', '<br>')
            result.append(f'<p style="margin:12px 0;line-height:1.8;color:#333;font-size:15px;">{p}</p>')

    return '\n'.join(result)


def _upload_cover_image(access_token, image_url):
    """下载图片并上传到微信素材库，返回 media_id"""
    try:
        # 下载图片
        r = requests.get(image_url, timeout=10)
        if r.status_code != 200:
            return '', '封面图下载失败'

        content_type = r.headers.get('content-type', 'image/jpeg')
        ext = 'jpg' if 'jpeg' in content_type else content_type.split('/')[-1]

        upload_url = f'https://api.weixin.qq.com/cgi-bin/media/upload?access_token={access_token}&type=thumb'
        files = {'media': (f'cover.{ext}', r.content, content_type)}
        resp = requests.post(upload_url, files=files, timeout=15)
        data = resp.json()

        if 'thumb_media_id' in data:
            return data['thumb_media_id'], None
        return '', data.get('errmsg', '上传失败')

    except Exception as e:
        return '', str(e)
