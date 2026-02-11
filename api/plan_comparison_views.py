import logging
import base64
import json
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse, StreamingHttpResponse
from .models import PlanComparison
from .serializers import PlanComparisonSerializer
from .gemini_service import call_gemini_with_fallback, get_next_api_key
from .permissions import IsMemberActive
from google import genai
from google.genai import types
import io

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsMemberActive])
def compare_plans_gemini_stream(request):
    """
    使用Gemini直接分析2-3份PDF计划书并生成对比报告（流式输出）

    请求参数:
        - pdf1: PDF文件1 (必需)
        - pdf2: PDF文件2 (必需)
        - pdf3: PDF文件3 (可选)

    返回:
        Server-Sent Events (SSE) 流式数据
    """
    def generate():
        try:
            logger.info(f"📊 收到计划书流式对比请求，用户: {request.user.username}")

            # 检查是否上传了至少2个PDF
            pdf1 = request.FILES.get('pdf1')
            pdf2 = request.FILES.get('pdf2')
            pdf3 = request.FILES.get('pdf3')

            if not pdf1 or not pdf2:
                yield f"data: {json.dumps({'error': '请至少上传2份PDF计划书'})}\n\n"
                return

            pdf_files = [pdf1, pdf2]
            pdf_names = [pdf1.name, pdf2.name]

            if pdf3:
                pdf_files.append(pdf3)
                pdf_names.append(pdf3.name)

            logger.info(f"📄 收到{len(pdf_files)}份PDF文件: {', '.join(pdf_names)}")

            # 验证文件类型
            for pdf_file in pdf_files:
                if not pdf_file.name.lower().endswith('.pdf'):
                    yield f"data: {json.dumps({'error': f'文件{pdf_file.name}不是PDF格式'})}\n\n"
                    return

            # 发送上传进度
            yield f"data: {json.dumps({'status': 'uploading', 'message': '正在读取PDF文件...'})}\n\n"

            # 读取PDF文件并转换为base64
            pdf_base64_list = []
            pdf_bytes_list = []

            for i, pdf_file in enumerate(pdf_files, 1):
                yield f"data: {json.dumps({'status': 'uploading', 'message': f'正在读取文件 {i}/{len(pdf_files)}: {pdf_file.name}...'})}\n\n"

                pdf_bytes = pdf_file.read()
                pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
                pdf_base64_list.append(pdf_base64)
                pdf_bytes_list.append(pdf_bytes)
                logger.info(f"✅ {pdf_file.name} 读取成功，大小: {len(pdf_bytes)} 字节")

            # 构建Gemini提示词
            prompt = f"""请作为专业保险顾问，对比分析以下{len(pdf_files)}份保险计划书，生成详细的对比报告。

# 计划书文件：
"""
            for i, name in enumerate(pdf_names, 1):
                prompt += f"{i}. {name}\n"

            prompt += """

# 对比分析要求：

请从以下维度进行深度对比分析：

## 1. 保费对比
- 年缴保费、缴费年数、总保费
- 保费与保额比率（性价比）
- 资金占用情况

## 2. 保障对比
- 基本保额、保险期限
- 保障范围和类型
- 特殊保障条款

## 3. 现金价值对比（重点）
**注意：必须以保单年度终结为基准，展示完整的年度对比数据**
- 提取每份计划书的完整年度价值表（从第1年到最后一年）
- 对比关键年份：第5年、第10年、第20年、第30年的现金价值
- 保证现金价值 vs 非保证现金价值的增长趋势
- 回本年限对比
- 生成完整的年度对比表格，包含所有年度的数据

## 4. 提取计划对比
- 提取灵活性和条件
- 提取后的现金价值变化
- 部分退保规则

## 5. 适用人群分析
- 根据受保人年龄、性别、保费预算分析适用场景
- 给出推荐建议

## 6. 优劣势总结
- 列出每份计划书的核心优势（用绿色高亮）
- 指出劣势或风险点（用红色高亮）
- 综合评分（满分10分）

# 输出格式：

使用HTML格式，要求：
- 每个章节使用渐变背景卡片（div with Tailwind CSS classes）
- 年度对比数据使用完整的HTML表格，显示所有年度
- 颜色区分：绿色=优势，红色=劣势，蓝色=中性
- 添加emoji图标增强可读性
- 表格要清晰易读，使用合适的列宽和行高

**样式要求：**
- 所有文字必须使用深色（text-gray-900, text-gray-800, text-gray-700），绝对不要使用白色文字
- 背景色使用浅色（bg-white, bg-gray-50, bg-blue-50等）
- 确保文字和背景有足够的对比度，易于阅读
- 表格使用 class="table-auto w-full border-collapse" 等样式

**重要：请直接输出HTML代码，不要使用markdown代码块（不要使用```html标记），直接从<div>开始输出。**

请开始生成对比报告：
"""

            # 发送分析进度
            yield f"data: {json.dumps({'status': 'analyzing', 'message': 'AI正在深度分析对比...'})}\n\n"

            logger.info("🤖 正在调用Gemini API进行流式对比分析...")

            # 获取API密钥
            api_keys = get_next_api_key()

            last_error = None
            full_report = ""

            # 依次尝试每个API密钥
            for key_name, api_key in api_keys:
                try:
                    logger.info(f"🔑 [流式对比] 尝试使用{key_name}: {api_key[:10]}...")

                    client = genai.Client(api_key=api_key)

                    # 构建API请求
                    parts = []

                    # 添加PDF文件
                    for pdf_bytes in pdf_bytes_list:
                        parts.append(types.Part.from_bytes(data=pdf_bytes, mime_type='application/pdf'))

                    # 添加提示词
                    parts.append(types.Part.from_text(text=prompt))

                    contents = [types.Content(role="user", parts=parts)]

                    # 流式调用
                    for chunk in client.models.generate_content_stream(
                        model='gemini-3-flash-preview',
                        contents=contents
                    ):
                        if chunk.text:
                            full_report += chunk.text
                            yield f"data: {json.dumps({'status': 'streaming', 'chunk': chunk.text})}\n\n"

                    logger.info(f"✅ [流式对比] {key_name}调用成功")

                    # 成功后跳出循环
                    break

                except Exception as e:
                    error_msg = str(e)
                    logger.warning(f"⚠️ [流式对比] {key_name}失败: {error_msg}")
                    last_error = e
                    continue

            # 检查是否所有密钥都失败
            if not full_report:
                logger.error(f"❌ [流式对比] 所有API密钥均失败")
                yield f"data: {json.dumps({'error': f'对比分析失败: {str(last_error)}'})}\n\n"
                return

            logger.info(f"✅ 对比报告生成成功，长度: {len(full_report)} 字符")

            # 保存对比记录到数据库
            comparison = PlanComparison.objects.create(
                user=request.user,
                pdf1_name=pdf_names[0],
                pdf1_base64=pdf_base64_list[0],
                pdf2_name=pdf_names[1],
                pdf2_base64=pdf_base64_list[1],
                pdf3_name=pdf_names[2] if len(pdf_names) > 2 else '',
                pdf3_base64=pdf_base64_list[2] if len(pdf_base64_list) > 2 else '',
                comparison_report=full_report
            )

            logger.info(f"💾 对比记录已保存，ID: {comparison.id}")

            # 发送完成信号
            yield f"data: {json.dumps({'status': 'completed', 'comparison_id': comparison.id, 'message': '对比报告生成完成'})}\n\n"

        except Exception as e:
            logger.error(f"❌ 流式对比失败: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            yield f"data: {json.dumps({'error': f'对比分析失败: {str(e)}'})}\n\n"

    return StreamingHttpResponse(generate(), content_type='text/event-stream')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_comparison_history(request):
    """
    获取用户的对比历史记录

    返回:
        {
            "success": true,
            "comparisons": [
                {
                    "id": 1,
                    "pdf1_name": "计划书1.pdf",
                    "pdf2_name": "计划书2.pdf",
                    "pdf3_name": "计划书3.pdf",
                    "created_at": "2026-01-23T10:00:00Z"
                },
                ...
            ]
        }
    """
    try:
        comparisons = PlanComparison.objects.filter(user=request.user).order_by('-created_at')
        serializer = PlanComparisonSerializer(comparisons, many=True)

        return Response({
            'success': True,
            'comparisons': serializer.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"❌ 获取对比历史失败: {str(e)}")
        return Response({
            'success': False,
            'error': f'获取对比历史失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_comparison_detail(request, comparison_id):
    """
    获取单个对比记录的详细信息

    参数:
        comparison_id: 对比记录ID

    返回:
        {
            "success": true,
            "comparison": {
                "id": 1,
                "pdf1_name": "计划书1.pdf",
                "pdf2_name": "计划书2.pdf",
                "pdf3_name": "计划书3.pdf",
                "comparison_report": "HTML格式的对比报告",
                "created_at": "2026-01-23T10:00:00Z"
            }
        }
    """
    try:
        comparison = PlanComparison.objects.get(id=comparison_id, user=request.user)
        serializer = PlanComparisonSerializer(comparison)

        return Response({
            'success': True,
            'comparison': serializer.data
        }, status=status.HTTP_200_OK)

    except PlanComparison.DoesNotExist:
        return Response({
            'success': False,
            'error': '对比记录不存在'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.error(f"❌ 获取对比详情失败: {str(e)}")
        return Response({
            'success': False,
            'error': f'获取对比详情失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_comparison_pdf(request, comparison_id, pdf_number):
    """
    下载对比记录中的某个PDF文件

    参数:
        comparison_id: 对比记录ID
        pdf_number: PDF编号（1、2或3）

    返回:
        PDF文件
    """
    try:
        comparison = PlanComparison.objects.get(id=comparison_id, user=request.user)

        # 根据pdf_number选择对应的PDF
        if pdf_number == 1:
            pdf_base64 = comparison.pdf1_base64
            pdf_name = comparison.pdf1_name
        elif pdf_number == 2:
            pdf_base64 = comparison.pdf2_base64
            pdf_name = comparison.pdf2_name
        elif pdf_number == 3:
            if not comparison.pdf3_base64:
                return Response({
                    'success': False,
                    'error': 'PDF 3不存在'
                }, status=status.HTTP_404_NOT_FOUND)
            pdf_base64 = comparison.pdf3_base64
            pdf_name = comparison.pdf3_name
        else:
            return Response({
                'success': False,
                'error': 'PDF编号无效，必须是1、2或3'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 解码base64
        pdf_bytes = base64.b64decode(pdf_base64)

        # 返回PDF文件
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{pdf_name}"'
        return response

    except PlanComparison.DoesNotExist:
        return Response({
            'success': False,
            'error': '对比记录不存在'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.error(f"❌ 下载PDF失败: {str(e)}")
        return Response({
            'success': False,
            'error': f'下载PDF失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_comparison(request, comparison_id):
    """
    删除对比记录

    参数:
        comparison_id: 对比记录ID

    返回:
        {
            "success": true,
            "message": "删除成功"
        }
    """
    try:
        comparison = PlanComparison.objects.get(id=comparison_id, user=request.user)
        comparison.delete()

        logger.info(f"🗑️ 对比记录已删除，ID: {comparison_id}")

        return Response({
            'success': True,
            'message': '删除成功'
        }, status=status.HTTP_200_OK)

    except PlanComparison.DoesNotExist:
        return Response({
            'success': False,
            'error': '对比记录不存在'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.error(f"❌ 删除对比记录失败: {str(e)}")
        return Response({
            'success': False,
            'error': f'删除失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsMemberActive])
def chat_with_comparison(request, comparison_id):
    """
    基于对比结果进行对话（流式输出）

    请求参数:
        - message: 用户的问题

    返回:
        Server-Sent Events (SSE) 流式数据
    """
    def generate():
        try:
            logger.info(f"💬 收到对比对话请求，用户: {request.user.username}, 对比ID: {comparison_id}")

            # 获取用户问题
            message = request.data.get('message', '').strip()
            if not message:
                yield f"data: {json.dumps({'error': '请输入问题'})}\n\n"
                return

            # 获取对比记录
            try:
                comparison = PlanComparison.objects.get(id=comparison_id, user=request.user)
            except PlanComparison.DoesNotExist:
                yield f"data: {json.dumps({'error': '对比记录不存在'})}\n\n"
                return

            # 发送状态消息
            yield f"data: {json.dumps({'status': 'thinking', 'message': 'AI正在思考...'})}\n\n"

            # 构建上下文提示词
            context_prompt = f"""你是一位专业的保险顾问AI助手。用户刚刚对比了{2 if not comparison.pdf3_name else 3}份保险计划书。

对比报告如下：
{comparison.comparison_report}

现在用户向你提问：{message}

请基于上述对比报告，用专业、清晰的语言回答用户的问题。如果问题涉及具体数据，请引用对比报告中的内容。回答要简洁明了，重点突出。

**如果你需要使用HTML格式回答，请注意：**
- 所有文字必须使用深色（text-gray-900, text-gray-800等），绝对不要使用白色文字
- 背景色使用浅色（bg-white, bg-gray-50等）
- 确保文字和背景有足够的对比度
- 可以使用普通文本格式回答，不一定要用HTML"""

            # 获取API密钥列表（轮询）
            api_keys = get_next_api_key()

            full_response = ''
            success = False

            # 依次尝试每个API密钥
            for key_name, api_key in api_keys:
                try:
                    logger.info(f"🔑 [对比对话] 尝试使用{key_name}: {api_key[:20]}...")

                    client = genai.Client(api_key=api_key)

                    # 构建请求
                    parts = [types.Part.from_text(text=context_prompt)]
                    contents = [types.Content(role="user", parts=parts)]

                    # 发送分析中状态
                    yield f"data: {json.dumps({'status': 'streaming', 'message': 'AI正在回答...'})}\n\n"

                    # 流式生成回答
                    for chunk in client.models.generate_content_stream(
                        model='gemini-3-flash-preview',
                        contents=contents,
                        config=types.GenerateContentConfig(
                            temperature=0.7,
                            max_output_tokens=2048,
                        )
                    ):
                        if chunk.text:
                            full_response += chunk.text
                            yield f"data: {json.dumps({'status': 'streaming', 'chunk': chunk.text})}\n\n"

                    logger.info(f"✅ [对比对话] {key_name}调用成功，回答长度: {len(full_response)}")
                    success = True
                    break

                except Exception as e:
                    error_msg = str(e)
                    logger.warning(f"⚠️ [对比对话] {key_name}失败: {error_msg}")

                    # 检测是否是配额/限流错误
                    is_quota_error = any(keyword in error_msg.lower() for keyword in [
                        'quota', 'rate limit', 'resource exhausted', '429', 'too many requests'
                    ])

                    if is_quota_error:
                        logger.warning(f"📊 [对比对话] 检测到{key_name}超额限制，尝试下一个密钥...")

                    continue

            if not success or not full_response:
                logger.error("❌ [对比对话] 所有API密钥均失败")
                yield f"data: {json.dumps({'error': '对话失败，请稍后重试'})}\n\n"
                return

            # 发送完成信号
            yield f"data: {json.dumps({'status': 'completed', 'message': '回答完成'})}\n\n"

        except Exception as e:
            logger.error(f"❌ 对比对话失败: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            yield f"data: {json.dumps({'error': f'对话失败: {str(e)}'})}\n\n"

    return StreamingHttpResponse(generate(), content_type='text/event-stream')
