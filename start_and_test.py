import os
import sys
import subprocess

# Set persist directory BEFORE importing chromadb
os.environ['CHROMA_PERSIST_DIRECTORY'] = 'D:/vector_db/chroma'

# Start server in background
print("Starting ChromaDB server with persist directory...")
server_process = subprocess.Popen(
    [sys.executable, '-m', 'uvicorn', 'chromadb.app:app', '--host', '0.0.0.0', '--port', '8000'],
    cwd='D:/vector_db',
    env={**os.environ, 'CHROMA_PERSIST_DIRECTORY': 'D:/vector_db/chroma'}
)

print(f"Server PID: {server_process.pid}")

import time
time.sleep(6)

# Now test HttpClient
import chromadb
print("\nTesting HttpClient...")
try:
    c = chromadb.HttpClient(host='localhost', port=8000)
    collections = c.list_collections()
    print(f'Collections via HttpClient: {len(collections)}')
    for col in collections:
        count = c.get_collection(col.name).count()
        print(f'  {col.name}: {count} docs')
except Exception as e:
    print(f'Error: {e}')

print("\nDone.")