#!/usr/bin/env python3
"""
sync_to_vector.py - 使用PersistentClient同步文件到向量数据库
使用与vectorize_workspace.py相同的embedding模型（bge-small-zh-v1.5, 512维）

用法:
    python sync_to_vector.py add <file_path> [collection_name]
    python sync_to_vector.py delete <file_path> [collection_name]
    python sync_to_vector.py list
"""

import sys
import os
import json
import urllib.request
import chromadb

CHROMA_PATH = "D:/vector_db/chroma"
LM_API = "http://127.0.0.1:1234/v1/embeddings"
EMBEDDING_MODEL = "text-embedding-bge-small-zh-v1.5"  # 512维，与旧数据一致

def get_embedding(text):
    """使用LM Studio API生成embedding"""
    payload = json.dumps({"model": EMBEDDING_MODEL, "input": text}).encode("utf-8")
    req = urllib.request.Request(
        LM_API, 
        data=payload, 
        headers={"Content-Type": "application/json"}, 
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result["data"][0]["embedding"]
    except Exception as e:
        print(f"[ERROR] LM Studio API: {e}")
        return None

def get_client():
    """获取PersistentClient"""
    return chromadb.PersistentClient(path=CHROMA_PATH)

def get_collection(client, name):
    """获取或创建集合"""
    full_name = f"yangshen_{name}"
    return client.get_or_create_collection(full_name)

def sync_file_add(file_path, collection_name="workspace"):
    """添加文件到向量数据库"""
    if not os.path.exists(file_path):
        print(f"[ERROR] 文件不存在: {file_path}")
        return False
    
    # 读取文件内容
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 获取相对路径作为ID
    workspace = "C:/Users/DELL/.openclaw/workspace"
    if file_path.startswith(workspace):
        rel_path = file_path[len(workspace)+1:]
    else:
        rel_path = os.path.basename(file_path)
    
    # 生成唯一ID（基于文件路径）
    import hashlib
    file_id = hashlib.md5(file_path.encode()).hexdigest()
    
    # 获取embedding（512维）
    embedding = get_embedding(content)
    if embedding is None:
        print(f"[ERROR] 无法生成embedding: {rel_path}")
        return False
    
    # 连接数据库并添加
    client = get_client()
    collection = get_collection(client, collection_name)
    
    # 删除已存在的（如果需要）
    try:
        collection.delete(where={"source": {"$eq": rel_path}})
    except:
        pass
    
    # 添加新的
    collection.add(
        embeddings=[embedding],  # 显式提供embedding
        documents=[content],
        ids=[file_id],
        metadatas=[{"source": rel_path, "path": file_path}]
    )
    
    print(f"[OK] 已同步: {rel_path} -> yangshen_{collection_name}")
    return True

def sync_file_delete(file_path, collection_name="workspace"):
    """从向量数据库删除文件"""
    workspace = "C:/Users/DELL/.openclaw/workspace"
    if file_path.startswith(workspace):
        rel_path = file_path[len(workspace)+1:]
    else:
        rel_path = os.path.basename(file_path)
    
    import hashlib
    file_id = hashlib.md5(file_path.encode()).hexdigest()
    
    client = get_client()
    collection = get_collection(client, collection_name)
    
    try:
        collection.delete(where={"source": {"$eq": rel_path}})
        print(f"[OK] 已删除: {rel_path} from yangshen_{collection_name}")
        return True
    except Exception as e:
        print(f"[ERROR] 删除失败: {e}")
        return False

def list_collections():
    """列出所有集合和文档数"""
    client = get_client()
    print("=== 向量数据库集合 ===")
    for coll in client.list_collections():
        count = coll.count()
        print(f"  {coll.name}: {count} docs")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    cmd = sys.argv[1].lower()
    
    if cmd == "list":
        list_collections()
    elif cmd == "add":
        if len(sys.argv) < 3:
            print("[ERROR] 需要文件路径")
            sys.exit(1)
        file_path = sys.argv[2]
        collection = sys.argv[3] if len(sys.argv) > 3 else "workspace"
        success = sync_file_add(file_path, collection)
        sys.exit(0 if success else 1)
    elif cmd == "delete":
        if len(sys.argv) < 3:
            print("[ERROR] 需要文件路径")
            sys.exit(1)
        file_path = sys.argv[2]
        collection = sys.argv[3] if len(sys.argv) > 3 else "workspace"
        success = sync_file_delete(file_path, collection)
        sys.exit(0 if success else 1)
    else:
        print(f"[ERROR] 未知命令: {cmd}")
        print(__doc__)
        sys.exit(1)
