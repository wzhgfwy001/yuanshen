import React, { useState } from 'react';

const templates = [
  {
    name: 'storyflow 5-Agent',
    description: 'Complete AI novel creation pipeline with market analysis, outline design, chapter writing, 33-dimension audit, and iterative revision.',
    nodes: [
      { id: 'radar', type: 'radar', x: 100, y: 100 },
      { id: 'architect', type: 'architect', x: 350, y: 100 },
      { id: 'writer', type: 'writer', x: 600, y: 100 },
      { id: 'auditor', type: 'audit_33d', x: 850, y: 100 },
      { id: 'reviser', type: 'revise', x: 1100, y: 100 },
    ],
    connections: [
      { from_node: 'radar', from_port: 'story_direction', to_node: 'architect', to_port: 'market_context' },
      { from_node: 'architect', from_port: 'chapter_outline', to_node: 'writer', to_port: 'chapter_outline' },
      { from_node: 'architect', from_port: 'truth_context', to_node: 'writer', to_port: 'truth_context' },
      { from_node: 'writer', from_port: 'chapter_draft', to_node: 'auditor', to_port: 'chapter_draft' },
      { from_node: 'writer', from_port: 'state_update', to_node: 'auditor', to_port: 'truth_files' },
      { from_node: 'auditor', from_port: 'audit_report', to_node: 'reviser', to_port: 'audit_result' },
      { from_node: 'writer', from_port: 'chapter_draft', to_node: 'reviser', to_port: 'draft' },
    ],
    loop_config: { enabled: true, loop_nodes: ['reviser', 'auditor'], max_iterations: 3, exit_condition: 'critical_issues == 0' }
  },
  {
    name: 'Basic Novel Generation',
    description: 'Simple novel creation flow: world building - character creation - chapter writing.',
    nodes: [
      { id: 'world', type: 'world_building', x: 100, y: 150 },
      { id: 'character', type: 'character', x: 400, y: 150 },
      { id: 'chapter', type: 'chapter_generation', x: 700, y: 150 },
    ],
    connections: [
      { from_node: 'world', from_port: 'world_description', to_node: 'character', to_port: 'world_description' },
      { from_node: 'character', from_port: 'character_profile', to_node: 'chapter', to_port: 'character_profile' },
      { from_node: 'world', from_port: 'world_description', to_node: 'chapter', to_port: 'world_description' },
    ]
  }
];

function TemplatesModal({ onClose, onSelect }) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Workflow Templates</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>X</button>
        </div>
        <div className="modal-body">
          {templates.map((t, i) => (
            <div
              key={t.name}
              className={`template-card ${selected === i ? 'selected' : ''}`}
              onClick={() => setSelected(i)}
            >
              <div className="template-name">{t.name}</div>
              <div className="template-desc">{t.description}</div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onSelect(templates[selected]); onClose(); }}>Load Template</button>
        </div>
      </div>
    </div>
  );
}

export default TemplatesModal;