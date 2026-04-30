const fs = require('fs');
const logPath = 'C:/Users/DELL/.openclaw/workspace/brain/heartbeat-log.md';
const timestamp = new Date().toISOString();
const logEntry = `
## 心跳检查 - ${timestamp}

- WAL状态: 已处理（无待处理）
- Inbox: 4项（正常，<7）
- 系统: 静默检查

---
`;

if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf8');
    fs.writeFileSync(logPath, logEntry + content);
} else {
    fs.writeFileSync(logPath, '# Heartbeat Log\n' + logEntry);
}
console.log('Heartbeat logged');