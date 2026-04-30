/**
 * GitHub OpenClaw 技能分析报告 v3
 * 
 * 使用技能模板：
 * - web-automation: 高级导航、截图、数据抓取
 * - web-automation-suite: Chrome CDP连接、元素操作、定时任务
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
  console.log('=== GitHub OpenClaw 技能分析任务 v3 ===\n');
  
  try {
    // Step 1: 连接浏览器 (web-automation-suite)
    console.log('[Step 1] 连接 Edge 浏览器...');
    const browser = await chromium.connectOverCDP(await getWSUrl());
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    console.log('  ✅ 连接成功\n');
    
    // Step 2: 导航到 GitHub 搜索 (web-automation)
    console.log('[Step 2] 打开 GitHub 搜索 openclaw...');
    await page.goto('https://github.com/search?q=openclaw&type=repositories&s=stars', { 
      waitUntil: 'load', 
      timeout: 45000 
    });
    await page.waitForTimeout(3000);
    console.log('  ✅ 搜索完成\n');
    
    // Step 3: 截图 (web-automation)
    console.log('[Step 3] 截图保存...');
    await page.screenshot({ 
      path: 'C:/Users/DELL/.openclaw/workspace/scripts/github-search-v3.png',
      fullPage: true 
    });
    console.log('  ✅ 截图保存\n');
    
    // Step 4: 提取仓库数据 (web-automation-suite)
    console.log('[Step 4] 提取仓库数据...');
    
    const repos = await page.evaluate(() => {
      const results = [];
      
      // 方法1：查找仓库列表项
      const items = document.querySelectorAll('li.repo-list-item');
      console.log('Found li.repo-list-item:', items.length);
      
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
      
      // 方法2：如果方法1没有，尝试查找所有 h3 链接
      if (results.length === 0) {
        console.log('Using h3 method...');
        const h3Links = document.querySelectorAll('h3 a');
        h3Links.forEach(a => {
          const text = a.innerText?.trim() || '';
          if (text && text.includes('/')) {
            results.push({
              name: text,
              desc: '',
              stars: '',
              link: a.href || ''
            });
          }
        });
        
        // 尝试从同一行获取更多信息
        const parentContainers = document.querySelectorAll('h3');
        parentContainers.forEach((h3, idx) => {
          if (results[idx]) {
            // 查找同一个容器内的其他信息
            const container = h3.closest('li') || h3.closest('.repo-list-item') || h3.parentElement?.parentElement;
            if (container) {
              const descEl = container.querySelector('p');
              const starsEl = container.querySelector('[href*="stargazers"]');
              if (descEl) results[idx].desc = descEl.innerText?.trim() || '';
              if (starsEl) results[idx].stars = starsEl.innerText?.trim() || '';
            }
          }
        });
      }
      
      return results.slice(0, 15);
    });
    
    console.log(`  ✅ 抓取到 ${repos.length} 个仓库\n`);
    
    // 保存数据
    fs.writeFileSync(
      'C:/Users/DELL/.openclaw/workspace/scripts/github-repos-v3.json',
      JSON.stringify(repos, null, 2)
    );
    
    // Step 5: 生成报告
    console.log('[Step 5] 生成分析报告...');
    let report = '# GitHub OpenClaw 技能分析报告\n\n';
    report += `> 生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
    report += `> 仓库数量: ${repos.length}\n`;
    report += `> 数据来源: GitHub 搜索 "openclaw" (按星标排序)\n\n`;
    report += '---\n\n';
    
    if (repos.length === 0) {
      report += '⚠️ 未能抓取到仓库数据\n';
    } else {
      repos.forEach((repo, i) => {
        report += `## ${i + 1}. ${repo.name}\n\n`;
        if (repo.desc) report += `**描述:** ${repo.desc}\n`;
        if (repo.stars) report += `**星标:** ${repo.stars}\n`;
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
    
    console.log('\n仓库列表:');
    repos.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.name} (${r.stars || '?'} stars)`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  }
  
  console.log('\n任务结束');
}

main();