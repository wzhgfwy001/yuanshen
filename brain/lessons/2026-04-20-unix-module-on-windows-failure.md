# 失败教训 - Unix-only模块在Windows上使用

**时间：** 2026-04-20T07:21:00.000Z
**任务：** Vite/Node Windows SIGKILL问题调试
**任务类型：** debugging

## 失败模式

unix_only_module_windows + resource_setrlimit_error + cross_platform_compatibility

## 发生场景

debugging vite node python windows unix memory_limit devops

## 根因

1. **resource模块是Unix-only** - resource.setrlimit()在Windows上不可用
2. **跨平台兼容性问题** - 代码在Windows上运行但使用了Unix特有功能
3. **没有平台检测** - 代码没有检查当前操作系统类型
4. **错误处理不当** - import resource失败时没有优雅降级

## 影响范围 10/10 - 代码错误，功能部分失效

## 避免方式

跨平台内存限制：
```python
import platform
import os

def set_memory_limit(max_bytes):
    system = platform.system()
    
    if system == 'Linux':
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (max_bytes, max_bytes))
    elif system == 'Windows':
        # Windows上使用job对象限制内存
        import ctypes
        # 或者使用启动参数限制
        pass
    else:
        # macOS或其他Unix系统
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (max_bytes, max_bytes))

def is_unix():
    return platform.system() in ['Linux', 'Darwin']

def require_unix():
    if not is_unix():
        raise OSError("This feature requires Unix/Linux/macOS")
```

## 改进建议

1. 使用跨平台库而非平台特有API
2. 使用前检查平台类型
3. 不支持的平台上优雅降级
4. 使用启动参数限制（如Node的--max-old-space-size）

---
*手动记录 by 元神 - 2026-04-25*
