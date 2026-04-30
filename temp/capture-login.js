const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Check if logged in - look for user avatar/login button
    const isLoggedIn = await xhsPage.locator('[class*="avatar"], [class*="user-info"]').count() > 0;
    console.log('Is logged in:', isLoggedIn);
    
    if (!isLoggedIn) {
      // Try to find and click login button
      const loginBtn = xhsPage.locator('text=登录').first();
      if (await loginBtn.count() > 0) {
        console.log('Clicking login button...');
        await loginBtn.click();
        await xhsPage.waitForTimeout(3000);
        
        // Take full screenshot of the login dialog
        await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-login-screen.png', fullPage: true });
        console.log('Login screen screenshot saved');
        
        // Check if QR code dialog appeared
        const qrDialog = await xhsPage.evaluate(() => {
          // Look for QR code in any modal/dialog
          const modals = document.querySelectorAll('[class*="modal"], [class*="dialog"], [class*="popup"]');
          const qrImg = document.querySelector('img[src*="qr"]');
          const canvas = document.querySelector('canvas');
          
          return {
            modalCount: modals.length,
            qrImgSrc: qrImg?.src || '',
            hasCanvas: !!canvas,
            bodyText: document.body.innerText.slice(0, 1000)
          };
        });
        
        console.log('QR Dialog Info:', JSON.stringify(qrDialog, null, 2));
      }
    } else {
      console.log('User is already logged in');
      await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-logged-in.png', fullPage: true });
      console.log('Logged in screenshot saved');
    }
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});