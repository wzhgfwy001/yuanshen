// Test path resolution
const path = require('path');

// Server's expected __dirname behavior
const scriptDir = 'C:/Users/DELL/.openclaw/workspace/skills/skills-evolution/dashboard';
const basePath = path.join(scriptDir, '..', '..', '..');
console.log('Base path:', basePath);

// Route simulation
const reqPath = '/skills-evolution/dashboard';
let filePath = reqPath.startsWith('/') ? reqPath.substring(1) : reqPath;

let targetPath;
if (filePath === 'skills-evolution/dashboard' || filePath === 'skills-evolution/dashboard/') {
  targetPath = path.join(scriptDir, 'dashboard.html');
} else {
  targetPath = path.join(scriptDir, filePath.replace('skills-evolution/dashboard/', ''));
}

console.log('Target path:', targetPath);

const normalizedTarget = targetPath.replace(/\\/g, '/');
const normalizedBase = basePath.replace(/\\/g, '/');

console.log('Normalized target:', normalizedTarget);
console.log('Normalized base:', normalizedBase);
console.log('Starts with check:', normalizedTarget.startsWith(normalizedBase));
console.log('File exists:', require('fs').existsSync(targetPath));