const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Navigate back to search page
    await xhsPage.goto('https://www.xiaohongshu.com/search_result?keyword=%E5%B1%B1%E4%B8%9C%E9%AB%98%E8%80%83%E5%BF%97%E6%84%BF&source=web_explore_feed', { waitUntil: 'networkidle', timeout: 20000 });
    await xhsPage.waitForTimeout(2000);
    
    console.log('On search page:', xhsPage.url());
    
    // Try to click filter button
    const filterBtn = xhsPage.locator('text=筛选').first();
    if (await filterBtn.count() > 0) {
      console.log('Clicking 筛选 button...');
      await filterBtn.click();
      await xhsPage.waitForTimeout(3000);
      
      await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-filter-panel-open.png', fullPage: true });
      console.log('Filter panel screenshot saved');
      
      // Analyze filter panel content
      const filterInfo = await xhsPage.evaluate(() => {
        const body = document.body.innerText;
        return {
          bodyText: body.slice(0, 2000),
          allTags: Array.from(document.querySelectorAll('[class*="filter"], [class*="panel"]')).slice(0, 10).map(el => ({
            tag: el.tagName,
            class: el.className,
            text: el.textContent?.trim().slice(0, 50)
          }))
        };
      });
      
      console.log('\nFilter panel info:');
      console.log('Body text:', filterInfo.bodyText.slice(0, 500));
      console.log('\nFilter elements:', JSON.stringify(filterInfo.allTags, null, 2));
    }
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});