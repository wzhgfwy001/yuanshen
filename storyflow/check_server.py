#!/usr/bin/env python3
import urllib.request

url = 'http://localhost:5001/static/react-flow.min.js'
response = urllib.request.urlopen(url)
content = response.read()
print(f'Server content length: {len(content)} bytes')

# Check local file
with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/react-flow.min.js', 'rb') as f:
    local = f.read()
print(f'Local file length: {len(local)} bytes')
print(f'Files match: {content == local}')

# Try accessing ReactFlow from server
script = f'''
const script = document.createElement('script');
script.src = '{url}';
script.onload = () => console.log('ReactFlow loaded:', typeof ReactFlow);
document.head.appendChild(script);
'''
print(f'\nTrying to load ReactFlow from {url}...')
