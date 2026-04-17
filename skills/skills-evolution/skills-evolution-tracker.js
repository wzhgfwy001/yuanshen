/**
 * Skills Evolution Tracker - 技能进化追踪器
 * 
 * 功能：
 * 1. 记录任务完成情况
 * 2. 计算任务类型成功率
 * 3. 检测固化触发条件
 * 4. 生成Skill草稿
 * 
 * 使用方式：
 * const tracker = require('./skills-evolution-tracker.js');
 * tracker.recordTask({ type: 'writing', subtype: 'sci-fi', success: true });
 */

const fs = require('fs');
const path = require('path');

const PROGRESS_PATH = path.join(__dirname, '../../brain/progress.json');
const SKILL_DRAFTS_DIR = path.join(__dirname, '../../skills/skill-drafts');

// 确保目录存在
if (!fs.existsSync(SKILL_DRAFTS_DIR)) {
  fs.mkdirSync(SKILL_DRAFTS_DIR, { recursive: true });
}

class SkillsEvolutionTracker {
  constructor() {
    this.progress = this._loadProgress();
  }

  _loadProgress() {
    try {
      const data = fs.readFileSync(PROGRESS_PATH, 'utf8');
      const progress = JSON.parse(data);
      if (!progress.skills_evolution) {
        progress.skills_evolution = {
          task_tracking: {},
          skill_tracking: {}
        };
      }
      return progress;
    } catch (e) {
      return {
        skills_evolution: {
          task_tracking: {},
          skill_tracking: {}
        }
      };
    }
  }

  _saveProgress() {
    try {
      const data = fs.readFileSync(PROGRESS_PATH, 'utf8');
      const progress = JSON.parse(data);
      progress.skills_evolution = this.progress.skills_evolution;
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf8');
    } catch (e) {
      console.error('保存进度失败:', e.message);
    }
  }

  /**
   * 记录任务完成
   * @param {Object} taskInfo - 任务信息
   * @param {string} taskInfo.type - 任务类型（code/writing/research/data_analysis/system）
   * @param {string} taskInfo.subtype - 子类型（如：sci-fi/frontend/react）
   * @param {boolean} taskInfo.success - 是否成功
   * @param {number} taskInfo.confidence - 置信度 0-1
   * @param {string} taskInfo.description - 任务描述
   */
  recordTask(taskInfo) {
    const { type, subtype, success, confidence = 0.8, description = '' } = taskInfo;
    const taskKey = `${type}:${subtype}`;
    
    // 初始化追踪数据
    if (!this.progress.skills_evolution.task_tracking[taskKey]) {
      this.progress.skills_evolution.task_tracking[taskKey] = {
        type,
        subtype,
        total: 0,
        success: 0,
        failed: 0,
        success_rate: 0,
        last_5: [],
        avg_confidence: 0,
        examples: [],
        trigger_new_skill: false,
        skill_draft_created: false
      };
    }

    const tracking = this.progress.skills_evolution.task_tracking[taskKey];

    // 更新统计
    tracking.total++;
    if (success) {
      tracking.success++;
    } else {
      tracking.failed++;
    }

    // 更新成功率
    tracking.success_rate = tracking.success / tracking.total;

    // 更新最近5次记录
    tracking.last_5.push(success);
    if (tracking.last_5.length > 5) {
      tracking.last_5.shift();
    }

    // 更新平均置信度
    tracking.avg_confidence = (tracking.avg_confidence * (tracking.total - 1) + confidence) / tracking.total;

    // 记录成功案例（最多保存3个）
    if (success && description) {
      tracking.examples.push({
        description,
        timestamp: new Date().toISOString()
      });
      if (tracking.examples.length > 3) {
        tracking.examples.shift();
      }
    }

    // 检查是否触发固化条件
    this._checkTriggerConditions(tracking, taskKey);

    // 保存
    this._saveProgress();

    return {
      taskKey,
      stats: {
        total: tracking.total,
        success: tracking.success,
        success_rate: tracking.success_rate,
        trigger_new_skill: tracking.trigger_new_skill
      }
    };
  }

  /**
   * 检查固化触发条件
   * 条件：成功次数 >= 5 AND 成功率 > 80%
   */
  _checkTriggerConditions(tracking, taskKey) {
    const MIN_ATTEMPTS = 5;
    const MIN_SUCCESS_RATE = 0.8;

    // 高频任务降标准（usageCount > 20 时，3次可触发）
    const isHighFrequency = tracking.total > 20;
    const effectiveMinAttempts = isHighFrequency ? 3 : MIN_ATTEMPTS;

    if (tracking.total >= effectiveMinAttempts && tracking.success_rate >= MIN_SUCCESS_RATE) {
      if (!tracking.skill_draft_created) {
        tracking.trigger_new_skill = true;
        console.log(`🎯 触发Skill固化条件: ${taskKey}`);
        console.log(`   成功次数: ${tracking.success}/${tracking.total} = ${(tracking.success_rate * 100).toFixed(1)}%`);
      }
    }
  }

  /**
   * 记录Skill使用情况（固化后调用）
   * @param {string} skillName - Skill名称
   * @param {boolean} success - 是否成功
   * @param {number} confidence - 置信度
   */
  recordSkillUsage(skillName, success, confidence = 0.8) {
    if (!this.progress.skills_evolution.skill_tracking[skillName]) {
      this.progress.skills_evolution.skill_tracking[skillName] = {
        name: skillName,
        invoked: 0,
        success: 0,
        failed: 0,
        success_rate: 0,
        needs_review: false,
        consecutive_low_scores: 0,
        avg_execution_time: 0,
        last_used: null
      };
    }

    const tracking = this.progress.skills_evolution.skill_tracking[skillName];
    tracking.invoked++;
    if (success) {
      tracking.success++;
    } else {
      tracking.failed++;
    }
    tracking.success_rate = tracking.success / tracking.invoked;
    tracking.last_used = new Date().toISOString();

    // 检查淘汰条件：连续3次失败 或 成功率<60%
    if (!success) {
      tracking.consecutive_low_scores++;
    } else {
      tracking.consecutive_low_scores = 0;
    }

    // 触发审查条件
    if (tracking.consecutive_low_scores >= 3 || tracking.success_rate < 0.6) {
      tracking.needs_review = true;
      console.log(`⚠️ Skill需要审查: ${skillName}`);
      console.log(`   连续失败: ${tracking.consecutive_low_scores}次`);
      console.log(`   成功率: ${(tracking.success_rate * 100).toFixed(1)}%`);
    }

    this._saveProgress();
    return {
      skillName,
      stats: {
        invoked: tracking.invoked,
        success_rate: tracking.success_rate,
        needs_review: tracking.needs_review
      }
    };
  }

  /**
   * 获取需要审查的Skill
   */
  getSkillsNeedingReview() {
    const needsReview = [];
    for (const [name, tracking] of Object.entries(this.progress.skills_evolution.skill_tracking)) {
      if (tracking.needs_review) {
        needsReview.push({
          name,
          stats: {
            invoked: tracking.invoked,
            success_rate: tracking.success_rate,
            consecutive_low_scores: tracking.consecutive_low_scores
          }
        });
      }
    }
    return needsReview;
  }

  /**
   * 清除Skill审查标记（用户确认继续使用）
   */
  clearSkillReviewFlag(skillName) {
    if (this.progress.skills_evolution.skill_tracking[skillName]) {
      this.progress.skills_evolution.skill_tracking[skillName].needs_review = false;
      this.progress.skills_evolution.skill_tracking[skillName].consecutive_low_scores = 0;
      this._saveProgress();
      return { success: true };
    }
    return { error: 'Skill not found' };
  }

  /**
   * 获取所有需要固化的任务
   */
  getTasksReadyForSkill() {
    const ready = [];
    for (const [taskKey, tracking] of Object.entries(this.progress.skills_evolution.task_tracking)) {
      if (tracking.trigger_new_skill && !tracking.skill_draft_created) {
        ready.push({
          taskKey,
          type: tracking.type,
          subtype: tracking.subtype,
          stats: {
            total: tracking.total,
            success: tracking.success,
            success_rate: tracking.success_rate
          }
        });
      }
    }
    return ready;
  }

  /**
   * 生成Skill草稿
   * @param {string} taskKey - 任务Key
   * @param {Object} options - 额外选项
   */
  generateSkillDraft(taskKey, options = {}) {
    const tracking = this.progress.skills_evolution.task_tracking[taskKey];
    if (!tracking) {
      return { error: `Task ${taskKey} not found` };
    }

    const skillName = options.skillName || `${tracking.subtype}-${tracking.type}-skill`;
    const draftPath = path.join(SKILL_DRAFTS_DIR, `${skillName}.md`);

    const draftContent = this._buildSkillDraft(tracking, skillName);

    // 写入草稿文件
    fs.writeFileSync(draftPath, draftContent, 'utf8');

    // 标记草稿已创建
    tracking.skill_draft_created = true;
    this._saveProgress();

    return {
      success: true,
      skillName,
      draftPath,
      stats: tracking.stats
    };
  }

  /**
   * 构建Skill草稿内容
   */
  _buildSkillDraft(tracking, skillName) {
    const examples = tracking.examples.map(e => `- ${e.description}`).join('\n');
    
    return `# Skill: ${skillName}

**创建时间：** ${new Date().toISOString().split('T')[0]}
**触发条件：** ${tracking.type}:${tracking.subtype} 成功率 ${(tracking.success_rate * 100).toFixed(1)}%
**状态：** 草稿（待用户确认）

## 基本信息

| 属性 | 值 |
|------|-----|
| 任务类型 | ${tracking.type} |
| 子类型 | ${tracking.subtype} |
| 累计执行 | ${tracking.total}次 |
| 成功率 | ${(tracking.success_rate * 100).toFixed(1)}% |
| 平均置信度 | ${(tracking.avg_confidence * 100).toFixed(1)}% |

## 核心能力

- 能力1
- 能力2
- 能力3

## 推荐工作流

1. 步骤1
2. 步骤2
3. 步骤3

## 成功案例

${examples || '暂无'}

## 注意事项

- 注意点1
- 注意点2

## 使用示例

\`\`\`
任务：${tracking.subtype}相关任务
要求：${tracking.type}标准流程
\`\`\`
`;
  }

  /**
   * 获取任务追踪状态
   */
  getStatus() {
    const task_tracking = this.progress.skills_evolution.task_tracking;
    const skill_tracking = this.progress.skills_evolution.skill_tracking;
    
    const totalTasks = Object.keys(task_tracking).length;
    const totalSkills = Object.keys(skill_tracking).length;
    const readyToSkill = this.getTasksReadyForSkill().length;

    return {
      total_tracked_tasks: totalTasks,
      total_skills: totalSkills,
      tasks_ready_for_skill: readyToSkill,
      details: task_tracking
    };
  }

  /**
   * 重置追踪数据（测试用）
   */
  reset() {
    this.progress.skills_evolution = {
      task_tracking: {},
      skill_tracking: {}
    };
    this._saveProgress();
    return { success: true };
  }
}

// 导出单例
const tracker = new SkillsEvolutionTracker();

module.exports = tracker;
