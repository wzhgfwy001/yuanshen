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
    
    // Scroll multiple times to load more content
    for (let i = 0; i < 5; i++) {
      await xhsPage.evaluate(() => window.scrollBy(0, 600));
      await xhsPage.waitForTimeout(1000);
    }
    
    // Extract all note data from search page cards
    const allNotes = await xhsPage.evaluate(() => {
      const cards = document.querySelectorAll('.feed-card, [class*="note-card"], [class*="note-item"]');
      const results = [];
      
      cards.forEach((card) => {
        const innerText = card.innerText || '';
        
        // Parse the card content
        const lines = innerText.split('\n').filter(l => l.trim());
        
        // Extract title (usually first line)
        const title = lines[0] || '';
        
        // Extract author (usually second line)
        const author = lines[1] || '';
        
        // Extract date (usually third line like "04-11" or "1天前")
        const date = lines[2] || '';
        
        // Extract likes (look for number followed by 赞 or just number)
        const likesMatch = innerText.match(/(\d+)\s*赞/) || innerText.match(/(\d+)\s*\(?\d*\)?/);
        const likes = likesMatch ? likesMatch[1] : '0';
        
        // Get cover image
        const img = card.querySelector('img');
        const coverImg = img?.src || '';
        
        // Get full description from all text
        const fullDesc = lines.join(' | ');
        
        results.push({
          title,
          author,
          date,
          likes,
          coverImg,
          fullDesc
        });
      });
      
      return results;
    });
    
    // Filter to get only valid notes (with proper titles)
    const validNotes = allNotes.filter(n => {
      // Exclude search suggestions and related searches
      const excludeTerms = ['相关搜索', '山东高考志愿填报规则', '山东省高考志愿', '山东高考志愿表', '山东高考志愿能'];
      return n.title && !excludeTerms.some(t => n.title.includes(t)) && n.title.length > 5;
    });
    
    console.log('Total cards:', allNotes.length);
    console.log('Valid notes:', validNotes.length);
    
    console.log('\n=== Top 10 Valid Notes ===');
    validNotes.slice(0, 10).forEach((n, i) => {
      console.log(`\n${i + 1}. ${n.title}`);
      console.log(`   Author: ${n.author}`);
      console.log(`   Date: ${n.date}`);
      console.log(`   Likes: ${n.likes}`);
    });
    
    // Save to file
    fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/temp/valid-notes.json', JSON.stringify(validNotes.slice(0, 15), null, 2));
    console.log('\n\nData saved to temp/valid-notes.json');
    
    await browser.close();
    process.exit(0);
  }
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});