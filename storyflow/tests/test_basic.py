"""
单元测试 - 验证核心逻辑
"""

import asyncio
import sys
sys.path.append('.')

from engine import Node, Workflow, Engine, NodeResult


class TestNode1(Node):
    """测试节点1"""
    def __init__(self, node_id: str):
        super().__init__(node_id, "测试节点1")
        self.add_input("value", "int", True)
        self.add_output("result", "int")

    def execute(self) -> NodeResult:
        value = self.input_values.get("value", 0)
        return NodeResult(success=True, data={"result": value * 2})


class TestNode2(Node):
    """测试节点2"""
    def __init__(self, node_id: str):
        super().__init__(node_id, "测试节点2")
        self.add_input("input1", "int", True)
        self.add_input("input2", "int", True)
        self.add_output("sum", "int")

    def execute(self) -> NodeResult:
        input1 = self.input_values.get("input1", 0)
        input2 = self.input_values.get("input2", 0)
        return NodeResult(success=True, data={"sum": input1 + input2})


async def test_basic_workflow():
    """测试基本工作流"""
    print("\n🧪 测试 1: 基本工作流")

    workflow = Workflow("test_workflow", "测试工作流")

    # 创建节点
    node1 = TestNode1("node1")
    node2 = TestNode1("node2")
    node3 = TestNode2("node3")

    # 设置初始输入
    node1.set_input("value", 5)
    node2.set_input("value", 10)

    workflow.add_node(node1)
    workflow.add_node(node2)
    workflow.add_node(node3)

    # 添加连接
    workflow.add_connection("node1", "result", "node3", "input1")
    workflow.add_connection("node2", "result", "node3", "input2")

    # 执行工作流
    engine = Engine(workflow)
    result = await engine.execute()

    print(f"✅ 执行成功: {result['success']}")
    print(f"   节点1结果: {node1.output_values}")
    print(f"   节点2结果: {node2.output_values}")
    print(f"   节点3结果: {node3.output_values}")

    # 验证结果
    assert result['success'] == True
    assert node3.output_values['sum'] == 30  # (5*2) + (10*2) = 30
    print("   ✓ 测试通过")


async def test_topological_sort():
    """测试拓扑排序"""
    print("\n🧪 测试 2: 拓扑排序")

    workflow = Workflow("sort_test", "拓扑排序测试")

    node1 = TestNode1("node1")
    node2 = TestNode1("node2")
    node3 = TestNode2("node3")

    workflow.add_node(node1)
    workflow.add_node(node2)
    workflow.add_node(node3)

    workflow.add_connection("node1", "result", "node3", "input1")
    workflow.add_connection("node2", "result", "node3", "input2")

    execution_order = workflow.topological_sort()
    print(f"✅ 执行顺序: {execution_order}")

    # 验证 node1 和 node2 在 node3 之前
    node3_index = execution_order.index("node3")
    assert node3_index > execution_order.index("node1")
    assert node3_index > execution_order.index("node2")
    print("   ✓ 拓扑排序正确")


async def test_circular_dependency():
    """测试循环依赖检测"""
    print("\n🧪 测试 3: 循环依赖检测")

    workflow = Workflow("circular_test", "循环依赖测试")

    node1 = TestNode1("node1")
    node2 = TestNode1("node2")
    node3 = TestNode2("node3")

    workflow.add_node(node1)
    workflow.add_node(node2)
    workflow.add_node(node3)

    # 创建循环依赖
    workflow.add_connection("node1", "result", "node2", "input1")
    workflow.add_connection("node2", "result", "node3", "input1")
    workflow.add_connection("node3", "sum", "node1", "value")

    try:
        execution_order = workflow.topological_sort()
        print("❌ 未检测到循环依赖")
        assert False
    except ValueError as e:
        print(f"✅ 正确检测到循环依赖: {e}")
        print("   ✓ 循环依赖检测正确")


async def test_input_validation():
    """测试输入验证"""
    print("\n🧪 测试 4: 输入验证")

    workflow = Workflow("validation_test", "输入验证测试")

    node1 = TestNode1("node1")
    workflow.add_node(node1)

    # 不设置必需的输入
    try:
        engine = Engine(workflow)
        await engine.execute()
        print("❌ 未检测到缺失输入")
        assert False
    except ValueError as e:
        print(f"✅ 正确检测到缺失输入: {e}")
        print("   ✓ 输入验证正确")


async def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("🧪 StoryFlow 单元测试")
    print("=" * 60)

    try:
        await test_basic_workflow()
        await test_topological_sort()
        await test_circular_dependency()
        await test_input_validation()

        print("\n" + "=" * 60)
        print("✅ 所有测试通过！")
        print("=" * 60 + "\n")

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
