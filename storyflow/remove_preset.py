with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove data-presets="react" from the Babel script
old = '<script type="text/babel" data-presets="react" defer>'
new = '<script type="text/babel" defer>'

if old in content:
    content = content.replace(old, new)
    print('Removed data-presets="react"')
elif '<script type="text/babel"' in content:
    print('Already simplified')
else:
    print('Babel script not found')

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'w', encoding='utf-8') as f:
    f.write(content)