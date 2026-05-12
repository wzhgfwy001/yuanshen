/**
 * memdir - 跨会话记忆系统
 * 基于 Claude Code 的 src/memdir/ 设计理念
 * 实现断点续跑和跨会话持久化
 */

const fs = require('fs');
const path = require('path');

// 根目录
const MEMDIR_ROOT = path.join(__dirname, 'memdir');
const SESSION_DIR = path.join(MEMDIR_ROOT, 'session');
const PROJECTS_DIR = path.join(MEMDIR_ROOT, 'projects');
const TASKS_DIR = path.join(MEMDIR_ROOT, 'tasks');

/**
 * 确保目录存在
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Session Memory - 当前会话工作记忆
 */
class SessionMemory {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.current = {
      sessionId,
      taskId: null,
      progress: null,
      variables: {},
      lastActive: new Date().toISOString()
    };
    this.file = path.join(SESSION_DIR, `${sessionId}.json`);
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.file)) {
        const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        this.current = { ...this.current, ...data };
      }
    } catch (e) {
      // 使用默认值
    }
  }

  save() {
    ensureDir(SESSION_DIR);
    this.current.lastActive = new Date().toISOString();
    fs.writeFileSync(this.file, JSON.stringify(this.current, null, 2));
  }

  set(key, value) {
    this.current[key] = value;
    this.save();
  }

  get(key) {
    return this.current[key];
  }

  setTask(taskId, progress = null) {
    this.current.taskId = taskId;
    this.current.progress = progress;
    this.save();
  }

  clear() {
    this.current = {
      sessionId: this.sessionId,
      taskId: null,
      progress: null,
      variables: {},
      lastActive: new Date().toISOString()
    };
    this.save();
  }
}

/**
 * Project Memory - 项目级记忆
 */
class ProjectMemory {
  constructor(projectId) {
    this.projectId = projectId;
    this.dir = path.join(PROJECTS_DIR, projectId);
    this.data = {
      projectId,
      name: projectId,
      status: 'active',
      lastActive: new Date().toISOString(),
      progress: '0%',
      checkpoint: null,
      blockers: [],
      notes: []
    };
    this.load();
  }

  load() {
    const metaFile = path.join(this.dir, 'meta.json');
    try {
      if (fs.existsSync(metaFile)) {
        this.data = { ...this.data, ...JSON.parse(fs.readFileSync(metaFile, 'utf8')) };
      }
    } catch (e) {
      // 使用默认值
    }
  }

  save() {
    ensureDir(this.dir);
    this.data.lastActive = new Date().toISOString();
    fs.writeFileSync(
      path.join(this.dir, 'meta.json'),
      JSON.stringify(this.data, null, 2)
    );
  }

  /**
   * 保存 checkpoint
   */
  saveCheckpoint(checkpointData) {
    const checkpoint = {
      id: `cp-${Date.now()}`,
      taskId: checkpointData.taskId,
      data: checkpointData,
      savedAt: new Date().toISOString()
    };
    
    // 保存 checkpoint 文件
    const cpFile = path.join(this.dir, `checkpoint-${checkpoint.id}.json`);
    fs.writeFileSync(cpFile, JSON.stringify(checkpoint, null, 2));
    
    // 更新 meta 中的最新 checkpoint 引用
    this.data.checkpoint = checkpoint.id;
    this.save();
    
    return checkpoint;
  }

  /**
   * 加载最新 checkpoint
   */
  loadCheckpoint() {
    if (!this.data.checkpoint) return null;
    
    const cpFile = path.join(this.dir, `checkpoint-${this.data.checkpoint}.json`);
    try {
      return JSON.parse(fs.readFileSync(cpFile, 'utf8'));
    } catch (e) {
      return null;
    }
  }

  updateProgress(progress) {
    this.data.progress = progress;
    this.save();
  }

  addBlocker(blocker) {
    this.data.blockers.push({
      id: `blk-${Date.now()}`,
      description: blocker,
      addedAt: new Date().toISOString()
    });
    this.save();
  }

  addNote(note) {
    this.data.notes.push({
      id: `note-${Date.now()}`,
      content: note,
      addedAt: new Date().toISOString()
    });
    this.save();
  }
}

/**
 * Task Memory - 任务级记忆
 */
class TaskMemory {
  constructor(taskId) {
    this.taskId = taskId;
    this.dir = path.join(TASKS_DIR, taskId);
    this.data = {
      taskId,
      status: 'pending',
      progress: null,
      context: {},
      errors: [],
      notes: ''
    };
    this.load();
  }

  load() {
    const stateFile = path.join(this.dir, 'state.json');
    try {
      if (fs.existsSync(stateFile)) {
        this.data = { ...this.data, ...JSON.parse(fs.readFileSync(stateFile, 'utf8')) };
      }
    } catch (e) {
      // 使用默认值
    }
  }

  save() {
    ensureDir(this.dir);
    fs.writeFileSync(
      path.join(this.dir, 'state.json'),
      JSON.stringify(this.data, null, 2)
    );
  }

  updateStatus(status) {
    this.data.status = status;
    this.save();
  }

  updateProgress(progress) {
    this.data.progress = progress;
    this.save();
  }

  setContext(key, value) {
    this.data.context[key] = value;
    this.save();
  }

  getContext(key) {
    return this.data.context[key];
  }

  addError(error) {
    this.data.errors.push({
      id: `err-${Date.now()}`,
      error,
      at: new Date().toISOString()
    });
    this.save();
  }
}

/**
 * memdir 主入口
 */
class Memdir {
  constructor() {
    ensureDir(MEMDIR_ROOT);
    ensureDir(SESSION_DIR);
    ensureDir(PROJECTS_DIR);
    ensureDir(TASKS_DIR);
    
    this.sessions = new Map();
    this.projects = new Map();
    this.tasks = new Map();
  }

  /**
   * 获取或创建 Session Memory
   */
  session(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new SessionMemory(sessionId));
    }
    return this.sessions.get(sessionId);
  }

  /**
   * 获取或创建 Project Memory
   */
  project(projectId) {
    if (!this.projects.has(projectId)) {
      this.projects.set(projectId, new ProjectMemory(projectId));
    }
    return this.projects.get(projectId);
  }

  /**
   * 获取或创建 Task Memory
   */
  task(taskId) {
    if (!this.tasks.has(taskId)) {
      this.tasks.set(taskId, new TaskMemory(taskId));
    }
    return this.tasks.get(taskId);
  }

  /**
   * 搜索跨会话记忆
   */
  search(query) {
    const results = [];
    
    // 搜索 Projects
    const projectDirs = fs.readdirSync(PROJECTS_DIR);
    for (const projectId of projectDirs) {
      const metaFile = path.join(PROJECTS_DIR, projectId, 'meta.json');
      if (fs.existsSync(metaFile)) {
        const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
        if (JSON.stringify(meta).includes(query)) {
          results.push({ type: 'project', id: projectId, match: meta });
        }
      }
    }
    
    // 搜索 Tasks
    const taskDirs = fs.readdirSync(TASKS_DIR);
    for (const taskId of taskDirs) {
      const stateFile = path.join(TASKS_DIR, taskId, 'state.json');
      if (fs.existsSync(stateFile)) {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        if (JSON.stringify(state).includes(query)) {
          results.push({ type: 'task', id: taskId, match: state });
        }
      }
    }
    
    return results;
  }
}

const memdir = new Memdir();

module.exports = {
  memdir,
  Memdir,
  SessionMemory,
  ProjectMemory,
  TaskMemory
};

// 使用示例
if (require.main === module) {
  // Session 记忆
  const session = memdir.session('main');
  session.set('taskId', 't-123');
  console.log('Current task:', session.get('taskId'));
  
  // Project 记忆
  const project = memdir.project('gaokao-system');
  project.updateProgress('65%');
  project.saveCheckpoint({ line: 45, variables: { count: 10 } });
  console.log('Project progress:', project.data.progress);
  
  // Task 记忆
  const task = memdir.task('t-123');
  task.updateStatus('running');
  task.setContext('lastFile', 'login.js');
  console.log('Task context:', task.getContext('lastFile'));
}
