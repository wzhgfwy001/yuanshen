const { YangShenFlow } = require('C:/Users/DELL/.openclaw/workspace/skills/dynamic-multi-agent-system/core/flow/yangshen-flow.js');

async function test() {
    console.log('='.repeat(60));
    console.log('Testing YangShenFlow v3.0');
    console.log('='.repeat(60));
    
    const flow = new YangShenFlow();
    flow.plot();
    
    console.log('\nExecuting Flow...\n');
    const result = await flow.execute('生成一首关于春天的歌曲');
    
    console.log('\nResults:');
    console.log('  Success:', result.success);
    console.log('  Agent Count:', result.agentCount);
    console.log('  Team Size:', result.teamSize);
    console.log('  Spawn Configs:', result.spawnConfigs?.length || 0);
    
    if (result.spawnConfigs?.length > 0) {
        console.log('\nSpawn Configs:');
        result.spawnConfigs.slice(0, 2).forEach((c, i) => {
            console.log('  [' + (i+1) + ']', c.label);
            console.log('      model:', c.model);
            console.log('      timeout:', c.runTimeoutSeconds + 's');
        });
    }
    
    console.log('\nSteps:');
    result.steps.forEach(s => {
        console.log('  -', s.step + ':' + s.status);
    });
    
    console.log('\nTest complete!');
}

test().catch(e => {
    console.error('Test failed:', e.message);
    process.exit(1);
});