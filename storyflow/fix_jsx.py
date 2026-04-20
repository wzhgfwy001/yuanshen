with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the inline script opening tag with Babel-enabled one
old = '<script>'
new = '<script type="text/babel" data-presets="react">'
new_content = content.replace(old, new, 1)

if old not in new_content:
    print('Failed to replace')
else:
    print('Successfully added type=text/babel')

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('File saved')