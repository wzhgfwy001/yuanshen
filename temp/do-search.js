const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    console.log('Title:', await xhsPage.title());
    console.log('URL:', xhsPage.url());
    
    // Find and use the search box
    const searchInput = xhsPage.locator('input[placeholder="搜索小红书"]');
    const count = await searchInput.count();
    console.log('Search input found:', count > 0);
    
    if (count > 0) {
      console.log('Clicking search box...');
      await searchInput.click();
      await searchInput.fill('山东高考志愿');
      await xhsPage.keyboard.press('Enter');
      
      console.log('Waiting for search results...');
      await xhsPage.waitForTimeout(5000);
      
      console.log('After search URL:', xhsPage.url());
      console.log('Title:', await xhsPage.title());
      
      await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-search-result.png', fullPage: true });
      console.log('Screenshot saved');
    }
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});