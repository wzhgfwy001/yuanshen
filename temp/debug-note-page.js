const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Visit one note to debug
    await xhsPage.goto('https://www.xiaohongshu.com/explore/6958ad05000000001e0001fe', { waitUntil: 'networkidle', timeout: 20000 });
    await xhsPage.waitForTimeout(5000);
    
    // Take screenshot
    await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/note-debug.png', fullPage: true });
    console.log('Screenshot saved');
    
    // Analyze page structure
    const pageInfo = await xhsPage.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.innerText.slice(0, 2000),
        allImages: Array.from(document.querySelectorAll('img')).slice(0, 10).map(img => ({
          src: img.src.slice(0, 100),
          alt: img.alt,
          className: img.className
        }))
      };
    });
    
    console.log('\nPage Info:');
    console.log('URL:', pageInfo.url);
    console.log('Title:', pageInfo.title);
    console.log('\nBody text:');
    console.log(pageInfo.bodyText);
    console.log('\nImages:', pageInfo.allImages.length);
    pageInfo.allImages.forEach((img, i) => {
      console.log(i + 1, '-', img.src);
    });
    
    await browser.close();
    process.exit(0);
  }
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});