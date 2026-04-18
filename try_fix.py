# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

filepath = r'C:\Users\DELL\.openclaw\workspace\github-yangshen\SKILL.md'

with open(filepath, 'rb') as f:
    data = f.read()

lines_bytes = data.split(b'\n')

# The garbled lines are at index 470, 471, 472, 473 (0-indexed)
# Line 470: v1.3
# Line 471: v1.3.1
# Line 472: v1.6
# Line 473: v1.7

# Strategy: For each line, find the non-ASCII bytes (those >= 0x80)
# These are the garbled GBK->UTF-8 chars. 
# But the file is MIXED - ASCII/Latin parts are correct UTF-8, 
# while Chinese parts are actually GBK bytes masquerading as UTF-8.
# 
# Actually, the file appears to have been saved with UTF-8 encoding,
# but the Chinese parts were GBK bytes at the time of writing.
# So every Chinese char (which appears as 2 consecutive bytes >= 0x80 in the raw file)
# should be interpreted as GBK, not UTF-8.

# Let me look at the actual Chinese portions
for idx in [470, 471, 472, 473]:
    line = lines_bytes[idx]
    print(f'\n=== Line {idx+1} ===')
    print('Raw hex:', line.hex())
    
    # Find all non-ASCII bytes
    non_ascii = [(i, b) for i, b in enumerate(line) if b >= 0x80]
    print(f'Non-ASCII bytes: {len(non_ascii)}')
    
    # Group into pairs for GBK
    pairs = []
    i = 0
    while i < len(non_ascii):
        if i + 1 < len(non_ascii):
            # Two consecutive non-ASCII bytes could be a GBK char
            pairs.append((non_ascii[i][1], non_ascii[i+1][1]))
        i += 2
    
    # Try to decode pairs as GBK
    try:
        gbk_bytes = bytes([b for pair in pairs for b in pair])
        decoded = gbk_bytes.decode('gbk')
        print(f'GBK decoded: {decoded}')
    except Exception as e:
        print(f'GBK decode failed: {e}')
