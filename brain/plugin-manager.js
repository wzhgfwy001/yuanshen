/**
 * Plugin Manager - 完整插件系统
 * 基于 Claude Code src/plugins 设计
 */

const fs = require('fs');
const path = require('path');

const PLUGIN_DIR = path.join(__dirname, 'plugins');
const HOOK_FILE = path.join(__dirname, '..', 'hooks-system.js');

// 插件状态
const PLUGIN_STATE = {
  UNLOADED: 'unloaded',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
  DISABLED: 'disabled'
};

/**
 * Plugin 元数据
 */
class PluginMeta {
  constructor(name, config = {}) {
    this.name = name;
    this.version = config.version || '1.0.0';
    this.enabled = config.enabled !== false;
    this.path = config.path || path.join(PLUGIN_DIR, name);
    this.config = config;
    this.loadedAt = null;
    this.state = PLUGIN_STATE.UNLOADED;
  }
}

/**
 * Plugin Manager
 */
class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.registry = path.join(__dirname, 'plugin-registry.json');
    this.loadRegistry();
    this.ensurePluginDir();
  }
  
  ensurePluginDir() {
    if (!fs.existsSync(PLUGIN_DIR)) {
      fs.mkdirSync(PLUGIN_DIR, { recursive: true });
    }
  }
  
  /**
   * 注册插件
   */
  register(name, config = {}) {
    const meta = new PluginMeta(name, config);
    this.plugins.set(name, meta);
    this.saveRegistry();
    console.log(`[Plugin] Registered: ${name}`);
    return meta;
  }
  
  /**
   * 加载插件
   */
  async load(name) {
    const meta = this.plugins.get(name);
    if (!meta) {
      throw new Error(`Plugin not found: ${name}`);
    }
    
    meta.state = PLUGIN_STATE.LOADING;
    
    try {
      const pluginPath = path.join(meta.path, 'index.js');
      if (!fs.existsSync(pluginPath)) {
        throw new Error(`Plugin entry not found: ${pluginPath}`);
      }
      
      const PluginClass = require(pluginPath);
      const instance = new PluginClass(meta.config);
      
      if (typeof instance.init === 'function') {
        await instance.init();
      }
      
      meta.instance = instance;
      meta.state = PLUGIN_STATE.LOADED;
      meta.loadedAt = new Date().toISOString();
      
      this.saveRegistry();
      console.log(`[Plugin] Loaded: ${name}`);
      return instance;
    } catch (error) {
      meta.state = PLUGIN_STATE.ERROR;
      meta.error = error.message;
      console.error(`[Plugin] Failed to load ${name}:`, error.message);
      throw error;
    }
  }
  
  /**
   * 卸载插件
   */
  async unload(name) {
    const meta = this.plugins.get(name);
    if (!meta) return false;
    
    if (meta.instance && typeof meta.instance.destroy === 'function') {
      await meta.instance.destroy();
    }
    
    meta.state = PLUGIN_STATE.UNLOADED;
    meta.instance = null;
    this.saveRegistry();
    
    return true;
  }
  
  /**
   * 启用/禁用插件
   */
  setEnabled(name, enabled) {
    const meta = this.plugins.get(name);
    if (!meta) return false;
    
    meta.enabled = enabled;
    meta.state = enabled ? PLUGIN_STATE.LOADED : PLUGIN_STATE.DISABLED;
    this.saveRegistry();
    return true;
  }
  
  /**
   * 热重载
   */
  async reload(name) {
    await this.unload(name);
    delete require.cache[require.resolve(path.join(this.plugins.get(name)?.path, 'index.js'))];
    return this.load(name);
  }
  
  /**
   * 执行插件方法
   */
  async exec(name, method, ...args) {
    const meta = this.plugins.get(name);
    if (!meta || meta.state !== PLUGIN_STATE.LOADED) {
      throw new Error(`Plugin not loaded: ${name}`);
    }
    
    const fn = meta.instance[method];
    if (typeof fn !== 'function') {
      throw new Error(`Plugin ${name} has no method: ${method}`);
    }
    
    return fn.apply(meta.instance, args);
  }
  
  /**
   * 获取所有插件
   */
  list() {
    const list = [];
    for (const [name, meta] of this.plugins) {
      list.push({
        name: meta.name,
        version: meta.version,
        state: meta.state,
        enabled: meta.enabled,
        loadedAt: meta.loadedAt
      });
    }
    return list;
  }
  
  /**
   * 保存注册表
   */
  saveRegistry() {
    const data = {};
    for (const [name, meta] of this.plugins) {
      data[name] = {
        name: meta.name,
        version: meta.version,
        enabled: meta.enabled,
        path: meta.path,
        state: meta.state
      };
    }
    fs.writeFileSync(this.registry, JSON.stringify(data, null, 2));
  }
  
  /**
   * 加载注册表
   */
  loadRegistry() {
    try {
      if (fs.existsSync(this.registry)) {
        const data = JSON.parse(fs.readFileSync(this.registry, 'utf8'));
        for (const [name, meta] of Object.entries(data)) {
          this.plugins.set(name, new PluginMeta(name, meta));
        }
        console.log(`[Plugin] Loaded ${this.plugins.size} plugins from registry`);
      }
    } catch (e) {
      console.log('[Plugin] No registry found');
    }
  }
  
  /**
   * 创建示例插件
   */
  create(name) {
    const pluginPath = path.join(PLUGIN_DIR, name);
    fs.mkdirSync(pluginPath, { recursive: true });
    
    const indexContent = `// Plugin: ${name}
module.exports = class ${name}Plugin {
  constructor(config) {
    this.name = '${name}';
    this.config = config;
  }
  
  async init() {
    console.log('Plugin ${name} initialized');
  }
  
  async destroy() {
    console.log('Plugin ${name} destroyed');
  }
  
  // 添加你的方法
  async execute(params) {
    return { success: true, plugin: this.name };
  }
};
`;
    
    fs.writeFileSync(path.join(pluginPath, 'index.js'), indexContent);
    fs.writeFileSync(
      path.join(pluginPath, 'config.json'),
      JSON.stringify({ name, version: '1.0.0' }, null, 2)
    );
    
    this.register(name, { path: pluginPath });
    return pluginPath;
  }
}

const pluginManager = new PluginManager();

module.exports = { pluginManager, PluginManager, PLUGIN_STATE };

// 使用示例
if (require.main === module) {
  console.log('Plugins:', pluginManager.list());
  
  // 创建示例插件
  const newPlugin = pluginManager.create('example-plugin');
  console.log('Created:', newPlugin);
  
  // 加载并执行
  pluginManager.load('example-plugin').then(p => {
    console.log('Plugin loaded:', p);
  });
}
