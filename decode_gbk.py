# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

filepath = r'C:\Users\DELL\.openclaw\workspace\github-yangshen\SKILL.md'

with open(filepath, 'rb') as f:
    data = f.read()

# Get raw bytes of each line
lines_bytes = data.split(b'\n')

for i in range(469, 474):
    line_bytes = lines_bytes[i]
    print(f'=== Line {i+1} raw bytes ===')
    print(line_bytes.hex())
    print()
