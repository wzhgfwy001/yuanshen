#!/usr/bin/env python3
"""
知识图谱设计

实现跨会话知识复用的知识图谱系统
"""

import json
import hashlib
from pathlib import Path
from typing import Dict, List, Any, Set
from dataclasses import dataclass, asdict
from collections import defaultdict


@dataclass
class KnowledgeNode:
    """知识节点"""
    id: str
    title: str
    type: str  # pattern, lesson, preference, knowledge
    content: str
    tags: List[str]
    created_at: str
    references: List[str]  # 引用的其他节点ID
    related_to: List[str]  # 相关的节点ID
    confidence: float = 1.0


@dataclass
class KnowledgeRelation:
    """知识关系"""
    source_id: str
    target_id: str
    relation_type: str  # depends_on, enhances, contradicts, similar_to
    strength: float  # 0.0 - 1.0


class KnowledgeGraph:
    """知识图谱"""

    def __init__(self, workspace_path: str):
        self.workspace = Path(workspace_path)
        self.graph_path = self.workspace / "brain" / "knowledge_graph"
        self.graph_path.mkdir(parents=True, exist_ok=True)

        self.nodes: Dict[str, KnowledgeNode] = {}
        self.relations: List[KnowledgeRelation] = []

        # 加载现有图谱
        self._load_graph()

    def _load_graph(self):
        """加载现有图谱"""
        nodes_file = self.graph_path / "nodes.json"
        relations_file = self.graph_path / "relations.json"

        if nodes_file.exists():
            with open(nodes_file, "r", encoding="utf-8") as f:
                nodes_data = json.load(f)
                for node_data in nodes_data:
                    self.nodes[node_data["id"]] = KnowledgeNode(**node_data)

        if relations_file.exists():
            with open(relations_file, "r", encoding="utf-8") as f:
                relations_data = json.load(f)
                for relation_data in relations_data:
                    self.relations.append(KnowledgeRelation(**relation_data))

    def _save_graph(self):
        """保存图谱"""
        nodes_file = self.graph_path / "nodes.json"
        relations_file = self.graph_path / "relations.json"

        with open(nodes_file, "w", encoding="utf-8") as f:
            json.dump([asdict(node) for node in self.nodes.values()], f, indent=2, ensure_ascii=False)

        with open(relations_file, "w", encoding="utf-8") as f:
            json.dump([asdict(rel) for rel in self.relations], f, indent=2, ensure_ascii=False)

    def _generate_id(self, title: str) -> str:
        """生成节点ID"""
        return hashlib.md5(title.encode()).hexdigest()[:16]

    def add_node(self, node: KnowledgeNode) -> str:
        """添加知识节点"""
        node.id = self._generate_id(node.title)
        self.nodes[node.id] = node
        self._save_graph()
        return node.id

    def add_relation(self, relation: KnowledgeRelation):
        """添加知识关系"""
        self.relations.append(relation)
        self._save_graph()

    def find_related_nodes(self, node_id: str, relation_type: str = None) -> List[KnowledgeNode]:
        """查找相关节点"""
        related = []

        for rel in self.relations:
            if rel.source_id == node_id:
                if relation_type is None or rel.relation_type == relation_type:
                    if rel.target_id in self.nodes:
                        related.append(self.nodes[rel.target_id])

        return related

    def search_nodes(self, keyword: str, node_type: str = None) -> List[KnowledgeNode]:
        """搜索节点"""
        results = []
        keyword_lower = keyword.lower()

        for node in self.nodes.values():
            if node_type and node.type != node_type:
                continue

            if keyword_lower in node.title.lower() or keyword_lower in node.content.lower():
                results.append(node)

        return results

    def build_from_brain(self):
        """从brain目录构建知识图谱"""
        brain_path = self.workspace / "brain"

        # 处理patterns
        patterns_path = brain_path / "patterns"
        if patterns_path.exists():
            for pattern_file in patterns_path.glob("*.md"):
                if pattern_file.name == "README.md":
                    continue

                with open(pattern_file, "r", encoding="utf-8") as f:
                    content = f.read()

                    # 提取标题（第一行#后面）
                    lines = content.split("\n")
                    title = "未命名模式"
                    for line in lines:
                        if line.startswith("# "):
                            title = line[2:].strip()
                            break

                    # 提取tags
                    tags = []
                    for line in lines:
                        if line.startswith("tags:"):
                            # 解析tags格式 [tag1, tag2]
                            import re
                            tags_match = re.search(r'\[(.*?)\]', line)
                            if tags_match:
                                tags = [t.strip() for t in tags_match.group(1).split(",")]
                            break

                    node = KnowledgeNode(
                        id="",
                        title=title,
                        type="pattern",
                        content=content,
                        tags=tags,
                        created_at="",
                        references=[],
                        related_to=[]
                    )
                    self.add_node(node)

        # 处理lessons
        lessons_path = brain_path / "lessons"
        if lessons_path.exists():
            for lesson_file in lessons_path.glob("*.md"):
                if lesson_file.name == "README.md":
                    continue

                with open(lesson_file, "r", encoding="utf-8") as f:
                    content = f.read()

                    lines = content.split("\n")
                    title = "未命名教训"
                    for line in lines:
                        if line.startswith("# "):
                            title = line[2:].strip()
                            break

                    # 提取tags
                    tags = []
                    for line in lines:
                        if line.startswith("tags:"):
                            import re
                            tags_match = re.search(r'\[(.*?)\]', line)
                            if tags_match:
                                tags = [t.strip() for t in tags_match.group(1).split(",")]
                            break

                    node = KnowledgeNode(
                        id="",
                        title=title,
                        type="lesson",
                        content=content,
                        tags=tags,
                        created_at="",
                        references=[],
                        related_to=[]
                    )
                    self.add_node(node)

        # 自动建立关系
        self._auto_build_relations()

    def _auto_build_relations(self):
        """自动构建节点关系"""
        # 按标签分组
        tag_groups = defaultdict(list)
        for node_id, node in self.nodes.items():
            for tag in node.tags:
                tag_groups[tag].append(node_id)

        # 同标签节点建立相似关系
        for tag, node_ids in tag_groups.items():
            if len(node_ids) > 1:
                for i in range(len(node_ids)):
                    for j in range(i+1, len(node_ids)):
                        relation = KnowledgeRelation(
                            source_id=node_ids[i],
                            target_id=node_ids[j],
                            relation_type="similar_to",
                            strength=0.8
                        )
                        self.add_relation(relation)

        # pattern和lesson之间建立关系
        pattern_nodes = [n for n in self.nodes.values() if n.type == "pattern"]
        lesson_nodes = [n for n in self.nodes.values() if n.type == "lesson"]

        for pattern in pattern_nodes:
            for lesson in lesson_nodes:
                # 如果有相同标签，建立关系
                common_tags = set(pattern.tags) & set(lesson.tags)
                if common_tags:
                    relation = KnowledgeRelation(
                        source_id=pattern.id,
                        target_id=lesson.id,
                        relation_type="related_to",
                        strength=0.6
                    )
                    self.add_relation(relation)

    def get_statistics(self) -> Dict[str, Any]:
        """获取图谱统计信息"""
        return {
            "total_nodes": len(self.nodes),
            "total_relations": len(self.relations),
            "nodes_by_type": self._count_nodes_by_type(),
            "relation_types": self._count_relations_by_type()
        }

    def _count_nodes_by_type(self) -> Dict[str, int]:
        """按类型统计节点"""
        counts = defaultdict(int)
        for node in self.nodes.values():
            counts[node.type] += 1
        return dict(counts)

    def _count_relations_by_type(self) -> Dict[str, int]:
        """按类型统计关系"""
        counts = defaultdict(int)
        for rel in self.relations:
            counts[rel.relation_type] += 1
        return dict(counts)

    def export_graphviz(self) -> str:
        """导出为Graphviz格式"""
        graphviz_lines = [
            "digraph KnowledgeGraph {",
            "  rankdir=LR;",
            "  node [shape=box];"
        ]

        # 添加节点
        for node_id, node in self.nodes.items():
            color = self._get_node_color(node.type)
            label = node.title[:20] + "..." if len(node.title) > 20 else node.title
            graphviz_lines.append(f'  "{node_id}" [label="{label}", fillcolor="{color}", style="filled"];')

        # 添加关系
        for rel in self.relations:
            graphviz_lines.append(f'  "{rel.source_id}" -> "{rel.target_id}" [label="{rel.relation_type}"];')

        graphviz_lines.append("}")
        return "\n".join(graphviz_lines)

    def _get_node_color(self, node_type: str) -> str:
        """获取节点颜色"""
        colors = {
            "pattern": "lightblue",
            "lesson": "lightcoral",
            "preference": "lightgreen",
            "knowledge": "lightyellow"
        }
        return colors.get(node_type, "white")


# 使用示例
if __name__ == "__main__":
    print("="*60)
    print("🕸️  知识图谱系统")
    print("="*60)

    graph = KnowledgeGraph("/workspace/projects/workspace")

    # 从brain目录构建图谱
    print("\n🏗️  构建知识图谱...")
    graph.build_from_brain()

    # 统计信息
    print("\n📊 图谱统计:")
    stats = graph.get_statistics()
    print(f"  总节点数: {stats['total_nodes']}")
    print(f"  总关系数: {stats['total_relations']}")
    print(f"  节点类型分布:")
    for node_type, count in stats['nodes_by_type'].items():
        print(f"    - {node_type}: {count}")
    print(f"  关系类型分布:")
    for rel_type, count in stats['relation_types'].items():
        print(f"    - {rel_type}: {count}")

    # 搜索示例
    print("\n🔍 搜索示例:")
    results = graph.search_nodes("API")
    print(f"  搜索'API'结果: {len(results)}个节点")
    for node in results[:3]:
        print(f"    - {node.title} ({node.type})")

    # 查找相关节点
    if results:
        first_node_id = results[0].id
        related = graph.find_related_nodes(first_node_id)
        print(f"\n  '{results[0].title}'的相关节点: {len(related)}个")
        for node in related[:3]:
            print(f"    - {node.title} ({node.type})")

    # 导出Graphviz
    print("\n📝 导出Graphviz格式...")
    graphviz_output = graph.export_graphviz()
    graphviz_file = graph.graph_path / "graph.dot"
    with open(graphviz_file, "w", encoding="utf-8") as f:
        f.write(graphviz_output)
    print(f"  ✓ Graphviz文件: {graphviz_file}")

    print("\n" + "="*60)
    print("✅ 知识图谱构建完成")
    print("="*60)

    print("\n💡 使用建议:")
    print("  1. 可视化: 使用 'dot -Tpng graph.dot -o graph.png' 生成图片")
    print("  2. 查询: 使用 graph.search_nodes() 查找知识")
    print("  3. 导航: 使用 graph.find_related_nodes() 探索关系")
    print("="*60)
