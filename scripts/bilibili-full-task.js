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
  console.log('=== B站登录 + 失业博主采集任务 ===\n');

  const wsUrl = await getWSUrl();
  const browser = await chromium.connectOverCDP(wsUrl);

  // 创建新上下文
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  // 第1步：打开登录页
  console.log('Step 1: 打开B站登录页...');
  await page.goto('https://passport.bilibili.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/scripts/01-login.png' });
  console.log('截图已保存: 01-login.png');
  console.log('请扫码登录！\n');

  // 第2步：等待扫码
  console.log('Step 2: 等待扫码登录...');
  let loginSuccess = false;

  for (let i = 0; i < 120; i++) { // 最多等10分钟
    await page.waitForTimeout(5000);
    const url = page.url();

    console.log(`[${i*5}s] URL: ${url}`);

    // 检测是否已登录（离开登录页）
    if (!url.includes('passport') && !url.includes('login')) {
      console.log('\n✅ 检测到登录成功！');
      loginSuccess = true;
      await page.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/scripts/02-loggedin.png' });
      break;
    }

    // 检测页面内容变化
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes('扫码') && !bodyText.includes('登录')) {
      console.log('\n✅ 登录状态变化，检测成功！');
      loginSuccess = true;
      await page.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/scripts/02-loggedin.png' });
      break;
    }
  }

  if (!loginSuccess) {
    console.log('\n❌ 登录超时，请重试');
    process.exit(1);
  }

  // 保存登录状态
  await context.storageState({ path: 'C:/Users/DELL/.openclaw/workspace/scripts/bilibili-state.json' });
  console.log('登录状态已保存\n');

  // 第3步：搜索失业博主
  console.log('Step 3: 搜索"失业"相关博主...');
  await page.goto('https://search.bilibili.com/upuser?keyword=失业&order=fans', {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/scripts/03-bloggers.png', fullPage: true });

  // 提取博主
  const bloggers = await page.evaluate(() => {
    const items = document.querySelectorAll('.up-item');
    return Array.from(items).slice(0, 10).map(item => {
      const nameEl = item.querySelector('.up-name, [class*="name"]');
      const fansEl = item.querySelector('.up-fans, [class*="fans"]');
      const link = nameEl?.href || '';
      return {
        name: nameEl?.innerText?.trim() || '未知',
        fans: fansEl?.innerText?.trim() || '0',
        uid: link.match(/space\.bilibili\.com\/(\d+)/)?.[1] || '',
        link: link
      };
    }).filter(b => b.name && b.name !== '未知');
  });

  console.log(`找到 ${bloggers.length} 个博主`);
  fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/scripts/bloggers.json', JSON.stringify(bloggers, null, 2));

  // 第4步：获取每个博主的热门视频
  console.log('\nStep 4: 获取每个博主的热门视频...');
  const results = [];

  for (let i = 0; i < bloggers.length; i++) {
    const blogger = bloggers[i];
    console.log(`[${i+1}/${bloggers.length}] ${blogger.name}...`);

    if (!blogger.uid) {
      console.log('  无UID，跳过');
      continue;
    }

    try {
      await page.goto(`https://space.bilibili.com/${blogger.uid}/video?order=pubdate&ps=30`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      await page.waitForTimeout(2000);

      // 获取视频列表
      const videos = await page.evaluate(() => {
        const items = document.querySelectorAll('.video-item, .bili-video-item, [class*="video-item"]');
        return Array.from(items)
          .filter(item => item.querySelector('a[href*="/video/BV"]'))
          .slice(0, 6)
          .map(item => {
            const a = item.querySelector('a[href*="/video/BV"]');
            return {
              title: a?.title || a?.innerText?.substring(0, 50) || '',
              bvid: a?.href?.match(/video\/(BV\w+)/)?.[1] || '',
              link: a?.href || ''
            };
          });
      });

      results.push({
        blogger: blogger.name,
        uid: blogger.uid,
        fans: blogger.fans,
        videos: videos.slice(0, 2)
      });

      await page.waitForTimeout(500);
    } catch (e) {
      console.log(`  错误: ${e.message}`);
    }
  }

  console.log(`\n获取到 ${results.length} 个博主的视频信息`);
  fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/scripts/blogger-videos.json', JSON.stringify(results, null, 2));

  // 第5步：获取视频详情
  console.log('\nStep 5: 获取视频详情和文案...');
  const finalResults = [];

  for (const item of results) {
    for (const video of item.videos) {
      if (!video.bvid) continue;

      console.log(`  获取: ${video.title?.substring(0, 30)}...`);

      try {
        await page.goto(`https://www.bilibili.com/video/${video.bvid}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        await page.waitForTimeout(2000);

        const details = await page.evaluate(() => {
          const title = document.querySelector('h1')?.innerText || document.querySelector('.video-info-title')?.innerText || '';
          const desc = document.querySelector('.desc-info-text, .desc')?.innerText || '';
          const tags = Array.from(document.querySelectorAll('.tag-link, .tag'))
            .map(t => t.innerText)
            .filter(t => t && !t.includes('...'))
            .slice(0, 5);
          const likes = document.querySelector('[data-type="like"] .count, .like .count')?.innerText || '0';

          return { title, desc, tags, likes };
        });

        finalResults.push({
          blogger: item.blogger,
          fans: item.fans,
          ...details,
          link: `https://www.bilibili.com/video/${video.bvid}`
        });

        await page.waitForTimeout(500);
      } catch (e) {
        console.log(`  错误: ${e.message}`);
      }
    }
  }

  // 保存结果
  fs.writeFileSync('C:/Users/DELL\.openclaw\workspace\scripts\final-results.json', JSON.stringify(finalResults, null, 2));

  // 生成报告
  let report = '# 失业博主视频文案整理\n\n';
  report += `> 采集时间：${new Date().toLocaleString('zh-CN')}\n`;
  report += `> 博主数量：${results.length}\n`;
  report += `> 视频数量：${finalResults.length}\n\n`;
  report += '---\n\n';

  for (let i = 0; i < finalResults.length; i++) {
    const v = finalResults[i];
    report += `## ${i+1}. ${v.title || '无标题'}\n\n`;
    report += `**博主:** ${v.blogger} (粉丝: ${v.fans})\n`;
    report += `**链接:** ${v.link}\n`;
    report += `**点赞:** ${v.likes}\n`;
    if (v.desc) report += `**简介:** ${v.desc.substring(0, 200)}\n`;
    if (v.tags && v.tags.length > 0) report += `**话题:** ${v.tags.slice(0, 5).join(', ')}\n`;
    report += '\n---\n\n';
  }

  fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/scripts/bilibili-final-report.md', report);

  console.log('\n=== 任务完成 ===');
  console.log(`博主: ${results.length}`);
  console.log(`视频: ${finalResults.length}`);
  console.log('报告: C:\\Users\\DELL\\.openclaw\\workspace\\scripts\\bilibili-final-report.md');

  // 不要关闭浏览器，让用户可以看到结果
  console.log('\n浏览器保持打开，按 Ctrl+C 结束');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});