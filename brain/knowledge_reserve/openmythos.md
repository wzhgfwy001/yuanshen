# OpenMythos 知识储备

> **来源**: https://github.com/kyegomez/OpenMythos
> **创建时间**: 2026-04-23
> **性质**: 理论重建，非Anthropic官方项目

---

## 核心定位

> "A theoretical reconstruction of the Claude Mythos architecture, built from first principles using the available research literature."

OpenMythos 是一个**理论重建项目**，尝试根据公开研究文献推测并重建 Claude Mythos 的架构。**非 Anthropic 官方项目。**

**创建者**: Kye Gomez (Swarms创始人)

---

## 🎯 核心架构：Recurrent-Depth Transformer (RDT)

### 三阶段设计

```
Input → [Prelude] → [Recurrent Block (循环T次)] → [Coda] → Output
         (N层)         (同一权重，深度思考)           (N层)
```

### 关键公式

```
h_{t+1} = A·h_t + B·e + Transformer(h_t, e)
```

**核心洞察**：
- 传统Transformer: 100层 × 1次 forward
- RDT: 10层 × 10次循环 (同样的权重，更深的思考)

### 与Chain-of-Thought的区别

| 方式 | 机制 | 说明 |
|------|------|------|
| Chain-of-Thought | 隐式推理，生成中间token | 表面思考 |
| RDT | 同一权重循环执行 | 真正的深度思考 |

---

## ⚙️ 技术规格

### 注意力机制

| 类型 | 全称 | 特点 |
|------|------|------|
| **MLA** | Multi-Latent Attention | DeepSeek-V2风格，压缩KV latent，~10-20x内存减少 |
| **GQA** | Grouped Query Attention | 更少的KV头，支持Flash Attention 2 |

### MoE FFN (Mixture of Experts)

- **K_s 共享专家**: 始终激活
- **N_r 路由专家**: Top-K选择
- **SwiGLU激活**: w2(SiLU(w1(x)) ⊙ w3(x))

### 预配置模型规模

| Variant | dim | Experts | Expert dim | Loop iters | Context | Max output |
|---------|-----|---------|------------|------------|---------|------------|
| mythos_1b | 2048 | 64 | 2048 | 16 | 4k | 4k |
| mythos_3b | 3072 | 64 | 4096 | 16 | 4k | 4k |
| mythos_10b | 4096 | 128 | 5632 | 24 | 8k | 4k |
| mythos_50b | 6144 | 256 | 9728 | 32 | 8k | 4k |
| mythos_100b | 8192 | 256 | 13568 | 32 | 1M | 128k |
| mythos_500b | 12288 | 512 | 23040 | 48 | 1M | 128k |
| mythos_1t | 16384 | 512 | 34560 | 64 | 1M | 128k |

---

## 🔬 关键设计决策

### 1. 稳定性解决方案：Parcae架构

**问题**：
- Residual explosion: h_t 无界增长
- Loss spikes: 梯度爆炸

**解决方案**：
- A参数化为连续负对角矩阵
- 离散化: A_discrete = exp(Δt · A_continuous)
- 确保 ρ(A) < 1 (谱半径 < 1)

### 2. ACT (Adaptive Computation Time)

**目的**：解决"Overthinking"问题

**机制**：
- Halting score决定何时停止循环
- 简单任务：少循环，快速响应
- 复杂任务：多循环，深度思考

### 3. MoDA (Mixture-of-Depth Attention)

**创新**：每个注意力头同时关注：
- 当前层的KV pairs
- 所有前面层的depth KV pairs

---

## 🤔 对元神系统的启示

### ❌ 不能直接集成的原因

| 维度 | OpenMythos | 元神系统 |
|------|------------|----------|
| **层次** | LLM模型架构 | Agent编排框架 |
| **运行位置** | GPU/CPU推理 | OpenClaw上层 |
| **关注点** | Token处理 | 任务协作 |

### 💡 可借鉴的概念

| 概念 | 借鉴方式 | 难度 |
|------|----------|------|
| **循环深度思维** | Agent反思循环 | 低 |
| **MoE动态路由** | 动态Agent选择 | 中 |
| **三阶段架构** | 任务执行流程 | 低 |
| **ACT自适应** | 智能任务复杂度检测 | 低 |

### ⚠️ 重要洞察

**OpenMythos内部循环的优势**：
- 多维度探索（逻辑/创意/批判）
- 隐藏状态自动融合
- 只输出一次，不浪费token

**Agent循环的劣势**：
- 重复问询 = 单一维度重复
- 机械拼接 ≠ 真正综合
- 每次都生成token，消耗大

**结论**：没有多维度+内部综合的循环 = 伪深度思考

---

## 📊 集成优先级评估

| 方案 | 评估 | 结论 |
|------|------|------|
| Agent反思循环 | ❌ 无多维度 = 伪深度 | 不推荐 |
| OpenMythos API | ✅ 原生多维融合 | 优先集成 |
| 训练自己的模型 | ✅ 可控多维设计 | 长期目标 |

---

## 🔗 相关项目

| 项目 | 描述 |
|------|------|
| **Swarms** | Kye Gomez的多Agent编排框架 (6.4k stars) |
| **HybridMythos** | 分层循环Transformer |
| **nanochat** | OpenMythos循环实验 |

---

## 📦 安装与使用

```bash
pip install open-mythos

# 带Flash Attention2
pip install open-mythos[flash]
```

```python
import torch
from open_mythos.main import OpenMythos, MythosConfig

cfg = MythosConfig(
    vocab_size=1000,
    dim=256,
    n_heads=8,
    max_seq_len=128,
    max_loop_iters=4,
    prelude_layers=1,
    coda_layers=1,
    n_experts=8,
    expert_dim=64,
    attn_type="mla"  # or "gqa"
)

model = OpenMythos(cfg)
logits = model(ids, n_loops=4)
out = model.generate(ids, max_new_tokens=8, n_loops=8)
```

---

## 📝 决策记录

**2026-04-23**: 
- 分析完成，评估集成可能性
- **决定**: 作为理论储备，暂不集成
- **原因**: 短期变现目标（小程序+小说）优先，避免过度设计
- **适用场景**: 有资源/有深度推理需求时再启用

---

*最后更新: 2026-04-23 01:04*
