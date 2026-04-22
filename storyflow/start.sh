#!/bin/bash
# StoryFlow Startup Script for Linux/Mac

cd "$(dirname "$0")"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Python3 is not installed or not in PATH"
    exit 1
fi

# Set environment
export STORYFLOW_API_KEY=${STORYFLOW_API_KEY:-""}

echo "Starting StoryFlow Web Server..."
python3 -m src.api.web_server
