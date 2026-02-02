#!/bin/bash
# 测试客户案例标签系统API

BASE_URL="http://localhost:8017/api/customer-cases"

echo "========================================="
echo "测试1: 获取所有标签"
echo "========================================="
curl -s "$BASE_URL/tags/" | python3 -m json.tool | head -30

echo ""
echo "========================================="
echo "测试2: 按标签筛选 - 扶幼保障期"
echo "========================================="
curl -s "$BASE_URL/by-tag/扶幼保障期/" | python3 -m json.tool | head -20

echo ""
echo "========================================="
echo "测试3: 多标签查询 - 扶幼保障期,收入成长期"
echo "========================================="
curl -s "$BASE_URL/?tags=扶幼保障期,收入成长期" | python3 -m json.tool | head -20

echo ""
echo "========================================="
echo "测试4: 获取统计信息"
echo "========================================="
curl -s "$BASE_URL/statistics/" | python3 -m json.tool

echo ""
echo "========================================="
echo "测试5: 获取单个案例详情"
echo "========================================="
curl -s "$BASE_URL/1/" | python3 -m json.tool | head -30
