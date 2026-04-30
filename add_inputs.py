import os

os.chdir('C:/Users/DELL/.openclaw/workspace/storyflow/web/assets')
with open('index-DBUehojj.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find the xE function and understand its structure
# We need to add world_building, character, chapter_generation input fields

# The pattern for existing node types is:
# e.data.type==="radar" && O.jsxs(O.Fragment,{children:[...fields...]})

# We need to add similar blocks for:
# - world_building (needs topic field)
# - character (needs character_name, role fields)
# - chapter_generation (needs chapter_number, target_words fields)
# And a GENERIC inputs section for any node type

# Find the position after writer section to add new sections
# Look for the pattern after writer section ends

# Let's find where the specific node type checks end and add a generic section
search = 'e.data.type==="writer"'
idx = content.find(search)
if idx >= 0:
    # Find the end of this block - look for }),e.data.type pattern
    # We want to add our new sections before the closing of the e? condition
    
    # Find the next e.data.type== after writer
    search2 = 'e.data.type==="architect"'
    idx2 = content.find(search2)
    print(f'writer at {idx}, architect at {idx2}')
    
    # Find where these blocks end
    # Look for pattern that comes after writer section
    start = idx
    # Find the end of the O.Fragment that contains writer
    depth = 0
    found_start = False
    for i in range(idx, len(content)):
        c = content[i]
        if c == '{':
            depth += 1
            found_start = True
        elif c == '}':
            depth -= 1
            if found_start and depth == 0:
                print(f'writer block ends at position {i}')
                break
    
    # Show context around end of writer block
    with open('writer_block_end.txt', 'w', encoding='utf-8') as out:
        out.write(content[i:i+200])
    print('Wrote writer_block_end.txt')
else:
    print('writer not found')