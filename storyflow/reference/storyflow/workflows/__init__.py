"""
INKOS 5-Agent 工作流包
完整小说创作管线
"""

from .inkos_5agent import (
    RadarNode,
    ArchitectNode,
    WriterNode,
    AuditNode,
    ReviserNode,
    LoopEngine,
    LoopConfig,
    INKOS5AgentWorkflow
)

__all__ = [
    "RadarNode",
    "ArchitectNode",
    "WriterNode",
    "AuditNode",
    "ReviserNode",
    "LoopEngine",
    "LoopConfig",
    "INKOS5AgentWorkflow"
]

__version__ = "1.0.0"
