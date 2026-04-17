# 共享记忆层 API 完整参考

## API 参考

### 初始化记忆

```powershell
$result = Initialize-Memory -taskId "task-001" `
    -metadata @{taskType="sci-fi-writing"; description="创作任务"} `
    -ownerAgent "main-agent"

# 响应
# {
#   "success": true,
#   "message": "Memory initialized successfully",
#   "taskId": "task-001",
#   "createdAt": "2026-04-07T09:00:00Z"
# }
```

### 授予权限

```powershell
$result = Set-MemoryPermissions `
    -taskId "task-001" `
    -targetAgentId "agent-writer-001" `
    -permissions @("read", "write") `
    -grantingAgentId "main-agent"

# 响应
# {
#   "success": true,
#   "targetAgent": "agent-writer-001",
#   "permissions": ["read", "write"]
# }
```

### 写入记忆

```powershell
$result = Write-Memory `
    -taskId "task-001" `
    -key "settings" `
    -value @{era="2077"; location="北京"} `
    -agentId "agent-world-001"

# 响应
# {
#   "success": true,
#   "key": "settings",
#   "version": 1,
#   "isNewKey": true
# }
```

### 读取记忆

```powershell
# 读取单个 key
$result = Read-Memory -taskId "task-001" -key "settings" -agentId "agent-writer-001"

# 响应
# {
#   "success": true,
#   "key": "settings",
#   "value": {"era": "2077", "location": "北京"},
#   "version": 2,
#   "updatedBy": "agent-world-001",
#   "updatedAt": "2026-04-07T10:00:00Z"
# }

# 读取全部
$result = Read-Memory -taskId "task-001" -agentId "agent-writer-001" -includeMetadata
```

### 列出所有 Key

```powershell
$result = List-MemoryKeys -taskId "task-001" -agentId "agent-writer-001"

# 响应
# {
#   "success": true,
#   "keys": [
#     {"key": "settings", "version": 2, "updatedAt": "..."},
#     {"key": "outline", "version": 1, "updatedAt": "..."}
#   ],
#   "count": 2
# }
```

### 获取版本历史

```powershell
$result = Get-MemoryHistory -taskId "task-001" -key "settings" -agentId "agent-writer-001"

# 响应
# {
#   "success": true,
#   "key": "settings",
#   "history": [
#     {"version": 1, "value": {...}, "createdBy": "agent-01"},
#     {"version": 2, "value": {...}, "createdBy": "agent-01", "isCurrent": true}
#   ],
#   "totalVersions": 2
# }
```

### 回滚到指定版本

```powershell
$result = Rollback-MemoryKey `
    -taskId "task-001" `
    -key "settings" `
    -version 1 `
    -agentId "main-agent"

# 响应
# {
#   "success": true,
#   "key": "settings",
#   "newVersion": 3,
#   "rolledBackTo": 1,
#   "message": "Rollback successful"
# }
```

### 删除 Key

```powershell
$result = Delete-MemoryKey -taskId "task-001" -key "temp-data" -agentId "main-agent"

# 响应
# {
#   "success": true,
#   "key": "temp-data",
#   "archived": true
# }
```

### 删除整个记忆

```powershell
$result = Remove-Memory -taskId "task-001" -agentId "main-agent"

# 响应
# {
#   "success": true,
#   "taskId": "task-001",
#   "archivedTo": "archives/task-001-full-20260407-103000.json"
# }
```

## 完整工作流

```powershell
# 任务：写一篇科幻小说
$taskId = "sci-fi-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$mainAgent = "main-agent"
$worldAgent = "world-agent"
$outlineAgent = "outline-agent"
$writerAgent = "writer-agent"

# 1. 主 Agent 初始化记忆
Initialize-Memory -taskId $taskId -ownerAgent $mainAgent

# 2. 授予子 Agent 权限
Set-MemoryPermissions -taskId $taskId -targetAgentId $worldAgent `
    -permissions @("read", "write") -grantingAgentId $mainAgent
Set-MemoryPermissions -taskId $taskId -targetAgentId $outlineAgent `
    -permissions @("read", "write") -grantingAgentId $mainAgent
Set-MemoryPermissions -taskId $taskId -targetAgentId $writerAgent `
    -permissions @("read", "write") -grantingAgentId $mainAgent

# 3. Agent 1：世界观设计师写入设定
Write-Memory -taskId $taskId -key "settings" -value @{
    era = "2077"
    location = "北京"
    techLevel = "fusion-power"
    socialSystem = "post-scarcity"
} -agentId $worldAgent

# 4. Agent 2：大纲规划师读取设定，设计大纲
$settings = (Read-Memory -taskId $taskId -key "settings" -agentId $outlineAgent).value
$outline = @{
    act1 = @{title="清晨的豆汁儿店"; desc="传统生活的延续"}
    act2 = @{title="偶遇老同学"; desc="科技与人情的碰撞"}
    act3 = @{title="回忆与未来"; desc="传统与科技的融合"}
}
Write-Memory -taskId $taskId -key "outline" -value $outline -agentId $outlineAgent

# 5. Agent 3：小说作家读取全部，开始写作
$allData = Read-Memory -taskId $taskId -agentId $writerAgent
$chapter1 = "第一章的故事内容..."
Write-Memory -taskId $taskId -key "chapter-1" -value $chapter1 -agentId $writerAgent

# 6. 检查版本历史
$history = Get-MemoryHistory -taskId $taskId -key "settings" -agentId $mainAgent

# 7. 任务完成，清理
Remove-Memory -taskId $taskId -agentId $mainAgent
```

## 错误处理示例

```powershell
# 尝试写入无权限的 key
$result = Write-Memory -taskId "task-001" -key "admin-only" `
    -value @{secret = "data"} -agentId "no-perm-agent"

if (-not $result.success) {
    switch ($result.error) {
        "PERMISSION_DENIED" {
            Write-Host "需要申请权限"
        }
        "VERSION_CONFLICT" {
            Write-Host "版本冲突，需要先读取最新"
        }
        "TASK_NOT_FOUND" {
            Write-Host "任务不存在"
        }
    }
}
```

## 性能指标

| 操作 | 目标时间 | 说明 |
|------|----------|------|
| 初始化记忆 | <50ms | 创建文件和目录 |
| 写入记忆 | <100ms | 含锁获取、版本保存 |
| 读取记忆 | <50ms | 仅文件读取 |
| 锁定获取 | <50ms | 锁竞争时最长等待 5s |
| 删除记忆 | <100ms | 含归档操作 |
