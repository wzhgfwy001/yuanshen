const { chromium } = require('playwright');
const https = require('https');
const fs = require('fs');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // First, let's check the current page state
    const pageState = await xhsPage.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.innerText.slice(0, 500),
        qrCodeImg: document.querySelector('img[src*="qr"]')?.src || '',
        allImages: Array.from(document.querySelectorAll('img')).slice(0, 5).map(img => ({
          src: img.src.slice(0, 100),
          width: img.naturalWidth,
          height: img.naturalHeight
        }))
      };
    });
    
    console.log('Page State:');
    console.log('URL:', pageState.url);
    console.log('Title:', pageState.title);
    console.log('QR Image:', pageState.qrCodeImg);
    console.log('All Images:', JSON.stringify(pageState.allImages, null, 2));
    
    // Try to find and capture QR code dialog
    // First, look for QR code related elements
    const qrDialog = await xhsPage.locator('[class*="qr"], [class*="login"], [class*="dialog"]').all();
    console.log('QR/Dialog elements:', qrDialog.length);
    
    // Take screenshot focusing on the login area
    const loginBtn = xhsPage.locator('text=登录').first();
    if (await loginBtn.count() > 0) {
      console.log('Found login button');
      
      // Click login to open QR dialog
      await loginBtn.click();
      await xhsPage.waitForTimeout(3000);
      
      // Take screenshot after click
      await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-login-qr.png', fullPage: false });
      console.log('QR screenshot saved');
      
      // Get QR code URL from the dialog
      const qrUrl = await xhsPage.evaluate(() => {
        const qrImg = document.querySelector('img[src*="qr"], canvas');
        return qrImg ? qrImg.src || qrImg.toDataURL?.() : '';
      });
      
      console.log('QR URL from dialog:', qrUrl);
    }
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});