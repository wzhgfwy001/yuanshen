import React from 'react';
import { ReactFlow } from 'reactflow';
import { Background } from '@reactflow/background';
import { Controls } from '@reactflow/controls';
import { MiniMap } from '@reactflow/minimap';
import CustomNode from './CustomNode.jsx';

const nodeTypes = { custom: CustomNode };

function WorkflowCanvas({ nodes, edges, onNodesChange, onEdgesChange, onConnect, onNodeClick, onPaneClick, onDrop, onDragOver, selectedNode, isRunning }) {
  return (
    <div className="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
      >
        <Background color="#334155" gap={20} />
        <Controls />
        <MiniMap nodeColor={(n) => {
          const colors = { agent: '#8b5cf6', truth: '#10b981', audit: '#f59e0b', basic: '#3b82f6' };
          return colors[n.data.category] || '#3b82f6';
        }} />
      </ReactFlow>

      {isRunning && (
        <div className="exec-status running">
          <div className="spinner"></div>
          <span>Executing workflow...</span>
        </div>
      )}
    </div>
  );
}

export default WorkflowCanvas;