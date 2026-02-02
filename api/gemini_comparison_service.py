"""
Gemini PDF 对比分析服务
使用 Gemini 3 Flash Preview 直接分析 2-3 份 PDF 计划书
采用轮询机制使用多个 API Key
"""

import base64
import os
import logging
from google import genai
from google.genai import types
from .gemini_service import call_gemini_with_fallback

logger = logging.getLogger(__name__)


class GeminiComparisonService:
    """Gemini PDF 对比分析服务（使用轮询机制）"""

    def __init__(self):
        self.model = "gemini-3-flash-preview"

    def compare_plans(self, pdf_files, file_names):
        """
        对比分析 2-3 份保险计划书 PDF

        参数:
            pdf_files: List[bytes] - PDF 文件的字节数据列表（2-3个）
            file_names: List[str] - 文件名列表

        返回:
            str - Markdown 格式的对比报告
        """
        if not pdf_files or len(pdf_files) < 2 or len(pdf_files) > 3:
            raise ValueError('必须提供 2-3 份 PDF 文件')

        # 构建提示词
        file_count = len(pdf_files)
        prompt = self._build_comparison_prompt(file_count, file_names)

        # 构建请求内容
        parts = []

        # 添加所有 PDF 文件
        for pdf_data in pdf_files:
            # 确保是字节数据
            if isinstance(pdf_data, str):
                # 如果是 base64 字符串，解码
                pdf_bytes = base64.b64decode(pdf_data)
            else:
                pdf_bytes = pdf_data

            parts.append(
                types.Part.from_bytes(
                    mime_type="application/pdf",
                    data=pdf_bytes
                )
            )

        # 添加提示词
        parts.append(types.Part.from_text(text=prompt))

        # 构建内容
        contents = [
            types.Content(
                role="user",
                parts=parts
            )
        ]

        # 配置生成参数
        generate_content_config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(
                thinking_level="HIGH",
            ),
            temperature=0.3,
            max_output_tokens=8192,
        )

        # 使用轮询机制调用 Gemini API
        try:
            logger.info(f"🚀 开始 Gemini 对比分析（文件数: {len(pdf_files)}）")

            response = call_gemini_with_fallback(
                model=self.model,
                contents=contents,
                config=generate_content_config,
                operation_name="PDF对比分析"
            )

            logger.info(f"✅ Gemini 对比分析完成（响应长度: {len(response.text)} 字符）")
            return response.text

        except Exception as e:
            logger.error(f"❌ Gemini 对比分析失败: {str(e)}")
            raise Exception(f'Gemini API 调用失败: {str(e)}')

    def compare_plans_stream(self, pdf_files, file_names):
        """
        流式对比分析 2-3 份保险计划书 PDF（用于实时显示）

        参数:
            pdf_files: List[bytes] - PDF 文件的字节数据列表（2-3个）
            file_names: List[str] - 文件名列表

        返回:
            Generator[str] - 流式生成的文本片段
        """
        if not pdf_files or len(pdf_files) < 2 or len(pdf_files) > 3:
            raise ValueError('必须提供 2-3 份 PDF 文件')

        # 构建提示词
        file_count = len(pdf_files)
        prompt = self._build_comparison_prompt(file_count, file_names)

        # 构建请求内容
        parts = []

        # 添加所有 PDF 文件
        for pdf_data in pdf_files:
            # 确保是字节数据
            if isinstance(pdf_data, str):
                # 如果是 base64 字符串，解码
                pdf_bytes = base64.b64decode(pdf_data)
            else:
                pdf_bytes = pdf_data

            parts.append(
                types.Part.from_bytes(
                    mime_type="application/pdf",
                    data=pdf_bytes
                )
            )

        # 添加提示词
        parts.append(types.Part.from_text(text=prompt))

        # 构建内容
        contents = [
            types.Content(
                role="user",
                parts=parts
            )
        ]

        # 配置生成参数
        generate_content_config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(
                thinking_level="HIGH",
            ),
            temperature=0.3,
            max_output_tokens=8192,
        )

        # 使用轮询机制进行流式调用
        try:
            from .gemini_service import get_next_api_key

            logger.info(f"🚀 开始 Gemini 流式对比分析（文件数: {len(pdf_files)}）")

            # 获取轮询后的API密钥列表
            api_keys = get_next_api_key()
            last_error = None

            # 依次尝试每个API密钥
            for key_name, api_key in api_keys:
                try:
                    logger.info(f"🔑 [流式对比] 尝试使用{key_name}: {api_key[:10]}...")

                    client = genai.Client(api_key=api_key)

                    # 流式调用
                    for chunk in client.models.generate_content_stream(
                        model=self.model,
                        contents=contents,
                        config=generate_content_config,
                    ):
                        if chunk.text:
                            yield chunk.text

                    logger.info(f"✅ [流式对比] {key_name}调用成功")
                    return  # 成功则退出

                except Exception as e:
                    error_msg = str(e)
                    logger.warning(f"⚠️ [流式对比] {key_name}失败: {error_msg}")

                    # 检查是否是配额/限流错误
                    is_quota_error = any(keyword in error_msg.lower() for keyword in [
                        'quota', 'rate limit', 'resource exhausted', '429', 'too many requests'
                    ])

                    if is_quota_error:
                        logger.warning(f"📊 [流式对比] 检测到{key_name}超额限制，尝试下一个密钥...")

                    last_error = e
                    continue

            # 所有密钥都失败
            logger.error(f"❌ [流式对比] 所有API密钥均失败")
            raise last_error if last_error else Exception('所有API密钥均失败')

        except Exception as e:
            logger.error(f"❌ Gemini 流式对比分析失败: {str(e)}")
            raise Exception(f'Gemini API 流式调用失败: {str(e)}')

    def _build_comparison_prompt(self, file_count, file_names):
        """构建对比分析提示词"""

        file_list = "\n".join([f"{i+1}. {name}" for i, name in enumerate(file_names)])

        prompt = f"""# 保险计划书对比分析任务

你是一位专业的保险精算师和理财规划师。现在需要你对比分析 {file_count} 份保险计划书，帮助客户做出明智的选择。

## 待对比的计划书
{file_list}

## 分析要求

### 1. 基本信息对比
提取并对比以下信息：
- 受保人信息（姓名、年龄、性别）
- 保险公司和产品名称
- 保险期限
- 基本保额

### 2. 保费对比分析
- 年缴保费
- 缴费年数
- 总保费
- 保费性价比分析

### 3. 现金价值对比（核心重点）
**关键要求**：必须以"保单年度终结"为基准，展示完整的对比表格

请按照以下格式输出完整的年度对比表格（使用 Markdown 表格格式）：

| 保单年度终结 | 计划书1-保证现金价值 | 计划书1-非保证现金价值 | 计划书1-总现金价值 | 计划书2-保证现金价值 | 计划书2-非保证现金价值 | 计划书2-总现金价值 |
|------------|-------------------|---------------------|------------------|-------------------|---------------------|------------------|
| 1          | XXX              | XXX                 | XXX              | XXX              | XXX                 | XXX              |
| 2          | XXX              | XXX                 | XXX              | XXX              | XXX                 | XXX              |
| ...        | ...              | ...                 | ...              | ...              | ...                 | ...              |

注意事项：
- 必须展示所有年度的数据（从第1年到保单结束）
- 如果某份计划书没有某年的数据，填写"N/A"
- 数字使用千位分隔符（如：1,234,567）
- 货币单位统一标注

### 4. 关键年度对比
重点对比以下关键时间点的现金价值：
- 第5年（缴费期结束/回本点）
- 第10年（中期价值）
- 第20年（长期价值）
- 第30年（退休规划）
- 保单到期年

### 5. 投资回报率分析
- 计算各计划书的 IRR（内部收益率）
- 对比不同年度的回本情况
- 分析长期投资价值

### 6. 保障范围对比
- 身故保障
- 疾病保障
- 其他附加保障
- 保障全面性评分

### 7. 灵活性对比
- 提取计划
- 保单贷款
- 红利选项
- 其他灵活功能

### 8. 综合评分与建议

为每份计划书打分（满分100分）：
- 保费性价比（30分）
- 现金价值增长（25分）
- 保障全面性（20分）
- 灵活性（15分）
- 公司信誉（10分）

## 输出格式要求

请使用 Markdown 格式输出，包含：
- 标题和分节清晰
- 使用表格展示对比数据
- 使用加粗、斜体强调重点
- 使用列表归纳要点
- 最后给出明确的推荐建议

## 分析原则
1. 客观公正，基于数据分析
2. 考虑客户的实际需求和财务状况
3. 长期价值优先于短期收益
4. 风险与收益平衡考虑
5. 通俗易懂，避免专业术语堆砌

请开始分析："""

        return prompt
