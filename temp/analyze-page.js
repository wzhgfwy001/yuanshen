const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Try to click search via JavaScript
    const searchResult = await xhsPage.evaluate(() => {
      // Find search input or button
      const inputs = document.querySelectorAll('input');
      const buttons = document.querySelectorAll('button, [role="button"]');
      const searchInput = document.querySelector('input[placeholder*="搜索" i]') || 
                          document.querySelector('input[aria-label*="搜索" i]') ||
                          document.querySelector('input[type="search"]');
      const searchBtn = document.querySelector('button[aria-label*="搜索" i]') ||
                       document.querySelector('[class*="search"]') ||
                       document.querySelector('[aria-label*="search" i]');
      
      return {
        inputCount: inputs.length,
        buttonCount: buttons.length,
        searchInputFound: !!searchInput,
        searchBtnFound: !!searchBtn,
        allInputs: Array.from(inputs).map(i => ({placeholder: i.placeholder, type: i.type, ariaLabel: i.getAttribute('aria-label')})),
        allButtons: Array.from(buttons).slice(0, 10).map(b => ({ariaLabel: b.getAttribute('aria-label'), className: b.className, text: b.textContent?.trim().slice(0, 50)}))
      };
    });
    
    console.log('Search Analysis:');
    console.log('- Input count:', searchResult.inputCount);
    console.log('- Button count:', searchResult.buttonCount);
    console.log('- Search input found:', searchResult.searchInputFound);
    console.log('- Search button found:', searchResult.searchBtnFound);
    console.log('All inputs:', JSON.stringify(searchResult.allInputs, null, 2));
    console.log('Buttons:', JSON.stringify(searchResult.allButtons, null, 2));
    
    // Take screenshot
    await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-analyze.png', fullPage: true });
    console.log('Screenshot saved');
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});