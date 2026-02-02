================================================================================
  保险公司信息爬虫系统 - 使用说明
================================================================================

✅ 已完成配置：
  - 11家保险公司官网URL
  - 爬虫服务（Gemini 3 Flash Preview）
  - 5个API端点
  - Google搜索集成

📋 快速开始：

1. 配置URL（已完成）
   python3 quick_setup_urls.py

2. 使用Gemini自动查找URL
   python3 auto_find_urls_with_gemini.py

3. 测试爬虫
   python3 test_scraper.py

4. 抓取公司新闻（需要管理员token）
   curl -X POST http://localhost:8017/api/scraper/company-news/ \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"company_id": 3}'

5. 抓取产品资料
   curl -X POST http://localhost:8017/api/scraper/product-promotions/ \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"product_id": 17}'

🔧 API端点：
  - POST /api/scraper/company-news/         # 抓取公司新闻
  - POST /api/scraper/product-promotions/   # 抓取产品资料
  - POST /api/scraper/company-products/     # 批量抓取公司产品
  - GET  /api/scraper/find-pages/           # 查找页面URL
  - GET  /api/scraper/status/               # 查看统计

📚 详细文档：
  - INSURANCE_SCRAPER_API.md      # API文档
  - SCRAPER_QUICK_START.md        # 快速开始
  - GEMINI_AUTO_FIND_URLS.md      # AI自动查找URL
  - URL_SETUP_GUIDE.md            # URL配置指南

================================================================================
