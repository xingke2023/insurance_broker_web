"""
计划书对比分析视图
支持同时上传和对比3份保险计划书
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import ComparisonReport, PlanDocument
from .gemini_service import generate_comparison_report, compare_pdfs_directly_stream
from django.http import StreamingHttpResponse
import json

logger = logging.getLogger(__name__)


class ComparisonReportViewSet(viewsets.ModelViewSet):
    """计划书对比报告视图集"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """只返回当前用户的对比报告"""
        return ComparisonReport.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        """动态返回序列化器"""
        from .serializers import ComparisonReportSerializer
        return ComparisonReportSerializer

    @action(detail=False, methods=['post'])
    def create_comparison(self, request):
        """
        创建对比分析报告

        请求参数:
        - document_ids: 列表，包含2-3个已完成分析的PlanDocument ID
        - title: 可选，对比报告标题
        """
        try:
            document_ids = request.data.get('document_ids', [])
            title = request.data.get('title', '计划书对比分析')

            # 验证文档数量
            if len(document_ids) < 2 or len(document_ids) > 3:
                return Response(
                    {'error': '请选择2-3份计划书进行对比'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 获取文档对象
            documents = []
            for doc_id in document_ids:
                try:
                    doc = PlanDocument.objects.get(id=doc_id, user=request.user)

                    # 检查文档是否已完成分析
                    if doc.status != 'completed':
                        return Response(
                            {'error': f'文档"{doc.file_name}"尚未完成分析，请等待分析完成后再进行对比'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    documents.append(doc)
                except PlanDocument.DoesNotExist:
                    return Response(
                        {'error': f'文档ID {doc_id} 不存在或无权访问'},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # 创建对比报告记录
            comparison = ComparisonReport.objects.create(
                user=request.user,
                comparison_title=title,
                document1=documents[0],
                document2=documents[1],
                document3=documents[2] if len(documents) > 2 else None,
                status='processing'
            )

            logger.info(f"✅ 创建对比报告 #{comparison.id}: {title}")

            # 调用Gemini生成对比分析
            try:
                # 准备文档数据
                docs_data = []
                for i, doc in enumerate(documents, 1):
                    doc_info = {
                        'id': doc.id,
                        'file_name': doc.file_name,
                        'insured_name': doc.insured_name,
                        'insured_age': doc.insured_age,
                        'insured_gender': doc.insured_gender,
                        'insurance_product': doc.insurance_product,
                        'insurance_company': doc.insurance_company,
                        'annual_premium': doc.annual_premium,
                        'payment_years': doc.payment_years,
                        'total_premium': doc.total_premium,
                        'sum_assured': doc.sum_assured,
                        'insurance_period': doc.insurance_period,
                    }

                    # 添加table1数据（退保价值表）
                    if doc.table1:
                        try:
                            table1_data = json.loads(doc.table1) if isinstance(doc.table1, str) else doc.table1
                            doc_info['table1'] = table1_data
                        except:
                            pass

                    docs_data.append(doc_info)

                # 生成对比报告
                result = generate_comparison_report(docs_data)

                if result.get('success'):
                    # 保存对比结果
                    comparison.comparison_result = result.get('comparison_data', {})
                    comparison.comparison_summary = result.get('summary', '')
                    comparison.status = 'completed'
                    comparison.save()

                    logger.info(f"✅ 对比报告 #{comparison.id} 生成成功")

                    from .serializers import ComparisonReportSerializer
                    serializer = ComparisonReportSerializer(comparison)
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                else:
                    error_msg = result.get('error', '生成对比报告失败')
                    comparison.status = 'failed'
                    comparison.error_message = error_msg
                    comparison.save()

                    logger.error(f"❌ 对比报告 #{comparison.id} 生成失败: {error_msg}")
                    return Response(
                        {'error': error_msg},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

            except Exception as e:
                error_msg = f"生成对比报告时出错: {str(e)}"
                logger.error(error_msg)
                comparison.status = 'failed'
                comparison.error_message = error_msg
                comparison.save()

                return Response(
                    {'error': error_msg},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            logger.error(f"❌ 创建对比报告失败: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def list_comparisons(self, request):
        """获取当前用户的所有对比报告列表"""
        comparisons = self.get_queryset().order_by('-created_at')
        from .serializers import ComparisonReportListSerializer
        serializer = ComparisonReportListSerializer(comparisons, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def get_comparison(self, request, pk=None):
        """获取单个对比报告详情"""
        comparison = get_object_or_404(ComparisonReport, pk=pk, user=request.user)
        from .serializers import ComparisonReportSerializer
        serializer = ComparisonReportSerializer(comparison)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """删除对比报告"""
        comparison = self.get_object()
        logger.info(f"🗑️ 删除对比报告 #{comparison.id}: {comparison.comparison_title}")
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'])
    def direct_compare(self, request):
        """
        直接对比PDF文件（不需要先上传和分析）

        请求参数（multipart/form-data）:
        - pdf_1: 第一份PDF文件
        - pdf_2: 第二份PDF文件
        - pdf_3: 第三份PDF文件（可选）
        - file_name_1: 第一份文件名
        - file_name_2: 第二份文件名
        - file_name_3: 第三份文件名（可选）
        - file_count: 文件数量
        - title: 对比标题（可选）
        """
        try:
            file_count = int(request.data.get('file_count', 2))
            title = request.data.get('title', '计划书对比分析')

            # 获取上传的PDF文件
            pdf_files = []
            file_names = []

            for i in range(1, file_count + 1):
                pdf_file = request.FILES.get(f'pdf_{i}')
                file_name = request.data.get(f'file_name_{i}', f'计划书{i}.pdf')

                if not pdf_file:
                    return Response(
                        {'error': f'缺少PDF文件{i}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # 验证文件类型
                if not pdf_file.name.endswith('.pdf'):
                    return Response(
                        {'error': f'文件{i}不是PDF格式'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # 验证文件大小（最大50MB）
                if pdf_file.size > 50 * 1024 * 1024:
                    return Response(
                        {'error': f'文件{i}大小超过50MB'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                pdf_files.append(pdf_file)
                file_names.append(file_name)

            logger.info(f"📊 直接对比{file_count}份PDF: {', '.join(file_names)}")

            # 创建对比报告记录（status=processing）
            comparison = ComparisonReport.objects.create(
                user=request.user,
                comparison_title=title,
                status='processing'
            )

            # 调用Gemini直接对比PDF
            result = compare_pdfs_directly(pdf_files, file_names)

            if not result.get('success'):
                error_msg = result.get('error', '对比失败')
                logger.error(f"❌ 对比失败: {error_msg}")

                comparison.status = 'failed'
                comparison.error_message = error_msg
                comparison.save()

                return Response(
                    {'error': error_msg},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # 保存对比结果
            comparison.comparison_result = result.get('comparison_data', {})
            comparison.comparison_summary = result.get('summary', '')
            comparison.status = 'completed'
            comparison.save()

            logger.info(f"✅ 对比报告 #{comparison.id} 生成成功")

            # 返回结果
            return Response({
                'id': comparison.id,
                'comparison_title': comparison.comparison_title,
                'comparison_summary': comparison.comparison_summary,
                'comparison_result': comparison.comparison_result,
                'status': comparison.status,
                'created_at': comparison.created_at,
                'file_names': file_names
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"❌ 直接对比PDF失败: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())

            return Response(
                {'error': f'对比失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def direct_compare_stream(request):
    """
    流式对比PDF文件（Server-Sent Events）

    请求参数（multipart/form-data）:
    - pdf_1: 第一份PDF文件
    - pdf_2: 第二份PDF文件
    - pdf_3: 第三份PDF文件（可选）
    - file_name_1: 第一份文件名
    - file_name_2: 第二份文件名
    - file_name_3: 第三份文件名（可选）
    - file_count: 文件数量
    - title: 对比标题（可选）
    """
    try:
        logger.info(f"📥 收到流式对比请求 - User: {request.user}, FILES: {list(request.FILES.keys())}, DATA: {list(request.data.keys())}")
        file_count = int(request.data.get('file_count', 2))
        title = request.data.get('title', '计划书对比分析')

        # 获取上传的PDF文件
        pdf_files = []
        file_names = []

        for i in range(1, file_count + 1):
            pdf_file = request.FILES.get(f'pdf_{i}')
            file_name = request.data.get(f'file_name_{i}', f'计划书{i}.pdf')

            if not pdf_file:
                return Response(
                    {'error': f'缺少PDF文件{i}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not pdf_file.name.endswith('.pdf'):
                return Response(
                    {'error': f'文件{i}不是PDF格式'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if pdf_file.size > 50 * 1024 * 1024:
                return Response(
                    {'error': f'文件{i}大小超过50MB'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            pdf_files.append(pdf_file)
            file_names.append(file_name)

        logger.info(f"📊 流式对比{file_count}份PDF: {', '.join(file_names)}")

        # 创建对比报告记录
        comparison = ComparisonReport.objects.create(
            user=request.user,
            comparison_title=title,
            status='processing'
        )

        # 流式生成器函数
        def event_stream():
            full_summary = ""
            try:
                for event in compare_pdfs_directly_stream(pdf_files, file_names):
                    # 解析事件数据
                    if event.startswith('data: '):
                        event_data = json.loads(event[6:])

                        # 累积HTML内容
                        if 'chunk' in event_data:
                            full_summary += event_data['chunk']

                        # 检查是否完成
                        if event_data.get('status') == 'completed':
                            # 保存完整结果到数据库
                            comparison.comparison_summary = full_summary
                            comparison.comparison_result = {
                                'file_count': file_count,
                                'file_names': file_names
                            }
                            comparison.status = 'completed'
                            comparison.save()

                            # 发送最终ID
                            yield f"data: {json.dumps({'status': 'completed', 'id': comparison.id})}\n\n"

                        # 检查错误
                        elif 'error' in event_data:
                            comparison.status = 'failed'
                            comparison.error_message = event_data['error']
                            comparison.save()

                        # 转发事件
                        yield event
                    else:
                        yield event

            except Exception as e:
                logger.error(f"❌ 流式生成出错: {str(e)}")
                comparison.status = 'failed'
                comparison.error_message = str(e)
                comparison.save()
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        # 返回SSE响应
        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'  # 禁用nginx缓冲
        return response

    except Exception as e:
        logger.error(f"❌ 流式对比初始化失败: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return Response(
            {'error': f'初始化失败: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
