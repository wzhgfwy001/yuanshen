const fs = require('fs');
const raw = fs.readFileSync('C:/Users/DELL/.openclaw/cron/jobs.json', 'utf8');
let fixed = raw;
let count = 0;

// Pattern 1: non-ASCII char followed by ? where " was corrupted
for (let i = 0; i < fixed.length - 2; i++) {
  const c = fixed.charCodeAt(i);
  if (c >= 128 && fixed[i+1] === '?' && (fixed[i+2] === ',' || fixed[i+2] === '"')) {
    fixed = fixed.substring(0, i+1) + '"' + fixed.substring(i+2);
    count++;
  }
}

// Pattern 2: non-ASCII char followed by "" (double quote instead of single)
for (let i = 0; i < fixed.length - 2; i++) {
  const c = fixed.charCodeAt(i);
  if (c >= 128 && fixed[i+1] === '"' && fixed[i+2] === '"') {
    // Replace "" with "
    fixed = fixed.substring(0, i+1) + '"' + fixed.substring(i+2);
    count++;
  }
}

fs.writeFileSync('C:/Users/DELL/.openclaw/cron/jobs.json', fixed, 'utf8');
console.log('Fixed', count, 'corruptions');

// Verify
try {
  const j = JSON.parse(fs.readFileSync('C:/Users/DELL/.openclaw/cron/jobs.json', 'utf8'));
  console.log('JSON OK, jobs:', j.jobs.length);
} catch(e) {
  console.log('Still broken:', e.message);
  // Show the area around the error
  const pos = parseInt(e.message.match(/at position (\d+)/)?.[1] || 0);
  const ctx = fs.readFileSync('C:/Users/DELL/.openclaw/cron/jobs.json','utf8').substring(Math.max(0,pos-30), pos+30);
  console.log('Context:', JSON.stringify(ctx));
}
