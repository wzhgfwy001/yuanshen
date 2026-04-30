const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Take a full page screenshot
    await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-qr-code.png', fullPage: true });
    console.log('Screenshot saved to temp/xhs-qr-code.png');
    
    // Also get the page title and URL
    console.log('Title:', await xhsPage.title());
    console.log('URL:', xhsPage.url());
    
    // Look for QR code element specifically
    const qrInfo = await xhsPage.evaluate(() => {
      const qrCode = document.querySelector('[class*="qr"], [class*="QR"], img[src*="qr"], canvas');
      return {
        qrFound: !!qrCode,
        qrClass: qrCode?.className,
        qrSrc: qrCode?.src || qrCode?.toDataURL?.() || 'N/A'
      };
    });
    
    console.log('QR Code:', JSON.stringify(qrInfo));
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});