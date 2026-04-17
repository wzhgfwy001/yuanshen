/**
 * 验证脚本：检查 SKILL.md 配置是否正确同步到执行层
 * 
 * 使用方法：node verify-sync.js [skillName]
 *   - 不带参数：验证所有 Skill
 *   - 带参数：验证指定 Skill
 */

const path = require('path');
const fs = require('fs');

// 注册 metadata-registry 模块路径
const metadataRegistry = require('./metadata-registry');

const SKILL_DIRS = [
  path.join(__dirname, '../../skills'),
  path.join(__dirname, '../../core'),
  path.join(__dirname, '../../github-yangshen/core'),
  path.join(__dirname, '../../skills/dynamic-multi-agent-system/core')
];

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, prefix, message) {
  console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

function passMsg(msg) { log(colors.green, '✓', msg); }
function failMsg(msg) { log(colors.red, '✗', msg); }
function warnMsg(msg) { log(colors.yellow, '⚠', msg); }
function infoMsg(msg) { log(colors.blue, 'ℹ', msg); }

/**
 * 获取所有 Skill 名称
 */
function getAllSkillNames() {
  const names = new Set();
  
  for (const baseDir of SKILL_DIRS) {
    if (!fs.existsSync(baseDir)) continue;
    
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(baseDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          names.add(entry.name);
        }
      }
    }
  }
  
  return Array.from(names);
}

/**
 * 验证单个 Skill
 */
function verifySkill(skillName) {
  const results = {
    skillName,
    success: true,
    checks: []
  };
  
  // 检查 1：能否加载元数据
  try {
    const metadata = metadataRegistry.loadMetadata(skillName);
    if (metadata) {
      results.checks.push({ check: 'loadMetadata', passed: true, detail: `v${metadata.version}` });
    } else {
      results.checks.push({ check: 'loadMetadata', passed: false, detail: '返回 null' });
      results.success = false;
    }
  } catch (e) {
    results.checks.push({ check: 'loadMetadata', passed: false, detail: e.message });
    results.success = false;
  }
  
  // 检查 2：必要的顶层字段
  const metadata = metadataRegistry.loadMetadata(skillName);
  if (metadata) {
    const requiredFields = ['name', 'version', 'category', 'executionConfig'];
    for (const field of requiredFields) {
      const passed = field in metadata;
      results.checks.push({ check: `field:${field}`, passed, detail: passed ? '存在' : '缺失' });
      if (!passed) results.success = false;
    }
    
    // 检查 3：executionConfig 结构
    const execConfig = metadata.executionConfig;
    if (execConfig && typeof execConfig === 'object') {
      const configFields = ['timeout', 'maxRetries', 'preferredAgent'];
      for (const field of configFields) {
        const passed = field in execConfig;
        results.checks.push({ check: `execConfig:${field}`, passed, detail: passed ? '存在' : '缺失' });
      }
    } else {
      results.checks.push({ check: 'execConfig:structure', passed: false, detail: '无效结构' });
      results.success = false;
    }
    
    // 检查 4：getSkillConfig 功能
    const category = metadataRegistry.getSkillConfig(skillName, 'category');
    if (category) {
      results.checks.push({ check: 'getSkillConfig', passed: true, detail: category });
    } else {
      results.checks.push({ check: 'getSkillConfig', passed: false, detail: '返回 null' });
      results.success = false;
    }
    
    // 检查 5：getFullConfigPackage 功能
    const fullPackage = metadataRegistry.getFullConfigPackage(skillName);
    if (fullPackage && fullPackage.name && fullPackage.executionConfig) {
      results.checks.push({ check: 'getFullConfigPackage', passed: true, detail: '完整' });
    } else {
      results.checks.push({ check: 'getFullConfigPackage', passed: false, detail: '不完整' });
      results.success = false;
    }
  }
  
  return results;
}

/**
 * 验证 SKILL.md frontmatter 格式
 */
function verifyFrontmatter(skillName) {
  const results = {
    skillName,
    success: true,
    checks: []
  };
  
  let skillPath = null;
  
  for (const baseDir of SKILL_DIRS) {
    const p = path.join(baseDir, skillName, 'SKILL.md');
    if (fs.existsSync(p)) {
      skillPath = p;
      break;
    }
  }
  
  if (!skillPath) {
    results.checks.push({ check: 'fileExists', passed: false, detail: '文件不存在' });
    results.success = false;
    return results;
  }
  
  results.checks.push({ check: 'fileExists', passed: true, detail: skillPath });
  
  // 读取文件内容
  const content = fs.readFileSync(skillPath, 'utf-8');
  
  // 检查 frontmatter 是否存在
  const hasFrontmatter = content.startsWith('---');
  results.checks.push({ check: 'hasFrontmatter', passed: hasFrontmatter, detail: hasFrontmatter ? '存在' : '缺失' });
  if (!hasFrontmatter) results.success = false;
  
  // 检查 metadata.openclaw 是否存在
  const hasOpenclaw = content.includes('metadata') && content.includes('openclaw');
  results.checks.push({ check: 'hasOpenclawBlock', passed: hasOpenclaw, detail: hasOpenclaw ? '存在' : '缺失' });
  if (!hasOpenclaw) results.success = false;
  
  return results;
}

/**
 * 主验证流程
 */
function runVerification(skillNames) {
  console.log('\n' + '='.repeat(60));
  console.log('元数据层同步验证');
  console.log('='.repeat(60) + '\n');
  
  // 1. 同步所有配置
  infoMsg('执行 syncAll()...');
  const syncResults = metadataRegistry.syncAll();
  console.log(`  已同步: ${syncResults.synced.length} 个 Skill`);
  console.log(`  失败: ${syncResults.failed.length} 个 Skill`);
  
  if (syncResults.failed.length > 0) {
    warnMsg('以下 Skill 同步失败:');
    syncResults.failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }
  
  console.log('');
  
  // 2. 逐个验证
  let passCount = 0;
  let failCount = 0;
  
  for (const skillName of skillNames) {
    const metaResults = verifySkill(skillName);
    const fmResults = verifyFrontmatter(skillName);
    
    const allPassed = metaResults.success && fmResults.success;
    
    if (allPassed) {
      passCount++;
      passMsg(skillName);
    } else {
      failCount++;
      failMsg(skillName);
    }
    
    // 打印失败细节
    if (!allPassed) {
      [...metaResults.checks, ...fmResults.checks]
        .filter(c => !c.passed)
        .forEach(c => console.log(`    ${colors.red}✗${colors.reset} ${c.check}: ${c.detail}`));
    }
  }
  
  // 3. 总结
  console.log('\n' + '-'.repeat(60));
  console.log(`验证结果: ${passCount} 通过, ${failCount} 失败`);
  
  // 4. 同步状态
  const status = metadataRegistry.getSyncStatus();
  console.log(`\n同步状态:`);
  console.log(`  缓存数量: ${status.cachedCount}`);
  console.log(`  最后同步: ${status.lastSyncTime || '从未同步'}`);
  
  console.log('\n');
  
  return failCount === 0;
}

// ========== 入口 ==========

const args = process.argv.slice(2);
let skillNames;

if (args.length > 0 && args[0] !== '--all') {
  skillNames = args;
} else {
  skillNames = getAllSkillNames();
  console.log(`发现 ${skillNames.length} 个 Skill\n`);
}

const passed = runVerification(skillNames);
process.exit(passed ? 0 : 1);
