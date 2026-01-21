import os
import logging
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


def get_gemini_client():
    """
    获取Gemini客户端，支持主密钥和备用密钥的自动切换

    Returns:
        tuple: (client, api_key) - Gemini客户端和使用的API密钥
    """
    # 获取主API密钥
    primary_key = os.getenv('GEMINI_API_KEY')
    # 获取备用API密钥
    fallback_key = os.getenv('GEMINI_API_KEY_FALLBACK')

    if not primary_key:
        logger.error('❌ GEMINI_API_KEY环境变量未设置')
        return None, None

    # 优先使用主密钥
    try:
        client = genai.Client(api_key=primary_key)
        logger.info(f"🔑 使用主API密钥: {primary_key[:10]}...")
        return client, primary_key
    except Exception as e:
        logger.warning(f"⚠️ 主API密钥初始化失败: {str(e)}")

        # 如果主密钥失败且备用密钥存在，尝试备用密钥
        if fallback_key:
            try:
                client = genai.Client(api_key=fallback_key)
                logger.info(f"🔑 切换到备用API密钥: {fallback_key[:10]}...")
                return client, fallback_key
            except Exception as e2:
                logger.error(f"❌ 备用API密钥也初始化失败: {str(e2)}")

        return None, None


def call_gemini_with_fallback(model, contents, operation_name="API调用"):
    """
    调用Gemini API并支持自动重试备用密钥

    Args:
        model: 模型名称 (如 'gemini-3-pro-preview')
        contents: API请求内容
        operation_name: 操作名称（用于日志）

    Returns:
        response: API响应对象

    Raises:
        Exception: 当所有API密钥都失败时抛出异常
    """
    # 获取API密钥列表
    api_keys = []
    primary_key = os.getenv('GEMINI_API_KEY')
    fallback_key = os.getenv('GEMINI_API_KEY_FALLBACK')

    if primary_key:
        api_keys.append(('主密钥', primary_key))
    if fallback_key:
        api_keys.append(('备用密钥', fallback_key))

    if not api_keys:
        raise Exception('未配置任何Gemini API密钥')

    last_error = None

    # 依次尝试每个API密钥
    for key_name, api_key in api_keys:
        try:
            logger.info(f"🔑 [{operation_name}] 尝试使用{key_name}: {api_key[:10]}...")

            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model,
                contents=contents
            )

            logger.info(f"✅ [{operation_name}] {key_name}调用成功")
            return response

        except Exception as e:
            error_msg = str(e)
            logger.warning(f"⚠️ [{operation_name}] {key_name}失败: {error_msg}")

            # 检查是否是配额/限流错误
            is_quota_error = any(keyword in error_msg.lower() for keyword in [
                'quota', 'rate limit', 'resource exhausted', '429', 'too many requests'
            ])

            if is_quota_error:
                logger.warning(f"📊 [{operation_name}] 检测到{key_name}超额限制，尝试下一个密钥...")

            last_error = e
            continue

    # 所有密钥都失败
    logger.error(f"❌ [{operation_name}] 所有API密钥均失败")
    raise last_error if last_error else Exception('所有API密钥均失败')


def analyze_poster(image_file):
    """
    使用Google Gemini分析海报图片

    Args:
        image_file: Django UploadedFile对象，包含上传的海报图片

    Returns:
        dict: 包含分析结果的字典，格式如下：
        {
            "success": True/False,
            "analysis": "分析文本内容",
            "error": "错误信息（如果失败）"
        }
    """
    try:
        logger.info(f"📤 开始上传海报图片，文件大小: {image_file.size} 字节")

        # 读取图片内容
        image_bytes = image_file.read()

        # 获取文件类型
        content_type = image_file.content_type
        logger.info(f"📷 图片类型: {content_type}")

        # 构建提示词
        prompt_text = """请仔细分析这张海报/宣传图，提供以下内容的详细分析：

1. **视觉设计分析**：
   - 整体风格和色彩搭配
   - 排版布局特点
   - 视觉层次和焦点

2. **内容解读**：
   - 识别所有文字内容（中英文）
   - 核心信息和宣传重点
   - 目标受众

3. **营销要素**：
   - 主要卖点和吸引力
   - 情感诉求
   - 行动召唤（CTA）

4. **改进建议**：
   - 设计优化方向
   - 内容改进建议
   - 提高转化率的建议

请用中文回答，结构清晰，分点说明。"""

        logger.info("🤖 正在调用Gemini API进行分析...")

        # 构建请求parts
        parts = [
            types.Part.from_text(text=prompt_text),
            types.Part.from_bytes(data=image_bytes, mime_type=content_type)
        ]

        contents = [
            types.Content(
                role="user",
                parts=parts
            )
        ]

        # 使用支持fallback的API调用
        response = call_gemini_with_fallback(
            model='gemini-3-pro-preview',
            contents=contents,
            operation_name="海报分析"
        )

        # 获取分析结果
        analysis_text = response.text
        logger.info(f"✅ 分析完成，结果长度: {len(analysis_text)} 字符")
        logger.info(f"📄 分析预览(前200字符): {analysis_text[:200]}")

        return {
            'success': True,
            'analysis': analysis_text
        }

    except Exception as e:
        logger.error(f"❌ 调用Gemini API时发生错误: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            'success': False,
            'error': f'分析失败: {str(e)}'
        }


def analyze_poster_with_custom_prompt(image_file, custom_prompt=None):
    """
    使用自定义提示词分析海报图片

    Args:
        image_file: Django UploadedFile对象，包含上传的海报图片
        custom_prompt: 自定义的分析提示词

    Returns:
        dict: 包含分析结果的字典
    """
    try:
        # 读取图片
        image_bytes = image_file.read()
        content_type = image_file.content_type

        # 使用自定义提示词或默认提示词
        if not custom_prompt:
            custom_prompt = "请分析这张海报并详细描述其内容、设计特点和营销要素。"

        logger.info(f"🤖 使用自定义提示词进行分析...")

        # 构建请求parts
        parts = [
            types.Part.from_text(text=custom_prompt),
            types.Part.from_bytes(data=image_bytes, mime_type=content_type)
        ]

        contents = [
            types.Content(
                role="user",
                parts=parts
            )
        ]

        # 使用支持fallback的API调用
        response = call_gemini_with_fallback(
            model='gemini-3-pro-preview',
            contents=contents,
            operation_name="自定义提示词海报分析"
        )

        return {
            'success': True,
            'analysis': response.text
        }

    except Exception as e:
        logger.error(f"❌ 分析失败: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            'success': False,
            'error': f'分析失败: {str(e)}'
        }


def ocr_pdf_with_gemini(pdf_path):
    """
    使用 Gemini 3 Flash Preview 对 PDF 文件进行 OCR 识别

    Args:
        pdf_path: PDF 文件的绝对路径 (str 或 Path 对象)

    Returns:
        dict: 包含 OCR 结果的字典
        {
            "success": True/False,
            "content": "识别的Markdown格式文本",
            "error": "错误信息（如果失败）"
        }
    """
    try:
        import pathlib

        # 转换为 Path 对象
        pdf_file = pathlib.Path(pdf_path)

        # 检查文件是否存在
        if not pdf_file.exists():
            logger.error(f'❌ PDF文件不存在: {pdf_path}')
            return {
                'success': False,
                'error': f'PDF文件不存在: {pdf_path}'
            }

        # 检查文件大小
        file_size_mb = pdf_file.stat().st_size / (1024 * 1024)
        logger.info(f"📄 准备OCR识别PDF: {pdf_file.name}, 大小: {file_size_mb:.2f} MB")

        # 读取PDF字节数据
        pdf_bytes = pdf_file.read_bytes()
        logger.info(f"✅ 文件读取成功，字节大小: {len(pdf_bytes)}")

        # 构建提示词（直接返回OCR结果）
        prompt_text = """请对此PDF文档进行OCR识别，返回识别结果。

要求：
1. 原样返回所有识别到的文字内容
2. 保持原始文档的排版和格式
3. 表格请用HTML <table>标签标记，使用紧凑格式（单行，无换行）
4. 不要添加任何解释、总结或额外说明
5. 字段名称必须原封不动，不要翻译或改写
6. 数字、符号、标点必须准确

表格格式示例（紧凑单行）：
<table><tr><th>列1</th><th>列2</th></tr><tr><td>值1</td><td>值2</td></tr></table>

直接返回OCR识别结果："""

        logger.info("🤖 正在调用Gemini Flash API进行OCR识别...")

        # 构建请求
        parts = [
            types.Part.from_text(text=prompt_text),
            types.Part.from_bytes(data=pdf_bytes, mime_type='application/pdf')
        ]

        contents = [
            types.Content(
                role="user",
                parts=parts
            )
        ]

        # 使用支持fallback的API调用
        response = call_gemini_with_fallback(
            model='gemini-3-flash-preview',
            contents=contents,
            operation_name="PDF OCR识别"
        )

        # 获取识别结果
        ocr_content = response.text
        logger.info(f"✅ OCR识别完成，内容长度: {len(ocr_content)} 字符")
        logger.info(f"📄 内容预览(前300字符): {ocr_content[:300]}")

        # 检查内容是否为空
        if not ocr_content or not ocr_content.strip():
            logger.error("❌ OCR返回内容为空")
            return {
                'success': False,
                'error': 'OCR识别结果为空'
            }

        return {
            'success': True,
            'content': ocr_content
        }

    except Exception as e:
        logger.error(f"❌ Gemini OCR识别失败: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            'success': False,
            'error': f'OCR识别失败: {str(e)}'
        }
