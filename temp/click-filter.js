const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Click on the filter/筛选 button
    const filterBtn = xhsPage.locator('text=筛选').first();
    if (await filterBtn.count() > 0) {
      console.log('Clicking 筛选 button...');
      await filterBtn.click();
      await xhsPage.waitForTimeout(2000);
      
      await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-filter-panel.png', fullPage: true });
      console.log('Filter panel screenshot saved');
      
      // Analyze filter options
      const filters = await xhsPage.evaluate(() => {
        const panels = document.querySelectorAll('[class*="panel"], [class*="filter"], [class*="modal"], .dialog');
        const allPanels = Array.from(panels).filter(p => p.offsetHeight > 0 && p.offsetWidth > 0);
        
        // Get all clickable filter options
        const options = document.querySelectorAll('[class*="option"], [class*="tag"], [class*="chip"]');
        
        return {
          visiblePanels: allPanels.length,
          optionsCount: options.length,
          visibleOptions: Array.from(options).filter(o => o.offsetHeight > 0).length
        };
      });
      
      console.log('Filter Analysis:');
      console.log('- Visible panels:', filters.visiblePanels);
      console.log('- Options count:', filters.optionsCount);
      console.log('- Visible options:', filters.visibleOptions);
    }
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});