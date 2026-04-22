#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""StoryFlow Core Test - with proper encoding handling"""
import sys
import io
import os

# Set UTF-8 encoding for stdout/stderr on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

os.chdir(r'C:\Users\DELL\.openclaw\workspace\storyflow')

import asyncio
from engine import Workflow, Engine, Node, NodeResult

print("=" * 60)
print("StoryFlow Core Engine Test")
print("=" * 60)

# Test 1: Simple Node Execution
print("\n[TEST 1] Simple Node Execution")
print("-" * 40)

class TestNode(Node):
    def __init__(self, node_id):
        super().__init__(node_id, 'Test')
        self.add_input('x', 'int', True, 5)
        self.add_output('result', 'int')
    
    def execute(self):
        x = self.input_values.get('x', 0)
        return NodeResult(success=True, data={'result': x * 2})

wf = Workflow('test', 'Test')
tnode = TestNode('t1')
wf.add_node(tnode)
tnode.set_input('x', 10)

engine = Engine(wf)
result = asyncio.run(engine.execute())

print(f"Workflow: {wf.name}")
print(f"Nodes: {list(wf.nodes.keys())}")
print(f"Success: {result['success']}")
res = result.get('results', {}).get('t1', {})
print(f"10 * 2 = {res.get('result')}")

# Test 2: Multi-node workflow
print("\n[TEST 2] Multi-node Workflow")
print("-" * 40)

class AddNode(Node):
    def __init__(self, node_id):
        super().__init__(node_id, 'Add')
        self.add_input('a', 'int', True, 0)
        self.add_input('b', 'int', True, 0)
        self.add_output('sum', 'int')
    
    def execute(self):
        a = self.input_values.get('a', 0)
        b = self.input_values.get('b', 0)
        return NodeResult(success=True, data={'sum': a + b})

class MultiplyNode(Node):
    def __init__(self, node_id):
        super().__init__(node_id, 'Multiply')
        self.add_input('x', 'int', True, 0)
        self.add_input('y', 'int', True, 0)
        self.add_output('product', 'int')
    
    def execute(self):
        x = self.input_values.get('x', 0)
        y = self.input_values.get('y', 0)
        return NodeResult(success=True, data={'product': x * y})

wf2 = Workflow('calc', 'Calculator')
node_a = AddNode('add')
node_m = MultiplyNode('mul')
wf2.add_node(node_a)
wf2.add_node(node_m)

# Set initial inputs
node_a.set_input('a', 3)
node_a.set_input('b', 7)

# Connect: add.sum -> mul.x
wf2.add_connection('add', 'sum', 'mul', 'x')
node_m.set_input('y', 2)

engine2 = Engine(wf2)
result2 = asyncio.run(engine2.execute())

print(f"Workflow: {wf2.name}")
print(f"Success: {result2['success']}")
add_result = result2.get('results', {}).get('add', {}).get('sum')
mul_result = result2.get('results', {}).get('mul', {}).get('product')
print(f"3 + 7 = {add_result}")
print(f"10 * 2 = {mul_result}")

# Test 3: Topological Sort
print("\n[TEST 3] Topological Sort")
print("-" * 40)

wf3 = Workflow('sort_test', 'Sort Test')
for i in range(5):
    n = Node(f'node_{i}', f'Node {i}')
    n.add_input('in', 'int', True, i)
    n.add_output('out', 'int')
    n.execute = lambda self, i=i: NodeResult(success=True, data={'out': i * 10})
    wf3.add_node(n)

# Create chain: node_0 -> node_1 -> node_2 -> node_3 -> node_4
for i in range(4):
    wf3.add_connection(f'node_{i}', 'out', f'node_{i+1}', 'in')

engine3 = Engine(wf3)
order = wf3.topological_sort()
print(f"Execution order: {order}")

print("\n" + "=" * 60)
print("All tests completed!")
print("=" * 60)