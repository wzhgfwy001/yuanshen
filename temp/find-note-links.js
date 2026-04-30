const { chromium } = require('playwright');
const fs = require('fs');
const https = require('https');
const http = require('http');

async function downloadImage(url, filepath) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      if (res.statusCode === 200) {
        const stream = fs.createWriteStream(filepath);
        res.pipe(stream);
        stream.on('finish', () => resolve(true));
      } else {
        resolve(false);
      }
    }).on('error', () => resolve(false));
  });
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // First, let's go back to search and find notes with links
    await xhsPage.goto('https://www.xiaohongshu.com/search_result?keyword=%E5%B1%B1%E4%B8%9C%E9%AB%98%E8%80%83%E5%BF%97%E6%84%BF&type=51', { waitUntil: 'networkidle', timeout: 20000 });
    await xhsPage.waitForTimeout(2000);
    
    // Scroll to load more
    for (let i = 0; i < 3; i++) {
      await xhsPage.evaluate(() => window.scrollBy(0, 600));
      await xhsPage.waitForTimeout(1000);
    }
    
    // Find clickable note cards
    const noteCards = await xhsPage.locator('[class*="note-card"], [class*="note-item"], a[href*="/discovery/item/"]').all();
    console.log('Note cards found:', noteCards.length);
    
    const notesInfo = [];
    for (let i = 0; i < Math.min(noteCards.length, 20); i++) {
      const card = noteCards[i];
      const href = await card.getAttribute('href').catch(() => '');
      const title = await card.locator('.title, [class*="title"]').textContent().catch(() => '');
      const likes = await card.locator('[class*="like"], [class*="heart"]').textContent().catch(() => '0');
      
      if (href || title) {
        notesInfo.push({ index: i, href, title: title.trim(), likes: likes.trim() });
      }
    }
    
    console.log('\nNotes with links:');
    notesInfo.forEach(n => {
      if (n.href) console.log(n.index, '.', n.title, '-', n.likes, '-', n.href);
    });
    
    // Save notes info
    fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/temp/notes-info.json', JSON.stringify(notesInfo, null, 2));
    console.log('\nNotes info saved');
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});