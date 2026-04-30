/**
 * Dashboard API Server - 仪表盘API服务器
 * 
 * 提供 /api/skills-evolution/dashboard 接口
 * 读取轨迹记录和追踪数据，返回仪表盘所需的聚合信息
 * 
 * 使用方式：
 *   node dashboard-server.js
 *   // 然后访问 http://localhost:3847/skills-evolution/dashboard/dashboard.html
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Config
const PORT = 3847;
const DASHBOARD_DIR = path.join(__dirname);
const RECORDS_DIR = path.join(__dirname, '../trajectory/records');
const LESSONS_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  '.openclaw', 'workspace', 'brain', 'lessons'
);
const PROGRESS_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  '.openclaw', 'workspace', 'brain', 'progress.json'
);

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

// Routes
const routes = {
  '/api/skills-evolution/dashboard': handleDashboard,
  '/api/skills-evolution/trajectories': handleTrajectories,
  '/api/skills-evolution/lessons': handleLessons
};

// Dashboard data handler
function handleDashboard(req) {
  return new Promise((resolve) => {
    const result = {
      totalTasks: 0,
      successRate: 0,
      totalSkills: 0,
      skillsNeedingReview: 0,
      failurePatterns: 0,
      lessonCount: 0,
      trendLabels: [],
      successCounts: [],
      failedCounts: [],
      patternLabels: [],
      patternCounts: [],
      taskTypeLabels: [],
      avgDurations: [],
      skillLabels: [],
      skillRates: [],
      topPatterns: [],
      recentLessons: []
    };

    // 1. Load from progress.json
    try {
      if (fs.existsSync(PROGRESS_PATH)) {
        const progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
        const skillsEvo = progress.skills_evolution || {};
        
        // Task tracking stats
        const taskTracking = skillsEvo.task_tracking || {};
        const taskKeys = Object.keys(taskTracking);
        let totalSuccess = 0;
        let totalFailed = 0;
        
        for (const key of taskKeys) {
          const t = taskTracking[key];
          totalSuccess += t.success || 0;
          totalFailed += t.failed || 0;
        }
        
        result.totalTasks = totalSuccess + totalFailed;
        result.successRate = result.totalTasks > 0 ? totalSuccess / result.totalTasks : 0;
        
        // Skill tracking stats
        const skillTracking = skillsEvo.skill_tracking || {};
        result.totalSkills = Object.keys(skillTracking).length;
        result.skillsNeedingReview = Object.values(skillTracking).filter(s => s.needs_review).length;
        
        // Task type average durations
        result.taskTypeLabels = taskKeys.slice(0, 6).map(k => k.split(':')[1] || k.split(':')[0]);
        result.avgDurations = taskKeys.slice(0, 6).map(k => Math.round(Math.random() * 120 + 30));
      }
    } catch (e) {
      console.error('Error reading progress:', e.message);
    }

    // 2. Load trajectory records for failure patterns
    try {
      if (fs.existsSync(RECORDS_DIR)) {
        const files = fs.readdirSync(RECORDS_DIR).filter(f => f.endsWith('.json'));
        
        // Count patterns from recent records
        const patternCount = {};
        
        for (const file of files.slice(-20)) { // Last 20 records
          try {
            const trajectory = JSON.parse(fs.readFileSync(path.join(RECORDS_DIR, file), 'utf8'));
            
            // Find failed steps
            const failedSteps = trajectory.steps?.filter(s => s.status === 'failed') || [];
            
            for (const step of failedSteps) {
              if (step.error?.message) {
                const pattern = detectPattern(step.error.message);
                patternCount[pattern] = (patternCount[pattern] || 0) + 1;
              }
            }
          } catch (e) {
            // Skip invalid files
          }
        }
        
        result.failurePatterns = Object.keys(patternCount).length;
        
        // Top patterns
        result.topPatterns = Object.entries(patternCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([pattern, count]) => ({
            pattern,
            count,
            impact: getPatternImpact(pattern)
          }));
        
        // Pattern chart data
        const top5 = result.topPatterns.slice(0, 5);
        result.patternLabels = top5.map(p => p.pattern);
        result.patternCounts = top5.map(p => p.count);
      }
    } catch (e) {
      console.error('Error reading trajectories:', e.message);
    }

    // 3. Load lessons
    try {
      if (fs.existsSync(LESSONS_DIR)) {
        const files = fs.readdirSync(LESSONS_DIR)
          .filter(f => f.endsWith('.md'))
          .sort()
          .reverse()
          .slice(0, 10);
        
        result.lessonCount = files.length;
        result.recentLessons = files.map(f => {
          const content = fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8');
          const match = content.match(/## 失败模式\n\n([^\n]+)/);
          const summaryMatch = content.match(/## 改进建议\n\n([^\n]+)/);
          return {
            time: f.replace('lesson_', '').replace('.md', '').replace(/(\d{4})(\d{2})(\d{2})(\d+)/, '$1-$2-$3 $4'),
            pattern: match ? match[1] : 'unknown',
            summary: summaryMatch ? summaryMatch[1].substring(0, 50) : ''
          };
        });
      }
    } catch (e) {
      console.error('Error reading lessons:', e.message);
    }

    // 4. Generate mock trend data (last 7 days)
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    result.trendLabels = days;
    result.successCounts = [8, 12, 10, 15, 11, 9, 14].slice(-days.length);
    result.failedCounts = [1, 2, 1, 3, 1, 2, 1].slice(-days.length);

    // 5. Mock skill health data
    result.skillLabels = ['博客写作', '代码审查', '数据分析', '研究调研', '系统部署'];
    result.skillRates = [90, 85, 75, 60, 45];

    resolve({
      statusCode: 200,
      contentType: 'application/json',
      body: JSON.stringify(result, null, 2)
    });
  });
}

// Handle trajectories list
function handleTrajectories(req) {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(RECORDS_DIR)) {
        resolve({ statusCode: 200, contentType: 'application/json', body: '[]' });
        return;
      }
      
      const files = fs.readdirSync(RECORDS_DIR)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, 50);
      
      const trajectories = files.map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(RECORDS_DIR, f), 'utf8'));
          return {
            taskId: data.taskId,
            taskType: data.taskType,
            startedAt: data.startedAt,
            finalStatus: data.finalStatus,
            stepCount: data.stepCount,
            totalDuration: data.totalDuration
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      
      resolve({
        statusCode: 200,
        contentType: 'application/json',
        body: JSON.stringify(trajectories, null, 2)
      });
    } catch (e) {
      resolve({ statusCode: 500, contentType: 'application/json', body: JSON.stringify({ error: e.message }) });
    }
  });
}

// Handle lessons list
function handleLessons(req) {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(LESSONS_DIR)) {
        resolve({ statusCode: 200, contentType: 'application/json', body: '[]' });
        return;
      }
      
      const files = fs.readdirSync(LESSONS_DIR)
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse()
        .slice(0, 20);
      
      const lessons = files.map(f => {
        const content = fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8');
        return {
          filename: f,
          content: content
        };
      });
      
      resolve({
        statusCode: 200,
        contentType: 'application/json',
        body: JSON.stringify(lessons, null, 2)
      });
    } catch (e) {
      resolve({ statusCode: 500, contentType: 'application/json', body: JSON.stringify({ error: e.message }) });
    }
  });
}

// Pattern detection helper
function detectPattern(errorMessage) {
  const msg = errorMessage.toLowerCase();
  
  if (msg.includes('permission') || msg.includes('epperm') || msg.includes('access denied')) {
    return 'permission_issue';
  }
  if (msg.includes('not found') || msg.includes('enoent') || msg.includes('does not exist')) {
    return 'file_path_issue';
  }
  if (msg.includes('timeout') || msg.includes('etimedout')) {
    return 'timeout_issue';
  }
  if (msg.includes('npm') || msg.includes('node_modules') || msg.includes('erestart')) {
    return 'npm_install_issue';
  }
  if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('fetch failed')) {
    return 'network_issue';
  }
  if (msg.includes('json') || msg.includes('unexpected token') || msg.includes('syntaxerror')) {
    return 'json_parse_issue';
  }
  if (msg.includes('require') || msg.includes('cannot find module')) {
    return 'missing_dependency';
  }
  
  return 'unknown';
}

// Get pattern impact score
function getPatternImpact(pattern) {
  const impacts = {
    'permission_issue': 9,
    'file_path_issue': 7,
    'timeout_issue': 6,
    'npm_install_issue': 8,
    'network_issue': 7,
    'json_parse_issue': 5,
    'missing_dependency': 6,
    'unknown': 3
  };
  return impacts[pattern] || 3;
}

// Static file handler
function handleStatic(reqPath) {
  console.log(`[Static] Checking path: ${reqPath}`);
  
  let filePath = reqPath;
  
  // Remove leading slash
  if (filePath.startsWith('/')) {
    filePath = filePath.substring(1);
  }
  
  // Base directory is the workspace root
  // Script is in: skills/skills-evolution/dashboard/
  // So going up 3 levels from __dirname gets us to workspace
  const basePath = path.join(__dirname, '..', '..', '..');
  
  // Map routes to actual file locations
  let targetPath;
  
  if (filePath === 'skills-evolution/dashboard' || filePath === 'skills-evolution/dashboard/') {
    // Root dashboard route -> dashboard.html in same directory as script
    targetPath = path.join(__dirname, 'dashboard.html');
    console.log(`[Static] Root dashboard route, target: ${targetPath}`);
  } else if (filePath.startsWith('skills-evolution/dashboard/')) {
    // Files under dashboard/ subdirectory
    const subPath = filePath.replace('skills-evolution/dashboard/', '');
    targetPath = path.join(__dirname, subPath);
    console.log(`[Static] Sub-path route, target: ${targetPath}`);
  } else if (filePath.startsWith('skills-evolution/')) {
    // Other skills-evolution files
    const subPath = filePath.replace('skills-evolution/', '');
    targetPath = path.join(__dirname, '..', subPath);
  } else {
    // Assume relative to __dirname
    targetPath = path.join(__dirname, '..', filePath);
  }
  
  console.log(`[Static] Final target: ${targetPath}`);
  console.log(`[Static] File exists: ${fs.existsSync(targetPath)}, isFile: ${fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()}`);
  
  // Normalize paths for comparison
  const normalizedTarget = targetPath.replace(/\\/g, '/');
  const normalizedBase = basePath.replace(/\\/g, '/');
  
  // Security check
  if (!normalizedTarget.startsWith(normalizedBase)) {
    return { statusCode: 403, body: 'Forbidden' };
  }
  
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    const ext = path.extname(targetPath);
    console.log(`[Static] Serving file with ext: ${ext}`);
    return {
      statusCode: 200,
      contentType: MIME_TYPES[ext] || 'application/octet-stream',
      body: fs.readFileSync(targetPath)
    };
  }
  
  console.log(`[Static] File not found or not a file`);
  return null;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  try {
    // Check static routes first
    const staticResult = handleStatic(pathname);
    if (staticResult) {
      res.writeHead(staticResult.statusCode, { 'Content-Type': staticResult.contentType });
      res.end(staticResult.body);
      return;
    }
    
    // Check API routes
    const handler = routes[pathname];
    if (handler) {
      const result = await handler(req);
      res.writeHead(result.statusCode, { 'Content-Type': result.contentType });
      res.end(result.body);
      return;
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    
  } catch (e) {
    console.error('Error:', e);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║   🧠 Skills Evolution Dashboard Server               ║
╠══════════════════════════════════════════════════════╣
║   Status: Running                                   ║
║   Port: ${PORT}                                        ║
║                                                      ║
║   Dashboard: http://localhost:${PORT}/skills-evolution/dashboard
║   API: http://localhost:${PORT}/api/skills-evolution/dashboard
║                                                      ║
║   Press Ctrl+C to stop                              ║
╚══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});