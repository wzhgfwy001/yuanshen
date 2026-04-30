const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Get detailed note info from search page
    const notesInfo = await xhsPage.evaluate(() => {
      // Find note cards with their info
      const cards = document.querySelectorAll('[class*="note-card"], [class*="note-item"], .feed-card');
      const results = [];
      
      cards.forEach((card, i) => {
        const link = card.querySelector('a[href*="/explore/"]');
        const titleEl = card.querySelector('[class*="title"], .title, [class*="name"]');
        const likesEl = card.querySelector('[class*="liked"], [class*="like"], [class*="heart"]');
        const coverImg = card.querySelector('img')?.src || '';
        
        results.push({
          index: i,
          href: link?.href || '',
          title: titleEl?.textContent?.trim() || '',
          likes: likesEl?.textContent?.trim() || '0',
          coverImg
        });
      });
      
      return results;
    });
    
    console.log('Found', notesInfo.length, 'notes');
    
    // Filter ones with links
    const validNotes = notesInfo.filter(n => n.href && n.title);
    console.log('Valid notes with titles:', validNotes.length);
    
    validNotes.slice(0, 10).forEach((n, i) => {
      console.log(i + 1, '- Title:', n.title.slice(0, 60));
      console.log('   Likes:', n.likes);
      console.log('   Link:', n.href);
    });
    
    await browser.close();
    process.exit(0);
  }
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});