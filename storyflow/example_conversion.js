// JSX to React.createElement conversion examples

// BEFORE (JSX):
function WorldBuildingNode({ data, selected }) {
    const L = i18n[data.lang] || i18n.zh;
    return (
        <div className="custom-node" style={{ borderColor: selected ? '#00d9ff' : '#2a3a5a' }}>
            <div className="custom-node-header">
                <span className="custom-node-icon">🌍</span>
                <span className="custom-node-title">{L.nodeWorldBuilding}</span>
            </div>
            <div className="custom-node-body">
                <Handle type="target" position={Position.Left} style={{background: '#00d9ff'}} />
                {/* ... more content */}
            </div>
        </div>
    );
}

// AFTER (React.createElement):
function WorldBuildingNode({ data, selected }) {
    const L = i18n[data.lang] || i18n.zh;
    return React.createElement('div', {
            className: 'custom-node',
            style: { borderColor: selected ? '#00d9ff' : '#2a3a5a' }
        },
        React.createElement('div', { className: 'custom-node-header' },
            React.createElement('span', { className: 'custom-node-icon' }, '🌍'),
            React.createElement('span', { className: 'custom-node-title' }, L.nodeWorldBuilding)
        ),
        React.createElement('div', { className: 'custom-node-body' },
            React.createElement(Handle, { type: 'target', position: Position.Left, style: { background: '#00d9ff' } })
            // ... more children
        )
    );
}