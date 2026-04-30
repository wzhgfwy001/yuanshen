/**
 * GitHub OpenClaw 技能分析报告
 * 
 * 使用技能模板：
 * - web-automation: 高级导航、截图、数据抓取
 * - web-automation-suite: Chrome CDP连接、元素操作、定时任务
 * 
 * 流程：
 * 1. 连接 Edge CDP
 * 2. 打开 GitHub
 * 3. 搜索 openclaw 相关仓库
 * 4. 提取数据（名称、描述、星标、链接）
 * 5. 生成报告
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');

// ============================================
// web-automation-suite 模板: 获取 WebSocket URL
// ============================================
async function getWSUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/version', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data).webSocketDebuggerUrl));
    }).on('error', reject);
  });
}

// ============================================
// web-automation-suite 模板: 连接浏览器
// ============================================
async function connectBrowser() {
  const wsUrl = await getWSUrl();
  const browser = await chromium.connectOverCDP(wsUrl);
  return browser;
}

// ============================================
// web-automation 模板: 截图保存
// ============================================
async function capturePage(page, filename) {
  await page.screenshot({ 
    path: `C:/Users/DELL/.openclaw/workspace/scripts/${filename}`, 
    fullPage: true 
  });
  console.log(`  📸 截图保存: ${filename}`);
}

// ============================================
// web-automation 模板: 高级导航
// ============================================
async function navigateTo(page, url) {
  console.log(`  🌐 导航: ${url}`);
  await page.goto(url, { 
    waitUntil: 'networkidle', 
    timeout: 60000 
  });
  await page.waitForTimeout(2000);
}

// ============================================
// web-automation-suite 模板: 数据抓取 - 提取仓库列表
// ============================================
async function extractRepos(page) {
  console.log('  📊 开始抓取仓库数据...');
  
  const repos = await page.evaluate(() => {
    // GitHub 搜索结果的选择器
    const items = document.querySelectorAll('li.repo-list-item');
    if (items.length === 0) {
      // 备选选择器
      const altItems = document.querySelectorAll('.repo');
      return Array.from(altItems).slice(0, 15).map(item => {
        const nameEl = item.querySelector('h3 a, a[itemprop="name"]');
        const descEl = item.querySelector('.prc-description, .py-1, p');
        const starsEl = item.querySelector('[href*="/stargazers"]');
        return {
          name: nameEl?.innerText?.trim() || '',
          desc: descEl?.innerText?.trim() || '',
          stars: starsEl?.innerText?.trim() || '0',
          link: nameEl?.href ? 'https://github.com' + nameEl.href : ''
        };
      }).filter(r => r.name);
    }
    
    return Array.from(items).slice(0, 15).map(item => {
      const nameEl = item.querySelector('h3 a, a[itemprop="name"]');
      const descEl = item.querySelector('.prc-description, .py-1, p');
      const starsEl = item.querySelector('[href*="/stargazers"]');
      return {
        name: nameEl?.innerText?.trim() || '',
        desc: descEl?.innerText?.trim() || '',
        stars: starsEl?.innerText?.trim() || '0',
        link: nameEl?.href ? 'https://github.com' + nameEl.href : ''
      };
    }).filter(r => r.name);
  });
  
  console.log(`  ✅ 抓取到 ${repos.length} 个仓库`);
  return repos;
}

// ============================================
// 生成报告
// ============================================
function generateReport(repos) {
  let report = '# GitHub OpenClaw 技能分析报告\n\n';
  report += `> 生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
  report += `> 仓库数量: ${repos.length}\n\n`;
  report += '---\n\n';
  
  repos.forEach((repo, i) => {
    report += `## ${i + 1}. ${repo.name}\n\n`;
    if (repo.desc) report += `**描述:** ${repo.desc}\n`;
    report += `**星标:** ${repo.stars}\n`;
    if (repo.link) report += `**链接:** ${repo.link}\n`;
    report += '\n---\n\n';
  });
  
  return report;
}

// ============================================
// 主执行流程
// ============================================
async function main() {
  console.log('=== GitHub OpenClaw 技能分析任务 ===\n');
  
  let browser;
  let page;
  
  try {
    // Step 1: 连接浏览器 (web-automation-suite 模板)
    console.log('[Step 1] 连接 Edge 浏览器...');
    browser = await connectBrowser();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    page = await context.newPage();
    console.log('  ✅ 连接成功\n');
    
    // Step 2: 导航到 GitHub (web-automation 模板)
    console.log('[Step 2] 打开 GitHub 搜索页面...');
    await navigateTo(page, 'https://github.com/search?q=openclaw&type=repositories');
    console.log('  ✅ GitHub 打开成功\n');
    
    // Step 3: 截图保存 (web-automation 模板)
    console.log('[Step 3] 截图并提取数据...');
    await capturePage(page, 'github-search-results.png');
    
    // Step 4: 数据抓取 (web-automation-suite 模板)
    const repos = await extractRepos(page);
    
    if (repos.length === 0) {
      // 如果没抓到，使用备选方法：直接在页面提取
      console.log('  ⚠️ 尝试备选提取方法...');
      const altRepos = await page.evaluate(() => {
        const results = [];
        const links = document.querySelectorAll('a[href*="/search?q="], .aa-result a');
        links.slice(0, 15).forEach(a => {
          const href = a.href || '';
          if (href.includes('/') && !href.includes('github.com/search')) {
            const name = a.innerText?.trim() || '';
            if (name && name.includes('/')) {
              results.push({
                name: name,
                desc: '',
                stars: '',
                link: href.includes('http') ? href : 'https://github.com' + href
              });
            }
          }
        });
        return results;
      });
      if (altRepos.length > 0) {
        repos.push(...altRepos);
        console.log(`  ✅ 备选方法抓取到 ${altRepos.length} 个仓库`);
      }
    }
    
    // 保存原始数据
    fs.writeFileSync(
      'C:/Users/DELL/.openclaw/workspace/scripts/github-repos.json',
      JSON.stringify(repos, null, 2)
    );
    console.log(`  ✅ 数据保存: github-repos.json\n`);
    
    // Step 5: 生成报告
    console.log('[Step 4] 生成分析报告...');
    const report = generateReport(repos);
    fs.writeFileSync(
      'C:/Users/DELL/.openclaw/workspace/scripts/github-openclaw-report.md',
      report
    );
    console.log('  ✅ 报告保存: github-openclaw-report.md\n');
    
    // 输出摘要
    console.log('=== 任务完成 ===');
    console.log(`仓库数量: ${repos.length}`);
    console.log('报告位置: C:\\Users\\DELL\\.openclaw\\workspace\\scripts\\github-openclaw-report.md');
    
    // 保持浏览器打开
    console.log('\n浏览器保持打开状态...');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (browser) await browser.close();
    process.exit(1);
  }
}

main();