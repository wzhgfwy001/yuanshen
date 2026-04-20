"""
StoryFlow - 轻量级节点工作流引擎
"""

__version__ = "0.1.0"
__author__ = "StoryFlow Team"

from .engine import Node, Workflow, Engine, NodeResult, NodeInput, NodeOutput, LLMNode

__all__ = [
    "Node",
    "Workflow",
    "Engine",
    "NodeResult",
    "NodeInput",
    "NodeOutput",
    "LLMNode",
]
