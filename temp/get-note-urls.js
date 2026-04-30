const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Navigate to search page
    await xhsPage.goto('https://www.xiaohongshu.com/search_result?keyword=%E5%B1%B1%E4%B8%9C%E9%AB%98%E8%80%83%E5%BF%97%E6%84%BF&type=51', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await xhsPage.waitForTimeout(3000);
    
    // Scroll
    await xhsPage.evaluate(() => window.scrollBy(0, 500));
    await xhsPage.waitForTimeout(1000);
    
    // Try clicking on each note card to get the URL
    const links = await xhsPage.locator('a[href*="/discovery/item/"]').all();
    console.log('Found', links.length, 'note links');
    
    // Get first 5 links
    for (let i = 0; i < Math.min(links.length, 5); i++) {
      const href = await links[i].getAttribute('href').catch(() => '');
      const title = await links[i].locator('[class*="title"]').textContent().catch(() => 'no title');
      console.log(i + 1, '- Title:', title.trim().slice(0, 50));
      console.log('   URL:', href);
    }
    
    await browser.close();
    process.exit(0);
  }
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});