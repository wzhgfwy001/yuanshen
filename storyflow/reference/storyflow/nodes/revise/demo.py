"""修订节点演示脚本"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from storyflow.nodes.revise.issue_classifier import IssueClassifier, IssueSeverity
from storyflow.nodes.revise.ai_trace_remover import AITraceRemover
from storyflow.nodes.revise.style_fingerprint import StyleFingerprint


# 示例草稿（带有明显的 AI 痕迹）
SAMPLE_DRAFT_WITH_AI_TRACES = """
值得注意的是，这个故事讲述了一个奇幻世界。显而易见，这个世界充满了魔法和冒险。

在这个基础上，主角开始了一段旅程。与此同时，他也遇到了各种各样的挑战。

可以说，这是一段激动人心的冒险。事实上，主角最终取得了成功。

此外，我们需要认识到，这个故事不仅仅是一个简单的故事。换句话说，它包含了很多深层的含义。

在这个基础上，我们可以看到作者的创作意图。值得注意的是，这个故事传达了一个重要的信息。

这就意味着，我们需要仔细思考故事的主题。毫无疑问，这是一个值得深思的问题。

换句话说，这个故事告诉我们，勇气和智慧是成功的关键。具体来说，主角通过自己的努力和坚持，最终实现了目标。

这就表明，只要有坚定的信念，就能够克服一切困难。
"""


# 示例审计结果
SAMPLE_AUDIT_RESULT = {
    "draft": SAMPLE_DRAFT_WITH_AI_TRACES,
    "issues": [
        {
            "type": "timeline_error",
            "severity": "critical",
            "location": "第 1 段",
            "description": "时间线描述不清楚",
            "suggestion": "明确时间顺序"
        },
        {
            "type": "narrative_pacing",
            "severity": "major",
            "location": "全文",
            "description": "叙事节奏单调",
            "suggestion": "增加节奏变化"
        },
        {
            "type": "language_polish",
            "severity": "minor",
            "location": "多处",
            "description": "语言过于生硬",
            "suggestion": "优化表达方式"
        }
    ]
}


async def demo_issue_classifier():
    """演示问题分类器"""
    print("=" * 70)
    print("📝 演示 1: 问题分类器")
    print("=" * 70)
    print()

    issues = SAMPLE_AUDIT_RESULT["issues"]

    print("原始问题列表:")
    for i, issue in enumerate(issues, 1):
        print(f"{i}. [{issue['severity']}] {issue['type']}: {issue['description']}")
    print()

    # 分类问题
    classified = IssueClassifier.classify_issues(issues)

    print("分类结果:")
    print(f"  🔴 关键问题: {len(classified[IssueSeverity.CRITICAL])} 个")
    print(f"  🟡 重要问题: {len(classified[IssueSeverity.MAJOR])} 个")
    print(f"  🟢 次要问题: {len(classified[IssueSeverity.MINOR])} 个")
    print()

    # 统计
    stats = IssueClassifier.get_fixable_count(issues)
    print("统计信息:")
    print(f"  总问题数: {stats['total']}")
    print(f"  可自动修复: {stats['auto_fixable']}")
    if stats['total'] > 0:
        success_rate = stats['auto_fixable'] / stats['total']
        print(f"  自动修复成功率: {success_rate * 100:.1f}%")
    print()


async def demo_ai_trace_remover():
    """演示 AI 痕迹去除器"""
    print("=" * 70)
    print("🎯 演示 2: AI 痕迹去除器")
    print("=" * 70)
    print()

    print("原始文本（带有明显的 AI 痕迹）:")
    print("-" * 70)
    print(SAMPLE_DRAFT_WITH_AI_TRACES)
    print("-" * 70)
    print()

    # 分析 AI 痕迹
    remover = AITraceRemover({"word_replacement_rate": 0.8, "pattern_removal_rate": 0.9})

    analysis = remover.analyze_ai_traces(SAMPLE_DRAFT_WITH_AI_TRACES)
    print("AI 痕迹分析:")
    print(f"  AI 得分: {analysis['ai_score']:.2f}")
    print(f"  疲劳词汇数量: {len(analysis['fatigued_words'])}")
    print(f"  禁用句式数量: {len(analysis['banned_patterns'])}")
    print()

    # 显示检测到的疲劳词汇
    if analysis['fatigued_words']:
        print("检测到的疲劳词汇:")
        for item in analysis['fatigued_words'][:5]:
            print(f"  - '{item['word']}': 出现 {item['count']} 次")
        print()

    # 去除 AI 痕迹
    cleaned_text = remover.remove_ai_traces(SAMPLE_DRAFT_WITH_AI_TRACES)

    print("去除 AI 痕迹后的文本:")
    print("-" * 70)
    print(cleaned_text)
    print("-" * 70)
    print()

    # 再次分析
    new_analysis = remover.analyze_ai_traces(cleaned_text)
    print("去除后的 AI 痕迹分析:")
    print(f"  AI 得分: {new_analysis['ai_score']:.2f}")
    print(f"  改善: {analysis['ai_score'] - new_analysis['ai_score']:.2f}")
    print()


async def demo_style_fingerprint():
    """演示文风指纹"""
    print("=" * 70)
    print("🎨 演示 3: 文风指纹")
    print("=" * 70)
    print()

    # 示例文本
    text1 = """这是一个充满魔法的世界。在这个世界里，每个人都有自己的故事。"""
    text2 = """这里是一个充满魔法的世界。在这个世界中，每个人都有属于自己的故事。"""

    print("文本 1:")
    print(f"  {text1}")
    print()

    print("文本 2:")
    print(f"  {text2}")
    print()

    # 提取文风指纹
    extractor1 = StyleFingerprint()
    extractor2 = StyleFingerprint()

    fingerprint1 = extractor1.extract(text1)
    fingerprint2 = extractor2.extract(text2)

    print("文本 1 的文风指纹:")
    print(f"  平均句长: {fingerprint1['sentence_length_avg']:.2f}")
    print(f"  词汇多样性: {fingerprint1['unique_word_ratio']:.2f}")
    print(f"  段落长度: {fingerprint1['paragraph_length_avg']:.2f}")
    print()

    print("文本 2 的文风指纹:")
    print(f"  平均句长: {fingerprint2['sentence_length_avg']:.2f}")
    print(f"  词汇多样性: {fingerprint2['unique_word_ratio']:.2f}")
    print(f"  段落长度: {fingerprint2['paragraph_length_avg']:.2f}")
    print()

    # 比较相似度
    similarities = extractor1.compare(extractor2)
    print("相似度分析:")
    print(f"  句长相似度: {similarities['sentence_length'] * 100:.1f}%")
    print(f"  词汇多样性相似度: {similarities['word_diversity'] * 100:.1f}%")
    print(f"  语气相似度: {similarities['tone'] * 100:.1f}%")
    print(f"  总体相似度: {similarities['overall'] * 100:.1f}%")
    print()


async def demo_combined_revision():
    """演示完整的修订流程"""
    print("=" * 70)
    print("⚙️  演示 4: 完整修订流程（不调用真实 API）")
    print("=" * 70)
    print()

    print("说明: 完整的修订流程需要真实的 API Key，这里仅展示流程结构")
    print()

    # 步骤 1: 分类问题
    print("步骤 1: 分类审计结果中的问题")
    issues = SAMPLE_AUDIT_RESULT["issues"]
    classified = IssueClassifier.classify_issues(issues)
    print(f"  ✅ 关键问题: {len(classified[IssueSeverity.CRITICAL])} 个")
    print(f"  ✅ 重要问题: {len(classified[IssueSeverity.MAJOR])} 个")
    print(f"  💡 次要问题: {len(classified[IssueSeverity.MINOR])} 个")
    print()

    # 步骤 2: 去 AI 味处理
    print("步骤 2: 去除 AI 痕迹")
    remover = AITraceRemover()
    cleaned_text = remover.remove_ai_traces(SAMPLE_DRAFT_WITH_AI_TRACES)
    print(f"  ✅ 去除完成")
    print(f"  原始长度: {len(SAMPLE_DRAFT_WITH_AI_TRACES)} 字符")
    print(f"  处理后长度: {len(cleaned_text)} 字符")
    print(f"  变化: {len(cleaned_text) - len(SAMPLE_DRAFT_WITH_AI_TRACES)} 字符")
    print()

    # 步骤 3: 生成修订摘要
    print("步骤 3: 生成修订摘要")
    stats = IssueClassifier.get_fixable_count(issues)
    summary = {
        "revision_rounds": 1,
        "original_issue_count": len(issues),
        "critical_fixed": stats["critical"],
        "major_fixed": stats["major"],
        "minor_suggestions": stats["minor"],
        "auto_fixable_issues": stats["auto_fixable"],
        "success_rate": stats["success_rate"]
    }
    print(f"  ✅ 摘要生成完成")
    for key, value in summary.items():
        if isinstance(value, float):
            print(f"    {key}: {value * 100:.1f}%")
        else:
            print(f"    {key}: {value}")
    print()

    # 步骤 4: 生成次要问题建议
    print("步骤 4: 生成次要问题建议")
    suggestions = []
    for issue in classified[IssueSeverity.MINOR]:
        suggestion = {
            "type": issue["type"],
            "location": issue["location"],
            "description": issue["description"],
            "suggestion": issue["suggestion"]
        }
        suggestions.append(suggestion)
    print(f"  ✅ 建议生成完成")
    for suggestion in suggestions:
        print(f"    - [{suggestion['type']}] {suggestion['description']}")
    print()

    print("说明: 关键和重要问题的修复需要调用 LLM API")
    print("      配置真实的 API Key 后即可使用 ReviseNode 进行完整修订")
    print()


async def main():
    """主演示函数"""
    print("\n")
    print("🎨 StoryFlow 修订节点 - 功能演示")
    print("=" * 70)
    print()

    await demo_issue_classifier()
    await demo_ai_trace_remover()
    await demo_style_fingerprint()
    await demo_combined_revision()

    print("=" * 70)
    print("✅ 演示完成！")
    print("=" * 70)
    print()
    print("💡 提示:")
    print("  1. 要使用完整的修订功能，需要配置通义千问 API Key")
    print("  2. 查看 examples.py 了解如何使用 ReviseNode")
    print("  3. 查看 README.md 了解详细的 API 文档")
    print()


if __name__ == "__main__":
    asyncio.run(main())
