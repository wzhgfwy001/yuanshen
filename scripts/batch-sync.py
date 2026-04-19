#!/usr/bin/env python3
"""
batch-sync.py - 批量同步文件到向量数据库
使用PersistentClient直接写入，比HTTP方式更稳定
"""

import os
import sys
import chromadb
from chromadb.utils import embedding_functions
import hashlib

CHROMA_PATH = "D:/vector_db/chroma"
COLLECTIONS = {
    "brain": "yangshen_brain",
    "memory": "yangshen_memory", 
    "learnings": "yangshen_learnings",
    "workspace": "yangshen_workspace"
}

def get_file_id(collection, file_path):
    """生成稳定的文件ID"""
    key = f"{collection}:{file_path}"
    return hashlib.md5(key.encode()).hexdigest()[:16]

def sync_directory(dir_path, collection_name):
    """同步目录下所有md文件"""
    if not os.path.exists(dir_path):
        print(f"[WARN] 目录不存在: {dir_path}")
        return 0
    
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    ef = embedding_functions.OpenAIEmbeddingFunction(
        api_key="dummy",  # 不使用embedding
        openai_api_base="http://localhost:8000/v1"
    )
    
    try:
        collection = client.get_collection(collection_name, embedding_function=ef)
    except:
        collection = client.create_collection(collection_name, embedding_function=ef)
    
    count = 0
    for root, dirs, files in os.walk(dir_path):
        for f in files:
            if f.endswith('.md') or f.endswith('.json'):
                file_path = os.path.join(root, f)
                try:
                    with open(file_path, 'r', encoding='utf-8') as fp:
                        content = fp.read()
                    
                    doc_id = get_file_id(collection_name, file_path)
                    collection.upsert(
                        documents=[content[:5000]],  # 限制长度
                        ids=[doc_id],
                        metadatas=[{"source": file_path, "name": f}]
                    )
                    count += 1
                    print(f"[OK] {file_path}")
                except Exception as e:
                    print(f"[FAIL] {file_path}: {e}")
    
    return count

if __name__ == "__main__":
    print("开始批量同步...")
    
    base_path = "C:/Users/DELL/.openclaw/workspace"
    
    total = 0
    for subdir, collection in COLLECTIONS.items():
        dir_path = os.path.join(base_path, subdir)
        if os.path.exists(dir_path):
            print(f"\n同步 {subdir} -> {collection}...")
            count = sync_directory(dir_path, collection)
            print(f"  完成: {count} 文件")
            total += count
    
    print(f"\n总计同步: {total} 文件")
