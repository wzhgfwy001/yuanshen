# -*- coding: utf-8 -*-
"""
山东高考志愿填报系统 - 主程序
"""
import tkinter as tk
import subprocess
import sys
import os

class MainLauncher:
    def __init__(self, root):
        self.root = root
        self.root.title("山东高考志愿填报系统")
        self.root.geometry("900x650")
        self.root.configure(bg='#1a1a2e')
        self.root.resizable(True, True)
        self._create_ui()
    
    def _create_ui(self):
        bg = tk.Frame(self.root, bg='#1a1a2e')
        bg.pack(fill='both', expand=True)
        
        tk.Frame(bg, bg='#4CAF50', height=3).pack(fill='x', side='top')
        
        header = tk.Frame(bg, bg='#1a1a2e', pady=40)
        header.pack(fill='x', pady=(30, 20))
        
        tk.Label(header, text="山东高考志愿填报系统", font=("微软雅黑", 32, "bold"), bg='#1a1a2e', fg='white').pack()
        tk.Label(header, text="✦ 硕博教育咨询师专用 ✦", font=("微软雅黑", 14), bg='#1a1a2e', fg='#4CAF50').pack(pady=(10, 0))
        
        tk.Frame(bg, bg='#333', height=1).pack(fill='x', padx=100, pady=30)
        
        btn_container = tk.Frame(bg, bg='#1a1a2e')
        btn_container.pack(fill='x', padx=100, expand=True, pady=30)
        
        # 本科按钮（带阴影）
        benke_shadow = tk.Frame(btn_container, bg='#0d1525')
        benke_shadow.pack(side='left', fill='both', expand=True, padx=(0, 15), ipady=10)
        
        self.benke_btn = tk.Frame(benke_shadow, bg='#1565c0', cursor='hand2')
        self.benke_btn.pack(fill='both', expand=True, padx=3, pady=3)
        
        tk.Label(self.benke_btn, text="🎓", font=("微软雅黑", 65), bg='#1565c0', fg='white').pack(pady=(25, 10))
        tk.Label(self.benke_btn, text="本科", font=("微软雅黑", 26, "bold"), bg='#1565c0', fg='white').pack(pady=(0, 25))
        
        self.benke_btn.bind('<Button-1>', lambda e: self._open_benke())
        self.benke_btn.bind('<Enter>', lambda e: self.benke_btn.config(bg='#1976d2'))
        self.benke_btn.bind('<Leave>', lambda e: self.benke_btn.config(bg='#1565c0'))
        
        # 专科按钮（带阴影）
        zhuanke_shadow = tk.Frame(btn_container, bg='#1a1a2e')
        zhuanke_shadow.pack(side='left', fill='both', expand=True, padx=(15, 0), ipady=10)
        
        self.zhuanke_btn = tk.Frame(zhuanke_shadow, bg='#e65100', cursor='hand2')
        self.zhuanke_btn.pack(fill='both', expand=True, padx=3, pady=3)
        
        tk.Label(self.zhuanke_btn, text="🏛️", font=("微软雅黑", 65), bg='#e65100', fg='white').pack(pady=(25, 10))
        tk.Label(self.zhuanke_btn, text="专科", font=("微软雅黑", 26, "bold"), bg='#e65100', fg='white').pack(pady=(0, 25))
        
        self.zhuanke_btn.bind('<Button-1>', lambda e: self._open_zhuanke())
        self.zhuanke_btn.bind('<Enter>', lambda e: self.zhuanke_btn.config(bg='#ff9800'))
        self.zhuanke_btn.bind('<Leave>', lambda e: self.zhuanke_btn.config(bg='#e65100'))
        
        footer = tk.Frame(bg, bg='#1a1a2e', pady=20)
        footer.pack(fill='x', side='bottom')
        tk.Label(footer, text="© 2025 百年硕博教育咨询师专用系统", font=("微软雅黑", 9), bg='#1a1a2e', fg='#555').pack()
        tk.Frame(bg, bg='#4CAF50', height=3).pack(fill='x', side='bottom')
    
    def _open_benke(self):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        benke_path = os.path.join(script_dir, "main_simple2.py")
        print(f"Opening: {benke_path}")
        subprocess.Popen([sys.executable, benke_path])
    
    def _open_zhuanke(self):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        zhuanke_path = os.path.join(script_dir, "main_zhuanke.py")
        print(f"Opening: {zhuanke_path}")
        subprocess.Popen([sys.executable, zhuanke_path])

if __name__ == "__main__":
    root = tk.Tk()
    app = MainLauncher(root)
    root.mainloop()
