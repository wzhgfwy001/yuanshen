/**
 * 抖音用户主页深度分析
 * 提取用户所有视频和账号详情
 */

const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = 'C:\\Users\\DELL\\.openclaw\\workspace\\douyin-session';

async function main() {
  console.log('🚀 启动浏览器并加载持久化会话...');
  
  let context;
  let page;
  
  try {
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      executablePath: EDGE_PATH,
      headless: false,
      viewport: { width: 1280, height: 720 },
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
      args: [
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    
    page = context.pages()[0];
    console.log('✅ 已加载持久化会话');
    
  } catch (error) {
    console.log('❌ 无法加载持久化会话:', error.message);
    console.log('请先运行 open-douyin-v2.js 进行登录');
    process.exit(1);
  }
  
  // 用户ID
  const userId = '73703621074';
  
  console.log(`\n🌐 正在打开用户主页...`);
  await page.goto(`https://www.douyin.com/user/${userId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  
  await page.waitForTimeout(5000);
  
  console.log(`📌 当前URL: ${page.url()}`);
  console.log(`📌 页面标题: ${await page.title()}`);
  
  // 截图主页
  const profileScreenshot = path.join(__dirname, 'douyin-profile-full.png');
  await page.screenshot({ path: profileScreenshot, fullPage: false });
  console.log(`📸 主页截图: ${profileScreenshot}`);
  
  // 提取用户详细信息
  console.log('\n📊 正在提取用户详细信息...');
  
  const profileData = await page.evaluate(() => {
    // 尝试从页面提取数据
    const result = {
      // 用户基本信息
      nickname: '',
      douyinId: '',  // 抖音号
      followers: 0,
      following: 0,
      likes: 0,  // 获赞数
      bio: '',  // 简介
      avatar: '',
      
      // 视频数据
      videos: [],
      videoCount: 0,
      totalLikes: 0,
      
      // 页面状态
      isLoggedIn: false,
      pageType: 'unknown'
    };
    
    // 检测登录状态 - 使用原生JS
    const allElements = document.querySelectorAll('*');
    const loginBtn = Array.from(allElements).find(el => el.textContent === '登录');
    result.isLoggedIn = !loginBtn;
    
    // 查找用户信息区域
    // 昵称
    const nicknameEl = document.querySelector('[class*="nickname"]') || 
                       document.querySelector('h1[class*="title"]') ||
                       document.querySelector('[class*="user-info"] [class*="name"]');
    if (nicknameEl) result.nickname = nicknameEl.textContent.trim();
    
    // 抖音号
    const douyinIdEl = document.querySelector('[class*="douyinId"]') ||
                       document.querySelector('[class*="抖音号"]') ||
                       document.querySelector('[class*="account"]');
    if (douyinIdEl) result.douyinId = douyinIdEl.textContent.replace('抖音号:', '').trim();
    
    // 粉丝、关注、获赞
    const statsEls = document.querySelectorAll('[class*="num"]') || 
                     document.querySelectorAll('[class*="count"]');
    statsEls.forEach(el => {
      const text = el.textContent.trim();
      if (text.includes('粉丝')) result.followers = text;
      else if (text.includes('关注')) result.following = text;
      else if (text.includes('获赞')) result.likes = text;
    });
    
    // 简介
    const bioEl = document.querySelector('[class*="signature"]') ||
                  document.querySelector('[class*="bio"]') ||
                  document.querySelector('[class*="desc"]');
    if (bioEl) result.bio = bioEl.textContent.trim();
    
    // 头像
    const avatarEl = document.querySelector('[class*="avatar"] img') ||
                     document.querySelector('[class*="user-avatar"] img');
    if (avatarEl) result.avatar = avatarEl.src;
    
    // 查找视频列表
    // 抖音的视频卡片通常在 .video-list 或类似容器中
    const videoContainers = document.querySelectorAll('[class*="video-card"]') ||
                           document.querySelectorAll('[class*="videoItem"]') ||
                           document.querySelectorAll('[class*="video-item"]') ||
                           document.querySelectorAll('[class*="feed"] [class*="item"]');
    
    let videoCount = 0;
    let totalLikes = 0;
    
    videoContainers.forEach((card, index) => {
      if (videoCount >= 20) return;  // 最多取20个
      
      const videoData = {
        index: index + 1,
        title: '',
        likes: 0,
        comments: 0,
        shares: 0,
        duration: '',
        date: '',
        url: ''
      };
      
      // 标题
      const titleEl = card.querySelector('[class*="title"]') ||
                     card.querySelector('[class*="desc"]') ||
                     card.querySelector('a[class*="link"]');
      if (titleEl) videoData.title = titleEl.textContent.trim().substring(0, 100);
      
      // 获赞数
      const likesEl = card.querySelector('[class*="like"]') ||
                      card.querySelector('[class*="heart"]') ||
                      card.querySelector('[class*="digg"]');
      if (likesEl) {
        videoData.likes = parseInt(likesEl.textContent.replace(/[^0-9]/g, '')) || 0;
        totalLikes += videoData.likes;
      }
      
      // 时长
      const durationEl = card.querySelector('[class*="duration"]');
      if (durationEl) videoData.duration = durationEl.textContent;
      
      // 链接
      const linkEl = card.querySelector('a[href*="/video/"]');
      if (linkEl) videoData.url = 'https://www.douyin.com' + linkEl.getAttribute('href');
      
      result.videos.push(videoData);
      videoCount++;
    });
    
    result.videoCount = videoCount;
    result.totalLikes = totalLikes;
    
    // 如果没有找到视频，尝试从页面文本中提取
    if (videoCount === 0) {
      const pageText = document.body.innerText;
      
      // 尝试匹配视频信息模式
      const videoPatterns = [
        /#(\w+)\s*([\u4e00-\u9fa5\w\s]+?)\s*([\d.]+[万千]?)\s*([\d.]+[万千]?)/g,
      ];
      
      // 提取页面中所有数字（可能是统计数据）
      const numbers = pageText.match(/[\d.]+[万千万]?/g);
      if (numbers) {
        result.statsFromText = numbers.slice(0, 50);
      }
    }
    
    return result;
  });
  
  console.log('\n=== 用户资料 ===');
  console.log(`昵称: ${profileData.nickname || '未找到'}`);
  console.log(`抖音号: ${profileData.douyinId || userId}`);
  console.log(`粉丝数: ${profileData.followers || '未找到'}`);
  console.log(`关注数: ${profileData.following || '未找到'}`);
  console.log(`获赞数: ${profileData.likes || '未找到'}`);
  console.log(`简介: ${profileData.bio || '未找到'}`);
  console.log(`视频数量(可见): ${profileData.videoCount}`);
  console.log(`总获赞(可见): ${profileData.totalLikes}`);
  console.log(`登录状态: ${profileData.isLoggedIn ? '✅ 已登录' : '❌ 未登录'}`);
  
  // 保存数据
  const jsonPath = path.join(__dirname, 'douyin-profile-data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(profileData, null, 2));
  console.log(`\n💾 完整数据已保存: ${jsonPath}`);
  
  // 获取页面完整文本
  const pageText = await page.evaluate(() => document.body.innerText);
  const textPath = path.join(__dirname, 'douyin-profile-page.txt');
  fs.writeFileSync(textPath, pageText);
  console.log(`💾 页面文本已保存: ${textPath}`);
  
  // 向下滚动加载更多视频
  console.log('\n🔄 滚动加载更多视频...');
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(800);
  }
  
  // 再次截图
  const scrolledScreenshot = path.join(__dirname, 'douyin-profile-scrolled.png');
  await page.screenshot({ path: scrolledScreenshot, fullPage: true });
  console.log(`📸 滚动后截图: ${scrolledScreenshot}`);
  
  // 尝试再次提取视频数据
  const moreVideos = await page.evaluate(() => {
    const videos = [];
    const items = document.querySelectorAll('[class*="video-card"], [class*="video-item"], [class*="videoItem"]');
    
    items.forEach((item, i) => {
      if (i >= 20) return;
      
      const text = item.innerText || '';
      const href = item.querySelector('a')?.href || '';
      
      videos.push({
        index: i + 1,
        text: text.substring(0, 200),
        hasVideoUrl: href.includes('/video/')
      });
    });
    
    return videos;
  });
  
  console.log(`\n📹 找到 ${moreVideos.length} 个视频元素`);
  
  console.log('\n⏸️ 浏览器保持打开状态...');
  console.log('按 Ctrl+C 结束程序');
  
  await new Promise(() => {});
}

main().catch(error => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});
