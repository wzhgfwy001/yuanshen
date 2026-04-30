/**
 * GitHub浏览器自动化实用案例搜索
 * 
 * 任务：搜索playwright/selenium/puppeteer实用案例，学习并整理
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
  console.log('=== GitHub 浏览器自动化实用案例搜索 ===\n');

  let browser;
  let page;

  try {
    // 连接浏览器 (web-automation-suite)
    console.log('[1] 连接Edge浏览器...');
    browser = await chromium.connectOverCDP(await getWSUrl());
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    page = await context.newPage();
    console.log('  ✅ 连接成功\n');

    // 搜索关键词列表
    const searchTerms = [
      'playwright automation examples',
      'browser automation best practices',
      'puppeteer automation real world'
    ];

    const allRepos = [];

    for (const term of searchTerms) {
      console.log(`[2] 搜索: ${term}`);
      
      await page.goto(`https://github.com/search?q=${encodeURIComponent(term)}&type=repositories`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      await page.waitForTimeout(3000);
      
      // 提取仓库信息
      const repos = await page.evaluate(() => {
        const items = document.querySelectorAll('li.repo-list-item, .repo-list-item');
        return Array.from(items).slice(0, 5).map(item => {
          const nameEl = item.querySelector('h3 a');
          const descEl = item.querySelector('p');
          const starsEl = item.querySelector('[href*="/stargazers"]');
          const langEl = item.querySelector('[itemprop="programmingLanguage"]');
          
          return {
            name: nameEl ? nameEl.innerText.trim() : '',
            link: nameEl ? 'https://github.com' + nameEl.getAttribute('href') : '',
            description: descEl ? descEl.innerText.trim().substring(0, 200) : '',
            stars: starsEl ? starsEl.innerText.trim() : '0',
            language: langEl ? langEl.innerText.trim() : ''
          };
        }).filter(r => r.name);
      });

      console.log(`  找到 ${repos.length} 个仓库`);
      allRepos.push(...repos.map(r => ({...r, searchTerm: term})));
      
      // 保存截图
      const safeName = term.replace(/[^a-z0-9]/gi, '-');
      await page.screenshot({
        path: `C:/Users/DELL/.openclaw/workspace/scripts/github-search-${safeName}.png`,
        fullPage: false
      });
      
      await page.waitForTimeout(1000);
    }

    // 去重
    const uniqueRepos = [];
    const seenNames = new Set();
    for (const repo of allRepos) {
      if (!seenNames.has(repo.name)) {
        seenNames.add(repo.name);
        uniqueRepos.push(repo);
      }
    }

    console.log(`\n[3] 共找到 ${uniqueRepos.length} 个不重复的仓库\n`);

    // 保存数据
    fs.writeFileSync(
      'C:/Users/DELL/.openclaw/workspace/scripts/browser-automation-repos.json',
      JSON.stringify(uniqueRepos, null, 2)
    );
    console.log('  ✅ 数据已保存\n');

    // 生成报告
    let report = '# GitHub 浏览器自动化实用案例\n\n';
    report += '> 搜索时间: ' + new Date().toLocaleString('zh-CN') + '\n\n';
    report += '## 搜索关键词\n\n';
    report += searchTerms.map(t => `- ${t}`).join('\n') + '\n\n';
    report += '---\n\n';
    
    report += '## 仓库列表\n\n';
    
    for (let i = 0; i < Math.min(uniqueRepos.length, 15); i++) {
      const repo = uniqueRepos[i];
      report += `### ${i + 1}. ${repo.name}\n\n`;
      report += `**⭐ ${repo.stars}** | **${repo.language}**\n\n`;
      report += `${repo.description}\n\n`;
      report += `🔗 ${repo.link}\n\n`;
      report += `---\n\n`;
    }

    fs.writeFileSync(
      'C:/Users/DELL/.openclaw/workspace/scripts/browser-automation-report.md',
      report
    );
    console.log('  ✅ 报告已生成\n');

    console.log('=== 搜索完成 ===\n');
    console.log(`找到 ${uniqueRepos.length} 个仓库`);
    console.log(`报告: browser-automation-report.md`);

    // 打印前5个
    console.log('\n前5个仓库:');
    uniqueRepos.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i+1}. ${r.name} (${r.stars}⭐) - ${r.link}`);
    });

  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (page) {
      await page.screenshot({
        path: 'C:/Users/DELL/.openclaw/workspace/scripts/github-error.png'
      }).catch(() => {});
    }
  }
}

main();