/**
 * 保险产品爬虫工具 - 混合模式（DOM + Gemini）
 *
 * 工作流程：
 * 1. 先用DOM提取所有PDF和视频链接（确保完整性）
 * 2. 如果启用Gemini，在DOM结果基础上做智能分类和描述
 *
 * 使用方法：
 * PRODUCT_URL="https://..." PRODUCT_ID=17 \
 * node /home/ubuntu/.claude/skills/playwright-skill/run.js /var/www/harry-insurance2/scripts/playwright/product-scraper.js
 *
 * 可选启用Gemini增强：
 * PRODUCT_URL="https://..." PRODUCT_ID=17 USE_GEMINI=true GEMINI_API_KEY="..." \
 * node /home/ubuntu/.claude/skills/playwright-skill/run.js /var/www/harry-insurance2/scripts/playwright/product-scraper.js
 */

const { chromium } = require('playwright');
const https = require('https');

// 从环境变量获取参数
const PRODUCT_URL = process.env.PRODUCT_URL || null;
const PRODUCT_ID = process.env.PRODUCT_ID || null;
const USE_GEMINI = process.env.USE_GEMINI === 'true';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
const CUSTOM_REQUIREMENTS = process.env.CUSTOM_REQUIREMENTS || null;

if (!PRODUCT_ID) {
  console.error('❌ 错误：请设置环境变量 PRODUCT_ID');
  process.exit(1);
}

if (!PRODUCT_URL) {
  console.error('❌ 错误：请设置环境变量 PRODUCT_URL');
  process.exit(1);
}

if (USE_GEMINI && !GEMINI_API_KEY) {
  console.error('❌ 错误：启用Gemini需要设置 GEMINI_API_KEY');
  process.exit(1);
}

console.log(`\n🔍 产品爬虫启动（混合模式）`);
console.log(`   目标URL: ${PRODUCT_URL}`);
console.log(`   产品ID: ${PRODUCT_ID}`);
console.log(`   Gemini增强: ${USE_GEMINI ? '✅ 启用' : '❌ 未启用'}`);
if (CUSTOM_REQUIREMENTS) {
  console.log(`   自定义要求: ${CUSTOM_REQUIREMENTS}`);
}

/**
 * 步骤1：使用DOM提取所有链接
 */
async function extractAllLinks(page) {
  console.log('\n📥 步骤1：DOM提取所有链接...');

  // 提取所有PDF链接
  const pdfLinks = await page.$$eval('a[href]', links => {
    return links
      .map(link => ({
        url: link.href,
        text: link.textContent.trim()
      }))
      .filter(item => item.url && item.url.toLowerCase().endsWith('.pdf'))
      .filter(item => item.text.length > 0)
      .map(item => ({
        title: item.text,
        url: item.url,
        type: 'pdf'
      }));
  });

  // 提取所有视频链接
  const videoLinks = await page.$$eval('a[href]', links => {
    return links
      .map(link => ({
        url: link.href,
        text: link.textContent.trim()
      }))
      .filter(item => {
        const url = item.url.toLowerCase();
        return url.includes('youtube.com') ||
               url.includes('youtu.be') ||
               url.includes('vimeo.com') ||
               url.includes('.mp4') ||
               url.includes('video');
      })
      .filter(item => item.text.length > 0)
      .map(item => ({
        title: item.text,
        url: item.url,
        type: 'video'
      }));
  });

  // 去重（基于URL）
  const uniqueLinks = {};
  [...pdfLinks, ...videoLinks].forEach(item => {
    uniqueLinks[item.url] = item;
  });

  const allLinks = Object.values(uniqueLinks);

  console.log(`✅ DOM提取完成：`);
  console.log(`   PDF文件: ${pdfLinks.length} 个`);
  console.log(`   视频链接: ${videoLinks.length} 个`);
  console.log(`   总计（去重后）: ${allLinks.length} 条`);

  return allLinks;
}

/**
 * 步骤2：使用Gemini分析和分类DOM结果
 */
async function enhanceWithGemini(url, domLinks) {
  return new Promise((resolve, reject) => {
    console.log('\n🤖 步骤2：Gemini智能分析...');

    // 构建链接列表文本
    let linksText = domLinks.map((link, index) => {
      return `${index + 1}. [${link.type.toUpperCase()}] ${link.title}\n   URL: ${link.url}`;
    }).join('\n\n');

    // 构建基础prompt
    let basePrompt = `你是一个专业的保险产品信息分析专家。我已经从产品网页中提取了以下所有链接。

网页URL: ${url}

提取的链接（共${domLinks.length}条）：
${linksText}

请对这些链接进行智能分类和描述，返回JSON格式：
{
    "product_name": "产品名称（从网页推断）",
    "product_description": "产品简要描述（从链接标题推断）",
    "promotions": [
        {
            "title": "资料标题（保持原标题或优化）",
            "content_type": "news/brochure/guide/video/article/other",
            "description": "资料描述或摘要（50字以内）",
            "url": "完整的链接地址（保持原样）",
            "is_important": true/false（核心资料如产品单张、说明书标记为true）
        }
    ]
}

分析要求：
1. **保留所有链接**：不要过滤任何链接，全部保留
2. **智能分类**：根据标题判断content_type（产品小册子→brochure，服务手册→guide，优惠→news，视频→video）
3. **标记重要性**：核心产品资料（产品单张、说明书、详细条款）标记为is_important=true
4. **优化描述**：为每个资料生成简短描述（从标题推断用途）
5. **推断产品信息**：从链接标题推断产品名称和描述`;

    // 如果有自定义要求，添加到prompt
    if (CUSTOM_REQUIREMENTS) {
      basePrompt += `\n\n特别要求：\n${CUSTOM_REQUIREMENTS}`;
    }

    basePrompt += '\n\n请开始分析，只返回JSON，不要有其他文字：';

    const prompt = basePrompt;

    // 构建请求数据
    const requestData = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    });

    // Gemini API配置
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.error) {
            reject(new Error(`Gemini API错误: ${response.error.message}`));
            return;
          }

          if (!response.candidates || response.candidates.length === 0) {
            reject(new Error('Gemini未返回有效结果'));
            return;
          }

          const candidate = response.candidates[0];
          let resultText = candidate.content.parts[0].text.trim();

          // 清理markdown标记
          if (resultText.startsWith('```json')) {
            resultText = resultText.substring(7);
          }
          if (resultText.startsWith('```')) {
            resultText = resultText.substring(3);
          }
          if (resultText.endsWith('```')) {
            resultText = resultText.substring(0, resultText.length - 3);
          }

          resultText = resultText.trim();

          // 解析JSON
          const analysisResult = JSON.parse(resultText);

          console.log('✅ Gemini分析完成');
          console.log(`   产品名称: ${analysisResult.product_name || 'N/A'}`);
          console.log(`   增强资料: ${analysisResult.promotions ? analysisResult.promotions.length : 0} 条`);

          // 验证：确保所有DOM链接都被保留
          const enhancedUrls = new Set(analysisResult.promotions.map(p => p.url));
          const domUrls = new Set(domLinks.map(l => l.url));
          const missingUrls = [...domUrls].filter(url => !enhancedUrls.has(url));

          if (missingUrls.length > 0) {
            console.log(`\n⚠️  警告：Gemini遗漏了 ${missingUrls.length} 个链接，自动补回...`);
            // 补回遗漏的链接
            missingUrls.forEach(url => {
              const originalLink = domLinks.find(l => l.url === url);
              analysisResult.promotions.push({
                title: originalLink.title,
                content_type: originalLink.type === 'video' ? 'video' : 'other',
                description: '',
                url: originalLink.url,
                is_important: false
              });
            });
          }

          resolve(analysisResult);

        } catch (error) {
          reject(new Error(`解析Gemini响应失败: ${error.message}\n原始响应: ${data.substring(0, 500)}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Gemini API请求失败: ${error.message}`));
    });

    req.write(requestData);
    req.end();
  });
}

(async () => {
  // 输出目录配置（持久化目录）
  const outputDir = '/var/www/harry-insurance2/temp_files/playwright_output';
  const screenshotPath = `${outputDir}/product-page-${PRODUCT_ID}.png`;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  try {
    console.log('\n📥 正在加载产品页面...');
    await page.goto(PRODUCT_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // 等待页面稳定
    await page.waitForTimeout(3000);

    console.log('✅ 页面加载完成');

    // 截图（保存到项目目录）
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log(`📸 已保存页面截图: ${screenshotPath}`);

    // 步骤1：DOM提取所有链接
    const domLinks = await extractAllLinks(page);

    let finalResult;

    if (USE_GEMINI) {
      // 步骤2：Gemini分析和分类
      try {
        const geminiResult = await enhanceWithGemini(PRODUCT_URL, domLinks);

        finalResult = {
          product_id: PRODUCT_ID,
          product_url: PRODUCT_URL,
          scraped_at: new Date().toISOString(),
          analysis_method: 'hybrid-gemini-enhanced',
          dom_links_count: domLinks.length,
          ...geminiResult
        };
      } catch (geminiError) {
        console.error(`\n⚠️  Gemini分析失败: ${geminiError.message}`);
        console.log('   回退到基础DOM模式');

        // 回退到基础DOM结果
        finalResult = {
          product_id: PRODUCT_ID,
          product_url: PRODUCT_URL,
          scraped_at: new Date().toISOString(),
          analysis_method: 'basic-dom-fallback',
          pdfs: domLinks.filter(l => l.type === 'pdf'),
          videos: domLinks.filter(l => l.type === 'video')
        };
      }
    } else {
      // 基础DOM模式
      finalResult = {
        product_id: PRODUCT_ID,
        product_url: PRODUCT_URL,
        scraped_at: new Date().toISOString(),
        analysis_method: 'basic-dom',
        pdfs: domLinks.filter(l => l.type === 'pdf'),
        videos: domLinks.filter(l => l.type === 'video')
      };
    }

    // 保存结果（保存到项目目录）
    const fs = require('fs');
    const outputFile = `${outputDir}/product-scrape-${PRODUCT_ID}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(finalResult, null, 2));
    console.log(`\n💾 已保存分析结果: ${outputFile}`);

    // 输出摘要
    console.log('\n📊 最终结果摘要：');
    console.log(`   分析模式: ${finalResult.analysis_method}`);

    if (finalResult.promotions) {
      console.log(`   产品名称: ${finalResult.product_name || 'N/A'}`);
      console.log(`   资料总数: ${finalResult.promotions.length} 条`);

      const importantCount = finalResult.promotions.filter(p => p.is_important).length;
      const pdfCount = finalResult.promotions.filter(p => p.url && p.url.toLowerCase().endsWith('.pdf')).length;
      const videoCount = finalResult.promotions.filter(p => p.content_type === 'video').length;

      console.log(`   核心资料: ${importantCount} 条`);
      console.log(`   PDF文件: ${pdfCount} 个`);
      console.log(`   视频链接: ${videoCount} 个`);
    } else {
      console.log(`   PDF文件: ${finalResult.pdfs.length} 个`);
      console.log(`   视频链接: ${finalResult.videos.length} 个`);
    }

    console.log('\n✅ 爬取完成！');
    console.log('📌 输出文件：');
    console.log(`   JSON数据: ${outputFile}`);
    console.log(`   页面截图: ${screenshotPath}`);

  } catch (error) {
    console.error('\n❌ 错误:', error.message);

    // 错误时也截图
    try {
      const errorScreenshot = `${outputDir}/error-product-${PRODUCT_ID}.png`;
      await page.screenshot({ path: errorScreenshot });
      console.log(`📸 已保存错误截图: ${errorScreenshot}`);
    } catch (e) {
      // 忽略截图错误
    }

    throw error;
  } finally {
    await browser.close();
  }
})();
