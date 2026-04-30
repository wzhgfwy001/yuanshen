/**
 * GitHub浏览器自动化实用案例搜索 v2
 * 修复: 使用networkidle等待动态内容加载
 */

const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');

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
  console.log('=== GitHub 浏览器自动化实用案例搜索 v2 ===\n');

  let browser;
  let page;

  try {
    // 连接浏览器
    console.log('[1] 连接Edge浏览器...');
    browser = await chromium.connectOverCDP(await getWSUrl());
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 }
    });
    page = await context.newPage();
    console.log('  ✅ 连接成功\n');

    // 搜索关键词
    const searchTerms = [
      'playwright automation examples',
      'selenium browser automation',
      'puppeteer real world use cases'
    ];

    const allRepos = [];

    for (const term of searchTerms) {
      console.log(`[2] 搜索: "${term}"`);
      
      const url = `https://github.com/search?q=${encodeURIComponent(term)}&type=repositories`;
      console.log(`    URL: ${url}`);
      
      await page.goto(url, { timeout: 30000 });
      
      // 等待搜索结果加载
      try {
        await page.waitForSelector('li.repo-list-item, .repo-list-item', { timeout: 10000 });
        console.log('    ✅ 结果加载完成');
      } catch (e) {
        console.log('    ⚠️ 未找到结果元素');
      }
      
      // 截图
      const safeName = term.replace(/[^a-z0-9]/gi, '-');
      await page.screenshot({
        path: `C:/Users/DELL/.openclaw/workspace/scripts/search-${safeName}.png`,
        fullPage: false
      });
      
      // 提取数据
      const repos = await page.evaluate(() => {
        const items = document.querySelectorAll('li.repo-list-item');
        if (items.length === 0) {
          // 尝试其他选择器
          const altItems = document.querySelectorAll('[data-testid="repo-row"], .Box-row');
          return Array.from(altItems).slice(0, 5).map(item => {
            const nameEl = item.querySelector('a[itemprop="name"], h3 a, .flex-1 a');
            const descEl = item.querySelector('p[itemprop="description"], p');
            const starsEl = item.querySelector('[href*="/stargazers"], .Link--muted');
            
            return {
              name: nameEl ? nameEl.innerText.trim() : 'unknown',
              link: nameEl ? 'https://github.com' + nameEl.getAttribute('href') : '',
              description: descEl ? descEl.innerText.trim().substring(0, 150) : '',
              stars: starsEl ? starsEl.innerText.trim() : '0'
            };
          }).filter(r => r.name !== 'unknown');
        }
        
        return Array.from(items).slice(0, 5).map(item => {
          const nameEl = item.querySelector('h3 a');
          const descEl = item.querySelector('p');
          const starsEl = item.querySelector('[href*="/stargazers"]');
          
          return {
            name: nameEl ? nameEl.innerText.trim() : '',
            link: nameEl ? 'https://github.com' + nameEl.getAttribute('href') : '',
            description: descEl ? descEl.innerText.trim().substring(0, 150) : '',
            stars: starsEl ? starsEl.innerText.trim() : '0'
          };
        }).filter(r => r.name);
      });

      console.log(`    找到 ${repos.length} 个仓库`);
      allRepos.push(...repos.map(r => ({...r, searchTerm: term})));
      
      await page.waitForTimeout(2000);
    }

    // 去重
    const seen = new Set();
    const unique = allRepos.filter(r => {
      if (seen.has(r.name)) return false;
      seen.add(r.name);
      return true;
    });

    console.log(`\n[3] 共找到 ${unique.length} 个不重复仓库\n`);

    // 保存JSON
    http.writeFileSync(
      'C:/Users/DELL/.openclaw/workspace/scripts/browser-automation-repos-v2.json',
      JSON.stringify(unique, null, 2)
    );

    // 生成报告
    let report = '# GitHub 浏览器自动化实用案例\n\n';
    report += `> 搜索时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    report += '## 搜索关键词\n\n';
    searchTerms.forEach(t => report += `- ${t}\n`);
    report += '\n---\n\n## 仓库列表\n\n';
    
    unique.slice(0, 15).forEach((repo, i) => {
      report += `### ${i+1}. ${repo.name}\n\n`;
      report += `**⭐ ${repo.stars}**\n\n`;
      report += `${repo.description}\n\n`;
      report += `🔗 ${repo.link}\n\n`;
      report += `---\n\n`;
    });

    http.writeFileSync(
      'C:/Users/DELL/.openclaw/workspace/scripts/browser-automation-report-v2.md',
      report
    );

    console.log('  ✅ 报告已生成: browser-automation-report-v2.md\n');
    console.log('=== 完成 ===\n');
    
    if (unique.length > 0) {
      console.log('前5个仓库:');
      unique.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i+1}. ${r.name} (${r.stars}) - ${r.link}`);
      });
    } else {
      console.log('未找到仓库，请查看截图');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (page) {
      await page.screenshot({
        path: 'C:/Users/DELL/.openclaw/workspace/scripts/error-v2.png'
      }).catch(() => {});
    }
  }
}

main();