// 【精算天命】Act on Fate - 项目规划

/**
 * 项目规划技能
 * 分解复杂任务为可执行步骤
 */

const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'state.json');

// 任务状态
const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked'
};

// 优先级
const PRIORITY = {
  P0: { level: 0, label: '紧急', color: '🔴' },
  P1: { level: 1, label: '高', color: '🟠' },
  P2: { level: 2, label: '中', color: '🟡' },
  P3: { level: 3, label: '低', color: '🟢' }
};

// 分解任务
function decompose(projectName, description, options = {}) {
  const maxSteps = options.maxSteps || 10;
  const includeSubtasks = options.includeSubtasks !== false;
  
  // 简单的关键词分析
  const steps = [];
  const keywords = extractKeywords(description);
  
  // 基于关键词生成步骤
  if (keywords.includes('分析') || keywords.includes('调研')) {
    steps.push({ title: '调研阶段', description: '收集相关信息和资料', duration: '1-2天', priority: PRIORITY.P1 });
  }
  
  if (keywords.includes('设计') || keywords.includes('规划')) {
    steps.push({ title: '设计阶段', description: '制定详细方案和计划', duration: '2-3天', priority: PRIORITY.P1 });
  }
  
  if (keywords.includes('开发') || keywords.includes('实现') || keywords.includes('编码')) {
    steps.push({ title: '开发阶段', description: '按计划实现功能', duration: '3-7天', priority: PRIORITY.P1 });
  }
  
  if (keywords.includes('测试')) {
    steps.push({ title: '测试阶段', description: '编写测试用例并进行测试', duration: '1-2天', priority: PRIORITY.P2 });
  }
  
  if (keywords.includes('部署') || keywords.includes('上线')) {
    steps.push({ title: '部署阶段', description: '部署到生产环境', duration: '0.5-1天', priority: PRIORITY.P1 });
  }
  
  if (keywords.includes('文档') || keywords.includes('说明')) {
    steps.push({ title: '文档阶段', description: '编写使用文档', duration: '1天', priority: PRIORITY.P3 });
  }
  
  // 确保至少有基础步骤
  if (steps.length === 0) {
    steps.push({ title: '准备工作', description: '明确需求和目标', duration: '1天', priority: PRIORITY.P1 });
    steps.push({ title: '执行计划', description: '按计划执行', duration: '3-5天', priority: PRIORITY.P1 });
    steps.push({ title: '收尾工作', description: '检查和优化', duration: '1天', priority: PRIORITY.P2 });
  }
  
  // 添加依赖关系
  for (let i = 1; i < steps.length; i++) {
    steps[i].dependsOn = [steps[i - 1].title];
  }
  
  // 生成项目结构
  const project = {
    id: `project_${Date.now()}`,
    name: projectName,
    description,
    created: new Date().toISOString(),
    steps: steps.slice(0, maxSteps),
    stats: {
      totalSteps: steps.length,
      estimatedDays: steps.reduce((s, step) => {
        const match = step.duration.match(/(\d+(?:\.\d+)?)/);
        return s + (match ? parseFloat(match[1]) : 1);
      }, 0)
    }
  };
  
  return project;
}

// 提取关键词
function extractKeywords(text) {
  const keywords = [];
  const patterns = [
    '分析', '调研', '设计', '规划', '开发', '实现', '编码', '测试',
    '部署', '上线', '文档', '说明', '优化', '重构', '修复', 'Bug',
    '需求', '功能', '模块', '接口', '数据库', '前端', '后端', '移动端'
  ];
  
  for (const pattern of patterns) {
    if (text.includes(pattern)) {
      keywords.push(pattern);
    }
  }
  
  return keywords;
}

// 创建任务
function createTask(title, options = {}) {
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    description: options.description || '',
    status: options.status || TASK_STATUS.PENDING,
    priority: options.priority || PRIORITY.P2,
    assignee: options.assignee || null,
    dependsOn: options.dependsOn || [],
    estimatedHours: options.estimatedHours || 1,
    tags: options.tags || [],
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
}

// 生成甘特图文本
function generateGantt(project) {
  let gantt = `## ${project.name} - 项目进度\n\n`;
  gantt += `| 任务 | 预计时长 | 优先级 | 状态 | 依赖 |\n`;
  gantt += `|------|----------|--------|------|------|\n`;
  
  for (const step of project.steps) {
    const status = step.completed ? '✅' : '⬜';
    const deps = step.dependsOn ? step.dependsOn.join(', ') : '-';
    gantt += `| ${status} ${step.title} | ${step.duration} | ${step.priority?.color || '🟡'} | ${step.status || '待开始'} | ${deps} |\n`;
  }
  
  return gantt;
}

// 导出
module.exports = {
  decompose,
  createTask,
  generateGantt,
  TASK_STATUS,
  PRIORITY
};
