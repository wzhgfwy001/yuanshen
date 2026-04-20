@echo off
set CHROMA_PERSIST_DIRECTORY=D:\vector_db\chroma
cd D:\vector_db
python -m uvicorn chromadb.app:app --host 0.0.0.0 --port 8000