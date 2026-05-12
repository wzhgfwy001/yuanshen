# 贡献指南

欢迎为混合动态多 Agent 系统做出贡献！🎉

---

## 如何贡献

### 1. 报告问题

发现 Bug 或有改进建议？请创建 Issue：

**问题报告模板：**
```markdown
### 问题描述
[清晰描述问题]

### 重现步骤
1. ...
2. ...
3. ...

### 期望行为
[应该发生什么]

### 实际行为
[实际发生了什么]

### 环境信息
- OpenClaw 版本：
- 模型：
- 系统版本：

### 日志
[相关日志片段]
```

---

### 2. 提交新 Skill 模板

开发了新的任务流程？可以贡献为 Skill 模板：

**目录结构：**
```
templates/[skill-name]/
├── template.json          # 模板定义
├── [skill-name]-checklist.md  # 质量检查清单
└── README.md              # 使用说明
```

**template.json 示例：**
```json
{
  "name": "business-plan-creation",
  "description": "商业计划书创作",
  "version": "1.0.0",
  "flow": [
    {
      "step": 1,
      "role": "市场分析专家",
      "prompt-template": "分析 [行业] 的市场规模、竞争格局...",
      "output": "market-analysis"
    },
    {
      "step": 2,
      "role": "商业模式专家",
      "prompt-template": "基于市场分析，设计商业模式...",
      "input": ["market-analysis"],
      "output": "business-model"
    }
  ],
  "checklist": "business-plan-checklist.md"
}
```

---

### 3. 改进现有组件

想改进核心组件？请遵循以下流程：

#### 步骤 1：Fork 项目

```bash
git clone [你的 fork 地址]
cd dynamic-multi-agent-system
```

#### 步骤 2：创建分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/issue-123
```

#### 步骤 3：修改代码

- 保持代码风格一致
- 添加必要的注释
- 更新相关文档

#### 步骤 4：测试

```bash
# 运行测试（如有）
# 手动测试修改的功能
```

#### 步骤 5：提交

```bash
git add .
git commit -m "feat: 添加 [功能描述]"
# 或
git commit -m "fix: 修复 [问题描述]"
```

**提交信息规范：**
- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具

#### 步骤 6：推送并创建 Pull Request

```bash
git push origin feature/your-feature-name
```

然后在 GitHub 创建 PR。

---

## 开发环境设置

### 前置要求

- OpenClaw >= 1.0.0
- Node.js >= 18
- Git

### 安装

```bash
# 克隆项目
git clone https://github.com/openclaw/dynamic-multi-agent-system.git

# 链接到 OpenClaw Skills 目录
# Windows (PowerShell):
New-Item -ItemType SymbolicLink -Path "~\.openclaw\skills\dynamic-multi-agent-system" -Target ".\skills\dynamic-multi-agent-system"

# 或复制整个目录
Copy-Item -Recurse ".\skills\dynamic-multi-agent-system" "~\.openclaw\skills\"
```

### 测试

```bash
# 1. 启动 OpenClaw Gateway
openclaw gateway start

# 2. 发送测试任务
任务：测试混合动态多 Agent 系统
要求：创建一个简单的测试任务
```

---

## 文档贡献

### 文档位置

```
docs/                    # 核心文档
examples/                # 使用示例
templates/*/README.md    # 模板说明
```

### 文档规范

- 使用 Markdown 格式
- 代码块标注语言
- 添加必要的截图/图表
- 保持中英文术语一致

---

## 设计原则

贡献时请遵循以下设计原则：

### 1. 轻量临时

- 子 Agent 都是临时创建
- 任务完成后立即清理
- 无长期资源占用

### 2. 动态适配

- 不固定子 Agent 数量
- 根据任务复杂度按需分配
- 避免过度设计

### 3. 质量优先

- 每环节都有质量把关
- 三层审查机制
- 用户反馈驱动改进

### 4. 持续进化

- 执行经验自动沉淀
- 成功流程固化为 Skill
- 系统能力持续增长

---

## 审查流程

### PR 审查清单

- [ ] 代码符合项目风格
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 提交信息规范
- [ ] 无破坏性变更（或已标注）

### 合并标准

- 至少 1 个维护者批准
- 所有 CI 检查通过
- 无未解决的评论

---

## 发布流程

### 版本命名

遵循语义化版本（SemVer）：

```
主版本。次版本.修订号
  ↑      ↑      ↑
  |      |      └─ Bug 修复
  |      └─ 新功能（向后兼容）
  └─ 破坏性变更
```

**示例：**
- `1.0.0` - 首次稳定发布
- `1.1.0` - 添加新功能
- `1.1.1` - Bug 修复
- `2.0.0` - 破坏性变更

### 发布清单

- [ ] 更新版本号（manifest.json, README.md）
- [ ] 更新 CHANGELOG.md
- [ ] 完成所有文档
- [ ] 通过完整测试
- [ ] 创建 Git Tag
- [ ] 发布到 OpenClaw Skill Hub

---

## 社区行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们承诺：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 人身攻击或侮辱性评论
- 公开或私下骚扰
- 未经许可发布他人信息
- 其他不道德或不专业的行为

---

## 联系方式

- **Issues:** GitHub Issues
- **讨论:** OpenClaw Discord 社区
- **邮件:** [维护者邮箱]

---

## 致谢

感谢所有为这个项目做出贡献的人！

🦞 混合动态多 Agent 系统团队
