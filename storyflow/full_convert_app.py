#!/usr/bin/env python3
"""
Full conversion of App function from JSX to React.createElement
"""

import re

with open(r'C:\Users\DELL\.openclaw\workspace\storyflow\web\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# The new App return using createElement - full conversion
new_app_return = '''        function App() {
            // Language state - default to Chinese
            const [lang, setLang] = useState(() => {
                return localStorage.getItem('storyflow_lang') || 'zh';
            });
            
            const [nodes, setNodes, onNodesChange] = useNodesState([]);
            const [edges, setEdges, onEdgesChange] = useEdgesState([]);
            const [selectedNode, setSelectedNode] = useState(null);
            const [previewData, setPreviewData] = useState(null);
            const [isLoading, setIsLoading] = useState(false);
            const [loadingStatus, setLoadingStatus] = useState('');
            const [apiKey, setApiKey] = useState('');
            
            const L = i18n[lang];
            
            useEffect(() => {
                const savedKey = localStorage.getItem('storyflow_api_key');
                if (savedKey) setApiKey(savedKey);
            }, []);
            
            useEffect(() => {
                localStorage.setItem('storyflow_lang', lang);
            }, [lang]);
            
            const nodePalette = [
                {
                    category: L.categoryCreation,
                    items: [
                        { type: 'world_building', icon: '🌍', name: L.nodeWorldBuilding, desc: L.descWorldBuilding },
                        { type: 'character', icon: '👤', name: L.nodeCharacter, desc: L.descCharacter },
                        { type: 'outline', icon: '📋', name: L.nodeOutline, desc: L.descOutline },
                        { type: 'chapter', icon: '📖', name: L.nodeChapter, desc: L.descChapter },
                    ]
                }
            ];
            
            const onDragStart = (event, nodeData) => {
                event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
                event.dataTransfer.effectAllowed = 'move';
            };
            
            const onDrop = useCallback((event) => {
                event.preventDefault();
                const data = event.dataTransfer.getData('application/reactflow');
                if (!data) return;
                const { type, icon, name } = JSON.parse(data);
                const newNode = {
                    id: type + '_' + Date.now(),
                    type: type,
                    position: { x: event.clientX - 280, y: event.clientY - 60 },
                    data: { label: name, icon: icon, lang: lang, onUpdate: (updates) => { setNodes(nds => nds.map(n => n.id === type + '_' + Date.now() ? { ...n, data: { ...n.data, ...updates } } : n)); } }
                };
                setNodes(nds => nds.concat(newNode));
            }, [setNodes, lang]);
            
            const onDragOver = useCallback((event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
            }, []);
            
            const onConnect = useCallback((params) => {
                setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#00d9ff' } }, eds));
            }, [setEdges]);
            
            const onNodeClick = useCallback((event, node) => {
                setSelectedNode(node);
            }, []);
            
            const executeWorkflow = async () => {
                if (!apiKey) { alert(L.alertNoApiKey); return; }
                if (nodes.length === 0) { alert(L.alertNoNodes); return; }
                setIsLoading(true);
                setLoadingStatus(L.loadingBuilding);
                try {
                    const config = {
                        name: 'StoryFlow Web Workflow', provider: 'minimax', model: 'MiniMax-M2.7',
                        nodes: nodes.map(n => ({ id: n.id, type: n.type, inputs: n.data })),
                        connections: edges.map(e => ({ from_node: e.source, from_port: 'output', to_node: e.target, to_port: 'input' }))
                    };
                    setLoadingStatus(L.loadingExecuting);
                    const response = await fetch('http://localhost:5001/api/workflow/execute', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config })
                    });
                    const result = await response.json();
                    if (result.success) { setPreviewData(result.results); setLoadingStatus(L.loadingComplete); }
                    else { alert(L.alertExecuteError + result.error); setLoadingStatus(L.loadingFailed); }
                } catch (error) { alert(L.alertRequestError + error.message); setLoadingStatus(L.loadingFailed); }
                finally { setIsLoading(false); }
            };
            
            const saveWorkflow = async () => {
                const config = { nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })), edges: edges.map(e => ({ source: e.source, target: e.target })) };
                try {
                    const response = await fetch('http://localhost:5001/api/workflow/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
                    if (response.ok) alert(L.alertSaveSuccess);
                } catch (error) { localStorage.setItem('storyflow_workflow', JSON.stringify({ nodes, edges })); alert(L.alertSaveLocal); }
            };
            
            const loadWorkflow = async () => {
                try {
                    const response = await fetch('http://localhost:5001/api/workflow/load');
                    const result = await response.json();
                    if (result.success) {
                        const { nodes: loadedNodes, edges: loadedEdges } = result.config;
                        if (loadedNodes) setNodes(loadedNodes.map(n => ({ ...n, data: { ...n.data, lang: lang, onUpdate: (updates) => { setNodes(nds => nds.map(nd => nd.id === n.id ? { ...nd, data: { ...nd.data, ...updates } } : nd)); } } })));
                        if (loadedEdges) setEdges(loadedEdges.map(e => ({ ...e, animated: true, style: { stroke: '#00d9ff' } })));
                    }
                } catch (error) {
                    const saved = localStorage.getItem('storyflow_workflow');
                    if (saved) { const { nodes: savedNodes, edges: savedEdges } = JSON.parse(saved); setNodes(savedNodes); setEdges(savedEdges); }
                }
            };
            
            const clearAll = () => { setNodes([]); setEdges([]); setPreviewData(null); setSelectedNode(null); };
            
            return React.createElement('div', { id: 'app' },
                React.createElement('div', { className: 'sidebar' },
                    React.createElement('div', { className: 'sidebar-header' },
                        React.createElement('h1', null, L.appTitle),
                        React.createElement('p', null, L.appSubtitle)
                    ),
                    React.createElement('div', { className: 'node-palette' },
                        React.createElement('div', { style: { marginBottom: 12 } },
                            React.createElement('input', { className: 'input-field', placeholder: L.apiKeyPlaceholder, type: 'password', value: apiKey, onChange: (e) => { setApiKey(e.target.value); localStorage.setItem('storyflow_api_key', e.target.value); }, style: { marginBottom: 8 } })
                        ),
                        nodePalette.map((cat, idx) =>
                            React.createElement('div', { key: idx, className: 'node-category' },
                                React.createElement('div', { className: 'node-category-title' }, cat.category),
                                cat.items.map((item, i) =>
                                    React.createElement('div', { key: i, className: 'node-item', draggable: true, onDragStart: (e) => onDragStart(e, item) },
                                        React.createElement('h3', null, item.icon + ' ' + item.name),
                                        React.createElement('p', null, item.desc)
                                    )
                                )
                            )
                        )
                    )
                ),
                React.createElement('div', { className: 'main-area' },
                    React.createElement('div', { className: 'toolbar' },
                        React.createElement('button', { className: 'toolbar-btn primary', onClick: executeWorkflow }, L.btnExecute),
                        React.createElement('button', { className: 'toolbar-btn', onClick: saveWorkflow }, L.btnSave),
                        React.createElement('button', { className: 'toolbar-btn', onClick: loadWorkflow }, L.btnLoad),
                        React.createElement('button', { className: 'toolbar-btn', onClick: clearAll }, L.btnClear),
                        React.createElement('div', { className: 'lang-switch' },
                            React.createElement('button', { className: 'lang-btn ' + (lang === 'zh' ? 'active' : ''), onClick: () => setLang('zh') }, L.langZH),
                            React.createElement('button', { className: 'lang-btn ' + (lang === 'en' ? 'active' : ''), onClick: () => setLang('en') }, L.langEN)
                        )
                    ),
                    React.createElement('div', { className: 'canvas-container' },
                        React.createElement(ReactFlow, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, onDrop: onDrop, onDragOver: onDragOver, onNodeClick: onNodeClick, nodeTypes: nodeTypes, fitView: true, style: { background: '#1a1a2e' } },
                            React.createElement(Background, { color: '#2a2a4a', gap: 20 }),
                            React.createElement(Controls, { style: { background: '#16213e', border: 'none' } }),
                            React.createElement(MiniMap, { style: { background: '#16213e' } })
                        )
                    ),
                    React.createElement('div', { className: 'status-bar' },
                        React.createElement('div', { className: 'status-indicator' },
                            React.createElement('div', { className: 'status-dot' }),
                            React.createElement('span', null, L.statusReady)
                        ),
                        React.createElement('span', null, nodes.length + ' ' + L.statusNodes + ' | ' + edges.length + ' ' + L.statusConnections)
                    )
                ),
                React.createElement('div', { className: 'preview-panel' },
                    React.createElement('div', { className: 'preview-header' },
                        React.createElement('h2', null, L.previewTitle)
                    ),
                    React.createElement('div', { className: 'preview-content' },
                        previewData 
                            ? React.createElement('pre', { className: 'preview-json' }, JSON.stringify(previewData, null, 2))
                            : React.createElement('div', { style: { color: '#666', textAlign: 'center', marginTop: 40 } },
                                React.createElement('p', null, L.previewEmpty1),
                                React.createElement('p', null, L.previewEmpty2)
                            )
                    )
                ),
                isLoading ? React.createElement('div', { className: 'loading-overlay' },
                    React.createElement('div', { className: 'loading-spinner' }),
                    React.createElement('div', { className: 'loading-text' }, L.loadingText),
                    React.createElement('div', { className: 'loading-status' }, loadingStatus)
                ) : null
            );
        }
        
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
    </script>
</body>
</html>'''

# Find the start of App function (line 614 based on earlier analysis)
# and the end (before </script>)
lines = content.split('\n')

# Find App function start
app_start_line = None
for i, line in enumerate(lines):
    if 'function App()' in line:
        app_start_line = i
        break

# Find where the App function ends (the Render section before </script>)
app_end_line = None
for i, line in enumerate(lines):
    if 'const root = ReactDOM.createRoot' in line:
        app_end_line = i
        break

if app_start_line and app_end_line:
    print(f"App function: lines {app_start_line+1} to {app_end_line+1}")
    
    # Reconstruct the file
    new_lines = lines[:app_start_line] + new_app_return.split('\n')
    content = '\n'.join(new_lines)
    
    with open(r'C:\Users\DELL\.openclaw\workspace\storyflow\web\index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("App function replaced!")
else:
    print(f"Could not find App function boundaries: start={app_start_line}, end={app_end_line}")