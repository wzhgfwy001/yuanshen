const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Try clicking the 26年 filter to get 2026 content
    const filterBtn = xhsPage.locator('text=26年').first();
    if (await filterBtn.count() > 0) {
      console.log('Clicking 26年 filter...');
      await filterBtn.click();
      await xhsPage.waitForTimeout(3000);
      
      // Scroll to load more
      await xhsPage.evaluate(() => window.scrollBy(0, 800));
      await xhsPage.waitForTimeout(2000);
      
      // Get all note links
      const noteLinks = await xhsPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')).filter(a => {
          return a.href && a.href.match(/\/explore\/[a-f0-9]+/);
        });
        return links.slice(0, 15).map(a => ({
          href: a.href,
          text: a.textContent?.trim().slice(0, 50)
        }));
      });
      
      console.log('\nNote links after filter:');
      noteLinks.forEach((l, i) => {
        console.log(i + 1, '-', l.href);
      });
      
      await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-filtered.png', fullPage: true });
      console.log('\nScreenshot saved');
    } else {
      console.log('26年 button not found');
    }
    
    await browser.close();
    process.exit(0);
  }
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});