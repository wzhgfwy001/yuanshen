const path = require('path');
const fs = require('fs');

const flowDir = 'C:/Users/DELL/.openclaw/workspace/skills/dynamic-multi-agent-system/core/flow';
const REGISTRY_PATH = path.join(flowDir, '..', 'agency-registry', 'registry.json');

console.log('Registry path:', REGISTRY_PATH);
console.log('Exists:', fs.existsSync(REGISTRY_PATH));

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
console.log('Agents loaded:', Object.keys(registry.agents).length);

const task = '生成一首关于春天的歌曲';
const taskLower = task.toLowerCase();

console.log('\nTask:', task);

const matches = [];
for (const [id, agent] of Object.entries(registry.agents)) {
    let score = 0;
    for (const kw of (agent.trigger_keywords || [])) {
        if (taskLower.includes(kw.toLowerCase())) {
            score += 1;
        }
    }
    if (score > 0) {
        matches.push({ id, agent, score, matchType: 'keyword' });
    }
}

console.log('Keyword matches:', matches.length);

const CATEGORY_KEYWORD_MAP = {
    '生成': ['文档生成器', '代码生成', '内容创作'],
    '歌曲': ['音乐创作Agent', '歌词创作Agent'],
    '音乐': ['音乐创作Agent', '歌词创作Agent'],
    '创意': ['内容创作者', '开发者布道师', '文案撰写'],
};

if (matches.length < 3) {
    console.log('\nFallback matching...');
    for (const [keyword, agentNames] of Object.entries(CATEGORY_KEYWORD_MAP)) {
        if (taskLower.includes(keyword)) {
            console.log('Found keyword in task:', keyword);
            for (const agentName of agentNames) {
                const found = Object.entries(registry.agents).find(([id, a]) => {
                    const name = (a.name_zh || a.name || '').toLowerCase();
                    return name.includes(agentName.toLowerCase().replace('Agent', ''));
                });
                if (found && !matches.find(m => m.id === found[0])) {
                    console.log('  Adding fallback agent:', found[1].name_zh || found[1].name);
                    matches.push({ id: found[0], agent: found[1], score: 0.3, matchType: 'fallback' });
                }
            }
        }
    }
}

console.log('\nFinal matches:', matches.length);
matches.slice(0, 5).forEach(m => {
    console.log('  [' + m.matchType + ']', m.id, '-', m.agent.name_zh || m.agent.name);
});