import React from 'react';

function OutputPanel({ execResult }) {
  if (!execResult) return null;

  return (
    <div className="output-panel">
      <div className="output-title">Execution Result</div>
      <div className="output-content">
        {execResult.error
          ? `Error: ${execResult.error}`
          : JSON.stringify(execResult.results, null, 2)
        }
      </div>
    </div>
  );
}

export default OutputPanel;