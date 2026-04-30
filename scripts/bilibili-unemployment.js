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
  console.log('Connecting to browser...');

  // 创建新上下文
  const browser = await chromium.connectOverCDP(wsUrl);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  // 直接访问B站
  console.log('Opening Bilibili...');
  await page.goto('https://www.bilibili.com', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  // 截图当前页面
  await page.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/scripts/bilibili-home.png' });

  // 检查是否已登录
  const url = page.url();
  console.log('Current URL:', url);

  const isLoggedIn = !url.includes('passport') && !url.includes('login');
  console.log('Is logged in:', isLoggedIn);

  if (!isLoggedIn) {
    console.log('\n请先登录！');
    await page.goto('https://passport.bilibili.com/login', { waitUntil: 'domcontentloaded' });
    console.log('登录页面已打开，请扫码...');
    await page.waitForTimeout(60000); // 等待60秒让用户扫码
  }

  // 搜索失业相关视频
  console.log('\n搜索"失业"相关视频...');
  await page.goto('https://search.bilibili.com/video?keyword=失业&order=click&duration=4', {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/scripts/search-unemployment.png', fullPage: true });

  // 提取视频列表
  const videos = await page.evaluate(() => {
    // B站视频列表选择器
    const items = document.querySelectorAll('.video-item, .bili-video-item, [class*="video-item"]');
    console.log('Found items:', items.length);

    if (items.length === 0) {
      // 备选：直接查找链接
      const allLinks = Array.from(document.querySelectorAll('a'))
        .filter(a => a.href.includes('/video/BV'))
        .slice(0, 20);

      return allLinks.map(a => ({
        title: a.querySelector('[class*="title"]')?.innerText || a.innerText?.substring(0, 50) || '',
        author: a.querySelector('[class*="author"]')?.innerText || a.querySelector('.up-name')?.innerText || '',
        link: a.href,
        bvid: a.href.match(/video\/(BV\w+)/)?.[1] || ''
      })).filter(v => v.title);
    }

    return Array.from(items).slice(0, 20).map(item => ({
      title: item.querySelector('[class*="title"]')?.innerText || item.querySelector('h3, h2')?.innerText || '',
      author: item.querySelector('[class*="author"]')?.innerText || item.querySelector('.up-name')?.innerText || '',
      link: item.querySelector('a')?.href || '',
      bvid: item.querySelector('a')?.href?.match(/video\/(BV\w+)/)?.[1] || ''
    })).filter(v => v.title || v.link);
  });

  console.log(`找到 ${videos.length} 个视频`);

  // 如果没找到，用备选方法
  if (videos.length === 0) {
    console.log('Using alternative extraction...');
    const altVideos = await page.evaluate(() => {
      const results = [];
      const links = document.querySelectorAll('a[href*="video/BV"]');
      links.slice(0, 20).forEach(a => {
        const title = a.querySelector('.title, [class*="title"], h3, h2')?.innerText ||
                      a.innerText?.substring(0, 50) || '';
        const author = a.querySelector('.author, [class*="author"], .up-name')?.innerText || '';
        if (title || a.href) {
          results.push({
            title,
            author,
            link: a.href,
            bvid: a.href.match(/video\/(BV\w+)/)?.[1] || ''
          });
        }
      });
      return results;
    });
    videos.push(...altVideos);
    console.log(`Alternative found ${altVideos.length} videos`);
  }

  // 保存视频列表
  fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/scripts/videos-list.json', JSON.stringify(videos, null, 2));
  console.log('Videos saved to videos-list.json');

  // 获取每个视频的详细信息
  console.log('\n获取视频详情...');
  const detailedVideos = [];

  for (let i = 0; i < Math.min(videos.length, 10); i++) {
    const v = videos[i];
    if (!v.bvid) continue;

    console.log(`[${i+1}/${Math.min(videos.length, 10)}] Getting: ${v.title}`);

    try {
      await page.goto(`https://www.bilibili.com/video/${v.bvid}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      await page.waitForTimeout(1500);

      const details = await page.evaluate(() => {
        const title = document.querySelector('h1, .video-info-title')?.innerText || '';
        const desc = document.querySelector('.desc-info-text, .desc, [class*="desc"]')?.innerText || '';
        const tags = Array.from(document.querySelectorAll('.tag-link, [class*="tag"]'))
          .map(t => t.innerText)
          .filter(t => t && !t.includes('...'))
          .slice(0, 5);
        const likes = document.querySelector('[data-type="like"], .like')?.innerText || '0';

        return { title, desc, tags, likes };
      });

      detailedVideos.push({
        ...v,
        ...details
      });

      await page.waitForTimeout(500);
    } catch (e) {
      console.log(`Error getting video ${v.bvid}: ${e.message}`);
    }
  }

  console.log(`\n获取到 ${detailedVideos.length} 个视频详情`);

  // 生成报告
  let report = '# 失业相关视频文案整理\n\n';
  report += `> 数据来源：B站搜索"失业"\n`;
  report += `> 采集时间：${new Date().toLocaleString('zh-CN')}\n`;
  report += `> 视频数量：${detailedVideos.length}\n\n`;
  report += '---\n\n';

  for (let i = 0; i < detailedVideos.length; i++) {
    const v = detailedVideos[i];
    report += `## ${i+1}. ${v.title}\n\n`;
    report += `**作者:** ${v.author}\n`;
    report += `**链接:** https://www.bilibili.com/video/${v.bvid}\n`;
    if (v.likes !== '0') report += `**点赞:** ${v.likes}\n`;
    if (v.desc) report += `**视频简介:** ${v.desc}\n`;
    if (v.tags && v.tags.length > 0) report += `**话题标签:** ${v.tags.join(', ')}\n`;
    report += '\n---\n\n';
  }

  fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/scripts/bilibili-report.md', report);
  console.log('\n报告已保存到: bilibili-report.md');

  console.log('\n=== 任务完成 ===');
  console.log(`\n共采集 ${detailedVideos.length} 个视频`);
  console.log('报告位置: C:\\Users\\DELL\\.openclaw\\workspace\\scripts\\bilibili-report.md');
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});