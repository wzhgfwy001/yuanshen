# -*- coding: utf-8 -*-
with open(r'C:\Users\DELL\.openclaw\workspace\storyflow\engine.py', 'rb') as f:
    content = f.read()

# UTF-8 encoded emojis to find and replace
replacements = {
    b'\xf0\x9f\x93\x82': b'[D]',
    b'\xe2\x9c\x85': b'[OK]',
    b'\xe2\x9d\x8c': b'[X]',
    b'\xe2\x9a\xa0': b'[WARN]',
    b'\xf0\x9f\x94\x84': b'[LOOP]',
    b'\xf0\x9f\x93\x8a': b'[STAT]',
    b'\xe2\x9c\xa8': b'[NEW]',
    b'\xf0\x9f\x94\x8d': b'[SEARCH]',
    b'\xf0\x9f\x93\x9d': b'[NOTE]',
    b'\xf0\x9f\x8e\xaf': b'[TARGET]',
    b'\xf0\x9f\x92\xa1': b'[IDEA]',
    b'\xf0\x9f\x94\xa7': b'[FIX]',
    b'\xf0\x9f\x9a\x80': b'[RUN]',
    b'\xf0\x9f\x93\x88': b'[UP]',
    b'\xf0\x9f\x93\x89': b'[DOWN]',
    b'\xf0\x9f\x94\x9a': b'[END]',
    b'\xf0\x9f\x94\x99': b'[BACK]',
}

log_lines = []
for emoji_utf8, replacement in replacements.items():
    if emoji_utf8 in content:
        count = content.count(emoji_utf8)
        content = content.replace(emoji_utf8, replacement)
        log_lines.append('Replaced {} of U+{:04X}'.format(count, int.from_bytes(emoji_utf8[:3], 'big') if len(emoji_utf8) >= 3 else 0))

with open(r'C:\Users\DELL\.openclaw\workspace\storyflow\engine.py', 'wb') as f:
    f.write(content)

with open(r'C:\Users\DELL\.openclaw\workspace\storyflow\_emoji_log.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(log_lines))
    f.write('\nDone!')
