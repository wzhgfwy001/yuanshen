"""
审计节点演示脚本
展示如何使用 33 维度审计节点
"""

import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from storyflow.nodes.audit import AuditNode, AITraceDetector
from storyflow.nodes.audit.example_data import (
    EXAMPLE_CHAPTER_DRAFT,
    EXAMPLE_TRUTH_FILES,
    EXAMPLE_OUTLINE,
    get_example_inputs
)


async def demo_basic_audit(api_key: str):
    """演示基本审计功能"""
    print("\n" + "=" * 60)
    print("演示 1: 基本审计功能")
    print("=" * 60)

    # 创建审计节点
    audit_node = AuditNode(
        node_id="demo_audit_1",
        api_key=api_key,
        model="qwen-plus"
    )

    # 设置输入
    inputs = get_example_inputs()
    for key, value in inputs.items():
        audit_node.set_input(key, value)

    print(f"\n正在审计第 {inputs['chapter_number']} 章...")
    print(f"章标题: {inputs['chapter_title']}")
    print(f"草稿字数: {len(inputs['chapter_draft'])} 字")
    print(f"真相文件数量: {len(inputs['truth_files'])}")

    # 执行审计
    print("\n⏳ 正在执行审计...")
    result = await audit_node.execute()

    if result.success:
        # 打印结果
        report = result.data.get("audit_report", {})

        print("\n" + "-" * 60)
        print("审计结果")
        print("-" * 60)
        print(f"✅ 审计完成")
        print(f"📊 综合得分: {result.data.get('score', 0):.3f}")
        print(f"✓ 是否通过: {'是' if result.data.get('passed') else '否'}")
        print(f"⚠️  问题总数: {result.data.get('issues_count', 0)}")

        # 打印 AI 痕迹评分
        ai_report = report.get("ai_trace_report", {})
        ai_score = ai_report.get("ai_trace_score", 0.0)
        print(f"🤖 AI 痕迹评分: {ai_score:.3f}")

        # 打印审计摘要
        print("\n📝 审计摘要:")
        print(report.get("summary", ""))

        # 打印维度得分（前 5 个最低分）
        print("\n📊 维度得分（最低 5 个）:")
        dimension_scores = report.get("dimension_scores", {})
        sorted_dimensions = sorted(
            dimension_scores.items(),
            key=lambda x: x[1]
        )[:5]

        for dim_name, score in sorted_dimensions:
            print(f"  - {dim_name}: {score:.3f}")

        # 打印主要问题
        issues = report.get("issues", [])
        if issues:
            print("\n⚠️  主要问题:")
            for idx, issue in enumerate(issues[:3], 1):
                print(f"\n  {idx}. [{issue['dimension']}] - {issue['severity']}")
                print(f"     描述: {issue['description']}")
                print(f"     位置: {issue['location']}")
                print(f"     建议: {issue['suggestion']}")

    else:
        print(f"\n❌ 审计失败: {result.error}")


async def demo_incremental_audit(api_key: str):
    """演示增量审计功能"""
    print("\n" + "=" * 60)
    print("演示 2: 增量审计功能")
    print("=" * 60)

    # 创建审计节点
    audit_node = AuditNode(
        node_id="demo_audit_2",
        api_key=api_key,
        model="qwen-plus"
    )

    # 模拟：第一次审计全文
    print("\n📌 第一步: 审计全文")
    inputs = get_example_inputs()
    for key, value in inputs.items():
        audit_node.set_input(key, value)

    result_full = await audit_node.execute()

    if result_full.success:
        print(f"✅ 全文审计完成")
        print(f"📊 得分: {result_full.data['score']:.3f}")
        print(f"⚠️  问题数: {result_full.data['issues_count']}")

    # 模拟：第二次审计新增内容
    print("\n📌 第二步: 审计新增内容（增量模式）")

    # 创建新节点
    audit_node_incremental = AuditNode(
        node_id="demo_audit_3",
        api_key=api_key,
        model="qwen-plus"
    )

    # 添加了一些新内容
    new_content = """艾瑞克回到家中，祖母玛莎正在厨房里忙碌。
    "回来啦，艾瑞克。"祖母转过身，慈祥地微笑着，"今天的收获如何？"

    艾瑞克看了看自己的手掌，那里有一个发光的符文。
    "祖母，我...我遇到了一些事情。""""

    audit_node_incremental.set_input("chapter_draft", EXAMPLE_CHAPTER_DRAFT + new_content)
    audit_node_incremental.set_input("chapter_number", 1)
    audit_node_incremental.set_input("chapter_title", "意外的发现")
    audit_node_incremental.set_input("truth_files", EXAMPLE_TRUTH_FILES)
    audit_node_incremental.set_input("previous_chapters", "")
    audit_node_incremental.set_input("outline", EXAMPLE_OUTLINE)
    audit_node_incremental.set_input("incremental_mode", True)
    audit_node_incremental.set_input("new_content", new_content)

    print(f"📝 新增内容: {len(new_content)} 字")

    result_incremental = await audit_node_incremental.execute()

    if result_incremental.success:
        print(f"✅ 增量审计完成")
        print(f"📊 得分: {result_incremental.data['score']:.3f}")
        print(f"⚠️  问题数: {result_incremental.data['issues_count']}")


def demo_ai_trace_detector():
    """演示 AI 痕迹检测器"""
    print("\n" + "=" * 60)
    print("演示 3: AI 痕迹检测器")
    print("=" * 60)

    detector = AITraceDetector()

    # 测试文本 1: 人工写作
    human_text = """今天天气很好。我去公园散步，看到了很多花。
    有一朵红色的花特别漂亮。我拍了张照片，发给朋友看。
    朋友说花很漂亮。我很开心。"""

    print("\n📝 测试文本 1（人工写作）:")
    print(human_text)

    issues_human = detector.detect(human_text)
    score_human = detector.calculate_ai_score(human_text)

    print(f"\n📊 检测结果:")
    print(f"  AI 痕迹评分: {score_human:.3f}")
    print(f"  发现问题: {len(issues_human)} 个")

    # 测试文本 2: AI 风格
    ai_text = """总的来说，这是一个美好的日子。综上所述，我应该去公园散步。
    值得注意的是，公园里有很多美丽的花朵。不可否认的是，那朵红色的花特别迷人。
    简而言之，我拍了一张照片发给朋友。朋友回答说花朵非常漂亮。
    总的来说，我感到非常开心。综上所述，这是一个愉快的经历。"""

    print("\n📝 测试文本 2（AI 风格）:")
    print(ai_text)

    issues_ai = detector.detect(ai_text)
    score_ai = detector.calculate_ai_score(ai_text)

    print(f"\n📊 检测结果:")
    print(f"  AI 痕迹评分: {score_ai:.3f}")
    print(f"  发现问题: {len(issues_ai)} 个")

    if issues_ai:
        print(f"\n⚠️  发现的问题:")
        for issue in issues_ai[:5]:
            print(f"  - [{issue.issue_type}] {issue.description}")
            print(f"    证据: {issue.evidence}")

    # 对比
    print(f"\n📈 对比:")
    print(f"  人工文本评分: {score_human:.3f}")
    print(f"  AI 文本评分: {score_ai:.3f}")
    print(f"  差异: {abs(score_ai - score_human):.3f}")


async def run_demo(api_key: str):
    """运行所有演示"""
    print("\n" + "=" * 60)
    print("StoryFlow 审计节点 - 功能演示")
    print("=" * 60)
    print(f"\nAPI Key: {'已设置' if api_key else '未设置'}")

    # 演示 AI 痕迹检测器（不需要 API Key）
    demo_ai_trace_detector()

    # 演示审计节点（需要 API Key）
    if api_key:
        await demo_basic_audit(api_key)
        await demo_incremental_audit(api_key)
    else:
        print("\n" + "=" * 60)
        print("⚠️  跳过审计节点演示")
        print("=" * 60)
        print("\n审计节点演示需要通义千问 API Key。")
        print("请设置环境变量 QWEN_API_KEY 或使用 --api-key 参数。")

    print("\n" + "=" * 60)
    print("演示完成")
    print("=" * 60)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="运行审计节点演示")
    parser.add_argument(
        "--api-key",
        type=str,
        default=os.environ.get("QWEN_API_KEY", ""),
        help="通义千问 API Key"
    )

    args = parser.parse_args()

    # 运行演示
    asyncio.run(run_demo(args.api_key))
