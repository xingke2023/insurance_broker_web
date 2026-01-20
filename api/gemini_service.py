import os
import logging
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


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
        # 从环境变量获取API密钥
        api_key = os.getenv('GEMINI_API_KEY')
        logger.info(f"🔑 Gemini API Key检查: {'已配置' if api_key else '未配置'}")

        if not api_key:
            logger.error('❌ GEMINI_API_KEY环境变量未设置')
            return {
                'success': False,
                'error': 'GEMINI_API_KEY环境变量未设置，请在.env文件中配置'
            }

        # 创建Gemini客户端
        client = genai.Client(api_key=api_key)

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

        # 调用Gemini API
        response = client.models.generate_content(
            model='gemini-3-pro-preview',  # 使用Gemini 3 Pro Preview模型
            contents=contents
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
        # 从环境变量获取API密钥
        api_key = os.getenv('GEMINI_API_KEY')

        if not api_key:
            return {
                'success': False,
                'error': 'GEMINI_API_KEY环境变量未设置'
            }

        # 创建Gemini客户端
        client = genai.Client(api_key=api_key)

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

        # 调用API
        response = client.models.generate_content(
            model='gemini-3-pro-preview',
            contents=contents
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

        # 从环境变量获取API密钥
        api_key = os.getenv('GEMINI_API_KEY')

        if not api_key:
            logger.error('❌ GEMINI_API_KEY环境变量未设置')
            return {
                'success': False,
                'error': 'GEMINI_API_KEY环境变量未设置，请在.env文件中配置'
            }

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

        # 创建Gemini客户端
        client = genai.Client(api_key=api_key)

        # 读取PDF字节数据
        pdf_bytes = pdf_file.read_bytes()
        logger.info(f"✅ 文件读取成功，字节大小: {len(pdf_bytes)}")

        # 构建提示词（要求输出Markdown格式）
        prompt_text = """请将此保险计划书PDF文档转换为Markdown格式文本。

要求：
1. 保留所有文字内容，包括标题、段落、列表
2. 识别并转换表格为Markdown表格格式
3. 保持原始文档的逻辑结构和层次
4. 使用<table>标签标记表格（保留HTML格式更准确）
5. 重要：表格字段名称必须原封不动保留，如"保单年度终结"、"保證現金價值"等不能翻译或改写
6. 特别注意表格中的数字、百分比、金额等数据必须准确无误

输出格式示例：
# 标题
## 子标题
段落内容...

<table>
<tr><th>保单年度终结</th><th>保證現金價值</th></tr>
<tr><td>1</td><td>10000</td></tr>
</table>

请开始转换："""

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

        # 调用Gemini Flash API
        response = client.models.generate_content(
            model='gemini-3-flash-preview',  # 使用Flash版本（速度更快，成本更低）
            contents=contents
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
