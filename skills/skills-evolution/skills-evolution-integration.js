/**
 * Skills Evolution Integration - 任务完成后调用钩子
 * 
 * 在任务完成时调用此函数，自动记录并检查是否需要固化
 * 
 * 使用方式：
 * const integration = require('./skills-evolution-integration.js');
 * 
 * // 任务完成时
 * integration.onTaskComplete({
 *   type: 'writing',
 *   subtype: 'sci-fi',
 *   success: true,
 *   confidence: 0.9,
 *   description: '完成了科幻小说第1章'
 * });
 */

const tracker = require('./skills-evolution-tracker.js');

/**
 * 任务完成回调
 * @param {Object} taskInfo - 任务信息
 */
function onTaskComplete(taskInfo) {
  const { type, subtype, success, confidence, description } = taskInfo;
  
  // 1. 记录任务
  const result = tracker.recordTask({
    type,
    subtype,
    success,
    confidence,
    description
  });

  console.log(`📊 任务记录: ${result.taskKey}`);
  console.log(`   成功率: ${(result.stats.success_rate * 100).toFixed(1)}%`);

  // 2. 检查是否触发固化
  const readyForSkill = tracker.getTasksReadyForSkill();
  if (readyForSkill.length > 0) {
    console.log(`\n🎯 有${readyForSkill.length}个任务可以固化Skill:`);
    for (const task of readyForSkill) {
      console.log(`   - ${task.taskKey}: ${task.stats.success}/${task.stats.total} = ${(task.stats.success_rate * 100).toFixed(1)}%`);
    }
    console.log('\n提示：调用 createSkillDraft(taskKey) 可生成Skill草稿');
  }

  return result;
}

/**
 * Skill使用回调（固化后调用）
 * @param {string} skillName - Skill名称
 * @param {boolean} success - 是否成功
 */
function onSkillUsed(skillName, success) {
  const result = tracker.recordSkillUsage(skillName, success);

  // 检查是否需要审查
  if (result.stats.needs_review) {
    console.log(`\n⚠️ Skill "${skillName}" 需要审查！`);
    console.log(`   成功率: ${(result.stats.success_rate * 100).toFixed(1)}%`);
    console.log(`   调用 getSkillsForReview() 查看详情`);
    console.log(`   调用 clearReviewFlag('${skillName}') 清除标记`);
  }

  return result;
}

/**
 * 获取系统状态
 */
function getEvolutionStatus() {
  return tracker.getStatus();
}

/**
 * 生成指定任务的Skill草稿
 * @param {string} taskKey - 任务Key（格式：type:subtype）
 */
function createSkillDraft(taskKey) {
  return tracker.generateSkillDraft(taskKey);
}

/**
 * 获取需要审查的Skill列表
 */
function getSkillsForReview() {
  return tracker.getSkillsNeedingReview();
}

/**
 * 清除Skill的审查标记
 * @param {string} skillName - Skill名称
 */
function clearReviewFlag(skillName) {
  return tracker.clearSkillReviewFlag(skillName);
}

module.exports = {
  onTaskComplete,
  onSkillUsed,
  getEvolutionStatus,
  createSkillDraft,
  getSkillsForReview,
  clearReviewFlag
};
