import React from 'react';

function PropertiesPanel({ selectedNode, workflowType, loopConfig, setLoopConfig, updateNodeInput, deleteNode, children }) {
  return (
    <aside className="properties">
      <div className="properties-header">
        {selectedNode ? 'Node Properties' : 'Properties'}
      </div>
      <div className="properties-content">
        {selectedNode ? (
          <>
            <div className="prop-group">
              <div className="prop-label">Node Type</div>
              <input className="prop-input" value={selectedNode.data.label} disabled />
            </div>

            {selectedNode.data.type === 'radar' && (
              <>
                <div className="prop-group">
                  <div className="prop-label">Genre (题材)</div>
                  <input
                    className="prop-input"
                    placeholder="e.g., 玄幻, 都市"
                    onChange={(e) => updateNodeInput('genre', e.target.value)}
                  />
                </div>
                <div className="prop-group">
                  <div className="prop-label">Platform (平台)</div>
                  <input
                    className="prop-input"
                    placeholder="e.g., 起点, 晋江"
                    onChange={(e) => updateNodeInput('platform', e.target.value)}
                  />
                </div>
              </>
            )}

            {selectedNode.data.type === 'architect' && (
              <>
                <div className="prop-group">
                  <div className="prop-label">Chapter Number</div>
                  <input
                    className="prop-input"
                    type="number"
                    defaultValue={1}
                    onChange={(e) => updateNodeInput('chapter_number', parseInt(e.target.value))}
                  />
                </div>
                <div className="prop-group">
                  <div className="prop-label">Target Words</div>
                  <input
                    className="prop-input"
                    type="number"
                    defaultValue={3000}
                    onChange={(e) => updateNodeInput('target_words', parseInt(e.target.value))}
                  />
                </div>
              </>
            )}

            {selectedNode.data.type === 'writer' && (
              <>
                <div className="prop-group">
                  <div className="prop-label">Writing Style</div>
                  <select className="prop-input" onChange={(e) => updateNodeInput('style', e.target.value)}>
                    <option value="immersive">沉浸式</option>
                    <option value="fast-paced">快节奏</option>
                    <option value="lyrical">抒情诗</option>
                  </select>
                </div>
                <div className="prop-group">
                  <div className="prop-label">Pacing</div>
                  <select className="prop-input" onChange={(e) => updateNodeInput('pacing', e.target.value)}>
                    <option value="balanced">平衡</option>
                    <option value="fast">快节奏</option>
                    <option value="slow">慢节奏</option>
                  </select>
                </div>
              </>
            )}

            {selectedNode.data.type === 'audit_33d' && (
              <div className="prop-group">
                <div className="prop-label">Strict Mode</div>
                <select className="prop-input" onChange={(e) => updateNodeInput('strict_mode', e.target.value === 'true')}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            )}

            {workflowType === 'storyflow' && (
              <div className="loop-config">
                <div className="loop-config-title">Loop Configuration</div>
                <div className="loop-config-row">
                  <input
                    type="checkbox"
                    id="loopEnabled"
                    checked={loopConfig.enabled}
                    onChange={(e) => setLoopConfig({ ...loopConfig, enabled: e.target.checked })}
                  />
                  <label htmlFor="loopEnabled">Enable Revision Loop</label>
                </div>
                <div className="loop-config-row">
                  <label>Max Iterations:</label>
                  <input
                    type="number"
                    className="prop-input"
                    style={{ width: 60 }}
                    value={loopConfig.maxIterations}
                    onChange={(e) => setLoopConfig({ ...loopConfig, maxIterations: parseInt(e.target.value) })}
                  />
                </div>
                <div className="loop-config-row">
                  <label style={{ fontSize: 11 }}>Exit: critical_issues == 0</label>
                </div>
              </div>
            )}

            <button
              className="btn btn-secondary"
              style={{ marginTop: 16, width: '100%', color: '#ef4444' }}
              onClick={deleteNode}
            >
              Delete Node
            </button>
          </>
        ) : (
          <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>
            Click a node to edit its properties
          </div>
        )}

        {children}
      </div>
    </aside>
  );
}

export default PropertiesPanel;