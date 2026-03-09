"""
字节跳动 OmniHuman 数字人视频生成 Views
使用火山引擎 AKSK 签名，服务: visual.volcengineapi.com
"""
import os
import json
import hmac
import hashlib
import datetime
import time
import uuid
import logging
import requests
import urllib.parse
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

BYTEDANCE_ACCESS_KEY = os.getenv('BYTEDANCE_ACCESS_KEY', '')
BYTEDANCE_SECRET_KEY = os.getenv('BYTEDANCE_SECRET_KEY', '')

# visual API 常量
VISUAL_API_HOST = "visual.volcengineapi.com"
VISUAL_REGION = "cn-north-1"
VISUAL_SERVICE = "cv"
VISUAL_VERSION = "2022-08-31"
VISUAL_CONTENT_TYPE = "application/json; charset=utf-8"

# OmniHuman 1.5 req_keys
REQ_KEY_ROLE_CHECK = "jimeng_realman_avatar_picture_create_role_omni_v15"   # 步骤1：主体识别（异步）
REQ_KEY_OBJECT_DETECTION = "jimeng_realman_avatar_object_detection"          # 步骤2：主体检测/mask（同步）
REQ_KEY_VIDEO = "jimeng_realman_avatar_picture_omni_v15"                    # 步骤3：视频生成（异步）

MEDIA_ROOT = '/var/www/harry-insurance2/media'
MEDIA_URL_PREFIX = '/media'


# ── AKSK 签名工具 ──────────────────────────────────────────────

def _norm_query(params):
    query = ""
    for key in sorted(params.keys()):
        if isinstance(params[key], list):
            for k in params[key]:
                query += urllib.parse.quote(key, safe="-_.~") + "=" + urllib.parse.quote(k, safe="-_.~") + "&"
        else:
            query += urllib.parse.quote(key, safe="-_.~") + "=" + urllib.parse.quote(params[key], safe="-_.~") + "&"
    return query[:-1].replace("+", "%20")


def _hmac_sha256(key: bytes, content: str) -> bytes:
    return hmac.new(key, content.encode("utf-8"), hashlib.sha256).digest()


def _hash_sha256(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _sign_visual_request(action, body_dict):
    """
    火山引擎 AKSK 签名（visual.volcengineapi.com）
    返回 (headers, params, body_str)
    """
    ak = BYTEDANCE_ACCESS_KEY
    sk = BYTEDANCE_SECRET_KEY

    now = datetime.datetime.utcnow()
    x_date = now.strftime("%Y%m%dT%H%M%SZ")
    short_x_date = x_date[:8]

    body_str = json.dumps(body_dict)
    x_content_sha256 = _hash_sha256(body_str)

    query_params = {"Action": action, "Version": VISUAL_VERSION}

    signed_headers_str = "content-type;host;x-content-sha256;x-date"
    canonical_request_str = "\n".join([
        "POST",
        "/",
        _norm_query(query_params),
        "\n".join([
            "content-type:" + VISUAL_CONTENT_TYPE,
            "host:" + VISUAL_API_HOST,
            "x-content-sha256:" + x_content_sha256,
            "x-date:" + x_date,
        ]),
        "",
        signed_headers_str,
        x_content_sha256,
    ])

    hashed_canonical_request = _hash_sha256(canonical_request_str)
    credential_scope = "/".join([short_x_date, VISUAL_REGION, VISUAL_SERVICE, "request"])
    string_to_sign = "\n".join(["HMAC-SHA256", x_date, credential_scope, hashed_canonical_request])

    k_date = _hmac_sha256(sk.encode("utf-8"), short_x_date)
    k_region = _hmac_sha256(k_date, VISUAL_REGION)
    k_service = _hmac_sha256(k_region, VISUAL_SERVICE)
    k_signing = _hmac_sha256(k_service, "request")
    signature = _hmac_sha256(k_signing, string_to_sign).hex()

    authorization = "HMAC-SHA256 Credential={}/{}, SignedHeaders={}, Signature={}".format(
        ak, credential_scope, signed_headers_str, signature
    )

    headers = {
        "Content-Type": VISUAL_CONTENT_TYPE,
        "Host": VISUAL_API_HOST,
        "X-Content-Sha256": x_content_sha256,
        "X-Date": x_date,
        "Authorization": authorization,
    }
    return headers, query_params, body_str


def _call_visual_api(action, body_dict):
    """统一调用 visual.volcengineapi.com，返回响应JSON"""
    headers, params, body_str = _sign_visual_request(action, body_dict)
    url = f"https://{VISUAL_API_HOST}/?{urllib.parse.urlencode(params)}"
    resp = requests.post(url, headers=headers, data=body_str, timeout=60)
    logger.info(f"Visual API {action} HTTP={resp.status_code} body={resp.text[:500]}")
    return resp.json()


def _is_api_error(result):
    """
    判断 API 是否返回错误。
    实际响应格式（扁平结构）:
      {"code": 10000, "data": {...}, "message": "Success", "status": 10000}
    code/status == 10000 表示成功，其他表示失败。
    也支持旧版 ResponseMetadata 格式。
    """
    # 新版扁平格式
    code = result.get('code') or result.get('status')
    if code is not None:
        return int(code) != 10000
    # 旧版 ResponseMetadata 格式
    err = result.get('ResponseMetadata', {}).get('Error')
    return bool(err)


def _get_error_msg(result):
    """从响应中提取错误信息"""
    msg = result.get('message', '')
    code = result.get('code') or result.get('status', '')
    if msg and msg.lower() != 'success':
        return f"(code={code}) {msg}"
    err = result.get('ResponseMetadata', {}).get('Error', {})
    if err:
        return f"{err.get('Code')}: {err.get('Message')}"
    return f"code={code} {msg}"


def _get_task_id(result):
    """从提交响应中提取 task_id"""
    # 新版：data.task_id
    data = result.get('data', {})
    if isinstance(data, dict):
        tid = data.get('task_id') or data.get('TaskId') or data.get('task_ID')
        if tid:
            return str(tid)
    # 旧版：Result.task_id
    res = result.get('Result', {})
    if isinstance(res, dict):
        return str(res.get('task_id', ''))
    return ''


def _get_result_data(result):
    """
    从查询响应中提取结果数据（status/video_url等）。
    新版格式：顶层 data 字段包含任务结果。
    """
    data = result.get('data', {})
    if isinstance(data, dict):
        return data
    # 旧版
    return result.get('Result', {})


# ── 视图函数 ──────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["GET"])
def get_config(request):
    """返回是否已配置 AKSK"""
    is_configured = bool(BYTEDANCE_ACCESS_KEY and BYTEDANCE_SECRET_KEY)
    return JsonResponse({
        'success': True,
        'is_configured': is_configured,
    })


@csrf_exempt
@require_http_methods(["POST"])
def upload_media(request):
    """
    上传图片或音频文件，保存到 media/digital_human/，返回公网可访问 URL
    支持图片: jpg/png/webp
    支持音频: mp3/wav/m4a/aac
    """
    try:
        media_file = request.FILES.get('file')
        if not media_file:
            return JsonResponse({'success': False, 'error': '请上传文件'}, status=400)

        # 文件大小限制 50MB
        if media_file.size > 50 * 1024 * 1024:
            return JsonResponse({'success': False, 'error': '文件不能超过50MB'}, status=400)

        ext = media_file.name.rsplit('.', 1)[-1].lower() if '.' in media_file.name else ''
        allowed_image = ['jpg', 'jpeg', 'png', 'webp']
        allowed_audio = ['mp3', 'wav', 'm4a', 'aac']
        allowed = allowed_image + allowed_audio
        if ext not in allowed:
            return JsonResponse({
                'success': False,
                'error': f'不支持的格式: {ext}，支持: {", ".join(allowed)}'
            }, status=400)

        save_dir = os.path.join(MEDIA_ROOT, 'digital_human')
        os.makedirs(save_dir, exist_ok=True)

        unique_name = f"{uuid.uuid4().hex}.{ext}"
        save_path = os.path.join(save_dir, unique_name)

        with open(save_path, 'wb') as f:
            for chunk in media_file.chunks():
                f.write(chunk)

        # 构造公网 URL（需要 Django MEDIA_URL 对应的域名）
        # 从 request 获取 host
        scheme = 'https' if request.is_secure() else 'http'
        host = request.get_host()
        file_url = f"{scheme}://{host}{MEDIA_URL_PREFIX}/digital_human/{unique_name}"

        file_type = 'image' if ext in allowed_image else 'audio'
        logger.info(f"数字人媒体上传成功: {unique_name}, type={file_type}")

        return JsonResponse({
            'success': True,
            'url': file_url,
            'filename': unique_name,
            'file_type': file_type,
        })

    except Exception as e:
        logger.error(f"数字人媒体上传错误: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': f'上传失败: {str(e)}'}, status=500)


def _poll_task(req_key, task_id, max_wait=30, interval=2):
    """
    轮询异步任务直到 status==done，返回最终 result JSON。
    max_wait: 最大等待秒数
    """
    deadline = time.time() + max_wait
    while time.time() < deadline:
        result = _call_visual_api("CVGetResult", {"req_key": req_key, "task_id": task_id})
        if _is_api_error(result):
            return result  # 返回错误让调用方处理
        data = result.get('data', {}) or {}
        status = data.get('status', '')
        if status == 'done':
            return result
        if status in ('not_found', 'expired'):
            return result
        time.sleep(interval)
    # 超时
    return {'code': -1, 'data': {'status': 'timeout'}, 'message': '主体识别超时'}


@csrf_exempt
@require_http_methods(["POST"])
def check_subject(request):
    """
    步骤1：主体识别（OmniHuman 1.5）
    提交异步任务识别图片中是否含人/类人主体，轮询完成后返回结果。
    同时调用步骤2主体检测获取 mask_url（供后续视频生成使用）。
    Body JSON: { "image_url": "https://..." }
    返回: { success, has_subject, mask_urls, message }
    """
    try:
        if not BYTEDANCE_ACCESS_KEY or not BYTEDANCE_SECRET_KEY:
            return JsonResponse({'success': False, 'error': 'AKSK 未配置'}, status=500)

        data = json.loads(request.body)
        image_url = data.get('image_url', '').strip()
        if not image_url:
            return JsonResponse({'success': False, 'error': '请提供 image_url'}, status=400)

        # ── 步骤1：主体识别（异步）──────────────────────────────
        submit_result = _call_visual_api("CVSubmitTask", {
            "req_key": REQ_KEY_ROLE_CHECK,
            "image_url": image_url,
        })
        logger.info(f"主体识别提交结果: {submit_result}")

        if _is_api_error(submit_result):
            return JsonResponse({
                'success': False,
                'error': f'主体识别提交失败: {_get_error_msg(submit_result)}'
            }, status=400)

        role_task_id = _get_task_id(submit_result)
        if not role_task_id:
            return JsonResponse({
                'success': False,
                'error': '主体识别提交未返回 task_id'
            }, status=500)

        # 轮询识别结果
        role_result = _poll_task(REQ_KEY_ROLE_CHECK, role_task_id, max_wait=30, interval=2)
        logger.info(f"主体识别结果: {role_result}")

        if _is_api_error(role_result):
            return JsonResponse({
                'success': False,
                'error': f'主体识别查询失败: {_get_error_msg(role_result)}'
            }, status=400)

        role_data = role_result.get('data', {}) or {}
        role_status = role_data.get('status', '')
        if role_status in ('timeout', 'not_found', 'expired'):
            return JsonResponse({
                'success': False,
                'error': f'主体识别任务异常: {role_status}'
            }, status=400)

        # 解析 resp_data（JSON字符串）
        resp_data_str = role_data.get('resp_data', '{}')
        try:
            resp_data = json.loads(resp_data_str) if isinstance(resp_data_str, str) else resp_data_str
        except Exception:
            resp_data = {}

        has_subject = int(resp_data.get('status', 0)) == 1
        logger.info(f"主体识别 has_subject={has_subject}, resp_data={resp_data}")

        if not has_subject:
            return JsonResponse({
                'success': True,
                'has_subject': False,
                'mask_urls': [],
                'message': '图片中未检测到人物或类人主体，请重新上传包含清晰人物的图片',
            })

        # ── 步骤2：主体检测获取 mask_url（同步）──────────────────
        mask_urls = []
        try:
            detect_result = _call_visual_api("CVProcess", {
                "req_key": REQ_KEY_OBJECT_DETECTION,
                "image_url": image_url,
            })
            logger.info(f"主体检测结果: {detect_result}")

            if not _is_api_error(detect_result):
                detect_data = detect_result.get('data', {}) or {}
                detect_resp_str = detect_data.get('resp_data', '{}')
                try:
                    detect_resp = json.loads(detect_resp_str) if isinstance(detect_resp_str, str) else detect_resp_str
                except Exception:
                    detect_resp = {}

                if int(detect_resp.get('status', 0)) == 1:
                    urls = detect_resp.get('object_detection_result', {}).get('mask', {}).get('url', [])
                    mask_urls = urls if isinstance(urls, list) else []
                    logger.info(f"获取到 mask_urls: {mask_urls}")
        except Exception as e:
            # mask 获取失败不阻断流程
            logger.warning(f"主体检测(mask)获取失败（不影响视频生成）: {e}")

        return JsonResponse({
            'success': True,
            'has_subject': True,
            'mask_urls': mask_urls,
            'message': '检测到人物主体，即将提交视频生成任务',
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': '无效的JSON数据'}, status=400)
    except Exception as e:
        logger.error(f"主体检测错误: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def submit_video(request):
    """
    提交视频生成任务
    Body JSON: { "image_url": "https://...", "audio_url": "https://..." }
    返回: { success, task_id }
    """
    try:
        if not BYTEDANCE_ACCESS_KEY or not BYTEDANCE_SECRET_KEY:
            return JsonResponse({'success': False, 'error': 'AKSK 未配置'}, status=500)

        data = json.loads(request.body)
        image_url = data.get('image_url', '').strip()
        audio_url = data.get('audio_url', '').strip()

        if not image_url:
            return JsonResponse({'success': False, 'error': '请提供 image_url'}, status=400)
        if not audio_url:
            return JsonResponse({'success': False, 'error': '请提供 audio_url'}, status=400)

        submit_body = {
            "req_key": REQ_KEY_VIDEO,
            "image_url": image_url,
            "audio_url": audio_url,
        }
        # 可选：指定说话主体的 mask（来自步骤2主体检测）
        mask_urls = data.get('mask_urls', [])
        if mask_urls and isinstance(mask_urls, list):
            submit_body["mask_url"] = mask_urls
        result = _call_visual_api("CVSubmitTask", submit_body)
        logger.info(f"视频生成提交结果: {result}")

        if _is_api_error(result):
            err_msg = _get_error_msg(result)
            if '50411' in str(err_msg) or 'audit' in str(err_msg).lower():
                err_msg = f'图片审核未通过，请使用合规的人物图片 ({err_msg})'
            return JsonResponse({'success': False, 'error': f'提交失败: {err_msg}'}, status=400)

        task_id = _get_task_id(result)
        if not task_id:
            return JsonResponse({
                'success': False,
                'error': f'提交失败，未返回 task_id，响应: {json.dumps(result, ensure_ascii=False)}'
            }, status=500)

        logger.info(f"视频生成任务已提交: task_id={task_id}")
        return JsonResponse({
            'success': True,
            'task_id': task_id,
            'message': '视频生成任务已提交，请等待处理完成',
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': '无效的JSON数据'}, status=400)
    except Exception as e:
        logger.error(f"视频生成提交错误: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': f'提交失败: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def get_video_status(request):
    """
    查询视频生成任务状态
    Body JSON: { "task_id": "xxx" }
    返回: { success, status, video_url, message }
    """
    try:
        if not BYTEDANCE_ACCESS_KEY or not BYTEDANCE_SECRET_KEY:
            return JsonResponse({'success': False, 'error': 'AKSK 未配置'}, status=500)

        data = json.loads(request.body)
        task_id = data.get('task_id', '').strip()
        if not task_id:
            return JsonResponse({'success': False, 'error': '请提供 task_id'}, status=400)

        query_body = {
            "req_key": REQ_KEY_VIDEO,
            "task_id": task_id,
        }
        result = _call_visual_api("CVGetResult", query_body)
        logger.info(f"视频状态查询 task_id={task_id}: {result}")

        if _is_api_error(result):
            return JsonResponse({
                'success': False,
                'error': f"查询失败: {_get_error_msg(result)}"
            }, status=400)

        # 新版扁平格式：data 字段包含任务结果
        result_data = _get_result_data(result)
        task_status = result_data.get('status', '') if isinstance(result_data, dict) else ''

        # 状态映射（支持字符串和数字状态）
        STATUS_DONE = ('done', 'success', 'SUCCESS', 'DONE')
        STATUS_FAILED = ('failed', 'FAILED', 'error', 'ERROR')
        STATUS_RUNNING = ('in_queue', 'processing', 'generating')

        is_done = task_status in STATUS_DONE
        is_error = task_status in STATUS_FAILED

        STATUS_LABELS_MAP = {
            'in_queue': '排队等待中',
            'processing': '视频生成中',
            'generating': '视频生成中',
            'done': '生成完成',
            'success': '生成完成',
            'SUCCESS': '生成完成',
            'DONE': '生成完成',
            'failed': '生成失败',
            'FAILED': '生成失败',
            'error': '生成失败',
            'ERROR': '生成失败',
        }
        status_label = STATUS_LABELS_MAP.get(str(task_status), f'处理中 ({task_status})')

        # 提取视频 URL（尝试多种字段名）
        video_url = None
        if is_done and not is_error and isinstance(result_data, dict):
            video_url = (
                result_data.get('video_url') or
                result_data.get('output_url') or
                result_data.get('result_url') or
                result_data.get('url')
            )
            # data 可能是嵌套的
            inner = result_data.get('data')
            if not video_url and isinstance(inner, dict):
                video_url = (
                    inner.get('video_url') or
                    inner.get('output_url') or
                    inner.get('url')
                )
            elif not video_url and isinstance(inner, list) and inner:
                first = inner[0]
                video_url = first.get('video_url') or first.get('url') if isinstance(first, dict) else first

        top_message = result.get('message', '')
        err_code = result.get('code', result.get('status', ''))

        if is_error:
            return JsonResponse({
                'success': True,
                'status': task_status,
                'status_label': '生成失败',
                'is_done': True,
                'is_error': True,
                'video_url': None,
                'message': f'生成失败: {top_message or task_status}',
                'raw': result_data,
            })

        return JsonResponse({
            'success': True,
            'status': task_status,
            'status_label': status_label,
            'is_done': is_done,
            'is_error': False,
            'video_url': video_url,
            'message': status_label,
            'raw': result_data,
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': '无效的JSON数据'}, status=400)
    except Exception as e:
        logger.error(f"查询视频状态错误: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': f'查询失败: {str(e)}'}, status=500)
