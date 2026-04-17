---
name: content-publisher
description: "内容发布助手。将内容保存到本地文件（Markdown/TXT/HTML），支持生成可直接复制粘贴的格式，也可调用本地工具发布到内网系统。Triggers on: '发布内容', '保存内容', '导出内容', 'publish', '输出'."
version: 1.1.0
intranet: fully_compatible
intranet_notes: "已移除所有外网平台发布依赖，改为使用本地文件输出和内网系统集成。支持保存到指定目录、生成可复制格式、调用本地工具处理。"
metadata:
  {
    "openclaw":
      {
        "emoji": "🚀",
        "category": "content",
      },
  }
tools:
  available: [read, write, edit, exec, pdf, sessions_spawn]
  limited: [web_search, web_fetch, browser]
---

# content-publisher

**【传递图腾】Totemic Transmission** — 

## 功能

将内容保存到本地或内网系统：
- **本地文件输出** - 保存为 Markdown/TXT/HTML/JSON
- **指定目录输出** - 桌面、工作区、指定文件夹
- **可复制格式** - 生成可直接粘贴的格式化内容
- **内网系统集成** - 调用本地工具/脚本处理
- **Webhook推送** - 推送到钉钉/飞书等内网Webhook

## 内网兼容性

| 功能 | 状态 | 说明 |
|------|------|------|
| 内容准备/编辑 | ✅ | 使用 xiaohongshu-editor 准备内容 |
| 本地文件写入 | ✅ | write 工具保存到本地 |
| 指定目录输出 | ✅ | exec + 文件操作 |
| 可复制格式生成 | ✅ | write 生成格式化内容 |
| 内网Webhook | ✅ | exec + curl 推送 |
| 本地工具调用 | ✅ | exec 调用处理脚本 |
| 浏览器打开 | ⏸️ | 可选 - 仅内网URL |
| 外网平台发布 | ⏸️ | 需要用户手动发布 |

## 内网替代方案

### 方案1：本地文件保存（推荐）
```
准备内容 → write 保存到指定路径 → 用户手动发布
```

### 方案2：可复制格式输出
```
准备内容 → 生成格式化文本 → 用户复制粘贴发布
```

### 方案3：内网Webhook推送
```
准备内容 → exec + curl → 推送到钉钉/飞书群
```

### 方案4：本地脚本处理
```
准备内容 → exec 调用本地工具 → 处理后输出
```

## 输出格式

### Markdown格式（.md）
```markdown
# 标题

正文内容...

## 标签
#标签1 #标签2

---
来源：xxx
```

### HTML格式（.html）
```html
<div class="content">
  <h1>标题</h1>
  <p>正文内容...</p>
  <div class="tags">
    <span>#标签1</span>
    <span>#标签2</span>
  </div>
</div>
```

### 纯文本格式（.txt）
```
【标题】
正文内容...

标签：#标签1 #标签2
来源：xxx
```

### JSON格式（.json）
```json
{
  "title": "标题",
  "content": "正文内容",
  "tags": ["标签1", "标签2"],
  "source": "来源"
}
```

## 发布流程

### 方式1：本地保存（当前标准流程）
```
准备素材 → 选择格式 → write 保存 → 用户复制发布
```

1. 使用 `xiaohongshu-editor` 准备内容
2. 选择输出格式（Markdown/HTML/TXT/JSON）
3. 使用 `write` 保存到指定路径
4. 用户复制内容到目标平台手动发布

### 方式2：内网Webhook推送
```
准备素材 → 构建Webhook请求 → exec curl 推送
```

**钉钉Webhook示例：**
```powershell
$body = @{
    msgtype = "text"
    text = @{
        content = "内容文本"
    }
} | ConvertTo-Json -Compress

curl -Method POST -Body $body -Uri "https://oapi.dingtalk.com/robot/send?access_token=xxx"
```

**飞书Webhook示例：**
```powershell
$body = @{
    msg_type = "text"
    content = @{
        text = "内容文本"
    }
} | ConvertTo-Json -Compress

curl -Method POST -Body $body -Uri "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
```

### 方式3：指定目录输出
```
准备素材 → 选择目标目录 → write 保存
```

支持的输出目录：
- 桌面：`$env:USERPROFILE\Desktop\`
- 工作区：`C:\Users\DELL\.openclaw\workspace\`
- 自定义路径

---

## 内容工作流

```
1. content-collector  → 采集内容（本地/内网）
2. xiaohongshu-editor → 改写内容 ✅
3. content-publisher   → 保存本地 ✅
```

---

## 输出检查清单

发布前确认：

- [ ] 内容已审核（无敏感词）
- [ ] 格式符合目标平台要求
- [ ] 标签/话题已添加
- [ ] 文件名规范清晰
- [ ] 编码格式正确（UTF-8）

---

## 自动化配置（本地工具）

如需调用本地工具处理：

```powershell
# 调用本地脚本处理
.\process-content.ps1 -InputFile "content.md" -OutputFormat "html"

# 调用Python脚本
python process.py --input content.md --output result.html
```

---

## 安全建议

1. **不要在代码中硬编码敏感信息**
2. **使用环境变量存储Webhook Token**
3. **发布前人工审核内容**
4. **注意文件编码兼容性**

---

## 当前状态

| Phase | 功能 | 状态 |
|-------|------|------|
| Phase 1 | 内容编辑技能 | ✅ 已就绪 |
| Phase 2 | 本地文件输出 | ✅ 已就绪 |
| Phase 3 | 内网Webhook推送 | ✅ 已就绪 |
| Phase 4 | 外网平台自动发布 | ⏸️ 需用户手动 |

---

## 内网使用建议

1. **选择本地保存** - 推荐使用本地文件输出
2. **使用可复制格式** - 生成格式化的文本直接粘贴
3. **Webhook推送** - 配置钉钉/飞书Webhook实现自动推送
4. **手动发布** - 外网平台建议手动发布以确保效果

---

## 工具使用示例

### 保存到桌面
```powershell
$content = "# 标题`n`n正文..."
$path = "$env:USERPROFILE\Desktop\内容_$(Get-Date -Format 'yyyyMMdd_HHmmss').md"
Write-Content -Path $path -Content $content
```

### 推送到钉钉群
```powershell
curl -Method POST `
  -Body '{"msgtype":"text","text":{"content":"内容"}}' `
  -Uri "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN"
```

### 生成可复制格式
```powershell
# 输出到剪贴板（PowerShell 5+）
$content | Set-Clipboard

# 或输出到临时文件供用户复制
$content | Out-File -FilePath "$env:TEMP\copyable_content.md" -Encoding UTF8
```

