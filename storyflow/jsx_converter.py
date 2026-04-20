#!/usr/bin/env python3
"""
JSX to React.createElement() Converter for StoryFlow
This converts the 4 custom node components to React.createElement() syntax
"""

import re

def jsx_to_createelement(jsx_content):
    """
    Convert JSX content to React.createElement() calls
    Handles the basic patterns in the StoryFlow components
    """
    
    lines = jsx_content.split('\n')
    result = []
    indent_level = 0
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Skip empty lines at start of block
        if not line.strip() and indent_level == 0:
            i += 1
            continue
        
        # Track indentation
        stripped = line.strip()
        if stripped.startswith('return') or stripped.startswith('function') or stripped.startswith('const'):
            result.append(line)
            i += 1
            continue
        
        if not stripped:
            result.append(line)
            i += 1
            continue
        
        # Handle JSX tags
        if '<' in line and not stripped.startswith('//') and not stripped.startswith('/*'):
            # Count angle brackets
            open_count = line.count('<') - line.count('</')
            close_count = line.count('/>') + line.count('</')
            
            # Simple self-closing tag
            if stripped.endswith('/>') and not '</' in stripped:
                # Self-closing JSX tag
                converted = convert_self_closing_tag(stripped)
                indent = len(line) - len(line.lstrip())
                result.append(' ' * indent + converted)
            elif '</' in stripped:
                # Opening and closing tag on same line or multi-line
                # For simplicity, we'll handle basic patterns
                converted = convert_jsx_line(stripped)
                indent = len(line) - len(line.lstrip())
                result.append(' ' * indent + converted)
            else:
                # Multi-line tag opening
                converted = convert_jsx_line(stripped)
                indent = len(line) - len(line.lstrip())
                result.append(' ' * indent + converted)
        else:
            result.append(line)
        
        i += 1
    
    return '\n'.join(result)

def convert_self_closing_tag(tag):
    """Convert self-closing JSX tag to React.createElement"""
    # Pattern: <TagName attr1="val1" attr2={val2} />
    match = re.match(r'<(\w+)\s*(.*?)\s*/>', tag)
    if not match:
        return tag
    
    tag_name = match.group(1)
    attrs_str = match.group(2)
    
    props = parse_attributes(attrs_str)
    
    if props:
        return f'React.createElement({tag_name}, {props})'
    else:
        return f'React.createElement({tag_name})'

def convert_jsx_line(line):
    """Convert a JSX line to React.createElement"""
    # Handle multi-line JSX - simplify for now
    # This is a basic converter
    
    # Remove trailing /> or >
    if line.endswith('/>'):
        # Self-closing tag
        tag_content = line[:-2].strip()
        match = re.match(r'<(\w+)\s*(.*)', tag_content)
        if match:
            tag_name = match.group(1)
            attrs_str = match.group(2)
            props = parse_attributes(attrs_str)
            if props:
                return f'React.createElement({tag_name}, {props})'
            else:
                return f'React.createElement({tag_name})'
    elif line.endswith('>'):
        # Opening tag - convert the tag part
        tag_content = line[:-1].strip()
        if '</' in tag_content:
            # Mixed content like <div>text</div>
            pass
        else:
            match = re.match(r'<(\w+)\s*(.*)', tag_content)
            if match:
                tag_name = match.group(1)
                attrs_str = match.group(2)
                props = parse_attributes(attrs_str)
                if props:
                    return f'React.createElement({tag_name}, {props}'
                else:
                    return f'React.createElement({tag_name}'
    
    return line

def parse_attributes(attrs_str):
    """Parse JSX attributes into a props object string"""
    if not attrs_str.strip():
        return None
    
    props = []
    
    # Match various attribute patterns
    # key="value" or key={value} or key={expression}
    attr_pattern = r'(\w+)(?:=(?:"([^"]*)"|\'([^\']*)\'|{([^}]+)}))'
    
    for match in re.finditer(attr_pattern, attrs_str):
        key = match.group(1)
        if match.group(2):  # double quoted
            val = f'"{match.group(2)}"'
        elif match.group(3):  # single quoted
            val = f'"{match.group(3)}"'
        elif match.group(4):  # curly brace
            val = match.group(4)
        else:
            continue
        props.append(f'{key}: {val}')
    
    if props:
        return '{' + ', '.join(props) + '}'
    return None

if __name__ == '__main__':
    print("JSX to React.createElement converter")
    print("This script is a helper for manual conversion")
    print("The actual conversion should be done carefully for each component")