# 部署指南

## 部署方式

### 方式1：开发环境部署（推荐）

适合测试和开发阶段。

**步骤：**

1. **确认位置**
   ```
   目标目录：C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\
   ```

2. **验证文件完整性**
   ```
   检查以下文件是否存在：
   - README.md
   - SKILL.md
   - manifest.json
   - core/*/SKILL.md (6个核心组件)
   ```

3. **配置OpenClaw**
   ```
   编辑：C:\Users\DELL\.openclaw\openclaw.json
   
   添加（如需要）：
   {
     "skills": {
       "paths": [
         "./workspace/skills"
       ]
     }
   }
   ```

4. **重启Gateway**
   ```
   openclaw gateway restart
   ```

5. **验证安装**
   ```
   openclaw skill list
   
   应显示：dynamic-multi-agent-system ✅
   ```

---

### 方式2：生产环境部署

适合正式使用。

**步骤：**

1. **复制到Skills目录**
   ```
   源目录：C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\
   目标目录：C:\Users\DELL\AppData\Roaming\npm\node_modules\openclaw\skills\dynamic-multi-agent-system\
   ```

2. **设置权限**
   ```
   确保OpenClaw有读取权限
   ```

3. **重启Gateway**
   ```
   openclaw gateway restart
   ```

4. **验证安装**
   ```
   openclaw skill list
   ```

---

### 方式3：SkillHub上架（未来）

适合发布给社区使用。

**步骤：**

1. **准备上架材料**
   - 完整的Skill包
   - README.md（展示页）
   - 使用示例（至少3个）
   - 测试报告

2. **提交到SkillHub**
   ```
   访问：https://clawhub.ai
   提交Skill包
   ```

3. **等待审核**
   ```
   审核时间：1-3个工作日
   ```

4. **发布**
   ```
   审核通过后自动发布
   用户可通过 openclaw skill install 安装
   ```

---

## 部署前检查

### 环境检查

```bash
# 检查OpenClaw版本
openclaw --version
# 应 >= 1.0.0

# 检查Gateway状态
openclaw gateway status
# 应显示 running

# 检查可用模型
openclaw models list
# 应至少有一个可用模型
```

### 文件检查

```bash
# 检查核心文件
ls -la skills/dynamic-multi-agent-system/
# 应包含 README.md, SKILL.md, manifest.json

# 检查核心组件
ls -la skills/dynamic-multi-agent-system/core/
# 应包含6个组件目录
```

### 依赖检查

```
依赖项：
- OpenClaw >= 1.0.0 ✅
- 模型：qwen3.5-plus 或其他 ✅
- 无外部API依赖 ✅
```

---

## 配置选项

### 基础配置

```json
// C:\Users\DELL\.openclaw\openclaw.json
{
  "multi-agent": {
    "enabled": true,
    "max-concurrent-tasks": 3,
    "max-sub-agents": 12,
    "enable-evolution": true,
    "confidence-threshold": 0.7,
    "subagent-timeout": 300
  }
}
```

### 配置说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| enabled | true | 是否启用系统 |
| max-concurrent-tasks | 3 | 最多并发主任务数 |
| max-sub-agents | 12 | 最多子Agent总数 |
| enable-evolution | true | 是否启用Skill进化 |
| confidence-threshold | 0.7 | 任务分类置信度阈值 |
| subagent-timeout | 300 | 子Agent超时时间（秒） |

---

## 首次运行

### 测试任务

```
任务：写一篇200字的科幻微小说
主题：人工智能
要求：有反转结局
```

**预期行为：**
1. 识别为"创新任务"
2. 创建2个子Agent（大纲+写作）
3. 执行并输出结果
4. 清理临时资源

### 验证要点

- [ ] 任务正确分类
- [ ] 子Agent成功创建
- [ ] 输出符合质量要求
- [ ] 资源正确清理
- [ ] Skill计数+1

---

## 故障排除

### 问题1：Skill未识别

**现象：** `openclaw skill list` 未显示

**解决：**
```
1. 检查文件路径是否正确
2. 检查openclaw.json中的skills.paths配置
3. 重启Gateway
4. 检查日志：openclaw logs
```

### 问题2：子Agent创建失败

**现象：** sessions_spawn返回错误

**解决：**
```
1. 检查Gateway状态
2. 检查模型配置
3. 检查资源限制（max-sub-agents）
4. 查看错误日志
```

### 问题3：任务执行超时

**现象：** 任务长时间无响应

**解决：**
```
1. 增加subagent-timeout配置
2. 检查子Agent是否卡住
3. 手动终止：openclaw sessions kill
4. 简化任务或增加资源
```

### 问题4：资源未清理

**现象：** 任务完成后子Agent仍存在

**解决：**
```
1. 手动清理：openclaw sessions kill <session-key>
2. 检查resource-cleaner组件
3. 查看清理日志
4. 重启Gateway强制清理
```

---

## 性能调优

### 并发优化

```
如系统响应慢：
- 减少 max-concurrent-tasks (3→2)
- 减少 max-sub-agents (12→8)

如资源利用率低：
- 增加 max-concurrent-tasks (3→4)
- 增加 max-sub-agents (12→16)
```

### 质量优化

```
如输出质量不稳定：
- 启用审查Agent（降低阈值）
- 增加检查清单严格度
- 提高模型等级

如修改次数过多：
- 加强前期需求确认
- 增加中期检查点
- 优化检查清单
```

---

## 备份与恢复

### 备份

```
备份内容：
- state/skill-counters.json
- state/experience-db.json
- state/execution-logs/

备份命令：
cp -r skills/dynamic-multi-agent-system/state/ backup/
```

### 恢复

```
恢复命令：
cp -r backup/state/ skills/dynamic-multi-agent-system/
```

---

## 升级指南

### 版本检查

```
查看当前版本：
cat skills/dynamic-multi-agent-system/manifest.json | grep version
```

### 升级步骤

```
1. 备份当前版本和数据
2. 下载新版本
3. 替换文件（保留state目录）
4. 重启Gateway
5. 验证功能
```

### 版本兼容性

| 当前版本 | 可升级到 | 说明 |
|----------|----------|------|
| 1.0.0-alpha | 1.0.0 | 直接升级 |
| 1.0.0 | 1.1.0 | 直接升级 |
| 1.x.x | 2.0.0 | 需要迁移配置 |

---

## 联系支持

**文档：** docs/ 目录

**问题反馈：** GitHub Issues（待创建）

**社区：** OpenClaw Discord（待添加）
