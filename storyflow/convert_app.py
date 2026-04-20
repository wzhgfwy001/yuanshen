#!/usr/bin/env python3
"""
Convert the App component JSX to React.createElement() 
"""

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# The App component's return statement - this is the JSX we need to convert
# It's too complex for a simple regex replacement, so we'll write it directly

app_jsx = '''        function App() {
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
            
            // Get current translations
            const L = i18n[lang];
            
            // Load API key from localStorage
            useEffect(() => {
                const savedKey = localStorage.getItem('storyflow_api_key');
                if (savedKey) setApiKey(savedKey);
            }, []);
            
            // Save language preference
            useEffect(() => {
                localStorage.setItem('storyflow_lang', lang);
            }, [lang]);
            
            // Node palette items
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
            
            // Drag start handler
            const onDragStart = (event, nodeData) => {
                event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
                event.dataTransfer.effectAllowed = 'move';
            };
            
            // Drop handler
            const onDrop = useCallback((event) => {
                event.preventDefault();
                
                const data = event.dataTransfer.getData('application/reactflow');
                if (!data) return;
                
                const { type, icon, name } = JSON.parse(data);
                
                const newNode = {
                    id: type + '_' + Date.now(),
                    type: type,
                    position: { x: event.clientX - 280, y: event.clientY - 60 },
                    data: { 
                        label: name,
                        icon: icon,
                        lang: lang,
                        onUpdate: (updates) => {
                            setNodes(nds => nds.map(n => 
                                n.id === type + '_' + Date.now() 
                                    ? { ...n, data: { ...n.data, ...updates } }
                                    : n
                            ));
                        }
                    }
                };
                
                setNodes(nds => nds.concat(newNode));
            }, [setNodes, lang]);
            
            const onDragOver = useCallback((event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
            }, []);
            
            // Connect nodes
            const onConnect = useCallback((params) => {
                setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#00d9ff' } }, eds));
            }, [setEdges]);
            
            // Node selection
            const onNodeClick = useCallback((event, node) => {
                setSelectedNode(node);
            }, []);
            
            // Execute workflow
            const executeWorkflow = async () => {
                if (!apiKey) {
                    alert(L.alertNoApiKey);
                    return;
                }
                
                if (nodes.length === 0) {
                    alert(L.alertNoNodes);
                    return;
                }
                
                setIsLoading(true);
                setLoadingStatus(L.loadingBuilding);
                
                try {
                    const config = {
                        name: 'StoryFlow Web Workflow',
                        provider: 'minimax',
                        model: 'MiniMax-M2.7',
                        nodes: nodes.map(n => ({
                            id: n.id,
                            type: n.type,
                            inputs: n.data
                        })),
                        connections: edges.map(e => ({
                            from_node: e.source,
                            from_port: 'output',
                            to_node: e.target,
                            to_port: 'input'
                        }))
                    };
                    
                    setLoadingStatus(L.loadingExecuting);
                    
                    const response = await fetch('http://localhost:5001/api/workflow/execute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ config })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        setPreviewData(result.results);
                        setLoadingStatus(L.loadingComplete);
                    } else {
                        alert(L.alertExecuteError + result.error);
                        setLoadingStatus(L.loadingFailed);
                    }
                } catch (error) {
                    alert(L.alertRequestError + error.message);
                    setLoadingStatus(L.loadingFailed);
                } finally {
                    setIsLoading(false);
                }
            };
            
            // Save workflow
            const saveWorkflow = async () => {
                const config = {
                    nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })),
                    edges: edges.map(e => ({ source: e.source, target: e.target }))
                };
                
                try {
                    const response = await fetch('http://localhost:5001/api/workflow/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ config })
                    });
                    
                    if (response.ok) {
                        alert(L.alertSaveSuccess);
                    }
                } catch (error) {
                    localStorage.setItem('storyflow_workflow', JSON.stringify({ nodes, edges }));
                    alert(L.alertSaveLocal);
                }
            };
            
            // Load workflow
            const loadWorkflow = async () => {
                try {
                    const response = await fetch('http://localhost:5001/api/workflow/load');
                    const result = await response.json();
                    
                    if (result.success) {
                        const { nodes: loadedNodes, edges: loadedEdges } = result.config;
                        if (loadedNodes) {
                            setNodes(loadedNodes.map(n => ({
                                ...n,
                                data: { 
                                    ...n.data,
                                    lang: lang,
                                    onUpdate: (updates) => {
                                        setNodes(nds => nds.map(nd => 
                                            nd.id === n.id ? { ...nd, data: { ...nd.data, ...updates } } : nd
                                        ));
                                    }
                                }
                            })));
                        }
                        if (loadedEdges) {
                            setEdges(loadedEdges.map(e => ({
                                ...e,
                                animated: true,
                                style: { stroke: '#00d9ff' }
                            })));
                        }
                    }
                } catch (error) {
                    const saved = localStorage.getItem('storyflow_workflow');
                    if (saved) {
                        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(saved);
                        setNodes(savedNodes);
                        setEdges(savedEdges);
                    }
                }
            };
            
            // Clear all
            const clearAll = () => {
                setNodes([]);
                setEdges([]);
                setPreviewData(null);
                setSelectedNode(null);
            };
            
            return React.createElement('div', { id: 'app' },
                // Left Sidebar
                React.createElement('div', { className: 'sidebar' },
                    React.createElement('div', { className: 'sidebar-header' },
                        React.createElement('h1', null, L.appTitle),
                        React.createElement('p', null, L.appSubtitle)
                    ),
                    React.createElement('div', { className: 'node-palette' },
                        React.createElement('div', { style: { marginBottom: 12 } },
                            React.createElement('input', { 
                                className: 'input-field', 
                                placeholder: L.apiKeyPlaceholder, 
                                type: 'password',
                                value: apiKey,
                                onChange: (e) => {
                                    setApiKey(e.target.value);
                                    localStorage.setItem('storyflow_api_key', e.target.value);
                                },
                                style: { marginBottom: 8 }
                            })
                        ),
                        nodePalette.map((category, idx) =>
                            React.createElement('div', { key: idx, className: 'node-category' },
                                React.createElement('div', { className: 'node-category-title' }, category.category),
                                category.items.map((item, i) =>
                                    React.createElement('div', {
                                        key: i,
                                        className: 'node-item',
                                        draggable: true,
                                        onDragStart: (e) => onDragStart(e, item)
                                    },
                                        React.createElement('h3', null, item.icon + ' ' + item.name),
                                        React.createElement('p', null, item.desc)
                                    )
                                )
                            )
                        )
                    )
                ),
                // Main Canvas
                React.createElement('div', { className: 'main-area' },
                    React.createElement('div', { className: 'toolbar' },
                        React.createElement('button', { 
                            className: 'toolbar-btn primary', 
                            onClick: executeWorkflow
                        }, L.btnExecute),
                        React.createElement('button', { className: 'toolbar-btn', onClick: saveWorkflow }, L.btnSave),
                        React.createElement('button', { className: 'toolbar-btn', onClick: loadWorkflow }, L.btnLoad),
                        React.createElement('button', { className: 'toolbar-btn', onClick: clearAll }, L.btnClear),
                        // Language Switcher
                        React.createElement('div', { className: 'lang-switch' },
                            React.createElement('button', { 
                                className: 'lang-btn ' + (lang === 'zh' ? 'active' : ''),
                                onClick: () => setLang('zh')
                            }, L.langZH),
                            React.createElement('button', { 
                                className: 'lang-btn ' + (lang === 'en' ? 'active' : ''),
                                onClick: () => setLang('en')
                            }, L.langEN)
                        )
                    ),
                    React.createElement('div', { className: 'canvas-container' },
                        React.createElement(ReactFlow, {
                            nodes: nodes,
                            edges: edges,
                            onNodesChange: onNodesChange,
                            onEdgesChange: onEdgesChange,
                            onConnect: onConnect,
                            onDrop: onDrop,
                            onDragOver: onDragOver,
                            onNodeClick: onNodeClick,
                            nodeTypes: nodeTypes,
                            fitView: true,
                            style: { background: '#1a1a2e' }
                        },
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
                // Right Preview Panel
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
                // Loading Overlay
                isLoading && React.createElement('div', { className: 'loading-overlay' },
                    React.createElement('div', { className: 'loading-spinner' }),
                    React.createElement('div', { className: 'loading-text' }, L.loadingText),
                    React.createElement('div', { className: 'loading-status' }, loadingStatus)
                )
            );
        }
        
        // Render
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
'''

# Find and replace the App function in the content
import re

# Find the App function
app_pattern = r'function App\(\)\s*\{.*?// Render\s*const root = ReactDOM\.createRoot\(document\.getElementById\(\'root\'\)\);\s*root\.render\(React\.createElement\(App\)\);\s*\}\s*</script>'
match = re.search(app_pattern, content, re.DOTALL)

if match:
    print(f"Found App function at position {match.start()}")
    content = content[:match.start()] + app_jsx + '\n    </script>\n</body>\n</html>'
    print("Replaced App function")
else:
    print("App function not found - trying alternative approach")
    # Try to find just the return statement part
    return_pattern = r'return\s*\(\s*<div id="app">.*?</div>\s*\);\s*\}\s*// Render'
    match = re.search(return_pattern, content, re.DOTALL)
    if match:
        print(f"Found return statement at {match.start()}-{match.end()}")

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")