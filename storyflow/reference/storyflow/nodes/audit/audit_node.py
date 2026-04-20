"""
审计节点 - 33 维度文学审计核心实现
"""

import json
import asyncio
import sys
from typing import Dict, List, Optional, Any
from datetime import datetime

# 添加父级目录到路径
sys.path.insert(0, '/workspace/projects/workspace')
from storyflow.engine import LLMNode, NodeResult
from .dimensions import (
    AuditDimension,
    AuditSeverity,
    get_all_dimensions,
    get_dimension
)
from .ai_trace_detector import AITraceDetector, AITraceIssue


class AuditIssue:
    """审计问题"""

    def __init__(
        self,
        dimension: str,
        severity: str,
        description: str,
        location: str,
        suggestion: str
    ):
        self.dimension = dimension
        self.severity = severity
        self.description = description
        self.location = location
        self.suggestion = suggestion

    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "dimension": self.dimension,
            "severity": self.severity,
            "description": self.description,
            "location": self.location,
            "suggestion": self.suggestion
        }


class AuditReport:
    """审计报告"""

    def __init__(self):
        self.passed: bool = True
        self.score: float = 1.0
        self.issues: List[AuditIssue] = []
        self.dimension_scores: Dict[str, float] = {}
        self.ai_trace_report: Dict = {}
        self.summary: str = ""
        self.audit_time: str = datetime.now().isoformat()
        self.chapter_info: Dict = {}

    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "passed": self.passed,
            "score": self.score,
            "issues": [issue.to_dict() for issue in self.issues],
            "dimension_scores": self.dimension_scores,
            "ai_trace_report": self.ai_trace_report,
            "summary": self.summary,
            "audit_time": self.audit_time,
            "chapter_info": self.chapter_info
        }

    def to_yaml(self) -> str:
        """转换为 YAML 格式"""
        lines = [
            f"passed: {str(self.passed).lower()}",
            f"score: {self.score:.3f}",
            "",
            "issues:"
        ]

        for issue in self.issues:
            lines.append(f"  - dimension: {issue.dimension}")
            lines.append(f"    severity: {issue.severity}")
            lines.append(f"    description: {issue.description}")
            lines.append(f"    location: {issue.location}")
            lines.append(f"    suggestion: {issue.suggestion}")

        lines.append("")
        lines.append(f"summary: {self.summary}")

        return "\n".join(lines)


class AuditNode(LLMNode):
    """
    33 维度审计节点

    功能：
    1. 对照 7 个真相文件检查草稿
    2. 执行 33 维度审计
    3. AI 痕迹检测
    4. 生成审计报告
    """

    def __init__(self, node_id: str, api_key: str, model: str = "qwen-plus"):
        super().__init__(node_id, "33维度审计", api_key, model)

        # 输入端口
        self.add_input("chapter_draft", "str", True)
        self.add_input("chapter_number", "int", True, 1)
        self.add_input("chapter_title", "str", True, "")
        self.add_input("truth_files", "list", True, [])
        self.add_input("previous_chapters", "str", False, "")
        self.add_input("outline", "str", False, "")
        self.add_input("incremental_mode", "bool", False, False)
        self.add_input("new_content", "str", False, "")

        # 输出端口
        self.add_output("audit_report", "dict")
        self.add_output("passed", "bool")
        self.add_output("score", "float")
        self.add_output("issues_count", "int")

        # 审计配置
        self.dimensions = get_all_dimensions()
        self.ai_detector = AITraceDetector()

        # 审计阈值
        self.pass_threshold = 0.7  # 通过阈值
        self.critical_threshold = 0.4  # 严重问题阈值

    async def execute(self) -> NodeResult:
        """执行审计"""
        try:
            # 获取输入
            chapter_draft = self.input_values.get("chapter_draft", "")
            chapter_number = self.input_values.get("chapter_number", 1)
            chapter_title = self.input_values.get("chapter_title", "")
            truth_files = self.input_values.get("truth_files", [])
            previous_chapters = self.input_values.get("previous_chapters", "")
            outline = self.input_values.get("outline", "")
            incremental_mode = self.input_values.get("incremental_mode", False)
            new_content = self.input_values.get("new_content", "")

            # 创建审计报告
            report = AuditReport()
            report.chapter_info = {
                "chapter_number": chapter_number,
                "chapter_title": chapter_title,
                "word_count": len(chapter_draft)
            }

            # 根据模式选择待审计内容
            if incremental_mode and new_content:
                audit_content = new_content
            else:
                audit_content = chapter_draft

            # 1. 执行 33 维度审计
            await self._audit_dimensions(
                report,
                audit_content,
                truth_files,
                previous_chapters,
                outline
            )

            # 2. AI 痕迹检测
            report.ai_trace_report = self.ai_detector.get_report(audit_content)

            # 3. 计算综合得分
            report.score = self._calculate_overall_score(report)

            # 4. 判断是否通过
            report.passed = self._evaluate_pass_status(report)

            # 5. 生成摘要
            report.summary = self._generate_summary(report)

            # 返回结果
            return NodeResult(
                success=True,
                data={
                    "audit_report": report.to_dict(),
                    "passed": report.passed,
                    "score": report.score,
                    "issues_count": len(report.issues)
                }
            )

        except Exception as e:
            return NodeResult(success=False, error=str(e))

    async def _audit_dimensions(
        self,
        report: AuditReport,
        content: str,
        truth_files: List[str],
        previous_chapters: str,
        outline: str
    ):
        """
        执行 33 维度审计

        为了提高效率，我们将维度分组并行审计
        """
        # 构建上下文
        context = self._build_context(truth_files, previous_chapters, outline)

        # 分组审计（每次审计 5 个维度）
        batch_size = 5
        all_issues = []

        for i in range(0, len(self.dimensions), batch_size):
            batch = self.dimensions[i:i + batch_size]
            batch_issues = await self._audit_dimension_batch(
                batch,
                content,
                context
            )
            all_issues.extend(batch_issues)

        # 处理审计结果
        report.issues = all_issues

        # 计算各维度得分
        for dimension in self.dimensions:
            dimension_issues = [
                issue for issue in all_issues
                if issue.dimension == dimension.name
            ]
            report.dimension_scores[dimension.name] = self._calculate_dimension_score(
                dimension_issues,
                dimension
            )

    async def _audit_dimension_batch(
        self,
        dimensions: List[AuditDimension],
        content: str,
        context: str
    ) -> List[AuditIssue]:
        """审计一批维度"""
        issues = []

        for dimension in dimensions:
            try:
                # 构建审计提示
                prompt = self._build_audit_prompt(
                    dimension,
                    content,
                    context
                )

                # 调用 LLM
                system_prompt = """你是一位资深的文学审稿人，精通小说创作理论和文学批评。
你的任务是根据给定的审计维度，仔细审查文本，找出所有问题。
请以结构化的格式返回审计结果。"""

                response = await self.call_llm(prompt, system_prompt)

                # 解析 LLM 响应
                dimension_issues = self._parse_audit_response(
                    response,
                    dimension.name
                )

                issues.extend(dimension_issues)

            except Exception as e:
                # 如果某个维度审计失败，记录一个轻微问题
                issues.append(AuditIssue(
                    dimension=dimension.name,
                    severity="minor",
                    description=f"审计过程出错: {str(e)}",
                    location="未知",
                    suggestion="请检查文本格式或网络连接"
                ))

        return issues

    def _build_context(
        self,
        truth_files: List[str],
        previous_chapters: str,
        outline: str
    ) -> str:
        """构建审计上下文"""
        context_parts = []

        if truth_files:
            context_parts.append("=== 真相文件 ===")
            for idx, truth in enumerate(truth_files, 1):
                context_parts.append(f"真相文件 {idx}:")
                context_parts.append(truth)
                context_parts.append("")

        if previous_chapters:
            context_parts.append("=== 之前章节 ===")
            context_parts.append(previous_chapters)
            context_parts.append("")

        if outline:
            context_parts.append("=== 大纲 ===")
            context_parts.append(outline)
            context_parts.append("")

        return "\n".join(context_parts)

    def _build_audit_prompt(
        self,
        dimension: AuditDimension,
        content: str,
        context: str
    ) -> str:
        """构建审计提示"""
        prompt = f"""请根据以下维度审查文本：

**审计维度**: {dimension.name}
**维度说明**: {dimension.description}

**审计要求**:
{dimension.check_prompt}

**上下文信息**:
{context}

**待审查文本**:
{content}

**返回格式要求**:
请以以下 JSON 格式返回审计结果（不要包含其他文字）:

{{
    "issues": [
        {{
            "severity": "critical|major|minor",
            "description": "问题描述",
            "location": "具体位置或段落",
            "suggestion": "修改建议"
        }}
    ]
}}

如果没有发现问题，返回: {{"issues": []}}

现在开始审计:"""

        return prompt

    def _parse_audit_response(
        self,
        response: str,
        dimension_name: str
    ) -> List[AuditIssue]:
        """解析 LLM 审计响应"""
        issues = []

        try:
            # 尝试提取 JSON
            json_start = response.find("{")
            json_end = response.rfind("}") + 1

            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                result = json.loads(json_str)

                if "issues" in result:
                    for issue_data in result["issues"]:
                        issues.append(AuditIssue(
                            dimension=dimension_name,
                            severity=issue_data.get("severity", "minor"),
                            description=issue_data.get("description", ""),
                            location=issue_data.get("location", "未知"),
                            suggestion=issue_data.get("suggestion", "无")
                        ))

        except json.JSONDecodeError:
            # 如果 JSON 解析失败，尝试文本解析
            pass

        return issues

    def _calculate_dimension_score(
        self,
        issues: List[AuditIssue],
        dimension: AuditDimension
    ) -> float:
        """计算单个维度得分"""
        if not issues:
            return 1.0

        # 根据严重程度扣分
        severity_weights = {
            "critical": 1.0,
            "major": 0.5,
            "minor": 0.1
        }

        deduction = 0.0
        for issue in issues:
            deduction += severity_weights.get(issue.severity, 0.1)

        # 计算得分
        score = max(0.0, 1.0 - deduction)

        return score

    def _calculate_overall_score(self, report: AuditReport) -> float:
        """计算综合得分"""
        # 1. 维度得分加权平均
        dimension_score_sum = 0.0
        total_weight = 0.0

        for dimension in self.dimensions:
            score = report.dimension_scores.get(dimension.name, 1.0)
            dimension_score_sum += score * dimension.weight
            total_weight += dimension.weight

        avg_dimension_score = dimension_score_sum / total_weight if total_weight > 0 else 1.0

        # 2. AI 痕迹扣分
        ai_score = report.ai_trace_report.get("ai_trace_score", 0.0)
        ai_penalty = ai_score * 0.3  # 最多扣 0.3 分

        # 3. 综合得分
        overall_score = avg_dimension_score - ai_penalty
        overall_score = max(0.0, min(1.0, overall_score))

        return overall_score

    def _evaluate_pass_status(self, report: AuditReport) -> bool:
        """评估是否通过审计"""
        # 检查得分
        if report.score < self.pass_threshold:
            return False

        # 检查严重问题
        critical_issues = [
            issue for issue in report.issues
            if issue.severity == "critical"
        ]

        if critical_issues:
            return False

        # 检查 AI 痕迹是否过重
        ai_score = report.ai_trace_report.get("ai_trace_score", 0.0)
        if ai_score > 0.5:
            return False

        return True

    def _generate_summary(self, report: AuditReport) -> str:
        """生成审计摘要"""
        parts = []

        # 总体评价
        if report.passed:
            parts.append(f"✅ 审计通过（得分: {report.score:.2f}）")
        else:
            parts.append(f"❌ 审计未通过（得分: {report.score:.2f}）")

        # 问题统计
        if report.issues:
            critical_count = sum(1 for i in report.issues if i.severity == "critical")
            major_count = sum(1 for i in report.issues if i.severity == "major")
            minor_count = sum(1 for i in report.issues if i.severity == "minor")

            parts.append(f"\n发现 {len(report.issues)} 个问题：")
            if critical_count > 0:
                parts.append(f"  - 严重问题: {critical_count}")
            if major_count > 0:
                parts.append(f"  - 主要问题: {major_count}")
            if minor_count > 0:
                parts.append(f"  - 次要问题: {minor_count}")

        # AI 痕迹
        ai_score = report.ai_trace_report.get("ai_trace_score", 0.0)
        ai_issues = report.ai_trace_report.get("total_issues", 0)
        if ai_issues > 0:
            parts.append(f"\nAI 痕迹评分: {ai_score:.2f}（{ai_issues} 个问题）")

        # 主要建议
        if report.issues:
            top_issues = report.issues[:3]
            parts.append("\n主要建议：")
            for idx, issue in enumerate(top_issues, 1):
                parts.append(f"{idx}. [{issue.dimension}] {issue.suggestion}")

        return "\n".join(parts)
