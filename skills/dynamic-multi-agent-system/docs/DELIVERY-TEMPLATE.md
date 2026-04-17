# 交付物标准模板

## 📋 标准交付物格式

每个SKILL执行完毕后，必须输出以下格式的交付物：

```json
{
  "task": "任务描述",
  "result": {
    "summary": "简要结果（1-2句话）",
    "details": "详细结果（根据任务类型填写）",
    "data": {} // 可选，结构化数据
  },
  "quality": {
    "completeness": 0-100,  // 完整性
    "accuracy": 0-100,      // 准确性  
    "readability": 0-100    // 可读性
  },
  "issues": [], // 遗留问题列表
  "suggestions": [] // 改进建议（可选）
}
```

## 🎯 评分标准

| 指标 | 达标线 | 优秀线 | 评分依据 |
|------|--------|--------|----------|
| 完整性 | 80% | 95% | 是否完成全部必要步骤 |
| 准确性 | 85% | 98% | 结果是否符合预期 |
| 可读性 | 70% | 90% | 输出是否清晰易理解 |

## 📖 各SKILL交付物说明

### task-classifier

```json
{
  "task": "分类任务：写科幻小说",
  "result": {
    "summary": "任务识别为标准类型，匹配科幻写作Skill",
    "details": "confidence: 0.85, matched-skill: sci-fi-writing, recommended-agents: [写作专家]",
    "data": {
      "taskType": "standard",
      "confidence": 0.85,
      "matchedSkill": "sci-fi-writing",
      "customRequirements": [],
      "recommendedAgents": ["写作专家"],
      "estimatedComplexity": "medium",
      "fullTeam": false
    }
  },
  "quality": {
    "completeness": 95,
    "accuracy": 92,
    "readability": 88
  },
  "issues": [],
  "suggestions": ["可考虑增加定制化要求的识别精度"]
}
```

### task-decomposer

```json
{
  "task": "分解任务：写10章悬疑小说",
  "result": {
    "summary": "分解为4个子任务，形成串行依赖链",
    "details": "素材收集→大纲设计→内容撰写→质量审查，预计总时长480秒",
    "data": {
      "subtasks": [...],
      "dependencyGraph": {...},
      "executionPlan": {
        "totalEstimatedTime": 480,
        "criticalPath": ["素材收集", "大纲设计", "内容撰写", "质量审查"],
        "parallelismDegree": 1
      }
    }
  },
  "quality": {
    "completeness": 90,
    "accuracy": 88,
    "readability": 85
  },
  "issues": ["依赖深度较大，单点故障风险"],
  "suggestions": ["可考虑将素材收集与大纲设计并行"]
}
```

### subagent-manager

```json
{
  "task": "创建子Agent团队执行小说写作",
  "result": {
    "summary": "成功创建3个子Agent，已分配模型和角色",
    "details": "agents-created: 3, execution-order: [[搜索],[大纲],[写作]], estimated-completion: +300秒",
    "data": {
      "agentsCreated": [...],
      "executionOrder": [[...], [...], [...]],
      "estimatedCompletion": "2026-04-15T15:00:00Z"
    }
  },
  "quality": {
    "completeness": 100,
    "accuracy": 95,
    "readability": 90
  },
  "issues": [],
  "suggestions": []
}
```

### quality-checker

```json
{
  "task": "质量检查：小说第3章",
  "result": {
    "summary": "通过质量检查，综合评分4.2/5",
    "details": "第一层自检通过(4分)，第二层主Agent确认通过，建议优化对话自然度",
    "data": {
      "decision": "pass",
      "score": 4.2,
      "checkResults": {
        "selfCheck": { "passed": true, "score": 4 },
        "mainAgentCheck": { "passed": true, "score": 4 },
        "reviewAgentCheck": null
      },
      "issues": [
        { "location": "第3段", "problem": "对话略显生硬", "suggestion": "增加语气词", "priority": "medium" }
      ]
    }
  },
  "quality": {
    "completeness": 100,
    "accuracy": 93,
    "readability": 88
  },
  "issues": [],
  "suggestions": ["可建立更细粒度的评分维度"]
}
```

### skill-evolution

```json
{
  "task": "跟踪模式：code-review执行效果",
  "result": {
    "summary": "模式已稳定，建议固化，预期加速3-5倍",
    "details": "successCount: 5, avgQualityScore: 88, consistencyScore: 85, 满足固化阈值",
    "data": {
      "patternType": "code-review",
      "stats": {
        "successCount": 5,
        "failureCount": 0,
        "successRate": 100
      },
      "averages": {
        "qualityScore": 88,
        "tokenUsage": 6200,
        "duration": 145
      },
      "isSolidified": false,
      "solidifyReady": true,
      "estimatedSpeedup": "3-5x"
    }
  },
  "quality": {
    "completeness": 95,
    "accuracy": 90,
    "readability": 85
  },
  "issues": [],
  "suggestions": ["固化后可获得更快的执行速度"]
}
```

### resource-cleaner

```json
{
  "task": "清理任务：task-001相关资源",
  "result": {
    "summary": "清理完成，释放4个会话和约256MB内存",
    "details": "cleaned: agents=4, files=3, cache=2; failed: none; pending-cleanup: none",
    "data": {
      "status": "success",
      "cleanedResources": {
        "agents": ["agent-search-001", "agent-outline-001", "agent-writing-001", "agent-review-001"],
        "files": ["temp-001.txt", "temp-002.md", "cache-001.json"],
        "cache": ["result-cache-key-1", "result-cache-key-2"]
      },
      "failedResources": [],
      "pendingCleanup": [],
      "resourceFreed": {
        "sessions": 4,
        "memoryMB": 256,
        "diskMB": 12
      }
    }
  },
  "quality": {
    "completeness": 100,
    "accuracy": 98,
    "readability": 92
  },
  "issues": [],
  "suggestions": []
}
```

### result-cache

```json
{
  "task": "缓存查询：sci-fi-writing相同任务",
  "result": {
    "summary": "缓存命中，返回3小时前的结果",
    "details": "hit: true, age: 10800秒, tokenSaved: 约7500",
    "data": {
      "hit": true,
      "key": "sha256:abc123...",
      "age": 10800,
      "cachedResult": {...},
      "tokenSaved": 7500,
      "timeSavedSeconds": 120
    }
  },
  "quality": {
    "completeness": 100,
    "accuracy": 100,
    "readability": 90
  },
  "issues": [],
  "suggestions": ["TTL可考虑根据任务类型调整"]
}
```

### agency-registry

```json
{
  "task": "加载Agency Agent：小红书运营专家",
  "result": {
    "summary": "成功加载小红书专家Agent，已提取关键section注入prompt",
    "details": "loaded: marketing-xiaohongshu-specialist, sections: Identity/Rules/Deliverables/Workflow",
    "data": {
      "agentLoaded": "marketing-xiaohongshu-specialist",
      "sourceFile": "agency-agents/marketing/marketing-xiaohongshu-specialist.md",
      "sectionsExtracted": ["Identity", "Critical Rules", "Deliverables", "Workflow"],
      "injectionTarget": "subagent-content-creator",
      "cacheHit": false,
      "loadTimeMs": 145
    }
  },
  "quality": {
    "completeness": 100,
    "accuracy": 95,
    "readability": 88
  },
  "issues": [],
  "suggestions": []
}
```

## 🔄 质量评分计算指南

### completeness (完整性) 计算

| 步骤 | 分值 |
|------|------|
| 输出包含result.summary | 20% |
| 输出包含result.details | 30% |
| 输出包含result.data（如适用） | 25% |
| 输出包含quality对象 | 15% |
| 输出包含issues/suggestions | 10% |

### accuracy (准确性) 计算

| 情况 | 分值 |
|------|------|
| 结果完全正确，符合预期 | 95-100% |
| 结果基本正确，有小误差 | 80-94% |
| 结果有部分错误 | 60-79% |
| 结果大部分错误 | <60% |

### readability (可读性) 计算

| 情况 | 分值 |
|------|------|
| 输出结构清晰，格式规范，易读 | 90-100% |
| 输出较清晰，格式基本规范 | 75-89% |
| 输出可理解但结构较乱 | 60-74% |
| 输出难以理解 | <60% |

## 📝 注意事项

1. **所有SKILL必须返回** `quality` 对象，即使分数是估算
2. **issues必须填写**，即使为空数组 `[]`
3. **suggestions可选**，但建议在有改进空间时填写
4. **data字段**用于存放结构化数据，根据SKILL类型灵活调整
5. **summary应简洁**，1-2句话说明核心结果
6. **details可详细**，展开说明执行过程和结果细节
