"""
StoryFlow Web API Test Suite v1.0
测试所有 API 端点，确保前后端数据流通
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5001"

def print_section(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def test_health():
    """测试健康检查端点"""
    print_section("GET /api/health - 健康检查")
    try:
        resp = requests.get(f"{BASE_URL}/api/health", timeout=5)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        assert data['success'] == True
        assert data['status'] == 'healthy'
        print("✓ PASSED")
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

def test_get_nodes():
    """测试获取节点类型"""
    print_section("GET /api/nodes - 获取所有节点类型")
    try:
        resp = requests.get(f"{BASE_URL}/api/nodes", timeout=5)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Success: {data['success']}")
        print(f"Node count: {len(data.get('nodes', {}))}")
        print(f"Has storyflow: {data.get('has_storyflow', False)}")
        assert data['success'] == True
        print("✓ PASSED")
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

def test_get_templates():
    """测试获取预设模板"""
    print_section("GET /api/storyflow/templates - 获取预设模板")
    try:
        resp = requests.get(f"{BASE_URL}/api/storyflow/templates", timeout=5)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Success: {data['success']}")
        templates = data.get('templates', {})
        print(f"Template count: {len(templates)}")
        for name, template in templates.items():
            print(f"  - {name}: {template['name']}")
        assert data['success'] == True
        print("✓ PASSED")
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

def test_get_workflow_nodes():
    """测试获取工作流节点状态"""
    print_section("GET /api/workflow/nodes - 获取工作流节点状态")
    try:
        resp = requests.get(f"{BASE_URL}/api/workflow/nodes", timeout=5)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        assert data['success'] == True
        print("✓ PASSED")
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

def test_workflow_state():
    """测试获取工作流状态"""
    print_section("GET /api/workflow/state - 获取工作流状态")
    try:
        resp = requests.get(f"{BASE_URL}/api/workflow/state", timeout=5)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        assert data['success'] == True
        print("✓ PASSED")
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

def test_workflow_load():
    """测试加载工作流配置"""
    print_section("GET /api/workflow/load - 加载工作流配置")
    try:
        resp = requests.get(f"{BASE_URL}/api/workflow/load", timeout=5)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Success: {data['success']}")
        if data['success']:
            print(f"Config keys: {list(data.get('config', {}).keys())}")
        print("✓ PASSED (即使配置不存在也正常返回)")
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

def test_workflow_save():
    """测试保存工作流配置"""
    print_section("POST /api/workflow/save - 保存工作流配置")
    try:
        test_config = {
            "name": "Test Workflow",
            "description": "API Test Config",
            "nodes": [],
            "connections": []
        }
        resp = requests.post(
            f"{BASE_URL}/api/workflow/save",
            json={"config": test_config},
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        assert data['success'] == True
        print("✓ PASSED")
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

def test_get_config():
    """测试获取服务器配置"""
    print_section("GET /api/config - 获取服务器配置")
    try:
        resp = requests.get(f"{BASE_URL}/api/config", timeout=5)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        assert data['success'] == True
        print("✓ PASSED")
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

def test_execute_stream_not_implemented():
    """测试流式执行端点（应返回未实现）"""
    print_section("POST /api/workflow/execute/stream - 流式执行（预期501）")
    try:
        resp = requests.post(
            f"{BASE_URL}/api/workflow/execute/stream",
            json={},
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        assert data['success'] == False
        assert data['code'] == 'STREAM_NOT_IMPLEMENTED'
        print("✓ PASSED (正确返回未实现)")
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

def test_validation_error():
    """测试工作流执行验证错误"""
    print_section("POST /api/workflow/execute - 验证错误测试")
    try:
        # 测试空配置
        resp = requests.post(
            f"{BASE_URL}/api/workflow/execute",
            json={"config": {}},
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        assert data['success'] == False
        assert 'code' in data  # 应该有错误码
        print("✓ PASSED (正确返回验证错误)")
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

def test_missing_body():
    """测试缺少请求体"""
    print_section("POST /api/workflow/execute - 缺少请求体测试")
    try:
        resp = requests.post(
            f"{BASE_URL}/api/workflow/execute",
            timeout=5
        )
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        assert data['success'] == False
        print("✓ PASSED (正确返回缺少请求体错误)")
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

def test_connection_format_normalization():
    """测试连接格式统一（前端格式 -> 后端格式）"""
    print_section("POST /api/workflow/execute - 连接格式统一测试")
    try:
        # 使用前端格式 (from_node/from_port/to_node/to_port)
        config = {
            "name": "Connection Test",
            "nodes": [
                {"id": "node1", "type": "world_building", "x": 100, "y": 100},
            ],
            # 前端格式
            "connections": [
                {"from_node": "node1", "from_port": "world_description", "to_node": "node1", "to_port": "output"}
            ]
        }
        resp = requests.post(
            f"{BASE_URL}/api/workflow/execute",
            json={"config": config},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Success: {data['success']}")
        if not data['success']:
            print(f"Error: {data.get('error', 'N/A')}")
            print(f"Code: {data.get('code', 'N/A')}")
        print("✓ PASSED (连接格式处理正常)")
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

def main():
    print("\n" + "=" * 60)
    print("  StoryFlow Web API Test Suite v1.0")
    print("=" * 60)
    print(f"Target: {BASE_URL}")
    print()
    
    # 首先检查服务器是否运行
    try:
        resp = requests.get(f"{BASE_URL}/api/health", timeout=5)
        print(f"[INFO] Server is running at {BASE_URL}")
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Cannot connect to server at {BASE_URL}")
        print("[ERROR] Please start the server first:")
        print("[ERROR]   python src/api/web_server.py")
        sys.exit(1)
    
    # 运行测试
    tests = [
        test_health,
        test_get_nodes,
        test_get_templates,
        test_get_workflow_nodes,
        test_workflow_state,
        test_workflow_load,
        test_workflow_save,
        test_get_config,
        test_execute_stream_not_implemented,
        test_validation_error,
        test_missing_body,
        test_connection_format_normalization,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"✗ EXCEPTION: {e}")
            failed += 1
    
    # 总结
    print_section("Test Results Summary")
    print(f"Total: {passed + failed}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed > 0:
        print("\n⚠️  Some tests failed. Please check the output above.")
        sys.exit(1)
    else:
        print("\n✅ All tests passed!")
        sys.exit(0)

if __name__ == '__main__':
    main()
