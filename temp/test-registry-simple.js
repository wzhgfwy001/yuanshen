const fs = require('fs');
const path = 'C:/Users/DELL/.openclaw/workspace/skills/dynamic-multi-agent-system/core/agency-registry/registry.json';

const content = fs.readFileSync(path, 'utf8');
const registry = JSON.parse(content);

console.log('Registry loaded');
console.log('Total agents:', Object.keys(registry.agents).length);

const task = '生成一首关于春天的歌曲';
const taskLower = task.toLowerCase();

console.log('\nTask:', task);

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

console.log('Matches found:', matches.length);
if (matches.length > 0) {
    matches.slice(0, 10).forEach(m => {
        console.log('  [' + m.score + ']', m.id, '-', m.name);
        console.log('    matched:', m.matchedKeywords.join(', '));
    });
} else {
    console.log('No keyword matches - testing fallback...');
    
    // Test fallback
    const testKeywords = ['歌曲', '音乐', '生成', '创作', '文案'];
    testKeywords.forEach(kw => {
        if (taskLower.includes(kw)) {
            console.log('  Task contains keyword:', kw);
        }
    });
}

// Show some sample keywords
console.log('\nSample keywords (first 5 agents):');
const agentIds = Object.keys(registry.agents).slice(0, 5);
agentIds.forEach(id => {
    const agent = registry.agents[id];
    const keywords = JSON.stringify(agent.trigger_keywords || []).substring(0, 80);
    console.log(' ', id, ':', keywords);
});