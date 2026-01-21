from django.views.generic import TemplateView
from django.views.decorators.cache import never_cache
from django.http import HttpResponse, FileResponse, Http404
from django.conf import settings
import os
import mimetypes

# 为前端 SPA 提供 index.html
index_view = never_cache(TemplateView.as_view(template_name='index.html'))

# 微信域名验证
def wechat_verify(request):
    """返回微信域名验证文件内容"""
    return HttpResponse('a986bf035c42edc98f14fb0cb58fb9b8', content_type='text/plain')

# 服务前端静态文件（图片、SVG等）
def serve_frontend_static(request, path):
    """
    服务前端构建目录中的静态文件
    """
    file_path = os.path.join(settings.FRONTEND_DIST_ROOT, path)

    # 安全检查：确保文件在允许的目录内
    if not os.path.abspath(file_path).startswith(os.path.abspath(settings.FRONTEND_DIST_ROOT)):
        raise Http404("File not found")

    if os.path.exists(file_path) and os.path.isfile(file_path):
        # 猜测MIME类型
        content_type, _ = mimetypes.guess_type(file_path)
        return FileResponse(open(file_path, 'rb'), content_type=content_type)

    raise Http404("File not found")
