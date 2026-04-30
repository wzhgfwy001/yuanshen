const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // Go back to search page
    await xhsPage.goto('https://www.xiaohongshu.com/search_result?keyword=%E5%B1%B1%E4%B8%9C%E9%AB%98%E8%80%83%E5%BF%97%E6%84%BF&type=51', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await xhsPage.waitForTimeout(2000);
    
    // Click 26年 filter
    const filterBtn = xhsPage.locator('text=26年').first();
    if (await filterBtn.count() > 0) {
      await filterBtn.click();
      await xhsPage.waitForTimeout(2000);
    }
    
    // Scroll and get notes
    await xhsPage.evaluate(() => window.scrollBy(0, 800));
    await xhsPage.waitForTimeout(2000);
    
    // Extract all text content from note cards directly on search page
    const notesData = await xhsPage.evaluate(() => {
      const cards = document.querySelectorAll('.feed-card, [class*="note-card"], [class*="note-item"]');
      const results = [];
      
      cards.forEach((card, i) => {
        const titleEl = card.querySelector('[class*="title"], .title, [class*="name"]');
        const descEl = card.querySelector('[class*="desc"], .desc, [class*="abstract"]');
        const likesEl = card.querySelector('[class*="liked"], [class*="like-count"]');
        const authorEl = card.querySelector('[class*="author"], [class*="user"]');
        
        const text = card.innerText || '';
        
        // Extract all text from the card
        const allText = Array.from(card.querySelectorAll('p, span, div')).map(el => el.textContent?.trim()).filter(t => t);
        
        results.push({
          index: i,
          title: titleEl?.textContent?.trim() || '',
          desc: descEl?.textContent?.trim() || text.slice(0, 200),
          likes: likesEl?.textContent?.trim() || '0',
          author: authorEl?.textContent?.trim() || '',
          allText: allText.slice(0, 20).join(' | ')
        });
      });
      
      return results;
    });
    
    console.log('Found', notesData.length, 'note cards');
    
    // Filter valid ones
    const validNotes = notesData.filter(n => n.title || n.desc);
    console.log('Valid notes:', validNotes.length);
    
    console.log('\n=== Notes from Search Page ===');
    validNotes.slice(0, 10).forEach((n, i) => {
      console.log(`\n${i + 1}. ${n.title || 'No title'}`);
      console.log(`   Desc: ${(n.desc || n.allText || '').slice(0, 100)}`);
      console.log(`   Likes: ${n.likes}`);
    });
    
    // Save
    fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/temp/search-notes.json', JSON.stringify(validNotes, null, 2));
    
    await xhsPage.screenshot({ path: 'C:/Users/DELL/.openclaw/workspace/temp/search-notes.png', fullPage: true });
    console.log('\nScreenshot saved');
    
    await browser.close();
    process.exit(0);
  }
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});