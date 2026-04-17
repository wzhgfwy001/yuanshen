/**
 * 主动建议系统 - Proactive Suggest System
 * 每小时基于上下文自动推荐下一步操作
 */

const fs = require('fs');
const path = require('path');

const TASK_TRACKER = 'C:/Users/DELL/.openclaw/workspace/task-tracker.json';
const BRAIN_TASKS = 'C:/Users/DELL/.openclaw/workspace/brain/tasks/active.md';
const MEMORY_TODAY = 'C:/Users/DELL/.openclaw/workspace/memory/2026-04-12.md';

function loadTaskTracker() {
  try {
    return JSON.parse(fs.readFileSync(TASK_TRACKER, 'utf8'));
  } catch {
    return { active_tasks: {} };
  }
}

function getSuggestions() {
  const tasks = loadTaskTracker();
  const suggestions = [];
  const now = new Date();
  const hour = now.getHours();
  
  // 基于时间推荐
  if (hour >= 8 && hour < 9) {
    suggestions.push({ type: 'time', priority: 'high', text: '📬 检查今日消息和待处理事项' });
  }
  if (hour >= 18 && hour < 19) {
    suggestions.push({ type: 'time', priority: 'high', text: '📊 生成今日运营报告' });
  }
  
  // 基于任务状态推荐
  const pendingTasks = Object.values(tasks.active_tasks || {}).filter(t => t.status === 'pending');
  if (pendingTasks.length > 0) {
    suggestions.push({
      type: 'task',
      priority: 'medium',
      text: `📋 ${pendingTasks.length}个待处理任务`,
      tasks: pendingTasks.map(t => t.task)
    });
  }
  
  // 基于上下文大小推荐（如果是大型会话）
  suggestions.push({ type: 'context', priority: 'low', text: '💡 如果感觉响应慢，考虑开新会话' });
  
  return suggestions;
}

function formatSuggestions() {
  const suggestions = getSuggestions();
  if (suggestions.length === 0) return null;
  
  let output = '💡 **主动建议**\n\n';
  for (const s of suggestions) {
    output += `${s.text}\n`;
    if (s.tasks) {
      for (const t of s.tasks) {
        output += `  • ${t}\n`;
      }
    }
  }
  return output;
}

// CLI模式
if (require.main === module) {
  const output = formatSuggestions();
  if (output) {
    console.log(output);
  } else {
    console.log('暂无建议');
  }
}

module.exports = { getSuggestions, formatSuggestions };
