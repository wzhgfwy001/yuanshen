# 失败教训 - StoryFlow WebSocket端口冲突

**时间：** 2026-04-25T11:27:00.000Z
**任务：** StoryFlow项目开发
**任务类型：** project_development

## 失败模式

storyflow_ws_port_conflict + multiple_processes_same_port + no_port_check

## 发生场景

project_development storyflow websocket backend frontend node python windows

## 根因

1. **端口被占用** - 5001端口已被另一个进程占用
2. **没有检测端口** - 启动服务前没有检查端口是否已被占用
3. **多次重启加剧问题** - 启动失败后多次重启，导致端口一直被占用
4. **缺乏端口冲突处理** - 代码中没有优雅处理端口已被占用的情况

## 影响范围 10/10 - 项目被用户删除

## 避免方式

启动服务前检查端口：
```powershell
# 检查端口是否被占用
Get-NetTCPConnection -LocalPort 5001

# 或
netstat -ano | findstr :5001
```

端口冲突处理：
```python
import socket

def is_port_available(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', port))
            return True
        except OSError:
            return False
```

## 改进建议

1. 启动服务前检查端口是否可用
2. 如果端口被占用，尝试下一个端口或报错退出
3. 不要反复重启被占用的端口
4. 日志必须输出到可查看的位置

---
*手动记录 by 元神 - 2026-04-25*
