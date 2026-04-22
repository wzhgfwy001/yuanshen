"""
StoryFlow - 智能小说创作工作流引擎
"""

__version__ = "1.2.0"
__author__ = "StoryFlow Team"

from .engine.engine import (
    Node, Workflow, Engine, LoopEngine, LoopConfig,
    ProviderFactory, Checkpoint
)
from .nodes.nodes import NODE_REGISTRY

__all__ = [
    "Node", "Workflow", "Engine", "LoopEngine", "LoopConfig",
    "ProviderFactory", "Checkpoint", "NODE_REGISTRY"
]
