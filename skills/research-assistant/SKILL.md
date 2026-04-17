---
name: research-assistant
description: "研究助手。整理分析主题相关的论文、项目、资料，生成结构化研究报告。Triggers on: '研究', '调研', 'research', '整理资料', '生成报告'."
version: 1.1.0
intranet: fully_compatible
intranet_notes: "已移除所有外网依赖，改为使用本地文件搜索、读取和本地服务访问。支持PDF分析、本地文件全文搜索、用户粘贴内容分析。"
metadata:
  {
    "openclaw":
      {
        "emoji": "🔬",
        "category": "research",
      },
  }
tools:
  available: [read, write, edit, exec, pdf, sessions_spawn]
  limited: [web_search, web_fetch, browser]
---

# research-assistant

**【考古学】Archaeology** — 

## When to Use

Use this skill when user asks to:
- Research a topic and generate a report
- Survey papers, articles, or resources
- Track trends in a specific field
- Organize and summarize information

## 内网兼容性

| 工具 | 状态 | 说明 |
|------|------|------|
| `read` | ✅ | 读取本地文档/论文/文本文件 |
| `write` | ✅ | 写入研究报告 |
| `edit` | ✅ | 编辑/修改文档 |
| `exec` | ✅ | 搜索本地文件内容（Select-String/grep） |
| `pdf` | ✅ | 分析本地PDF文档 |
| `sessions_spawn` | ✅ | 启动子Agent并行处理 |
| `web_search` | ⏸️ | 可选 - 有网络时可用 |
| `web_fetch` | ⏸️ | 可选 - 有网络时可用 |
| `browser` | ⏸️ | 可选 - 仅内网URL或本地文件 |

## 内网替代方案

### 方案1：本地资料研究（推荐）
```
用户提供本地文档目录 → 使用 read/pdf 读取 → 整理分析 → 输出报告
```

### 方案2：本地文件全文搜索
```
用户提供关键词 → 使用 exec + Select-String/grep 搜索工作区 → 整理结果 → 生成报告
```

### 方案3：用户提供资料
```
用户提供已有的资料/笔记/文字内容 → 整理归纳 → 生成报告
```

### 方案4：PDF论文分析
```
用户提供PDF文件路径 → 使用 pdf 分析 → 提取关键信息 → 生成报告
```

## Process

### Phase 1: Information Collection

1. **Identify data sources** - Ask user for preferred sources:
   - 本地文档/文件夹路径（✅ 完全支持）
   - 用户粘贴的文字内容（✅ 完全支持）
   - 内网服务/系统（✅ 使用 exec curl 访问）
   - PDF文件路径（✅ 使用 pdf 工具）

2. **Set scope** - Confirm:
   - Number of items to analyze (default: 10)
   - Depth of analysis (brief/detailed)
   - Output language

3. **Gather information** - Tools in priority order:
   - `read`: 本地文本/文档文件
   - `pdf`: 本地PDF文件
   - `exec` + Select-String: 搜索本地文件内容
   - `exec` + curl: 访问内网API/服务

### Phase 2: Analysis

For each item collected:
1. Extract key information (title, source, date, summary)
2. Categorize by type (paper/project/article/tool)
3. Identify key insights
4. Note limitations or caveats

### Phase 3: Report Generation

Output a structured Markdown report:

```markdown
# Research Report: [Topic]

**Generated:** [Date]
**Scope:** [Items analyzed]
**Data Sources:** [local/mixed]

## Summary

| Metric | Value |
|--------|-------|
| Total Items | X |
| Sources | X |
| Categories | X |

## Key Findings

### [Category 1]
- **[Title]**: [Brief description + source]

### [Category 2]
- **[Title]**: [Brief description + source]

## Trends & Insights

[What patterns or trends emerged]

## Recommendations

[Actionable suggestions based on findings]

## References

- [Source 1] - [local/internal]
- [Source 2] - [local/internal]
```

## Quality Checklist

- [ ] Sources are credible and relevant
- [ ] All items have proper citations
- [ ] Categories are logical and consistent
- [ ] Key findings are clearly stated
- [ ] Report is actionable

## Customization Options

| Option | Values | Default |
|--------|--------|---------|
| depth | brief/detailed | detailed |
| format | markdown/json/html | markdown |
| categories | auto/custom | auto |
| limit | number | 10 |

## 内网使用建议

1. **提供本地资料路径** - 文件夹路径、PDF文件路径
2. **粘贴文字内容** - 直接提供要分析的文字资料
3. **明确研究范围** - 具体的研究主题和边界
4. **指定关键词搜索** - 如需搜索，提供关键词和搜索路径

---

## 工具使用示例

### 搜索本地文件内容（Windows）
```powershell
Select-String -Path "C:\path\to\files\*.md" -Pattern "关键词" -Recurse
```

### 搜索本地文件内容（Linux/Mac）
```bash
grep -rn "关键词" /path/to/files/
```

### 访问内网API
```powershell
curl -Method GET "http://internal-api.example.com/data"
```

