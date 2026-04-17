# Inbox - 收件箱

**最后更新：** 2026-04-17T00:06:00+08:00

## 🔴 最高优先级

### 高考志愿小程序变现
- **状态：** 支付已配置但未绑定AppID
- **卡点：** APPID_MCHID_NOT_MATCH
- **解决：** 注册自己的商户号并绑定AppID

## 待处理想法

1. 高考志愿小程序 - **优先级1**，尽快上架变现
2. 小说《吾名午夜》上架番茄小说 - **优先级2**
3. 抖音账号整改 - 定位"求生行动"

## 阳神系统优化

### ✅ P2优化已完成（2026-04-17上午）
- ✅ 决策边界对接（agent-authority.USAGE.md）
- ✅ 回调机制对接（callback-protocol.IMPLEMENTATION.md）
- ✅ 用户画像自动提取（auto-extractor.js + extraction-rules.md）
- ✅ Skills进化自动触发（auto-trigger.js + SKILL.md v1.2）

### ✅ P0优化已完成（2026-04-17上午）
- ✅ category-mapping自动加载（mapping-loader.js）
- ✅ 元数据层 + 同步机制（metadata-registry.js + sync-watcher.js）
- ✅ 工具缺失检测（tool-checker.js + tool-registry.json）
- ✅ 验证闭环机制（闭环验证器.js + auto-verify-hook.js）

### 🔴 Agent工厂类进行中（2026-04-17上午）
- ⏳ Agent工厂（agent-factory.js + registry-executor.js）
- ⏳ 人格设定文件（15个角色的persona.md）
- ✅ 配置加载器增强（metadata-registry.js已更新）

### ⚠️ 核心问题发现（来自GitHub技能经验）
- **问题：** SKILL.md是文档不是代码 → 实际执行层未生效
- **方案：** 建立元数据层，启动时自动读取并缓存映射表

### 文档与代码隔离问题
| 问题 | 优化方案 |
| ------ | -------- |
| category-mapping不生效 | ✅ 已解决（mapping-loader.js） |
| SKILL.md配置无法自动同步 | ⏳ 元数据层处理中 |
