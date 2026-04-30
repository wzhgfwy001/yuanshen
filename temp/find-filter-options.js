const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Find all filter-related elements more thoroughly
    const filterDetails = await xhsPage.evaluate(() => {
      // Look for filter options by finding all clickable elements
      const allClickable = document.querySelectorAll('button, [role="button"], [role="tab"], a, .filter-option, .filter-item');
      
      // Also look for anything with time/date/month in text
      const timeElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.trim() || '';
        return text === '时间' || text === '最近' || text === '不限' || text.includes('天内') || text.includes('月内');
      });
      
      // Find the filter panel structure
      const filterPanel = document.querySelector('.filter-panel, [class*="filter-panel"], [class*="drawer"]');
      
      return {
        clickableCount: allClickable.length,
        timeElementsCount: timeElements.length,
        timeElements: timeElements.map(el => ({
          tag: el.tagName,
          text: el.textContent?.trim(),
          className: el.className,
          id: el.id
        })),
        filterPanelFound: !!filterPanel,
        filterPanelContent: filterPanel?.textContent?.trim().slice(0, 500)
      };
    });
    
    console.log('Filter Details:');
    console.log('- Clickable elements:', filterDetails.clickableCount);
    console.log('- Time elements found:', filterDetails.timeElementsCount);
    console.log('- Filter panel found:', filterDetails.filterPanelFound);
    console.log('\nTime elements:', JSON.stringify(filterDetails.timeElements, null, 2));
    console.log('\nFilter panel content:', filterDetails.filterPanelContent);
    
    // Let's try clicking on the filter section to expand time options
    const allButtons = await xhsPage.locator('button').all();
    console.log('\nAll buttons on page:', allButtons.length);
    
    for (let i = 0; i < Math.min(allButtons.length, 30); i++) {
      const text = await allButtons[i].textContent().catch(() => '');
      const isVisible = await allButtons[i].isVisible().catch(() => false);
      if (isVisible && text.trim()) {
        console.log('Button', i, ':', text.trim().slice(0, 50));
      }
    }
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});