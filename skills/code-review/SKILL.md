---
name: code-review-assistant
description: "代码审查助手。Use when user asks to review, audit, or check code for bugs, performance issues, security vulnerabilities, or code quality. Triggers on: '审查代码', 'code review', '检查代码', 'review code', '代码审计'."
version: 1.0.0
intranet: compatible
intranet_notes: "完全基于本地文件读取，无外部依赖"
metadata:
  {
    "openclaw":
      {
        "emoji": "🔍",
        "category": "development",
      },
  }
---

# code-review

**【寻找弱点】Expose Weakness** — 

## Quick Start

Use this skill when user asks to review code.

## 内网兼容性

- ✅ `read` - 读取本地代码文件
- ✅ `write` - 写入审查报告
- ✅ `edit` - 修改代码建议
- ✅ `exec` - 执行代码（可选，用于动态验证）
- ⚠️ `web_search` - 外网受限，如需搜索请提供本地文档
- ⚠️ `browser` - 有限制，建议直接读取文件

## Review Process

1. **Understand the code** - Read and analyze the code
2. **Check for bugs** - Syntax errors, logic errors, edge cases
3. **Check performance** - Time complexity, memory usage
4. **Check security** - Input validation, SQL injection, XSS
5. **Check style** - Naming conventions, code formatting
6. **Provide suggestions** - Specific, actionable improvements

## Review Checklist

### CLAUDE.md 四原则检查（必检）

| 原则 | 检查项 |
|------|--------|
| **Think Before Coding** | 是否有不确定的地方未澄清？是否有更简单的方案？ |
| **Simplicity First** | 代码是否过度设计？是否有不必要的抽象？ |
| **Surgical Changes** | 改动是否精准？是否有改动了不必要的地方？ |
| **Goal-Driven** | 是否有可验证的成功标准？改动是否达到目标？ |

### 标准检查项

| Category | Items |
|----------|-------|
| Bugs | Syntax, logic, edge cases, null/undefined |
| Performance | O(n), loops, memory, caching |
| Security | Input validation, SQL injection, XSS |
| Style | Naming, formatting, comments |
| Best Practices | DRY, SOLID, patterns |

## Output Format

```markdown
## 📋 Code Review Summary

### Issues Found
| Severity | Issue | Location | Suggestion |
|----------|-------|----------|------------|
| 🔴 High | ... | ... | ... |
| 🟡 Medium | ... | ... | ... |
| 🟢 Low | ... | ... | ... |

### Overall Score
[1-10 with explanation]

### Recommendations
1. ...
2. ...
3. ...
```

## 内网使用提示

1. **提供文件路径** - 告知要审查的文件路径
2. **多文件审查** - 可同时提供多个文件或目录
3. **指定语言** - 如涉及特定编程语言请说明
4. **审查报告** - 默认输出Markdown格式，可另存为文件

---
