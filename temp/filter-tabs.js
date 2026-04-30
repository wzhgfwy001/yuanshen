const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Close any dialogs first
    const closeBtn = xhsPage.locator('.close, [aria-label="关闭"], .dialog-close').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click().catch(() => {});
    }
    
    // Find the 筛选 button and click it properly
    const filterContainer = xhsPage.locator('[class*="filter"]').first();
    if (await filterContainer.count() > 0) {
      console.log('Found filter container');
      await filterContainer.click();
    }
    
    await xhsPage.waitForTimeout(1000);
    await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-filter1.png' });
    
    // Try different selector for filter tabs
    const filterTabs = await xhsPage.locator('.filter-tab, .filter-item, [class*="filter-tab"]').all();
    console.log('Filter tabs found:', filterTabs.length);
    
    for (let i = 0; i < filterTabs.length; i++) {
      const text = await filterTabs[i].textContent().catch(() => '');
      const isVisible = await filterTabs[i].isVisible().catch(() => false);
      if (isVisible) console.log('Tab', i, ':', text.trim());
    }
    
    // Look for the sort/排序 option
    const sortBtn = xhsPage.locator('text=综合').first();
    if (await sortBtn.count() > 0) {
      console.log('Found sort button, clicking...');
      await sortBtn.click();
      await xhsPage.waitForTimeout(1000);
      await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-sort.png' });
    }
    
    // Try to find more content
    await xhsPage.evaluate(() => window.scrollBy(0, 500));
    await xhsPage.waitForTimeout(1000);
    
    // Get all visible note cards
    const notes = await xhsPage.locator('.note-card, .note-item, [class*="note-card"], [class*="content-card"]').all();
    console.log('Notes found:', notes.length);
    
    await browser.close();
    process.exit(0);
  }
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});