"""
StoryFlow Web Server - FastAPI Version
Port: 5001
"""

import os
import sys
import json
import asyncio
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine import ProviderFactory, Workflow, Engine
from nodes import NODE_REGISTRY

# ========================
# Pydantic Models
# ========================

class NodeInput(BaseModel):
    id: str
    type: str
    inputs: Dict[str, Any] = Field(default_factory=dict)

class WorkflowConnection(BaseModel):
    from_node: str
    from_port: str = "output"
    to_node: str
    to_port: str = "input"

class WorkflowConfig(BaseModel):
    name: str = "StoryFlow Web Workflow"
    description: str = ""
    provider: str = "minimax"
    model: str = "MiniMax-M2.7"
    nodes: List[NodeInput] = Field(default_factory=list)
    connections: List[WorkflowConnection] = Field(default_factory=list)
    use_cache: bool = True
    use_checkpoint: bool = True

class ExecuteRequest(BaseModel):
    config: WorkflowConfig

class SaveRequest(BaseModel):
    config: Dict[str, Any]

# ========================
# Global State
# ========================

# Get API Key
MINIMAX_API_KEY = os.environ.get('MINIMAX_API_KEY', '')
STORYFLOW_API_KEY = os.environ.get('STORYFLOW_API_KEY', '') or MINIMAX_API_KEY

def get_api_key():
    """获取API Key"""
    if STORYFLOW_API_KEY:
        return STORYFLOW_API_KEY
    if MINIMAX_API_KEY:
        return MINIMAX_API_KEY
    config_path = os.path.join(os.path.dirname(__file__), 'workflow_config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                return config.get('api_key', '')
        except:
            pass
    return ''

# ========================
# FastAPI App
# ========================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print("=" * 60)
    print("StoryFlow Web Server (FastAPI)")
    print("=" * 60)
    yield
    print("Shutting down...")

app = FastAPI(
    title="StoryFlow API",
    description="可视化小说工作流引擎 API",
    version="1.1.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
web_path = os.path.join(os.path.dirname(__file__), 'web')
if os.path.exists(web_path):
    app.mount("/static", StaticFiles(directory=web_path), name="static")

# ========================
# API Routes
# ========================

@app.get("/")
async def root():
    """主页"""
    index_path = os.path.join(os.path.dirname(__file__), 'web', 'index.html')
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "StoryFlow API", "docs": "/docs"}

@app.get("/api/nodes", response_model=dict)
async def get_nodes():
    """获取所有可用节点类型"""
    nodes = []
    for node_type, node_class in NODE_REGISTRY.items():
        nodes.append({
            'type': node_type,
            'name': getattr(node_class, 'name', node_type),
            'description': getattr(node_class, 'description', ''),
            'input_ports': getattr(node_class, 'input_ports', []),
            'output_ports': getattr(node_class, 'output_ports', [])
        })
    return {'success': True, 'nodes': nodes}

@app.get("/api/workflow/load", response_model=dict)
async def load_workflow():
    """加载工作流配置"""
    config_path = os.path.join(os.path.dirname(__file__), 'workflow_config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            return {'success': True, 'config': config}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=404, detail="No workflow config found")

@app.post("/api/workflow/save", response_model=dict)
async def save_workflow(request: SaveRequest):
    """保存工作流配置"""
    config_path = os.path.join(os.path.dirname(__file__), 'workflow_config.json')
    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(request.config, f, ensure_ascii=False, indent=2)
        return {'success': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/workflow/execute", response_model=dict)
async def execute_workflow(request: ExecuteRequest):
    """执行工作流"""
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(status_code=400, detail="No API key configured")
    
    try:
        # Create provider
        provider = ProviderFactory.create(
            request.config.provider,
            api_key,
            request.config.model
        )
        
        # Build workflow
        workflow = Workflow(
            request.config.name,
            request.config.description
        )
        
        # Add nodes
        for node_config in request.config.nodes:
            node_type = node_config.type
            node_id = node_config.id
            node_class = NODE_REGISTRY.get(node_type)
            if node_class:
                node = node_class(node_id, provider=provider)
                # Set inputs
                for key, value in node_config.inputs.items():
                    if key not in ['label', 'icon', 'onUpdate']:
                        node.set_input(key, value)
                workflow.add_node(node)
        
        # Add connections
        for conn in request.config.connections:
            workflow.add_connection(
                conn.from_node,
                conn.from_port,
                conn.to_node,
                conn.to_port
            )
        
        # Execute with async
        engine = Engine(
            workflow,
            request.config.use_cache,
            request.config.use_checkpoint
        )
        result = await engine.execute()  # Native async!
        
        return {
            'success': result.get('success', True),
            'results': result.get('results', {}),
            'log': result.get('log', [])
        }
        
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail={
            'error': str(e),
            'traceback': traceback.format_exc()
        })

@app.get("/api/workflow/status", response_model=dict)
async def get_status():
    """获取工作流状态"""
    return {
        'success': True,
        'status': 'ready',
        'api_key_set': bool(get_api_key()),
        'available_providers': ['minimax', 'tongyi', 'claude'],
        'default_model': 'MiniMax-M2.7'
    }

@app.get("/api/config", response_model=dict)
async def get_config():
    """获取服务器配置"""
    return {
        'success': True,
        'config': {
            'api_key_set': bool(get_api_key()),
            'providers': ['minimax', 'tongyi', 'claude'],
            'default_model': 'MiniMax-M2.7',
            'features': {
                'async_execution': True,
                'checkpoint': True,
                'cache': True
            }
        }
    }

# ========================
# Main
# ========================

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("StoryFlow Web Server (FastAPI)")
    print("=" * 60)
    print("Local:   http://localhost:5001")
    print("Docs:    http://localhost:5001/docs")
    print("")
    print("API Key: " + ("SET" if get_api_key() else "NOT SET"))
    print("")
    print("Make sure the API key is set via:")
    print("  set STORYFLOW_API_KEY=your_key  (Windows)")
    print("  export STORYFLOW_API_KEY=your_key  (Linux/Mac)")
    print("=" * 60)
    uvicorn.run(app, host='0.0.0.0', port=5001)
