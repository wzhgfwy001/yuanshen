# Test YangShenFlow v3.0
$env:NODE_PATH = "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core"

node -e "
const { YangShenFlow } = require('C:/Users/DELL/.openclaw/workspace/skills/dynamic-multi-agent-system/core/flow/yangshen-flow.js');

async function test() {
    console.log('='.repeat(60));
    console.log('测试 YangShenFlow v3.0');
    console.log('='.repeat(60));
    
    const flow = new YangShenFlow();
    flow.plot();
    
    console.log('\n🚀 执行Flow...\n');
    const result = await flow.execute('生成一首关于春天的歌曲');
    
    console.log('\n📋 执行结果:');
    console.log('  Success:', result.success);
    console.log('  Agent数量:', result.agentCount);
    console.log('  Team Size:', result.teamSize);
    console.log('  Spawn配置:', result.spawnConfigs?.length || 0);
    console.log('  执行结果:', result.executionResults?.success);
    console.log('  质量检查:', result.qualityResult?.passed);
    
    if (result.spawnConfigs?.length > 0) {
        console.log('\n📦 Spawn配置:');
        result.spawnConfigs.slice(0, 2).forEach((c, i) => {
            console.log('  [' + (i+1) + ']', c.label);
            console.log('      model:', c.model);
            console.log('      timeout:', c.runTimeoutSeconds + 's');
            console.log('      prompt长度:', c.systemPrompt?.length || 0);
        });
    }
    
    console.log('\n📊 步骤记录:');
    result.steps.forEach(s => {
        const info = s.count ? ' (' + s.count + ' agents)' : '';
        console.log('  -', s.step + ':' + s.status + info);
    });
    
    console.log('\n✅ 测试完成');
}

test().catch(console.error);
"