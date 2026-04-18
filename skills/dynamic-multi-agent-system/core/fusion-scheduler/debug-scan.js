const fs = require('fs');
const path = require('path');

const WORKSPACE = process.env.WORKSPACE_PATH || 'C:/Users/DELL/.openclaw/workspace';

function extractPersonaInfo(skillPath, fallbackName) {
  try {
    const content = fs.readFileSync(skillPath, 'utf8');
    let realName = null;
    
    // 方式1: frontmatter中description包含的"XX视角"或"XX·"
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/m);
    if (frontmatterMatch) {
      const fm = frontmatterMatch[1];
      const descMatch = fm.match(/description:[\s]*[|:]?\s*([^\n]+)/);
      if (descMatch) {
        const descText = descMatch[1];
        const viewMatch = descText.match(/([^\s*]+)视角/);
        if (viewMatch) {
          realName = viewMatch[1].trim();
        } else {
          const chineseMatch = descText.match(/[\u4e00-\u9fa5]{2,4}/);
          if (chineseMatch) {
            realName = chineseMatch[0];
          }
        }
      }
    }
    
    // 方式2: 表格中的"角色名称"或"**名字**"
    if (!realName) {
      const nameMatch = content.match(/角色名称\s*[|:]\s*\*\*([^\*]+)\*\*/);
      if (nameMatch) {
        realName = nameMatch[1].trim();
      }
    }
    
    // 方式3: 标题格式 # 名字 · ... 或 # 名字 - ...
    if (!realName) {
      const titleMatch = content.match(/^#\s+([^\s·-]+?)(?:\s*[·-]|$)/m);
      if (titleMatch) {
        realName = titleMatch[1].trim();
      }
    }
    
    // 方式4: 标题格式 # 名字AI角色
    if (!realName) {
      const titleMatch = content.match(/^#\s*([^\n#]+?)AI角色/i);
      if (titleMatch) {
        realName = titleMatch[1].trim();
      }
    }
    
    const personaName = realName || fallbackName;
    
    return { name: personaName, fallbackName };
  } catch (e) {
    return { name: fallbackName, fallbackName };
  }
}

// 测试提取
const testPaths = [
  ['毛泽东', 'C:/Users/DELL/.openclaw/workspace/brain/agents/mao-zedong/SKILL.md'],
  ['张雪峰', 'C:/Users/DELL/.openclaw/workspace/brain/agents/zhang-xuefeng/SKILL.md']
];

console.log('=== 测试人格信息提取 ===\n');

for (const [expected, skillPath] of testPaths) {
  const info = extractPersonaInfo(skillPath, expected);
  console.log(`${expected}:`);
  console.log(`  提取结果: "${info.name}"`);
  console.log(`  匹配: ${info.name === expected ? '✅' : '❌'}`);
}
