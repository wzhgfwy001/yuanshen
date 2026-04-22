#!/usr/bin/env python3
"""
JSX to React.createElement() Converter
Handles the StoryFlow component patterns
"""

import re

def convert_jsx_to_createelement(jsx_code):
    """
    Main conversion function
    """
    # Remove the return( and trailing );
    # Convert each JSX element to createElement
    
    lines = jsx_code.split('\n')
    result = []
    in_jsx = False
    jsx_buffer = []
    indent = ''
    
    for line in lines:
        stripped = line.strip()
        
        # Track return statement
        if stripped.startswith('return'):
            in_jsx = True
            # Get indentation
            indent = ' ' * (len(line) - len(line.lstrip()))
            result.append(line)
            continue
        
        if in_jsx:
            # End of JSX block
            if stripped == ');' or stripped == ');' or ');' in stripped:
                # Process buffered JSX
                jsx_content = '\n'.join(jsx_buffer)
                converted = convert_jsx_block(jsx_content, indent)
                result.append(converted)
                result.append(line)  # the closing );
                jsx_buffer = []
                in_jsx = False
                continue
            
            jsx_buffer.append(line)
        else:
            result.append(line)
    
    return '\n'.join(result)

def convert_jsx_block(block, base_indent):
    """
    Convert a JSX block (the content inside return(...)) to createElement calls
    """
    # This is a simplified approach - convert line by line with proper nesting
    
    # First pass: identify top-level elements
    lines = block.split('\n')
    converted_lines = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        if not stripped:
            i += 1
            continue
        
        # Self-closing tag
        if stripped.startswith('<') and '/>' in stripped:
            converted = convert_self_closing_tag(line)
            converted_lines.append(converted)
            i += 1
            continue
        
        # Opening tag (but not self-closing)
        if stripped.startswith('<') and not stripped.startswith('</'):
            # Find the matching closing tag and convert as a block
            tag_name = re.match(r'<(\w+)', stripped).group(1)
            # Simple approach: just convert this line as an opening+content+closing unit
            converted = convert_element_block(line, lines, i, base_indent)
            converted_lines.append(converted[0])
            i = converted[1]
            continue
        
        # Text content
        if stripped and not stripped.startswith('//'):
            # Might be text content or expression
            converted_lines.append(convert_text_content(line, stripped))
            i += 1
            continue
        
        converted_lines.append(line)
        i += 1
    
    return '\n'.join(converted_lines)

def convert_self_closing_tag(line):
    """Convert a self-closing JSX tag to createElement"""
    stripped = line.strip()
    
    # Extract tag name and attributes
    match = re.match(r'<(\w+)\s*(.*?)\s*/>', stripped)
    if not match:
        return line
    
    tag_name = match.group(1)
    attrs_str = match.group(2)
    
    attrs = parse_attributes(attrs_str)
    
    # Get indentation
    indent = ' ' * (len(line) - len(line.lstrip()))
    
    if attrs:
        return indent + f'React.createElement({tag_name}, {attrs})'
    else:
        return indent + f'React.createElement({tag_name})'

def convert_element_block(start_line, all_lines, start_idx, base_indent):
    """Convert an element with potential children"""
    stripped = start_line.strip()
    
    # Get indentation
    indent = ' ' * (len(start_line) - len(start_line.lstrip()))
    
    # Extract tag name and attributes from opening tag
    match = re.match(r'<(\w+)\s*(.*?)>?\s*$', stripped)
    if not match:
        return start_line, start_idx
    
    tag_name = match.group(1)
    attrs_str = match_group(2) if match.lastindex >= 2 else ''
    
    attrs = parse_attributes(attrs_str)
    
    # Find the closing tag
    close_tag = f'</{tag_name}>'
    depth = 1
    i = start_idx + 1
    content_lines = []
    
    while i < len(all_lines) and depth > 0:
        line = all_lines[i]
        line_stripped = line.strip()
        
        if f'<{tag_name}' in line_stripped and not line_stripped.startswith('</'):
            depth += 1
        if close_tag in line_stripped:
            depth -= 1
            if depth == 0:
                break
        content_lines.append(line)
        i += 1
    
    # Convert content
    content = '\n'.join(content_lines[:-1]) if content_lines else ''
    converted_content = convert_jsx_block(content, base_indent) if content else ''
    
    children = ''
    if converted_content:
        # Indent the content properly
        content_lines = converted_content.split('\n')
        indented_content = '\n'.join([base_indent + '        ' + c for c in content_lines])
        children = ',\n' + indented_content
    
    if attrs and attrs != 'null':
        result = indent + f'React.createElement({tag_name}, {attrs}{children})'
    else:
        result = indent + f'React.createElement({tag_name}{children})'
    
    return result, i

def match_group(n):
    """Helper for regex match group"""
    return None

def parse_attributes(attrs_str):
    """Parse JSX attributes into an object string"""
    if not attrs_str or not attrs_str.strip():
        return None
    
    attrs = []
    
    # Match key="value" or key={value}
    pattern = r'(\w+)(?:=(?:"([^"]*)"|\{([^}]+)\}))'
    for match in re.finditer(pattern, attrs_str):
        key = match.group(1)
        if match.group(2):  # double quoted string
            val = f'"{match.group(2)}"'
        elif match.group(3):  # expression in braces
            val = match.group(3)
        else:
            continue
        attrs.append(f'{key}: {val}')
    
    if attrs:
        return '{' + ', '.join(attrs) + '}'
    return None

def convert_text_content(line, stripped):
    """Convert text content"""
    # Get indentation
    indent = ' ' * (len(line) - len(line.lstrip()))
    
    # Check if it's a JSX expression
    if stripped.startswith('{') and stripped.endswith('}'):
        expr = stripped[1:-1]
        return indent + expr
    
    # Plain text - wrap in quotes
    return indent + f'"{stripped}"'

if __name__ == '__main__':
    print("JSX to React.createElement converter")
    print("Usage: This module provides conversion functions")