# StoryFlow 命令行版本设计文档

## 概述

StoryFlow CLI 是一个基于命令行的工作流引擎，用于执行 AI 提示词链。设计目标是简单、高效、易于集成到自动化流程中。

## 快速开始

### 安装

```bash
# 从 npm 安装
npm install -g @storyflow/cli

# 或使用 npx 直接运行
npx storyflow
```

### 首次使用

```bash
# 初始化配置文件
storyflow init

# 运行示例工作流
storyflow run examples/hello-world.yaml
```

## 核心命令

### 1. init - 初始化项目

```bash
storyflow init [options]

Options:
  --dir <directory>    指定初始化目录（默认：当前目录）
  --template <name>    使用模板创建（basic/advanced）
  --force              强制覆盖已存在的文件

示例：
  storyflow init
  storyflow init --dir my-workflows
  storyflow init --template advanced
```

**启动流程：**

1. 检查当前目录是否有配置文件
2. 创建 `.storyflow/` 目录结构
3. 生成 `storyflow.config.yaml` 配置文件
4. 创建 `workflows/` 文件夹
5. 添加 `examples/` 示例工作流
6. 显示成功信息和下一步提示

```
✓ StoryFlow 配置文件已创建
✓ 工作流目录已初始化
✓ 示例工作流已添加

下一步：
  - 编辑 storyflow.config.yaml 配置 API keys
  - 运行示例: storyflow run examples/hello-world.yaml
  - 查看文档: storyflow docs
```

### 2. run - 运行工作流

```bash
storyflow run <workflow-file> [options]

Options:
  --env <file>         指定环境变量文件
  --output <format>    输出格式（json/yaml/text，默认：text）
  --verbose            显示详细执行日志
  --dry-run            模拟运行，不实际调用 API
  --save-result <file> 保存执行结果到文件
  --watch              监视文件变化自动重新运行

示例：
  storyflow run workflows/blog-post.yaml
  storyflow run my-flow.yaml --verbose
  storyflow run test.yaml --dry-run
  storyflow run workflow.yaml --save-result output.json
```

**执行流程：**

```
[StoryFlow] 开始执行工作流: blog-post.yaml
[StoryFlow] 加载配置文件... ✓
[StoryFlow] 验证工作流结构... ✓
[StoryFlow] 执行计划已生成（3 个节点）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
节点 1/3: generate_ideas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[StoryFlow] 调用 LLM (GPT-4)...
[StoryFlow] 执行完成（耗时 2.3s）✓
  输出: 5 个创意已生成

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
节点 2/3: select_best
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[StoryFlow] 依赖节点: generate_ideas ✓
[StoryFlow] 调用 LLM (GPT-4)...
[StoryFlow] 执行完成（耗时 1.8s）✓
  输出: 已选择最佳创意

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
节点 3/3: expand_content
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[StoryFlow] 依赖节点: select_best ✓
[StoryFlow] 调用 LLM (GPT-4)...
[StoryFlow] 执行完成（耗时 5.2s）✓
  输出: 1200 字的博客文章已生成

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
工作流执行完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

总耗时: 9.3s
成功节点: 3
失败节点: 0

结果已保存到: outputs/blog-post-20240419-143022.json
```

### 3. validate - 验证工作流

```bash
storyflow validate <workflow-file>

示例：
  storyflow validate my-workflow.yaml
```

**输出示例：**

```
✓ 工作流结构有效
✓ 所有节点引用正确
✓ 环境变量完整
✓ 输出路径可写

验证通过！工作流可以安全执行。
```

### 4. list - 列出可用工作流

```bash
storyflow list [options]

Options:
  --path <directory>   指定工作流目录

示例：
  storyflow list
  storyflow list --path custom-flows
```

**输出示例：**

```
可用工作流:

  📄 blog-generator.yaml
     描述: 自动生成博客文章
     节点数: 4
     最后修改: 2024-04-18

  📄 email-drafter.yaml
     描述: 起草专业邮件
     节点数: 3
     最后修改: 2024-04-15

  📄 code-review.yaml
     描述: 代码审查助手
     节点数: 5
     最后修改: 2024-04-10

共 3 个工作流
```

### 5. template - 管理模板

```bash
storyflow template <command> [options]

Commands:
  list              列出可用模板
  create <name>     从模板创建新工作流
  install <url>     安装外部模板

示例：
  storyflow template list
  storyflow template create blog-post
  storyflow template install https://github.com/user/templates
```

### 6. config - 配置管理

```bash
storyflow config <command> [options]

Commands:
  set <key> <value>     设置配置项
  get <key>             获取配置项
  list                  列出所有配置
  reset                 重置为默认配置

示例：
  storyflow config set api.openai.key sk-xxx
  storyflow config get api.openai.model
  storyflow config list
```

### 7. docs - 打开文档

```bash
storyflow docs

打开在线文档：https://docs.storyflow.ai
```

## 工作流配置文件格式

### YAML 格式

```yaml
# blog-post.yaml
version: "1.0"
name: "博客文章生成器"
description: "从主题生成完整的博客文章"

# 环境变量
env:
  OPENAI_API_KEY: ${OPENAI_API_KEY}
  DEFAULT_MODEL: gpt-4

# 全局变量
variables:
  topic: "AI 工作流自动化"
  tone: "professional"

# 节点定义
nodes:
  - id: "generate_ideas"
    name: "生成创意"
    type: "llm"
    provider: "openai"
    model: "${DEFAULT_MODEL}"
    prompt: |
      关于「{{topic}}」这个主题，生成 5 个不同的博客文章创意。
      语调：{{tone}}

      输出格式：
      1. [创意标题] - 简短描述
      2. [创意标题] - 简短描述
      ...

    outputs:
      - name: "ideas"
        type: "text"

  - id: "select_best"
    name: "选择最佳创意"
    type: "llm"
    provider: "openai"
    model: "${DEFAULT_MODEL}"
    depends_on: ["generate_ideas"]

    prompt: |
      从以下创意中选择最适合的一篇：

      {{generate_ideas.ideas}}

      请说明选择理由。

    outputs:
      - name: "selected_idea"
        type: "text"
      - name: "reasoning"
        type: "text"

  - id: "expand_content"
    name: "扩展内容"
    type: "llm"
    provider: "openai"
    model: "${DEFAULT_MODEL}"
    depends_on: ["select_best"]

    prompt: |
      基于选定的创意，撰写一篇完整的博客文章（1200-1500字）：

      创意：{{select_best.selected_idea}}
      选择理由：{{select_best.reasoning}}

      文章结构：
      - 引人入胜的标题
      - 简短引言
      - 3-5 个主要段落
      - 结论和行动号召

    outputs:
      - name: "blog_post"
        type: "text"

# 输出配置
output:
  save_to: "outputs/{{name}}-{{timestamp}}.md"
  format: "markdown"
  include_metadata: true

# 执行配置
execution:
  max_retries: 3
  timeout: 300  # 秒
  parallel: false
  on_error: "continue"  # stop | continue | retry
```

### JSON 格式

```json
{
  "version": "1.0",
  "name": "博客文章生成器",
  "description": "从主题生成完整的博客文章",
  "env": {
    "OPENAI_API_KEY": "${OPENAI_API_KEY}",
    "DEFAULT_MODEL": "gpt-4"
  },
  "variables": {
    "topic": "AI 工作流自动化",
    "tone": "professional"
  },
  "nodes": [
    {
      "id": "generate_ideas",
      "name": "生成创意",
      "type": "llm",
      "provider": "openai",
      "model": "${DEFAULT_MODEL}",
      "prompt": "关于「{{topic}}」这个主题，生成 5 个不同的博客文章创意。",
      "outputs": [
        {
          "name": "ideas",
          "type": "text"
        }
      ]
    }
  ],
  "output": {
    "save_to": "outputs/{{name}}-{{timestamp}}.md",
    "format": "markdown"
  },
  "execution": {
    "max_retries": 3,
    "timeout": 300,
    "parallel": false
  }
}
```

## 输出结果展示方式

### 文本输出（默认）

```
[StoryFlow] 执行完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
输出结果:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# AI 工作流自动化：提升生产力的新方式

## 引言
在人工智能快速发展的今天...

## 主要内容
...

[文章完整内容...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
元数据:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  工作流: blog-post-generator
  执行时间: 2024-04-19 14:30:22
  总耗时: 9.3s
  节点数: 3
  模型: GPT-4
  总tokens: 2847
```

### JSON 输出

```json
{
  "status": "success",
  "workflow": "blog-post-generator",
  "execution_time": "2024-04-19T14:30:22Z",
  "duration_seconds": 9.3,
  "nodes": [
    {
      "id": "generate_ideas",
      "status": "success",
      "duration": 2.3,
      "outputs": {
        "ideas": "1. [创意标题] - 描述\n..."
      }
    },
    {
      "id": "select_best",
      "status": "success",
      "duration": 1.8,
      "outputs": {
        "selected_idea": "...",
        "reasoning": "..."
      }
    },
    {
      "id": "expand_content",
      "status": "success",
      "duration": 5.2,
      "outputs": {
        "blog_post": "# AI 工作流自动化\n..."
      }
    }
  ],
  "metadata": {
    "total_tokens": 2847,
    "model": "gpt-4"
  }
}
```

### YAML 输出

```yaml
status: success
workflow: blog-post-generator
execution_time: '2024-04-19T14:30:22Z'
duration_seconds: 9.3
nodes:
  - id: generate_ideas
    status: success
    duration: 2.3
    outputs:
      ideas: "1. [创意标题] - 描述\n..."
  - id: select_best
    status: success
    duration: 1.8
    outputs:
      selected_idea: ...
      reasoning: ...
  - id: expand_content
    status: success
    duration: 5.2
    outputs:
      blog_post: |
        # AI 工作流自动化
        ...
metadata:
  total_tokens: 2847
  model: gpt-4
```

## 错误处理和提示

### 1. 配置错误

```bash
$ storyflow run broken-workflow.yaml

✗ 配置文件格式错误
  文件: broken-workflow.yaml
  位置: 第 12 行
  问题: 缺少必需字段 'id'

提示：
  - 检查 YAML 缩进是否正确
  - 参考 examples/basic.yaml 模板
  - 运行 storyflow validate 先验证格式

详细错误信息：
  Error: Missing required field 'id' at nodes[1]
```

### 2. 环境变量缺失

```bash
$ storyflow run workflow.yaml

✗ 环境变量缺失
  缺失变量: OPENAI_API_KEY

解决方案：
  1. 设置环境变量：
     export OPENAI_API_KEY=your_key_here

  2. 或在配置文件中指定：
     storyflow config set api.openai.key your_key_here

  3. 或使用 .env 文件：
     echo "OPENAI_API_KEY=your_key_here" > .env
```

### 3. API 调用失败

```bash
$ storyflow run workflow.yaml

✗ API 调用失败
  节点: generate_ideas
  错误: Invalid API key (401)

重试策略：
  - 自动重试次数: 2/3
  - 下次重试: 等待 5 秒后...

[重试中...] 调用 API...
✗ 重试失败（所有重试已用尽）

建议：
  - 检查 API key 是否正确
  - 验证账户余额
  - 确认 API 配额未超限
```

### 4. 节点依赖错误

```bash
$ storyflow run workflow.yaml

✗ 工作流依赖错误
  节点: expand_content
  问题: 依赖节点 'select_best' 执行失败

错误链：
  generate_ideas → select_best → expand_content
                                   ↑
                                这里失败了

跳过策略：
  - execution.on_error 设置为 'continue'
  - 跳过后续依赖节点
  - 已完成的节点输出已保存

修复建议：
  - 检查 select_best 节点的错误
  - 验证提示词模板语法
  - 使用 --dry-run 测试工作流
```

### 5. 超时错误

```bash
$ storyflow run workflow.yaml

✗ 执行超时
  节点: expand_content
  等待时间: 301秒（超时限制: 300秒）

可能原因：
  - 提示词过于复杂
  - 模型响应慢
  - 网络延迟

解决方案：
  1. 增加超时设置：
     execution.timeout: 600  # 改为 10 分钟

  2. 简化提示词或拆分成多个节点

  3. 检查网络连接
```

### 6. 输出路径错误

```bash
$ storyflow run workflow.yaml --save-result /root/output.json

✗ 输出路径不可写
  路径: /root/output.json
  原因: 权限不足

建议：
  - 使用当前目录：--save-result output.json
  - 检查目标目录的写权限
  - 或使用默认输出目录：outputs/
```

## 帮助系统

### 命令帮助

```bash
$ storyflow --help

StoryFlow v1.0.0 - AI 工作流引擎

使用方法：
  storyflow <command> [options]

可用命令：
  init        初始化 StoryFlow 项目
  run         运行工作流
  validate    验证工作流文件
  list        列出可用工作流
  template    管理工作流模板
  config      管理配置
  docs        打开文档

全局选项：
  -h, --help     显示帮助信息
  -v, --version  显示版本信息
  --debug        启用调试模式

获取命令详细帮助：
  storyflow <command> --help

示例：
  storyflow run workflow.yaml --verbose
  storyflow init --template advanced
```

### 交互式错误修复

```bash
$ storyflow fix broken-workflow.yaml

正在分析工作流...

发现问题：
  [1] 节点 'expand_content' 引用了不存在的变量
  [2] 依赖节点 'review' 定义但未使用

是否自动修复？(y/n): y

修复操作：
  ✓ 移除未使用的节点 'review'
  ✓ 创建缺失的变量引用

工作流已修复！建议在执行前运行验证：
  storyflow validate broken-workflow.yaml
```

## 学习资源提示

新手引导：

```bash
$ storyflow init --template basic

✓ 已创建新手项目
✓ 添加了 5 个示例工作流

学习路径：
  1. 查看 examples/01-simple-prompt.yaml  - 最简单的提示
  2. 查看 examples/02-chain.yaml         - 多节点链式
  3. 查看 examples/03-branch.yaml        - 条件分支
  4. 查看 examples/04-loop.yaml          - 循环处理
  5. 查看 examples/05-integration.yaml   - 外部集成

下一步：
  cd examples
  storyflow run 01-simple-prompt.yaml
  storyflow run 02-chain.yaml --verbose
```

## 配置文件示例

### storyflow.config.yaml

```yaml
# API 配置
api:
  openai:
    key: ${OPENAI_API_KEY}
    model: gpt-4
    temperature: 0.7
    max_tokens: 2000

  anthropic:
    key: ${ANTHROPIC_API_KEY}
    model: claude-3-opus-20240229

# 默认执行配置
execution:
  max_retries: 3
  timeout: 300
  on_error: "stop"

# 输出配置
output:
  default_format: "text"
  save_dir: "outputs"
  include_timestamp: true
  include_metadata: true

# 日志配置
logging:
  level: "info"  # debug | info | warn | error
  file: ".storyflow/logs/execution.log"
  max_size: "10MB"
  max_files: 5

# 编辑器集成
editor:
  enabled: true
  auto_reload: false
  preview: true

# 缓存配置
cache:
  enabled: true
  ttl: 3600  # 秒
  dir: ".storyflow/cache"
```

## 性能提示

```bash
# 查看性能统计
$ storyflow run workflow.yaml --stats

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
性能统计
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

节点性能：
  generate_ideas    2.3s  ████████████████  25%
  select_best       1.8s  ████████████      19%
  expand_content    5.2s  █████████████████████████████████████████████████████████████  56%

API 调用：
  请求次数: 3
  总 tokens: 2847
  输入 tokens: 1847
  输出 tokens: 1000
  成本估算: $0.12

优化建议：
  - expand_content 节点耗时最长（56%）
  - 考虑使用更快的模型（如 gpt-3.5-turbo）
  - 可以添加缓存减少重复调用
```
