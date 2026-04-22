/**
 * 阳神系统 - OpenClaw技能集成器 v2.0
 * 基于DeerFlow架构优化：
 * 1. 异步化
 * 2. 中间件管道
 * 3. 缓存
 * 4. 事件系统
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// ==================== DeerFlow借鉴: 结构化状态 ====================

class SkillInfo {
  constructor(name, skill) {
    this.name = name;
    this.displayName = skill.name;
    this.path = skill.path;
    this.triggerKeywords = skill.triggerKeywords;
    this.triggerCount = skill.triggerKeywords.length;
  }

  toJSON() {
    return {
      name: this.name,
      displayName: this.displayName,
      triggerCount: this.triggerCount
    };
  }
}

class DetectionResult {
  constructor(skillName, keyword, matchType) {
    this.skillName = skillName;
    this.keyword = keyword;
    this.matchType = matchType;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      skillName: this.skillName,
      keyword: this.keyword,
      matchType: this.matchType,
      timestamp: this.timestamp
    };
  }
}

// ==================== DeerFlow借鉴: 事件系统 ====================

class SkillEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return this;
  }

  off(event, listener) {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => {
      try {
        listener(data);
      } catch (e) {
        console.error(`[SkillEmitter] ${event} error:`, e.message);
      }
    });
  }
}

const emitter = new SkillEmitter();

const EVENTS = {
  SKILL_TRIGGERED: 'skill_triggered',
  SKILL_LOADED: 'skill_loaded',
  SKILL_NOT_FOUND: 'skill_not_found'
};

emitter.on(EVENTS.SKILL_TRIGGERED, (result) => {
  console.log(`[Skill-Integrator] 🚀 触发技能: ${result.skillName} (匹配: ${result.keyword})`);
});

emitter.on(EVENTS.SKILL_LOADED, (skillName, size) => {
  console.log(`[Skill-Integrator] ✅ 加载技能: ${skillName}, ${size}字符`);
});

// ==================== DeerFlow借鉴: 中间件管道 ====================

class DetectionMiddleware {
  beforeDetect(input, context) { return { input, context }; }
  afterDetect(result, context) { return result; }
}

class DetectionPipeline {
  constructor() {
    this.middlewares = [];
  }

  use(mw) {
    this.middlewares.push(mw);
    return this;
  }

  execute(input, context, detectFn) {
    let ctx = { input, context, errors: [] };

    for (const mw of this.middlewares) {
      try {
        const result = mw.beforeDetect(ctx.input, ctx.context);
        ctx.input = result.input;
        ctx.context = result.context;
      } catch (e) {
        ctx.errors.push(e.message);
      }
    }

    let result;
    try {
      result = detectFn(ctx.input, ctx.context);
    } catch (e) {
      ctx.errors.push(e.message);
      result = null;
    }

    for (const mw of this.middlewares) {
      try {
        result = mw.afterDetect(result, ctx.context) || result;
      } catch (e) {
        ctx.errors.push(e.message);
      }
    }

    return result;
  }
}

class NormalizationMiddleware extends DetectionMiddleware {
  beforeDetect(input, context) {
    return {
      input: input.replace(/\s+/g, ' ').trim().toLowerCase(),
      context
    };
  }
}

class LoggingMiddleware extends DetectionMiddleware {
  beforeDetect(input, context) {
    console.log(`[Skill-Integrator] 检测输入: "${input.slice(0, 50)}..."`);
    return { input, context };
  }
}

// ==================== 缓存 ====================

class SkillCache {
  constructor(ttlSeconds = 300) {
    this._contentCache = new Map();
    this._detectionCache = new Map();
    this.ttl = ttlSeconds * 1000;
  }

  getContent(skillPath) {
    const entry = this._contentCache.get(skillPath);
    if (entry && Date.now() - entry.timestamp < this.ttl) {
      return entry.content;
    }
    return null;
  }

  setContent(skillPath, content) {
    this._contentCache.set(skillPath, {
      content,
      timestamp: Date.now()
    });

    if (this._contentCache.size > 50) {
      const oldest = [...this._contentCache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this._contentCache.delete(oldest[0]);
    }
  }

  getDetection(input) {
    const entry = this._detectionCache.get(input);
    if (entry && Date.now() - entry.timestamp < this.ttl) {
      return entry.result;
    }
    return null;
  }

  setDetection(input, result) {
    this._detectionCache.set(input, {
      result,
      timestamp: Date.now()
    });

    if (this._detectionCache.size > 100) {
      const oldest = [...this._detectionCache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this._detectionCache.delete(oldest[0]);
    }
  }

  clear() {
    this._contentCache.clear();
    this._detectionCache.clear();
  }
}

// ==================== 配置 ====================

const OPENCLAW_SKILLS_PATH = 'C:/Users/DELL/AppData/Roaming/npm/node_modules/openclaw/skills';

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

// ==================== 技能集成器 ====================

class SkillIntegrator {
  constructor(options = {}) {
    this.pipeline = new DetectionPipeline();
    this.pipeline.use(new NormalizationMiddleware());
    this.pipeline.use(new LoggingMiddleware());

    this.cache = options.cache !== false ? new SkillCache() : null;
  }

  /**
   * 检测技能触发（带缓存和管道）
   */
  detectSkillTrigger(userInput) {
    // 缓存检查
    if (this.cache) {
      const cached = this.cache.getDetection(userInput);
      if (cached) return cached;
    }

    // 使用管道执行检测
    const result = this.pipeline.execute(
      userInput,
      {},
      (input) => this._doDetect(input)
    );

    // 缓存结果
    if (this.cache && result) {
      this.cache.setDetection(userInput, result);
    }

    // 触发事件
    if (result) {
      emitter.emit(EVENTS.SKILL_TRIGGERED, result);
    }

    return result ? result.skillName : null;
  }

  _doDetect(input) {
    const inputWords = input.split(/[\s,，、。！？]+/);

    for (const [skillName, skill] of Object.entries(SKILL_REGISTRY)) {
      for (const keyword of skill.triggerKeywords) {
        const kwLower = keyword.toLowerCase();

        if (input.includes(kwLower)) {
          const result = new DetectionResult(skillName, keyword, 'exact');
          return result;
        }

        for (const word of inputWords) {
          if (word.length >= 2 && (word.includes(kwLower) || kwLower.includes(word))) {
            const result = new DetectionResult(skillName, keyword, 'partial');
            return result;
          }
        }
      }
    }

    return null;
  }

  /**
   * 加载技能内容（异步+缓存）
   */
  async loadSkillContent(skillName) {
    const skill = SKILL_REGISTRY[skillName];
    if (!skill) {
      emitter.emit(EVENTS.SKILL_NOT_FOUND, skillName);
      return null;
    }

    const skillPath = path.join(OPENCLAW_SKILLS_PATH, skill.path, 'SKILL.md');

    // 缓存检查
    if (this.cache) {
      const cached = this.cache.getContent(skillPath);
      if (cached) return cached;
    }

    try {
      if (fsSync.existsSync(skillPath)) {
        const content = await fs.readFile(skillPath, 'utf8');

        // 缓存内容
        if (this.cache) {
          this.cache.setContent(skillPath, content);
        }

        emitter.emit(EVENTS.SKILL_LOADED, skillName, content.length);
        return content;
      } else {
        emitter.emit(EVENTS.SKILL_NOT_FOUND, skillName);
        return null;
      }
    } catch (e) {
      console.error(`[Skill-Integrator] 读取技能失败: ${skillName}`, e.message);
      return null;
    }
  }

  /**
   * 获取技能信息
   */
  getSkillInfo(skillName) {
    const skill = SKILL_REGISTRY[skillName];
    if (!skill) return null;

    return {
      name: skill.name,
      displayName: skill.name,
      triggerKeywords: skill.triggerKeywords,
      path: path.join(OPENCLAW_SKILLS_PATH, skill.path),
      fullPath: path.join(OPENCLAW_SKILLS_PATH, skill.path, 'SKILL.md')
    };
  }

  /**
   * 列出所有可用技能
   */
  listSkills() {
    return Object.entries(SKILL_REGISTRY).map(([name, skill]) => new SkillInfo(name, skill).toJSON());
  }

  /**
   * 检查技能是否可用
   */
  async isSkillAvailable(skillName) {
    const skill = SKILL_REGISTRY[skillName];
    if (!skill) return false;

    const skillPath = path.join(OPENCLAW_SKILLS_PATH, skill.path, 'SKILL.md');

    try {
      await fs.access(skillPath);
      return true;
    } catch {
      return false;
    }
  }
}

// 默认实例
const defaultIntegrator = new SkillIntegrator();

// 导出
module.exports = {
  detectSkillTrigger: (input) => defaultIntegrator.detectSkillTrigger(input),
  loadSkillContent: (skillName) => defaultIntegrator.loadSkillContent(skillName),
  getSkillInfo: (skillName) => defaultIntegrator.getSkillInfo(skillName),
  listSkills: () => defaultIntegrator.listSkills(),
  isSkillAvailable: (skillName) => defaultIntegrator.isSkillAvailable(skillName),
  SkillIntegrator,
  SkillCache,
  DetectionPipeline,
  emitter,
  EVENTS,
  SKILL_REGISTRY
};
