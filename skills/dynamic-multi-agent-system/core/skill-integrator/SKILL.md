# 阳神系统 - OpenClaw技能集成器

**版本：** v1.0.0  
**功能：** 集成OpenClaw内置技能，增强阳神能力

---

## 集成技能清单

| 技能 | 用途 | 触发关键词 |
|------|------|-----------|
| `skill-creator` | 创建/优化Skill | "创建技能"、"优化技能"、"审计技能" |
| `clawflow` | 多步骤工作流管理 | "复杂任务"、"多步骤"、"需要持久化" |

---

## 技能注册表

```javascript
const BUILT_IN_SKILLS = {
  'skill-creator': {
    path: 'C:/Users/DELL/AppData/Roaming/npm/node_modules/openclaw/skills/skill-creator',
    name: 'Skill Creator',
    description: '创建、编辑、优化或审计AgentSkills',
    triggerKeywords: [
      '创建技能', '创建skill', 'author a skill',
      '优化技能', 'improve this skill',
      '审计技能', 'review the skill',
      '整理技能', 'tidy up a skill',
      '清理技能', 'clean up a skill',
      'skill固化', 'solidify skill'
    ],
    capabilities: [
      '从零创建新技能',
      '优化现有技能',
      '审计技能结构和内容',
      '技能打包和分发'
    ]
  },
  
  'clawflow': {
    path: 'C:/Users/DELL/AppData/Roaming/npm/node_modules/openclaw/skills/clawflow',
    name: 'ClawFlow',
    description: '多步骤后台工作流管理，支持任务持久化和状态跟踪',
    triggerKeywords: [
      '复杂任务', 'complex task',
      '多步骤任务', 'multi-step',
      '需要持久化', 'need persistence',
      '后台任务', 'background task',
      '等待结果', 'wait for result'
    ],
    capabilities: [
      '创建工作流',
      '管理任务状态',
      '等待和恢复',
      '输出持久化'
    ]
  },
  
  'clawflow-inbox-triage': {
    path: 'C:/Users/DELL/AppData/Roaming/npm/node_modules/openclaw/skills/clawflow-inbox-triage',
    name: 'ClawFlow Inbox Triage',
    description: '消息分类路由示例模式',
    triggerKeywords: [
      '消息分类', 'triage messages',
      '收件箱路由', 'inbox routing',
      '批量处理消息'
    ],
    capabilities: [
      '消息分类',
      '路由决策',
      '通知分发'
    ]
  },

  // === 用户创建技能（9个）===
  'code-review': {
    path: 'C:/Users/DELL/.openclaw/workspace/skills/code-review',
    name: 'Code Review',
    description: '代码审查助手',
    triggerKeywords: ['审查代码', 'code review', '检查代码', 'review code', '代码审计'],
    capabilities: ['Bug检测', '性能分析', '安全检查', '代码质量']
  },
  'writing-blog': {
    path: 'C:/Users/DELL/.openclaw/workspace/skills/writing-blog',
    name: 'Writing Blog',
    description: '博客写作助手',
    triggerKeywords: ['写博客', '写文章', 'blog', 'article', '写作', '文案'],
    capabilities: ['博客写作', '文章创作', '内容策划']
  },
  'data-analysis': {
    path: 'C:/Users/DELL/.openclaw/workspace/skills/data-analysis',
    name: 'Data Analysis',
    description: '数据分析助手',
    triggerKeywords: ['数据分析', 'data analysis', '分析数据', '统计'],
    capabilities: ['数据分析', '报表生成', '可视化']
  },
  'research-assistant': {
    path: 'C:/Users/DELL/.openclaw/workspace/skills/research-assistant',
    name: 'Research Assistant',
    description: '研究助手',
    triggerKeywords: ['研究', '调研', 'research', '整理资料', '生成报告'],
    capabilities: ['信息收集', '资料整理', '报告生成']
  },
  'project-planner': {
    path: 'C:/Users/DELL/.openclaw/workspace/skills/project-planner',
    name: 'Project Planner',
    description: '项目规划助手',
    triggerKeywords: ['项目规划', 'project plan', '做计划', '规划'],
    capabilities: ['需求分析', '计划制定', '任务分解']
  },
  'visualization-creator': {
    path: 'C:/Users/DELL/.openclaw/workspace/skills/visualization-creator',
    name: 'Visualization Creator',
    description: '可视化助手',
    triggerKeywords: ['可视化', 'visualization', '图表', '画图'],
    capabilities: ['图表生成', '数据可视化', '架构图']
  },
  'content-collector': {
    path: 'C:/Users/DELL/.openclaw/workspace/skills/content-collector',
    name: 'Content Collector',
    description: '内容采集助手',
    triggerKeywords: ['内容采集', '收集内容', 'collector'],
    capabilities: ['内容抓取', '信息搜索', '数据整理']
  },
  'xiaohongshu-editor': {
    path: 'C:/Users/DELL/.openclaw/workspace/skills/xiaohongshu-editor',
    name: 'Xiaohongshu Editor',
    description: '小红书内容编辑助手',
    triggerKeywords: ['小红书', 'xiaohongshu', '红书编辑'],
    capabilities: ['内容改写', 'emoji添加', '标签优化', '排版']
  },
  'content-publisher': {
    path: 'C:/Users/DELL/.openclaw/workspace/skills/content-publisher',
    name: 'Content Publisher',
    description: '内容发布助手',
    triggerKeywords: ['发布内容', 'content publish', '发布', '发布助手'],
    capabilities: ['文件保存', '格式转换', '批量导出']
  }
};
```

---

## 技能调用接口

### 1. 检测是否需要调用技能

```javascript
/**
 * 检测用户请求是否触发内置技能
 * @param {string} userInput - 用户输入
 * @returns {string|null} 触发的技能名称，未触发返回null
 */
function detectSkillTrigger(userInput) {
  const lower = userInput.toLowerCase();
  
  for (const [skillName, skill] of Object.entries(BUILT_IN_SKILLS)) {
    for (const keyword of skill.triggerKeywords) {
      if (lower.includes(keyword.toLowerCase())) {
        console.log(`[技能检测] 触发 ${skillName}，关键词: ${keyword}`);
        return skillName;
      }
    }
  }
  return null;
}
```

### 2. 读取技能内容

```javascript
/**
 * 读取技能SKILL.md内容
 * @param {string} skillName - 技能名称
 * @returns {string|null} 技能内容
 */
function loadSkillContent(skillName) {
  const skill = BUILT_IN_SKILLS[skillName];
  if (!skill) return null;
  
  const fs = require('fs');
  const path = `${skill.path}/SKILL.md`;
  
  try {
    return fs.readFileSync(path, 'utf8');
  } catch (e) {
    console.error(`[技能加载失败] ${skillName}:`, e.message);
    return null;
  }
}
```

### 3. 执行技能

```javascript
/**
 * 执行技能处理
 * @param {string} skillName - 技能名称
 * @param {string} userInput - 用户输入
 * @param {object} context - 上下文
 * @returns {string} 处理结果
 */
async function executeSkill(skillName, userInput, context) {
  const skill = BUILT_IN_SKILLS[skillName];
  if (!skill) return '未识别的技能';
  
  const content = loadSkillContent(skillName);
  if (!content) return '技能加载失败';
  
  // 注入技能内容到上下文
  context.skillContent = content;
  
  // 调用阳神处理，传递技能指导
  // ... 阳神根据技能内容处理任务
}
```

---

## 使用流程

```
用户: "帮我创建一个写作技能"

    ↓
    
detectSkillTrigger() 检测到 'skill-creator'

    ↓
    
loadSkillContent('skill-creator') 加载技能指导

    ↓
    
executeSkill() 注入技能内容到阳神

    ↓
    
阳神按照 skill-creator 的指导创建设计

    ↓
    
返回结果给用户
```

---

## 快速触发示例

| 用户请求 | 触发技能 | 阳神行为 |
|---------|---------|---------|
| "帮我创建一个新技能" | skill-creator | 引导创建流程 |
| "这个技能有问题，帮我审计" | skill-creator | 检查技能结构 |
| "优化一下现有技能" | skill-creator | 分析并优化 |
| "有个复杂任务需要多步处理" | clawflow | 使用工作流管理 |
| "这些消息需要分类处理" | clawflow-inbox-triage | 使用分类模式 |

---

## 集成状态

| 技能 | 状态 | 说明 |
|------|------|------|
| skill-creator | ✅ 已集成 | 完整功能 |
| clawflow | ✅ 已集成 | 完整功能 |
| clawflow-inbox-triage | ✅ 已集成 | 参考示例 |
| code-review | ✅ 已集成 | 代码审查助手 |
| writing-blog | ✅ 已集成 | 博客写作助手 |
| data-analysis | ✅ 已集成 | 数据分析助手 |
| research-assistant | ✅ 已集成 | 研究助手 |
| project-planner | ✅ 已集成 | 项目规划助手 |
| visualization-creator | ✅ 已集成 | 可视化助手 |
| content-collector | ✅ 已集成 | 内容采集助手 |
| xiaohongshu-editor | ✅ 已集成 | 小红书编辑助手 |
| content-publisher | ✅ 已集成 | 内容发布助手 |

---

*v1.0.0 - 2026-04-11*
