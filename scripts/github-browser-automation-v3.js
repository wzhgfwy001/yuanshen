/**
 * GitHub浏览器自动化实用案例搜索 v3
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
  console.log('=== GitHub 浏览器自动化实用案例搜索 v3 ===\n');

  let browser;
  let page;

  try {
    // 连接浏览器
    console.log('[1] 连接Edge浏览器...');
    browser = await chromium.connectOverCDP(await getWSUrl());
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    page = await context.newPage();
    console.log('  ✅ 连接成功\n');

    // 搜索关键词
    const searchTerms = [
      'playwright automation examples',
      'selenium browser automation github',
      'puppeteer real world use cases'
    ];

    const allRepos = [];

    for (const term of searchTerms) {
      console.log(`[2] 搜索: "${term}"`);
      
      const url = `https://github.com/search?q=${encodeURIComponent(term)}&type=repositories`;
      await page.goto(url, { timeout: 30000 });
      
      // 等待动态内容
      await page.waitForTimeout(3000);
      
      // 截图
      const safeName = term.replace(/[^a-z0-9]/gi, '-');
      await page.screenshot({
        path: `C:/Users/DELL/.openclaw/workspace/scripts/search-${safeName}.png`,
        fullPage: false
      });
      
      // 提取数据 - 尝试多个选择器
      const repos = await page.evaluate(() => {
        // 方法1: GitHub标准选择器
        let items = document.querySelectorAll('li.repo-list-item');
        
        // 方法2: 备选选择器
        if (items.length === 0) {
          items = document.querySelectorAll('[data-testid="repo-row"]');
        }
        
        // 方法3: 更通用的选择器
        if (items.length === 0) {
          items = document.querySelectorAll('.Box-row');
        }
        
        if (items.length === 0) {
          // 返回页面状态用于调试
          return { error: 'no items found', count: 0 };
        }
        
        return Array.from(items).slice(0, 5).map(item => {
          const nameEl = item.querySelector('h3 a') || item.querySelector('a[itemprop="name"]');
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

      if (repos.error) {
        console.log(`    ⚠️ ${repos.error}，页面结构可能已变`);
      } else {
        console.log(`    找到 ${repos.length} 个仓库`);
      }
      
      if (repos.count !== 0) {
        allRepos.push(...repos.map(r => ({...r, searchTerm: term})));
      }
      
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
    fs.writeFileSync(
      'C:/Users/DELL/.openclaw/workspace/scripts/browser-automation-repos-v3.json',
      JSON.stringify(unique, null, 2)
    );

    // 生成报告
    let report = '# GitHub 浏览器自动化实用案例\n\n';
    report += `> 搜索时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    report += '## 搜索关键词\n\n';
    searchTerms.forEach(t => report += `- ${t}\n`);
    report += '\n---\n\n## 仓库列表\n\n';
    
    if (unique.length > 0) {
      unique.slice(0, 15).forEach((repo, i) => {
        report += `### ${i+1}. ${repo.name}\n\n`;
        report += `**⭐ ${repo.stars}**\n\n`;
        report += `${repo.description}\n\n`;
        report += `🔗 ${repo.link}\n\n`;
        report += `---\n\n`;
      });
    } else {
      report += '*未找到仓库，请查看截图*\n\n';
    }

    fs.writeFileSync(
      'C:/Users/DELL/.openclaw/workspace/scripts/browser-automation-report-v3.md',
      report
    );

    console.log('  ✅ 报告已生成\n');
    console.log('=== 完成 ===\n');
    
    if (unique.length > 0) {
      console.log('前5个仓库:');
      unique.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i+1}. ${r.name} (${r.stars}) - ${r.link}`);
      });
    } else {
      console.log('未找到仓库');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (page) {
      await page.screenshot({
        path: 'C:/Users/DELL/.openclaw/workspace/scripts/error-v3.png'
      }).catch(() => {});
    }
  }
}

main();