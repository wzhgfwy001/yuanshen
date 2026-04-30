const { chromium } = require('playwright');

async function getChromeWSUrl() {
  const http = require('http');
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/version', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data).webSocketDebuggerUrl));
    }).on('error', reject);
  });
}

async function runTask() {
  console.log('=== B站自动化任务 ===');
  
  // 连接到已启动的浏览器
  const wsUrl = await getChromeWSUrl();
  console.log('Connected to browser via CDP');
  
  const browser = await chromium.connectOverCDP(wsUrl);
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  try {
    // 第1步：打开B站登录页
    console.log('Step 1: Opening Bilibili login page...');
    await page.goto('https://passport.bilibili.com/login', { waitUntil: 'networkidle', timeout: 60000 });
    await page.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/scripts/bilibili-login.png' });
    console.log('Screenshot saved: bilibili-login.png');
    console.log('Please scan the QR code now!');
    
    // 第2步：等待扫码登录成功
    console.log('Step 2: Waiting for QR scan...');
    // 等待URL变化或者出现已登录状态的元素
    await page.waitForFunction(() => {
      return window.location.href.includes('bilibili.com') && 
             !window.location.href.includes('passport');
    }, { timeout: 0 }); // 无限等待
    
    console.log('Login detected!');
    await page.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/scripts/bilibili-loggedin.png' });
    
    // 第3步：搜索失业博主
    console.log('Step 3: Searching for 失业 bloggers...');
    await page.goto('https://search.bilibili.com/upuser?keyword=失业&order=totalrank', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    // 提取博主信息
    const bloggers = await page.evaluate(() => {
      const items = document.querySelectorAll('.up-item');
      return Array.from(items).slice(0, 10).map(item => ({
        name: item.querySelector('.up-name')?.innerText || 'Unknown',
        uid: item.querySelector('.up-name')?.href?.match(/space\.bilibili\.com\/(\d+)/)?.[1] || '',
        fans: item.querySelector('.up-fans')?.innerText || '0'
      }));
    });
    
    console.log(`Found ${bloggers.length} bloggers`);
    console.log('Bloggers:', bloggers);
    
    // 保存博主列表
    const fs = require('fs');
    fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/scripts/bloggers.json', JSON.stringify(bloggers, null, 2));
    
    // 第4步：获取每个博主的热门视频
    console.log('Step 4: Getting top videos from each blogger...');
    const results = [];
    
    for (const blogger of bloggers) {
      console.log(`Fetching videos from ${blogger.name}...`);
      await page.goto(`https://space.bilibili.com/${blogger.uid}/video`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1000);
      
      // 获取视频列表（按播放量排序）
      const videos = await page.evaluate(() => {
        const items = document.querySelectorAll('.video-item a');
        return Array.from(items).slice(0, 6).map(item => ({
          title: item.title || item.querySelector('.title')?.innerText || '',
          bvid: item.href?.match(/video\/(BV\w+)/)?.[1] || '',
          link: item.href
        })).filter(v => v.bvid);
      });
      
      results.push({
        blogger: blogger.name,
        uid: blogger.uid,
        fans: blogger.fans,
        videos: videos.slice(0, 2)
      });
      
      await page.waitForTimeout(500);
    }
    
    console.log('Videos collected:', JSON.stringify(results, null, 2));
    fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/scripts/videos.json', JSON.stringify(results, null, 2));
    
    // 第5步：获取视频详情和文案
    console.log('Step 5: Getting video details and subtitles...');
    const detailedResults = [];
    
    for (const item of results) {
      for (const video of item.videos) {
        console.log(`Getting details for: ${video.title}`);
        await page.goto(`https://www.bilibili.com/video/${video.bvid}`, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(2000);
        
        const videoInfo = await page.evaluate(() => {
          // 获取标题
          const title = document.querySelector('.video-info-title')?.innerText || 
                        document.querySelector('h1')?.innerText || '';
          
          // 获取描述
          const desc = document.querySelector('.desc-info-text')?.innerText || '';
          
          // 获取话题标签
          const tags = Array.from(document.querySelectorAll('.tag-link'))
            .map(t => t.innerText)
            .filter(t => t && !t.includes('...'));
          
          // 获取点赞数
          const likes = document.querySelector('.like')?.innerText || 
                        document.querySelector('[data-type="like"]')?.innerText || '0';
          
          return { title, desc, tags, likes };
        });
        
        detailedResults.push({
          blogger: item.blogger,
          uid: item.uid,
          fans: item.fans,
          ...videoInfo,
          link: `https://www.bilibili.com/video/${video.bvid}`
        });
        
        await page.waitForTimeout(500);
      }
    }
    
    // 保存最终结果
    fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/scripts/final-results.json', JSON.stringify(detailedResults, null, 2));
    
    console.log('=== Task Complete ===');
    console.log(`Total bloggers: ${results.length}`);
    console.log(`Total videos analyzed: ${detailedResults.length}`);
    console.log('Results saved to: final-results.json');
    
    // 生成报告
    let report = '# 失业博主视频文案整理\n\n';
    for (const item of detailedResults) {
      report += `## ${item.blogger} (粉丝: ${item.fans})\n`;
      report += `**视频标题:** ${item.title}\n`;
      report += `**链接:** ${item.link}\n`;
      report += `**点赞:** ${item.likes}\n`;
      if (item.desc) report += `**视频描述:** ${item.desc}\n`;
      if (item.tags && item.tags.length > 0) report += `**话题标签:** ${item.tags.join(', ')}\n`;
      report += '\n---\n\n';
    }
    
    fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/scripts/bilibili-report.md', report);
    console.log('Report saved to: bilibili-report.md');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await page.close();
    await context.close();
    // 不关闭浏览器，保持登录状态
  }
}

runTask().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
