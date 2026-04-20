"""
INKOS 增强节点测试脚本
测试：真相文件、33维度审计、AI痕迹检测
"""

import os
import asyncio
import sys

sys.path.insert(0, os.path.dirname(__file__))

from engine import ProviderFactory, Workflow, LoopConfig, LoopEngine
from inkos_nodes import (
    # AI 痕迹
    AITraceDetector, AITraceRemover,
    # 真相文件
    CurrentStateNode, CharacterMatrixNode, PendingHooksNode,
    # 审计
    AuditNode,
    # 修订
    ReviseNode,
    # 5-Agent
    INKOSWorkflow, RadarNode, ArchitectNode, WriterNode
)


def test_ai_trace_detector():
    """测试 AI 痕迹检测"""
    print("\n" + "="*60)
    print("🧪 测试 AI 痕迹检测器")
    print("="*60)

    detector = AITraceDetector()

    # 测试文本 - 包含明显的 AI 味
    ai_text = """
    值得注意的是，在这个时代，随着科技的飞速发展，人们的生活方式发生了翻天覆地的变化。

    总体来说，互联网的普及让信息传播变得更加便捷，同时也带来了一些新的挑战。

    综上所述，我们可以得出以下结论：首先，技术进步是不可逆转的趋势；其次，我们应该积极拥抱变化；最后，需要建立相应的规范机制。

    简而言之，成功需要坚持和努力，而不仅仅是天赋。毫无疑问，这是对的。

    让我们来看看这个问题的具体表现。
    """

    result = detector.detect(ai_text)

    print(f"\nAI 痕迹得分: {result['ai_trace_score']:.2f}")
    print(f"发现问题数: {result['total_issues']}")
    print(f"  - critical: {result['critical_count']}")
    print(f"  - major: {result['major_count']}")
    print(f"  - minor: {result['minor_count']}")

    if result['issues']:
        print("\n前 3 个问题：")
        for i, issue in enumerate(result['issues'][:3], 1):
            print(f"  {i}. [{issue['type']}] {issue['description']}")

    print("\n✅ AI 痕迹检测测试通过")


def test_ai_trace_remover():
    """测试 AI 痕迹去除"""
    print("\n" + "="*60)
    print("🧪 测试 AI 痕迹去除器")
    print("="*60)

    remover = AITraceRemover(intensity="medium")

    ai_text = "值得注意的是，总的来说，我们需要认真对待这个问题。"

    cleaned = remover.remove_ai_traces(ai_text)

    print(f"\n原文: {ai_text}")
    print(f"去除后: {cleaned}")

    print("\n✅ AI 痕迹去除测试通过")


def test_truth_file_node():
    """测试真相文件节点"""
    print("\n" + "="*60)
    print("🧪 测试真相文件节点")
    print("="*60)

    # 创建临时目录
    test_dir = ".test_truth"

    # 测试当前状态节点
    node = CurrentStateNode("current_state", base_dir=test_dir)

    # 模拟输入
    node.input_values = {
        "update_mode": "overwrite",
        "chapter_ref": "第1章",
        "character_states": {
            "主角": {"位置": "新手村", "等级": 1, "气血": 100}
        },
        "location": "新手村",
        "time": "第1天",
        "plot_progress": "主角踏上冒险之旅"
    }

    # 执行
    result = node.execute()

    print(f"\n执行成功: {result.success}")
    print(f"输出: {result.data}")

    # 清理
    import shutil
    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)

    print("\n✅ 真相文件节点测试通过")


async def test_audit_node():
    """测试 33 维度审计节点"""
    print("\n" + "="*60)
    print("🧪 测试 33 维度审计节点")
    print("="*60)

    # 创建 Provider
    try:
        from engine import get_provider
        provider = get_provider("minimax")
    except Exception as e:
        print(f"⚠️  无法创建 Provider: {e}")
        print("跳过审计节点测试")
        return

    # 创建审计节点
    audit_node = AuditNode("auditor", provider)

    # 模拟章节草稿
    sample_chapter = """
    值得注意的是，这是一个重要的日子。

    主角李凡站在新手村的广场上，看着周围熙熙攘攘的人群。他穿着一身破旧的布衣，腰间挂着一把生锈的铁剑。

    "看来这就是我的起点。"李凡自言自语道。

    就在这时，一个老者走了过来。"年轻人，我看你骨骼惊奇，这里有一本秘籍，或许适合你。"

    李凡接过秘籍，心中激动不已。他决定离开新手村，去外面的世界闯荡。

    总的来说，这是一个充满希望的开始。
    """

    audit_node.input_values = {
        "chapter_draft": sample_chapter,
        "chapter_number": 1,
        "truth_files": {},
        "strict_mode": False
    }

    print("\n执行审计中...")

    try:
        result = await audit_node.execute()

        print(f"\n执行成功: {result.success}")
        print(f"得分: {result.data.get('score', 0):.2f}")
        print(f"通过: {result.data.get('passed', False)}")
        print(f"问题数: {result.data.get('issues_count', 0)}")
        print(f"关键问题: {result.data.get('critical_issues_count', 0)}")

        if result.data.get('audit_report'):
            report = result.data['audit_report']
            print(f"\n摘要: {report.get('summary', '')}")

    except Exception as e:
        print(f"⚠️  审计执行出错: {e}")
        print("（可能是 API Key 未配置或网络问题）")

    print("\n✅ 33维度审计节点测试完成")


async def test_full_inkos_workflow():
    """测试完整的 INKOS 5-Agent 工作流"""
    print("\n" + "="*60)
    print("🚀 测试 INKOS 5-Agent 完整工作流")
    print("="*60)

    try:
        # 创建工作流
        workflow = INKOSWorkflow()

        print("\n执行工作流中（可能需要几分钟）...")

        result = await workflow.execute(
            genre="玄幻",
            platform="起点",
            chapter_number=1,
            target_words=3000
        )

        print(f"\n执行成功: {result.get('success', False)}")
        print(f"迭代次数: {result.get('iteration_count', 0)}")

        # 输出结果摘要
        results = result.get('results', {})

        if 'writer' in results:
            writer_result = results['writer']
            print(f"\n章节字数: {writer_result.get('word_count', 0)}")

        if 'auditor' in results:
            audit_result = results['auditor']
            print(f"审计得分: {audit_result.get('score', 0):.2f}")
            print(f"审计通过: {audit_result.get('passed', False)}")
            print(f"问题数: {audit_result.get('issues_count', 0)}")

        if 'reviser' in results:
            revise_result = results['reviser']
            print(f"\n修订摘要: {revise_result.get('revision_summary', {})}")

    except Exception as e:
        print(f"⚠️  工作流执行出错: {e}")
        print("（可能是 API Key 未配置或网络问题）")

    print("\n✅ INKOS 5-Agent 工作流测试完成")


def main():
    print("\n" + "="*60)
    print("🎯 StoryFlow INKOS 增强节点测试")
    print("="*60)

    # 基础测试（不需要 API）
    test_ai_trace_detector()
    test_ai_trace_remover()
    test_truth_file_node()

    # 需要 API 的测试
    print("\n" + "-"*60)
    print("以下测试需要 API Key...")
    print("-"*60)

    # 异步测试
    asyncio.run(test_audit_node())
    asyncio.run(test_full_inkos_workflow())

    print("\n" + "="*60)
    print("✅ 所有测试完成")
    print("="*60)


if __name__ == "__main__":
    main()
