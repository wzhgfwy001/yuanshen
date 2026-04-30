/**
 * 抖音用户发现和分析 v3
 * 通过搜索找到用户并进入正确的主页
 */

const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = 'C:\\Users\\DELL\\.openclaw\\workspace\\douyin-session';

async function main() {
  console.log('🚀 启动浏览器...');
  
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
    process.exit(1);
  }
  
  console.log('🌐 打开抖音首页...');
  await page.goto('https://www.douyin.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  
  await page.waitForTimeout(3000);
  
  // 检查登录状态
  console.log('🔍 检查登录状态...');
  let isLoggedIn = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*'));
    const loginText = els.find(el => el.textContent === '登录');
    return !loginText;
  });
  
  if (!isLoggedIn) {
    console.log('❌ 未登录，正在点击登录按钮...');
    await page.locator('text=登录').first().click();
    await page.waitForTimeout(2000);
    console.log('📸 二维码截图已保存，请扫码登录');
    await page.screenshot({ path: path.join(__dirname, 'douyin-qrcode.png') });
    
    // 等待扫码登录
    await page.waitForFunction(() => {
      const els = Array.from(document.querySelectorAll('*'));
      const loginText = els.find(el => el.textContent === '登录');
      return !loginText;
    }, { timeout: 120000 });
    
    console.log('✅ 登录成功！');
  } else {
    console.log('✅ 已登录');
  }
  
  await page.waitForTimeout(2000);
  
  // 搜索用户
  console.log('\n🔍 搜索用户: 王截一...');
  
  try {
    // 找到搜索框并点击
    await page.locator('input').first().click();
    await page.waitForTimeout(500);
    
    // 输入搜索词
    await page.keyboard.type('王截一');
    await page.waitForTimeout(1000);
    
    // 按回车
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    
    console.log(`📌 搜索页面URL: ${page.url()}`);
    
    // 截图搜索结果
    await page.screenshot({ path: path.join(__dirname, 'douyin-search-results.png') });
    
    // 获取搜索结果页面内容
    const searchText = await page.evaluate(() => document.body.innerText);
    console.log('\n📄 搜索结果 (前2000字符):');
    console.log(searchText.substring(0, 2000));
    
    // 点击"用户"分类（如果存在）
    try {
      const usersTab = page.locator('text=用户').first();
      if (await usersTab.isVisible({ timeout: 2000 })) {
        await usersTab.click();
        await page.waitForTimeout(2000);
        console.log('✅ 已点击"用户"分类');
      }
    } catch (e) {
      console.log('⚠️ 未找到"用户"分类标签');
    }
    
    // 尝试点击用户头像或昵称进入主页
    console.log('\n🖱️ 尝试点击用户进入主页...');
    
    try {
      // 尝试点击第一个用户结果
      const userLocator = page.locator('text=王截一').first();
      await userLocator.click({ timeout: 5000 });
      await page.waitForTimeout(3000);
      
      console.log(`📌 当前URL: ${page.url()}`);
      console.log(`📌 页面标题: ${await page.title()}`);
      
    } catch (clickError) {
      console.log('⚠️ 点击用户失败:', clickError.message);
    }
    
    // 截图当前页面
    await page.screenshot({ path: path.join(__dirname, 'douyin-current-page.png') });
    
    // 如果URL包含/video/或不是用户主页，按ESC返回
    if (page.url().includes('/video/')) {
      console.log('进入了视频页面，按ESC返回...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(2000);
    }
    
    // 尝试从当前页面提取用户信息
    console.log('\n📊 提取当前页面用户信息...');
    
    const userInfo = await page.evaluate(() => {
      const result = {
        url: window.location.href,
        title: document.title,
        nickname: '',
        followers: '',
        following: '',
        likes: '',
        bio: '',
        videos: []
      };
      
      // 从页面文本中提取信息
      const text = document.body.innerText;
      
      // 昵称 - 通常在标题或特殊元素中
      const nicknameMatch = text.match(/@?([^\n@\s]{2,20})(?:@|$)/);
      if (nicknameMatch) result.nickname = nicknameMatch[1];
      
      // 获赞/粉丝/关注
      const statsMatch = text.match(/([\d.]+万?)获赞.*?([\d.]+万?)粉丝.*?([\d.]+万?)关注/s);
      if (statsMatch) {
        result.likes = statsMatch[1];
        result.followers = statsMatch[2];
        result.following = statsMatch[3];
      }
      
      // 尝试提取视频信息
      const videoBlocks = text.split(/#\w+/).filter(s => s.trim().length > 10);
      result.videos = videoBlocks.slice(0, 10).map((s, i) => ({
        index: i + 1,
        preview: s.substring(0, 100)
      }));
      
      return result;
    });
    
    console.log('\n=== 用户信息 ===');
    console.log(`URL: ${userInfo.url}`);
    console.log(`昵称: ${userInfo.nickname || '未找到'}`);
    console.log(`粉丝: ${userInfo.followers || '未找到'}`);
    console.log(`关注: ${userInfo.following || '未找到'}`);
    console.log(`获赞: ${userInfo.likes || '未找到'}`);
    
    // 保存数据
    const jsonPath = path.join(__dirname, 'douyin-user-analysis.json');
    fs.writeFileSync(jsonPath, JSON.stringify(userInfo, null, 2));
    console.log(`\n💾 数据已保存: ${jsonPath}`);
    
  } catch (error) {
    console.log('⚠️ 搜索过程出错:', error.message);
    await page.screenshot({ path: path.join(__dirname, 'douyin-error-state.png') });
  }
  
  console.log('\n⏸️ 浏览器保持打开...');
  console.log('按 Ctrl+C 结束程序');
  
  await new Promise(() => {});
}

main().catch(error => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});
