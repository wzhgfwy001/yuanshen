# -*- coding: utf-8 -*-
import io
import sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
微信小程序云开发数据上传工具
使用云开发 REST API 批量上传 JSON 数据到云数据库

云环境ID: wfc-9g0bpjwsb8d3d01c
集合: zhuanke, benke
数据文件: cloudbase_data/zhuanke_fixed.json, benke_fixed.json
"""

import json
import os
import sys
import time
import requests
from pathlib import Path
from typing import List, Dict, Any, Optional

# ============================================================
# 配置区 - 请根据实际情况修改
# ============================================================
CONFIG = {
    # 云开发环境ID
    "env_id": "wfc-9g0bpjwsb8d3d01c",

    # 微信小程序 AppID（用于获取 access_token）
    # 替换为你实际的 AppID
    "app_id": "wx21c2c6114d560057",

    # 微信小程序 AppSecret（用于获取 access_token）
    # 替换为你实际的 AppSecret，注意保密！
    "app_secret": "fb7853131c40442c543d92e0db405ae3",

    # 数据文件路径（相对于当前脚本所在目录）
    "data_dir": "cloudbase_data",

    # 每批上传的记录数（建议500-1000，云数据库限制单次最多1000条）
    "batch_size": 500,

    # 集合配置
    "collections": {
        "zhuanke": "zhuanke_fixed.json",
        "benke": "benke_fixed.json",
    },

    # 请求超时时间（秒）
    "timeout": 30,

    # 重试次数
    "max_retries": 3,

    # 重试等待时间（秒）
    "retry_wait": 5,
}


# ============================================================
# 核心函数
# ============================================================

class CloudBaseUploader:
    """云数据库上传器"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.env_id = config["env_id"]
        self.app_id = config["app_id"]
        self.app_secret = config["app_secret"]
        self.batch_size = config["batch_size"]
        self.timeout = config["timeout"]
        self.max_retries = config["max_retries"]
        self.retry_wait = config["retry_wait"]

        # API 基础地址
        self.api_base = f"https://api.weixin.qq.com/tcb"

        self.access_token: Optional[str] = None

    # --------------------------------------------------------
    # 1. 获取 Access Token
    # --------------------------------------------------------
    def get_access_token(self) -> str:
        """获取微信 access_token"""
        url = "https://api.weixin.qq.com/cgi-bin/token"
        params = {
            "grant_type": "client_credential",
            "appid": self.app_id,
            "secret": self.app_secret,
        }

        print("[1/4] 正在获取 Access Token...")
        try:
            resp = requests.get(url, params=params, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()

            if "access_token" not in data:
                error_msg = data.get("errmsg", str(data))
                raise RuntimeError(f"获取 Access Token 失败: {error_msg}")

            self.access_token = data["access_token"]
            print(f"      ✓ Access Token 获取成功")
            return self.access_token

        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"网络请求失败: {e}")

    # --------------------------------------------------------
    # 2. 批量插入数据（原生 batch insert，绕过分批逻辑）
    # --------------------------------------------------------
    def _batch_insert_raw(self, collection: str, records: List[Dict]) -> Dict[str, Any]:
        """
        调用云数据库 batchInsert API 一次性插入多条记录。
        records: 当前批次的数据列表
        返回: API 响应字典
        """
        url = f"{self.api_base}/batchinsert"
        params = {"access_token": self.access_token}
        payload = {
            "env": self.env_id,
            "collection_name": collection,
            "data": records,
        }

        resp = requests.post(url, params=params, json=payload, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    # --------------------------------------------------------
    # 3. 单条记录插入（备用fallback）
    # --------------------------------------------------------
    def _insert_one(self, collection: str, record: Dict) -> Dict[str, Any]:
        """调用 databasecollectionadd 插入单条记录"""
        url = f"{self.api_base}/databasecollectionadd"
        params = {"access_token": self.access_token}
        payload = {
            "env": self.env_id,
            "collection_name": collection,
            "data": [record],
        }
        resp = requests.post(url, params=params, json=payload, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    # --------------------------------------------------------
    # 4. 通用请求方法（带重试）
    # --------------------------------------------------------
    def _request_with_retry(self, method: str, url: str, **kwargs) -> requests.Response:
        """带重试的请求"""
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                resp = requests.request(method, url, timeout=self.timeout, **kwargs)
                resp.raise_for_status()
                return resp
            except requests.exceptions.RequestException as e:
                last_error = e
                if attempt < self.max_retries:
                    print(f"      ⚠ 请求失败(第{attempt}次)，{self.retry_wait}秒后重试... ({e})")
                    time.sleep(self.retry_wait)
        raise RuntimeError(f"请求最终失败: {last_error}")

    # --------------------------------------------------------
    # 5. 批量上传单个集合
    # --------------------------------------------------------
    def upload_collection(self, collection_name: str, file_path: str) -> Dict[str, Any]:
        """
        上传整个 JSON 文件到指定集合。
        返回统计信息。
        """
        # ---- 加载数据 ----
        print(f"\n[2/4] 正在加载数据文件: {file_path}")
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"数据文件不存在: {file_path}")

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, list):
            raise ValueError(f"JSON 文件必须是数组格式，当前类型: {type(data)}")

        total = len(data)
        print(f"      ✓ 共加载 {total:,} 条记录")

        # ---- 清空集合（可选） ----
        # 注意：生产环境建议注释掉这行，防止误删数据
        # self._clear_collection(collection_name)

        # ---- 分批上传 ----
        print(f"[3/4] 开始分批上传（每批 {self.batch_size} 条）...")
        success_count = 0
        error_count = 0
        error_details: List[Dict] = []
        batch_num = 0

        # 进度条参数
        bar_width = 40

        for i in range(0, total, self.batch_size):
            batch_num += 1
            batch = data[i : i + self.batch_size]
            batch_start = i
            batch_end = min(i + self.batch_size, total)

            # 进度条
            progress = batch_end / total
            filled = int(bar_width * progress)
            bar = "█" * filled + "░" * (bar_width - filled)
            percent = progress * 100

            # 清理 _id 等云数据库字段（如果数据里有的话）
            cleaned_batch = []
            for record in batch:
                r = {k: v for k, v in record.items() if k != "_id"}
                cleaned_batch.append(r)

            # 打印进度行（覆盖同一行）
            print(
                f"\r      [{bar}] {percent:5.1f}%  "
                f"批次 {batch_num} | {batch_start:,} - {batch_end:,} / {total:,}  "
                f"成功: {success_count:,}  失败: {error_count:,}",
                end="",
                flush=True,
            )

            # ---- 上传逻辑 ----
            uploaded = False
            for attempt in range(1, self.max_retries + 1):
                try:
                    result = self._batch_insert_raw(collection_name, cleaned_batch)
                    print(f"\n      DEBUG batch result: {result}")

                    # 检查 API 返回码
                    errcode = result.get("errcode", 0)
                    if errcode != 0:
                        errmsg = result.get("errmsg", "未知错误")
                        # -502005 表示集合不存在，先尝试创建
                        if errcode == -502005:
                            print(f"\n      ⚠ 集合 '{collection_name}' 不存在，尝试创建...")
                            self._create_collection(collection_name)
                            continue  # 重试插入
                        raise RuntimeError(f"API错误 {errcode}: {errmsg}")

                    # 提取成功插入的数量
                    inserted_ids = result.get("id_list", [])
                    success_count += len(inserted_ids)
                    uploaded = True
                    break

                except Exception as e:
                    if attempt < self.max_retries:
                        time.sleep(self.retry_wait)
                    else:
                        error_count += len(batch)
                        error_details.append({
                            "batch": batch_num,
                            "range": f"{batch_start}-{batch_end}",
                            "error": str(e),
                        })

            if not uploaded:
                pass  # 错误已在上面的 except 中记录

            # 批次间适当延时，防止频率限制
            if batch_end < total:
                time.sleep(0.3)

        # 换行结束进度条
        print()

        # ---- 结果汇总 ----
        print(f"[4/4] 上传完成！")
        print(f"      ✓ 成功: {success_count:,} 条")
        if error_count > 0:
            print(f"      ✗ 失败: {error_count:,} 条")
        if error_details:
            err_file = f"upload_error_{collection_name}.json"
            with open(err_file, "w", encoding="utf-8") as f:
                json.dump(error_details, f, ensure_ascii=False, indent=2)
            print(f"      ⚠ 错误详情已保存到: {err_file}")

        return {
            "collection": collection_name,
            "total": total,
            "success": success_count,
            "failed": error_count,
            "errors": error_details,
        }

    # --------------------------------------------------------
    # 6. 创建集合
    # --------------------------------------------------------
    def _create_collection(self, collection_name: str):
        """创建云数据库集合"""
        url = f"{self.api_base}/databasecollectionadd"
        params = {"access_token": self.access_token}
        payload = {
            "env": self.env_id,
            "collection_name": collection_name,
        }
        resp = requests.post(url, params=params, json=payload, timeout=self.timeout)
        data = resp.json()
        errcode = data.get("errcode", 0)
        if errcode != 0 and errcode != -502001:  # -502001 表示已存在
            print(f"      ⚠ 创建集合失败: {data.get('errmsg', str(data))}")

    # --------------------------------------------------------
    # 7. 清空集合（删除所有文档）
    # --------------------------------------------------------
    def _clear_collection(self, collection_name: str):
        """清空集合中的所有文档（危险操作！）"""
        print(f"      ⚠ 正在清空集合 '{collection_name}' ...")
        # 通过删除所有文档来清空
        deleted = 0
        while True:
            url = f"{self.api_base}/databasebulkdelete"
            params = {"access_token": self.access_token}
            payload = {
                "env": self.env_id,
                "collection_name": collection_name,
                "query": "{}",
            }
            resp = requests.post(url, params=params, json=payload, timeout=self.timeout)
            data = resp.json()
            if data.get("deleted", 0) == 0:
                break
            deleted += data["deleted"]
        print(f"      ✓ 已清空集合，删除了 {deleted} 条文档")


# ============================================================
# 主程序入口
# ============================================================

def print_banner():
    banner = r"""
    ╔══════════════════════════════════════════════════════╗
    ║       微信小程序云开发 - 数据上传工具  v1.0           ║
    ║  云环境: wfc-9g0bpjwsb8d3d01c                        ║
    ╚══════════════════════════════════════════════════════╝
    """
    print(banner)


def main():
    print_banner()

    # ---- 前置检查 ----
    if CONFIG["app_id"] == "YOUR_APPID" or CONFIG["app_secret"] == "YOUR_APPSECRET":
        print("=" * 60)
        print("【重要】请先在脚本顶部 CONFIG 区域配置正确的：")
        print("  - app_id     (微信小程序 AppID)")
        print("  - app_secret (微信小程序 AppSecret)")
        print()
        print("获取方式：")
        print("  微信公众平台 -> 开发管理 -> 开发设置 -> AppID/AppSecret")
        print("=" * 60)
        sys.exit(1)

    # ---- 确定数据目录 ----
    script_dir = Path(__file__).parent.resolve()
    data_dir = script_dir / CONFIG["data_dir"]

    if not data_dir.exists():
        print(f"[错误] 数据目录不存在: {data_dir}")
        sys.exit(1)

    # ---- 初始化上传器 ----
    uploader = CloudBaseUploader(CONFIG)

    # ---- 获取 Access Token ----
    try:
        uploader.get_access_token()
    except Exception as e:
        print(f"[错误] {e}")
        sys.exit(1)

    # ---- 上传所有集合 ----
    all_results = []
    for collection_name, file_name in CONFIG["collections"].items():
        file_path = data_dir / file_name
        print(f"\n{'=' * 60}")
        print(f"开始上传集合: {collection_name}")
        print(f"{'=' * 60}")

        try:
            result = uploader.upload_collection(collection_name, str(file_path))
            all_results.append(result)
        except Exception as e:
            print(f"[错误] 上传集合 '{collection_name}' 失败: {e}")
            all_results.append({
                "collection": collection_name,
                "error": str(e),
            })

    # ---- 最终汇总 ----
    print(f"\n{'=' * 60}")
    print("所有上传任务完成 - 最终汇总")
    print(f"{'=' * 60}")
    for r in all_results:
        coll = r.get("collection", "unknown")
        if "error" in r:
            print(f"  {coll}: ✗ 失败 - {r['error']}")
        else:
            total = r.get("total", 0)
            success = r.get("success", 0)
            failed = r.get("failed", 0)
            print(f"  {coll}: 总计 {total:,} | 成功 {success:,} | 失败 {failed:,}")

    print(f"\n脚本执行完毕。")


if __name__ == "__main__":
    main()
