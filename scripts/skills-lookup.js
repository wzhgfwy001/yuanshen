/**
 * Skills 意图路由查询脚本
 * 根据用户消息自动判断应该调用哪个技能
 * 
 * 用法：node scripts/skills-lookup.js "用户消息"
 */

const path = require('path');

// 加载 auto-router
const autoRouter = require('../skills/auto-router.js');

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('用法: node scripts/skills-lookup.js "用户消息"');
    console.log('');
    console.log('示例:');
    console.log('  node scripts/skills-lookup.js "帮我分析数据"');
    console.log('  node scripts/skills-lookup.js "审查代码"');
    console.log('  node scripts/skills-lookup.js "写一篇博客"');
    process.exit(1);
  }
  return args.join(' ');
}

/**
 * 主函数
 */
function main() {
  const userMessage = parseArgs();
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              Skills 自动路由查询                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║ 输入消息: ${userMessage}`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  
  // 1. 路由分析
  console.log('║ [1/3] 执行路由分析...');
  const recommendations = autoRouter.route(userMessage);
  
  if (recommendations.length === 0) {
    console.log('║ 结果: 未匹配到任何技能');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    return;
  }
  
  console.log(`║ 匹配到 ${recommendations.length} 个技能:`);
  recommendations.forEach((rec, i) => {
    const icon = rec.priority === 'high' ? '⚡' : '📦';
    console.log(`║   ${icon} ${i + 1}. ${rec.skill} (优先级: ${rec.priority})`);
    console.log(`║      原因: ${rec.reason}`);
    console.log(`║      方法: ${rec.method}`);
  });
  
  // 2. 技能状态
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ [2/3] 检查技能状态...');
  const status = autoRouter.getSkillsStatus();
  const matchedSkills = recommendations.map(r => r.skill);
  
  matchedSkills.forEach(skillName => {
    const state = status[skillName] || 'unknown';
    const icon = state === 'loaded' ? '✅' : state === 'error' ? '❌' : '❓';
    console.log(`║   ${icon} ${skillName}: ${state}`);
  });
  
  // 3. 自动执行
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ [3/3] 执行技能...');
  const execResult = autoRouter.autoExecute(userMessage);
  
  if (execResult.routed) {
    console.log(`║ ✅ 路由成功 -> 技能: ${execResult.skill}`);
    if (execResult.result && typeof execResult.result === 'object') {
      console.log('║ 执行结果:');
      const resultStr = JSON.stringify(execResult.result, null, 2);
      resultStr.split('\n').forEach(line => {
        if (line.length > 50) {
          console.log(`║   ${line.substring(0, 47)}...`);
        } else {
          console.log(`║   ${line}`);
        }
      });
    }
  } else {
    console.log(`║ ⚠️  未路由: ${execResult.message || execResult.error || '未知原因'}`);
  }
  
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

// 运行
main();
