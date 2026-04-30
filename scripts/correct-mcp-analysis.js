/**
 * 正确使用 Playwright MCP Bridge
 * 
 * 学习源代码后，我知道：
 * 1. 使用 bridge.callTool() 调用工具
 * 2. 结果在 result.data 里，不是在 result 里直接访问
 * 3. bridge.start() 启动浏览器
 * 4. bridge.stop() 关闭浏览器
 */

const path = require('path');

async function main() {
  console.log('===========================================');
  console.log('  Playwright MCP Bridge 正确使用演示');
  console.log('===========================================\n');
  
  // 加载 Bridge
  const mcp = require('../skills/playwright-mcp/dist/index.js');
  console.log('✅ Skill loaded');
  console.log('Available exports:', Object.keys(mcp));
  
  // 创建 Bridge 实例
  const bridge = mcp.getBridge();
  console.log('✅ Bridge instance created\n');
  
  try {
    // 1. 启动浏览器
    console.log('🚀 Starting browser...');
    await bridge.start();
    console.log('✅ Browser started\n');
    
    // 2. 导航到抖音
    console.log('🌐 Navigating to Douyin...');
    let result = await bridge.callTool('browser_navigate', { url: 'https://www.douyin.com/' });
    console.log('Navigation result:', JSON.stringify(result, null, 2));
    // 正确访问：result.data.url, result.data.title
    console.log('URL:', result.data?.url);
    console.log('Title:', result.data?.title);
    console.log('Success:', result.success);
    console.log();
    
    // 等待页面加载
    await new Promise(r => setTimeout(r, 3000));
    
    // 3. 获取页面快照
    console.log('📸 Getting page snapshot...');
    result = await bridge.callTool('browser_snapshot', {});
    console.log('Snapshot result keys:', Object.keys(result.data || {}));
    console.log('Page URL from snapshot:', result.data?.url);
    console.log('Page text (first 500 chars):', result.data?.text?.substring(0, 500));
    console.log('Success:', result.success);
    console.log();
    
    // 4. 检查登录状态
    const isLoggedIn = result.data?.text?.includes('退出登录');
    console.log('Login status:', isLoggedIn ? '✅ Logged in' : '❌ Not logged in');
    
    if (!isLoggedIn) {
      console.log('\n⚠️ Please login manually in the browser');
      console.log('Press Enter to continue after login...');
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
    }
    
    // 5. 导航到用户主页 - 点击右上角头像
    console.log('\n🖱️ Clicking user avatar...');
    try {
      // 使用正确的选择器
      result = await bridge.callTool('browser_click', { 
        selector: '[class*="header"] [class*="avatar"], [class*="user-info"]' 
      });
      console.log('Click result:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('Click failed:', e.message);
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // 6. 获取当前页面
    result = await bridge.callTool('browser_snapshot', {});
    console.log('\n📌 Current page URL:', result.data?.url);
    
    // 7. 如果不在用户主页，尝试通过搜索
    if (!result.data?.url?.includes('/user/')) {
      console.log('\n🔍 Going to search for user...');
      result = await bridge.callTool('browser_navigate', { 
        url: 'https://www.douyin.com/search/王截一?type=user' 
      });
      await new Promise(r => setTimeout(r, 3000));
      
      result = await bridge.callTool('browser_snapshot', {});
      console.log('Search page URL:', result.data?.url);
      
      // 点击搜索结果中的用户
      console.log('\n🖱️ Clicking on user in search results...');
      try {
        result = await bridge.callTool('browser_click', { 
          selector: '[class*="search-user"], a[href*="/user/"]' 
        });
      } catch (e) {
        console.log('Click failed:', e.message);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
    
    // 8. 最终页面快照
    result = await bridge.callTool('browser_snapshot', {});
    console.log('\n📌 Final page URL:', result.data?.url);
    console.log('Final page text (first 1000 chars):');
    console.log(result.data?.text?.substring(0, 1000));
    
    // 9. 截图
    console.log('\n📸 Taking screenshot...');
    result = await bridge.callTool('browser_take_screenshot', { fullPage: false });
    console.log('Screenshot result:', result.data ? 'Base64 length: ' + result.data.base64?.length : 'no data');
    
    // 10. 提取用户数据
    console.log('\n📊 Extracting user data with JavaScript...');
    result = await bridge.callTool('browser_evaluate', {
      code: `
        (() => {
          const text = document.body.innerText;
          let followers = '', likes = '', following = '';
          
          const statsMatch = text.match(/([\\d,.]+万?)粉丝/);
          if (statsMatch) followers = statsMatch[1];
          
          const likesMatch = text.match(/([\\d,.]+万?)获赞/);
          if (likesMatch) likes = likesMatch[1];
          
          const followingMatch = text.match(/([\\d,.]+万?)关注/);
          if (followingMatch) following = followingMatch[1];
          
          return { url: window.location.href, followers, likes, following };
        })()
      `
    });
    console.log('User data:', JSON.stringify(result.data, null, 2));
    
    // 11. 滚动加载视频
    console.log('\n🔄 Scrolling to load videos...');
    for (let i = 0; i < 10; i++) {
      await bridge.callTool('browser_evaluate', { code: 'window.scrollBy(0, 500)' });
      await new Promise(r => setTimeout(r, 500));
    }
    
    // 12. 提取视频列表
    result = await bridge.callTool('browser_evaluate', {
      code: `
        (() => {
          const items = document.querySelectorAll('[class*="video-item"], [class*="videoCard"], [class*="work-item"]');
          const videos = [];
          
          items.forEach((item, i) => {
            const text = item.innerText || '';
            const likesMatch = text.match(/([\\d,.]+万?)/);
            const dateMatch = text.match(/(\\d+年\\d+月\\d+日|\\d+天前|\\d+小时前)/);
            const lines = text.split('\\n').filter(l => l.trim());
            
            videos.push({
              index: i + 1,
              title: lines[0] || '',
              likes: likesMatch ? likesMatch[1] : '0',
              date: dateMatch ? dateMatch[1] : '未知'
            });
          });
          
          return { total: videos.length, videos: videos.slice(0, 30) };
        })()
      `
    });
    console.log('\n=== Videos (' + result.data?.total + ') ===');
    (result.data?.videos || []).forEach(v => {
      console.log(v.index + '. ' + v.title.substring(0, 50) + ' | ' + v.likes + ' | ' + v.date);
    });
    
    // 13. 最终截图
    result = await bridge.callTool('browser_take_screenshot', { fullPage: true });
    console.log('\n✅ Final screenshot taken');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\n🛑 Stopping browser...');
    await bridge.stop();
    console.log('✅ Browser stopped');
  }
  
  console.log('\n===========================================');
  console.log('  Script completed');
  console.log('===========================================');
}

main().catch(console.error);
