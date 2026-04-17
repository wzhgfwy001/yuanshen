#!/usr/bin/env node
/**
 * 微信云开发数据上传工具
 * 使用微信TCB SDK直接导入数据
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  envId: 'wfc-9g0bpjwsb8d3d01c',
  appId: 'wx21c2c6114d560057',
  // 数据文件路径
  zhuankeFile: path.join(__dirname, '..', 'cloudbase_data', 'zhuanke_fixed.json'),
  benkeFile: path.join(__dirname, '..', 'cloudbase_data', 'benke_fixed.json'),
};

console.log('=== 微信云开发数据上传工具 ===');
console.log(`环境: ${CONFIG.envId}`);
console.log('');

// 加载数据
function loadJson(filePath) {
  console.log(`加载文件: ${filePath}`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`加载了 ${data.length} 条记录`);
  return data;
}

// 先读取数据看看
const zhuankeData = loadJson(CONFIG.zhuankeFile);
console.log('\n第一条专科数据:');
console.log(JSON.stringify(zhuankeData[0], null, 2));

console.log('\n配置完成。请确保已安装依赖: npm install');
console.log('然后可以部署到云开发环境');
