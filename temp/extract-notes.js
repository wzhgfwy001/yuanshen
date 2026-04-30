const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Extract note data from the search results page
    const notesData = await xhsPage.evaluate(() => {
      // Find all note cards
      const cards = document.querySelectorAll('[class*="note-card"], [class*="note-item"], .feed-card');
      const results = [];
      
      cards.forEach((card, index) => {
        // Try to get note info
        const title = card.querySelector('.title, .note-title, [class*="title"]')?.textContent?.trim() || '';
        const desc = card.querySelector('.desc, .note-desc, [class*="desc"]')?.textContent?.trim() || '';
        const author = card.querySelector('.author, .user-name, [class*="author"]')?.textContent?.trim() || '';
        const likes = card.querySelector('[class*="like"], [class*="heart"]')?.textContent?.trim() || '0';
        const images = card.querySelectorAll('img');
        const imageUrls = Array.from(images).map(img => img.src).slice(0, 3);
        
        if (title || desc) {
          results.push({
            index: index + 1,
            title,
            desc: desc.slice(0, 200),
            author,
            likes,
            imageUrls
          });
        }
      });
      
      return results;
    });
    
    console.log('Found', notesData.length, 'notes');
    console.log('\nNotes data:');
    notesData.slice(0, 5).forEach(note => {
      console.log('\n--- Note', note.index, '---');
      console.log('Title:', note.title);
      console.log('Desc:', note.desc);
      console.log('Likes:', note.likes);
      console.log('Images:', note.imageUrls.length);
    });
    
    // Scroll and get more
    await xhsPage.evaluate(() => window.scrollBy(0, 800));
    await xhsPage.waitForTimeout(2000);
    
    const moreNotes = await xhsPage.evaluate(() => {
      const cards = document.querySelectorAll('[class*="note-card"], [class*="note-item"], .feed-card');
      return cards.length;
    });
    console.log('\nAfter scroll, total cards:', moreNotes);
    
    // Save the data
    fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/temp/notes-data.json', JSON.stringify(notesData, null, 2));
    console.log('\nData saved to temp/notes-data.json');
    
    await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/xhs-notes.png', fullPage: true });
    console.log('Screenshot saved');
  }
  
  await browser.close();
  process.exit(0);
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});