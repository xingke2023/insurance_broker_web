"""
Gemini PDF 对比分析 API 视图
"""

import base64
import json
import logging
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import ComparisonReport
from .gemini_comparison_service import GeminiComparisonService

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def gemini_compare_plans(request):
    """
    使用 Gemini 直接对比分析 2-3 份 PDF 计划书

    请求体（multipart/form-data）：
    - pdf_1: File (必填)
    - file_name_1: String (必填)
    - pdf_2: File (必填)
    - file_name_2: String (必填)
    - pdf_3: File (可选)
    - file_name_3: String (可选)
    - title: String (可选) - 对比标题

    返回：
    {
        "id": 123,
        "title": "3份计划书对比分析",
        "report": "Markdown格式的对比报告...",
        "status": "completed",
        "created_at": "2024-01-01 12:00:00"
    }
    """
    try:
        # 1. 获取上传的 PDF 文件
        pdf_files = []
        file_names = []
        pdf_base64_list = []

        # 处理必填的前两个文件
        for i in [1, 2]:
            pdf_key = f'pdf_{i}'
            name_key = f'file_name_{i}'

            if pdf_key not in request.FILES:
                return Response({
                    'error': f'缺少必填文件: {pdf_key}'
                }, status=status.HTTP_400_BAD_REQUEST)

            pdf_file = request.FILES[pdf_key]
            file_name = request.data.get(name_key, pdf_file.name)

            # 读取文件内容
            pdf_data = pdf_file.read()
            pdf_files.append(pdf_data)
            file_names.append(file_name)

            # 转换为 base64（用于存储）
            pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
            pdf_base64_list.append(pdf_base64)

        # 处理可选的第三个文件
        if 'pdf_3' in request.FILES:
            pdf_file = request.FILES['pdf_3']
            file_name = request.data.get('file_name_3', pdf_file.name)

            pdf_data = pdf_file.read()
            pdf_files.append(pdf_data)
            file_names.append(file_name)

            pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
            pdf_base64_list.append(pdf_base64)

        # 获取标题
        title = request.data.get('title', f'{len(pdf_files)}份计划书对比分析')

        logger.info(f'收到对比请求：{len(pdf_files)} 份 PDF，用户：{request.user.username}')

        # 2. 创建对比报告记录
        comparison = ComparisonReport.objects.create(
            user=request.user,
            comparison_title=title,
            pdf1_base64=pdf_base64_list[0],
            pdf1_filename=file_names[0],
            pdf2_base64=pdf_base64_list[1],
            pdf2_filename=file_names[1],
            pdf3_base64=pdf_base64_list[2] if len(pdf_base64_list) > 2 else '',
            pdf3_filename=file_names[2] if len(file_names) > 2 else '',
            status='processing',
            report_format='markdown'
        )

        # 3. 调用 Gemini 分析服务
        try:
            gemini_service = GeminiComparisonService()
            report_text = gemini_service.compare_plans(pdf_files, file_names)

            # 4. 保存分析结果
            comparison.comparison_summary = report_text
            comparison.status = 'completed'
            comparison.save()

            logger.info(f'对比分析完成：ID={comparison.id}')

            # 5. 返回结果
            return Response({
                'id': comparison.id,
                'title': comparison.comparison_title,
                'report': report_text,
                'report_format': 'markdown',
                'status': 'completed',
                'file_names': file_names,
                'created_at': comparison.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            # 更新状态为失败
            comparison.status = 'failed'
            comparison.error_message = str(e)
            comparison.save()

            logger.error(f'Gemini 分析失败：{str(e)}')

            return Response({
                'error': f'分析失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f'处理对比请求失败：{str(e)}')
        return Response({
            'error': f'请求处理失败: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def gemini_compare_plans_stream(request):
    """
    使用 Gemini 流式对比分析 2-3 份 PDF 计划书

    请求体（multipart/form-data）：同上

    返回：Server-Sent Events (SSE) 流
    """
    try:
        # 1. 获取上传的 PDF 文件（同上）
        pdf_files = []
        file_names = []
        pdf_base64_list = []

        for i in [1, 2]:
            pdf_key = f'pdf_{i}'
            name_key = f'file_name_{i}'

            if pdf_key not in request.FILES:
                return Response({
                    'error': f'缺少必填文件: {pdf_key}'
                }, status=status.HTTP_400_BAD_REQUEST)

            pdf_file = request.FILES[pdf_key]
            file_name = request.data.get(name_key, pdf_file.name)

            pdf_data = pdf_file.read()
            pdf_files.append(pdf_data)
            file_names.append(file_name)

            pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
            pdf_base64_list.append(pdf_base64)

        if 'pdf_3' in request.FILES:
            pdf_file = request.FILES['pdf_3']
            file_name = request.data.get('file_name_3', pdf_file.name)

            pdf_data = pdf_file.read()
            pdf_files.append(pdf_data)
            file_names.append(file_name)

            pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
            pdf_base64_list.append(pdf_base64)

        title = request.data.get('title', f'{len(pdf_files)}份计划书对比分析')

        logger.info(f'收到流式对比请求：{len(pdf_files)} 份 PDF')

        # 2. 创建对比报告记录
        comparison = ComparisonReport.objects.create(
            user=request.user,
            comparison_title=title,
            pdf1_base64=pdf_base64_list[0],
            pdf1_filename=file_names[0],
            pdf2_base64=pdf_base64_list[1],
            pdf2_filename=file_names[1],
            pdf3_base64=pdf_base64_list[2] if len(pdf_base64_list) > 2 else '',
            pdf3_filename=file_names[2] if len(file_names) > 2 else '',
            status='processing',
            report_format='markdown'
        )

        # 3. 定义 SSE 生成器
        def event_stream():
            try:
                # 发送开始事件
                yield f'data: {json.dumps({"status": "analyzing", "message": "AI正在分析计划书...", "progress": 10})}\n\n'

                # 调用 Gemini 流式分析
                gemini_service = GeminiComparisonService()
                full_text = ''

                for chunk in gemini_service.compare_plans_stream(pdf_files, file_names):
                    full_text += chunk
                    # 发送内容片段
                    yield f'data: {json.dumps({"status": "streaming", "chunk": chunk})}\n\n'

                # 保存完整报告
                comparison.comparison_summary = full_text
                comparison.status = 'completed'
                comparison.save()

                # 发送完成事件
                yield f'data: {json.dumps({"status": "completed", "id": comparison.id, "message": "分析完成！"})}\n\n'

            except Exception as e:
                logger.error(f'流式分析失败：{str(e)}')
                comparison.status = 'failed'
                comparison.error_message = str(e)
                comparison.save()

                yield f'data: {json.dumps({"status": "error", "error": str(e)})}\n\n'

        # 4. 返回流式响应
        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response

    except Exception as e:
        logger.error(f'处理流式对比请求失败：{str(e)}')
        return Response({
            'error': f'请求处理失败: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_comparison_history(request):
    """
    获取用户的对比历史记录

    返回：
    {
        "comparisons": [
            {
                "id": 123,
                "title": "3份计划书对比分析",
                "file_names": ["plan1.pdf", "plan2.pdf", "plan3.pdf"],
                "status": "completed",
                "created_at": "2024-01-01 12:00:00"
            },
            ...
        ]
    }
    """
    try:
        comparisons = ComparisonReport.objects.filter(user=request.user).order_by('-created_at')

        data = []
        for comp in comparisons:
            file_names = [comp.pdf1_filename, comp.pdf2_filename]
            if comp.pdf3_filename:
                file_names.append(comp.pdf3_filename)

            data.append({
                'id': comp.id,
                'title': comp.comparison_title,
                'file_names': file_names,
                'status': comp.status,
                'created_at': comp.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })

        return Response({
            'comparisons': data
        })

    except Exception as e:
        logger.error(f'获取对比历史失败：{str(e)}')
        return Response({
            'error': f'获取历史记录失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_comparison_detail(request, comparison_id):
    """
    获取对比报告详情

    返回：
    {
        "id": 123,
        "title": "3份计划书对比分析",
        "file_names": ["plan1.pdf", "plan2.pdf", "plan3.pdf"],
        "report": "Markdown格式的报告内容...",
        "report_format": "markdown",
        "status": "completed",
        "created_at": "2024-01-01 12:00:00"
    }
    """
    try:
        comparison = ComparisonReport.objects.get(id=comparison_id, user=request.user)

        file_names = [comparison.pdf1_filename, comparison.pdf2_filename]
        if comparison.pdf3_filename:
            file_names.append(comparison.pdf3_filename)

        return Response({
            'id': comparison.id,
            'title': comparison.comparison_title,
            'file_names': file_names,
            'report': comparison.comparison_summary,
            'report_format': comparison.report_format,
            'status': comparison.status,
            'error_message': comparison.error_message,
            'created_at': comparison.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })

    except ComparisonReport.DoesNotExist:
        return Response({
            'error': '对比报告不存在'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f'获取对比详情失败：{str(e)}')
        return Response({
            'error': f'获取详情失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_comparison_pdf(request, comparison_id, pdf_number):
    """
    下载对比报告中的某个 PDF 文件

    参数：
    - comparison_id: 对比报告ID
    - pdf_number: PDF编号（1, 2, 或 3）

    返回：PDF 文件流
    """
    try:
        comparison = ComparisonReport.objects.get(id=comparison_id, user=request.user)

        # 根据编号获取对应的 PDF 数据
        if pdf_number == 1:
            pdf_base64 = comparison.pdf1_base64
            filename = comparison.pdf1_filename
        elif pdf_number == 2:
            pdf_base64 = comparison.pdf2_base64
            filename = comparison.pdf2_filename
        elif pdf_number == 3:
            if not comparison.pdf3_base64:
                return Response({
                    'error': '计划书3不存在'
                }, status=status.HTTP_404_NOT_FOUND)
            pdf_base64 = comparison.pdf3_base64
            filename = comparison.pdf3_filename
        else:
            return Response({
                'error': 'PDF编号必须是 1, 2, 或 3'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 解码 base64
        pdf_data = base64.b64decode(pdf_base64)

        # 返回文件
        from django.http import HttpResponse
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except ComparisonReport.DoesNotExist:
        return Response({
            'error': '对比报告不存在'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f'下载 PDF 失败：{str(e)}')
        return Response({
            'error': f'下载失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_comparison(request, comparison_id):
    """
    删除对比报告

    返回：
    {
        "message": "对比报告已删除"
    }
    """
    try:
        comparison = ComparisonReport.objects.get(id=comparison_id, user=request.user)
        comparison.delete()

        return Response({
            'message': '对比报告已删除'
        })

    except ComparisonReport.DoesNotExist:
        return Response({
            'error': '对比报告不存在'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f'删除对比报告失败：{str(e)}')
        return Response({
            'error': f'删除失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
