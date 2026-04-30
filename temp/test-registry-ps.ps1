# Test registry via Node.js
$content = Get-Content "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\agency-registry\registry.json" -Raw -Encoding UTF8

# Save to temp file for node
$content | Out-File -FilePath "$env:TEMP\test-registry-content.json" -Encoding UTF8

node -e "
const fs = require('fs');
const path = process.env.TEMP + '\\test-registry-content.json';

const content = fs.readFileSync(path, 'utf8');
const registry = JSON.parse(content);

console.log('Registry loaded');
console.log('Total agents:', Object.keys(registry.agents).length);

const task = '生成一首关于春天的歌曲';
const taskLower = task.toLowerCase();

console.log('\\nTask:', task);

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
    console.log('No matches - testing fallback...');
    
    // Test fallback mapping
    const CATEGORY_KEYWORD_MAP = {
        '生成': ['文档生成器', '代码生成', '内容创作'],
        '歌曲': ['音乐创作Agent', '歌词创作Agent'],
        '音乐': ['音乐创作Agent', '歌词创作Agent'],
    };
    
    for (const [keyword, agentNames] of Object.entries(CATEGORY_KEYWORD_MAP)) {
        if (taskLower.includes(keyword)) {
            console.log('  Found keyword:', keyword, '-> agents:', agentNames.join(', '));
        }
    }
}

// Show some sample keywords
console.log('\\nSample keywords (first 5 agents):');
const agentIds = Object.keys(registry.agents).slice(0, 5);
agentIds.forEach(id => {
    const agent = registry.agents[id];
    console.log(' ', id, ':', JSON.stringify(agent.trigger_keywords || []).substring(0, 100));
});
"