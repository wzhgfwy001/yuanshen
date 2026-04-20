import os
os.environ['CHROMA_PERSIST_DIRECTORY'] = 'D:/vector_db/chroma'

from chromadb.app import app
import uvicorn

uvicorn.run(app, host='0.0.0.0', port=8000)