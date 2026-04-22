# StoryFlow Demo

## Basic Novel Workflow

A simple 3-node workflow for novel creation:

```
WorldBuilding → Character → Chapter
```

## 5-Agent Workflow

The full storyflow pipeline with quality assurance:

```
Radar → Architect → Writer → Auditor → Reviser
              ↑_____________↓ (loop)
```

## Running a Demo

1. Start the web server: `python -m src.api.web_server`
2. Open http://localhost:5001
3. Select a template from the dropdown
4. Click "Execute Workflow"
5. View results in the output panel

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/nodes` | GET | List all available nodes |
| `/api/storyflow/templates` | GET | Get workflow templates |
| `/api/workflow/execute` | POST | Execute a workflow |
| `/api/workflow/load` | GET | Load workflow config |
| `/api/workflow/save` | POST | Save workflow config |
| `/api/config` | GET | Get server config |
