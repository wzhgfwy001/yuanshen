"""
StoryFlow Web Server - Enhanced v1.3.0
Optimized API + Frontend-Backend Data Flow
Port: 5001
"""

import os
import sys
import json
import asyncio
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from src.engine.engine import ProviderFactory, Workflow, Engine, LoopConfig, LoopEngine
from src.nodes.nodes import NODE_REGISTRY

# 尝试导入 storyflow 模块
try:
    from src.nodes import storyflow_NODE_REGISTRY, storyflowWorkflow
    HAS_storyflow = True
except ImportError:
    HAS_storyflow = False
    storyflow_NODE_REGISTRY = {}

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), '..', '..', 'web'))
CORS(app)

# =============================================================================
# 统一错误响应辅助函数
# =============================================================================

def make_error_response(error_msg, code, status_code=400):
    """创建统一格式的错误响应"""
    return jsonify({
        'success': False,
        'error': error_msg,
        'code': code
    }), status_code


# =============================================================================
# 数据验证辅助函数
# =============================================================================

def validate_workflow_config(config):
    """验证工作流配置"""
    if not config:
        raise ValueError("工作流配置不能为空")
    
    nodes = config.get('nodes', [])
    if not nodes:
        raise ValueError("工作流至少需要一个节点")
    
    # 验证节点类型是否存在
    for node in nodes:
        node_type = node.get('type')
        if not node_type:
            raise ValueError(f"节点 {node.get('id', 'unknown')} 缺少 type 字段")
        
        # 检查节点类型是否注册（基础或storyflow）
        if node_type not in NODE_REGISTRY and (not HAS_storyflow or node_type not in storyflow_NODE_REGISTRY):
            raise ValueError(f"未知的节点类型: {node_type}")
    
    return True


def normalize_connections(connections):
    """统一连接格式 - 将前端的 from_node/from_port/to_node/to_port 转为后端的 source_node/source/target_node/target"""
    normalized = []
    for conn in connections:
        # 处理前端格式 (from_node/from_port)
        if 'from_node' in conn:
            normalized.append({
                'source_node': conn['from_node'],
                'source': conn.get('from_port', ''),
                'target_node': conn['to_node'],
                'target': conn.get('to_port', '')
            })
        # 处理后端格式 (source_node/source)
        elif 'source_node' in conn:
            normalized.append(conn)
        else:
            raise ValueError(f"无法解析的连接格式: {conn}")
    return normalized


# =============================================================================
# API Key 辅助函数
# =============================================================================

def get_api_key():
    """获取 API Key"""
    for env_var in ['STORYFLOW_API_KEY', 'MINIMAX_API_KEY', 'DASHSCOPE_API_KEY']:
        api_key = os.environ.get(env_var)
        if api_key:
            return api_key
    # 尝试从配置文件读取
    config_path = os.path.join(os.path.dirname(__file__), 'workflow_config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                return config.get('api_key', '')
        except (json.JSONDecodeError, IOError) as e:
            pass
    return ''


# =============================================================================
# 静态文件服务
# =============================================================================

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    """Serve built assets from web/assets/"""
    return send_from_directory(app.static_folder, 'assets/' + filename)

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('web', filename)

@app.route('/babel.min.js')
def serve_babel():
    return send_from_directory('web', 'babel.min.js')


# =============================================================================
# 新增端点：健康检查 & 工作流节点状态 & 流式执行
# =============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'has_storyflow': HAS_storyflow,
        'node_types': {
            'basic': len(NODE_REGISTRY),
            'storyflow': len(storyflow_NODE_REGISTRY) if HAS_storyflow else 0
        }
    })

@app.route('/api/workflow/nodes', methods=['GET'])
def get_workflow_nodes():
    """获取当前工作流的节点状态"""
    workflow_id = request.args.get('workflow_id', 'default')
    return jsonify({
        'success': True,
        'workflow_id': workflow_id,
        'nodes': [],
        'connections': [],
        'message': '当前工作流节点状态查询端点'
    })

@app.route('/api/workflow/execute/stream', methods=['POST'])
def execute_workflow_stream():
    """流式输出执行过程（可选功能）"""
    return jsonify({
        'success': False,
        'error': 'Stream execution not yet implemented',
        'code': 'STREAM_NOT_IMPLEMENTED'
    }), 501


# =============================================================================
# 节点类型 & 模板
# =============================================================================

@app.route('/api/nodes', methods=['GET'])
def get_nodes():
    """获取所有可用节点类型"""
    try:
        all_nodes = {}
        
        # 基础节点
        for node_type, node_class in NODE_REGISTRY.items():
            all_nodes[node_type] = {
                'type': node_type,
                'category': 'basic',
                'name': getattr(node_class, '__name__', node_type),
                'color': '#4A90D9'
            }
        
        # storyflow 节点
        for node_type, node_class in storyflow_NODE_REGISTRY.items():
            category = 'truth_files' if 'truth' in node_type or 'matrix' in node_type or 'hooks' in node_type or 'particle' in node_type or 'emotional' in node_type or 'chapter_summaries' in node_type or 'subplot' in node_type else 'audit' if 'audit' in node_type else 'agents'
            color = {
                'truth_files': '#10B981',
                'audit': '#F59E0B',
                'agents': '#8B5CF6'
            }.get(category, '#6B7280')
            
            all_nodes[node_type] = {
                'type': node_type,
                'category': category,
                'name': getattr(node_class, '__name__', node_type),
                'color': color
            }
        
        return jsonify({
            'success': True,
            'nodes': all_nodes,
            'has_storyflow': HAS_storyflow
        })
    except Exception as e:
        import traceback
        print(f"[ERROR] get_nodes: {str(e)}")
        print(traceback.format_exc())
        return make_error_response(str(e), 'GET_NODES_ERROR', 500)

@app.route('/api/storyflow/templates', methods=['GET'])
def get_storyflow_templates():
    """获取 storyflow 预设模板"""
    try:
        templates = {
            'storyflow_5agent': {
                'name': 'storyflow 5-Agent',
                'description': '完整的 AI 小说创作管线',
                'nodes': [
                    {'id': 'radar', 'type': 'radar', 'x': 100, 'y': 100},
                    {'id': 'architect', 'type': 'architect', 'x': 350, 'y': 100},
                    {'id': 'writer', 'type': 'writer', 'x': 600, 'y': 100},
                    {'id': 'auditor', 'type': 'audit_33d', 'x': 850, 'y': 100},
                    {'id': 'reviser', 'type': 'revise', 'x': 1100, 'y': 100},
                ],
                'connections': [
                    {'source_node': 'radar', 'source': 'story_direction', 'target_node': 'architect', 'target': 'market_context'},
                    {'source_node': 'architect', 'source': 'chapter_outline', 'target_node': 'writer', 'target': 'chapter_outline'},
                    {'source_node': 'architect', 'source': 'truth_context', 'target_node': 'writer', 'target': 'truth_context'},
                    {'source_node': 'writer', 'source': 'chapter_draft', 'target_node': 'auditor', 'target': 'chapter_draft'},
                    {'source_node': 'writer', 'source': 'state_update', 'target_node': 'auditor', 'target': 'truth_files'},
                    {'source_node': 'auditor', 'source': 'audit_report', 'target_node': 'reviser', 'target': 'audit_result'},
                    {'source_node': 'writer', 'source': 'chapter_draft', 'target_node': 'reviser', 'target': 'draft'},
                ],
                'loop_config': {
                    'enabled': True,
                    'loop_nodes': ['reviser', 'auditor'],
                    'max_iterations': 3,
                    'exit_condition': 'critical_issues == 0'
                }
            },
            'basic_novel': {
                'name': '基础小说生成',
                'description': '简单的小说创作流程',
                'nodes': [
                    {'id': 'world', 'type': 'world_building', 'x': 100, 'y': 200},
                    {'id': 'character', 'type': 'character', 'x': 400, 'y': 200},
                    {'id': 'chapter', 'type': 'chapter_generation', 'x': 700, 'y': 200},
                ],
                'connections': [
                    {'source_node': 'world', 'source': 'world_description', 'target_node': 'character', 'target': 'world_description'},
                    {'source_node': 'character', 'source': 'character_profile', 'target_node': 'chapter', 'target': 'character_profile'},
                    {'source_node': 'world', 'source': 'world_description', 'target_node': 'chapter', 'target': 'world_description'},
                ]
            }
        }
        
        return jsonify({'success': True, 'templates': templates})
    except Exception as e:
        import traceback
        print(f"[ERROR] get_storyflow_templates: {str(e)}")
        print(traceback.format_exc())
        return make_error_response(str(e), 'GET_TEMPLATES_ERROR', 500)


# =============================================================================
# 核心工作流执行
# =============================================================================

@app.route('/api/workflow/execute', methods=['POST'])
def execute_workflow():
    """执行工作流"""
    print("[API] /api/workflow/execute called")
    
    if not request.json:
        return make_error_response('Request body is required', 'MISSING_BODY', 400)

    config = request.json.get('config', {})
    
    # 数据验证
    try:
        validate_workflow_config(config)
    except ValueError as e:
        return make_error_response(str(e), 'VALIDATION_ERROR', 400)
    
    api_key = get_api_key()
    if not api_key:
        return make_error_response('No API key configured', 'NO_API_KEY', 400)
    
    workflow_type = config.get('workflow_type', 'basic')
    
    try:
        if workflow_type == 'storyflow' and HAS_storyflow:
            return execute_storyflow_workflow(config, api_key)
        else:
            return execute_basic_workflow(config, api_key)
            
    except Exception as e:
        import traceback
        print(f"[ERROR] execute_workflow: {str(e)}")
        print(traceback.format_exc())
        return make_error_response(str(e), 'EXECUTION_ERROR', 500)

def execute_basic_workflow(config, api_key):
    """执行基础工作流"""
    print(f"[API] execute_basic_workflow: {config.get('name', 'WebWorkflow')}")
    
    provider = ProviderFactory.create(
        config.get('provider', 'minimax'),
        api_key,
        config.get('model')
    )
    
    workflow = Workflow(
        config.get('name', 'WebWorkflow'),
        config.get('description', '')
    )
    
    # 添加节点
    for node_config in config.get('nodes', []):
        node_type = node_config.get('type')
        node_id = node_config.get('id')
        node_class = NODE_REGISTRY.get(node_type)
        if node_class:
            node = node_class(node_id, provider=provider)
            for key, value in node_config.get('inputs', {}).items():
                if key not in ['label', 'icon']:
                    node.set_input(key, value)
            workflow.add_node(node)
    
    # 统一连接格式并添加连接
    connections = config.get('connections', [])
    normalized_connections = normalize_connections(connections)
    for conn in normalized_connections:
        workflow.add_connection(
            conn['source_node'], conn['source'],
            conn['target_node'], conn['target']
        )
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        engine = Engine(workflow, use_cache=True, enable_checkpoint=True)
        result = loop.run_until_complete(engine.execute())
    finally:
        loop.close()
    
    return jsonify({
        'success': result.get('success', True),
        'results': result.get('results', {}),
        'log': result.get('log', [])
    })

def execute_storyflow_workflow(config, api_key):
    """执行 storyflow 5-Agent 工作流"""
    print(f"[API] execute_storyflow_workflow: storyflow 5-Agent")
    
    loop_config_data = config.get('loop_config', {})
    
    loop_config = LoopConfig(
        enabled=loop_config_data.get('enabled', True),
        loop_nodes=loop_config_data.get('loop_nodes', ['reviser', 'auditor']),
        max_iterations=loop_config_data.get('max_iterations', 3),
        exit_condition=loop_config_data.get('exit_condition', 'critical_issues == 0')
    )
    
    # 构建工作流
    workflow = Workflow('storyflow_web', 'storyflow 5-Agent')
    
    from src.nodes.storyflow_nodes import RadarNode, ArchitectNode, WriterNode, AuditNode, ReviseNode, get_provider
    
    provider = get_provider(config.get('provider', 'minimax'), config.get('model'))
    
    # 创建节点
    radar = RadarNode('radar', provider)
    architect = ArchitectNode('architect', provider)
    writer = WriterNode('writer', provider)
    auditor = AuditNode('auditor', provider)
    reviser = ReviseNode('reviser', provider)
    
    # 设置输入
    for node_config in config.get('nodes', []):
        node_id = node_config.get('id')
        inputs = node_config.get('inputs', {})
        
        node_map = {
            'radar': radar,
            'architect': architect,
            'writer': writer,
            'auditor': auditor,
            'reviser': reviser
        }
        
        node = node_map.get(node_id)
        if node:
            for key, value in inputs.items():
                node.set_input(key, value)
        
        # 设置位置
        if node_id in node_map:
            node_map[node_id]._position = (node_config.get('x', 0), node_config.get('y', 0))
    
    # 添加节点
    workflow.add_node(radar)
    workflow.add_node(architect)
    workflow.add_node(writer)
    workflow.add_node(auditor)
    workflow.add_node(reviser)
    
    # 统一连接格式并添加连接
    connections = config.get('connections', [])
    normalized_connections = normalize_connections(connections)
    for conn in normalized_connections:
        workflow.add_connection(
            conn['source_node'], conn['source'],
            conn['target_node'], conn['target']
        )
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        engine = LoopEngine(workflow, loop_config, use_cache=True, enable_checkpoint=True)
        result = loop.run_until_complete(engine.execute())
    finally:
        loop.close()
    
    response = {
        'success': result.get('success', True),
        'results': result.get('results', {}),
        'iteration_count': result.get('iteration_count', 0),
        'loop_terminated': result.get('loop_terminated'),
        'log': result.get('log', [])
    }
    return jsonify(response)


# =============================================================================
# 工作流状态 & 配置加载/保存
# =============================================================================

@app.route('/api/workflow/state', methods=['GET'])
def get_workflow_state():
    """获取工作流执行状态"""
    try:
        workflow_id = request.args.get('workflow_id', 'default')
        return jsonify({
            'success': True,
            'workflow_id': workflow_id,
            'status': 'idle',
            'message': '工作流状态查询端点'
        })
    except Exception as e:
        import traceback
        print(f"[ERROR] get_workflow_state: {str(e)}")
        print(traceback.format_exc())
        return make_error_response(str(e), 'GET_STATE_ERROR', 500)

@app.route('/api/workflow/load', methods=['GET'])
def load_workflow():
    """加载工作流配置"""
    try:
        config_path = os.path.join(os.path.dirname(__file__), 'workflow_config.json')
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            return jsonify({'success': True, 'config': config})
        return make_error_response('No workflow config found', 'CONFIG_NOT_FOUND', 404)
    except Exception as e:
        import traceback
        print(f"[ERROR] load_workflow: {str(e)}")
        print(traceback.format_exc())
        return make_error_response(str(e), 'LOAD_ERROR', 500)

@app.route('/api/workflow/save', methods=['POST'])
def save_workflow():
    """保存工作流配置"""
    try:
        config = request.json.get('config', {})
        config_path = os.path.join(os.path.dirname(__file__), 'workflow_config.json')
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        return jsonify({'success': True})
    except Exception as e:
        import traceback
        print(f"[ERROR] save_workflow: {str(e)}")
        print(traceback.format_exc())
        return make_error_response(str(e), 'SAVE_ERROR', 500)

@app.route('/api/config', methods=['GET'])
def get_config():
    """获取服务器配置"""
    try:
        return jsonify({
            'success': True,
            'config': {
                'api_key_set': bool(get_api_key()),
                'providers': ['minimax', 'tongyi', 'claude'],
                'default_model': 'MiniMax-M2.7',
                'has_storyflow': HAS_storyflow
            }
        })
    except Exception as e:
        import traceback
        print(f"[ERROR] get_config: {str(e)}")
        print(traceback.format_exc())
        return make_error_response(str(e), 'GET_CONFIG_ERROR', 500)


# =============================================================================
# 启动入口
# =============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("StoryFlow Web Server v1.3.0 - Optimized API Layer")
    print("=" * 60)
    print("Local:   http://localhost:5001")
    print("Network: http://0.0.0.0:5001")
    print("")
    if HAS_storyflow:
        print("[OK] storyflow 5-Agent 模块已加载")
    else:
        print("[!] storyflow 5-Agent 模块未加载")
    print("")
    print("API Endpoints:")
    print("  GET  /api/health              - 健康检查")
    print("  GET  /api/nodes               - 获取所有节点类型")
    print("  GET  /api/storyflow/templates - 获取预设模板")
    print("  GET  /api/workflow/nodes      - 获取工作流节点状态")
    print("  POST /api/workflow/execute    - 执行工作流")
    print("  POST /api/workflow/execute/stream - 流式执行")
    print("  GET  /api/workflow/state      - 获取执行状态")
    print("  GET  /api/workflow/load      - 加载配置")
    print("  POST /api/workflow/save      - 保存配置")
    print("  GET  /api/config             - 获取配置")
    print("")
    print("Make sure the API key is set via:")
    print("  set STORYFLOW_API_KEY=your_key  (Windows)")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5001, debug=True)
