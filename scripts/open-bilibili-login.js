const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');

async function getWSUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/version', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data).webSocketDebuggerUrl));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Connecting to Edge browser on port 9222...');
  const wsUrl = await getWSUrl();
  console.log('WebSocket URL:', wsUrl);

  const browser = await chromium.connectOverCDP(wsUrl);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  console.log('Opening Bilibili login page...');
  await page.goto('https://passport.bilibili.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/scripts/bilibili-login.png', fullPage: false });

  console.log('Screenshot saved!');
  console.log('Now waiting for you to scan QR code...');

  // Check for login state every 3 seconds
  let loginDetected = false;
  for (let i = 0; i < 100; i++) { // max 5 minutes
    await page.waitForTimeout(3000);

    // Check if still on login page
    const url = page.url();
    console.log(`[${i*3}s] Current URL: ${url}`);

    if (!url.includes('passport') || !url.includes('login')) {
      console.log('Login detected! URL changed from login page.');
      loginDetected = true;
      break;
    }

    // Also check page content for logged in state
    const isLoggedIn = await page.evaluate(() => {
      return !document.body.innerText.includes('登录') ||
             document.body.innerText.includes('退出') ||
             document.querySelector('.user-name') !== null;
    });

    if (isLoggedIn) {
      console.log('Login detected via page content!');
      loginDetected = true;
      break;
    }
  }

  if (loginDetected) {
    await page.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/scripts/bilibili-loggedin.png' });
    console.log('Logged in! Screenshot saved.');
    console.log('Now starting the blogger search task...');
  } else {
    console.log('No login detected after 5 minutes. Please scan QR and click anywhere.');
  }

  // Keep browser open
  console.log('Script complete. Browser staying open.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});