"""
港险营销话术 API
"""
import json
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import SalesScriptCategory, SalesScript, SalesScriptFavorite


# ===== 分类列表 =====

@api_view(['GET'])
@permission_classes([AllowAny])
def get_categories(request):
    """获取所有话术场景分类"""
    categories = SalesScriptCategory.objects.filter(is_active=True)
    data = []
    for cat in categories:
        data.append({
            'id': cat.id,
            'name': cat.name,
            'icon': cat.icon,
            'description': cat.description,
            'sort_order': cat.sort_order,
            'script_count': cat.scripts.filter(is_active=True).count(),
        })
    return Response(data)


# ===== 话术列表 =====

@api_view(['GET'])
@permission_classes([AllowAny])
def get_scripts(request):
    """
    获取话术列表
    支持参数：
      category_id  - 按场景分类筛选
      product_type - 按适用产品筛选
      customer_type - 按适用客群筛选
      featured     - 只看精选（?featured=1）
      search       - 关键词搜索
    """
    qs = SalesScript.objects.filter(is_active=True).select_related('category')

    category_id = request.GET.get('category_id')
    if category_id:
        qs = qs.filter(category_id=category_id)

    product_type = request.GET.get('product_type')
    if product_type and product_type != 'all':
        qs = qs.filter(Q(applicable_product_type=product_type) | Q(applicable_product_type='all'))

    customer_type = request.GET.get('customer_type')
    if customer_type and customer_type != 'all':
        qs = qs.filter(Q(applicable_customer_type=customer_type) | Q(applicable_customer_type='all'))

    if request.GET.get('featured') == '1':
        qs = qs.filter(is_featured=True)

    search = request.GET.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(title__icontains=search) |
            Q(customer_question__icontains=search) |
            Q(script_content__icontains=search)
        )

    # 获取当前用户的收藏ID列表
    favorited_ids = set()
    if request.user.is_authenticated:
        favorited_ids = set(
            SalesScriptFavorite.objects.filter(user=request.user)
            .values_list('script_id', flat=True)
        )

    data = []
    for s in qs:
        data.append({
            'id': s.id,
            'category_id': s.category_id,
            'category_name': s.category.name,
            'category_icon': s.category.icon,
            'title': s.title,
            'customer_question': s.customer_question,
            'script_content': s.script_content,
            'follow_up_question': s.follow_up_question,
            'key_points': s.key_points,
            'applicable_product_type': s.applicable_product_type,
            'applicable_customer_type': s.applicable_customer_type,
            'is_featured': s.is_featured,
            'view_count': s.view_count,
            'copy_count': s.copy_count,
            'is_favorited': s.id in favorited_ids,
        })

    return Response(data)


# ===== 记录查看 & 复制次数 =====

@api_view(['POST'])
@permission_classes([AllowAny])
def record_view(request, script_id):
    """记录话术被查看"""
    try:
        script = SalesScript.objects.get(id=script_id, is_active=True)
        script.view_count += 1
        script.save(update_fields=['view_count'])
        return Response({'success': True})
    except SalesScript.DoesNotExist:
        return Response({'error': '话术不存在'}, status=404)


@api_view(['POST'])
@permission_classes([AllowAny])
def record_copy(request, script_id):
    """记录话术被复制"""
    try:
        script = SalesScript.objects.get(id=script_id, is_active=True)
        script.copy_count += 1
        script.save(update_fields=['copy_count'])
        return Response({'success': True})
    except SalesScript.DoesNotExist:
        return Response({'error': '话术不存在'}, status=404)


# ===== 收藏 =====

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_favorite(request, script_id):
    """收藏 / 取消收藏话术"""
    try:
        script = SalesScript.objects.get(id=script_id, is_active=True)
    except SalesScript.DoesNotExist:
        return Response({'error': '话术不存在'}, status=404)

    fav, created = SalesScriptFavorite.objects.get_or_create(
        user=request.user,
        script=script,
        defaults={'note': ''}
    )
    if not created:
        fav.delete()
        return Response({'is_favorited': False, 'message': '已取消收藏'})

    return Response({'is_favorited': True, 'message': '已收藏'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_favorites(request):
    """获取当前用户的收藏话术"""
    favs = SalesScriptFavorite.objects.filter(user=request.user).select_related('script__category')
    data = []
    for fav in favs:
        s = fav.script
        data.append({
            'id': s.id,
            'category_name': s.category.name,
            'category_icon': s.category.icon,
            'title': s.title,
            'customer_question': s.customer_question,
            'script_content': s.script_content,
            'follow_up_question': s.follow_up_question,
            'key_points': s.key_points,
            'note': fav.note,
            'is_favorited': True,
            'favorited_at': fav.created_at.strftime('%Y-%m-%d'),
        })
    return Response(data)


# ===== AI 生成个性化话术 =====

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_generate_script(request):
    """
    根据客户情况，用 Gemini 生成个性化话术
    请求体：{ "customer_description": "客户35岁，担心港险不安全，有两个孩子" }
    """
    customer_description = request.data.get('customer_description', '').strip()
    if not customer_description:
        return Response({'error': '请描述客户情况'}, status=400)

    if len(customer_description) > 500:
        return Response({'error': '描述不能超过500字'}, status=400)

    try:
        import os
        from google import genai
        from google.genai import types

        api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('THIRD_PARTY_GEMINI_API_KEY')
        base_url = os.environ.get('GEMINI_BASE_URL', '')

        if not api_key:
            return Response({'error': 'AI服务未配置'}, status=500)

        client_kwargs = {'api_key': api_key}
        if base_url:
            client_kwargs['http_options'] = {'base_url': base_url}
        client = genai.Client(**client_kwargs)

        prompt = f"""你是一位香港保险销售专家，帮助经纪人与客户沟通。

客户情况：{customer_description}

请根据这位客户的具体情况，生成一段专业、自然、有说服力的营销话术。

要求：
1. 话术要针对客户的具体顾虑或需求，不要泛泛而谈
2. 语气亲切自然，像朋友间对话，不要过于推销感
3. 包含1-2个具体数字或案例增强说服力
4. 最后给出1个跟进问题引导客户深入
5. 话术长度200-400字

请按以下格式返回：

【推荐话术】
（正文话术内容）

【跟进问题】
（一个引导性问题）

【话术要点】
（3-5个要点，用逗号分隔）"""

        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=[types.Content(role='user', parts=[types.Part.from_text(text=prompt)])]
        )

        result_text = response.text.strip()

        # 解析返回内容
        script_content = ''
        follow_up = ''
        key_points = []

        lines = result_text.split('\n')
        current_section = None
        for line in lines:
            line = line.strip()
            if '【推荐话术】' in line:
                current_section = 'script'
            elif '【跟进问题】' in line:
                current_section = 'followup'
            elif '【话术要点】' in line:
                current_section = 'points'
            elif line and current_section == 'script':
                script_content += line + '\n'
            elif line and current_section == 'followup':
                follow_up += line + '\n'
            elif line and current_section == 'points':
                key_points = [p.strip() for p in line.replace('、', ',').split(',') if p.strip()]

        return Response({
            'success': True,
            'customer_description': customer_description,
            'script_content': script_content.strip(),
            'follow_up_question': follow_up.strip(),
            'key_points': key_points,
            'raw': result_text,
        })

    except Exception as e:
        return Response({'error': f'AI生成失败：{str(e)}'}, status=500)
