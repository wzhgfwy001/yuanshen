#!/usr/bin/env python3
"""
Manual JSX to createElement converter for StoryFlow
This does a best-effort conversion of the JSX components
"""

import re

def convert_jsx_to_createelement(jsx):
    """
    Convert JSX to React.createElement calls
    This handles the specific patterns in StoryFlow components
    """
    
    # First, let's identify and convert the component functions
    # Pattern: function ComponentName({ props }) { return ( ... ); }
    
    # Convert self-closing tags like <Handle ... />
    jsx = re.sub(
        r'<Handle\s+(.*?)\s*/>',
        lambda m: convert_handle_tag(m.group(1)),
        jsx
    )
    
    # Convert simple tags like <span className="x">text</span>
    # This is complex, so for now let's handle the basic patterns
    
    return jsx

def convert_handle_tag(attrs_str):
    """Convert Handle self-closing tag to React.createElement"""
    props = parse_jsx_attrs(attrs_str)
    return f"React.createElement(Handle, {props})"

def parse_jsx_attrs(attrs_str):
    """Parse JSX attributes string into an object literal"""
    if not attrs_str.strip():
        return 'null'
    
    attrs = []
    # Match key="value" or key={value}
    for match in re.finditer(r'(\w+)(?:=(?:"([^"]*)"|\{([^}]+)\}))', attrs_str):
        key = match.group(1)
        if match.group(2):  # quoted
            val = f'"{match.group(2)}"'
        elif match.group(3):  # expression
            val = match.group(3)
        attrs.append(f'{key}: {val}')
    
    if attrs:
        return '{' + ', '.join(attrs) + '}'
    return 'null'

def convert_element_tag(tag_str):
    """Convert an opening JSX tag to React.createElement call"""
    match = re.match(r'<(\w+)\s*(.*?)\s*>', tag_str)
    if not match:
        return tag_str
    
    tag_name = match.group(1)
    attrs_str = match.group(2)
    props = parse_jsx_attrs(attrs_str)
    
    if props and props != 'null':
        return f"React.createElement({tag_name}, {props}"
    else:
        return f"React.createElement({tag_name}"

# Read the file
with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the JSX script
match = re.search(r'<script type="text/babel"[^>]*>(.*?)</script>', content, re.DOTALL)
if match:
    jsx = match.group(1)
    print(f"Found JSX script: {len(jsx)} chars")
    
    # For a proper conversion, we would need to:
    # 1. Parse the JSX into an AST-like structure
    # 2. Convert each element to createElement calls
    # 3. Handle nested children properly
    
    # This is complex to do correctly with regex
    # Let's suggest a different approach
    print("Full JSX conversion requires a proper parser")
    print("Consider using React.createElement directly or a build tool")
else:
    print("JSX script not found")