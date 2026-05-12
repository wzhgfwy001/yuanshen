/**
 * Session Log - 追加式事件日志
 * 基于 Anthropic Session 理念
 * 所有事件只增不改，确保历史完整性
 */

const fs = require('fs');
const path = require('path');

const SESSION_DIR = path.join(__dirname, 'sessions');
const INDEX_FILE = path.join(SESSION_DIR, 'index.json');

/**
 * Session Event - 单个事件
 */
class SessionEvent {
  constructor(type, data, metadata = {}) {
    this.id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.type = type;  // task_received, task_completed, agent_created, error, decision, etc.
    this.data = data;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }

  toMarkdown() {
    const time = new Date(this.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    return `### [${time}] ${this.id} - ${this.type}\n${this.formatData()}\n`;
  }

  formatData() {
    const lines = [];
    for (const [key, value] of Object.entries(this.data)) {
      if (typeof value === 'object') {
        lines.push(`- **${key}**: ${JSON.stringify(value)}`);
      } else {
        lines.push(`- **${key}**: ${value}`);
      }
    }
    return lines.join('\n');
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      data: this.data,
      metadata: this.metadata,
      timestamp: this.timestamp
    };
  }
}

/**
 * Session Log 主类
 */
class SessionLog {
  constructor() {
    this.currentSessionId = null;
    this.currentDate = this.getDateStr();
    this.ensureDirectories();
  }

  /**
   * 获取日期字符串
   */
  getDateStr() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  /**
   * 确保目录存在
   */
  ensureDirectories() {
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
  }

  /**
   * 开始新会话
   */
  startSession(sessionId) {
    this.currentSessionId = sessionId || `session-${Date.now()}`;
    this.currentDate = this.getDateStr();
    
    const sessionFile = this.getSessionFile();
    if (!fs.existsSync(sessionFile)) {
      const header = `# Session Log\n\n## session: ${this.currentSessionId}\n\n Started: ${new Date().toLocaleString('zh-CN')}\n\n---\n`;
      fs.writeFileSync(sessionFile, header);
    }

    this.log('session_started', { sessionId: this.currentSessionId });
    return this.currentSessionId;
  }

  /**
   * 获取会话文件路径
   */
  getSessionFile() {
    const filename = `session-${this.currentDate}.md`;
    return path.join(SESSION_DIR, filename);
  }

  /**
   * 记录事件（追加式）
   */
  log(type, data, metadata = {}) {
    if (!this.currentSessionId) {
      this.startSession();
    }

    const event = new SessionEvent(type, data, metadata);
    
    // 追加到文件
    const sessionFile = this.getSessionFile();
    const content = event.toMarkdown() + '\n';
    
    fs.appendFileSync(sessionFile, content);

    // 更新索引
    this.updateIndex(event);

    return event.id;
  }

  /**
   * 任务相关快捷方法
   */
  logTaskReceived(taskId, description, routing) {
    return this.log('task_received', {
      task_id: taskId,
      description,
      routing,
      status: 'pending'
    });
  }

  logTaskCompleted(taskId, result, tokens = 0) {
    return this.log('task_completed', {
      task_id: taskId,
      result,
      tokens: `+${tokens}`,
      status: 'SUCCESS'
    });
  }

  logTaskFailed(taskId, error) {
    return this.log('task_failed', {
      task_id: taskId,
      error,
      status: 'FAILED'
    });
  }

  logAgentCreated(agentId, role, model) {
    return this.log('agent_created', {
      agent_id: agentId,
      role,
      model
    });
  }

  logAgentCompleted(agentId, result) {
    return this.log('agent_completed', {
      agent_id: agentId,
      result,
      status: 'SUCCESS'
    });
  }

  logDecision(decision, reason, outcome) {
    return this.log('decision', {
      decision,
      reason,
      outcome
    });
  }

  logError(error, context) {
    return this.log('error', {
      error: error.message || String(error),
      context
    });
  }

  /**
   * 更新索引
   */
  updateIndex(event) {
    let index = this.loadIndex();
    
    if (!index.sessions[this.currentDate]) {
      index.sessions[this.currentDate] = [];
    }
    
    index.sessions[this.currentDate].push({
      id: event.id,
      type: event.type,
      timestamp: event.timestamp
    });
    
    index.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  }

  /**
   * 加载索引
   */
  loadIndex() {
    try {
      if (fs.existsSync(INDEX_FILE)) {
        return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
      }
    } catch (e) {
      // ignore
    }
    return { sessions: {}, lastUpdated: null };
  }

  /**
   * 获取指定日期的会话
   */
  getSession(date = this.currentDate) {
    const filename = `session-${date}.md`;
    const filepath = path.join(SESSION_DIR, filename);
    
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath, 'utf8');
    }
    return null;
  }

  /**
   * 获取最近的日志条目
   */
  getRecent(count = 10) {
    const session = this.getSession();
    if (!session) return [];

    const lines = session.split('\n');
    const entries = [];
    let current = null;

    for (const line of lines) {
      if (line.startsWith('### [')) {
        if (current) entries.push(current);
        const match = line.match(/### \[(\d{2}:\d{2})\] (evt-\S+) - (\S+)/);
        if (match) {
          current = {
            time: match[1],
            id: match[2],
            type: match[3],
            lines: [line]
          };
        }
      } else if (current && line.startsWith('- **')) {
        current.lines.push(line);
      }
    }
    if (current) entries.push(current);

    return entries.slice(-count).reverse();
  }

  /**
   * 搜索日志
   */
  search(query) {
    const results = [];
    const files = fs.readdirSync(SESSION_DIR).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(SESSION_DIR, file), 'utf8');
      if (content.includes(query)) {
        const matches = content.split('\n### [')
          .filter(m => m.includes(query))
          .map(m => '### [' + m);
        results.push(...matches);
      }
    }
    
    return results;
  }

  /**
   * 获取统计
   */
  stats() {
    const index = this.loadIndex();
    const total = Object.values(index.sessions).reduce((sum, arr) => sum + arr.length, 0);
    
    return {
      totalEvents: total,
      sessionsCount: Object.keys(index.sessions).length,
      lastUpdated: index.lastUpdated,
      dates: Object.keys(index.sessions)
    };
  }
}

const sessionLog = new SessionLog();

module.exports = { sessionLog, SessionLog, SessionEvent };

// 使用示例
if (require.main === module) {
  sessionLog.startSession('test-session-001');
  
  sessionLog.logTaskReceived('task-001', '搜索合同文件', 'search-agent');
  sessionLog.logTaskCompleted('task-001', '找到12个文件', 120);
  sessionLog.logDecision('使用search-agent', '任务简单', '高效执行');
  
  console.log('Stats:', sessionLog.stats());
  console.log('Recent:', sessionLog.getRecent(5));
}
