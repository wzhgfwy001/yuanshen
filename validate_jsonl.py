# -*- coding: utf-8 -*-
import json

# Validate JSON Lines format
with open(r'C:\Users\DELL\.openclaw\workspace\cloudbase_data\benke.jsonl', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print('Total lines:', len(lines))

# Check each line is valid JSON
valid = 0
invalid = 0
for i, line in enumerate(lines[:5]):
    try:
        obj = json.loads(line.strip())
        valid += 1
        name = obj.get('school_name', 'N/A')
        print('Line %d: VALID JSON, school_name=%s...' % (i+1, name[:20]))
    except Exception as e:
        invalid += 1
        print('Line %d: INVALID - %s' % (i+1, e))
        print('  Content:', line[:100])

print('\nValid: %d, Invalid: %d' % (valid, invalid))

# Check last line
print('\nLast line check:')
last_line = lines[-1].strip()
print('Last line length:', len(last_line))
print('Last line preview:', last_line[:100])
