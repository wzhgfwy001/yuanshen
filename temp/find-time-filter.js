const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Go back and find filter options
    await xhsPage.goBack().catch(() => {});
    await xhsPage.waitForTimeout(2000);
    
    // Try to find and click the filter button
    const filterBtn = xhsPage.locator('button:has-text("筛选"), div:has-text("筛选")').first();
    if (await filterBtn.count() > 0) {
      console.log('Clicking 筛选 button...');
      await filterBtn.click();
      await xhsPage.waitForTimeout(2000);
      
      // Take screenshot of filter panel
      await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-filter-panel-open.png', fullPage: true });
      console.log('Filter panel screenshot saved');
      
      // Analyze filter panel
      const filterInfo = await xhsPage.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        const filterElements = Array.from(allElements).filter(el => {
          const text = el.textContent?.trim() || '';
          return text.includes('时间') || text.includes('最近') || text.includes('月');
        }).slice(0, 20);
        
        return filterElements.map(el => ({
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 100),
          className: el.className
        }));
      });
      
      console.log('\nFilter panel elements:');
      filterInfo.forEach((el, i) => {
        console.log(i, ':', el.tag, '-', el.text);
      });
    }
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});