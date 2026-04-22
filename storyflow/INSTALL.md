# StoryFlow Installation Guide

## Prerequisites

- Python 3.10+
- API Key (MiniMax, Tongyi, or OpenAI)

## Installation Methods

### Method 1: Clone & Install

```bash
git clone <repository-url>
cd storyflow
pip install -e .
```

### Method 2: Docker

```bash
docker-compose up
```

### Method 3: Manual

```bash
pip install -r requirements.txt
```

## Configuration

Create `config/local.yaml` or set environment variables:

| Variable | Description |
|----------|-------------|
| STORYFLOW_API_KEY | Primary API key |
| MINIMAX_API_KEY | MiniMax API key |
| DASHSCOPE_API_KEY | Tongyi API key |

## Verify Installation

```bash
python -c "import src; print(src.__version__)"
pytest tests/test_basic.py
```
