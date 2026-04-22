#!/usr/bin/env python3
"""
JSX to React.createElement() converter for StoryFlow
Handles all the patterns in the 4 custom node components
"""

import re

def jsx_to_createelement(jsx_code):
    """
    Convert JSX code to React.createElement() calls
    """
    # Remove the outer return( and );
    # Find the content between return ( and );
    
    # Extract the JSX content inside return()
    match = re.search(r'return\s*\((.*)\);', jsx_code, re.DOTALL)
    if match:
        jsx_content = match.group(1).strip()
    else:
        return jsx_code
    
    # Convert the JSX content
    result = convert_jsx_element(jsx_content, indent=12)
    
    return f'''return (
{result}
    );'''

def convert_jsx_element(jsx, indent=0):
    """
    Recursively convert a JSX element to React.createElement
    """
    jsx = jsx.strip()
    
    # Self-closing tag
    if jsx.endswith('/>'):
        return convert_self_closing_tag(jsx, indent)
    
    # Opening and closing tag
    match = re.match(r'<(\w+)\s*(.*?)>(.*)<\/\1>', jsx, re.DOTALL)
    if match:
        tag_name = match.group(1)
        attrs_str = match.group(2)
        children = match.group(3)
        
        return convert_element_with_children(tag_name, attrs_str, children, indent)
    
    # If no match, return as-is
    return jsx

def convert_self_closing_tag(jsx, indent):
    """Convert a self-closing JSX tag to React.createElement"""
    match = re.match(r'<(\w+)\s*(.*?)\s*/>', jsx)
    if not match:
        return jsx
    
    tag_name = match.group(1)
    attrs_str = match.group(2)
    
    attrs = parse_jsx_attrs(attrs_str)
    
    if attrs:
        return ' ' * indent + f'React.createElement({tag_name}, {attrs})'
    else:
        return ' ' * indent + f'React.createElement({tag_name})'

def convert_element_with_children(tag_name, attrs_str, children, indent):
    """Convert an element with children"""
    attrs = parse_jsx_attrs(attrs_str)
    
    # Convert children
    children_result = convert_children(children, indent + 4)
    
    base = ' ' * indent + f'React.createElement({tag_name}'
    if attrs:
        base += f', {attrs}'
    base += ','
    
    if not children_result.strip():
        return base + '\n' + ' ' * indent + ')'
    
    return base + '\n' + children_result + '\n' + ' ' * indent + ')'

def convert_children(children_text, indent):
    """Convert children content"""
    if not children_text.strip():
        return ''
    
    lines = children_text.split('\n')
    result = []
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        if not line:
            i += 1
            continue
        
        # Check if it's a JSX element
        if line.startswith('<') and not line.startswith('</'):
            # Could be self-closing or opening tag
            if '/>' in line:
                # Self-closing
                result.append(convert_self_closing_tag(line, indent))
            else:
                # Opening tag - need to find the closing tag
                # Find the tag name
                tag_match = re.match(r'<(\w+)', line)
                if tag_match:
                    tag_name = tag_match.group(1)
                    # Find matching close tag
                    close_tag = f'</{tag_name}>'
                    
                    # Collect lines until we find the close tag
                    j = i
                    depth = 1
                    element_lines = [line]
                    while j < len(lines) - 1 and depth > 0:
                        j += 1
                        l = lines[j].strip()
                        element_lines.append(lines[j])
                        if f'<{tag_name}' in l and not l.startswith('</'):
                            depth += 1
                        if close_tag in l:
                            depth -= 1
                    
                    # Join and convert
                    element_str = '\n'.join(element_lines)
                    converted = convert_jsx_element(element_str, indent)
                    result.append(converted)
                    i = j
                    i += 1
                    continue
        elif line.startswith('{') and line.endswith('}'):
            # JSX expression - extract content
            expr = line[1:-1].strip()
            result.append(' ' * indent + expr)
        elif line.startswith('//'):
            # Comment - skip
            pass
        else:
            # Text content
            if line:
                result.append(' ' * indent + f'"{line}"')
        
        i += 1
    
    return '\n'.join(result)

def parse_jsx_attrs(attrs_str):
    """Parse JSX attributes string into a props object literal"""
    if not attrs_str.strip():
        return None
    
    attrs = []
    
    # Match key="value" or key={value} or key={expression}
    pattern = r'(\w+)(?:=(?:"([^"]*)"|\'([^\']*)\'|{([^}]+)}))'
    
    for match in re.finditer(pattern, attrs_str):
        key = match.group(1)
        if match.group(2) is not None:  # double quoted string
            val = f'"{match.group(2)}"'
        elif match.group(3) is not None:  # single quoted string
            val = f'"{match.group(3)}"'
        elif match.group(4) is not None:  # expression in braces
            val = match.group(4)
        else:
            continue
        attrs.append(f'{key}: {val}')
    
    if attrs:
        return '{' + ', '.join(attrs) + '}'
    return None

# Example usage
if __name__ == '__main__':
    # Test with a simple example
    test_jsx = '''<div className="custom-node" style={{ borderColor: '#00d9ff' }}>
    <div className="custom-node-header">
        <span className="custom-node-icon">🌍</span>
    </div>
</div>'''
    
    print("Test conversion:")
    print(convert_jsx_element(test_jsx, 0))