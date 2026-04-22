import React, { useState, useEffect } from 'react';

function ApiKeyModal({ onClose, onSave }) {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('storyflow_api_key');
    if (saved) setApiKey(saved);
  }, []);

  const handleSave = () => {
    localStorage.setItem('storyflow_api_key', apiKey);
    // Also save to server via API call
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey })
    }).then(() => {
      onSave();
    }).catch(console.error);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="api-key-modal" onClick={(e) => e.stopPropagation()}>
        <h3>API Key Configuration</h3>
        <input
          type="password"
          placeholder="Enter your API key..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <div className="api-key-modal-buttons">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default ApiKeyModal;