"""
ByteDance MegaTTS Voice Clone Views
声音复刻 - 使用字节跳动火山引擎MegaTTS API
"""
import os
import base64
import json
import gzip
import uuid
import hmac
import hashlib
import datetime
import logging
import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

BYTEDANCE_HOST = "https://openspeech.bytedance.com"
BYTEDANCE_APPID = os.getenv('BYTEDANCE_APPID', '')
BYTEDANCE_TOKEN = os.getenv('BYTEDANCE_TOKEN', '')
BYTEDANCE_ACCESS_KEY = os.getenv('BYTEDANCE_ACCESS_KEY', '')
BYTEDANCE_SECRET_KEY = os.getenv('BYTEDANCE_SECRET_KEY', '')

# 音色接口固定参数
VOLC_API_HOST = "open.volcengineapi.com"
VOLC_REGION = "cn-north-1"
VOLC_SERVICE = "speech_saas_prod"
VOLC_VERSION = "2023-11-07"
VOLC_CONTENT_TYPE = "application/json; charset=utf-8"


def _norm_query(params):
    from urllib.parse import quote
    query = ""
    for key in sorted(params.keys()):
        if isinstance(params[key], list):
            for k in params[key]:
                query += quote(key, safe="-_.~") + "=" + quote(k, safe="-_.~") + "&"
        else:
            query += quote(key, safe="-_.~") + "=" + quote(params[key], safe="-_.~") + "&"
    return query[:-1].replace("+", "%20")


def _hmac_sha256(key: bytes, content: str) -> bytes:
    return hmac.new(key, content.encode("utf-8"), hashlib.sha256).digest()


def _hash_sha256(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _sign_volc_request(action, body_dict):
    """
    火山引擎 AKSK 签名（按官方示例代码实现）
    返回 (headers, params, body_str)
    """
    ak = BYTEDANCE_ACCESS_KEY
    sk = BYTEDANCE_SECRET_KEY

    now = datetime.datetime.utcnow()
    x_date = now.strftime("%Y%m%dT%H%M%SZ")
    short_x_date = x_date[:8]

    body_str = json.dumps(body_dict)
    x_content_sha256 = _hash_sha256(body_str)

    query_params = {"Action": action, "Version": VOLC_VERSION}

    signed_headers_str = "content-type;host;x-content-sha256;x-date"
    canonical_request_str = "\n".join([
        "POST",
        "/",
        _norm_query(query_params),
        "\n".join([
            "content-type:" + VOLC_CONTENT_TYPE,
            "host:" + VOLC_API_HOST,
            "x-content-sha256:" + x_content_sha256,
            "x-date:" + x_date,
        ]),
        "",
        signed_headers_str,
        x_content_sha256,
    ])

    hashed_canonical_request = _hash_sha256(canonical_request_str)
    credential_scope = "/".join([short_x_date, VOLC_REGION, VOLC_SERVICE, "request"])
    string_to_sign = "\n".join(["HMAC-SHA256", x_date, credential_scope, hashed_canonical_request])

    k_date = _hmac_sha256(sk.encode("utf-8"), short_x_date)
    k_region = _hmac_sha256(k_date, VOLC_REGION)
    k_service = _hmac_sha256(k_region, VOLC_SERVICE)
    k_signing = _hmac_sha256(k_service, "request")
    signature = _hmac_sha256(k_signing, string_to_sign).hex()

    authorization = "HMAC-SHA256 Credential={}/{}, SignedHeaders={}, Signature={}".format(
        ak, credential_scope, signed_headers_str, signature
    )

    headers = {
        "Content-Type": VOLC_CONTENT_TYPE,
        "Host": VOLC_API_HOST,
        "X-Content-Sha256": x_content_sha256,
        "X-Date": x_date,
        "Authorization": authorization,
    }
    return headers, query_params, body_str

# model_type -> Resource-Id 映射（按官方文档）
MODEL_TYPE_RESOURCE_MAP = {
    1: "seed-icl-1.0",  # 声音复刻ICL 1.0
    2: "seed-icl-1.0",  # DiT标准版（同属ICL 1.0）
    3: "seed-icl-1.0",  # DiT还原版（同属ICL 1.0）
    4: "seed-icl-2.0",  # 声音复刻ICL 2.0
}


def get_auth_headers(model_type=1):
    resource_id = MODEL_TYPE_RESOURCE_MAP.get(model_type, "volc.megatts.voiceclone")
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer;{BYTEDANCE_TOKEN}",
        "Resource-Id": resource_id,
    }


@csrf_exempt
@require_http_methods(["POST"])
def upload_voice_clone(request):
    """
    上传音频文件训练音色
    Body (multipart/form-data):
      - audio_file: 音频文件 (wav/mp3/ogg/m4a/aac/pcm)
      - speaker_id: 声音ID (唯一标识)
      - language: 语种 (0=中文, 1=英文, 2=日语, ...) 默认0
      - model_type: 模型类型 (1=ICL1.0, 4=ICL2.0) 默认1
    """
    try:
        if not BYTEDANCE_APPID or not BYTEDANCE_TOKEN:
            return JsonResponse({
                'success': False,
                'error': '字节跳动API配置缺失，请在.env中配置BYTEDANCE_APPID和BYTEDANCE_TOKEN'
            }, status=500)

        speaker_id = request.POST.get('speaker_id', '').strip()
        language = int(request.POST.get('language', 0))
        model_type = int(request.POST.get('model_type', 1))

        if not speaker_id:
            return JsonResponse({'success': False, 'error': '声音ID不能为空'}, status=400)

        audio_file = request.FILES.get('audio_file')
        if not audio_file:
            return JsonResponse({'success': False, 'error': '请上传音频文件'}, status=400)

        # 检查文件大小 (最大10MB)
        if audio_file.size > 10 * 1024 * 1024:
            return JsonResponse({'success': False, 'error': '音频文件不能超过10MB'}, status=400)

        # 获取音频格式
        original_name = audio_file.name.lower()
        audio_format = original_name.rsplit('.', 1)[-1] if '.' in original_name else 'wav'
        supported_formats = ['wav', 'mp3', 'ogg', 'm4a', 'aac', 'pcm']
        if audio_format not in supported_formats:
            return JsonResponse({
                'success': False,
                'error': f'不支持的音频格式: {audio_format}，支持: {", ".join(supported_formats)}'
            }, status=400)

        # Base64编码音频数据
        audio_data = audio_file.read()
        encoded_audio = base64.b64encode(audio_data).decode('utf-8')

        # 构建请求
        payload = {
            "appid": BYTEDANCE_APPID,
            "speaker_id": speaker_id,
            "audios": [{
                "audio_bytes": encoded_audio,
                "audio_format": audio_format,
            }],
            "source": 2,
            "language": language,
            "model_type": model_type,
        }

        url = BYTEDANCE_HOST + "/api/v1/mega_tts/audio/upload"
        response = requests.post(url, json=payload, headers=get_auth_headers(model_type), timeout=60)

        logger.info(f"声音复刻上传响应: status={response.status_code}")

        if response.status_code != 200:
            return JsonResponse({
                'success': False,
                'error': f'API请求失败: {response.text}'
            }, status=500)

        result = response.json()
        base_resp = result.get('BaseResp', {})

        if base_resp.get('StatusCode') != 0:
            return JsonResponse({
                'success': False,
                'error': f"训练失败: {base_resp.get('StatusMessage', '未知错误')} (错误码: {base_resp.get('StatusCode')})"
            }, status=400)

        return JsonResponse({
            'success': True,
            'message': '音频上传成功，正在训练音色，请稍后查询状态',
            'speaker_id': result.get('speaker_id', speaker_id),
        })

    except Exception as e:
        logger.error(f"声音复刻上传错误: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': f'上传失败: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def get_voice_clone_status(request):
    """
    查询音色训练状态
    Body (JSON):
      - speaker_id: 声音ID
    """
    try:
        if not BYTEDANCE_APPID or not BYTEDANCE_TOKEN:
            return JsonResponse({
                'success': False,
                'error': '字节跳动API配置缺失'
            }, status=500)

        data = json.loads(request.body)
        speaker_id = data.get('speaker_id', '').strip()

        if not speaker_id:
            return JsonResponse({'success': False, 'error': '声音ID不能为空'}, status=400)

        # 使用 AKSK 音色接口查询（支持所有模型类型）
        if BYTEDANCE_ACCESS_KEY and BYTEDANCE_SECRET_KEY:
            body = {"AppID": BYTEDANCE_APPID, "SpeakerIDs": [speaker_id]}
            headers, query_params, body_str = _sign_volc_request("BatchListMegaTTSTrainStatus", body)
            response = requests.post(
                f"https://{VOLC_API_HOST}/",
                headers=headers, params=query_params, data=body_str, timeout=30,
            )
            if response.status_code == 200:
                result = response.json()
                statuses = result.get('Result', {}).get('Statuses', [])
                if statuses:
                    s = statuses[0]
                    state = s.get('State', 'Unknown')
                    state_map = {
                        'Unknown':   {'label': '未训练', 'color': 'gray',   'is_ready': False},
                        'Training':  {'label': '训练中', 'color': 'yellow', 'is_ready': False},
                        'Success':   {'label': '训练成功', 'color': 'green', 'is_ready': True},
                        'Active':    {'label': '已激活', 'color': 'green',  'is_ready': True},
                        'Expired':   {'label': '已过期', 'color': 'red',    'is_ready': False},
                        'Reclaimed': {'label': '已回收', 'color': 'gray',   'is_ready': False},
                    }
                    info = state_map.get(state, {'label': state, 'color': 'gray', 'is_ready': False})
                    return JsonResponse({
                        'success': True,
                        'speaker_id': s.get('SpeakerID', speaker_id),
                        'status': state,
                        'status_label': info['label'],
                        'status_color': info['color'],
                        'is_ready': info['is_ready'],
                        'resource_id': s.get('ResourceID', ''),
                        'version': s.get('Version'),
                        'demo_audio': s.get('DemoAudio'),
                        'create_time': s.get('CreateTime'),
                        'expire_time': s.get('ExpireTime'),
                        'available_training_times': s.get('AvailableTrainingTimes'),
                        'alias': s.get('Alias', ''),
                    })
                else:
                    return JsonResponse({'success': False, 'error': f'未找到该 Speaker ID: {speaker_id}'}, status=404)

        # 降级：使用旧 Bearer Token 接口
        model_type = int(data.get('model_type') or 1)
        payload = {"appid": BYTEDANCE_APPID, "speaker_id": speaker_id}
        url = BYTEDANCE_HOST + "/api/v1/mega_tts/status"
        response = requests.post(url, json=payload, headers=get_auth_headers(model_type), timeout=30)
        if response.status_code != 200:
            return JsonResponse({'success': False, 'error': f'API请求失败: {response.text}'}, status=500)
        result = response.json()
        base_resp = result.get('BaseResp', {})
        if base_resp.get('StatusCode') != 0:
            return JsonResponse({'success': False, 'error': f"查询失败: {base_resp.get('StatusMessage', '未知错误')}"}, status=400)
        status_code = result.get('status', 0)
        status_map = {0: ('未找到', 'gray'), 1: ('训练中', 'yellow'), 2: ('训练成功', 'green'), 3: ('训练失败', 'red'), 4: ('已激活', 'green')}
        label, color = status_map.get(status_code, ('未知', 'gray'))
        return JsonResponse({
            'success': True,
            'speaker_id': result.get('speaker_id', speaker_id),
            'status': status_code,
            'status_label': label,
            'status_color': color,
            'is_ready': status_code in [2, 4],
            'create_time': result.get('create_time'),
            'version': result.get('version'),
            'demo_audio': result.get('demo_audio'),
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': '无效的JSON数据'}, status=400)
    except Exception as e:
        logger.error(f"查询声音状态错误: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': f'查询失败: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def synthesize_with_voice_clone(request):
    """
    使用复刻音色合成语音（HTTP方式，cluster=volcano_icl）
    Body (JSON):
      - speaker_id: 复刻后的声音ID
      - text: 要合成的文本
      - model_type: 1=ICL1.0, 4=ICL2.0 默认1
    """
    try:
        if not BYTEDANCE_APPID or not BYTEDANCE_TOKEN:
            return JsonResponse({'success': False, 'error': '字节跳动API配置缺失'}, status=500)

        data = json.loads(request.body)
        speaker_id = data.get('speaker_id', '').strip()
        text = data.get('text', '').strip()
        model_type = int(data.get('model_type', 1))

        if not speaker_id:
            return JsonResponse({'success': False, 'error': '声音ID不能为空'}, status=400)
        if not text:
            return JsonResponse({'success': False, 'error': '文本不能为空'}, status=400)
        if len(text) > 2000:
            return JsonResponse({'success': False, 'error': '文本不能超过2000字符'}, status=400)

        # ICL 1.0 用 volcano_icl，ICL 2.0 用 volcano_icl（同一 cluster）
        cluster = "volcano_icl"

        payload = {
            "app": {
                "appid": BYTEDANCE_APPID,
                "token": BYTEDANCE_TOKEN,
                "cluster": cluster,
            },
            "user": {"uid": "voice_clone_user"},
            "audio": {
                "voice_type": speaker_id,
                "encoding": "mp3",
                "speed_ratio": 1.0,
                "volume_ratio": 1.0,
                "pitch_ratio": 1.0,
            },
            "request": {
                "reqid": str(uuid.uuid4()),
                "text": text,
                "text_type": "plain",
                "operation": "query",
            }
        }

        # gzip压缩
        payload_bytes = gzip.compress(json.dumps(payload).encode('utf-8'))

        # 二进制协议 header: version=1, header_size=1, msg_type=full_client, flags=0, serial=JSON, compress=gzip, reserved=0
        header = bytearray(b'\x11\x10\x11\x00')
        full_request = header + len(payload_bytes).to_bytes(4, 'big') + payload_bytes

        # 使用HTTP方式（非WebSocket），直接POST
        tts_url = "https://openspeech.bytedance.com/api/v1/tts"
        http_payload = {
            "app": {
                "appid": BYTEDANCE_APPID,
                "token": BYTEDANCE_TOKEN,
                "cluster": cluster,
            },
            "user": {"uid": "voice_clone_user"},
            "audio": {
                "voice_type": speaker_id,
                "encoding": "mp3",
                "speed_ratio": 1.0,
                "volume_ratio": 1.0,
                "pitch_ratio": 1.0,
            },
            "request": {
                "reqid": str(uuid.uuid4()),
                "text": text,
                "text_type": "plain",
                "operation": "query",
            }
        }

        http_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer;{BYTEDANCE_TOKEN}",
        }

        response = requests.post(tts_url, json=http_payload, headers=http_headers, timeout=60)
        logger.info(f"声音复刻TTS响应: status={response.status_code}")

        if response.status_code != 200:
            return JsonResponse({'success': False, 'error': f'合成请求失败: {response.text}'}, status=500)

        result = response.json()
        code = result.get('code')
        if code != 3000:
            return JsonResponse({
                'success': False,
                'error': f"合成失败: {result.get('message', '未知错误')} (code: {code})"
            }, status=400)

        # 解码音频数据
        audio_b64 = result.get('data', '')
        if not audio_b64:
            return JsonResponse({'success': False, 'error': '合成返回数据为空'}, status=500)

        audio_bytes = base64.b64decode(audio_b64)

        # 保存音频文件
        media_dir = '/var/www/harry-insurance2/media/tts'
        os.makedirs(media_dir, exist_ok=True)
        audio_filename = f"voice_clone_{uuid.uuid4().hex[:8]}.mp3"
        audio_path = os.path.join(media_dir, audio_filename)

        with open(audio_path, 'wb') as f:
            f.write(audio_bytes)

        logger.info(f"声音复刻TTS合成成功: {audio_filename}, {len(audio_bytes)} bytes")

        return JsonResponse({
            'success': True,
            'message': '合成成功',
            'audio_url': f'/media/tts/{audio_filename}',
            'filename': audio_filename,
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': '无效的JSON数据'}, status=400)
    except Exception as e:
        logger.error(f"声音复刻TTS合成错误: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': f'合成失败: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def list_voice_clone_speakers(request):
    """
    查询账号下所有已购买的音色列表（分页）
    Body (JSON, 可选):
      - page_number: 页码，默认1
      - page_size: 每页条数，默认20
      - state: 过滤状态 Unknown/Training/Success/Active/Expired/Reclaimed
      - resource_ids: 过滤模型 ["seed-icl-1.0", "seed-icl-2.0"]
    """
    try:
        if not BYTEDANCE_ACCESS_KEY or not BYTEDANCE_SECRET_KEY:
            return JsonResponse({
                'success': False,
                'error': '未配置 BYTEDANCE_ACCESS_KEY / BYTEDANCE_SECRET_KEY，无法查询音色列表'
            }, status=500)

        data = {}
        if request.body:
            try:
                data = json.loads(request.body)
            except Exception:
                pass

        body = {
            "AppID": BYTEDANCE_APPID,
            "PageNumber": data.get('page_number', 1),
            "PageSize": min(data.get('page_size', 20), 100),
        }
        if data.get('state'):
            body['State'] = data['state']
        if data.get('resource_ids'):
            body['ResourceIDs'] = data['resource_ids']

        headers, query_params, body_str = _sign_volc_request("BatchListMegaTTSTrainStatus", body)
        response = requests.post(
            f"https://{VOLC_API_HOST}/",
            headers=headers,
            params=query_params,
            data=body_str,
            timeout=30,
        )

        logger.info(f"查询音色列表响应: status={response.status_code}")

        if response.status_code != 200:
            return JsonResponse({
                'success': False,
                'error': f'请求失败 HTTP {response.status_code}: {response.text}'
            }, status=500)

        result = response.json()
        err = result.get('ResponseMetadata', {}).get('Error')
        if err:
            return JsonResponse({
                'success': False,
                'error': f"{err.get('Code')}: {err.get('Message')}"
            }, status=400)

        res = result.get('Result', {})
        statuses = res.get('Statuses', [])

        # 整理返回数据
        speakers = []
        for s in statuses:
            speakers.append({
                'speaker_id': s.get('SpeakerID'),
                'state': s.get('State'),
                'alias': s.get('Alias', ''),
                'resource_id': s.get('ResourceID', ''),
                'version': s.get('Version', ''),
                'available_training_times': s.get('AvailableTrainingTimes'),
                'is_activable': s.get('IsActivable', False),
                'demo_audio': s.get('DemoAudio', ''),
                'create_time': s.get('CreateTime'),
                'expire_time': s.get('ExpireTime'),
                'order_time': s.get('OrderTime'),
                'instance_no': s.get('InstanceNO', ''),
            })

        return JsonResponse({
            'success': True,
            'speakers': speakers,
            'total_count': res.get('TotalCount', len(speakers)),
            'page_number': res.get('PageNumber', 1),
            'page_size': res.get('PageSize', len(speakers)),
            'next_token': res.get('NextToken', ''),
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': '无效的JSON数据'}, status=400)
    except Exception as e:
        logger.error(f"查询音色列表错误: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': f'查询失败: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_voice_clone_config(request):
    """返回前端所需的配置（appid是否配置、可用模型等）"""
    is_configured = bool(BYTEDANCE_APPID and BYTEDANCE_TOKEN)
    aksk_configured = bool(BYTEDANCE_ACCESS_KEY and BYTEDANCE_SECRET_KEY)
    return JsonResponse({
        'success': True,
        'is_configured': is_configured,
        'aksk_configured': aksk_configured,
        'appid': BYTEDANCE_APPID if is_configured else '',
        'model_types': [
            {'value': 1, 'label': '声音复刻ICL 1.0 (推荐)', 'resource_id': 'seed-icl-1.0'},
            {'value': 4, 'label': '声音复刻ICL 2.0', 'resource_id': 'seed-icl-2.0'},
            {'value': 2, 'label': 'DiT标准版', 'resource_id': 'seed-icl-1.0'},
            {'value': 3, 'label': 'DiT还原版', 'resource_id': 'seed-icl-1.0'},
        ],
        'languages': [
            {'value': 0, 'label': '中文'},
            {'value': 1, 'label': '英文'},
            {'value': 2, 'label': '日语'},
            {'value': 3, 'label': '西班牙语'},
            {'value': 4, 'label': '印尼语'},
            {'value': 5, 'label': '葡萄牙语'},
        ],
    })
