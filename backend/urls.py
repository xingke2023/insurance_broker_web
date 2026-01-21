"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from .views import index_view, wechat_verify, serve_frontend_static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    # 微信域名验证
    path('ub10b8eAJx.txt', wechat_verify, name='wechat_verify'),
    # 前端静态文件（图片、SVG等）
    re_path(r'^(?P<path>.*\.(png|jpg|jpeg|gif|svg|webp|ico|txt))$', serve_frontend_static, name='frontend_static'),
]

# 在开发环境中提供媒体文件和静态文件服务
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    # 额外添加 /assets/ 路由，直接指向前端构建的 assets 目录
    urlpatterns += static('/assets/', document_root=settings.ASSETS_ROOT)

# Catch-all 路由：所有非 API/admin 的路由都返回前端的 index.html
# 这样可以支持前端的客户端路由（如 /document/43, /plan-management 等）
urlpatterns += [
    re_path(r'^.*$', index_view, name='index'),
]
