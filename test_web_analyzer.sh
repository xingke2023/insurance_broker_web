#!/bin/bash
# Web Analyzer 测试脚本

echo "=========================================="
echo "网页分析工具测试"
echo "=========================================="

# 测试1: 基础模式
echo -e "\n[测试1] 基础模式（DOM提取）"
echo "python3 web_analyzer.py --url 'https://www.manulife.com.hk/zh-hk/individual/products/savings.html'"
python3 web_analyzer.py --url "https://www.manulife.com.hk/zh-hk/individual/products/savings.html"

echo -e "\n\n按 Enter 继续下一个测试..."
read

# 测试2: Gemini模式
echo -e "\n[测试2] Gemini智能分析模式"
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  未设置 GEMINI_API_KEY，跳过此测试"
else
    echo "python3 web_analyzer.py --url 'https://www.manulife.com.hk/zh-hk/individual/products/savings.html' --gemini"
    python3 web_analyzer.py --url "https://www.manulife.com.hk/zh-hk/individual/products/savings.html" --gemini
fi

echo -e "\n\n按 Enter 继续下一个测试..."
read

# 测试3: 自定义提示
echo -e "\n[测试3] Gemini + 自定义提示"
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  未设置 GEMINI_API_KEY，跳过此测试"
else
    echo "python3 web_analyzer.py --url '...' --gemini --prompt '重点标注中文资料'"
    python3 web_analyzer.py \
        --url "https://www.manulife.com.hk/zh-hk/individual/products/savings.html" \
        --gemini \
        --prompt "重点标注中文资料和产品小册子"
fi

echo -e "\n=========================================="
echo "✅ 测试完成！"
echo "=========================================="
echo -e "\n查看输出文件："
echo "ls -lh /tmp/web-analysis-*.json"
ls -lh /tmp/web-analysis-*.json 2>/dev/null | tail -5

echo -e "\n查看截图："
echo "ls -lh /tmp/screenshot-*.png"
ls -lh /tmp/screenshot-*.png 2>/dev/null | tail -5
