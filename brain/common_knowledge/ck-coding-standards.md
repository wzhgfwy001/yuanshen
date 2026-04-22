# 代码编写规范

## 核心理念
- **简单优先**：最小代码解决问题，不做 speculative 开发
- **精准修改**：只改必要的，不"改进"相邻代码
- **可验证**：每一行改动都能追溯到用户需求

## Python 规范
- 使用 `r"raw string"` 处理正则表达式
- 文件保存为 UTF-8 编码
- 函数添加 docstring 说明参数和返回值
- 异常处理要具体，不 bare except

## JavaScript 规范
- 使用 camelCase 命名变量
- 使用 PascalCase 命名类和组件
- 函数参数提供默认值
- 异步操作添加错误处理

## PowerShell 规范
- 使用 `$true`/`$false` 而非 `True`/`False`
- 使用 `Get-Content -Encoding UTF8`
- 管道操作注意性能

## 触发条件
- 任何代码编写任务
- 任何代码审查任务
