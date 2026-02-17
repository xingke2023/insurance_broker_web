"""
保险公司和请求配置的API视图
"""
import json
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import InsuranceCompany, InsuranceCompanyRequest


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def get_insurance_companies(request):
    """
    获取所有保险公司列表（公开API，无需认证）
    """
    try:
        companies = InsuranceCompany.objects.filter(is_active=True).order_by('sort_order')

        company_list = []
        for company in companies:
            company_list.append({
                'id': company.id,
                'code': company.code,
                'name': company.name,
                'name_en': company.name_en,
                'icon': company.icon,
                'color_gradient': company.color_gradient,
                'bg_color': company.bg_color,
                'description': company.description,
                'flagship_product': company.flagship_product,
                'website_url': company.website_url,
                'is_active': company.is_active,
            })

        return Response({
            'status': 'success',
            'data': company_list
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([])  # 禁用自动认证，避免过期token导致401
@permission_classes([AllowAny])  # 公开API，允许所有人访问
def get_companies_standard_comparison(request):
    """
    获取所有保险公司的标准退保数据用于对比
    ✅ 新版本：使用 ProductPlan 关联表
    【公开API - 无需登录】

    ⚠️ 重要变更：返回公司级别数据，包含产品列表
    前端点击公司后弹出产品选择对话框，支持多选产品进行对比

    查询参数:
        payment_period: 缴费年限（可选，默认5年）例如：1, 2, 5
        selected_product_ids: 用户选择的产品ID列表，逗号分隔（可选）

    数据来源：
        - InsuranceProduct: 产品品种表（产品名称、公司等基本信息）
        - ProductPlan: 缴费方案表（不同年期的年缴金额、退保价值表等）
    """
    from .models import InsuranceProduct, ProductPlan

    try:
        # 获取缴费年限参数，默认为5年
        payment_period = request.GET.get('payment_period', '5')
        try:
            payment_period = int(payment_period)
        except ValueError:
            payment_period = 5

        # 获取用户选择的产品ID列表
        selected_product_ids_str = request.GET.get('selected_product_ids', '')
        selected_product_ids = []
        if selected_product_ids_str:
            try:
                selected_product_ids = [int(pid.strip()) for pid in selected_product_ids_str.split(',') if pid.strip()]
            except ValueError:
                selected_product_ids = []

        # 优化：使用 select_related 和 prefetch_related 减少数据库查询
        companies = InsuranceCompany.objects.filter(is_active=True).order_by('sort_order')

        # 优化：使用 only() 只加载需要的字段，避免加载大字段
        products_query = InsuranceProduct.objects.filter(
            company__in=companies,
            is_active=True
        ).select_related('company').only(
            'id', 'product_name', 'company_id', 'sort_order', 'product_details'
        )

        # 如果用户指定了产品ID，则只返回这些产品
        if selected_product_ids:
            products_query = products_query.filter(id__in=selected_product_ids)

        # 优化：预加载所有相关的缴费方案
        plans_query = ProductPlan.objects.filter(
            product__in=products_query,
            payment_period=payment_period,
            is_active=True
        ).select_related('product').only(
            'id', 'product_id', 'payment_period', 'annual_premium', 'surrender_value_table'
        )

        # 构建产品ID到方案的映射（避免重复查询）
        product_plan_map = {}
        for plan in plans_query:
            product_plan_map[plan.product_id] = plan

        company_list = []
        for company in companies:
            # 第一步：获取该公司的所有产品品种
            company_products = [p for p in products_query if p.company_id == company.id]

            # 解析所有产品数据
            products_data = []
            for product in company_products:
                # 第二步：从映射中获取方案（避免数据库查询）
                plan = product_plan_map.get(product.id)

                # 如果没有该年期的方案，跳过
                if not plan:
                    continue

                # 第三步：解析该方案的退保价值表
                standard_data = None
                has_data = False

                if plan.surrender_value_table:
                    try:
                        # surrender_value_table 是 TextField，存储 JSON 字符串
                        surrender_table = json.loads(plan.surrender_value_table)

                        # 检查是否有有效的数据（支持两种格式）
                        if surrender_table:
                            # 格式1: 列表格式 [{"year": 1, ...}, ...]
                            if isinstance(surrender_table, list) and len(surrender_table) > 0:
                                standard_data = {
                                    'standard': surrender_table
                                }
                                has_data = True
                            # 格式2: 字典格式 {"standard": [...]}
                            elif isinstance(surrender_table, dict) and 'standard' in surrender_table:
                                if isinstance(surrender_table['standard'], list) and len(surrender_table['standard']) > 0:
                                    standard_data = surrender_table
                                    has_data = True
                    except json.JSONDecodeError:
                        standard_data = None

                if has_data:  # 只添加有数据的产品
                    products_data.append({
                        'product_id': product.id,
                        'plan_id': plan.id,  # ✅ 新增：方案ID
                        'product_name': product.product_name,
                        'payment_period': plan.payment_period,  # ✅ 从方案表获取
                        'annual_premium': float(plan.annual_premium),  # ✅ 从方案表获取
                        'standard_data': standard_data,
                        'product_details': product.product_details or {},  # 产品详细信息
                    })

            # 判断公司是否有数据
            has_data = len(products_data) > 0

            # 构建公司数据
            # 只返回有数据的公司（没有产品的公司不显示）
            if not has_data:
                continue

            company_data = {
                'id': company.id,
                'code': company.code,
                'name': company.name,
                'name_en': company.name_en,
                'icon': company.icon,
                'color_gradient': company.color_gradient,
                'bg_color': company.bg_color,
                'flagship_product': company.flagship_product or '',
                'has_data': has_data,
                'payment_period': payment_period,
                'products': products_data  # 产品列表
            }

            # 标记是否有多个产品
            if len(products_data) > 1:
                company_data['has_multiple_products'] = True

            company_list.append(company_data)

        return Response({
            'status': 'success',
            'payment_period': payment_period,  # 告诉前端当前是哪个年期的数据
            'data': company_list
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_company_requests(request, company_code):
    """
    获取指定保险公司的所有请求配置

    参数:
        company_code: 保险公司代码 (如 'axa')
    """
    try:
        # 查找保险公司
        try:
            company = InsuranceCompany.objects.get(code=company_code, is_active=True)
        except InsuranceCompany.DoesNotExist:
            return Response({
                'status': 'error',
                'message': f'保险公司 {company_code} 不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        # 获取该公司的所有请求配置
        requests = InsuranceCompanyRequest.objects.filter(
            company=company,
            is_active=True
        ).order_by('sort_order')

        request_list = []
        for req in requests:
            request_list.append({
                'id': req.id,
                'request_name': req.request_name,
                'request_url': req.request_url,
                'request_method': req.request_method,
                'headers': req.headers,
                'authorization': req.authorization,
                'insurance_product': req.insurance_product,
                'requires_bearer_token': req.requires_bearer_token,
                'configurable_fields': req.configurable_fields,
                'field_descriptions': req.field_descriptions,
            })

        return Response({
            'status': 'success',
            'company': {
                'code': company.code,
                'name': company.name,
                'name_en': company.name_en
            },
            'data': request_list
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_request_detail(request, request_id):
    """
    获取指定请求配置的详细信息（包含完整的请求模板）

    参数:
        request_id: 请求配置ID
    """
    try:
        # 查找请求配置
        try:
            req = InsuranceCompanyRequest.objects.get(id=request_id, is_active=True)
        except InsuranceCompanyRequest.DoesNotExist:
            return Response({
                'status': 'error',
                'message': f'请求配置 ID {request_id} 不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        # 返回完整配置信息
        return Response({
            'status': 'success',
            'data': {
                'id': req.id,
                'request_name': req.request_name,
                'request_url': req.request_url,
                'request_method': req.request_method,
                'request_template': req.request_template,
                'headers': req.headers,
                'authorization': req.authorization,
                'configurable_fields': req.configurable_fields,
                'field_descriptions': req.field_descriptions,
                'insurance_product': req.insurance_product,
                'requires_bearer_token': req.requires_bearer_token,
                'company': {
                    'code': req.company.code,
                    'name': req.company.name,
                    'name_en': req.company.name_en
                }
            }
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_company_request_by_name(request, company_code, request_name):
    """
    根据保险公司代码和请求名称获取请求配置

    参数:
        company_code: 保险公司代码 (如 'axa')
        request_name: 请求名称 (如 '利益表计算')
    """
    try:
        # 查找保险公司
        try:
            company = InsuranceCompany.objects.get(code=company_code, is_active=True)
        except InsuranceCompany.DoesNotExist:
            return Response({
                'status': 'error',
                'message': f'保险公司 {company_code} 不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        # 查找请求配置
        try:
            req = InsuranceCompanyRequest.objects.get(
                company=company,
                request_name=request_name,
                is_active=True
            )
        except InsuranceCompanyRequest.DoesNotExist:
            return Response({
                'status': 'error',
                'message': f'请求配置 {request_name} 不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        # 解析headers字段（支持JSON格式和键值对格式）
        headers = req.headers
        print(f"📋 [后端] headers原始值类型: {type(headers)}")
        print(f"📋 [后端] headers原始值: {headers[:200] if isinstance(headers, str) else headers}")

        if isinstance(headers, str):
            headers = headers.strip()
            if headers:
                # 尝试解析为JSON
                try:
                    headers = json.loads(headers)
                    print(f"✅ [后端] JSON解析成功: {headers}")
                except json.JSONDecodeError:
                    # 如果不是JSON，尝试解析为键值对格式
                    # 支持三种格式：
                    # 格式1: Key: Value (冒号分隔，HTTP header标准格式)
                    # 格式2: key value (空格分隔)
                    # 格式3: key\nvalue (换行分隔)
                    print(f"⚠️ [后端] 不是JSON格式，尝试解析为键值对格式")
                    try:
                        lines = [line.strip() for line in headers.split('\n') if line.strip()]
                        headers_dict = {}
                        i = 0

                        while i < len(lines):
                            line = lines[i]
                            # 优先检查冒号分隔（格式1: Key: Value）
                            if ':' in line:
                                parts = line.split(':', 1)  # 按冒号分隔，最多分隔1次
                                if len(parts) == 2:
                                    key = parts[0].strip()
                                    value = parts[1].strip()
                                    headers_dict[key] = value
                                elif len(parts) == 1:
                                    headers_dict[parts[0].strip()] = ''
                                i += 1
                            # 检查这行是否包含空格（格式2: key value）
                            elif ' ' in line or '\t' in line:
                                parts = line.split(None, 1)  # 按空白字符分隔，最多分隔1次
                                if len(parts) == 2:
                                    key, value = parts
                                    headers_dict[key] = value
                                elif len(parts) == 1:
                                    headers_dict[parts[0]] = ''
                                i += 1
                            else:
                                # 格式3: 当前行是key，下一行是value
                                if i + 1 < len(lines):
                                    key = line
                                    value = lines[i + 1]
                                    headers_dict[key] = value
                                    i += 2
                                else:
                                    # 最后一行，只有key没有value
                                    headers_dict[line] = ''
                                    i += 1

                        headers = headers_dict
                        print(f"✅ [后端] 键值对解析成功: {headers}")
                    except Exception as e:
                        print(f"❌ [后端] 键值对解析失败: {e}")
                        headers = {}
            else:
                headers = {}

        print(f"📋 [后端] 最终返回的headers: {headers}")

        # 处理field_descriptions，确保bearer_token不是必填
        field_descriptions = req.field_descriptions.copy() if req.field_descriptions else {}
        if 'bearer_token' in field_descriptions:
            # 强制设置bearer_token为非必填
            field_descriptions['bearer_token']['required'] = False
            # 如果没有label，添加默认label
            if 'label' not in field_descriptions['bearer_token']:
                field_descriptions['bearer_token']['label'] = 'Bearer Token'
            # 如果没有sensitive标记，添加
            if 'sensitive' not in field_descriptions['bearer_token']:
                field_descriptions['bearer_token']['sensitive'] = True

        # 返回完整配置信息
        return Response({
            'status': 'success',
            'data': {
                'id': req.id,
                'request_name': req.request_name,
                'request_url': req.request_url,
                'request_method': req.request_method,
                'request_template': req.request_template,
                'headers': headers,
                'authorization': req.authorization,
                'configurable_fields': req.configurable_fields,
                'field_descriptions': field_descriptions,
                'insurance_product': req.insurance_product,
                'requires_bearer_token': req.requires_bearer_token,
                'company': {
                    'code': company.code,
                    'name': company.name,
                    'name_en': company.name_en,
                    'headers': company.headers if hasattr(company, 'headers') else '',
                    'bearer_token': company.bearer_token,
                    'cookie': company.cookie
                }
            }
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def execute_api_request(request, company_code, request_name):
    """
    执行API请求 - 严格模拟POST请求

    参数:
        company_code: 保险公司代码 (如 'axa')
        request_name: 请求名称 (如 '利益表计算')

    请求体:
        form_data: 用户填写的表单数据 (JSON对象)
        custom_headers: 用户自定义的请求头 (可选)
        custom_bearer_token: 用户自定义的Bearer Token (可选)
    """
    import requests
    import json
    from copy import deepcopy

    try:
        # 1. 查找保险公司
        try:
            company = InsuranceCompany.objects.get(code=company_code, is_active=True)
        except InsuranceCompany.DoesNotExist:
            return Response({
                'status': 'error',
                'message': f'保险公司 {company_code} 不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        # 2. 查找请求配置
        try:
            req_config = InsuranceCompanyRequest.objects.get(
                company=company,
                request_name=request_name,
                is_active=True
            )
        except InsuranceCompanyRequest.DoesNotExist:
            return Response({
                'status': 'error',
                'message': f'请求配置 {request_name} 不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        # 3. 获取用户输入的数据
        form_data = request.data.get('form_data', {})
        custom_headers = request.data.get('custom_headers', {})
        custom_bearer_token = request.data.get('custom_bearer_token', '')
        custom_request_body = request.data.get('request_body', None)  # 用户编辑后的request body

        # 4. 构建请求体
        if custom_request_body is not None:
            # 如果前端传来了编辑后的request body，直接使用
            request_body = custom_request_body
        else:
            # 否则使用模板并替换占位符
            request_body = deepcopy(req_config.request_template)

            # 递归替换占位符 {{field_name}} 和直接字段值
            def replace_placeholders(obj, form_data):
                if isinstance(obj, str):
                    # 替换 {{变量名}} 格式的占位符
                    import re
                    def replacer(match):
                        field_name = match.group(1)
                        if field_name in form_data:
                            value = form_data[field_name]
                            # 如果原值是数字字符串，返回数字
                            if isinstance(value, str) and value.isdigit():
                                return value
                            return str(value)
                        return match.group(0)  # 保持占位符不变
                    return re.sub(r'\{\{(\w+)\}\}', replacer, obj)
                elif isinstance(obj, dict):
                    result = {}
                    for key, value in obj.items():
                        # 如果key在form_data中，直接替换值
                        if key in form_data:
                            result[key] = form_data[key]
                        else:
                            # 否则递归处理
                            result[key] = replace_placeholders(value, form_data)
                    return result
                elif isinstance(obj, list):
                    return [replace_placeholders(item, form_data) for item in obj]
                else:
                    return obj

            request_body = replace_placeholders(request_body, form_data)

        # 5. 构建请求头（处理字符串格式的headers，支持JSON和键值对格式）
        if req_config.headers:
            if isinstance(req_config.headers, str):
                headers_str = req_config.headers.strip()
                try:
                    # 尝试解析为JSON
                    headers = deepcopy(json.loads(headers_str))
                except json.JSONDecodeError:
                    # 如果不是JSON，尝试解析为键值对格式
                    # 支持三种格式：
                    # 格式1: Key: Value (冒号分隔，HTTP header标准格式)
                    # 格式2: key value (空格分隔)
                    # 格式3: key\nvalue (换行分隔)
                    try:
                        lines = [line.strip() for line in headers_str.split('\n') if line.strip()]
                        headers = {}
                        i = 0

                        while i < len(lines):
                            line = lines[i]
                            # 优先检查冒号分隔（格式1: Key: Value）
                            if ':' in line:
                                parts = line.split(':', 1)
                                if len(parts) == 2:
                                    key = parts[0].strip()
                                    value = parts[1].strip()
                                    headers[key] = value
                                elif len(parts) == 1:
                                    headers[parts[0].strip()] = ''
                                i += 1
                            # 检查这行是否包含空格（格式2: key value）
                            elif ' ' in line or '\t' in line:
                                parts = line.split(None, 1)
                                if len(parts) == 2:
                                    key, value = parts
                                    headers[key] = value
                                elif len(parts) == 1:
                                    headers[parts[0]] = ''
                                i += 1
                            else:
                                # 格式3: 当前行是key，下一行是value
                                if i + 1 < len(lines):
                                    key = line
                                    value = lines[i + 1]
                                    headers[key] = value
                                    i += 2
                                else:
                                    headers[line] = ''
                                    i += 1
                    except:
                        headers = {}
            else:
                headers = deepcopy(req_config.headers)
        else:
            headers = {}

        # 合并自定义请求头
        if custom_headers:
            headers.update(custom_headers)

        # 6. 处理Authorization
        # 优先级：用户输入 > insurance_company_requests.authorization > insurance_companies.bearer_token
        authorization = custom_bearer_token or req_config.authorization or company.bearer_token
        if authorization:
            # 清理authorization（去除前后空格和换行符）
            authorization = authorization.strip()
            # 如果不是以"Bearer "开头，添加前缀
            if not authorization.startswith('Bearer '):
                authorization = f'Bearer {authorization}'
            headers['Authorization'] = authorization

        # 7. 处理Cookie
        if company.cookie:
            headers['Cookie'] = company.cookie.strip()

        # 8. 发送HTTP请求
        url = req_config.request_url
        method = req_config.request_method.upper()

        print(f"[API执行] {method} {url}")
        print(f"[Headers] {json.dumps(headers, indent=2, ensure_ascii=False)}")
        print(f"[Body] {json.dumps(request_body, indent=2, ensure_ascii=False)}")

        if method == 'POST':
            response = requests.post(url, json=request_body, headers=headers, timeout=120, verify=True)
        elif method == 'GET':
            response = requests.get(url, params=request_body, headers=headers, timeout=120, verify=True)
        elif method == 'PUT':
            response = requests.put(url, json=request_body, headers=headers, timeout=120, verify=True)
        elif method == 'DELETE':
            response = requests.delete(url, json=request_body, headers=headers, timeout=120, verify=True)
        else:
            return Response({
                'status': 'error',
                'message': f'不支持的HTTP方法: {method}'
            }, status=status.HTTP_400_BAD_REQUEST)

        print(f"[响应状态] {response.status_code}")
        print(f"[响应内容] {response.text[:500]}")

        # 9. 返回响应
        return Response({
            'status': 'success',
            'request_info': {
                'url': url,
                'method': method,
                'headers': headers,
                'body': request_body
            },
            'response_info': {
                'status_code': response.status_code,
                'headers': dict(response.headers),
                'body': response.json() if response.headers.get('Content-Type', '').startswith('application/json') else response.text
            }
        })

    except requests.exceptions.Timeout:
        return Response({
            'status': 'error',
            'message': '请求超时，请稍后重试'
        }, status=status.HTTP_504_GATEWAY_TIMEOUT)

    except requests.exceptions.RequestException as e:
        return Response({
            'status': 'error',
            'message': f'网络请求失败: {str(e)}'
        }, status=status.HTTP_502_BAD_GATEWAY)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({
            'status': 'error',
            'message': f'服务器错误: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_insurance_products(request):
    """
    获取保险产品列表
    支持按公司筛选：?company=公司ID
    ✅ 已更新：包含 ProductPlan 关联方案
    """
    from .models import InsuranceProduct, ProductPlan

    try:
        company_id = request.GET.get('company')

        if company_id:
            products = InsuranceProduct.objects.filter(company_id=company_id).select_related('company').prefetch_related('plans')
        else:
            products = InsuranceProduct.objects.all().select_related('company').prefetch_related('plans')

        product_list = []
        for product in products:
            # 获取所有关联的方案
            plans = product.plans.filter(is_active=True).order_by('sort_order', 'payment_period')
            plans_data = []
            for plan in plans:
                plans_data.append({
                    'id': plan.id,
                    'plan_name': plan.plan_name,
                    'payment_period': plan.payment_period,
                    'annual_premium': str(plan.annual_premium),
                    'total_premium': str(plan.total_premium) if plan.total_premium else None,
                    'surrender_value_table': plan.surrender_value_table,
                    'death_benefit_table': plan.death_benefit_table,
                    'irr_rate': str(plan.irr_rate) if plan.irr_rate else None,
                    'is_recommended': plan.is_recommended
                })

            product_list.append({
                'id': product.id,
                'company': {
                    'id': product.company.id,
                    'code': product.company.code,
                    'name': product.company.name,
                    'name_en': product.company.name_en,
                    'icon': product.company.icon,
                    'color_gradient': product.company.color_gradient,
                },
                'product_name': product.product_name,
                'payment_period': product.payment_period,
                'annual_premium': str(product.annual_premium),
                'product_category': product.product_category,
                'is_withdrawal': product.is_withdrawal,
                'description': product.description,
                'plans': plans_data,  # ✅ 新增：包含方案列表
            })

        return Response({
            'status': 'success',
            'data': product_list  # 改为 'data' 以保持一致性
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_insurance_product_detail(request, product_id):
    """
    获取保险产品详情
    ✅ 已更新：包含 ProductPlan 关联方案、官方URL和宣传材料
    """
    from .models import InsuranceProduct, ProductPlan, ProductPromotion

    try:
        product = InsuranceProduct.objects.select_related('company').get(id=product_id)

        # 获取所有关联的方案
        plans = ProductPlan.objects.filter(product=product, is_active=True).order_by('sort_order', 'payment_period')
        plans_data = []
        for plan in plans:
            plans_data.append({
                'id': plan.id,
                'plan_name': plan.plan_name,
                'payment_period': plan.payment_period,
                'annual_premium': str(plan.annual_premium),
                'total_premium': str(plan.total_premium) if plan.total_premium else None,
                'surrender_value_table': plan.surrender_value_table,
                'death_benefit_table': plan.death_benefit_table,
                'irr_rate': str(plan.irr_rate) if plan.irr_rate else None,
                'plan_description': plan.plan_description,
                'is_recommended': plan.is_recommended
            })

        # 获取产品的宣传材料
        promotions = ProductPromotion.objects.filter(
            product=product,
            is_active=True
        ).order_by('sort_order', '-published_date')

        promotions_data = []
        for promo in promotions:
            promotions_data.append({
                'id': promo.id,
                'title': promo.title,
                'content_type': promo.content_type,
                'content_type_display': promo.get_content_type_display(),
                'description': promo.description,
                'url': promo.url,
                'pdf_file': request.build_absolute_uri(promo.pdf_file.url) if promo.pdf_file else None,
                'thumbnail': request.build_absolute_uri(promo.thumbnail.url) if promo.thumbnail else None,
                'published_date': promo.published_date,
                'view_count': promo.view_count
            })

        return Response({
            'status': 'success',
            'data': {
                'id': product.id,
                'company': {
                    'id': product.company.id,
                    'code': product.company.code,
                    'name': product.company.name,
                    'name_en': product.company.name_en,
                    'icon': product.company.icon,
                    'color_gradient': product.company.color_gradient,
                },
                'product_name': product.product_name,
                'product_category': product.product_category,
                'supported_payment_periods': product.supported_payment_periods,
                'is_withdrawal': product.is_withdrawal,
                'description': product.description,

                # 官方链接
                'url': product.url,

                # 目标受众和分类
                'target_age_min': product.target_age_min,
                'target_age_max': product.target_age_max,
                'target_life_stage': product.target_life_stage,
                'coverage_type': product.coverage_type,
                'min_annual_income': str(product.min_annual_income) if product.min_annual_income else None,
                'features': product.features,
                'ai_recommendation_prompt': product.ai_recommendation_prompt,

                # 详细内容
                'plan_summary': product.plan_summary,
                'plan_details': product.plan_details,
                'plan_pdf_base64': product.plan_pdf_base64,
                'product_research_report': product.product_research_report,

                # 方案列表
                'plans': plans_data,

                # 宣传材料
                'promotions': promotions_data,

                # 向后兼容字段
                'payment_period': product.payment_period,
                'annual_premium': str(product.annual_premium),
                'surrender_value_table': product.surrender_value_table,
                'death_benefit_table': product.death_benefit_table,
            }
        })

    except InsuranceProduct.DoesNotExist:
        return Response({
            'status': 'error',
            'message': '产品不存在'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_insurance_company_detail(request, company_id):
    """
    获取保险公司详情
    """
    try:
        company = InsuranceCompany.objects.get(id=company_id)

        return Response({
            'status': 'success',
            'data': {
                'id': company.id,
                'code': company.code,
                'name': company.name,
                'name_en': company.name_en,
                'icon': company.icon,
                'color_gradient': company.color_gradient,
                'bg_color': company.bg_color,
                'description': company.description,
                'flagship_product': company.flagship_product,
                'website_url': company.website_url,
                'is_active': company.is_active,
            }
        })

    except InsuranceCompany.DoesNotExist:
        return Response({
            'status': 'error',
            'message': '保险公司不存在'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
