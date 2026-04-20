#!/usr/bin/env python3
"""
Replace JSX components with React.createElement versions in index.html
"""

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the converted React.createElement versions of the 4 components

world_building_node = '''        function WorldBuildingNode({ data, selected }) {
            const L = i18n[data.lang] || i18n.zh;
            return React.createElement('div', { className: 'custom-node', style: { borderColor: selected ? '#00d9ff' : '#2a3a5a' } },
                React.createElement('div', { className: 'custom-node-header' },
                    React.createElement('span', { className: 'custom-node-icon' }, '🌍'),
                    React.createElement('span', { className: 'custom-node-title' }, L.nodeWorldBuilding)
                ),
                React.createElement('div', { className: 'custom-node-body' },
                    React.createElement('div', { className: 'custom-node-inputs' },
                        React.createElement('div', { style: { fontSize: 10, color: '#666', marginBottom: 4 } }, L.labelInput),
                        React.createElement('input', { className: 'input-field', placeholder: L.inputGenre, value: data.genre || '', onChange: (e) => data.onUpdate({ genre: e.target.value }) }),
                        React.createElement('input', { className: 'input-field', placeholder: L.inputTheme, value: data.theme || '', onChange: (e) => data.onUpdate({ theme: e.target.value }) })
                    ),
                    React.createElement('div', { className: 'custom-node-outputs' },
                        React.createElement('div', { style: { fontSize: 10, color: '#666', marginBottom: 4 } }, L.labelOutput),
                        React.createElement('div', { style: { fontSize: 11, color: '#888' } },
                            React.createElement('span', { className: 'port-label' }, '●'), ' world_description',
                            React.createElement('span', { className: 'port-label', style: { marginLeft: 12 } }, '●'), ' magic_system'
                        )
                    ),
                    React.createElement(Handle, { type: 'target', position: Position.Left, style: { background: '#00d9ff' } }),
                    React.createElement(Handle, { type: 'source', position: Position.Right, style: { background: '#00d9ff' } })
                )
            );
        }'''

character_node = '''        function CharacterNode({ data, selected }) {
            const L = i18n[data.lang] || i18n.zh;
            return React.createElement('div', { className: 'custom-node', style: { borderColor: selected ? '#00d9ff' : '#2a3a5a' } },
                React.createElement('div', { className: 'custom-node-header' },
                    React.createElement('span', { className: 'custom-node-icon' }, '👤'),
                    React.createElement('span', { className: 'custom-node-title' }, L.nodeCharacter)
                ),
                React.createElement('div', { className: 'custom-node-body' },
                    React.createElement('div', { className: 'custom-node-inputs' },
                        React.createElement('div', { style: { fontSize: 10, color: '#666', marginBottom: 4 } }, L.labelInput),
                        React.createElement('input', { className: 'input-field', placeholder: L.inputCharType, value: data.character_type || '', onChange: (e) => data.onUpdate({ character_type: e.target.value }) })
                    ),
                    React.createElement('div', { className: 'custom-node-outputs' },
                        React.createElement('div', { style: { fontSize: 10, color: '#666', marginBottom: 4 } }, L.labelOutput),
                        React.createElement('div', { style: { fontSize: 11, color: '#888' } },
                            React.createElement('span', { className: 'port-label' }, '●'), ' character_profile'
                        )
                    ),
                    React.createElement(Handle, { type: 'target', position: Position.Left, style: { background: '#00d9ff' } }),
                    React.createElement(Handle, { type: 'source', position: Position.Right, style: { background: '#00d9ff' } })
                )
            );
        }'''

outline_node = '''        function OutlineNode({ data, selected }) {
            const L = i18n[data.lang] || i18n.zh;
            return React.createElement('div', { className: 'custom-node', style: { borderColor: selected ? '#00d9ff' : '#2a3a5a' } },
                React.createElement('div', { className: 'custom-node-header' },
                    React.createElement('span', { className: 'custom-node-icon' }, '📋'),
                    React.createElement('span', { className: 'custom-node-title' }, L.nodeOutline)
                ),
                React.createElement('div', { className: 'custom-node-body' },
                    React.createElement('div', { className: 'custom-node-inputs' },
                        React.createElement('div', { style: { fontSize: 10, color: '#666', marginBottom: 4 } }, L.labelInput),
                        React.createElement('input', { className: 'input-field', placeholder: L.inputChapterCount, value: data.chapter_count || '', onChange: (e) => data.onUpdate({ chapter_count: e.target.value }) })
                    ),
                    React.createElement('div', { className: 'custom-node-outputs' },
                        React.createElement('div', { style: { fontSize: 10, color: '#666', marginBottom: 4 } }, L.labelOutput),
                        React.createElement('div', { style: { fontSize: 11, color: '#888' } },
                            React.createElement('span', { className: 'port-label' }, '●'), ' outline'
                        )
                    ),
                    React.createElement(Handle, { type: 'target', position: Position.Left, style: { background: '#00d9ff' } }),
                    React.createElement(Handle, { type: 'source', position: Position.Right, style: { background: '#00d9ff' } })
                )
            );
        }'''

chapter_node = '''        function ChapterNode({ data, selected }) {
            const L = i18n[data.lang] || i18n.zh;
            return React.createElement('div', { className: 'custom-node', style: { borderColor: selected ? '#00d9ff' : '#2a3a5a' } },
                React.createElement('div', { className: 'custom-node-header' },
                    React.createElement('span', { className: 'custom-node-icon' }, '📖'),
                    React.createElement('span', { className: 'custom-node-title' }, L.nodeChapter)
                ),
                React.createElement('div', { className: 'custom-node-body' },
                    React.createElement('div', { className: 'custom-node-inputs' },
                        React.createElement('div', { style: { fontSize: 10, color: '#666', marginBottom: 4 } }, L.labelInput),
                        React.createElement('input', { className: 'input-field', placeholder: L.inputChapterTitle, value: data.chapter_title || '', onChange: (e) => data.onUpdate({ chapter_title: e.target.value }) })
                    ),
                    React.createElement('div', { className: 'custom-node-outputs' },
                        React.createElement('div', { style: { fontSize: 10, color: '#666', marginBottom: 4 } }, L.labelOutput),
                        React.createElement('div', { style: { fontSize: 11, color: '#888' } },
                            React.createElement('span', { className: 'port-label' }, '●'), ' chapter_content'
                        )
                    ),
                    React.createElement(Handle, { type: 'target', position: Position.Left, style: { background: '#00d9ff' } }),
                    React.createElement(Handle, { type: 'source', position: Position.Right, style: { background: '#00d9ff' } })
                )
            );
        }'''

# Replace each component using regex
import re

# WorldBuildingNode
pattern = r'function WorldBuildingNode\([^)]*\)\s*\{[^}]*return\s*\((.*?)\);\s*\}'
match = re.search(pattern, content, re.DOTALL)
if match:
    print(f"Found WorldBuildingNode at position {match.start()}")
    content = content[:match.start()] + world_building_node + content[match.end():]
else:
    print("WorldBuildingNode not found")

# CharacterNode
pattern = r'function CharacterNode\([^)]*\)\s*\{[^}]*return\s*\((.*?)\);\s*\}'
match = re.search(pattern, content, re.DOTALL)
if match:
    print(f"Found CharacterNode at position {match.start()}")
    content = content[:match.start()] + character_node + content[match.end():]
else:
    print("CharacterNode not found")

# OutlineNode
pattern = r'function OutlineNode\([^)]*\)\s*\{[^}]*return\s*\((.*?)\);\s*\}'
match = re.search(pattern, content, re.DOTALL)
if match:
    print(f"Found OutlineNode at position {match.start()}")
    content = content[:match.start()] + outline_node + content[match.end():]
else:
    print("OutlineNode not found")

# ChapterNode
pattern = r'function ChapterNode\([^)]*\)\s*\{[^}]*return\s*\((.*?)\);\s*\}'
match = re.search(pattern, content, re.DOTALL)
if match:
    print(f"Found ChapterNode at position {match.start()}")
    content = content[:match.start()] + chapter_node + content[match.end():]
else:
    print("ChapterNode not found")

# Write back
with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done! Components replaced with React.createElement()")