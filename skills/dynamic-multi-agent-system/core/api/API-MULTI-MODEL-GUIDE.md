# API Multi-Model Configuration - 千问多模型配置指南

**版本：** v1.0  
**日期：** 2026-04-06  
**模型提供商：** 通义千问（阿里）

---

## 📋 配置目标

实现子 Agent 根据任务类型自动选择最合适的千问模型：

| 任务类型 | 推荐模型 | 说明 |
|----------|----------|------|
| 图片分析 | Qwen-VL-Max | 视觉语言模型 |
| 创意写作 | Qwen3.5-Plus | 文本创作优化 |
| 代码开发 | Qwen3-Max | 代码能力最强 |
| 数据分析 | Qwen3.5-Plus | 逻辑推理强 |
| 翻译 | Qwen3.5-Plus | 多语言支持好 |
| 通用任务 | Qwen3.5-Plus | 平衡性能/成本 |

---

## 🔧 配置步骤

### 步骤 1：确认 API Key 已配置

**检查 OpenClaw 配置：**

```powershell
# 查看当前模型配置
openclaw config.get | Select-String -Pattern "model"
```

**预期：** 显示当前配置的模型信息

**如果未配置，需要设置环境变量或配置文件：**

```powershell
# 环境变量方式
[System.Environment]::SetEnvironmentVariable("DASHSCOPE_API_KEY", "your-api-key", "User")

# 或编辑配置文件
# C:\Users\DELL\.openclaw\config.json
```

---

### 步骤 2：更新模型配置

**编辑 OpenClaw 配置：**

```json
{
  "models": {
    "primary": "modelstudio/qwen3.5-plus",
    "alternatives": [
      "modelstudio/qwen3-max-2026-01-23",
      "modelstudio/qwen-vl-max",
      "modelstudio/MiniMax-M2.5"
    ],
    "imageAnalysis": "modelstudio/qwen-vl-max",
    "imageGeneration": "modelstudio/qwen-vl-max",
    "codeDevelopment": "modelstudio/qwen3-max-2026-01-23",
    "creativeWriting": "modelstudio/qwen3.5-plus",
    "dataAnalysis": "modelstudio/qwen3.5-plus"
  }
}
```

**配置说明：**
- `primary` - 默认模型
- `alternatives` - 备选模型（主模型失败时使用）
- `imageAnalysis` - 图片分析专用模型
- `imageGeneration` - 图片生成专用模型
- `codeDevelopment` - 代码开发专用模型
- `creativeWriting` - 创意写作专用模型
- `dataAnalysis` - 数据分析专用模型

---

### 步骤 3：创建模型选择器

**在子 Agent 管理器中添加模型选择逻辑：**

```powershell
function Get-ModelForTask {
    param(
        [string]$taskType,
        [bool]$needsImage = $false
    )
    
    if ($needsImage) {
        return "modelstudio/qwen-vl-max"
    }
    
    switch ($taskType) {
        "creative-writing" { 
            return "modelstudio/qwen3.5-plus" 
        }
        "code-development" { 
            return "modelstudio/qwen3-max-2026-01-23" 
        }
        "data-analysis" { 
            return "modelstudio/qwen3.5-plus" 
        }
        "image-analysis" { 
            return "modelstudio/qwen-vl-max" 
        }
        "translation" { 
            return "modelstudio/qwen3.5-plus" 
        }
        default { 
            return "modelstudio/qwen3.5-plus" 
        }
    }
}

# 使用示例
$model = Get-ModelForTask -taskType "code-development"
Write-Host "Selected model: $model"
```

---

### 步骤 4：测试模型切换

**测试 1：文本创作**
```powershell
# 使用 Qwen3.5-Plus
$result = sessions_spawn -task "写一篇科幻小说" -model "modelstudio/qwen3.5-plus"
```

**测试 2：代码开发**
```powershell
# 使用 Qwen3-Max
$result = sessions_spawn -task "写一个 Python 数据分析脚本" -model "modelstudio/qwen3-max-2026-01-23"
```

**测试 3：图片分析**
```powershell
# 使用 Qwen-VL-Max
$result = image -prompt "分析这张图片" -image "path/to/image.png" -model "modelstudio/qwen-vl-max"
```

---

## 🎯 使用场景

### 场景 1：多 Agent 协作 - 自动模型分配

```
任务：开发一个数据分析网站

Agent 分配：
1. UI/UX 设计师 → Qwen-VL-Max（分析设计图）
2. 代码开发者 → Qwen3-Max（编写代码）
3. 数据分析师 → Qwen3.5-Plus（数据处理）
4. 技术文档工程师 → Qwen3.5-Plus（文档写作）
5. 测试工程师 → Qwen3.5-Plus（测试用例）
```

### 场景 2：图片处理任务

```powershell
# 子 Agent 需要分析截图
$agentConfig = @{
    role = "UI/UX Designer"
    model = "modelstudio/qwen-vl-max"
    task = "分析这张 UI 截图的设计问题"
    image = "screenshot.png"
}

# 调用
image -prompt $agentConfig.task -image $agentConfig.image -model $agentConfig.model
```

### 场景 3：成本优化

```powershell
# 简单任务使用便宜模型
if ($taskComplexity -eq "low") {
    $model = "modelstudio/qwen3.5-plus"  # 便宜
} else {
    $model = "modelstudio/qwen3-max-2026-01-23"  # 强大但贵
}
```

---

## 📊 模型对比

| 模型 | 优势 | 适用场景 | 成本 |
|------|------|----------|------|
| **Qwen3.5-Plus** | 平衡性能/成本 | 通用任务/写作/分析 | 中 |
| **Qwen3-Max** | 代码/逻辑最强 | 复杂代码/数学推理 | 高 |
| **Qwen-VL-Max** | 视觉理解 | 图片分析/图表解读 | 高 |
| **MiniMax-M2.5** | 长文本处理 | 长文档/书籍分析 | 中 |

---

## 💰 成本优化建议

### 1. 按需选择模型

```
简单任务 → Qwen3.5-Plus（便宜）
复杂任务 → Qwen3-Max（强大）
图片任务 → Qwen-VL-Max（专业）
```

### 2. 设置fallback

```json
{
  "models": {
    "primary": "modelstudio/qwen3.5-plus",
    "fallbacks": [
      "modelstudio/MiniMax-M2.5"
    ]
  }
}
```

### 3. 结果复用

```powershell
# 缓存相同任务的结果
$cacheKey = Get-Hash -task $task
if ($cache = Get-Cache -key $cacheKey) {
    return $cache  # 不重复调用 API
}
```

---

## ⚠️ 注意事项

### 1. API Key 安全

- ✅ 不要硬编码在代码中
- ✅ 使用环境变量或配置文件
- ✅ 限制配置文件访问权限

### 2. 模型可用性

- ✅ 检查模型是否可用
- ✅ 准备备选模型
- ✅ 处理模型不可用错误

### 3. 成本控制

- ✅ 设置每日预算
- ✅ 监控 Token 使用
- ✅ 优化 Prompt 减少消耗

### 4. 错误处理

```powershell
try {
    $result = Invoke-Model -model $model -prompt $prompt
} catch {
    # 尝试备选模型
    $result = Invoke-Model -model $fallback -prompt $prompt
}
```

---

## 🔍 故障排除

### 问题 1：API Key 无效

**错误：** `401 Unauthorized`

**解决方案：**
```powershell
# 检查 API Key
echo $env:DASHSCOPE_API_KEY

# 重新设置
[System.Environment]::SetEnvironmentVariable("DASHSCOPE_API_KEY", "your-key", "User")
```

### 问题 2：模型不可用

**错误：** `Model not available`

**解决方案：**
```powershell
# 使用备选模型
$model = "modelstudio/qwen3.5-plus"  # 替代
```

### 问题 3：超时

**错误：** `Request timeout`

**解决方案：**
```powershell
# 增加超时时间
$result = Invoke-Model -model $model -prompt $prompt -timeout 60
```

---

## 📋 配置检查清单

- [ ] API Key 已配置 ⬜
- [ ] 模型配置文件更新 ⬜
- [ ] Gateway 重启 ⬜
- [ ] 模型选择器创建 ⬜
- [ ] 文本模型测试 ⬜
- [ ] 代码模型测试 ⬜
- [ ] 图片模型测试 ⬜
- [ ] fallback 测试 ⬜

---

## 🎯 下一步

1. **确认 API Key** - 验证千问 API 可用
2. **更新模型配置** - 添加多模型支持
3. **创建模型选择器** - 自动分配模型
4. **测试各模型** - 验证功能正常
5. **集成到子 Agent** - 自动选择模型

---

**配置完成后，子 Agent 可以：**
- ✅ 根据任务类型自动选择模型
- ✅ 图片处理自动使用 Qwen-VL
- ✅ 代码任务自动使用 Qwen-Max
- ✅ 优化成本（简单任务用便宜模型）

**需要我帮你更新配置吗？** 🚀
