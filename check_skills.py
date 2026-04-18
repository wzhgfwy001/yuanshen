import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = r'C:\Users\DELL\.openclaw\workspace\github-yangshen\SKILL.md'

with open(filepath, 'rb') as f:
    data = f.read()

text = data.decode('utf-8')
lines = text.split('\n')

# What we have
print('=== CURRENT (garbled) ===')
for i in range(469, 475):
    print(f'Line {i+1}: {repr(lines[i])}')

# What the corrected content should be
corrected = {}
corrected[469] = '| 版本 | 核心新增 |'
corrected[470] = '| **v1.3** | 24+任务模板库、多种导出格式(HTML/JSON/TXT/MD/CSV)、多级缓存(L1内存/L2磁盘/L3语义)、监控告警 |'
corrected[471] = '| **v1.3.1** | Agent角色18类、40种（含数据/开发/创意/专业/运营类）、模型选择器v2.0（自动复杂度评估/成本优化/备选链）、100+错误码、19绫? |'
corrected[472] = '| **v1.6** | 数据分析模块整合（Excel/CSV/Word/PDF多格式分析、统计汇总、报告导出） |'
corrected[473] = '| **v1.7** | 瓶颈诊断层（问题层次L0-L5/单一入口原则）、标准化输出模板、执行流程升级（12步） |'

print('\n=== CORRECTED ===')
for i in range(469, 475):
    print(f'Line {i+1}: {repr(corrected[i])}')
