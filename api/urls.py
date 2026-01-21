from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import InsurancePolicyViewSet
from .auth_views import register, login, user_profile, wechat_login, generate_miniprogram_scheme, wechat_web_auth, wechat_update_profile, wechat_upload_avatar, get_page_permissions
from .ocr_views import save_ocr_result, get_saved_documents, get_pending_documents, get_document_detail, analyze_document_table, analyze_basic_info, delete_documents, chat_with_document, extract_summary, get_processing_status, ocr_webhook, create_pending_document, retry_failed_document, upload_pdf_async, get_table_detail, reextract_tablecontent, reanalyze_tables, re_ocr_document, reextract_table1
from .payment_views_v3 import create_payment_order_v3, payment_notify_v3, create_jsapi_payment, get_membership_plans
from .plan_views import get_membership_status
from .content_editor_views import process_user_request, update_tablesummary, update_surrender_value_table, update_wellness_table, update_plan_summary
from .content_creator_views import extract_subtitle, generate_content_with_context
from .ip_image_views import generate_ip_image, generate_ip_image_v2, get_saved_ip_image, save_ip_image, generate_content_image, get_gemini_usage_stats
from .media_library_views import get_media_library, get_media_detail, toggle_favorite, delete_media, batch_delete_media, get_media_stats, upload_media
from .video_generator_views import (
    generate_scene_prompts, create_video,
    get_video_projects, get_video_project_detail,
    create_video_project, update_video_project, delete_video_project,
    video_completion_callback, video_proxy_download
)
from .tts_views import get_voices, synthesize_speech, download_audio
from .personal_voice_views import get_personal_voices, create_personal_voice, synthesize_with_personal_voice, delete_personal_voice
from .pdf_views import remove_pdf_footer, crop_pdf_footer
from .poster_views import analyze_poster_view, get_analysis_templates
from .axa_benefit_views import analyze_axa_benefit, calculate_withdrawal
from .insurance_company_views import get_insurance_companies, get_company_requests, get_request_detail, get_company_request_by_name, execute_api_request, get_companies_standard_comparison
from .stripe_views import create_checkout_session, stripe_webhook, check_membership_status
from .product_settings_views import get_all_products, manage_user_product_settings
from .consultation_views import get_ai_consultation, get_customer_cases
from .ai_consultant_views import ai_consult_view, get_recommended_products, get_consultation_stats
from .customer_case_views import (
    get_customer_cases as get_all_customer_cases,
    get_customer_case_detail,
    get_cases_by_stage,
    get_life_stages,
    get_case_statistics
)
# 计划书提取功能已删除
# from .plan_views import (
#     upload_plan_document, get_plan_documents, get_plan_document,
#     update_plan_document, get_insurance_companies
# )
# from .streaming_views import upload_plan_document_streaming

router = DefaultRouter()
router.register(r'policies', InsurancePolicyViewSet, basename='policy')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('auth/profile/', user_profile, name='user-profile'),
    path('auth/page-permissions/', get_page_permissions, name='page-permissions'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # 微信小程序登录
    path('login/wechat', wechat_login, name='wechat-login'),
    path('login/wechat-web', wechat_web_auth, name='wechat-web-auth'),
    path('wechat/generate-scheme', generate_miniprogram_scheme, name='generate-miniprogram-scheme'),
    path('wechat/update-profile', wechat_update_profile, name='wechat-update-profile'),
    path('wechat/upload-avatar', wechat_upload_avatar, name='wechat-upload-avatar'),

    # 支付相关API (V3版本)
    path('payment/create', create_payment_order_v3, name='create-payment-order'),
    path('payment/create-jsapi', create_jsapi_payment, name='create-jsapi-payment'),
    path('payment/notify', payment_notify_v3, name='payment-notify'),
    path('payment/plans', get_membership_plans, name='get-membership-plans'),

    # 会员相关API
    path('membership/status', get_membership_status, name='membership-status'),
    path('membership/check', check_membership_status, name='check-membership-status'),

    # Stripe支付相关API
    path('stripe/create-checkout-session', create_checkout_session, name='create-checkout-session'),
    path('stripe/webhook', stripe_webhook, name='stripe-webhook'),

    # OCR结果保存API
    path('ocr/upload-async/', upload_pdf_async, name='upload-pdf-async'),  # 异步上传PDF进行OCR
    path('ocr/save/', save_ocr_result, name='save-ocr-result'),
    path('ocr/webhook/', ocr_webhook, name='ocr-webhook'),  # OCR完成回调接口
    path('ocr/documents/create-pending/', create_pending_document, name='create-pending-document'),  # 创建待处理文档
    path('ocr/documents/pending/', get_pending_documents, name='get-pending-documents'),  # 获取未完成文档
    path('ocr/documents/', get_saved_documents, name='get-saved-documents'),
    path('ocr/documents/<int:document_id>/', get_document_detail, name='get-document-detail'),
    path('ocr/documents/<int:document_id>/analyze/', analyze_document_table, name='analyze-document-table'),
    path('ocr/documents/<int:document_id>/basic-info/', analyze_basic_info, name='analyze-basic-info'),
    # 已删除: extract-basic-info（手动触发已移除）
    path('ocr/documents/<int:document_id>/summary/', extract_summary, name='extract-summary'),
    # 已删除: extract-summary（手动触发已移除）
    path('ocr/documents/<int:document_id>/status/', get_processing_status, name='get-processing-status'),
    path('ocr/documents/<int:document_id>/chat/', chat_with_document, name='chat-with-document'),
    path('ocr/documents/<int:document_id>/retry/', retry_failed_document, name='retry-failed-document'),  # 手动重试失败任务
    path('ocr/documents/<int:document_id>/re-ocr/', re_ocr_document, name='re-ocr-document'),  # 重新OCR识别
    path('ocr/documents/<int:document_id>/reextract-tablecontent/', reextract_tablecontent, name='reextract-tablecontent'),  # 重新提取表格源代码
    path('ocr/documents/<int:document_id>/reanalyze-tables/', reanalyze_tables, name='reanalyze-tables'),  # 重新分析表格
    path('ocr/documents/<int:document_id>/reextract-table1/', reextract_table1, name='reextract-table1'),  # 重新提取保单价值表
    path('ocr/documents/delete/', delete_documents, name='delete-documents'),
    path('ocr/tables/<int:table_id>/', get_table_detail, name='get-table-detail'),  # 获取单个表格详情

    # 内容编辑器API
    path('content-editor/<int:document_id>/process/', process_user_request, name='process-user-request'),
    path('content-editor/<int:document_id>/update-tablesummary/', update_tablesummary, name='update-tablesummary'),
    path('content-editor/<int:document_id>/update-surrender-value/', update_surrender_value_table, name='update-surrender-value'),
    path('content-editor/<int:document_id>/update-wellness-table/', update_wellness_table, name='update-wellness-table'),
    path('content-editor/<int:document_id>/update-plan-summary/', update_plan_summary, name='update-plan-summary'),

    # 内容创作API
    path('content/extract-subtitle', extract_subtitle, name='extract-subtitle'),
    path('content/generate-with-context', generate_content_with_context, name='generate-with-context'),

    # IP形象生成API
    path('ip-image/generate', generate_ip_image, name='generate-ip-image'),
    path('ip-image/generate-v2', generate_ip_image_v2, name='generate-ip-image-v2'),
    path('ip-image/saved', get_saved_ip_image, name='get-saved-ip-image'),
    path('ip-image/save', save_ip_image, name='save-ip-image'),

    # 文案配图生成API
    path('content-image/generate', generate_content_image, name='generate-content-image'),

    # Gemini使用统计API
    path('gemini/usage-stats', get_gemini_usage_stats, name='gemini-usage-stats'),

    # 素材库管理API
    path('media-library/', get_media_library, name='get-media-library'),
    path('media-library/upload/', upload_media, name='upload-media'),
    path('media-library/stats/', get_media_stats, name='get-media-stats'),
    path('media-library/<int:media_id>/', get_media_detail, name='get-media-detail'),
    path('media-library/<int:media_id>/favorite/', toggle_favorite, name='toggle-favorite'),
    path('media-library/<int:media_id>/delete/', delete_media, name='delete-media'),
    path('media-library/batch-delete/', batch_delete_media, name='batch-delete-media'),

    # 视频生成器API
    path('video/generate-prompts/', generate_scene_prompts, name='generate-scene-prompts'),
    path('video/create/', create_video, name='create-video'),
    path('video/callback/', video_completion_callback, name='video-completion-callback'),
    path('video/download', video_proxy_download, name='video-proxy-download'),  # 视频下载代理

    # 视频项目管理API
    path('video/projects/', get_video_projects, name='get-video-projects'),
    path('video/projects/create/', create_video_project, name='create-video-project'),
    path('video/projects/<int:project_id>/', get_video_project_detail, name='get-video-project-detail'),
    path('video/projects/<int:project_id>/update/', update_video_project, name='update-video-project'),
    path('video/projects/<int:project_id>/delete/', delete_video_project, name='delete-video-project'),

    # 语音合成API
    path('tts/voices/', get_voices, name='get-voices'),
    path('tts/synthesize/', synthesize_speech, name='synthesize-speech'),
    path('tts/download/<str:filename>/', download_audio, name='download-audio'),

    # 个人语音API
    path('personal-voice/', get_personal_voices, name='get-personal-voices'),
    path('personal-voice/create/', create_personal_voice, name='create-personal-voice'),
    path('personal-voice/synthesize/', synthesize_with_personal_voice, name='synthesize-with-personal-voice'),
    path('personal-voice/<str:voice_id>/delete/', delete_personal_voice, name='delete-personal-voice'),

    # PDF处理API
    path('pdf/remove-footer', remove_pdf_footer, name='remove-pdf-footer'),
    path('pdf/crop-footer', crop_pdf_footer, name='crop-pdf-footer'),

    # 海报分析API
    path('poster/analyze', analyze_poster_view, name='analyze-poster'),
    path('poster/templates', get_analysis_templates, name='get-analysis-templates'),

    # 安盛利益表分析API
    path('axa/benefit/analyze', analyze_axa_benefit, name='analyze-axa-benefit'),
    path('axa/withdrawal/calculate', calculate_withdrawal, name='calculate-withdrawal'),

    # 保险公司和请求配置API
    path('insurance-companies/', get_insurance_companies, name='get-insurance-companies'),
    path('insurance-companies/standard-comparison/', get_companies_standard_comparison, name='get-companies-standard-comparison'),
    path('insurance-companies/<str:company_code>/requests/', get_company_requests, name='get-company-requests'),
    path('insurance-companies/<str:company_code>/requests/<str:request_name>/', get_company_request_by_name, name='get-company-request-by-name'),
    path('insurance-companies/<str:company_code>/requests/<str:request_name>/execute', execute_api_request, name='execute-api-request'),
    path('insurance-requests/<int:request_id>/', get_request_detail, name='get-request-detail'),

    # 产品对比设置API
    path('company-comparison/products', get_all_products, name='get-all-products'),
    path('user/product-comparison-settings', manage_user_product_settings, name='manage-user-product-settings'),

    # AI智能咨询API（基础版）
    path('consultation/ai-recommend', get_ai_consultation, name='get-ai-consultation'),
    path('consultation/customer-cases', get_customer_cases, name='get-customer-cases'),

    # AI智能顾问API（高级版 - 带详细评分）
    path('ai-consultant/consult', ai_consult_view, name='ai-consult'),
    path('ai-consultant/products', get_recommended_products, name='get-recommended-products'),
    path('ai-consultant/stats', get_consultation_stats, name='get-consultation-stats'),

    # 客户案例API
    path('customer-cases/', get_all_customer_cases, name='get-customer-cases'),
    path('customer-cases/<int:case_id>/', get_customer_case_detail, name='get-customer-case-detail'),
    path('customer-cases/by-stage/<str:stage>/', get_cases_by_stage, name='get-cases-by-stage'),
    path('customer-cases/life-stages/', get_life_stages, name='get-life-stages'),
    path('customer-cases/statistics/', get_case_statistics, name='get-case-statistics'),

    # 计划书提取功能路由已删除
    # path('insurance-companies/', get_insurance_companies, name='insurance-companies'),
    # path('plans/upload/', upload_plan_document, name='upload-plan'),
    # path('plans/upload-stream/', upload_plan_document_streaming, name='upload-plan-stream'),
    # path('plans/', get_plan_documents, name='plan-list'),
    # path('plans/<int:pk>/', get_plan_document, name='plan-detail'),
    # path('plans/<int:pk>/update/', update_plan_document, name='plan-update'),
]
