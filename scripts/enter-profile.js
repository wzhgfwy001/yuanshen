/**
 * 从搜索结果进入用户主页
 */

const { chromium } = require('playwright-core');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = 'C:\\Users\\DELL\\.openclaw\\workspace\\douyin-session';

async function main() {
  console.log('🚀 启动浏览器并尝试进入用户主页...');
  
  let context;
  let page;
  
  try {
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      executablePath: EDGE_PATH,
      headless: false,
      viewport: { width: 1280, height: 800 },
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
      args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox']
    });
    
    page = context.pages()[0];
    console.log('✅ 已加载持久化会话\n');
    
  } catch (error) {
    console.log('❌ 无法加载会话:', error.message);
    process.exit(1);
  }
  
  // 导航到搜索页面
  console.log('🌐 打开搜索页面...');
  await page.goto('https://www.douyin.com/search/王截一?type=user', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(__dirname, 'search-page.png') });
  
  // 尝试多种方式找到并点击用户
  console.log('🔍 查找用户入口...\n');
  
  // 方法1: 尝试点击用户头像
  try {
    console.log('方法1: 尝试点击用户头像...');
    const avatar = page.locator('[class*="avatar"]').first();
    if (await avatar.isVisible({ timeout: 3000 })) {
      await avatar.click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      console.log('✅ 点击头像成功\n');
    }
  } catch (e) {
    console.log('⚠️ 方法1失败:', e.message.substring(0, 50));
  }
  
  // 检查是否到达用户主页
  const currentUrl = page.url();
  console.log(`📌 当前URL: ${currentUrl}`);
  
  if (!currentUrl.includes('/user/')) {
    // 方法2: 尝试点击用户昵称
    try {
      console.log('\n方法2: 尝试点击用户昵称...');
      const nickname = page.locator('text=王截一').first();
      if (await nickname.isVisible({ timeout: 3000 })) {
        await nickname.click({ timeout: 5000 });
        await page.waitForTimeout(2000);
        console.log('✅ 点击昵称成功\n');
      }
    } catch (e) {
      console.log('⚠️ 方法2失败:', e.message.substring(0, 50));
    }
  }
  
  // 检查URL
  const urlAfterClicks = page.url();
  console.log(`📌 点击后URL: ${urlAfterClicks}`);
  
  if (!urlAfterClicks.includes('/user/')) {
    // 方法3: 尝试按Enter或双击
    try {
      console.log('\n方法3: 尝试双击用户区域...');
      // 找到包含用户信息的元素并双击
      const userCard = page.locator('[class*="user-card"], [class*="search-user"]').first();
      if (await userCard.isVisible({ timeout: 3000 })) {
        await userCard.dblclick({ timeout: 5000 });
        await page.waitForTimeout(2000);
        console.log('✅ 双击成功\n');
      }
    } catch (e) {
      console.log('⚠️ 方法3失败:', e.message.substring(0, 50));
    }
  }
  
  // 最终检查
  const finalUrl = page.url();
  console.log(`\n📌 最终URL: ${finalUrl}`);
  
  if (finalUrl.includes('/user/')) {
    console.log('✅ 成功进入用户主页！\n');
    
    // 等待页面完全加载
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(__dirname, 'profile-entered.png') });
    
    // 提取用户信息
    const userInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      
      // 提取粉丝、获赞、关注数
      let followers = '', likes = '', following = '';
      
      const statsMatch = text.match(/([\d,.]+万?)粉丝/);
      if (statsMatch) followers = statsMatch[1];
      
      const likesMatch = text.match(/([\d,.]+万?)获赞/);
      if (likesMatch) likes = likesMatch[1];
      
      const followingMatch = text.match(/([\d,.]+万?)关注/);
      if (followingMatch) following = followingMatch[1];
      
      return { followers, likes, following, url: window.location.href };
    });
    
    console.log('=== 用户主页信息 ===');
    console.log(`URL: ${userInfo.url}`);
    console.log(`粉丝: ${userInfo.followers}`);
    console.log(`获赞: ${userInfo.likes}`);
    console.log(`关注: ${userInfo.following}`);
    
    // 滚动加载所有视频
    console.log('\n🔄 滚动加载所有视频...');
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(400);
    }
    
    await page.screenshot({ path: path.join(__dirname, 'profile-all-videos.png') });
    
    // 提取所有视频
    const allVideos = await page.evaluate(() => {
      const videos = [];
      const items = document.querySelectorAll('[class*="video-item"], [class*="videoCard"], [class*="work-item"]');
      
      items.forEach((item, i) => {
        const text = item.innerText || '';
        const lines = text.split('\n').filter(l => l.trim());
        
        // 提取数据
        const likesMatch = text.match(/([\d,.]+万?)/);
        const dateMatch = text.match(/(\d+年\d+月\d+日|\d+天前|\d+小时前)/);
        
        videos.push({
          index: i + 1,
          title: lines[0] || '',
          likes: likesMatch ? likesMatch[1] : '0',
          date: dateMatch ? dateMatch[1] : '未知'
        });
      });
      
      return videos;
    });
    
    console.log(`\n📹 找到 ${allVideos.length} 个视频\n`);
    allVideos.slice(0, 30).forEach(v => {
      console.log(`${v.index}. ${v.title.substring(0, 50)} | ${v.likes} | ${v.date}`);
    });
    
  } else {
    console.log('❌ 未能进入用户主页\n');
    
    // 保存当前页面供查看
    await page.screenshot({ path: path.join(__dirname, 'current-state.png') });
    console.log('📸 当前状态截图: current-state.png');
    
    // 打印页面文本供分析
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('\n📄 页面内容:\n', pageText.substring(0, 3000));
  }
  
  console.log('\n按 Ctrl+C 结束');
  await new Promise(() => {});
}

main().catch(console.error);
