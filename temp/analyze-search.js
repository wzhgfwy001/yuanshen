const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Analyze search results
    const analysis = await xhsPage.evaluate(() => {
      // Get note cards (帖子卡片)
      const cards = document.querySelectorAll('.note-item, .search-card, [class*="note"], [class*="card"]');
      const allCards = document.querySelectorAll('[class*="item"], [class*="card"]');
      
      // Look for filter options
      const filterBtns = document.querySelectorAll('[class*="filter"], [class*="tab"], [class*="sort"]');
      
      // Try to find date/时间 filter
      const dateFilter = document.querySelector('[class*="time"], [class*="date"]');
      
      return {
        totalCards: allCards.length,
        filterButtons: filterBtns.length,
        dateFilterFound: !!dateFilter,
        pageStructure: {
          bodyClasses: document.body.className,
          mainContent: document.querySelector('main, [role="main"], .main, #main')?.className || 'not found'
        },
        url: window.location.href
      };
    });
    
    console.log('Search Results Analysis:');
    console.log('- URL:', analysis.url);
    console.log('- Total card elements:', analysis.totalCards);
    console.log('- Filter buttons found:', analysis.filterButtons);
    console.log('- Date filter found:', analysis.dateFilterFound);
    console.log('- Main content:', analysis.pageStructure.mainContent);
    
    // Scroll down to load more content
    console.log('Scrolling to load more posts...');
    await xhsPage.evaluate(() => window.scrollBy(0, 800));
    await xhsPage.waitForTimeout(2000);
    
    // Take screenshot after scroll
    await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-scroll1.png', fullPage: true });
    console.log('Scroll screenshot saved');
    
    // Try to find and click date filter
    const filterBtns = await xhsPage.locator('[class*="filter"], [class*="tab"]').all();
    console.log('Found', filterBtns.length, 'filter elements');
    
    for (let i = 0; i < Math.min(filterBtns.length, 10); i++) {
      const text = await filterBtns[i].textContent();
      if (text) console.log('Filter', i, ':', text.trim());
    }
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});