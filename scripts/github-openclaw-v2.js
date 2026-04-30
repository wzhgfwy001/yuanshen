/**
 * GitHub OpenClaw 技能分析报告
 * 
 * 使用技能模板：
 * - web-automation: 高级导航、截图、数据抓取
 * - web-automation-suite: Chrome CDP连接、元素操作、定时任务
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');

// 获取 WebSocket URL (web-automation-suite 模板)
async function getWSUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/version', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data).webSocketDebuggerUrl));
    }).on('error', reject);
  });
}

// 连接浏览器 (web-automation-suite 模板)
async function connectBrowser() {
  const wsUrl = await getWSUrl();
  const browser = await chromium.connectOverCDP(wsUrl);
  return browser;
}

async function main() {
  console.log('=== GitHub OpenClaw 技能分析任务 ===\n');
  
  try {
    // Step 1: 连接浏览器
    console.log('[Step 1] 连接 Edge 浏览器...');
    const browser = await connectBrowser();
    const context = await browser.newContext({ 
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    const page = await context.newPage();
    console.log('  ✅ 连接成功\n');
    
    // Step 2: 打开 GitHub 首页
    console.log('[Step 2] 打开 GitHub...');
    await page.goto('https://github.com', { 
      waitUntil: 'load', 
      timeout: 30000 
    });
    await page.waitForTimeout(2000);
    console.log('  ✅ GitHub 打开成功\n');
    
    // Step 3: 导航到搜索页面
    console.log('[Step 3] 执行搜索: openclaw...');
    await page.goto('https://github.com/search?q=openclaw&type=repositories&s=stars', { 
      waitUntil: 'load', 
      timeout: 45000 
    });
    await page.waitForTimeout(3000);
    console.log('  ✅ 搜索完成\n');
    
    // Step 4: 截图
    console.log('[Step 4] 截图保存...');
    await page.screenshot({ 
      path: 'C:/Users/DELL/.openclaw/workspace/scripts/github-search-openclaw.png',
      fullPage: true 
    });
    console.log('  ✅ 截图保存: github-search-openclaw.png\n');
    
    // Step 5: 提取仓库数据
    console.log('[Step 5] 提取仓库数据...');
    
    const repos = await page.evaluate(() => {
      const results = [];
      
      // GitHub 搜索结果选择器
      const items = document.querySelectorAll('li.repo-list-item');
      const altItems = document.querySelectorAll('.repo-list-item');
      
      if (items.length > 0) {
        items.forEach(item => {
          const nameEl = item.querySelector('h3 a');
          const descEl = item.querySelector('p');
          const starsEl = item.querySelector('a[href*="stargazers"]');
          const linkEl = item.querySelector('h3 a');
          
          if (nameEl) {
            results.push({
              name: nameEl.innerText?.trim() || '',
              desc: descEl?.innerText?.trim() || '',
              stars: starsEl?.innerText?.trim() || '0',
              link: linkEl?.href || ''
            });
          }
        });
      }
      
      return results;
    });
    
    console.log(`  ✅ 抓取到 ${repos.length} 个仓库\n`);
    
    if (repos.length === 0) {
      // 备选方法：直接从页面源代码提取
      console.log('  ⚠️ 使用备选提取方法...');
      const pageContent = await page.content();
      console.log('  页面内容长度:', pageContent.length);
      
      // 尝试提取所有 h3 链接
      const allLinks = await page.$$eval('h3 a', els => 
        els.slice(0, 15).map(e => ({ text: e.innerText?.trim(), href: e.href }))
      );
      console.log('  h3 链接:', allLinks);
    }
    
    // 保存数据
    fs.writeFileSync(
      'C:/Users/DELL/.openclaw/workspace/scripts/github-repos.json',
      JSON.stringify(repos, null, 2)
    );
    
    // Step 6: 生成报告
    console.log('[Step 6] 生成报告...');
    let report = '# GitHub OpenClaw 技能分析报告\n\n';
    report += `> 生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
    report += `> 仓库数量: ${repos.length}\n\n`;
    report += '---\n\n';
    
    if (repos.length === 0) {
      report += '⚠️ 未能抓取到仓库数据，请查看截图确认页面内容。\n\n';
      report += '截图位置: `C:\\Users\\DELL\\.openclaw\\workspace\\scripts\\github-search-openclaw.png`\n';
    } else {
      repos.forEach((repo, i) => {
        report += `## ${i + 1}. ${repo.name}\n\n`;
        if (repo.desc) report += `**描述:** ${repo.desc}\n`;
        report += `**星标:** ${repo.stars}\n`;
        if (repo.link) report += `**链接:** ${repo.link}\n`;
        report += '\n---\n\n';
      });
    }
    
    fs.writeFileSync(
      'C:/Users/DELL/.openclaw/workspace/scripts/github-openclaw-report.md',
      report
    );
    
    console.log('\n=== 任务完成 ===');
    console.log(`仓库数量: ${repos.length}`);
    console.log('报告: github-openclaw-report.md');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    // 截图保存错误状态
    try {
      const browser = await connectBrowser();
      const pages = await browser.pages();
      if (pages.length > 0) {
        await pages[0].screenshot({ 
          path: 'C:/Users/DELL/.openclaw/workspace/scripts/error-state.png',
          fullPage: true 
        });
        console.log('  错误截图已保存: error-state.png');
      }
    } catch (e) {}
    
    console.log('\n请查看截图确认问题原因。');
  }
  
  console.log('\n任务结束');
}

main();