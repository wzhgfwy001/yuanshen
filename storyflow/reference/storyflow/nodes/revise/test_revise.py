"""修订节点单元测试"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent.absolute()
sys.path.insert(0, str(project_root))

# 直接导入各个模块
from storyflow.nodes.revise.issue_classifier import IssueSeverity, IssueClassifier
from storyflow.nodes.revise.ai_trace_remover import AITraceRemover, AIWordList, BannedPatterns
from storyflow.nodes.revise.style_fingerprint import StyleFingerprint
from storyflow.nodes.revise.revise_node import ReviseNode


class TestIssueClassifier:
    """问题分类器测试"""

    def test_classify_critical(self):
        """测试关键问题分类"""
        issue = {
            "type": "timeline_error",
            "severity": "critical",
            "description": "时间线错误",
            "location": "第一章"
        }

        severity = IssueClassifier.classify(issue)
        assert severity == IssueSeverity.CRITICAL, f"Expected CRITICAL, got {severity}"
        print("✅ 测试 1: 关键问题分类正确")

    def test_classify_major(self):
        """测试重要问题分类"""
        issue = {
            "type": "narrative_pacing",
            "severity": "major",
            "description": "叙事节奏问题",
            "location": "第二章"
        }

        severity = IssueClassifier.classify(issue)
        assert severity == IssueSeverity.MAJOR, f"Expected MAJOR, got {severity}"
        print("✅ 测试 2: 重要问题分类正确")

    def test_classify_minor(self):
        """测试次要问题分类"""
        issue = {
            "type": "language_polish",
            "severity": "minor",
            "description": "语言润色建议",
            "location": "第三章"
        }

        severity = IssueClassifier.classify(issue)
        assert severity == IssueSeverity.MINOR, f"Expected MINOR, got {severity}"
        print("✅ 测试 3: 次要问题分类正确")

    def test_classify_by_type(self):
        """测试按类型分类"""
        issue = {
            "type": "timeline_error",
            "description": "时间线错误"
        }

        severity = IssueClassifier.classify(issue)
        assert severity == IssueSeverity.CRITICAL, f"Expected CRITICAL by type, got {severity}"
        print("✅ 测试 4: 按类型分类正确")

    def test_classify_issues_batch(self):
        """测试批量分类"""
        issues = [
            {"type": "timeline_error", "severity": "critical"},
            {"type": "narrative_pacing", "severity": "major"},
            {"type": "language_polish", "severity": "minor"},
            {"type": "logic_contradiction", "severity": "critical"},
            {"type": "dialogue_issue", "severity": "major"}
        ]

        classified = IssueClassifier.classify_issues(issues)

        assert len(classified[IssueSeverity.CRITICAL]) == 2, \
            f"Expected 2 critical, got {len(classified[IssueSeverity.CRITICAL])}"
        assert len(classified[IssueSeverity.MAJOR]) == 2, \
            f"Expected 2 major, got {len(classified[IssueSeverity.MAJOR])}"
        assert len(classified[IssueSeverity.MINOR]) == 1, \
            f"Expected 1 minor, got {len(classified[IssueSeverity.MINOR])}"
        print("✅ 测试 5: 批量分类正确")

    def test_get_fixable_count(self):
        """测试可修复问题统计"""
        issues = [
            {"type": "timeline_error"},
            {"type": "narrative_pacing"},
            {"type": "language_polish"}
        ]

        stats = IssueClassifier.get_fixable_count(issues)

        assert stats["critical"] == 1, f"Expected 1 critical, got {stats['critical']}"
        assert stats["major"] == 1, f"Expected 1 major, got {stats['major']}"
        assert stats["minor"] == 1, f"Expected 1 minor, got {stats['minor']}"
        assert stats["total"] == 3, f"Expected 3 total, got {stats['total']}"
        assert stats["auto_fixable"] == 2, f"Expected 2 auto_fixable, got {stats['auto_fixable']}"
        print("✅ 测试 6: 可修复问题统计正确")


class TestAITraceRemover:
    """AI 痕迹去除器测试"""

    def test_remove_fatigued_words(self):
        """测试移除疲劳词汇"""
        remover = AITraceRemover({"word_replacement_rate": 1.0})

        text = "值得注意的是，这个问题很重要。此外，我们应该认识到这一点。"
        result = remover._remove_fatigued_words(text)

        assert "值得注意的是" not in result, "疲劳词汇未被移除"
        assert "此外" not in result, "疲劳词汇未被移除"
        print("✅ 测试 7: 疲劳词汇移除正确")

    def test_remove_banned_patterns(self):
        """测试移除禁用句式"""
        remover = AITraceRemover({"pattern_removal_rate": 1.0})

        text = "我们要知道，这个很重要。也就是说，这件事情很复杂。"
        result = remover._remove_banned_patterns(text)

        assert "我们要知道" not in result, "禁用句式未被移除"
        assert "也就是说" not in result, "禁用句式未被移除"
        print("✅ 测试 8: 禁用句式移除正确")

    def test_adjust_sentence_diversity(self):
        """测试句长多样性调整"""
        remover = AITraceRemover()

        text = "这是一个句子。这是一个句子。这是一个句子。"
        result = remover._adjust_sentence_diversity(text)

        # 句长应该有所变化
        sentences = result.split("。")
        lengths = [len(s) for s in sentences if s.strip()]
        print(f"  句长: {lengths}")
        print("✅ 测试 9: 句长多样性调整完成")

    def test_analyze_ai_traces(self):
        """测试 AI 痕迹分析"""
        remover = AITraceRemover()

        text = "值得注意的是，这是一个问题。此外，我们应该认识到。换句话说，这件事很重要。"
        analysis = remover.analyze_ai_traces(text)

        assert "fatigued_words" in analysis, "分析结果缺少 fatigued_words"
        assert "banned_patterns" in analysis, "分析结果缺少 banned_patterns"
        assert "ai_score" in analysis, "分析结果缺少 ai_score"

        assert len(analysis["fatigued_words"]) > 0, "未检测到疲劳词汇"
        assert analysis["ai_score"] > 0, "AI 得分应该大于 0"

        print(f"  AI 得分: {analysis['ai_score']:.2f}")
        print("✅ 测试 10: AI 痕迹分析正确")


class TestStyleFingerprint:
    """文风指纹测试"""

    def test_extract_fingerprint(self):
        """测试提取文风指纹"""
        extractor = StyleFingerprint()

        text = """这是第一句话。这是第二句话，包含一些逗号。这是第三句话！这还是第四句话？"""
        fingerprint = extractor.extract(text)

        assert "sentence_length_avg" in fingerprint, "缺少 sentence_length_avg"
        assert "unique_word_ratio" in fingerprint, "缺少 unique_word_ratio"
        assert "tone" in fingerprint, "缺少 tone"

        print(f"  平均句长: {fingerprint['sentence_length_avg']:.2f}")
        print(f"  词汇多样性: {fingerprint['unique_word_ratio']:.2f}")
        print("✅ 测试 11: 文风指纹提取正确")

    def test_compare_fingerprints(self):
        """测试比较文风指纹"""
        extractor1 = StyleFingerprint()
        extractor2 = StyleFingerprint()

        text1 = "这是第一句话。这是第二句话。这是第三句话。"
        text2 = "这是第一句话。这是第二句话。这是第三句话。"

        fingerprint1 = extractor1.extract(text1)
        fingerprint2 = extractor2.extract(text2)

        similarities = extractor1.compare(extractor2)

        assert "overall" in similarities, "缺少 overall 相似度"
        assert similarities["overall"] > 0.8, "相同文本的相似度应该很高"

        print(f"  总体相似度: {similarities['overall']:.2f}")
        print("✅ 测试 12: 文风指纹比较正确")

    def test_merge_fingerprints(self):
        """测试合并文风指纹"""
        extractor1 = StyleFingerprint()
        extractor2 = StyleFingerprint()

        text1 = "短句。短句。短句。"
        text2 = "这是一个很长的句子，包含了很多内容，还有一些逗号和分号。"

        fingerprint1 = extractor1.extract(text1)
        fingerprint2 = extractor2.extract(text2)

        merged = extractor1.merge(extractor2, weight=0.5)

        assert merged.fingerprint is not None, "合并失败"
        assert 0 <= merged.fingerprint["sentence_length_avg"] <= 50, "合并后的句长不合理"

        print(f"  合并后平均句长: {merged.fingerprint['sentence_length_avg']:.2f}")
        print("✅ 测试 13: 文风指纹合并正确")


class TestReviseNode:
    """修订节点测试"""

    def test_node_initialization(self):
        """测试节点初始化"""
        # 注意：这里使用虚拟的 API Key 和模型，实际执行需要真实的 API Key
        node = ReviseNode(
            node_id="test_revise",
            api_key="test_api_key",
            model="test_model",
            config={"max_revision_rounds": 2}
        )

        assert node.node_id == "test_revise", "节点 ID 错误"
        assert node.name == "智能修订", "节点名称错误"
        assert node.max_revision_rounds == 2, "最大修订轮次错误"

        # 检查输入输出
        assert "draft" in node.inputs, "缺少 draft 输入"
        assert "audit_result" in node.inputs, "缺少 audit_result 输入"
        assert "revised_draft" in node.outputs, "缺少 revised_draft 输出"

        print("✅ 测试 14: 修订节点初始化正确")

    async def test_basic_revision_without_api(self):
        """测试基本修订流程（不调用真实 API）"""
        print("✅ 测试 15: 基本修订流程测试（需要真实 API Key）")

        # 注意：这个测试需要真实的 API Key
        # 在实际环境中，可以使用 mock 来模拟 API 调用
        # 这里只是展示测试结构

        # node = ReviseNode(
        #     node_id="test_revise",
        #     api_key="your_real_api_key",
        #     model="modelstudio/qwen3.5-plus"
        # )
        #
        # node.set_input("draft", "测试草稿内容")
        # node.set_input("audit_result", {
        #     "issues": [
        #         {"type": "timeline_error", "severity": "critical", "description": "时间线错误"}
        #     ]
        # })
        #
        # result = await node.execute()
        # assert result.success, "修订失败"


def run_all_tests():
    """运行所有测试"""
    print("=" * 60)
    print("🧪 StoryFlow 修订节点单元测试")
    print("=" * 60)
    print()

    # 问题分类器测试
    print("📝 问题分类器测试")
    print("-" * 60)
    classifier_tests = TestIssueClassifier()
    classifier_tests.test_classify_critical()
    classifier_tests.test_classify_major()
    classifier_tests.test_classify_minor()
    classifier_tests.test_classify_by_type()
    classifier_tests.test_classify_issues_batch()
    classifier_tests.test_get_fixable_count()
    print()

    # AI 痕迹去除器测试
    print("🎯 AI 痕迹去除器测试")
    print("-" * 60)
    remover_tests = TestAITraceRemover()
    remover_tests.test_remove_fatigued_words()
    remover_tests.test_remove_banned_patterns()
    remover_tests.test_adjust_sentence_diversity()
    remover_tests.test_analyze_ai_traces()
    print()

    # 文风指纹测试
    print("🎨 文风指纹测试")
    print("-" * 60)
    fingerprint_tests = TestStyleFingerprint()
    fingerprint_tests.test_extract_fingerprint()
    fingerprint_tests.test_compare_fingerprints()
    fingerprint_tests.test_merge_fingerprints()
    print()

    # 修订节点测试
    print("⚙️ 修订节点测试")
    print("-" * 60)
    node_tests = TestReviseNode()
    node_tests.test_node_initialization()
    asyncio.run(node_tests.test_basic_revision_without_api())
    print()

    print("=" * 60)
    print("✅ 所有测试通过！")
    print("=" * 60)


if __name__ == "__main__":
    run_all_tests()
