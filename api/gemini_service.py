import os
import logging
from google import genai
from google.genai import types
import threading

logger = logging.getLogger(__name__)

# 全局轮询索引（线程安全）
_api_key_index = 0
_api_key_lock = threading.Lock()


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


def get_next_api_key():
    """
    获取下一个API密钥（轮询机制）

    Returns:
        list: API密钥列表，按轮询顺序排列
    """
    global _api_key_index

    # 获取所有可用的API密钥
    all_keys = []
    key1 = os.getenv('GEMINI_API_KEY')
    key2 = os.getenv('GEMINI_API_KEY_FALLBACK')
    key3 = os.getenv('GEMINI_API_KEY_3')

    if key1:
        all_keys.append(('密钥1', key1))
    if key2:
        all_keys.append(('密钥2', key2))
    if key3:
        all_keys.append(('密钥3', key3))

    if not all_keys:
        raise Exception('未配置任何Gemini API密钥')

    # 线程安全地获取并更新索引
    with _api_key_lock:
        start_index = _api_key_index
        _api_key_index = (start_index + 1) % len(all_keys)

    # 从当前索引开始轮询，然后是其他密钥（作为备用）
    rotated_keys = all_keys[start_index:] + all_keys[:start_index]

    logger.info(f"🔄 本次任务从 {rotated_keys[0][0]} 开始（轮询索引: {start_index}）")

    return rotated_keys


def call_gemini_with_fallback(model, contents, config=None, operation_name="API调用"):
    """
    调用Gemini API并支持轮询和自动重试备用密钥

    Args:
        model: 模型名称 (如 'gemini-3-pro-preview')
        contents: API请求内容
        config: GenerateContentConfig配置对象（可选）
        operation_name: 操作名称（用于日志）

    Returns:
        response: API响应对象

    Raises:
        Exception: 当所有API密钥都失败时抛出异常
    """
    # 获取轮询后的API密钥列表
    api_keys = get_next_api_key()

    last_error = None

    # 依次尝试每个API密钥
    for key_name, api_key in api_keys:
        try:
            logger.info(f"🔑 [{operation_name}] 尝试使用{key_name}: {api_key[:10]}...")

            client = genai.Client(api_key=api_key)

            # 根据是否有config参数调用API
            if config:
                response = client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config
                )
            else:
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

        # 构建提示词（使用参考代码的格式）
        system_prompt = """不返回页眉和页脚，不返回乐观悲观不同投资回报表格数据，不返回保险顾问姓名
返回所有识别的内容，一字不差返回原本内容，去掉空行
"""

        logger.info("🤖 正在调用Gemini Flash API进行OCR识别...")

        # 构建多轮对话格式的请求（参考代码格式）
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=system_prompt),
                ],
            ),
            types.Content(
                role="model",
                parts=[],
            ),
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=pdf_bytes, mime_type='application/pdf')
                ],
            ),
        ]

        # 构建配置（参考代码格式）
        config = types.GenerateContentConfig(
            temperature=0.3,
            thinking_config=types.ThinkingConfig(
                thinking_level="MINIMAL",
            ),
            media_resolution="MEDIA_RESOLUTION_LOW",
        )

        # 使用支持fallback的API调用
        response = call_gemini_with_fallback(
            model='gemini-3-flash-preview',
            contents=contents,
            config=config,
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


def extract_table_data_from_pdf(pdf_path):
    """
    使用 Gemini 3 Flash Preview 直接从 PDF 提取表格数据并返回格式化的 JSON

    Args:
        pdf_path: PDF 文件的绝对路径 (str 或 Path 对象)

    Returns:
        dict: 包含提取结果的字典
        {
            "success": True/False,
            "table_data": {
                "table_name": "表格名称",
                "row_count": 100,
                "fields": ["保单年度终结", "保证现金价值", "非保证现金价值", ...],
                "data": [
                    [1, 0, 0, ...],
                    [2, 1000, 500, ...],
                    ...
                ]
            },
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
        logger.info(f"📄 准备提取PDF表格数据: {pdf_file.name}, 大小: {file_size_mb:.2f} MB")

        # 读取PDF字节数据
        pdf_bytes = pdf_file.read_bytes()
        logger.info(f"✅ 文件读取成功，字节大小: {len(pdf_bytes)}")

        # 构建提示词（增加投保人基本信息提取）
        prompt_text = """
你必须返回一个完整的JSON对象，包含以下4个必填字段：policy_values_table、policy_info、financial_planning_summary、financial_planning_qa
即使某些信息在PDF中找不到，也必须返回这4个字段，字段值可以为空字符串、空对象或空数组。

提取信息包括：

一、policy_values_table（必填字段）
分析table里包含列名为"保单年度终结"或"保單年度終結"的table
可能会有好几个这样的表，有些表可能会跨页但其实是属于一个表
选取一个表,输出为policy_values_table，这个表必须满足下面条件：
1.不是悲观或乐观（非不同投资回报），也不是身故，
2.如果有提取就选提取表（字段一般带提取两个字），如果没有就选退保价值表（或者现金价值而不是身故）
3.尽量选取跨页总行数较多的表，最好不是抽样年份展示的表
重要：必须提取表格的所有行，从第1年到表格结束（通常到100岁或更多），不要遗漏任何跨页的数据行,保单年度终结连续。即使表格很长，也要完整提取每一行。
返回这个表所有行的数据的json格式（去除空格换行的数组格式，减少token浪费）
返回第一行是计划书中文原字段名，第二行是英文字段名，剩下是数据行
英文字段可以是中文字段的子集
英字段需要包括(根据中文字段的实际含义来对应，对应不上就用空字段占位)：保单年度终结policy_year，年龄age(如果有)，已缴总保费total_premiums_paid (必填，如果没有得到已缴总保费，就从其他表格获取到，对应的保单年度终结的数据行补全进去)，提取总额withdrawal_amount（如果有），現金提取後的退保價值总额或退保價值總額surrender_value_after_withdrawal（也叫退保發還金額、退保现金价值总额）

注意：surrender_value_after_withdrawal和total_value_plus_withdrawal是有区别的，前者是提取后的退保价值，后者是含提取的总价值
withdrawal_amount和total_withdrawal_amount也是有区别的，前者是单次提取额，后者是累计提取额,如果只有total_withdrawal_amount，就用它来填充withdrawal_amount字段
如果没有已缴总保费就从其他表格获取到，对应的保单年度终结的数据行补全进去
如果表格中没有这些字段，就用空字段占位，保持字段顺序一致。
确保所有数字字段都只包含纯数字，不要带货币符号、百分号或千位分隔符。

二、policy_info（必填字段，必须返回此对象）
必须包括投保人基本信息输出为policy_info，这是一个对象，必须包含以下所有字段：
{
  "保险公司名称": "保险公司全称（如果找不到填空字符串）",
  "产品名称": "保险产品名称（如果找不到填空字符串）",
  "姓名": "受保人姓名（如果找不到填空字符串）",
  "年龄": "受保人年龄（纯数字，如30，找不到填空字符串）",
  "性别": "受保人性别（男或女，找不到填空字符串）",
  "保额": "基本保额（纯数字，不带货币符号和千位分隔符，找不到填空字符串）",
  "年缴保费": "每年缴纳的保费金额（纯数字，找不到填空字符串）",
  "缴费年数": "缴费期限（纯数字，如5、10、20，找不到填空字符串）",
  "总保费": "总保费（年缴保费×缴费年数，自动计算，找不到填空字符串）",
  "保险期限": "保险保障期限（如：终身、至100岁，找不到填空字符串）"
}
注意：年龄、保额、年缴保费、缴费年数都必须是纯数字，不要带单位。
重要：即使PDF中找不到某些字段，也必须返回policy_info对象，并包含上述所有字段名，值可以为空字符串。

三、financial_planning_summary（必填字段）
总结这个计划书的用户财务规划配置特点，结合投保人基本情况，以文本形式返回。
如果PDF中没有足够的信息生成财务规划总结，请返回空字符串""，但必须包含此字段。

四、financial_planning_qa（必填字段）
这个计划书可能的用户提问的问答，结合投保人的基本情况，和他这个年龄段所关心的财务问题，主要围绕客户财务配置的规划，展示我们理财师的专业性，以问题和答案json数组返回。
格式：[{"question": "问题1", "answer": "答案1"}, {"question": "问题2", "answer": "答案2"}]
如果无法生成问答，请返回空数组[]，但必须包含此字段。

最终JSON格式示例：
{
  "policy_values_table": [[...], [...], ...],
  "policy_info": {"保险公司名称": "", "产品名称": "", ...},
  "financial_planning_summary": "财务规划总结文本或空字符串",
  "financial_planning_qa": [{"question": "...", "answer": "..."}, ...]
}

重要提醒：你的返回必须包含这4个顶层字段，缺一不可！
"""

        logger.info("🤖 正在调用Gemini Flash API提取表格数据...")

        # 构建请求（PDF在前，文本在后，匹配参考代码）
        parts = [
            types.Part.from_bytes(data=pdf_bytes, mime_type='application/pdf'),
            types.Part.from_text(text=prompt_text)
        ]

        contents = [
            types.Content(
                role="user",
                parts=parts
            )
        ]

        # 构建配置：使用JSON输出模式（匹配参考代码）
        config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinkingBudget=1024),
            media_resolution=types.MediaResolution.MEDIA_RESOLUTION_LOW,
            response_mime_type="application/json",
            max_output_tokens=65536
        )

        # 使用支持fallback的API调用
        response = call_gemini_with_fallback(
            model='gemini-3-flash-preview',
            contents=contents,
            config=config,
            operation_name="PDF表格数据提取"
        )

        # 获取提取结果
        json_text = response.text.strip()
        logger.info(f"✅ 表格数据提取完成，JSON长度: {len(json_text)} 字符")

        # 解析JSON
        import json
        try:
            # 清理JSON中可能存在的格式问题
            # Gemini有时会在数组元素之间插入不必要的换行
            # 这种简单替换适用于数组格式的表格数据
            json_text_cleaned = json_text.replace('", \n', '", ').replace(',\n', ',').replace('[\n', '[').replace('\n]', ']')

            raw_data = json.loads(json_text_cleaned)

            # Gemini可能返回数组包装的结果: [{...}]
            if isinstance(raw_data, list) and len(raw_data) > 0 and isinstance(raw_data[0], dict):
                if 'policy_values_table' in raw_data[0]:
                    # 提取数组中的第一个元素
                    raw_data = raw_data[0]

            # 新格式：{"policy_values_table": [...], "policy_info": {...}}
            # 兼容旧格式：[[...], [...]] 或 {"table_name": ..., "fields": ..., "data": ...}

            if isinstance(raw_data, dict) and 'policy_values_table' in raw_data:
                # 新格式：包含policy_values_table和policy_info
                logger.info("📋 检测到新格式JSON（包含policy_values_table和policy_info）")

                policy_values = raw_data.get('policy_values_table', [])
                # 确保policy_info至少是空字典，不能是None
                policy_info = raw_data.get('policy_info', {})
                if not isinstance(policy_info, dict):
                    logger.warning(f"⚠️ policy_info格式错误，重置为空字典")
                    policy_info = {}

                # 解析表格数据
                if isinstance(policy_values, list) and len(policy_values) > 0:
                    fields = policy_values[0]
                    data_rows = policy_values[1:]
                else:
                    fields = []
                    data_rows = []

                table_data = {
                    'table_name': '退保价值表',
                    'row_count': len(data_rows),
                    'fields': fields,
                    'data': data_rows,
                    'policy_info': policy_info  # 新增：投保人基本信息
                }

                logger.info(f"📊 表格数据: {len(data_rows)}行, {len(fields)}个字段")
                logger.info(f"👤 投保人信息: {policy_info}")
                if not policy_info or all(not v for v in policy_info.values()):
                    logger.warning(f"⚠️ policy_info为空或所有字段都为空值")

            elif isinstance(raw_data, list) and len(raw_data) > 0:
                # 旧格式1：数组格式 [[字段名...], [数据...], ...]
                fields = raw_data[0]
                data_rows = raw_data[1:]

                table_data = {
                    'table_name': '退保价值表',
                    'row_count': len(data_rows),
                    'fields': fields,
                    'data': data_rows
                }

            elif isinstance(raw_data, dict):
                # 旧格式2：字典格式 {"table_name": ..., "fields": ..., "data": ...}
                table_data = raw_data

            else:
                logger.error(f"❌ 未知的JSON格式: {type(raw_data)}")
                return {
                    'success': False,
                    'error': f'未知的JSON格式: {type(raw_data)}'
                }

            logger.info(f"📊 表格名称: {table_data.get('table_name', 'N/A')}")
            logger.info(f"📊 总行数: {table_data.get('row_count', 0)}")
            logger.info(f"📊 字段数: {len(table_data.get('fields', []))}")
            logger.info(f"📊 数据行数: {len(table_data.get('data', []))}")

            # 如果有policy_info，记录日志
            if 'policy_info' in table_data:
                policy_info = table_data['policy_info']
                logger.info(f"👤 投保人姓名: {policy_info.get('姓名', 'N/A')}")
                logger.info(f"🏢 保险公司: {policy_info.get('保险公司名称', 'N/A')}")
                logger.info(f"📦 产品名称: {policy_info.get('产品名称', 'N/A')}")

            # 提取financial_planning_summary和financial_planning_qa（确保至少返回空值）
            financial_summary = raw_data.get('financial_planning_summary', '')
            financial_qa = raw_data.get('financial_planning_qa', [])

            # 类型检查和默认值处理
            if not isinstance(financial_summary, str):
                logger.warning(f"⚠️ financial_planning_summary格式错误，重置为空字符串")
                financial_summary = ''
            if not isinstance(financial_qa, list):
                logger.warning(f"⚠️ financial_planning_qa格式错误，重置为空数组")
                financial_qa = []

            if financial_summary or financial_qa:
                logger.info(f"📝 检测到财务规划信息")
                if financial_summary:
                    logger.info(f"   - 财务规划总结长度: {len(financial_summary)} 字符")
                if financial_qa:
                    logger.info(f"   - 财务规划问答数量: {len(financial_qa)} 条")
            else:
                logger.warning(f"⚠️ 未检测到财务规划信息（financial_planning_summary和financial_planning_qa均为空）")

            return {
                'success': True,
                'table_data': table_data,
                'financial_planning_summary': financial_summary,
                'financial_planning_qa': financial_qa
            }
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON解析失败: {e}")
            logger.error(f"原始响应(前500字符): {json_text[:500]}")

            # 保存完整JSON到临时文件便于调试
            import tempfile
            temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json', prefix='gemini_raw_')
            temp_file.write(json_text)
            temp_file.close()
            logger.error(f"完整JSON已保存到: {temp_file.name}")

            return {
                'success': False,
                'error': f'JSON解析失败: {str(e)}'
            }

    except Exception as e:
        logger.error(f"❌ Gemini表格数据提取失败: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            'success': False,
            'error': f'表格数据提取失败: {str(e)}'
        }


def compare_pdfs_directly_stream(pdf_files, file_names):
    """
    直接对比多个PDF文件，流式返回结果（生成器函数）

    Args:
        pdf_files: PDF文件对象列表（Django UploadedFile）
        file_names: 文件名列表

    Yields:
        str: 流式输出的HTML片段
    """
    try:
        logger.info("=" * 80)
        logger.info(f"📊 开始流式对比PDF - 文件数量: {len(pdf_files)}")

        client, api_key = get_gemini_client()
        if not client:
            yield "data: " + json.dumps({'error': 'Gemini API密钥未配置或无效'}) + "\n\n"
            return

        # 发送上传进度
        yield "data: " + json.dumps({'status': 'uploading', 'message': '正在上传PDF文件...'}) + "\n\n"

        # 上传所有PDF文件到Gemini File API
        uploaded_files = []

        for i, (pdf_file, file_name) in enumerate(zip(pdf_files, file_names), 1):
            try:
                logger.info(f"📤 上传文件{i}: {file_name}")
                yield "data: " + json.dumps({
                    'status': 'uploading',
                    'message': f'正在上传文件{i}/{len(pdf_files)}: {file_name}...',
                    'progress': int((i - 1) / len(pdf_files) * 20)
                }) + "\n\n"

                pdf_content = pdf_file.read()

                from google.genai import types
                import io

                uploaded_file = client.files.upload(
                    file=io.BytesIO(pdf_content),
                    config=types.UploadFileConfig(
                        mime_type='application/pdf',
                        display_name=file_name
                    )
                )

                uploaded_files.append(uploaded_file)
                logger.info(f"✅ 文件{i}上传成功")

            except Exception as e:
                logger.error(f"❌ 上传文件{i}失败: {str(e)}")
                yield "data: " + json.dumps({'error': f'上传文件{i}失败: {str(e)}'}) + "\n\n"
                return

        # 发送分析进度
        yield "data: " + json.dumps({
            'status': 'analyzing',
            'message': 'PDF上传完成，AI正在深度分析对比...',
            'progress': 25
        }) + "\n\n"

        # 构建对比提示词
        prompt = f"""你是一位专业的保险顾问，请对比分析以下{len(file_names)}份保险计划书，生成详细的对比报告。

# 计划书文件：
"""
        for i, file_name in enumerate(file_names, 1):
            prompt += f"{i}. {file_name}\n"

        prompt += """

# 对比分析要求：

请从以下6个维度进行深度对比分析：

## 1. 保费对比
- 年缴保费、缴费年数、总保费
- 保费与保额比率（性价比）

## 2. 保障对比
- 基本保额、保险期限
- 保障范围和类型

## 3. 现金价值对比
- 第5年、第10年、第20年的保证现金价值
- 非保证现金价值的增长趋势
- 回本年限

## 4. 提取对比
- 保单贷款条件、部分退保规则
- 提取灵活性和成本

## 5. 适用人群分析
- 根据受保人年龄、性别、保费预算分析适用场景
- 给出推荐建议

## 6. 优劣势总结
- 列出每份计划书的核心优势（用绿色高亮）
- 指出劣势或风险点（用红色高亮）
- 综合评分（满分10分）

# 输出格式：

使用HTML + Tailwind CSS，要求：
- 每个章节使用渐变背景卡片
- 数据对比使用表格
- 颜色区分：绿色=优势，红色=劣势，蓝色=中性
- 添加emoji图标

请开始生成对比报告：
"""

        # 调用Gemini API流式生成
        try:
            from google.genai import types
            import json

            contents = uploaded_files + [prompt]

            # 流式调用
            response_stream = client.models.generate_content_stream(
                model='gemini-3-flash-preview',
                contents=contents
            )

            # 流式输出结果
            for chunk in response_stream:
                if chunk.text:
                    yield "data: " + json.dumps({
                        'status': 'streaming',
                        'chunk': chunk.text
                    }) + "\n\n"

            # 发送完成信号
            yield "data: " + json.dumps({
                'status': 'completed',
                'message': '对比报告生成完成'
            }) + "\n\n"

            logger.info("✅ 流式对比报告生成完成")

        except Exception as e:
            logger.error(f"❌ Gemini流式调用失败: {str(e)}")
            yield "data: " + json.dumps({'error': f'生成对比报告失败: {str(e)}'}) + "\n\n"

    except Exception as e:
        logger.error(f"❌ 流式对比PDF失败: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        yield "data: " + json.dumps({'error': f'对比PDF失败: {str(e)}'}) + "\n\n"


def generate_comparison_report(documents_data):
    """
    使用Gemini生成3份保险计划书的对比分析报告

    Args:
        documents_data: 列表，包含2-3份计划书的数据字典
                       每个字典包含: file_name, insured_name, insurance_product,
                       insurance_company, annual_premium, table1等字段

    Returns:
        dict: {
            'success': bool,
            'comparison_data': dict,  # 结构化对比数据
            'summary': str,           # HTML格式的对比总结
            'error': str              # 错误信息（如果失败）
        }
    """
    try:
        logger.info("=" * 80)
        logger.info(f"📊 开始生成对比分析报告 - 文档数量: {len(documents_data)}")

        client, api_key = get_gemini_client()
        if not client:
            return {
                'success': False,
                'error': 'Gemini API密钥未配置或无效'
            }

        # 构建对比提示词
        prompt = f"""你是一位专业的保险顾问，请对比分析以下{len(documents_data)}份保险计划书，生成详细的对比报告。

# 计划书信息：

"""
        # 添加每份计划书的基本信息
        for i, doc in enumerate(documents_data, 1):
            prompt += f"""
## 计划书{i}：{doc.get('file_name', '未命名')}

**基本信息：**
- 受保人：{doc.get('insured_name', '未知')}
- 年龄：{doc.get('insured_age', '未知')}岁
- 性别：{doc.get('insured_gender', '未知')}
- 保险公司：{doc.get('insurance_company', '未知')}
- 产品名称：{doc.get('insurance_product', '未知')}
- 年缴保费：{doc.get('annual_premium', '未知')}
- 缴费年数：{doc.get('payment_years', '未知')}年
- 总保费：{doc.get('total_premium', '未知')}
- 基本保额：{doc.get('sum_assured', '未知')}
- 保险期限：{doc.get('insurance_period', '未知')}

"""
            # 添加table1数据（如果有）
            if doc.get('table1'):
                table1_data = doc['table1']
                if isinstance(table1_data, dict):
                    # 获取年度价值表数据
                    annual_data = table1_data.get('data', [])
                    if annual_data and len(annual_data) > 0:
                        prompt += f"**年度退保价值表（部分数据）：**\n"
                        # 只显示前5年和最后1年的数据
                        sample_years = annual_data[:5]
                        if len(annual_data) > 5:
                            sample_years.append(annual_data[-1])

                        for year_data in sample_years:
                            year = year_data.get('保单年度终结') or year_data.get('year', '?')
                            guaranteed = year_data.get('保证现金价值') or year_data.get('guaranteed_cash_value', '?')
                            non_guaranteed = year_data.get('非保证现金价值') or year_data.get('non_guaranteed_cash_value', '?')
                            total = year_data.get('总现金价值') or year_data.get('total_cash_value', '?')
                            prompt += f"  第{year}年: 保证现金价值={guaranteed}, 非保证现金价值={non_guaranteed}, 总现金价值={total}\n"

                        if len(annual_data) > 6:
                            prompt += f"  ... (共{len(annual_data)}年数据)\n"

                    # 添加财务规划总结（如果有）
                    financial_summary = table1_data.get('financial_planning_summary', '')
                    if financial_summary:
                        prompt += f"\n**财务规划总结：**\n{financial_summary}\n"

        prompt += f"""

# 对比分析要求：

请从以下几个维度进行深度对比分析：

1. **保费投入对比**
   - 对比年缴保费、缴费年数、总保费
   - 分析性价比（保费与保额比率）
   - 资金占用情况

2. **保障范围对比**
   - 基本保额对比
   - 保险期限对比
   - 保障类型和范围

3. **现金价值对比**（如果有退保价值表数据）
   - 第5年、第10年、第20年的保证现金价值对比
   - 非保证现金价值的增长趋势
   - 总现金价值的回本年限

4. **内部收益率(IRR)分析**
   - 计算并对比各计划书的预期IRR
   - 分析哪个计划的长期收益更优

5. **适用人群分析**
   - 根据受保人年龄、性别、保费预算等因素
   - 分析每份计划书的适用场景
   - 给出推荐建议

6. **优劣势总结**
   - 列出每份计划书的核心优势
   - 指出可能的劣势或风险点
   - 综合评分（满分10分）

# 输出格式要求：

请以HTML格式输出对比报告，包含：
- 使用<div>、<h3>、<table>、<ul>等标签
- 使用Tailwind CSS类名进行样式美化
- 数据对比使用表格形式
- 重要信息使用颜色高亮（绿色=优势，红色=劣势，蓝色=中性）
- 添加清晰的章节标题和分隔线

示例结构：
<div class="space-y-6">
  <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
    <h3 class="text-lg font-semibold mb-3">📊 保费投入对比</h3>
    <table class="w-full text-sm">...</table>
  </div>
  <!-- 其他章节 -->
</div>

请开始生成对比报告：
"""

        logger.info(f"📝 提示词长度: {len(prompt)} 字符")

        # 调用Gemini API
        try:
            response = client.models.generate_content(
                model='gemini-3-flash-preview',
                contents=[types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)]
                )]
            )

            summary_html = response.text.strip()
            logger.info(f"✅ 对比报告生成成功，长度: {len(summary_html)} 字符")

            # 构建结构化对比数据
            comparison_data = {
                'document_count': len(documents_data),
                'documents_basic_info': []
            }

            for doc in documents_data:
                comparison_data['documents_basic_info'].append({
                    'file_name': doc.get('file_name'),
                    'insured_name': doc.get('insured_name'),
                    'insurance_company': doc.get('insurance_company'),
                    'insurance_product': doc.get('insurance_product'),
                    'annual_premium': doc.get('annual_premium'),
                    'total_premium': doc.get('total_premium'),
                    'sum_assured': doc.get('sum_assured')
                })

            return {
                'success': True,
                'comparison_data': comparison_data,
                'summary': summary_html
            }

        except Exception as e:
            logger.error(f"❌ Gemini API调用失败: {str(e)}")
            return {
                'success': False,
                'error': f'生成对比报告失败: {str(e)}'
            }

    except Exception as e:
        logger.error(f"❌ 生成对比报告失败: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            'success': False,
            'error': f'生成对比报告失败: {str(e)}'
        }
