import React from 'react';
import { Handle, Position } from 'reactflow';

const colors = {
  agent: '#8b5cf6',
  truth: '#10b981',
  audit: '#f59e0b',
  basic: '#3b82f6'
};

function CustomNode({ data }) {
  const color = colors[data.category] || colors.basic;

  return (
    <div style={{
      background: '#1e293b',
      border: `2px solid ${color}`,
      borderRadius: 8,
      minWidth: 180,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        fontSize: 13,
        fontWeight: 600,
        color: color,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <span>{data.icon || '📦'}</span>
        <span>{data.label}</span>
      </div>
      <div style={{ padding: '8px 14px', fontSize: 11, color: '#94a3b8' }}>
        {data.description || 'Double-click to configure'}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: color, width: 8, height: 8 }}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: color, width: 8, height: 8 }}
      />
    </div>
  );
}

export default CustomNode;