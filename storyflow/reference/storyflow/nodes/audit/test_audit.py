"""
审计节点单元测试
"""

import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from storyflow.nodes.audit import AuditNode, AITraceDetector, AuditSeverity
from storyflow.nodes.audit.example_data import (
    EXAMPLE_CHAPTER_DRAFT,
    EXAMPLE_TRUTH_FILES,
    EXAMPLE_OUTLINE,
    get_example_inputs
)


class TestAITraceDetector:
    """AI 痕迹检测器测试"""

    def __init__(self):
        self.detector = AITraceDetector()
        self.passed = 0
        self.failed = 0

    def test_high_frequency_detection(self):
        """测试高频词检测"""
        print("\n测试 1: 高频词检测")

        # 包含大量 AI 常用词的文本
        text = """总的来说，这是一个很好的例子。综上所述，我们可以得出结论。
        值得注意的是，这个问题很重要。换句话说，我们需要仔细考虑。
        不可否认的是，这个观点很有价值。毋庸置疑，我们应该认真对待。
        总的来说，总的来说，总的来说。"""

        issues = self.detector.detect(text)

        # 应该检测到高频词问题
        has_high_freq = any(i.issue_type == "high_frequency_word" for i in issues)

        if has_high_freq:
            print("✅ 通过: 检测到高频词问题")
            self.passed += 1
        else:
            print("❌ 失败: 未检测到高频词问题")
            self.failed += 1

    def test_sentence_monotony(self):
        """测试句式单调性检测"""
        print("\n测试 2: 句式单调性检测")

        # 句式单调的文本
        text = """这是一个句子。这是一个很长的句子。这是一个很短的句子。
        这是一个普通的句子。这是一个简单的句子。这是一个复杂的句子。
        这是一个很好的句子。这是一个很差的句子。这是一个漂亮的句子。""" * 3

        issues = self.detector.detect(text)

        # 应该检测到句式单调问题
        has_monotony = any(i.issue_type == "sentence_monotony" for i in issues)

        if has_monotony:
            print("✅ 通过: 检测到句式单调问题")
            self.passed += 1
        else:
            print("❌ 失败: 未检测到句式单调问题")
            self.failed += 1

    def test_over_summarization(self):
        """测试过度总结检测"""
        print("\n测试 3: 过度总结检测")

        # 包含大量总结的文本
        text = """第一段内容。总结来说，这是一段重要的内容。
        第二段内容。综上所述，这段内容也很重要。
        第三段内容。概括起来，这段内容同样重要。
        第四段内容。归纳起来，这段内容意义重大。
        第五段内容。简而言之，这段内容有价值。""" * 2

        issues = self.detector.detect(text)

        # 应该检测到过度总结问题
        has_summary = any(i.issue_type == "over_summarization" for i in issues)

        if has_summary:
            print("✅ 通过: 检测到过度总结问题")
            self.passed += 1
        else:
            print("❌ 失败: 未检测到过度总结问题")
            self.failed += 1

    def test_ai_smell_detection(self):
        """测试 AI 味表达检测"""
        print("\n测试 4: AI 味表达检测")

        # 包含 AI 味表达的文本
        text = """综上所述，这个问题很重要。总的来说，我们应该认真对待。
        值得注意的是，这个观点很有价值。不可否认的是，这个说法是正确的。
        随着时代的发展，社会在进步。在这个时代的背景下，我们需要思考。
        从不同的角度来看，这个问题有多种解读。"""

        issues = self.detector.detect(text)

        # 应该检测到 AI 味表达
        has_ai_smell = any(i.issue_type == "ai_smell_expression" for i in issues)

        if has_ai_smell:
            print(f"✅ 通过: 检测到 {len([i for i in issues if i.issue_type == 'ai_smell_expression'])} 个 AI 味表达")
            self.passed += 1
        else:
            print("❌ 失败: 未检测到 AI 味表达")
            self.failed += 1

    def test_ai_score_calculation(self):
        """测试 AI 评分计算"""
        print("\n测试 5: AI 评分计算")

        # 纯人工文本
        human_text = """今天天气真好。我去公园散步，看到了很多花。
        有一朵红色的花特别漂亮。我拍了张照片。"""

        human_score = self.detector.calculate_ai_score(human_text)

        # 明显的 AI 文本
        ai_text = """总的来说，这是一个美好的日子。综上所述，我应该去公园散步。
        值得注意的是，公园里有很多美丽的花朵。不可否认的是，那朵红色的花特别迷人。
        简而言之，我拍了一张照片。""" * 3

        ai_score = self.detector.calculate_ai_score(ai_text)

        if human_score < ai_score:
            print(f"✅ 通过: 人工文本评分 ({human_score:.2f}) < AI 文本评分 ({ai_score:.2f})")
            self.passed += 1
        else:
            print(f"❌ 失败: 评分计算不正确")
            self.failed += 1

    def run_all(self):
        """运行所有测试"""
        print("=" * 50)
        print("AI 痕迹检测器测试套件")
        print("=" * 50)

        self.test_high_frequency_detection()
        self.test_sentence_monotony()
        self.test_over_summarization()
        self.test_ai_smell_detection()
        self.test_ai_score_calculation()

        print("\n" + "=" * 50)
        print(f"测试完成: {self.passed} 通过, {self.failed} 失败")
        print("=" * 50)


class TestAuditNode:
    """审计节点测试"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.passed = 0
        self.failed = 0

    async def test_basic_audit(self):
        """测试基本审计功能"""
        print("\n测试 6: 基本审计功能")

        try:
            # 创建审计节点
            audit_node = AuditNode(
                node_id="test_audit_1",
                api_key=self.api_key,
                model="qwen-plus"
            )

            # 设置输入
            inputs = get_example_inputs()
            for key, value in inputs.items():
                audit_node.set_input(key, value)

            # 执行审计
            result = await audit_node.execute()

            if result.success:
                print("✅ 通过: 审计执行成功")
                self.passed += 1

                # 打印审计报告摘要
                report = result.data.get("audit_report", {})
                print(f"  - 得分: {result.data.get('score', 0):.3f}")
                print(f"  - 通过: {result.data.get('passed', False)}")
                print(f"  - 问题数: {result.data.get('issues_count', 0)}")
                print(f"  - 摘要: {report.get('summary', '')}")
            else:
                print(f"❌ 失败: {result.error}")
                self.failed += 1

        except Exception as e:
            print(f"❌ 失败: {str(e)}")
            self.failed += 1

    async def test_incremental_audit(self):
        """测试增量审计模式"""
        print("\n测试 7: 增量审计模式")

        try:
            # 创建审计节点
            audit_node = AuditNode(
                node_id="test_audit_2",
                api_key=self.api_key,
                model="qwen-plus"
            )

            # 设置输入（增量模式）
            inputs = get_example_inputs()
            inputs["incremental_mode"] = True
            inputs["new_content"] = EXAMPLE_CHAPTER_DRAFT[:200]  # 只审计前 200 字

            for key, value in inputs.items():
                audit_node.set_input(key, value)

            # 执行审计
            result = await audit_node.execute()

            if result.success:
                print("✅ 通过: 增量审计执行成功")
                self.passed += 1
                print(f"  - 得分: {result.data.get('score', 0):.3f}")
            else:
                print(f"❌ 失败: {result.error}")
                self.failed += 1

        except Exception as e:
            print(f"❌ 失败: {str(e)}")
            self.failed += 1

    async def test_empty_draft(self):
        """测试空草稿处理"""
        print("\n测试 8: 空草稿处理")

        try:
            audit_node = AuditNode(
                node_id="test_audit_3",
                api_key=self.api_key,
                model="qwen-plus"
            )

            # 设置空草稿
            audit_node.set_input("chapter_draft", "")
            audit_node.set_input("chapter_number", 1)
            audit_node.set_input("chapter_title", "")
            audit_node.set_input("truth_files", [])
            audit_node.set_input("previous_chapters", "")
            audit_node.set_input("outline", "")

            # 执行审计
            result = await audit_node.execute()

            # 应该失败或给出警告
            if not result.success or result.data.get("score", 0) == 0:
                print("✅ 通过: 空草稿被正确处理")
                self.passed += 1
            else:
                print("❌ 失败: 空草稿未被正确处理")
                self.failed += 1

        except Exception as e:
            print(f"✅ 通过: 空草稿抛出异常 - {str(e)}")
            self.passed += 1

    async def run_all(self):
        """运行所有测试"""
        print("=" * 50)
        print("审计节点测试套件")
        print("=" * 50)

        await self.test_basic_audit()
        await self.test_incremental_audit()
        await self.test_empty_draft()

        print("\n" + "=" * 50)
        print(f"测试完成: {self.passed} 通过, {self.failed} 失败")
        print("=" * 50)


async def run_all_tests(api_key: str):
    """运行所有测试套件"""
    print("\n" + "=" * 50)
    print("StoryFlow 审计节点 - 完整测试套件")
    print("=" * 50)

    # 测试 AI 痕迹检测器
    ai_detector_tests = TestAITraceDetector()
    ai_detector_tests.run_all()

    # 测试审计节点
    if api_key:
        audit_node_tests = TestAuditNode(api_key)
        await audit_node_tests.run_all()
    else:
        print("\n⚠️  跳过审计节点测试: 未提供 API Key")
        print("   设置环境变量 QWEN_API_KEY 以运行完整测试")

    # 汇总结果
    print("\n" + "=" * 50)
    total_passed = ai_detector_tests.passed
    total_failed = ai_detector_tests.failed

    if api_key:
        total_passed += audit_node_tests.passed
        total_failed += audit_node_tests.failed

    print(f"总计: {total_passed} 通过, {total_failed} 失败")
    print("=" * 50)

    return total_failed == 0


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="运行审计节点测试")
    parser.add_argument(
        "--api-key",
        type=str,
        default=os.environ.get("QWEN_API_KEY", ""),
        help="通义千问 API Key"
    )

    args = parser.parse_args()

    # 运行测试
    success = asyncio.run(run_all_tests(args.api_key))

    # 返回退出码
    sys.exit(0 if success else 1)
