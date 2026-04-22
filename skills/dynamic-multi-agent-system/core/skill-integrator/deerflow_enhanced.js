/**
 * DeerFlow增强版技能集成器
 * 
 * 借鉴DeerFlow的设计：
 * 1. 多技能协调
 * 2. 技能组合
 * 3. 依赖解析
 * 4. 冲突检测
 */

const { EventEmitter } = require('events');

// ============== 技能集成项 ==============
class SkillIntegrationItem {
  constructor(skill, config = {}) {
    this.skill = skill;
    this.name = skill.name || skill.metadata?.name;
    this.dependencies = config.dependencies || [];
    this.executionOrder = config.executionOrder || 0;
    this.sharedContext = config.sharedContext || {};
  }
}

// ============== SkillIntegrator 主类 ==============
class SkillIntegrator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.integrations = new Map();
    this.skillRegistry = new Map();
  }

  /**
   * 注册技能
   */
  registerSkill(skill) {
    const name = skill.name || skill.metadata?.name;
    if (!name) {
      throw new Error('Skill must have a name');
    }
    this.skillRegistry.set(name, skill);
    return this;
  }

  /**
   * 批量注册技能
   */
  registerSkills(skills) {
    for (const skill of skills) {
      this.registerSkill(skill);
    }
    return this;
  }

  /**
   * 创建技能集成
   */
  createIntegration(name, skillNames, options = {}) {
    const items = [];
    
    for (const skillName of skillNames) {
      const skill = this.skillRegistry.get(skillName);
      if (!skill) {
        throw new Error(`Skill not found: ${skillName}`);
      }
      
      const dependencies = this._findDependencies(skill, options.dependencies || []);
      items.push(new SkillIntegrationItem(skill, {
        dependencies,
        executionOrder: options.executionOrder?.[skillName] || 0
      }));
    }

    // 检查冲突
    this._checkConflicts(items);

    // 排序
    items.sort((a, b) => a.executionOrder - b.executionOrder);

    this.integrations.set(name, {
      name,
      items,
      options,
      createdAt: Date.now()
    });

    return this.integrations.get(name);
  }

  /**
   * 执行集成
   */
  async executeIntegration(name, initialContext = {}) {
    const integration = this.integrations.get(name);
    if (!integration) {
      throw new Error(`Integration not found: ${name}`);
    }

    const context = { ...initialContext };
    const results = [];
    const errors = [];

    for (const item of integration.items) {
      try {
        // 检查依赖是否满足
        for (const dep of item.dependencies) {
          if (!context[dep]) {
            throw new Error(`Dependency not met: ${dep}`);
          }
        }

        // 执行技能
        const result = await this._executeSkill(item.skill, context, item.sharedContext);
        context[item.name] = result;
        results.push({ skill: item.name, result });

        this.emit('skill_executed', { skill: item.name, result });

      } catch (error) {
        errors.push({ skill: item.name, error: error.message });
        this.emit('skill_failed', { skill: item.name, error: error.message });

        if (!integration.options.continueOnError) {
          throw error;
        }
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      context
    };
  }

  /**
   * 查找依赖
   */
  _findDependencies(skill, providedDeps) {
    const deps = [];
    
    // 从技能定义中提取依赖
    if (skill.dependencies) {
      deps.push(...skill.dependencies);
    }
    
    // 添加提供的依赖
    for (const dep of providedDeps) {
      if (!deps.includes(dep)) {
        deps.push(dep);
      }
    }
    
    return deps;
  }

  /**
   * 检查冲突
   */
  _checkConflicts(items) {
    const conflicts = [];
    const usedSkills = new Set();

    for (const item of items) {
      if (usedSkills.has(item.name)) {
        conflicts.push(`Duplicate skill: ${item.name}`);
      }
      usedSkills.add(item.name);
    }

    // 检查循环依赖
    for (const item of items) {
      for (const dep of item.dependencies) {
        const depItem = items.find(i => i.name === dep);
        if (depItem && depItem.dependencies.includes(item.name)) {
          conflicts.push(`Circular dependency: ${item.name} <-> ${dep}`);
        }
      }
    }

    if (conflicts.length > 0) {
      this.emit('conflicts_detected', { conflicts });
      throw new Error(`Conflicts detected: ${conflicts.join(', ')}`);
    }
  }

  /**
   * 执行单个技能
   */
  async _executeSkill(skill, context, sharedContext) {
    if (typeof skill === 'function') {
      return await skill(context, sharedContext);
    }
    
    if (typeof skill.execute === 'function') {
      return await skill.execute(context, sharedContext);
    }
    
    if (typeof skill.run === 'function') {
      return await skill.run(context, sharedContext);
    }

    return skill; // 直接返回
  }

  /**
   * 获取集成状态
   */
  getIntegration(name) {
    return this.integrations.get(name) || null;
  }

  /**
   * 删除集成
   */
  deleteIntegration(name) {
    return this.integrations.delete(name);
  }

  /**
   * 列出所有集成
   */
  listIntegrations() {
    return Array.from(this.integrations.values()).map(i => ({
      name: i.name,
      skillCount: i.items.length,
      createdAt: i.createdAt
    }));
  }
}

// ============== 导出 ==============
module.exports = {
  SkillIntegrator,
  SkillIntegrationItem
};
