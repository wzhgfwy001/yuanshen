import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = r'C:\Users\DELL\.openclaw\workspace\github-yangshen\SKILL.md'

with open(filepath, 'rb') as f:
    data = f.read()

lines = data.decode('utf-8').split('\n')

# Analyze line 471 (index 470)
line = lines[470]
print(f'Line 471: {line}')

# Find problematic byte sequences - look for invalid UTF-8 continuation bytes
# that represent GBK chars misinterpreted as UTF-8
i = 0
problem_regions = []
while i < len(line):
    code = ord(line[i])
    if code >= 0x80 and code <= 0xBF:
        # This is a continuation byte - it's part of a garbled sequence
        # Find the start
        start = i
        while i < len(line) and ord(line[i]) >= 0x80 and ord(line[i]) <= 0xBF:
            i += 1
        end = i
        print(f'Problem region at {start}-{end}: {repr(line[start:end])} (bytes: {line[start:end].encode("utf-8").hex()})')
        problem_regions.append((start, end, line[start:end]))
    else:
        i += 1

print(f'\nTotal problem regions: {len(problem_regions)}')
