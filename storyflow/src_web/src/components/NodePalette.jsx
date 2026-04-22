import React from 'react';

const nodeItems = [
  { category: 'storyflow Agents', items: [
    { type: 'agent', icon: '🎯', label: 'Radar', nodeType: 'radar' },
    { type: 'agent', icon: '🏛️', label: 'Architect', nodeType: 'architect' },
    { type: 'agent', icon: '✍️', label: 'Writer', nodeType: 'writer' },
    { type: 'audit', icon: '🔍', label: 'Audit 33D', nodeType: 'audit_33d' },
    { type: 'audit', icon: '🔧', label: 'Reviser', nodeType: 'revise' },
  ]},
  { category: 'Truth Files', items: [
    { type: 'truth', icon: '📍', label: 'Current State', nodeType: 'current_state' },
    { type: 'truth', icon: '👥', label: 'Character Matrix', nodeType: 'character_matrix' },
    { type: 'truth', icon: '🎣', label: 'Pending Hooks', nodeType: 'pending_hooks' },
  ]},
  { category: 'Basic Nodes', items: [
    { type: 'basic', icon: '🌍', label: 'World Building', nodeType: 'world_building' },
    { type: 'basic', icon: '👤', label: 'Character', nodeType: 'character' },
    { type: 'basic', icon: '📖', label: 'Chapter', nodeType: 'chapter_generation' },
  ]},
];

function NodePalette() {
  const onDragStart = (event, nodeData) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <div className="sidebar-tab active">Nodes</div>
      </div>
      <div className="sidebar-content">
        {nodeItems.map((group) => (
          <div className="node-category" key={group.category}>
            <div className="category-title">{group.category}</div>
            {group.items.map((item) => (
              <div
                key={item.nodeType}
                className={`node-item ${item.type}`}
                draggable
                onDragStart={(e) => onDragStart(e, { type: item.nodeType, icon: item.icon, label: item.label, category: item.type })}
              >
                <span className="node-icon">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default NodePalette;