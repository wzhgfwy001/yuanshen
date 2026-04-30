# 失败教训 - 调试日志无法查看

**时间：** 2026-04-25T11:27:00.000Z
**任务：** StoryFlow项目开发
**任务类型：** project_development

## 失败模式

debug_logs_not_visible + print_statements_not_shown + no_log_output_destination

## 发生场景

project_development storyflow debugging logs python node windows frontend backend

## 根因

1. **print语句没有输出** - 添加了print语句但看不到输出
2. **日志没有正确配置** - 日志输出到stderr或文件，但用户不知道在哪里查看
3. **前端日志和后端日志分离** - 后端日志在终端，前端日志在浏览器控制台
4. **WebSocket日志没有正确显示** - WebSocket的日志没有输出到用户可见的地方
5. **调试时不知道程序执行到哪一步** - 无法追踪代码执行流程

## 影响范围 10/10 - 项目被用户删除

## 避免方式

日志配置标准：
```python
import logging
import sys

# 配置日志同时输出到stdout和文件
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),  # 终端可见
        logging.FileHandler('app.log')       # 文件保存
    ]
)
```

前端日志配置：
```javascript
// 确保console.log输出到DevTools
console.log('Debug info:', data);

// 使用日志管理工具
import { debug } from 'debug';
const log = debug('app:module');
log('This will show in DevTools');
```

## 改进建议

1. 调试前确保日志输出可见
2. 使用标准日志库而非print
3. 日志同时输出到终端和文件
4. 确保DevTools/终端可以查看日志
5. 验证日志配置正确后再调试

---
*手动记录 by 元神 - 2026-04-25*
