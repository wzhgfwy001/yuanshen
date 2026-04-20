#!/usr/bin/env python3
"""
JSX to React.createElement() converter
This is a simplified converter that handles basic JSX patterns
"""

import re

def convert_jsx_to_createelement(jsx_code):
    """
    Convert JSX syntax to React.createElement calls
    This is a simplified approach - handles common patterns
    """
    
    # Helper to convert style objects
    def convert_style(style_str):
        """Convert CSS-in-JS object to React style format"""
        style_str = style_str.strip()
        if not style_str:
            return '{}'
        # Convert camelCase to 'camel-case' strings for inline styles
        # For now, just clean up the string
        return style_str
    
    # Convert JSX attributes to createElement props
    def convert_attrs(attrs_str):
        """Convert JSX attributes to createElement props object"""
        if not attrs_str.strip():
            return '{}'
        
        props = {}
        # Match key="value" or key={value} patterns
        key_value_pattern = r'(\w+)(?:=\{"([^"]+)"\}|="([^"]*)"|=\{([^}]+)\})'
        for match in re.finditer(key_value_pattern, attrs_str):
            key = match.group(1)
            if match.group(2):  # ="value"
                props[key] = f'"{match.group(2)}"'
            elif match.group(3):  # ={value}
                props[key] = match.group(4)
            elif match.group(4):  # ={value}
                props[key] = match.group(4)
        return str(props)
    
    # This is a placeholder - actual conversion is complex
    # For now, we'll provide a manual approach
    return jsx_code

# Read the HTML file
with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the JSX script
import re
match = re.search(r'<script type="text/babel"[^>]*>(.*?)</script>', content, re.DOTALL)
if match:
    jsx = match.group(1)
    print(f'Found JSX script: {len(jsx)} chars')
    
    # Find all component functions
    func_pattern = r'(function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*return\s*\()'
    functions = re.findall(func_pattern, jsx)
    print(f'Found {len(functions)} component functions')
    for name, full_match in functions:
        print(f'  - {name}')
else:
    print('JSX script not found')