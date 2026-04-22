#!/usr/bin/env python3
"""
Fix the App function - properly replace the JSX return with createElement
"""

with open('C:/Users\DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = ''.join(lines)

# Find the line numbers for App function's return
app_return_start = None
app_return_end = None

in_app_function = False
brace_depth = 0
found_return = False
paren_depth = 0

for i, line in enumerate(lines):
    if 'function App()' in line:
        in_app_function = True
        print(f"Found App function at line {i+1}")
    
    if in_app_function:
        if 'return' in line and '(' in line:
            found_return = True
            app_return_start = i
            print(f"Found return at line {i+1}")
        
        if found_return:
            paren_depth += line.count('(') - line.count(')')
            
            # Check if we've closed the return's parentheses
            if paren_depth <= 0 and ';' in line:
                app_return_end = i
                print(f"Return ends at line {i+1}")
                break

print(f"App return: lines {app_return_start+1} to {app_return_end+1}")

# Now let's see what we have
print("\n--- First few lines of return block ---")
for i in range(app_return_start, min(app_return_start+5, len(lines))):
    print(f"{i+1}: {lines[i][:100]}")

print("\n--- Last few lines of return block ---")
for i in range(max(0, app_return_end-3), app_return_end+1):
    print(f"{i+1}: {lines[i][:100]}")