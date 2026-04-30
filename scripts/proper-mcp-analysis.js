/**
 * 正确使用 Playwright MCP Bridge 进行抖音分析
 * 
 * 使用 bridge.callTool() 方法来调用工具
 */

const path = require('path');

// 加载 PlaywrightMCPBridge
let mcp;
try {
  mcp = require('../skills/playwright-mcp/dist/index.js');
  console.log('✅ 成功加载 Playwright MCP Skill');
} catch (e) {
  console.log('❌ 无法加载:', e.message);
  process.exit(1);
}

async function main() {
  console.log('\n===========================================');
  console.log('  抖音账号深度分析 (使用 Playwright MCP Bridge)');
  console.log('===========================================\n');
  
  let bridge = null;
  
  try {
    // 创建 bridge 实例
    bridge = mcp.getBridge();
    console.log('✅ Bridge 实例已创建');
    
    // 启动 bridge (启动浏览器)
    console.log('\n🚀 启动浏览器...');
    await bridge.start();
    console.log('✅ 浏览器已启动\n');
    
    // 1. 导航到抖音
    console.log('🌐 打开抖音...');
    let result = await bridge.callTool('browser_navigate', { url: 'https://www.douyin.com/' });
    console.log('✅ 已导航:', result.url);
    await new Promise(r => setTimeout(r, 2000));
    
    // 2. 获取页面快照
    console.log('\n📸 获取页面快照...');
    result = await bridge.callTool('browser_snapshot', {});
    console.log('页面标题:', result.title);
    console.log('页面URL:', result.url);
    const isLoggedIn = result.text && result.text.includes('退出登录');
    console.log('登录状态:', isLoggedIn ? '✅ 已登录' : '❌ 未登录');
    
    // 3. 截图
    console.log('\n📸 截图...');
    await bridge.callTool('browser_take_screenshot', { fullPage: false });
    console.log('✅ 截图已保存: mcp-screenshot.png');
    
    // 4. 导航到用户主页 - 点击右上角头像
    console.log('\n🖱️ 点击右上角头像...');
    // 尝试点击用户头像/头像区域
    result = await bridge.callTool('browser_click', { selector: '[class*="header"] [class*="avatar"], [class*="user-info"], [class*="avatar"]' });
    await new Promise(r => setTimeout(r, 2000));
    
    // 检查是否到达用户主页
    result = await bridge.callTool('browser_snapshot', {});
    console.log('当前URL:', result.url);
    
    // 5. 如果还在首页，尝试通过搜索进入用户主页
    if (!result.url.includes('/user/')) {
      console.log('\n🔍 通过搜索找到用户主页...');
      result = await bridge.callTool('browser_navigate', { url: 'https://www.douyin.com/search/王截一?type=user' });
      await new Promise(r => setTimeout(r, 3000));
      
      result = await bridge.callTool('browser_snapshot', {});
      console.log('搜索页面URL:', result.url);
      
      // 点击用户
      console.log('\n🖱️ 点击用户...');
      try {
        await bridge.callTool('browser_click', { selector: '[class*="search-user"] a, [class*="user-card"] a, a[href*="/user/"]' });
        await new Promise(r => setTimeout(r, 3000));
      } catch (e) {
        console.log('点击失败，尝试其他方式...');
      }
    }
    
    // 6. 再次检查
    result = await bridge.callTool('browser_snapshot', {});
    console.log('\n📌 当前页面:', result.url);
    
    // 7. 滚动加载所有视频
    console.log('\n🔄 滚动加载视频...');
    for (let i = 0; i < 15; i++) {
      await bridge.callTool('browser_evaluate', { code: 'window.scrollBy(0, 500)' });
      await new Promise(r => setTimeout(r, 500));
    }
    
    // 8. 执行 JavaScript 提取用户数据
    console.log('\n📊 提取用户数据...');
    const userData = await bridge.callTool('browser_evaluate', {
      code: `
        (() => {
          const text = document.body.innerText;
          
          // 提取粉丝、获赞、关注
          let followers = '', likes = '', following = '';
          
          const statsMatch = text.match(/([\\d,.]+万?)粉丝/);
          if (statsMatch) followers = statsMatch[1];
          
          const likesMatch = text.match(/([\\d,.]+万?)获赞/);
          if (likesMatch) likes = likesMatch[1];
          
          const followingMatch = text.match(/([\\d,.]+万?)关注/);
          if (followingMatch) following = followingMatch[1];
          
          // 提取视频列表
          const videoItems = [];
          const items = document.querySelectorAll('[class*="video-item"], [class*="videoCard"], [class*="work-item"]');
          
          items.forEach((item, i) => {
            const itemText = item.innerText || '';
            const lines = itemText.split('\\n').filter(l => l.trim());
            
            const likesMatch = itemText.match(/([\\d,.]+万?)/);
            const dateMatch = itemText.match(/(\\d+年\\d+月\\d+日|\\d+天前|\\d+小时前)/);
            
            videoItems.push({
              index: i + 1,
              title: lines[0] || '',
              likes: likesMatch ? likesMatch[1] : '0',
              date: dateMatch ? dateMatch[1] : '未知'
            });
          });
          
          return {
            url: window.location.href,
            followers,
            likes,
            following,
            videos: videoItems.slice(0, 50)
          };
        })()
      `
    });
    
    console.log('\n=== 用户数据 ===');
    console.log('URL:', userData);
    console.log('粉丝:', userData.followers);
    console.log('获赞:', userData.likes);
    console.log('关注:', userData.following);
    console.log('视频数量:', userData.videos?.length || 0);
    
    if (userData.videos && userData.videos.length > 0) {
      console.log('\n=== 视频列表 ===');
      userData.videos.slice(0, 20).forEach(v => {
        console.log(`${v.index}. ${v.title.substring(0, 50)} | ${v.likes} | ${v.date}`);
      });
    }
    
    // 9. 最终截图
    await bridge.callTool('browser_take_screenshot', { fullPage: true });
    console.log('\n✅ 最终截图已保存: mcp-final.png');
    
    // 10. 关闭
    console.log('\n🛑 关闭浏览器...');
    await bridge.stop();
    
    console.log('\n===========================================');
    console.log('  分析完成');
    console.log('===========================================');
    
  } catch (error) {
    console.error('\n❌ 发生错误:', error.message);
    console.error(error.stack);
    
    try {
      if (bridge) await bridge.stop();
    } catch (e) {}
  }
}

main();
