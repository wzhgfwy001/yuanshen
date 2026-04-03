# 混合动态多Agent协作系统

🤖 **Dynamic Multi-Agent Collaboration System**

让单一主Agent能够动态创建、管理、协调多个临时子Agent，完成复杂任务。

---

## 🌟 核心能力

- 📋 **智能任务分解** - 自动识别任务类型，分解为可执行子任务
- 🎯 **动态子Agent组建** - 按需创建专业子Agent，任务完成后自动清理
- ✅ **全流程质量控制** - 三层检查机制，确保输出质量
- 🔄 **持续进化** - 成功流程自动固化为Skill，系统能力持续增长

---

## 🚀 快速开始

### 基础用法

```
任务：写一本科幻小说，主题"2077年的北京"
```

系统会自动：
1. 识别为"创新任务"
2. 分解为：搜索→大纲→写作→审查
3. 创建对应子Agent
4. 执行并交付结果

### 任务类型

| 类型 | 示例 | 处理方式 |
|------|------|----------|
| 单一任务 | "翻译这段文字" | 主Agent直接执行 |
| 标准任务 | "写科幻小说"（已有Skill） | 加载Skill执行 |
| 创新任务 | "设计公司管理体系" | 动态组建子Agent团队 |

---

## 📦 系统架构

```
主Agent (单一常驻)
    │
    ├── 任务分类器 → 判断任务类型
    ├── 任务分解器 → 分解为子任务
    ├── 队伍组建器 → 创建子Agent
    ├── 执行协调器 → 协调执行顺序
    ├── 质量检查器 → 三层质量检查
    ├── Skill进化分析器 → 固化成功流程
    └── 资源清理器 → 清理临时资源
```

---

## 📁 目录结构

```
dynamic-multi-agent-system/
├── README.md              # 本文件
├── SKILL.md               # 核心Skill定义
├── manifest.json          # Skill元数据
├── core/                  # 核心组件
│   ├── task-classifier/
│   ├── task-decomposer/
│   ├── subagent-manager/
│   ├── quality-checker/
│   ├── skill-evolution/
│   └── resource-cleaner/
├── templates/             # 预置模板
├── examples/              # 使用示例
└── docs/                  # 详细文档
```

---

## 🔧 配置选项

```yaml
# 可选配置（~/.openclaw/openclaw.json）
{
  "multi-agent": {
    "max-concurrent-tasks": 3,      # 最多并发任务数
    "max-sub-agents": 12,           # 最多子Agent数
    "enable-evolution": true,       # 启用Skill进化
    "confidence-threshold": 0.7     # 任务分类置信度
  }
}
```

---

## 📋 使用示例

### 示例1：创意写作

```
任务：写一篇悬疑短篇小说
要求：
- 暴风雪山庄模式
- 密室杀人
- 10章，每章1000字
```

**系统执行流程：**
1. 案件分析专家 → 设计案件手法
2. 悬疑大纲专家 → 设计10章大纲
3. 悬疑写作专家 → 撰写各章内容
4. 审查Agent → 全流程质量审查

---

### 示例2：数据分析

```
任务：分析销售数据并生成报告
数据：[附件：sales_2026.xlsx]
要求：
- 同比/环比分析
- 趋势预测
- 可视化图表
```

**系统执行流程：**
1. 数据分析专家 → 数据处理和分析
2. 可视化专家 → 生成图表
3. 报告撰写专家 → 撰写分析报告
4. 审查Agent → 数据准确性审查

---

### 示例3：代码开发

```
任务：开发一个待办事项Web应用
要求：
- React前端
- Node.js后端
- MongoDB数据库
- 用户认证
```

**系统执行流程：**
1. 需求分析专家 → 细化需求
2. 架构设计专家 → 技术架构设计
3. 前端开发专家 → React开发
4. 后端开发专家 → Node.js开发
5. 测试专家 → 单元测试
6. 审查Agent → 代码审查

---

## ⚙️ 系统要求

- OpenClaw >= 1.0.0
- 配置至少一个可用模型
- 推荐模型：qwen3.5-plus（通用任务）

---

## 📚 更多文档

- [架构说明](docs/architecture.md)
- [部署指南](docs/deployment.md)
- [API参考](docs/api-reference.md)
- [故障排除](docs/troubleshooting.md)
- [贡献指南](docs/contribution.md)

---

## 📄 许可证

MIT License

## 👥 作者

Dynamic Multi-Agent System Team

## 🌐 主页

https://github.com/openclaw/dynamic-multi-agent-system
