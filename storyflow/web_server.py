"""
StoryFlow Web Server - Enhanced v1.2.0
INKOS 5-Agent 支持
Port: 5001
"""

import os
import sys
import json
import asyncio
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine import ProviderFactory, Workflow, Engine, LoopConfig, LoopEngine
from nodes import NODE_REGISTRY

# 尝试导入 INKOS 模块
try:
    from inkos_nodes import INKOS_NODE_REGISTRY, INKOSWorkflow
    HAS_INKOS = True
except ImportError:
    HAS_INKOS = False
    INKOS_NODE_REGISTRY = {}

app = Flask(__name__, static_folder='web')
CORS(app)

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
        except:
            pass
    return ''

@app.route('/')
def index():
    return send_from_directory('web', 'index.html')

@app.route('/api/nodes', methods=['GET'])
def get_nodes():
    """获取所有可用节点类型"""
    all_nodes = {}
    
    # 基础节点
    for node_type, node_class in NODE_REGISTRY.items():
        all_nodes[node_type] = {
            'type': node_type,
            'category': 'basic',
            'name': getattr(node_class, '__name__', node_type),
            'color': '#4A90D9'
        }
    
    # INKOS 节点
    for node_type, node_class in INKOS_NODE_REGISTRY.items():
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
        'has_inkos': HAS_INKOS
    })

@app.route('/api/inkos/templates', methods=['GET'])
def get_inkos_templates():
    """获取 INKOS 预设模板"""
    templates = {
        'inkos_5agent': {
            'name': 'INKOS 5-Agent',
            'description': '完整的 AI 小说创作管线',
            'nodes': [
                {'id': 'radar', 'type': 'radar', 'x': 100, 'y': 100},
                {'id': 'architect', 'type': 'architect', 'x': 350, 'y': 100},
                {'id': 'writer', 'type': 'writer', 'x': 600, 'y': 100},
                {'id': 'auditor', 'type': 'audit_33d', 'x': 850, 'y': 100},
                {'id': 'reviser', 'type': 'revise', 'x': 1100, 'y': 100},
            ],
            'connections': [
                {'from_node': 'radar', 'from_port': 'story_direction', 'to_node': 'architect', 'to_port': 'market_context'},
                {'from_node': 'architect', 'from_port': 'chapter_outline', 'to_node': 'writer', 'to_port': 'chapter_outline'},
                {'from_node': 'architect', 'from_port': 'truth_context', 'to_node': 'writer', 'to_port': 'truth_context'},
                {'from_node': 'writer', 'from_port': 'chapter_draft', 'to_node': 'auditor', 'to_port': 'chapter_draft'},
                {'from_node': 'writer', 'from_port': 'state_update', 'to_node': 'auditor', 'to_port': 'truth_files'},
                {'from_node': 'auditor', 'from_port': 'audit_report', 'to_node': 'reviser', 'to_port': 'audit_result'},
                {'from_node': 'writer', 'from_port': 'chapter_draft', 'to_node': 'reviser', 'to_port': 'draft'},
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
                {'from_node': 'world', 'from_port': 'world_description', 'to_node': 'character', 'to_port': 'world_description'},
                {'from_node': 'character', 'from_port': 'character_profile', 'to_node': 'chapter', 'to_port': 'character_profile'},
                {'from_node': 'world', 'from_port': 'world_description', 'to_node': 'chapter', 'to_port': 'world_description'},
            ]
        }
    }
    
    return jsonify({'success': True, 'templates': templates})

@app.route('/api/workflow/execute', methods=['POST'])
def execute_workflow():
    """执行工作流"""
    config = request.json.get('config', {})
    
    api_key = get_api_key()
    if not api_key:
        return jsonify({'success': False, 'error': 'No API key configured'}), 400
    
    workflow_type = config.get('workflow_type', 'basic')
    
    try:
        if workflow_type == 'inkos' and HAS_INKOS:
            return execute_inkos_workflow(config, api_key)
        else:
            return execute_basic_workflow(config, api_key)
            
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

def execute_basic_workflow(config, api_key):
    """执行基础工作流"""
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
    
    # 添加连接
    for conn in config.get('connections', []):
        workflow.add_connection(
            conn['from_node'], conn['from_port'],
            conn['to_node'], conn['to_port']
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

def execute_inkos_workflow(config, api_key):
    """执行 INKOS 5-Agent 工作流"""
    loop_config_data = config.get('loop_config', {})
    
    loop_config = LoopConfig(
        enabled=loop_config_data.get('enabled', True),
        loop_nodes=loop_config_data.get('loop_nodes', ['reviser', 'auditor']),
        max_iterations=loop_config_data.get('max_iterations', 3),
        exit_condition=loop_config_data.get('exit_condition', 'critical_issues == 0')
    )
    
    # 构建工作流
    workflow = Workflow('inkos_web', 'INKOS 5-Agent')
    
    from inkos_nodes import RadarNode, ArchitectNode, WriterNode, AuditNode, ReviserNode, get_provider
    
    provider = get_provider(config.get('provider', 'minimax'), config.get('model'))
    
    # 创建节点
    radar = RadarNode('radar', provider)
    architect = ArchitectNode('architect', provider)
    writer = WriterNode('writer', provider)
    auditor = AuditNode('auditor', provider)
    reviser = ReviserNode('reviser', provider)
    
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
    
    # 添加连接
    for conn in config.get('connections', []):
        workflow.add_connection(
            conn['from_node'], conn['from_port'],
            conn['to_node'], conn['to_port']
        )
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        engine = LoopEngine(workflow, loop_config, use_cache=True, enable_checkpoint=True)
        result = loop.run_until_complete(engine.execute())
    finally:
        loop.close()
    
    return jsonify({
        'success': result.get('success', True),
        'results': result.get('results', {}),
        'iteration_count': result.get('iteration_count', 0),
        'loop_terminated': result.get('loop_terminated'),
        'log': result.get('log', [])
    })

@app.route('/api/workflow/load', methods=['GET'])
def load_workflow():
    """加载工作流配置"""
    config_path = os.path.join(os.path.dirname(__file__), 'workflow_config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            return jsonify({'success': True, 'config': config})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    return jsonify({'success': False, 'error': 'No workflow config found'}), 404

@app.route('/api/workflow/save', methods=['POST'])
def save_workflow():
    """保存工作流配置"""
    config = request.json.get('config', {})
    config_path = os.path.join(os.path.dirname(__file__), 'workflow_config.json')
    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/config', methods=['GET'])
def get_config():
    """获取服务器配置"""
    return jsonify({
        'success': True,
        'config': {
            'api_key_set': bool(get_api_key()),
            'providers': ['minimax', 'tongyi', 'claude'],
            'default_model': 'MiniMax-M2.7',
            'has_inkos': HAS_INKOS
        }
    })

if __name__ == '__main__':
    print("=" * 60)
    print("StoryFlow Web Server v1.2.0 - INKOS 5-Agent")
    print("=" * 60)
    print("Local:   http://localhost:5001")
    print("Network: http://0.0.0.0:5001")
    print("")
    if HAS_INKOS:
        print("[OK] INKOS 5-Agent 模块已加载")
    else:
        print("[!] INKOS 5-Agent 模块未加载")
    print("")
    print("Make sure the API key is set via:")
    print("  set STORYFLOW_API_KEY=your_key  (Windows)")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5001, debug=True)
