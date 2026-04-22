import React from 'react';

function Header({ workflowType, setWorkflowType, apiKeySet, onOpenApiKey, onOpenTemplates, onClear, onExecute, isRunning }) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">StoryFlow</div>
        <div className="workflow-type">
          <button
            className={workflowType === 'basic' ? 'active' : ''}
            onClick={() => setWorkflowType('basic')}
          >
            Basic
          </button>
          <button
            className={workflowType === 'storyflow' ? 'active' : ''}
            onClick={() => setWorkflowType('storyflow')}
          >
            storyflow 5-Agent
          </button>
        </div>
      </div>
      <div className="header-right">
        <span className={`api-status ${apiKeySet ? 'set' : 'not-set'}`} onClick={onOpenApiKey} style={{ cursor: 'pointer' }}>
          {apiKeySet ? 'API Key Set' : 'No API Key'}
        </span>
        <button className="btn btn-secondary" onClick={onOpenTemplates}>
          Templates
        </button>
        <button className="btn btn-secondary" onClick={onClear}>
          Clear
        </button>
        <button className="btn btn-primary" onClick={onExecute} disabled={isRunning}>
          {isRunning ? 'Running...' : 'Execute'}
        </button>
      </div>
    </header>
  );
}

export default Header;