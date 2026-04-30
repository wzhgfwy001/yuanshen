const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    await xhsPage.goto('https://www.xiaohongshu.com/search_result?keyword=%E5%B1%B1%E4%B8%9C%E9%AB%98%E8%80%83%E5%BF%97%E6%84%BF&type=51', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await xhsPage.waitForTimeout(3000);
    
    // Get all note-related elements with their attributes
    const noteInfo = await xhsPage.evaluate(() => {
      // Find elements that might be clickable note cards
      const allLinks = Array.from(document.querySelectorAll('a')).filter(a => {
        return a.href && a.href.includes('xiaohongshu.com') && !a.href.includes('xiaohongshu.com/search');
      });
      
      return {
        linkCount: allLinks.length,
        links: allLinks.slice(0, 10).map(a => ({
          href: a.href,
          text: a.textContent?.trim().slice(0, 50)
        }))
      };
    });
    
    console.log('Note links from evaluate:', noteInfo.linkCount);
    noteInfo.links.forEach((l, i) => {
      console.log(i + 1, '-', l.href, '-', l.text);
    });
    
    await browser.close();
    process.exit(0);
  }
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});