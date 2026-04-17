# -*- coding: utf-8 -*-
"""测试读取原始Excel文件"""
import os
import glob

# 找到原始Excel文件
workspace = r'C:\Users\DELL\.openclaw\workspace'
for f in os.listdir(workspace):
    if f.endswith('.xlsx') and 'data_raw' not in f:
        full_path = os.path.join(workspace, f)
        size = os.path.getsize(full_path)
        if size > 1000000:
            print(f'File: {repr(f)}')
            print(f'Path: {full_path}')
            print(f'Size: {size} bytes')
            
            # 尝试用chardet检测编码
            import zipfile
            with zipfile.ZipFile(full_path, 'r') as z:
                # 读取shared strings
                if 'xl/sharedStrings.xml' in z.namelist():
                    content = z.read('xl/sharedStrings.xml')
                    print(f'\nSharedStrings length: {len(content)}')
                    # Try different encodings
                    for enc in ['utf-8', 'gbk', 'gb2312', 'gb18030']:
                        try:
                            text = content.decode(enc)
                            # Count Chinese chars
                            chinese = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
                            print(f'  {enc}: {len(text)} chars, {chinese} Chinese')
                            if chinese > 100:
                                print(f'  First 200 chars: {text[:200]}')
                                break
                        except:
                            pass
