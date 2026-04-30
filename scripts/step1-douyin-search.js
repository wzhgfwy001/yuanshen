/**
 * Step 1: 抖音搜索OpenClaw技能推荐
 * 
 * 使用技能模板：
 * - web-automation: 高级导航、截图
 * - web-automation-suite: CDP连接、数据抓取
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');

async function getWSUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/version', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data).webSocketDebuggerUrl));
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== Step 1: 抖音搜索OpenClaw技能推荐 ===\n');

  let browser;
  let page;

  try {
    // Step 1.1: 连接浏览器 (web-automation-suite 模板)
    console.log('[1.1] 连接Edge浏览器...');
    browser = await chromium.connectOverCDP(await getWSUrl());
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    page = await context.newPage();
    console.log('  ✅ 连接成功\n');

    // Step 1.2: 打开抖音 (web-automation 模板)
    console.log('[1.2] 打开抖音搜索页...');
    await page.goto('https://www.douyin.com/search/OpenClaw', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(3000);
    console.log('  ✅ 抖音打开\n');

    // Step 1.3: 截图保存 (web-automation 模板)
    console.log('[1.3] 截图保存...');
    await page.screenshot({
      path: 'C:/Users/DELL/.openclaw/workspace/scripts/douyin-search-openclaw.png',
      fullPage: true
    });
    console.log('  ✅ 截图: douyin-search-openclaw.png\n');

    // Step 1.4: 检测页面状态
    console.log('[1.4] 检测页面状态...');
    const url = page.url();
    const title = await page.title();
    console.log(`  URL: ${url}`);
    console.log(`  Title: ${title}`);

    // 检查是否有验证码或登录提示
    const pageContent = await page.evaluate(() => {
      return {
        hasLogin: document.body.innerText.includes('登录') || document.body.innerText.includes('扫码'),
        hasCaptcha: document.body.innerText.includes('验证') || document.body.innerText.includes('验证码'),
        bodyText: document.body.innerText.substring(0, 500)
      };
    });

    console.log(`  需要登录: ${pageContent.hasLogin}`);
    console.log(`  需要验证: ${pageContent.hasCaptcha}`);

    if (pageContent.hasLogin || pageContent.hasCaptcha) {
      console.log('\n  ⚠️ 抖音需要登录或验证，可能无法继续');
    }

    // Step 1.5: 尝试提取搜索结果
    console.log('[1.5] 尝试提取数据...');
    
    // 等待搜索结果加载
    await page.waitForTimeout(5000);

    const searchResults = await page.evaluate(() => {
      // 抖音的搜索结果选择器可能很复杂
      const results = [];
      
      // 尝试查找视频项
      const videoItems = document.querySelectorAll('[class*="video-item"], [class*="videoItem"], .video-card');
      console.log('Found video items:', videoItems.length);
      
      // 尝试查找用户项
      const userItems = document.querySelectorAll('[class*="user-item"], [class*="userItem"], [class*="author"]');
      console.log('Found user items:', userItems.length);
      
      // 返回页面文本片段
      return {
        videoCount: videoItems.length,
        userCount: userItems.length,
        bodySnippet: document.body.innerText.substring(0, 1000)
      };
    });

    console.log('  搜索结果:', JSON.stringify(searchResults, null, 2));

    // 保存页面内容
    const htmlContent = await page.content();
    fs.writeFileSync(
      'C:/Users/DELL/.openclaw/workspace/scripts/douyin-page-content.html',
      htmlContent
    );
    console.log('  ✅ 页面HTML已保存: douyin-page-content.html\n');

    console.log('=== Step 1 完成 ===');
    console.log('请查看截图确认抖音页面状态。');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    
    // 错误时截图
    if (page) {
      await page.screenshot({
        path: 'C:/Users/DELL/.openclaw/workspace/scripts/douyin-error.png',
        fullPage: true
      }).catch(() => {});
      console.log('  错误截图已保存');
    }
  }

  console.log('\n任务完成');
}

main();