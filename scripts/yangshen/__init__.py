#!/usr/bin/env python3
"""
元神系统 - 经验学习集成模块

整合学习引擎、知识图谱、DeerFlow桥接器到统一接口
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# 添加scripts路径
SCRIPTS_PATH = Path(__file__).parent
WORKSPACE_PATH = SCRIPTS_PATH.parent

# 导入各个模块
sys.path.insert(0, str(SCRIPTS_PATH))

try:
    from learn_from_experience import ExperienceLearningEngine, create_execution, TaskStatus
except ImportError:
    ExperienceLearningEngine = None
    print("[WARN] learn_from_experience.py not found")

try:
    from knowledge_graph import KnowledgeGraph
except ImportError:
    KnowledgeGraph = None
    print("[WARN] knowledge_graph.py not found")


class YangshenLearning:
    """阳神学习系统统一接口"""

    def __init__(self, workspace_path: str = None):
        if workspace_path is None:
            # 明确使用固定路径
            workspace_path = r'C:\Users\DELL\.openclaw\workspace'
        
        self.workspace = Path(workspace_path)
        self.brain_path = self.workspace / "brain"
        
        print(f"[DEBUG] Workspace: {self.workspace}")
        
        # 初始化学习引擎
        if ExperienceLearningEngine:
            self.engine = ExperienceLearningEngine(workspace_path)
            print(f"[OK] ExperienceLearningEngine initialized")
            print(f"[DEBUG] Patterns path: {self.engine.patterns_path}")
        else:
            self.engine = None
        
        # 初始化知识图谱
        if KnowledgeGraph:
            kg_path = self.brain_path / "knowledge_graph"
            self.knowledge_graph = KnowledgeGraph(str(kg_path))
            print(f"[OK] KnowledgeGraph initialized")
        else:
            self.knowledge_graph = None

    def learn_from_task(self, task_id: str, description: str, agent: str, 
                       status: str, steps: list, error: str = None):
        """记录任务并自动学习"""
        if not self.engine:
            print("[WARN] Learning engine not available")
            return
        
        execution = create_execution(
            task_id=task_id,
            description=description,
            agent=agent,
            status=status,
            steps=steps,
            error=error
        )
        self.engine.record_task_execution(execution)

    def get_patterns(self, agent: str = None, pattern_type: str = None) -> list:
        """获取成功模式"""
        if not self.engine:
            return []
        
        import os
        patterns = []
        patterns_path = self.engine.patterns_path
        
        for f in os.listdir(patterns_path):
            if f.endswith('.md') and f != 'README.md':
                file_path = os.path.join(patterns_path, f)
                with open(file_path, 'r', encoding='utf-8') as fp:
                    content = fp.read()
                    if agent and agent not in content:
                        continue
                    if pattern_type and pattern_type not in content:
                        continue
                    patterns.append({
                        'file': f,
                        'content': content[:500]  # 只返回前500字符
                    })
        
        return patterns

    def get_lessons(self, agent: str = None, severity: str = None) -> list:
        """获取失败教训"""
        if not self.engine:
            return []
        
        import os
        lessons = []
        lessons_path = self.engine.lessons_path
        
        for f in os.listdir(lessons_path):
            if f.endswith('.md') and f != 'README.md':
                file_path = os.path.join(lessons_path, f)
                with open(file_path, 'r', encoding='utf-8') as fp:
                    content = fp.read()
                    if agent and agent not in content:
                        continue
                    if severity and severity not in content:
                        continue
                    lessons.append({
                        'file': f,
                        'content': content[:500]
                    })
        
        return lessons

    def get_statistics(self) -> dict:
        """获取学习统计"""
        if not self.engine:
            return {'patterns': 0, 'lessons': 0}
        
        import os
        patterns_path = self.engine.patterns_path
        lessons_path = self.engine.lessons_path
        
        patterns = [f for f in os.listdir(patterns_path) 
                   if f.endswith('.md') and f != 'README.md']
        lessons = [f for f in os.listdir(lessons_path) 
                  if f.endswith('.md') and f != 'README.md']
        
        return {
            'patterns': len(patterns),
            'lessons': len(lessons),
            'knowledge_graph_nodes': len(self.knowledge_graph.nodes) if self.knowledge_graph else 0
        }

    def search_knowledge_graph(self, query: str) -> list:
        """搜索知识图谱"""
        if not self.knowledge_graph:
            return []
        
        return self.knowledge_graph.search(query)


def create_learning_system(workspace_path: str = None) -> YangshenLearning:
    """创建学习系统实例"""
    return YangshenLearning(workspace_path)


if __name__ == "__main__":
    print("=" * 60)
    print("Yangshen Learning System - 阳神学习系统")
    print("=" * 60)
    
    system = create_learning_system()
    
    # 显示统计
    stats = system.get_statistics()
    print(f"\n[STATS] Patterns: {stats['patterns']}")
    print(f"[STATS] Lessons: {stats['lessons']}")
    print(f"[STATS] Knowledge Graph Nodes: {stats['knowledge_graph_nodes']}")
    
    # 显示示例模式
    print("\n[PATTERNS]")
    patterns = system.get_patterns()
    for p in patterns[:3]:
        print(f"  - {p['file']}")
    
    # 显示示例教训
    print("\n[LESSONS]")
    lessons = system.get_lessons()
    for l in lessons[:3]:
        print(f"  - {l['file']}")
    
    print("\n[OK] System ready!")
