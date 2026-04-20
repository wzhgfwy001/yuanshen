#!/usr/bin/env python3
"""Check if react-flow.min.js has correct UMD global exports"""

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/react-flow.min.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Check for global assignments
checks = [
    'window.ReactFlow',
    'self.ReactFlow', 
    'globalThis.ReactFlow',
    'this.ReactFlow',
]

print("Checking for global ReactFlow exports:")
for check in checks:
    if check in content:
        print(f"  FOUND: {check}")
    else:
        print(f"  NOT found: {check}")

# Check the UMD pattern
print("\nUMD pattern check:")
if '(this,' in content:
    print("  Found '(this,' pattern - UMD wrapper present")
else:
    print("  NOT found '(this,' pattern")

# Check the factory function call
print("\nFactory function call:")
if 'globalThis' in content or 'globalThis' in content:
    idx = content.find('globalThis')
    print(f"  globalThis context: ...{content[idx-20:idx+50]}...")
