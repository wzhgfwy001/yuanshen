const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Try to find search input
    const searchInputs = await xhsPage.locator('input[type="search"], input[placeholder*="搜索"]').all();
    console.log('Search inputs found:', searchInputs.length);
    
    if (searchInputs.length > 0) {
      await searchInputs[0].click();
      await searchInputs[0].fill('山东高考志愿');
      await xhsPage.keyboard.press('Enter');
      await xhsPage.waitForTimeout(3000);
      console.log('After search URL:', xhsPage.url());
      await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-search-results.png' });
      console.log('Screenshot saved');
    } else {
      console.log('No search input found, taking screenshot...');
      await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-search-results.png' });
    }
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});