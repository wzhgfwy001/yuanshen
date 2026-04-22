/**
 * DeerFlow增强版自动技能创建器
 * 
 * 借鉴DeerFlow的设计：
 * 1. 从任务学习创建技能
 * 2. 技能模板生成
 * 3. 技能优化建议
 * 4. 版本管理
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

// ============== 技能模板类 ==============
class SkillTemplate {
  constructor(config) {
    this.name = config.name;
    this.description = config.description || '';
    this.version = config.version || '1.0.0';
    this.author = config.author || 'auto-generated';
    this.tags = config.tags || [];
    this.triggers = config.triggers || [];
    this.capabilities = config.capabilities || [];
    this.examples = config.examples || [];
    this.metadata = config.metadata || {};
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
  }

  toSKILLContent() {
    const frontmatter = [
      '---',
      `name: ${this.name}`,
      `description: ${this.description}`,
      `version: ${this.version}`,
      `author: ${this.author}`,
      `tags:`,
      ...this.tags.map(t => `  - ${t}`),
      `triggers:`,
      ...this.triggers.map(t => `  - ${t}`),
      '---'
    ].join('\n');

    const body = [
      `# ${this.name}`,
      '',
      `## 描述`,
      this.description,
      '',
      `## 功能`,
      ...this.capabilities.map(c => `- ${c}`),
      '',
      `## 示例`,
      ...this.examples.map((e, i) => `### 示例 ${i + 1}`,
      e.code ? `\`\`\`${e.language || 'javascript'}\n${e.code}\n\`\`\`` : e.description,
      ''
    ].join('\n');

    return frontmatter + '\n\n' + body;
  }
}

// ============== AutoSkillCreator 主类 ==============
class AutoSkillCreator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      outputDir: config.outputDir || './skills',
      templateDir: config.templateDir || './templates',
      ...config
    };
    
    this.generatedSkills = [];
    this.taskPatterns = new Map();
    this.skillTemplates = new Map();
  }

  /**
   * 从任务历史学习创建技能
   */
  async learnFromTasks(tasks, options = {}) {
    const {
      minFrequency = 3,
      extractPatterns = true,
      generateExamples = true
    } = options;

    this.emit('learning_started', { taskCount: tasks.length });

    // 分析任务模式
    const patterns = this._analyzePatterns(tasks);
    
    // 筛选高频模式
    const significantPatterns = patterns.filter(p => p.frequency >= minFrequency);
    
    this.emit('patterns_found', { count: significantPatterns.length });

    // 为每个模式创建技能
    for (const pattern of significantPatterns) {
      const skill = await this._createSkillFromPattern(pattern, {
        extractPatterns,
        generateExamples
      });
      
      if (skill) {
        this.skillTemplates.set(skill.name, skill);
        this.emit('skill_created', { name: skill.name });
      }
    }

    this.emit('learning_completed', { 
      skillsCreated: this.skillTemplates.size 
    });

    return Array.from(this.skillTemplates.values());
  }

  /**
   * 分析任务模式
   */
  _analyzePatterns(tasks) {
    const patterns = new Map();

    for (const task of tasks) {
      const keywords = this._extractKeywords(task);
      
      for (const keyword of keywords) {
        if (!patterns.has(keyword)) {
          patterns.set(keyword, {
            keyword,
            count: 0,
            examples: [],
            tasks: []
          });
        }
        
        const pattern = patterns.get(keyword);
        pattern.count++;
        
        if (pattern.examples.length < 5) {
          pattern.examples.push(task);
        }
        pattern.tasks.push(task.id || task);
      }
    }

    return Array.from(patterns.values())
      .map(p => ({
        keyword: p.keyword,
        frequency: p.count,
        examples: p.examples,
        tasks: p.tasks
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * 提取关键词
   */
  _extractKeywords(task) {
    const text = typeof task === 'string' ? task : task.description || task.prompt || '';
    const words = text.toLowerCase().split(/\s+/);
    
    // 过滤停用词
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      '我', '你', '他', '她', '它', '的', '了', '在', '是', '和', '与', '或'
    ]);
    
    return words.filter(w => w.length > 3 && !stopWords.has(w));
  }

  /**
   * 从模式创建技能
   */
  async _createSkillFromPattern(pattern, options = {}) {
    const { extractPatterns, generateExamples } = options;
    
    const skill = new SkillTemplate({
      name: `auto-${pattern.keyword}-skill`,
      description: `Auto-generated skill for ${pattern.keyword} tasks`,
      tags: [pattern.keyword, 'auto-generated'],
      triggers: [pattern.keyword],
      capabilities: [
        `Handle ${pattern.keyword} related tasks`,
        `Process ${pattern.keyword} requests`
      ],
      examples: generateExamples ? await this._generateExamples(pattern) : []
    });

    return skill;
  }

  /**
   * 生成示例
   */
  async _generateExamples(pattern) {
    return pattern.examples.slice(0, 3).map(task => ({
      description: typeof task === 'string' ? task : task.description || 'Example',
      code: task.code || null,
      language: 'javascript'
    }));
  }

  /**
   * 创建技能文件
   */
  async saveSkill(skill, outputPath = null) {
    const filePath = outputPath || path.join(
      this.config.outputDir,
      skill.name,
      'SKILL.md'
    );

    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 写入文件
    fs.writeFileSync(filePath, skill.toSKILLContent(), 'utf8');
    
    this.generatedSkills.push({ skill, filePath });
    
    this.emit('skill_saved', { name: skill.name, path: filePath });
    
    return filePath;
  }

  /**
   * 保存所有技能
   */
  async saveAllSkills() {
    const results = [];
    
    for (const skill of this.skillTemplates.values()) {
      const result = await this.saveSkill(skill);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 优化技能
   */
  async optimizeSkill(skillName, feedback) {
    const skill = this.skillTemplates.get(skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    // 根据反馈优化
    if (feedback.successRate < 0.5) {
      // 成功率低，建议删除
      skill.metadata.qualityScore = 'low';
      skill.metadata.suggestion = 'Consider removing or redesigning';
    } else if (feedback.successRate < 0.8) {
      // 成功率中等，建议改进
      skill.metadata.qualityScore = 'medium';
      skill.metadata.suggestion = 'Add more examples or refine capabilities';
    } else {
      skill.metadata.qualityScore = 'high';
    }

    skill.updatedAt = Date.now();
    this.emit('skill_optimized', { name: skillName, feedback });

    return skill;
  }

  /**
   * 获取技能状态
   */
  getStatus() {
    return {
      totalSkills: this.skillTemplates.size,
      generatedFiles: this.generatedSkills.length,
      patterns: this.taskPatterns.size
    };
  }
}

// ============== 导出 ==============
module.exports = {
  AutoSkillCreator,
  SkillTemplate
};
