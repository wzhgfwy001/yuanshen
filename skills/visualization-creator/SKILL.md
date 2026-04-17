---
name: visualization-creator
description: "可视化助手。生成美观的HTML页面，用于技术图表、数据表格、架构图、流程图等可视化内容。Triggers on: '可视化', '生成图表', '图表', '可视化页面', 'visualization'."
version: 1.0.0
intranet: compatible
intranet_notes: "生成纯本地HTML文件，browser工具打开可能有部分网站限制"
metadata:
  {
    "openclaw":
      {
        "emoji": "📈",
        "category": "visualization",
      },
  }
---

# visualization-creator

**【召唤视觉】Summon Vision** — 

## 功能

生成自包含的HTML文件，用于：
- 技术架构图
- 流程图
- 数据表格
- 对比图
- 系统架构
- 状态图
- 时间线

**当需要展示4+行或3+列的表格数据时，自动生成HTML页面。**

## 内网兼容性

- ✅ `read` - 读取数据源文件
- ✅ `write` - 写入HTML可视化文件
- ✅ `exec` - 执行脚本处理数据
- ✅ `browser` - 打开本地生成的HTML文件（部分网站受限，但本地文件正常）
- ✅ 所有核心功能完全可用

## 工作流程

```
1. 理解需求 → 2. 选择图表类型 → 3. 设计风格 → 4. 生成HTML → 5. 打开浏览器
```

### 步骤1：理解需求

- 谁在查看？（开发者/PM/用户）
- 图表类型？（架构/流程/数据/对比）
- 需要什么风格？（技术感/简洁/现代）

### 步骤2：选择图表类型

| 图表类型 | 推荐方案 |
|---------|---------|
| 架构图（文字多） | HTML + CSS Grid |
| 架构图（连接多） | Mermaid |
| 流程图 | Mermaid |
| 数据表格 | HTML <table> |
| 时间线 | CSS（中心线+卡片） |
| 状态图 | Mermaid flowchart |
| 对比表 | HTML table |

### 步骤3：设计风格选项

- **技术感** — 深色背景，代码字体，网格线
- **简洁** — 白色背景，最小边框，清晰层次
- **现代** — 渐变色，阴影效果，平滑动画
- **复古** — 纸张纹理，手绘风格边框

### 步骤4：生成HTML

输出到 `skills/visualization-creator/outputs/` 或用户指定目录

### 步骤5：打开浏览器

- Windows: 直接打开文件 ✅
- 告知用户文件路径

---

## HTML模板结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>图表标题</title>
  <style>
    :root {
      --bg: #fafafa;
      --surface: #ffffff;
      --border: rgba(0,0,0,0.08);
      --text: #1a1a2e;
      --text-dim: #666;
      --accent: #4361ee;
      --accent-dim: rgba(67,97,238,0.1);
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 2rem;
    }
    .card {
      background: var(--surface);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th { font-weight: 600; }
  </style>
</head>
<body>
  <!-- 内容 -->
</body>
</html>
```

---

## 数据表格模板

```html
<div class="table-container">
  <table>
    <thead>
      <tr>
        <th>列1</th>
        <th>列2</th>
        <th>列3</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>数据1</td>
        <td>数据2</td>
        <td>数据3</td>
      </tr>
    </tbody>
  </table>
</div>

<style>
.table-container { overflow-x: auto; }
table th { 
  position: sticky; 
  top: 0; 
  background: var(--surface);
}
tr:hover { background: var(--accent-dim); }
</style>
```

---

## 质量检查

交付前检查：
- [ ] 两种主题（亮/暗）都正常显示
- [ ] 无内容溢出
- [ ] 响应式（移动端正常）
- [ ] 文件可独立打开

## 内网使用提示

1. **提供数据** - 直接提供数据内容或数据文件路径
2. **选择风格** - 说明想要的视觉风格
3. **输出位置** - 可指定文件保存路径
4. **浏览器打开** - 生成后自动在浏览器中打开

---
