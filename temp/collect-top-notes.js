const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Scroll to load more posts
    console.log('Scrolling to load more posts...');
    for (let i = 0; i < 5; i++) {
      await xhsPage.evaluate(() => window.scrollBy(0, 600));
      await xhsPage.waitForTimeout(1500);
    }
    
    // Collect all note links/cards
    const notesData = await xhsPage.evaluate(() => {
      // Find all note cards
      const cards = document.querySelectorAll('[class*="note-card"], [class*="note-item"], .feed-card, [class*="content-card"]');
      const results = [];
      
      cards.forEach((card) => {
        // Try to get link to the note
        const link = card.querySelector('a[href*="/discovery/item/"], a[href*="/note/"]') || card.closest('a');
        const title = card.querySelector('.title, .note-title, [class*="title"]')?.textContent?.trim() || '';
        const likesText = card.querySelector('[class*="like"], [class*="heart"]')?.textContent?.trim() || '0';
        const coverImg = card.querySelector('img')?.src || '';
        
        // Parse likes number
        let likes = 0;
        if (likesText.includes('万')) {
          likes = parseFloat(likesText.replace('万', '')) * 10000;
        } else {
          likes = parseInt(likesText) || 0;
        }
        
        if (title || link) {
          results.push({
            title,
            likes,
            likesText,
            link: link?.href || '',
            coverImg
          });
        }
      });
      
      return results;
    });
    
    console.log('Total notes collected:', notesData.length);
    
    // Sort by likes descending
    notesData.sort((a, b) => b.likes - a.likes);
    
    console.log('\nTop notes by likes:');
    notesData.slice(0, 10).forEach((note, i) => {
      console.log(i + 1, '.', note.title, '-', note.likesText, 'likes');
      console.log('   Link:', note.link);
    });
    
    // Save to file
    fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/temp/top-notes.json', JSON.stringify(notesData, null, 2));
    console.log('\nData saved to temp/top-notes.json');
    
    await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-all-notes.png', fullPage: true });
    console.log('Screenshot saved');
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});