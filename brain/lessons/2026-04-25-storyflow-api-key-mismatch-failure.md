# 失败教训 - StoryFlow API Key名称不匹配

**时间：** 2026-04-25T11:27:00.000Z
**任务：** StoryFlow项目开发
**任务类型：** project_development

## 失败模式

storyflow_api_key_mismatch + env_var_name_mismatch + wrong_key_lookup

## 发生场景

project_development storyflow api_key environment_variable python windows node

## 根因

1. **代码查找错误的变量名** - nodes.py查找STORYFLOW_API_KEY
2. **实际环境变量名不同** - 实际环境变量是MINIMAX_API_KEY
3. **没有验证环境变量** - 调试前没有先检查环境变量名称和实际值是否匹配
4. **多个问题同时出现** - API Key问题和端口冲突问题同时存在，难以诊断

## 影响范围 10/10 - 项目被用户删除

## 避免方式

调试前先验证环境变量：
```powershell
# 列出所有环境变量
Get-ChildItem Env:

# 检查特定变量
$env:STORYFLOW_API_KEY
$env:MINIMAX_API_KEY
```

或者在代码中添加启动时检查：
```python
import os

required_keys = ['STORYFLOW_API_KEY', 'MINIMAX_API_KEY']
for key in required_keys:
    value = os.environ.get(key)
    print(f"{key}: {'Set' if value else 'NOT SET'}")
```

## 改进建议

1. 调试前先验证环境变量名称和值
2. 如果多个相关问题同时出现，先解决依赖问题（如API Key）
3. 不要在环境变量未确认的情况下调试其他问题
4. 使用启动检查脚本验证所有依赖

---
*手动记录 by 元神 - 2026-04-25*
