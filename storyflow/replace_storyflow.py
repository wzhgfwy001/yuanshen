#!/usr/bin/env python3
"""
Bulk replace 'storyflow' -> 'storyflow' in storyflow directory
Only processes main storyflow directory (excludes reference/)
"""

import os
import re
import shutil
from pathlib import Path

STORYFLOW_DIR = Path(r'C:\Users\DELL\.openclaw\workspace\storyflow')
EXCLUDE_DIRS = ['reference', '__pycache__', '.git']
EXCLUDE_PATTERNS = ['.pyc']

def should_exclude(path):
    """Check if path should be excluded"""
    path_str = str(path)
    for exclude in EXCLUDE_DIRS:
        if exclude in path_str:
            return True
    for pattern in EXCLUDE_PATTERNS:
        if pattern in path_str:
            return True
    return False

def replace_in_file(filepath):
    """Replace storyflow -> storyflow in a single file"""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Case-insensitive replace
    new_content = re.sub(r'(?i)storyflow', 'storyflow', content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def rename_file(filepath):
    """Rename file if it contains 'storyflow' in the name"""
    filename = filepath.name
    if 'storyflow' in filename.lower():
        new_name = re.sub(r'(?i)storyflow', 'storyflow', filename)
        new_path = filepath.parent / new_name
        
        # Handle case where new name is the same
        if new_path != filepath:
            # If new_path already exists, add suffix
            if new_path.exists():
                stem = new_path.stem
                suffix = new_path.suffix
                counter = 1
                while new_path.exists():
                    new_path = filepath.parent / f"{stem}_{counter}{suffix}"
                    counter += 1
            
            shutil.move(str(filepath), str(new_path))
            return new_path.name
        return None
    return None

def process_directory():
    """Process all files in storyflow directory"""
    changes = []
    renamed = []
    
    for root, dirs, files in os.walk(STORYFLOW_DIR):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if not should_exclude(os.path.join(root, d))]
        
        for filename in files:
            if should_exclude(filename):
                continue
            
            filepath = Path(root) / filename
            
            # First handle renaming
            new_name = rename_file(filepath)
            if new_name:
                renamed.append((filename, new_name))
                filepath = Path(root) / new_name  # Update filepath for content replacement
            
            # Then handle content replacement
            if replace_in_file(filepath):
                changes.append(filename)
    
    return changes, renamed

if __name__ == "__main__":
    print("=" * 60)
    print("StoryFlow Bulk Replace: storyflow -> storyflow")
    print("=" * 60)
    print(f"\nTarget directory: {STORYFLOW_DIR}")
    print(f"Excluding: {EXCLUDE_DIRS}")
    print()
    
    changes, renamed = process_directory()
    
    print("\n[RENAMED FILES]")
    if renamed:
        for old, new in renamed:
            print(f"  {old} -> {new}")
    else:
        print("  (none)")
    
    print("\n[MODIFIED FILES]")
    if changes:
        for f in changes:
            print(f"  {f}")
    else:
        print("  (none)")
    
    print("\n" + "=" * 60)
    print(f"Done! {len(renamed)} files renamed, {len(changes)} files modified")
    print("=" * 60)