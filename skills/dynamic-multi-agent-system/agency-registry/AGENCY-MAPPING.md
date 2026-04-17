# Agency Agents → 阳神系统 角色映射表

**版本：** v1.0.0  
**创建时间：** 2026-04-14  
**目的：** 将193个Agency Agent角色映射到阳神系统

---

## 映射规则

### 阳神核心角色（保留）
这些是阳神系统的编排角色，**永远不会被替换**：

| 阳神角色ID | 名称 | 职责 | 处理 |
|-----------|------|------|------|
| orchestrator | 主控协调器 | 任务分类、分解、调度 | **保留** |
| quality-checker | 质量审查器 | 三层质检机制 | **保留** |
| resource-cleaner | 资源清理器 | 子Agent生命周期管理 | **保留** |
| skill-evolution | 技能进化器 | Skill固化与追踪 | **保留** |

### 阳神执行角色（映射到Agency Agents）
这些角色使用Agency Agents的专业知识：

| 阳神角色ID | Agency Agent | 合并方式 |
|-----------|--------------|---------|
| strategist | product-manager | 使用product-manager的PRD框架 |
| data-analyst | engineering-data-engineer | 使用数据分析方法 |
| architect | engineering-software-architect | 使用架构设计方法 |
| developer | engineering-senior-developer | 使用代码开发规范 |
| tester | engineering-code-reviewer | 使用代码审查方法 |

### 任务类型 → Agency Agent 映射

| 任务关键词 | Agency Agent文件 | 用途 |
|-----------|-----------------|------|
| 小红书 / xiaohongshu | marketing-xiaohongshu-specialist.md | 内容运营 |
| 抖音 / douyin | marketing-douyin-strategist.md | 短视频策略 |
| 微信公众号 | marketing-wechat-official-account.md | 微信生态 |
| B站 / bilibili | marketing-bilibili-content-strategist.md | B站运营 |
| SEO / 搜索优化 | marketing-seo-specialist.md | 搜索引擎优化 |
| 安全 / 漏洞 | engineering-security-engineer.md | 安全审计 |
| 代码审查 | engineering-code-reviewer.md | 代码质量 |
| 前端开发 | engineering-frontend-developer.md | 前端专家 |
| 后端开发 | engineering-backend-architect.md | 后端架构 |
| 数据分析 | engineering-data-engineer.md | 数据处理 |
| 产品经理 | product-manager.md | PRD/需求 |
| DevOps | engineering-devops-automator.md | 运维自动化 |
| 飞书 | engineering-feishu-integration-developer.md | 飞书集成 |
| 微信小程序 | engineering-wechat-mini-program-developer.md | 小程序 |
| 架构设计 | engineering-software-architect.md | 技术架构 |
| 数据库 | engineering-database-optimizer.md | 数据库优化 |
| 增长黑客 | marketing-growth-hacker.md | 增长策略 |
| 跨境电商 | marketing-cross-border-ecommerce.md | 电商运营 |
| UI设计 | design-ux-designer.md | 体验设计 |
| UX设计 | design-ux-researcher.md | 用户研究 |

---

## 中国市场专用Agent（46个）

| 任务关键词 | Agency Agent文件 |
|-----------|-----------------|
| 微信生态 | marketing-wechat-official-account.md |
| 小红书专家 | marketing-xiaohongshu-specialist.md |
| 抖音运营 | marketing-douyin-strategist.md |
| B站UP主 | marketing-bilibili-content-strategist.md |
| 微博营销 | marketing-weibo-strategist.md |
| 知乎运营 | marketing-zhihu-strategist.md |
| 快手直播 | marketing-kuaishou-strategist.md |
| 飞书协作 | engineering-feishu-integration-developer.md |
| 钉钉开发 | specialized-钉钉开发专家.md |
| 私域流量 | marketing-private-domain-operator.md |
| 跨境电商 | marketing-cross-border-ecommerce.md |
| 出海投放 | marketing-paid-media-expert.md |

---

## Agency Agent 注册表

### engineering (28个)
```
engineering-ai-data-remediation-engineer.md
engineering-ai-engineer.md
engineering-autonomous-optimization-architect.md
engineering-backend-architect.md
engineering-cms-developer.md
engineering-code-reviewer.md
engineering-codebase-onboarding-engineer.md
engineering-data-engineer.md
engineering-database-optimizer.md
engineering-devops-automator.md
engineering-email-intelligence-engineer.md
engineering-embedded-firmware-engineer.md
engineering-feishu-integration-developer.md
engineering-filament-optimization-specialist.md
engineering-frontend-developer.md
engineering-git-workflow-master.md
engineering-incident-response-commander.md
engineering-minimal-change-engineer.md
engineering-mobile-app-builder.md
engineering-rapid-prototyper.md
engineering-security-engineer.md
engineering-senior-developer.md
engineering-software-architect.md
engineering-solidity-smart-contract-engineer.md
engineering-sre.md
engineering-technical-writer.md
engineering-threat-detection-engineer.md
engineering-voice-ai-integration-engineer.md
engineering-wechat-mini-program-developer.md
```

### marketing (30个)
```
marketing-agentic-search-optimizer.md
marketing-ai-citation-strategist.md
marketing-app-store-optimizer.md
marketing-baidu-seo-specialist.md
marketing-bilibili-content-strategist.md
marketing-book-co-author.md
marketing-carousel-growth-engine.md
marketing-china-ecommerce-operator.md
marketing-china-market-localization-strategist.md
marketing-content-creator.md
marketing-cross-border-ecommerce.md
marketing-douyin-strategist.md
marketing-growth-hacker.md
marketing-instagram-curator.md
marketing-kuaishou-strategist.md
marketing-linkedin-content-creator.md
marketing-livestream-commerce-coach.md
marketing-podcast-strategist.md
marketing-private-domain-operator.md
marketing-reddit-community-builder.md
marketing-seo-specialist.md
marketing-short-video-editing-coach.md
marketing-social-media-strategist.md
marketing-tiktok-strategist.md
marketing-twitter-engager.md
marketing-video-optimization-specialist.md
marketing-wechat-official-account.md
marketing-weibo-strategist.md
marketing-xiaohongshu-specialist.md
marketing-zhihu-strategist.md
```

### product (5个)
```
product-behavioral-nudge-engine.md
product-feedback-synthesizer.md
product-manager.md
product-sprint-prioritizer.md
product-trend-researcher.md
```

### specialized (42个)
```
accounts-payable-agent.md
agentic-identity-trust.md
agents-orchestrator.md
automation-governance-architect.md
blockchain-security-auditor.md
compliance-auditor.md
corporate-training-designer.md
customer-service.md
data-consolidation-agent.md
government-digital-presales-consultant.md
healthcare-customer-service.md
healthcare-marketing-compliance.md
hospitality-guest-services.md
hr-onboarding.md
identity-graph-operator.md
language-translator.md
legal-billing-time-tracking.md
legal-client-intake.md
legal-document-review.md
loan-officer-assistant.md
lsp-index-engineer.md
real-estate-buyer-seller.md
recruitment-specialist.md
report-distribution-agent.md
retail-customer-returns.md
sales-data-extraction-agent.md
sales-outreach.md
specialized-chief-of-staff.md
specialized-civil-engineer.md
specialized-cultural-intelligence-strategist.md
specialized-developer-advocate.md
specialized-document-generator.md
specialized-french-consulting-market.md
specialized-korean-business-navigator.md
specialized-mcp-builder.md
specialized-model-qa.md
specialized-salesforce-architect.md
specialized-workflow-architect.md
study-abroad-advisor.md
supply-chain-strategist.md
zk-steward.md
```

### design (18个)
```
design-brand-identity.md
design-creative-director.md
design-cx-strategy.md
design-design-thinker.md
design-game-ui-designer.md
design-graphic-designer.md
design-motion-designer.md
design-packaging-designer.md
design-product-designer.md
design-ui-designer.md
design-ux-designer.md
design-ux-prototyper.md
design-ux-researcher.md
design-ux-writer.md
design-video-editor.md
design-visual-designer.md
design-web-designer.md
design-3d-product-visualizer.md
```

### finance (15个)
```
finance-accountant.md
finance-auditor.md
finance-buyer.md
finance-compensation-benefits.md
finance-controller.md
finance-cfo.md
finance-corporate-development.md
finance-crypto-analyst.md
finance-fp-and-analytics.md
finance-investment-analyst.md
finance-procurement.md
finance-risk-manager.md
finance-tax-specialist.md
finance-treasury.md
finance-vc-fundraising.md
```

### game-development (12个)
```
game-development-2d-artist.md
game-development-3d-artist.md
game-development-audio-engineer.md
game-development-business-affairs.md
game-development-community-manager.md
game-development-devops-engineer.md
game-development-game-designer.md
game-development-l10n.md
game-development-lead-game-designer.md
game-development-producer.md
game-development-qa-engineer.md
game-development-unity-developer.md
game-development-unreal-developer.md
```

---

## 入口Skill（已整合）

| Skill | 整合方式 | 状态 |
|-------|---------|------|
| xiaohongshu-editor | 作为 marketing-xiaohongshu-specialist 入口 | ✅ 已整合 |

**说明：**
- `xiaohongshu-editor` 已更新为 Agency Registry 的入口Skill
- 保留原有 JS 工具函数（xiaohongshu-editor.js）
- SKILL.md 引用 `marketing-xiaohongshu-specialist` 的专业知识
- state.json 标记为已整合

## 整合状态

| 类别 | 数量 | 状态 |
|------|------|------|
| engineering | 29 | ✅ 已映射 |
| marketing | 30 | ✅ 已映射 |
| product | 5 | ✅ 已映射 |
| specialized | 42 | ✅ 已映射 |
| design | 18 | ✅ 已映射 |
| finance | 15 | ✅ 已映射 |
| game-development | 13 | ✅ 已映射 |
| **Skill入口** | 1 | ✅ 已整合 |
| **总计** | **153** | ✅ |

---

*最后更新：2026-04-14*
