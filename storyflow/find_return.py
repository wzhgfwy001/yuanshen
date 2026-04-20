#!/usr/bin/env python3
"""
Find the actual return statement of the App function
"""

with open(r'C:\Users\DELL\.openclaw\workspace\storyflow\web\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = ''.join(lines)

# Find the App function and its JSX return
# The JSX return starts with "return (" and contains <div id="app">

in_app = False
app_start = None
app_end = None

for i, line in enumerate(lines):
    if 'function App()' in line:
        app_start = i
        in_app = True
        print(f"Found App at line {i+1}")
    
    if in_app:
        # Find the return ( pattern for JSX
        if 'return (' in line or 'return(' in line:
            # Check if this is the main return by looking for JSX
            if i > app_start + 50:  # Should be after several lines of code
                print(f"Found main return at line {i+1}: {line.strip()[:60]}")
                break