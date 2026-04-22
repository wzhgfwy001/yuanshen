#!/usr/bin/env python3
"""
DeerFlow桥接器

连接阳神系统和DeerFlow 2.0
"""

import requests
from typing import Dict, Any, Optional
from datetime import datetime


class DeerFlowBridge:
    """DeerFlow桥接器"""

    def __init__(self, api_base_url: str = "http://localhost:8080", timeout: int = 300):
        self.api_base_url = api_base_url
        self.timeout = timeout

    def submit_research_task(
        self,
        query: str,
        depth: int = 3,
        output_formats: list = None
    ) -> Dict[str, Any]:
        """
        提交深度研究任务到DeerFlow

        Args:
            query: 研究查询
            depth: 研究深度（1-5）
            output_formats: 输出格式 ['report', 'podcast', 'presentation']

        Returns:
            任务ID和状态
        """
        if output_formats is None:
            output_formats = ["report"]

        payload = {
            "query": query,
            "depth": depth,
            "output_formats": output_formats,
            "timestamp": datetime.now().isoformat()
        }

        try:
            response = requests.post(
                f"{self.api_base_url}/api/research",
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {
                "error": str(e),
                "status": "failed"
            }

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        获取任务状态

        Args:
            task_id: 任务ID

        Returns:
            任务状态和进度
        """
        try:
            response = requests.get(
                f"{self.api_base_url}/api/tasks/{task_id}",
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {
                "error": str(e),
                "status": "unknown"
            }

    def get_task_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        获取任务结果

        Args:
            task_id: 任务ID

        Returns:
            研究结果或None（如果未完成）
        """
        status = self.get_task_status(task_id)

        if status.get("status") != "completed":
            return None

        try:
            response = requests.get(
                f"{self.api_base_url}/api/tasks/{task_id}/result",
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {
                "error": str(e),
                "status": "failed"
            }

    def wait_for_completion(self, task_id: str, check_interval: int = 10) -> Dict[str, Any]:
        """
        等待任务完成

        Args:
            task_id: 任务ID
            check_interval: 检查间隔（秒）

        Returns:
            最终结果
        """
        import time

        max_attempts = self.timeout // check_interval

        for attempt in range(max_attempts):
            status = self.get_task_status(task_id)

            if status.get("status") == "completed":
                return self.get_task_result(task_id)
            elif status.get("status") == "failed":
                return {"error": "Task failed", "status": "failed"}

            time.sleep(check_interval)

        return {
            "error": "Timeout waiting for task completion",
            "status": "timeout"
        }


# 使用示例
if __name__ == "__main__":
    bridge = DeerFlowBridge()

    # 提交研究任务
    result = bridge.submit_research_task(
        query="2026年AI Agent最新发展趋势",
        depth=3,
        output_formats=["report"]
    )

    print(f"任务提交结果: {result}")

    if "task_id" in result:
        # 等待完成
        final_result = bridge.wait_for_completion(result["task_id"])
        print(f"最终结果: {final_result}")
