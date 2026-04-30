const { YangShenFlow, YangShenCrew } = require('C:/Users/DELL/.openclaw/workspace/skills/dynamic-multi-agent-system/core/flow/yangshen-flow.js');

async function test() {
    console.log('='.repeat(60));
    console.log('Testing YangShenFlow v3.1 - Full CrewAI Integration');
    console.log('='.repeat(60));
    
    const flow = new YangShenFlow();
    flow.plot();
    
    console.log('\n🚀 Executing Flow...\n');
    const result = await flow.execute('生成一首关于春天的歌曲');
    
    console.log('\n📋 Results:');
    console.log('  Success:', result.success);
    console.log('  Agent Count:', result.agentCount);
    console.log('  Team Size:', result.teamSize);
    console.log('  Task Type:', result.taskType);
    console.log('  Complexity:', JSON.stringify(result.complexity));
    console.log('  Spawn Configs:', result.spawnConfigs?.length || 0);
    console.log('  Quality:', result.qualityResult?.passed ? 'Passed' : 'Failed');
    
    if (result.spawnConfigs?.length > 0) {
        console.log('\n📦 Spawn Configs:');
        result.spawnConfigs.forEach((c, i) => {
            console.log('  [' + (i+1) + ']', c.label);
            console.log('      model:', c.model);
            console.log('      timeout:', c.runTimeoutSeconds + 's');
        });
    }
    
    console.log('\n📊 Steps:');
    result.steps.forEach(s => {
        console.log('  -', s.step + ':' + s.status);
    });
    
    // Test Crew
    console.log('\n' + '='.repeat(60));
    console.log('Testing YangShenCrew - Multiple Flows');
    console.log('='.repeat(60));
    
    const crew = new YangShenCrew({ verbose: true });
    crew.addFlow(new YangShenFlow(), { name: 'flow1' });
    crew.addFlow(new YangShenFlow(), { name: 'flow2' });
    
    console.log('\n🚀 Executing Crew...');
    const crewResults = await crew.execute('测试多Flow协作');
    
    console.log('\n📋 Crew Results:');
    crewResults.forEach((r, i) => {
        console.log('  [' + (i+1) + ']', r.flow, '-', r.success ? 'Success' : 'Failed');
    });
    
    console.log('\n✅ All tests complete!');
}

test().catch(e => {
    console.error('Test failed:', e.message);
    console.error(e.stack);
    process.exit(1);
});