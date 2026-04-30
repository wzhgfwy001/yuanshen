const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const xhsPage = pages.find(p => p.url().includes('xiaohongshu'));
  
  if (xhsPage) {
    // List of top notes to visit
    const topNotes = [
      { title: '2026年山东高考月历，请查收→', href: 'https://www.xiaohongshu.com/explore/6958ad05000000001e0001fe', likes: '61' },
      { title: '#2026高考志愿', href: 'https://www.xiaohongshu.com/explore/68d2655e0000000013036745', likes: '60' },
      { title: '山东高分数挑大学选专业，高考志愿填报！', href: 'https://www.xiaohongshu.com/explore/67f395b6000000001d002060', likes: '33' },
      { title: '2026高考志愿择校应该怎么选？', href: 'https://www.xiaohongshu.com/explore/69ef0e16000000003700d92f', likes: '31' },
      { title: '🔥山东省96个志愿到底怎么填？', href: 'https://www.xiaohongshu.com/explore/69ca396e0000000021005570', likes: '28' }
    ];
    
    const extractedNotes = [];
    
    for (let i = 0; i < topNotes.length; i++) {
      const note = topNotes[i];
      console.log(`\n=== Visiting note ${i + 1}: ${note.title} ===`);
      
      try {
        await xhsPage.goto(note.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await xhsPage.waitForTimeout(3000);
        
        // Extract note content
        const noteContent = await xhsPage.evaluate(() => {
          // Get title
          const titleEl = document.querySelector('.note-header .title, .note-content .title, h1');
          const title = titleEl?.textContent?.trim() || '';
          
          // Get main content text
          const contentEl = document.querySelector('.note-content, .content, .main-content, [class*="content"]');
          const paragraphs = contentEl?.querySelectorAll('p, span, div') || [];
          const text = Array.from(paragraphs).map(p => p.textContent?.trim()).filter(t => t && t.length > 10).join('\n');
          
          // Get images
          const images = Array.from(document.querySelectorAll('img[src*="xiaohongshu"]')).map(img => img.src).slice(0, 9);
          
          // Get author
          const authorEl = document.querySelector('.author-name, .user-name, [class*="author"]');
          const author = authorEl?.textContent?.trim() || '';
          
          return { title, text: text.slice(0, 2000), images, author };
        });
        
        console.log('Title:', noteContent.title || note.title);
        console.log('Author:', noteContent.author);
        console.log('Text length:', noteContent.text?.length || 0);
        console.log('Images:', noteContent.images?.length || 0);
        
        if (noteContent.text) {
          extractedNotes.push({
            ...note,
            content: noteContent.text,
            author: noteContent.author,
            images: noteContent.images
          });
        }
        
        // Take screenshot
        await xhsPage.screenshot({ path: `C:/Users/DELL/.openclaw/workspace/temp/note${i+1}.png`, fullPage: true });
        
      } catch (err) {
        console.log('Error:', err.message);
      }
      
      // Wait before next note
      await xhsPage.waitForTimeout(1000);
    }
    
    console.log('\n\n=== Extracted Notes Summary ===');
    console.log('Total extracted:', extractedNotes.length);
    
    extractedNotes.forEach((n, i) => {
      console.log(`\n${i + 1}. ${n.title}`);
      console.log(`   Author: ${n.author}`);
      console.log(`   Likes: ${n.likes}`);
      console.log(`   Content preview: ${n.content?.slice(0, 100)}...`);
      console.log(`   Images: ${n.images?.length || 0}`);
    });
    
    // Save to file
    fs.writeFileSync('C:/Users/DELL/.openclaw/workspace/temp/extracted-notes.json', JSON.stringify(extractedNotes, null, 2));
    console.log('\n\nSaved to temp/extracted-notes.json');
    
    await browser.close();
    process.exit(0);
  }
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});