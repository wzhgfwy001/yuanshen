import React, { useState, useEffect, useCallback } from 'react';
import { ReactFlow, addEdge, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import Header from './components/Header.jsx';
import NodePalette from './components/NodePalette.jsx';
import WorkflowCanvas from './components/WorkflowCanvas.jsx';
import PropertiesPanel from './components/PropertiesPanel.jsx';
import OutputPanel from './components/OutputPanel.jsx';
import TemplatesModal from './components/TemplatesModal.jsx';
import ApiKeyModal from './components/ApiKeyModal.jsx';
import { getNodeIcon, getNodeCategory } from './utils/nodeHelpers.js';

const initialNodes = [
  { id: '1', type: 'custom', position: { x: 100, y: 150 }, data: { label: 'World Building', icon: '🌍', category: 'basic', description: 'Generate world setting' } },
  { id: '2', type: 'custom', position: { x: 400, y: 150 }, data: { label: 'Character', icon: '👤', category: 'basic', description: 'Create characters' } },
  { id: '3', type: 'custom', position: { x: 700, y: 150 }, data: { label: 'Chapter', icon: '📖', category: 'basic', description: 'Write chapter' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#3b82f6' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#3b82f6' } },
];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [workflowType, setWorkflowType] = useState('basic');
  const [isRunning, setIsRunning] = useState(false);
  const [execResult, setExecResult] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [loopConfig, setLoopConfig] = useState({
    enabled: true,
    maxIterations: 3,
    exitCondition: 'critical_issues == 0'
  });

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        setApiKeySet(data.config?.api_key_set || false);
      })
      .catch(() => setApiKeySet(false));
  }, []);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#3b82f6' } }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const loadTemplate = (template) => {
    const newNodes = template.nodes.map((n, i) => ({
      id: n.id,
      type: 'custom',
      position: { x: n.x, y: n.y },
      data: {
        label: n.type.charAt(0).toUpperCase() + n.type.slice(1).replace('_', ' '),
        icon: getNodeIcon(n.type),
        category: getNodeCategory(n.type),
        type: n.type,
        inputs: {}
      }
    }));

    const newEdges = template.connections.map((c, i) => ({
      id: `e${i}`,
      source: c.from_node,
      target: c.to_node,
      sourceHandle: c.from_port,
      targetHandle: c.to_port,
      animated: true,
      style: { stroke: '#8b5cf6' }
    }));

    setNodes(newNodes);
    setEdges(newEdges);
    setShowTemplates(false);

    if (template.loop_config) {
      setLoopConfig({
        enabled: template.loop_config.enabled,
        maxIterations: template.loop_config.max_iterations,
        exitCondition: template.loop_config.exit_condition
      });
    }

    setWorkflowType(template.name === 'storyflow 5-Agent' ? 'storyflow' : 'basic');
    showToast('Template loaded: ' + template.name, 'success');
  };

  const executeWorkflow = async () => {
    if (!apiKeySet) {
      showToast('Please set API key first', 'error');
      setShowApiKeyModal(true);
      return;
    }

    setIsRunning(true);
    setExecResult(null);

    try {
      const config = {
        name: 'StoryFlow Web Workflow',
        description: '',
        provider: 'minimax',
        model: 'MiniMax-M2.7',
        use_cache: true,
        use_checkpoint: true,
        workflow_type: workflowType,
        loop_config: loopConfig,
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.data.type || 'unknown',
          x: n.position.x,
          y: n.position.y,
          inputs: n.data.inputs || {}
        })),
        connections: edges.map(e => ({
          from_node: e.source,
          from_port: e.sourceHandle,
          to_node: e.target,
          to_port: e.targetHandle
        }))
      };

      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (data.success) {
        setExecResult(data);
        showToast('Execution completed!', 'success');
      } else {
        showToast('Error: ' + (data.detail?.error || data.error || 'Unknown error'), 'error');
        setExecResult({ error: data.detail?.error || data.error || 'Unknown error' });
      }
    } catch (err) {
      showToast('Request failed: ' + err.message, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const updateNodeInput = (key, value) => {
    if (!selectedNode) return;
    setNodes(nds => nds.map(n => {
      if (n.id === selectedNode.id) {
        return { ...n, data: { ...n.data, inputs: { ...n.data.inputs, [key]: value } } };
      }
      return n;
    }));
  };

  const deleteNode = () => {
    if (!selectedNode) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const onDrop = (event) => {
    event.preventDefault();
    const data = JSON.parse(event.dataTransfer.getData('application/reactflow'));
    const position = { x: event.clientX - 280, y: event.clientY - 50 };
    const newNode = {
      id: `node_${Date.now()}`,
      type: 'custom',
      position,
      data: { label: data.label, icon: data.icon, category: data.category, type: data.type, inputs: {} }
    };
    setNodes(nds => [...nds, newNode]);
  };

  const onDragOver = (event) => {
    event.preventDefault();
  };

  const handleApiKeySave = () => {
    setApiKeySet(true);
    setShowApiKeyModal(false);
    showToast('API Key saved', 'success');
  };

  const clearCanvas = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setExecResult(null);
  };

  return (
    <div id="app">
      <Header
        workflowType={workflowType}
        setWorkflowType={setWorkflowType}
        apiKeySet={apiKeySet}
        onOpenApiKey={() => setShowApiKeyModal(true)}
        onOpenTemplates={() => setShowTemplates(true)}
        onClear={clearCanvas}
        onExecute={executeWorkflow}
        isRunning={isRunning}
      />
      
      <main className="main">
        <NodePalette />
        
        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          selectedNode={selectedNode}
          isRunning={isRunning}
        />
        
        <PropertiesPanel
          selectedNode={selectedNode}
          workflowType={workflowType}
          loopConfig={loopConfig}
          setLoopConfig={setLoopConfig}
          updateNodeInput={updateNodeInput}
          deleteNode={deleteNode}
        >
          <OutputPanel execResult={execResult} />
        </PropertiesPanel>
      </main>

      {showTemplates && (
        <TemplatesModal
          onClose={() => setShowTemplates(false)}
          onSelect={loadTemplate}
        />
      )}

      {showApiKeyModal && (
        <ApiKeyModal
          onClose={() => setShowApiKeyModal(false)}
          onSave={handleApiKeySave}
        />
      )}
    </div>
  );
}

let toastTimeout;
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.remove(), 3000);
}

export default App;