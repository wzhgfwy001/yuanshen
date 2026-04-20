import os
os.environ['CHROMA_PERSIST_DIRECTORY'] = 'D:/vector_db/chroma'

import chromadb
c = chromadb.HttpClient(host='localhost', port=8000)
collections = c.list_collections()
print('Collections via HttpClient:', len(collections))
for col in collections:
    count = c.get_collection(col.name).count()
    print(f'  {col.name}: {count} docs')