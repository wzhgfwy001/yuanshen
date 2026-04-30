# Test Node.js reading registry
node -e "
const fs = require('fs');
const path = 'C:/Users/DELL/.openclaw/workspace/skills/dynamic-multi-agent-system/core/agency-registry/registry.json';

const content = fs.readFileSync(path, 'utf8');
const registry = JSON.parse(content);

console.log('Registry loaded successfully');
console.log('Total agents:', Object.keys(registry.agents).length);

// Test task matching
const task = '生成一首关于春天的歌曲';
const taskLower = task.toLowerCase();

console.log('\\nTask:', task);
console.log('Task (lower):', taskLower);

// Test matching
const matches = [];
for (const [id, agent] of Object.entries(registry.agents)) {
    let score = 0;
    const matchedKeywords = [];
    
    for (const kw of (agent.trigger_keywords || [])) {
        if (taskLower.includes(kw.toLowerCase())) {
            score++;
            matchedKeywords.push(kw);
        }
    }
    
    if (score > 0) {
        matches.push({ id, name: agent.name_zh || agent.name, score, matchedKeywords });
    }
}

console.log('\\nMatches found:', matches.length);
matches.slice(0, 10).forEach(m => {
    console.log('  [' + m.score + ']', m.id, '-', m.name);
    console.log('    matched:', m.matchedKeywords.join(', '));
});

// Also show some sample trigger_keywords
console.log('\\nSample trigger_keywords (first 10 agents):');
const agentIds = Object.keys(registry.agents).slice(0, 10);
agentIds.forEach(id => {
    const agent = registry.agents[id];
    console.log(' ', id, ':', JSON.stringify(agent.trigger_keywords || []));
});
"