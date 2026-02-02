from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import FileResponse, HttpResponse
from django.core.files.uploadedfile import InMemoryUploadedFile
import fitz  # PyMuPDF
import pdfplumber
from pypdf import PdfReader  # 备用提取方案
import io
import os
import tempfile


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_pdf_footer(request):
    """
    移除PDF文件指定区域

    参数:
    - pdf_file: PDF文件
    - remove_areas: JSON字符串，包含6个区域的配置
    - process_start_page: 处理开始页码，从原文件第几页开始处理（默认1）
    - process_end_page: 处理结束页码，处理到原文件第几页，0表示到最后一页（默认0）
    - page_number_start: 起始页码编号，从原文件第几页开始添加"第1页"（默认1）
    - save_start_page: 保存起始页，只保存从这一页开始的内容（默认1）
    - save_end_page: 保存结束页，0表示保存到最后一页（默认0）
    """
    print(f'\n🔄 收到PDF页脚移除请求')
    print(f'   用户: {request.user.username}')
    print(f'   请求方法: {request.method}')

    try:
        # 获取上传的PDF文件
        pdf_file = request.FILES.get('pdf_file')
        if not pdf_file:
            print('❌ 未找到PDF文件')
            return Response({
                'status': 'error',
                'message': '请上传PDF文件'
            }, status=400)

        print(f'   文件名: {pdf_file.name}')
        print(f'   文件大小: {pdf_file.size} bytes ({pdf_file.size / 1024 / 1024:.2f} MB)')

        # 检查文件类型
        if not pdf_file.name.endswith('.pdf'):
            return Response({
                'status': 'error',
                'message': '只支持PDF格式文件'
            }, status=400)

        # 获取自定义文字
        custom_text = request.POST.get('custom_text', '').strip()

        # 获取处理开始页码（从第几页开始处理，默认从第1页开始）
        try:
            process_start_page = int(request.POST.get('process_start_page', 1))
            if process_start_page < 1:
                process_start_page = 1
        except (ValueError, TypeError):
            process_start_page = 1

        # 获取处理结束页码（处理到第几页，默认0表示到最后一页）
        try:
            process_end_page = int(request.POST.get('process_end_page', 0))
            if process_end_page < 0:
                process_end_page = 0
        except (ValueError, TypeError):
            process_end_page = 0

        # 获取起始页码编号（从原文件第几页开始添加"第1页"，默认从第1页开始）
        try:
            page_number_start = int(request.POST.get('page_number_start', 1))
            if page_number_start < 1:
                page_number_start = 1
        except (ValueError, TypeError):
            page_number_start = 1

        # 获取保存页面范围
        try:
            save_start_page = int(request.POST.get('save_start_page', 1))
            if save_start_page < 1:
                save_start_page = 1
        except (ValueError, TypeError):
            save_start_page = 1

        try:
            save_end_page = int(request.POST.get('save_end_page', 0))
            if save_end_page < 0:
                save_end_page = 0
        except (ValueError, TypeError):
            save_end_page = 0

        # 获取PDF密码（如果有）
        pdf_password = request.POST.get('pdf_password', '').strip()

        # 解析擦除区域参数
        import json
        remove_areas_str = request.POST.get('remove_areas', '{}')
        try:
            remove_areas = json.loads(remove_areas_str)
            print(f'   擦除区域配置: {remove_areas}')
        except json.JSONDecodeError:
            print('❌ 擦除区域参数格式错误')
            return Response({
                'status': 'error',
                'message': '擦除区域参数格式错误'
            }, status=400)

        # 获取要删除的文字列表
        remove_texts_str = request.POST.get('remove_texts', '[]')
        try:
            remove_texts = json.loads(remove_texts_str)
            if remove_texts:
                print(f'   要删除的文字: {remove_texts}')
        except json.JSONDecodeError:
            remove_texts = []

        # 读取PDF文件
        print('   读取PDF文件...')
        pdf_bytes = pdf_file.read()
        print(f'   读取完成: {len(pdf_bytes)} bytes')

        # 使用PyMuPDF处理PDF
        print('   打开PDF文档...')
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        print(f'   PDF打开成功，共 {len(pdf_document)} 页')

        # 检查PDF是否加密
        if pdf_document.is_encrypted:
            # 尝试解密
            if pdf_password:
                # 使用提供的密码解密
                auth_result = pdf_document.authenticate(pdf_password)
                if not auth_result:
                    pdf_document.close()
                    return Response({
                        'status': 'error',
                        'message': '密码错误，请检查后重试'
                    }, status=400)
            else:
                # 尝试空密码
                auth_result = pdf_document.authenticate("")
                if not auth_result:
                    pdf_document.close()
                    return Response({
                        'status': 'error',
                        'message': '此PDF已加密，请提供密码',
                        'requires_password': True
                    }, status=400)

        # 获取总页数
        total_pages = len(pdf_document)

        # 验证处理开始页码
        if process_start_page > total_pages:
            pdf_document.close()
            return Response({
                'status': 'error',
                'message': f'处理开始页码({process_start_page})超过PDF总页数({total_pages})'
            }, status=400)

        # 如果process_end_page为0或超过总页数，设置为总页数
        if process_end_page == 0 or process_end_page > total_pages:
            process_end_page = total_pages

        # 验证处理页码范围
        if process_start_page > process_end_page:
            pdf_document.close()
            return Response({
                'status': 'error',
                'message': f'处理开始页码({process_start_page})不能大于结束页码({process_end_page})'
            }, status=400)

        # 验证保存页面范围
        if save_start_page > total_pages:
            pdf_document.close()
            return Response({
                'status': 'error',
                'message': f'保存起始页({save_start_page})超过PDF总页数({total_pages})'
            }, status=400)

        # 如果save_end_page为0或超过总页数，设置为总页数
        if save_end_page == 0 or save_end_page > total_pages:
            save_end_page = total_pages

        # 验证页面范围
        if save_start_page > save_end_page:
            pdf_document.close()
            return Response({
                'status': 'error',
                'message': f'保存起始页({save_start_page})不能大于结束页({save_end_page})'
            }, status=400)

        print(f'   页面范围：保存第 {save_start_page} 页到第 {save_end_page} 页（共 {save_end_page - save_start_page + 1} 页）')

        # 遍历每一页，从处理开始页码到处理结束页码（索引从0开始，所以需要-1）
        print(f'   开始处理页面：从第 {process_start_page} 页到第 {process_end_page} 页')
        for page_num in range(process_start_page - 1, process_end_page):
            page = pdf_document[page_num]
            if page_num == process_start_page - 1:
                print(f'   处理第 {page_num + 1} 页...')

            # 检查并修正页面旋转（只修正倒置的页面180度 -> 0度）
            rotation = page.rotation
            if rotation == 180:
                # 将倒置的页面旋转到正常方向（0度）
                page.set_rotation(0)

            # 获取页面尺寸
            page_rect = page.rect
            page_width = page_rect.width
            page_height = page_rect.height

            # 判断是否为倒数第二页
            is_second_last_page = (page_num == total_pages - 2)

            # 处理页眉-通栏
            if remove_areas.get('headerFull', {}).get('enabled', False):
                h = remove_areas['headerFull'].get('height', 50)
                rect = fitz.Rect(0, 0, page_width, h)
                page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))

            # 处理页眉-左上
            if remove_areas.get('headerLeft', {}).get('enabled', False):
                w = remove_areas['headerLeft'].get('width', 100)
                h = remove_areas['headerLeft'].get('height', 100)
                rect = fitz.Rect(0, 0, w, h)
                page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))

            # 处理页眉-右上
            if remove_areas.get('headerRight', {}).get('enabled', False):
                w = remove_areas['headerRight'].get('width', 100)
                h = remove_areas['headerRight'].get('height', 100)
                rect = fitz.Rect(page_width - w, 0, page_width, h)
                page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))

            # 处理页脚-通栏
            footer_enabled = remove_areas.get('footerFull', {}).get('enabled', False)
            footer_height = remove_areas.get('footerFull', {}).get('height', 50)

            if footer_enabled:
                rect = fitz.Rect(0, page_height - footer_height, page_width, page_height)
                page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))

            # 处理页脚-左下
            if remove_areas.get('footerLeft', {}).get('enabled', False):
                w = remove_areas['footerLeft'].get('width', 100)
                h = remove_areas['footerLeft'].get('height', 100)
                rect = fitz.Rect(0, page_height - h, w, page_height)
                page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))

            # 处理页脚-右下
            if remove_areas.get('footerRight', {}).get('enabled', False):
                w = remove_areas['footerRight'].get('width', 100)
                h = remove_areas['footerRight'].get('height', 100)
                rect = fitz.Rect(page_width - w, page_height - h, page_width, page_height)
                page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))

            # 🆕 处理倒数第二页特殊擦除区域（保险顾问姓名）
            if is_second_last_page:
                advisor_area = remove_areas.get('secondLastPageAdvisor', {})
                if advisor_area.get('enabled', False):
                    # 获取擦除区域配置
                    x_offset = advisor_area.get('x', 0)
                    y_offset = advisor_area.get('y', 0)
                    width = advisor_area.get('width', 200)
                    height = advisor_area.get('height', 100)

                    # 创建擦除矩形（左下角坐标）
                    rect = fitz.Rect(
                        x_offset,
                        page_height - y_offset - height,
                        x_offset + width,
                        page_height - y_offset
                    )
                    page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))
                    print(f'   🔍 倒数第二页（第{page_num + 1}页）：擦除保险顾问姓名区域 ({width}x{height}px)')

            # 🆕 删除指定文字
            if remove_texts:
                for text_to_remove in remove_texts:
                    if not text_to_remove.strip():
                        continue

                    # 搜索文字在页面中的位置
                    text_instances = page.search_for(text_to_remove)

                    if text_instances:
                        for inst in text_instances:
                            # 用白色矩形覆盖文字
                            page.draw_rect(inst, color=(1, 1, 1), fill=(1, 1, 1))

                        print(f'   ✂️ 第{page_num + 1}页：删除文字 "{text_to_remove}" ({len(text_instances)}处)')

            # 如果页脚通栏启用，添加页码文字
            if footer_enabled:
                # 当前页码（从1开始，page_num是从0开始的索引）
                current_page_number = page_num + 1

                # 只有当当前页码 >= page_number_start 时才添加页码
                # 例如：page_number_start=3，则第1,2页不添加页码，从第3页开始显示"第1页"
                if current_page_number >= page_number_start:
                    # 显示的页码 = 当前页码 - 起始页码 + 1
                    # 例如：当前第3页，起始页码3，显示"第1页" (3-3+1=1)
                    display_page_num = current_page_number - page_number_start + 1
                    # 总页数 = 从起始页码到处理结束页的数量
                    # 例如：处理第3-10页，从第3页开始编号，总数=10-3+1=8页
                    display_total_pages = process_end_page - page_number_start + 1
                    page_text = f"第{display_page_num}页，共{display_total_pages}页"

                    # 如果有自定义文字，添加到页码下方
                    if custom_text:
                        page_text += f"\n{custom_text}"

                    # 创建文本框区域（整个页脚宽度，向下偏移）
                    # 向下偏移40px，让页码显示在页脚擦除区域的更靠下位置
                    vertical_offset = 40
                    text_rect = fitz.Rect(
                        0,  # 左边界
                        page_height - footer_height + vertical_offset,  # 上边界（向下偏移）
                        page_width,  # 右边界
                        page_height  # 下边界
                    )

                    # 插入居中文字（使用textbox支持中文，支持多行）
                    page.insert_textbox(
                        text_rect,
                        page_text,
                        fontsize=8,  # 字体大小改为8，更小更紧凑
                        fontname="china-s",  # 中文简体字体
                        color=(0, 0, 0),  # 黑色
                        align=fitz.TEXT_ALIGN_CENTER,  # 居中对齐
                    )

        # 如果需要裁剪页面范围，创建新的PDF文档
        if save_start_page > 1 or save_end_page < total_pages:
            print(f'   裁剪页面范围：第 {save_start_page} 页到第 {save_end_page} 页')
            # 创建新的PDF文档，只包含指定范围的页面
            new_pdf = fitz.open()
            for page_num in range(save_start_page - 1, save_end_page):
                new_pdf.insert_pdf(pdf_document, from_page=page_num, to_page=page_num)
            pdf_document.close()
            pdf_document = new_pdf

        # 保存到内存，使用压缩选项
        print('   保存处理后的PDF...')
        output_buffer = io.BytesIO()
        pdf_document.save(
            output_buffer,
            garbage=4,  # 最高级别的垃圾回收
            deflate=True,  # 使用deflate压缩
            clean=True,  # 清理未使用的对象
        )
        pdf_document.close()
        print(f'   PDF保存成功，大小: {len(output_buffer.getvalue())} bytes')

        # 重置缓冲区指针
        output_buffer.seek(0)

        # 生成文件名
        original_name = pdf_file.name
        output_filename = original_name.replace('.pdf', '_计划书.pdf')

        # 返回处理后的PDF文件
        print(f'✅ PDF处理完成，返回文件: {output_filename}')
        response = HttpResponse(output_buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{output_filename}"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'

        return response

    except fitz.FileDataError as e:
        # PDF文件格式错误
        print(f'❌ PDF文件格式错误: {str(e)}')
        import traceback
        traceback.print_exc()
        return Response({
            'status': 'error',
            'message': f'PDF文件格式错误，请确保上传的是有效的PDF文件: {str(e)}'
        }, status=400)

    except MemoryError as e:
        # 内存不足
        print(f'❌ 内存不足: {str(e)}')
        return Response({
            'status': 'error',
            'message': 'PDF文件过大，服务器内存不足，请尝试上传较小的文件'
        }, status=413)

    except Exception as e:
        # 其他未知错误
        print(f'❌ 处理PDF失败: {str(e)}')
        print(f'   错误类型: {type(e).__name__}')
        print(f'   PDF文件名: {pdf_file.name if pdf_file else "未知"}')
        print(f'   PDF文件大小: {pdf_file.size if pdf_file else 0} bytes')
        import traceback
        traceback.print_exc()

        return Response({
            'status': 'error',
            'message': f'处理PDF失败: {str(e)}'
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_pdf_tables(request):
    """
    从PDF中提取全文（纯文本格式）

    参数:
    - pdf_file: PDF文件
    """
    print(f'\n📊 收到PDF全文提取请求 (快速提取)')
    print(f'   用户: {request.user.username}')

    try:
        # 获取上传的PDF文件
        pdf_file = request.FILES.get('pdf_file')
        if not pdf_file:
            return Response({
                'status': 'error',
                'message': '请上传PDF文件'
            }, status=400)

        print(f'   文件名: {pdf_file.name}')
        print(f'   文件大小: {pdf_file.size} bytes')

        # 检查文件类型
        if not pdf_file.name.endswith('.pdf'):
            return Response({
                'status': 'error',
                'message': '只支持PDF格式文件'
            }, status=400)

        # 读取PDF文件
        pdf_bytes = pdf_file.read()

        # 使用pdfplumber提取全文
        full_text = ""
        page_texts = []

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            print(f'   PDF打开成功，共 {len(pdf.pages)} 页')

            for page_num, page in enumerate(pdf.pages):
                try:
                    page_content = f"# 第 {page_num + 1} 页\n\n"

                    # 直接提取全文 (调整容差参数避免字符重叠)
                    # x_tolerance: 水平方向字符间距容差，增大可合并重叠字符
                    # y_tolerance: 垂直方向行间距容差
                    full_page_text = page.extract_text(
                        x_tolerance=3,
                        y_tolerance=3,
                        layout=False
                    )

                    if full_page_text:
                        page_content += full_page_text + "\n\n"

                    page_content += "---\n\n"

                    page_texts.append({
                        'page': page_num + 1,
                        'text': page_content.strip(),
                        'char_count': len(page_content.strip())
                    })
                    full_text += page_content

                except Exception as e:
                    print(f'   第 {page_num + 1} 页提取失败: {str(e)}')
                    continue

        total_chars = sum(p['char_count'] for p in page_texts)
        print(f'✅ 全文提取完成，共 {len(page_texts)} 页，{total_chars} 个字符')

        return Response({
            'status': 'success',
            'message': f'成功提取 {len(page_texts)} 页（纯文本格式）',
            'total_chars': total_chars,
            'total_pages': len(page_texts),
            'full_text': full_text,
            'pages': page_texts,
            'tables': []  # 保持接口兼容性
        })

    except Exception as e:
        print(f'❌ 提取文本失败: {str(e)}')
        import traceback
        traceback.print_exc()

        return Response({
            'status': 'error',
            'message': f'提取文本失败: {str(e)}'
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_pdf_tables_plumber(request):
    """
    从PDF中提取全文（纯文本格式）

    参数:
    - pdf_file: PDF文件
    """
    print(f'\n📊 收到PDF全文提取请求 (精确提取)')
    print(f'   用户: {request.user.username}')

    try:
        # 获取上传的PDF文件
        pdf_file = request.FILES.get('pdf_file')
        if not pdf_file:
            return Response({
                'status': 'error',
                'message': '请上传PDF文件'
            }, status=400)

        print(f'   文件名: {pdf_file.name}')
        print(f'   文件大小: {pdf_file.size} bytes')

        # 检查文件类型
        if not pdf_file.name.endswith('.pdf'):
            return Response({
                'status': 'error',
                'message': '只支持PDF格式文件'
            }, status=400)

        # 读取PDF文件
        pdf_bytes = pdf_file.read()

        # 使用pdfplumber提取全文
        full_text = ""
        page_texts = []

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            print(f'   PDF打开成功，共 {len(pdf.pages)} 页')

            for page_num, page in enumerate(pdf.pages):
                try:
                    page_content = f"# 第 {page_num + 1} 页\n\n"

                    # 直接提取全文 (调整容差参数避免字符重叠)
                    # x_tolerance: 水平方向字符间距容差，增大可合并重叠字符
                    # y_tolerance: 垂直方向行间距容差
                    full_page_text = page.extract_text(
                        x_tolerance=3,
                        y_tolerance=3,
                        layout=False
                    )

                    if full_page_text:
                        page_content += full_page_text + "\n\n"

                    page_content += "---\n\n"

                    page_texts.append({
                        'page': page_num + 1,
                        'text': page_content.strip(),
                        'char_count': len(page_content.strip())
                    })
                    full_text += page_content

                except Exception as e:
                    print(f'   第 {page_num + 1} 页提取失败: {str(e)}')
                    continue

        total_chars = sum(p['char_count'] for p in page_texts)
        print(f'✅ 全文提取完成，共 {len(page_texts)} 页，{total_chars} 个字符')

        return Response({
            'status': 'success',
            'message': f'成功提取 {len(page_texts)} 页（纯文本格式）',
            'total_chars': total_chars,
            'total_pages': len(page_texts),
            'full_text': full_text,
            'pages': page_texts,
            'tables': []  # 保持接口兼容性
        })

    except Exception as e:
        print(f'❌ 提取文本失败: {str(e)}')
        import traceback
        traceback.print_exc()

        return Response({
            'status': 'error',
            'message': f'提取文本失败: {str(e)}'
        }, status=500)


def extract_pdf_text_from_bytes_pypdf(pdf_bytes):
    """
    使用 pypdf 从PDF字节数据中提取全文（避免字符重叠）

    Args:
        pdf_bytes: PDF文件的字节数据

    Returns:
        dict: 包含提取结果的字典
    """
    try:
        full_text = ""
        page_texts = []

        reader = PdfReader(io.BytesIO(pdf_bytes))
        print(f'   PDF打开成功，共 {len(reader.pages)} 页 (使用pypdf)')

        for page_num, page in enumerate(reader.pages):
            try:
                page_content = f"# 第 {page_num + 1} 页\n\n"

                # 使用 pypdf 提取文本（不会出现字符重叠）
                full_page_text = page.extract_text()

                if full_page_text:
                    page_content += full_page_text + "\n\n"

                page_content += "---\n\n"

                page_texts.append({
                    'page': page_num + 1,
                    'text': page_content.strip(),
                    'char_count': len(page_content.strip()),
                    'has_tables': False,
                    'table_count': 0
                })
                full_text += page_content

                if page_num == 0:
                    print(f'   第 1 页提取了 {len(page_content.strip())} 个字符（pypdf模式）')
            except Exception as e:
                print(f'   第 {page_num + 1} 页提取失败: {str(e)}')
                page_texts.append({
                    'page': page_num + 1,
                    'text': f'[提取失败: {str(e)}]',
                    'char_count': 0,
                    'has_tables': False,
                    'table_count': 0
                })
                continue

        total_chars = sum(p['char_count'] for p in page_texts)
        print(f'✅ 全文提取完成，共 {len(page_texts)} 页，{total_chars} 个字符（pypdf模式）')

        return {
            'success': True,
            'full_text': full_text,
            'total_chars': total_chars,
            'total_pages': len(page_texts),
            'pages': page_texts
        }

    except Exception as e:
        print(f'❌ pypdf提取文本失败: {str(e)}')
        import traceback
        traceback.print_exc()

        return {
            'success': False,
            'error': f'提取文本失败: {str(e)}'
        }


def extract_pdf_text_from_bytes(pdf_bytes):
    """
    从PDF字节数据中提取全文（纯文本格式）

    Args:
        pdf_bytes: PDF文件的字节数据

    Returns:
        dict: 包含提取结果的字典
        {
            'success': True/False,
            'full_text': '提取的完整文本',
            'total_chars': 总字符数,
            'total_pages': 总页数,
            'error': '错误信息（如果失败）'
        }
    """
    # 🆕 优先使用 pypdf，如果失败再用 pdfplumber
    result = extract_pdf_text_from_bytes_pypdf(pdf_bytes)
    if result['success']:
        return result

    print('   pypdf提取失败，尝试使用pdfplumber...')

    try:
        full_text = ""
        page_texts = []

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            print(f'   PDF打开成功，共 {len(pdf.pages)} 页')

            for page_num, page in enumerate(pdf.pages):
                try:
                    page_content = f"# 第 {page_num + 1} 页\n\n"

                    # 直接提取全文，不进行表格检测和转换
                    # 所有内容（包括表格）统一以纯文本格式输出
                    # 调整容差参数避免字符重叠问题
                    full_page_text = page.extract_text(
                        x_tolerance=3,
                        y_tolerance=3,
                        layout=False
                    )

                    if full_page_text:
                        page_content += full_page_text + "\n\n"

                    page_content += "---\n\n"

                    page_texts.append({
                        'page': page_num + 1,
                        'text': page_content.strip(),
                        'char_count': len(page_content.strip()),
                        'has_tables': False,
                        'table_count': 0
                    })
                    full_text += page_content

                    if page_num == 0:
                        print(f'   第 1 页提取了 {len(page_content.strip())} 个字符（纯文本模式）')
                except Exception as e:
                    print(f'   第 {page_num + 1} 页提取失败: {str(e)}')
                    page_texts.append({
                        'page': page_num + 1,
                        'text': f'[提取失败: {str(e)}]',
                        'char_count': 0,
                        'has_tables': False,
                        'table_count': 0
                    })
                    continue

        total_chars = sum(p['char_count'] for p in page_texts)
        print(f'✅ 全文提取完成，共 {len(page_texts)} 页，{total_chars} 个字符（纯文本模式）')

        return {
            'success': True,
            'full_text': full_text,
            'total_chars': total_chars,
            'total_pages': len(page_texts),
            'pages': page_texts
        }

    except Exception as e:
        print(f'❌ 提取文本失败: {str(e)}')
        import traceback
        traceback.print_exc()

        return {
            'success': False,
            'error': f'提取文本失败: {str(e)}'
        }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_pdf_text(request):
    """
    从PDF中提取全文（表格自动转Markdown，按原始顺序混合输出）

    参数:
    - pdf_file: PDF文件
    """
    print(f'\n📝 收到PDF全文提取请求（表格转Markdown，混合输出）')
    print(f'   用户: {request.user.username}')

    try:
        # 获取上传的PDF文件
        pdf_file = request.FILES.get('pdf_file')
        if not pdf_file:
            return Response({
                'status': 'error',
                'message': '请上传PDF文件'
            }, status=400)

        print(f'   文件名: {pdf_file.name}')
        print(f'   文件大小: {pdf_file.size} bytes')

        # 检查文件类型
        if not pdf_file.name.endswith('.pdf'):
            return Response({
                'status': 'error',
                'message': '只支持PDF格式文件'
            }, status=400)

        # 读取PDF文件
        pdf_bytes = pdf_file.read()

        # 调用核心提取函数
        result = extract_pdf_text_from_bytes(pdf_bytes)

        if result['success']:
            return Response({
                'status': 'success',
                'message': f'成功提取 {result["total_pages"]} 页（纯文本格式）',
                'total_chars': result['total_chars'],
                'total_pages': result['total_pages'],
                'total_tables': 0,
                'full_text': result['full_text'],
                'pages': result['pages']
            })
        else:
            return Response({
                'status': 'error',
                'message': result['error']
            }, status=500)

    except Exception as e:
        print(f'❌ 提取文本失败: {str(e)}')
        import traceback
        traceback.print_exc()

        return Response({
            'status': 'error',
            'message': f'提取文本失败: {str(e)}'
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_tables_markdown(request):
    """
    从PDF中提取全文（纯文本格式）

    参数:
    - pdf_file: PDF文件
    """
    print(f'\n📊 收到PDF全文提取请求 (提取所有表格)')
    print(f'   用户: {request.user.username}')

    try:
        # 获取上传的PDF文件
        pdf_file = request.FILES.get('pdf_file')
        if not pdf_file:
            return Response({
                'status': 'error',
                'message': '请上传PDF文件'
            }, status=400)

        print(f'   文件名: {pdf_file.name}')
        print(f'   文件大小: {pdf_file.size} bytes')

        # 检查文件类型
        if not pdf_file.name.endswith('.pdf'):
            return Response({
                'status': 'error',
                'message': '只支持PDF格式文件'
            }, status=400)

        # 读取PDF文件
        pdf_bytes = pdf_file.read()

        # 使用pdfplumber提取全文
        full_text = ""
        page_texts = []

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            print(f'   PDF打开成功，共 {len(pdf.pages)} 页')

            for page_num, page in enumerate(pdf.pages):
                try:
                    page_content = f"# 第 {page_num + 1} 页\n\n"

                    # 直接提取全文 (调整容差参数避免字符重叠)
                    # x_tolerance: 水平方向字符间距容差，增大可合并重叠字符
                    # y_tolerance: 垂直方向行间距容差
                    full_page_text = page.extract_text(
                        x_tolerance=3,
                        y_tolerance=3,
                        layout=False
                    )

                    if full_page_text:
                        page_content += full_page_text + "\n\n"

                    page_content += "---\n\n"

                    page_texts.append({
                        'page': page_num + 1,
                        'text': page_content.strip(),
                        'char_count': len(page_content.strip())
                    })
                    full_text += page_content

                except Exception as e:
                    print(f'   第 {page_num + 1} 页提取失败: {str(e)}')
                    continue

        total_chars = sum(p['char_count'] for p in page_texts)
        print(f'✅ 全文提取完成，共 {len(page_texts)} 页，{total_chars} 个字符')

        return Response({
            'status': 'success',
            'message': f'成功提取 {len(page_texts)} 页（纯文本格式）',
            'markdown': full_text,  # 保持接口兼容性
            'total_chars': total_chars,
            'total_pages': len(page_texts),
            'total_tables': 0
        })

    except Exception as e:
        print(f'❌ 提取文本失败: {str(e)}')
        import traceback
        traceback.print_exc()

        return Response({
            'status': 'error',
            'message': f'提取文本失败: {str(e)}'
        }, status=500)


def convert_table_to_markdown(table_data):
    """
    将二维数组转换为Markdown表格格式

    参数:
    - table_data: 二维数组 [[cell1, cell2], [cell3, cell4], ...]

    返回:
    - Markdown格式的表格字符串
    """
    if not table_data or len(table_data) == 0:
        return ""

    # 过滤掉完全为空的行
    filtered_rows = []
    for row in table_data:
        # 检查是否为空行（所有单元格都为空或None）
        if any(cell and str(cell).strip() for cell in row):
            filtered_rows.append(row)

    if not filtered_rows or len(filtered_rows) == 0:
        return ""

    lines = []

    # 表头（第一行）
    header_row = filtered_rows[0]
    header = "| " + " | ".join(str(cell or '').strip() for cell in header_row) + " |"
    lines.append(header)

    # 分隔线
    separator = "|" + "|".join([" --- "] * len(header_row)) + "|"
    lines.append(separator)

    # 数据行（从第二行开始）
    for row in filtered_rows[1:]:
        row_str = "| " + " | ".join(str(cell or '').strip() for cell in row) + " |"
        lines.append(row_str)

    return "\n".join(lines)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crop_pdf_footer(request):
    """
    通过裁剪方式移除PDF页脚

    参数:
    - pdf_file: PDF文件
    - footer_height: 要裁剪的页脚高度（像素）
    """
    try:
        # 获取上传的PDF文件
        pdf_file = request.FILES.get('pdf_file')
        if not pdf_file:
            return Response({
                'status': 'error',
                'message': '请上传PDF文件'
            }, status=400)

        # 检查文件类型
        if not pdf_file.name.endswith('.pdf'):
            return Response({
                'status': 'error',
                'message': '只支持PDF格式文件'
            }, status=400)

        # 获取页脚高度参数
        try:
            footer_height = int(request.POST.get('footer_height', 50))
            if footer_height <= 0 or footer_height > 500:
                raise ValueError('页脚高度必须在1-500像素之间')
        except ValueError as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=400)

        # 获取自定义文字
        custom_text = request.POST.get('custom_text', '').strip()

        # 获取PDF密码（如果有）
        pdf_password = request.POST.get('pdf_password', '').strip()

        # 获取二维码擦除参数
        enable_qr_removal = request.POST.get('enable_qr_removal', '').lower() == 'true'
        qr_position = request.POST.get('qr_position', 'bottom-right')
        qr_width = int(request.POST.get('qr_width', 100))
        qr_height = int(request.POST.get('qr_height', 100))

        # 读取PDF文件
        pdf_bytes = pdf_file.read()

        # 使用PyMuPDF处理PDF
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")

        # 检查PDF是否加密
        if pdf_document.is_encrypted:
            # 尝试解密
            if pdf_password:
                # 使用提供的密码解密
                auth_result = pdf_document.authenticate(pdf_password)
                if not auth_result:
                    pdf_document.close()
                    return Response({
                        'status': 'error',
                        'message': '密码错误，请检查后重试'
                    }, status=400)
            else:
                # 尝试空密码
                auth_result = pdf_document.authenticate("")
                if not auth_result:
                    pdf_document.close()
                    return Response({
                        'status': 'error',
                        'message': '此PDF已加密，请提供密码',
                        'requires_password': True
                    }, status=400)

        # 遍历每一页并裁剪
        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]

            # 获取当前页面尺寸
            page_rect = page.rect

            # 创建新的裁剪区域（移除底部页脚）
            new_rect = fitz.Rect(
                page_rect.x0,  # 左边界
                page_rect.y0,  # 上边界
                page_rect.x1,  # 右边界
                page_rect.y1 - footer_height  # 新的下边界（向上移动）
            )

            # 设置裁剪区域
            page.set_cropbox(new_rect)

        # 保存到内存，使用压缩选项
        output_buffer = io.BytesIO()
        pdf_document.save(
            output_buffer,
            garbage=4,  # 最高级别的垃圾回收
            deflate=True,  # 使用deflate压缩
            clean=True,  # 清理未使用的对象
        )
        pdf_document.close()

        # 重置缓冲区指针
        output_buffer.seek(0)

        # 生成文件名
        original_name = pdf_file.name
        output_filename = original_name.replace('.pdf', '_裁剪页脚.pdf')

        # 返回处理后的PDF文件
        response = HttpResponse(output_buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{output_filename}"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'

        return response

    except Exception as e:
        print(f'❌ 裁剪PDF失败: {str(e)}')
        import traceback
        traceback.print_exc()

        return Response({
            'status': 'error',
            'message': f'裁剪PDF失败: {str(e)}'
        }, status=500)
