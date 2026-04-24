/**
 * 阳神系统 - OpenClaw技能集成器
 * 
 * 功能：集成OpenClaw内置技能，增强阳神能力
 * 版本：v1.0.0
 */

const fs = require('fs');
const path = require('path');

// OpenClaw内置技能路径
const OPENCLAW_SKILLS_PATH = 'C:/Users/DELL/AppData/Roaming/npm/node_modules/openclaw/skills';

// 技能注册表
const SKILL_REGISTRY = {
  'skill-creator': {
    name: 'Skill Creator',
    path: 'skill-creator',
    triggerKeywords: [
      '创建技能', 'author a skill', 'create a skill', 'make a skill',
      '优化', 'improve skill', 'tidy up skill',
      '审计', 'review skill', 'audit skill',
      '整理技能', 'clean up skill', 'solidify skill',
      '新技能', '技能固化', '固化',
      '做个技能', '创建个技能', '技能创建'
    ]
  },
  'clawflow': {
    name: 'ClawFlow',
    path: 'clawflow',
    triggerKeywords: [
      '复杂任务', 'complex task',
      '多步骤', 'multi-step',
      '多步处理', 'workflow',
      '工作流', '持久化',
      '后台任务', 'background'
    ]
  },
  'clawflow-inbox-triage': {
    name: 'ClawFlow Inbox Triage',
    path: 'clawflow-inbox-triage',
    triggerKeywords: [
      '消息分类', '分类处理', 'triage',
      '收件箱', 'inbox',
      '批量处理', '批量'
    ]
  }
};

/**
 * 检测用户输入是否触发内置技能
 * @param {string} userInput - 用户输入
 * @returns {string|null} 触发的技能名称，未触发返回null
 */
function detectSkillTrigger(userInput) {
  const lower = userInput.toLowerCase();
  // 按空格和常见中文分隔符分词
  const inputWords = lower.split(/[\s,，、。！？]+/);
  
  for (const [skillName, skill] of Object.entries(SKILL_REGISTRY)) {
    for (const keyword of skill.triggerKeywords) {
      const kwLower = keyword.toLowerCase();
      
      // 精确匹配（包含关系）- 优先
      if (lower.includes(kwLower)) {
        console.log(`[Skill-Integrator] 触发技能: ${skillName}, 关键词: ${keyword}`);
        return skillName;
      }
      
      // 分词后的词匹配（处理"消息"能匹配"消息分类"的情况）
      for (const word of inputWords) {
        if (word.length >= 2 && (word.includes(kwLower) || kwLower.includes(word))) {
          console.log(`[Skill-Integrator] 触发技能: ${skillName}, 词匹配: ${word} ~ ${keyword}`);
          return skillName;
        }
      }
    }
  }
  return null;
}

/**
 * 加载技能SKILL.md内容
 * @param {string} skillName - 技能名称
 * @returns {string|null} 技能内容
 */
function loadSkillContent(skillName) {
  const skill = SKILL_REGISTRY[skillName];
  if (!skill) {
    console.error(`[Skill-Integrator] 未知技能: ${skillName}`);
    return null;
  }
  
  const skillPath = path.join(OPENCLAW_SKILLS_PATH, skill.path, 'SKILL.md');
  
  try {
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf8');
      console.log(`[Skill-Integrator] 加载技能成功: ${skillName}, ${content.length}字符`);
      return content;
    } else {
      console.error(`[Skill-Integrator] 技能文件不存在: ${skillPath}`);
      return null;
    }
  } catch (e) {
    console.error(`[Skill-Integrator] 读取技能失败: ${skillName}`, e.message);
    return null;
  }
}

/**
 * 获取技能信息
 * @param {string} skillName - 技能名称
 * @returns {object|null} 技能信息
 */
function getSkillInfo(skillName) {
  const skill = SKILL_REGISTRY[skillName];
  if (!skill) return null;
  
  return {
    name: skill.name,
    triggerKeywords: skill.triggerKeywords,
    path: path.join(OPENCLAW_SKILLS_PATH, skill.path)
  };
}

/**
 * 列出所有可用技能
 * @returns {array} 技能列表
 */
function listSkills() {
  return Object.entries(SKILL_REGISTRY).map(([name, skill]) => ({
    name,
    displayName: skill.name,
    triggerCount: skill.triggerKeywords.length
  }));
}

/**
 * 检查技能是否可用
 * @param {string} skillName - 技能名称
 * @returns {boolean} 是否可用
 */
function isSkillAvailable(skillName) {
  const skill = SKILL_REGISTRY[skillName];
  if (!skill) return false;
  
  const skillPath = path.join(OPENCLAW_SKILLS_PATH, skill.path, 'SKILL.md');
  return fs.existsSync(skillPath);
}

// 导出接口
module.exports = {
  detectSkillTrigger,
  loadSkillContent,
  getSkillInfo,
  listSkills,
  isSkillAvailable,
  SKILL_REGISTRY
};

// 控制台测试
if (require.main === module) {
  console.log('=== 阳神技能集成器测试 ===\n');
  
  // 列出所有技能
  console.log('可用技能:');
  listSkills().forEach(s => {
    console.log(`  - ${s.name} (${s.displayName}), ${s.triggerCount}个触发词`);
  });
  
  console.log('\n--- 触发检测测试 ---');
  
  // 测试触发
  const testInputs = [
    '帮我创建一个新技能',
    '这个技能有问题，帮我优化',
    '有个复杂任务需要多步骤处理',
    '这些消息需要分类处理'
  ];
  
  testInputs.forEach(input => {
    const detected = detectSkillTrigger(input);
    console.log(`"${input}" → ${detected || '无触发'}`);
  });
}
