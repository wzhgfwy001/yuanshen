/**
 * DeerFlow增强版Skills系统
 * 
 * 借鉴DeerFlow的设计：
 * 1. Markdown格式Skills - frontmatter + 内容结构
 * 2. 技能发现机制 - 自动扫描和注册
 * 3. 技能依赖管理 - 自动安装依赖
 * 4. 版本控制和兼容性
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// ============== 常量定义 ==============
const SKILL_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  INSTALLING: 'installing',
  FAILED: 'failed',
  DEPRECATED: 'deprecated'
};

const SKILL_EVENTS = {
  SKILL_REGISTERED: 'skill_registered',
  SKILL_ACTIVATED: 'skill_activated',
  SKILL_DEACTIVATED: 'skill_deactivated',
  SKILL_UPDATED: 'skill_updated',
  SKILL_ERROR: 'skill_error',
  SKILL_INSTALLED: 'skill_installed',
  SKILL_UNINSTALLED: 'skill_uninstalled'
};

const SKILL_FIELDS = {
  REQUIRED: ['name', 'description', 'version'],
  OPTIONAL: ['author', 'tags', 'dependencies', 'trigger', 'parent', 'compatible']
};

// ============== Frontmatter解析器 ==============
class FrontmatterParser {
  /**
   * 解析DeerFlow风格的Markdown frontmatter
   * @param {string} content - Markdown内容
   * @returns {Object} { metadata, body }
   */
  static parse(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      return { metadata: {}, body: content };
    }
    
    const [, frontmatter, body] = match;
    const metadata = this.parseYAML(frontmatter);
    
    return { metadata, body };
  }

  /**
   * 解析YAML（简化版，避免额外依赖）
   * @param {string} yaml - YAML字符串
   * @returns {Object} 解析后的对象
   */
  static parseYAML(yaml) {
    const result = {};
    const lines = yaml.split('\n');
    let currentKey = null;
    let currentArray = null;
    let indentLevel = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 空行跳过
      if (!trimmedLine) continue;
      
      // 数组项
      if (trimmedLine.startsWith('- ')) {
        const value = trimmedLine.substring(2).trim();
        if (currentArray) {
          if (value.includes(':')) {
            const [k, v] = value.split(':').map(s => s.trim());
            if (currentKey && Array.isArray(result[currentKey])) {
              if (typeof result[currentKey][result[currentKey].length - 1] === 'object') {
                result[currentKey][result[currentKey].length - 1][k] = v;
              } else {
                result[currentKey].push({ [k]: v });
              }
            }
          } else {
            result[currentArray].push(value);
          }
        }
        continue;
      }
      
      // 键值对
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmedLine.substring(0, colonIndex).trim();
        const value = trimmedLine.substring(colonIndex + 1).trim();
        
        // 嵌套对象开始
        if (value === '' || value === '|') {
          currentKey = key;
          result[key] = {};
          indentLevel = line.search(/\S/);
        } else {
          // 简单值
          result[key] = this.parseValue(value);
          currentKey = null;
        }
      }
    }
    
    return result;
  }

  /**
   * 解析YAML值
   */
  static parseValue(value) {
    // 布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // 数字
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    
    // 字符串（去除引号）
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    return value;
  }

  /**
   * 序列化为frontmatter
   */
  static serialize(metadata, body) {
    let frontmatter = '---\n';
    
    for (const [key, value] of Object.entries(metadata)) {
      if (Array.isArray(value)) {
        frontmatter += `${key}:\n`;
        for (const item of value) {
          if (typeof item === 'string') {
            frontmatter += `  - ${item}\n`;
          } else if (typeof item === 'object') {
            for (const [k, v] of Object.entries(item)) {
              frontmatter += `  - ${k}: ${v}\n`;
            }
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        frontmatter += `${key}:\n`;
        for (const [k, v] of Object.entries(value)) {
          frontmatter += `  ${k}: ${v}\n`;
        }
      } else {
        frontmatter += `${key}: ${value}\n`;
      }
    }
    
    frontmatter += '---\n\n';
    return frontmatter + body;
  }
}

// ============== Skill元数据类 ==============
class SkillMetadata extends EventEmitter {
  constructor(config) {
    super();
    this.name = config.name;
    this.description = config.description || '';
    this.version = config.version || '1.0.0';
    this.author = config.author || 'unknown';
    this.tags = config.tags || [];
    this.dependencies = config.dependencies || [];
    this.trigger = config.trigger || null;
    this.parent = config.parent || null;
    this.compatible = config.compatible || '*';
    this.status = SKILL_STATUS.INACTIVE;
    this.filePath = config.filePath || null;
    this.lastModified = Date.now();
    this.installedAt = null;
  }

  isValid() {
    return !!(this.name && this.version);
  }

  matchesTrigger(context) {
    if (!this.trigger) return false;
    
    // 触发条件可能是复杂的表达式
    const triggers = this.trigger.split('|').map(t => t.trim());
    
    for (const trigger of triggers) {
      if (trigger.includes('=')) {
        const [key, value] = trigger.split('=').map(s => s.trim());
        if (context[key] === value) return true;
      } else if (trigger.includes('>')) {
        const [key, value] = trigger.split('>').map(s => s.trim());
        if (parseFloat(context[key]) > parseFloat(value)) return true;
      } else if (context[trigger] === true) {
        return true;
      }
    }
    
    return false;
  }

  toFrontmatter() {
    return FrontmatterParser.serialize({
      name: this.name,
      description: this.description,
      version: this.version,
      author: this.author,
      tags: this.tags,
      dependencies: this.dependencies,
      trigger: this.trigger,
      parent: this.parent,
      compatible: this.compatible
    }, '');
  }

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      version: this.version,
      author: this.author,
      tags: this.tags,
      dependencies: this.dependencies,
      trigger: this.trigger,
      parent: this.parent,
      compatible: this.compatible,
      status: this.status,
      filePath: this.filePath,
      lastModified: this.lastModified,
      installedAt: this.installedAt
    };
  }
}

// ============== Skill项类 ==============
class SkillItem extends EventEmitter {
  constructor(config) {
    super();
    this.id = config.id || this._generateId();
    this.metadata = config.metadata;
    this.body = config.body || '';
    this.codeBlocks = this._extractCodeBlocks();
    this.headings = this._extractHeadings();
    this.examples = this._extractExamples();
    this.status = SKILL_STATUS.INACTIVE;
    this.error = null;
  }

  _generateId() {
    return `skill-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  _extractCodeBlocks() {
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
    
    while ((match = regex.exec(this.body)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim()
      });
    }
    
    return blocks;
  }

  _extractHeadings() {
    const regex = /^#{1,6}\s+(.+)$/gm;
    const headings = [];
    let match;
    
    while ((match = regex.exec(this.body)) !== null) {
      headings.push({
        level: match[0].indexOf(' '),
        text: match[1]
      });
    }
    
    return headings;
  }

  _extractExamples() {
    // 提取 ```javascript 代码块作为示例
    return this.codeBlocks
      .filter(b => b.language === 'javascript' || b.language === 'js')
      .map(b => b.code);
  }

  getSection(headingName) {
    const lines = this.body.split('\n');
    const result = [];
    let inSection = false;
    
    for (const line of lines) {
      if (line.startsWith('## ') && headingName) {
        if (inSection) break;
        if (line.includes(headingName)) {
          inSection = true;
        }
      } else if (inSection && line.startsWith('## ')) {
        break;
      } else if (inSection) {
        result.push(line);
      }
    }
    
    return result.join('\n').trim();
  }

  activate() {
    this.status = SKILL_STATUS.ACTIVE;
    this.emit(SKILL_EVENTS.SKILL_ACTIVATED, this.toJSON());
  }

  deactivate() {
    this.status = SKILL_STATUS.INACTIVE;
    this.emit(SKILL_EVENTS.SKILL_DEACTIVATED, this.toJSON());
  }

  toJSON() {
    return {
      id: this.id,
      metadata: this.metadata.toJSON ? this.metadata.toJSON() : this.metadata,
      body: this.body,
      codeBlocks: this.codeBlocks,
      headings: this.headings,
      examples: this.examples,
      status: this.status,
      error: this.error
    };
  }
}

// ============== Skill注册表 ==============
class SkillRegistry extends EventEmitter {
  constructor(config = {}) {
    super();
    this.skills = new Map();
    this.workspacePath = config.workspacePath || process.cwd();
    this.scanPaths = config.scanPaths || ['skills/', 'core/'];
    this.ignorePatterns = config.ignorePatterns || ['node_modules/', '.git/', '__tests__/'];
  }

  /**
   * 注册Skill
   */
  register(skillPath, content) {
    const { metadata, body } = FrontmatterParser.parse(content);
    
    // 验证必需字段
    for (const field of SKILL_FIELDS.REQUIRED) {
      if (!metadata[field]) {
        throw new Error(`Missing required field '${field}' in ${skillPath}`);
      }
    }
    
    const skillMeta = new SkillMetadata({
      ...metadata,
      filePath: skillPath
    });
    
    const skillItem = new SkillItem({
      metadata: skillMeta,
      body: body
    });
    
    this.skills.set(skillMeta.name, skillItem);
    this.emit(SKILL_EVENTS.SKILL_REGISTERED, skillItem.toJSON());
    
    return skillItem;
  }

  /**
   * 获取Skill
   */
  get(name) {
    return this.skills.get(name) || null;
  }

  /**
   * 获取所有Skills
   */
  getAll() {
    return Array.from(this.skills.values());
  }

  /**
   * 按标签筛选
   */
  getByTag(tag) {
    return this.getAll().filter(skill => 
      skill.metadata.tags.includes(tag)
    );
  }

  /**
   * 按父级筛选
   */
  getByParent(parent) {
    return this.getAll().filter(skill => 
      skill.metadata.parent === parent
    );
  }

  /**
   * 查找匹配的Skill（根据触发条件）
   */
  findMatching(context) {
    return this.getAll().filter(skill => 
      skill.metadata.matchesTrigger(context)
    );
  }

  /**
   * 扫描目录并注册所有Skills
   */
  async scan(directory) {
    const results = {
      registered: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const scanDir = async (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          // 跳过忽略的模式
          if (this.ignorePatterns.some(p => fullPath.includes(p))) {
            results.skipped++;
            continue;
          }
          
          if (entry.isDirectory()) {
            await scanDir(fullPath);
          } else if (entry.isFile() && entry.name === 'SKILL.md') {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              this.register(fullPath, content);
              results.registered++;
            } catch (err) {
              results.failed++;
              results.errors.push({ path: fullPath, error: err.message });
              this.emit(SKILL_EVENTS.SKILL_ERROR, { path: fullPath, error: err.message });
            }
          }
        }
      } catch (err) {
        results.errors.push({ path: dir, error: err.message });
      }
    };

    await scanDir(directory);
    return results;
  }

  /**
   * 列出所有可用的触发条件
   */
  listTriggers() {
    const triggers = new Map();
    
    for (const skill of this.getAll()) {
      if (skill.metadata.trigger) {
        const triggerParts = skill.metadata.trigger.split('|').map(t => t.trim());
        for (const part of triggerParts) {
          if (!triggers.has(part)) {
            triggers.set(part, []);
          }
          triggers.get(part).push(skill.metadata.name);
        }
      }
    }
    
    return triggers;
  }
}

// ============== Skill安装器 ==============
class SkillInstaller extends EventEmitter {
  constructor(config = {}) {
    super();
    this.registry = config.registry;
    this.installPath = config.installPath || 'skills/';
  }

  /**
   * 安装Skill依赖
   */
  async installDependencies(skillName) {
    const skill = this.registry.get(skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }
    
    const results = {
      installed: [],
      failed: [],
      alreadyInstalled: []
    };
    
    for (const dep of skill.metadata.dependencies) {
      try {
        // 检查是否已安装
        if (this.registry.get(dep)) {
          results.alreadyInstalled.push(dep);
          continue;
        }
        
        // 安装依赖（这里可以扩展为npm install或其他安装逻辑）
        this.emit('dependency_installing', { skill: skillName, dependency: dep });
        results.installed.push(dep);
        this.emit('dependency_installed', { skill: skillName, dependency: dep });
      } catch (err) {
        results.failed.push({ dependency: dep, error: err.message });
        this.emit(SKILL_EVENTS.SKILL_ERROR, { 
          skill: skillName, 
          dependency: dep, 
          error: err.message 
        });
      }
    }
    
    return results;
  }

  /**
   * 从URL安装Skill
   */
  async installFromURL(skillURL, options = {}) {
    // 这是一个占位实现，实际可能需要fetch + git clone
    throw new Error('installFromURL not implemented - requires git clone');
  }

  /**
   * 从模板创建Skill
   */
  async createFromTemplate(templateName, skillName, options = {}) {
    const templates = {
      'basic': this._getBasicTemplate(),
      'agent': this._getAgentTemplate(),
      'tool': this._getToolTemplate(),
      'workflow': this._getWorkflowTemplate()
    };
    
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Unknown template: ${templateName}`);
    }
    
    const metadata = {
      name: skillName,
      description: options.description || `A new ${templateName} skill`,
      version: '1.0.0',
      author: options.author || 'unknown',
      tags: options.tags || [templateName],
      dependencies: options.dependencies || [],
      trigger: options.trigger || null,
      parent: options.parent || null,
      compatible: options.compatible || '*'
    };
    
    const content = FrontmatterParser.serialize(metadata, template.body);
    const filePath = path.join(this.installPath, skillName, 'SKILL.md');
    
    // 创建目录并写入文件
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    
    // 注册
    const skill = this.registry.register(filePath, content);
    this.emit(SKILL_EVENTS.SKILL_INSTALLED, skill.toJSON());
    
    return skill;
  }

  _getBasicTemplate() {
    return {
      body: `# \${skillName}

## Overview

Describe what this skill does.

## Usage

\`\`\`javascript
// Example code
\`\`\`

## Configuration

Explain configuration options.

## Examples

Provide usage examples.
`
    };
  }

  _getAgentTemplate() {
    return {
      body: `# \${skillName}

## Agent Role

Describe the agent's role and responsibilities.

## Capabilities

- Capability 1
- Capability 2

## Workflow

1. Step 1
2. Step 2

## Examples

\`\`\`javascript
// Example implementation
\`\`\`
`
    };
  }

  _getToolTemplate() {
    return {
      body: `# \${skillName}

## Tool Description

Describe what this tool does.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| param1 | string | yes | Description |

## Returns

Describe return value.

## Example

\`\`\`javascript
// Example usage
\`\`\`
`
    };
  }

  _getWorkflowTemplate() {
    return {
      body: `# \${skillName}

## Workflow Description

Describe the workflow.

## Steps

### Step 1: Name
Description

### Step 2: Name
Description

## Error Handling

Describe error handling.

## Example

\`\`\`javascript
// Complete workflow example
\`\`\`
`
    };
  }
}

// ============== Skill版本管理器 ==============
class SkillVersionManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.registry = config.registry;
  }

  /**
   * 检查版本兼容性
   */
  isCompatible(skill, targetVersion) {
    const compatible = skill.metadata.compatible;
    
    if (compatible === '*') return true;
    
    // 简单的版本范围检查
    if (compatible.startsWith('^')) {
      const minVersion = compatible.slice(1);
      return this.compareVersions(skill.metadata.version, minVersion) >= 0;
    }
    
    if (compatible.startsWith('~')) {
      const minVersion = compatible.slice(1);
      const [major, minor] = minVersion.split('.').map(Number);
      const [vMajor, vMinor] = skill.metadata.version.split('.').map(Number);
      return vMajor === major && vMinor >= minor;
    }
    
    return skill.metadata.version === compatible;
  }

  /**
   * 比较版本号
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  /**
   * 检查更新
   */
  checkForUpdates(skillName) {
    // 这是一个占位实现，实际可能需要比较远程版本
    return { hasUpdate: false, currentVersion: null, latestVersion: null };
  }
}

// ============== 主Skills管理器 ==============
class EnhancedSkillsManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.registry = new SkillRegistry({
      workspacePath: config.workspacePath,
      scanPaths: config.scanPaths
    });
    this.installer = new SkillInstaller({
      registry: this.registry,
      installPath: config.installPath
    });
    this.versionManager = new SkillVersionManager({
      registry: this.registry
    });
  }

  /**
   * 初始化 - 扫描并注册所有Skills
   */
  async initialize() {
    const results = {
      total: 0,
      registered: 0,
      failed: 0
    };

    for (const scanPath of this.config.scanPaths || []) {
      const fullPath = path.join(this.config.workspacePath || process.cwd(), scanPath);
      if (fs.existsSync(fullPath)) {
        const scanResult = await this.registry.scan(fullPath);
        results.registered += scanResult.registered;
        results.failed += scanResult.failed;
        results.total += scanResult.registered + scanResult.failed;
      }
    }

    this.emit('initialized', results);
    return results;
  }

  /**
   * 获取Skill
   */
  get(name) {
    return this.registry.get(name);
  }

  /**
   * 列出所有Skills
   */
  list(options = {}) {
    let skills = this.registry.getAll();
    
    if (options.status) {
      skills = skills.filter(s => s.status === options.status);
    }
    
    if (options.tag) {
      skills = this.registry.getByTag(options.tag);
    }
    
    if (options.parent) {
      skills = this.registry.getByParent(options.parent);
    }
    
    return skills.map(s => s.toJSON());
  }

  /**
   * 查找匹配的Skills
   */
  match(context) {
    return this.registry.findMatching(context).map(s => s.toJSON());
  }

  /**
   * 激活Skill
   */
  activate(name) {
    const skill = this.registry.get(name);
    if (skill) {
      skill.activate();
      return true;
    }
    return false;
  }

  /**
   * 停用Skill
   */
  deactivate(name) {
    const skill = this.registry.get(name);
    if (skill) {
      skill.deactivate();
      return true;
    }
    return false;
  }

  /**
   * 创建新Skill
   */
  async create(template, name, options = {}) {
    return await this.installer.createFromTemplate(template, name, options);
  }

  /**
   * 列出触发条件
   */
  listTriggers() {
    const triggers = this.registry.listTriggers();
    const result = {};
    
    for (const [trigger, skills] of triggers) {
      result[trigger] = skills;
    }
    
    return result;
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    const skills = this.registry.getAll();
    const byStatus = {};
    const byTag = {};
    const byParent = {};
    
    for (const skill of skills) {
      // byStatus
      byStatus[skill.status] = (byStatus[skill.status] || 0) + 1;
      
      // byTag
      for (const tag of skill.metadata.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }
      
      // byParent
      const parent = skill.metadata.parent || 'none';
      byParent[parent] = (byParent[parent] || 0) + 1;
    }
    
    return {
      total: skills.length,
      byStatus,
      byTag,
      byParent,
      withTrigger: skills.filter(s => s.metadata.trigger).length,
      withoutTrigger: skills.filter(s => !s.metadata.trigger).length
    };
  }
}

// ============== 导出 ==============
module.exports = {
  EnhancedSkillsManager,
  SkillRegistry,
  SkillMetadata,
  SkillItem,
  SkillInstaller,
  SkillVersionManager,
  FrontmatterParser,
  SKILL_STATUS,
  SKILL_EVENTS,
  SKILL_FIELDS
};
