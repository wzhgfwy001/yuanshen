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
  console.log('=== 失业博主视频文案采集 ===\n');

  const wsUrl = await getWSUrl();
  const browser = await chromium.connectOverCDP(wsUrl);

  // 获取现有上下文
  const targets = await browser.targets();
  console.log('Available pages:', targets.length);

  // 找到已登录的页面
  let page;
  for (const target of targets) {
    if (target.url().includes('bilibili.com') && !target.url().includes('passport')) {
      const t = await target.browserContext();
      page = await target.page();
      console.log('Found Bilibili page:', target.url());
      break;
    }
  }

  if (!page) {
    console.log('No logged-in page found, creating new page in existing context...');
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto('https://www.bilibili.com', { waitUntil: 'networkidle' });
  }

  await page.bringToFront();

  // 检查登录状态
  const isLoggedIn = await page.evaluate(() => {
    return document.cookie.includes('SESSDATA') || document.cookie.includes('bili_jct');
  });

  if (!isLoggedIn) {
    console.log('Not logged in! Please scan QR code first.');
    await page.goto('https://passport.bilibili.com/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(10000);
    return;
  }

  console.log('User is logged in! Starting search...\n');

  // 第1步：搜索失业相关用户
  console.log('Step 1: 搜索"失业"相关UP主...');
  await page.goto('https://search.bilibili.com/upuser?keyword=失业&order=fans', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  // 截图搜索结果
  await page.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/scripts/search-results.png', fullPage: true });

  // 提取UP主信息
  const uppers = await page.evaluate(() => {
    const items = document.querySelectorAll('.up-item');
    if (items.length === 0) {
      // 尝试其他选择器
      const allItems = document.querySelectorAll('[class*="user"], [class*="up"]');
      return Array.from(allItems).slice(0, 10).map(item => ({
        name: item.querySelector('[class*="name"]')?.innerText || item.innerText?.substring(0, 30) || 'Unknown',
        link: item.querySelector('a')?.href || ''
      }));
    }
    return Array.from(items).slice(0, 10).map(item => ({
      name: item.querySelector('.up-name')?.innerText || item.querySelector('[class*="name"]')?.innerText || 'Unknown',
      link: item.querySelector('a')?.href || item.querySelector('.up-name')?.href || ''
    })).filter(i => i.name !== 'Unknown');
  });

  console.log(`Found ${uppers.length} UP主`);
  console.log('UP主列表:', uppers.slice(0, 3));

  fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/scripts/uppers.json', JSON.stringify(uppers, null, 2));

  // 如果没有找到，尝试关键词搜索
  if (uppers.length < 3) {
    console.log('\n尝试直接搜索视频...');
    await page.goto('https://search.bilibili.com/video?keyword=失业&order=click', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    const videos = await page.evaluate(() => {
      const items = document.querySelectorAll('.video-item, [class*="video-item"]');
      return Array.from(items).slice(0, 20).map(item => ({
        title: item.querySelector('[class*="title"]')?.innerText || item.innerText?.substring(0, 50) || '',
        author: item.querySelector('[class*="author"]')?.innerText || '',
        link: item.querySelector('a')?.href || ''
      })).filter(v => v.title);
    });

    console.log(`Found ${videos.length} 视频`);
    fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/scripts/videos.json', JSON.stringify(videos, null, 2));

    // 生成报告
    let report = '# 失业相关视频文案整理\n\n';
    for (const v of videos.slice(0, 10)) {
      report += `## ${v.title}\n`;
      report += `**作者:** ${v.author}\n`;
      report += `**链接:** ${v.link}\n\n---\n\n`;
    }
    fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/scripts/final-report.md', report);
    console.log('\n报告已保存到: final-report.md');
  }

  console.log('\n=== 任务完成 ===');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});