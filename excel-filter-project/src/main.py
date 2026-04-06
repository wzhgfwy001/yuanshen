# Excel 筛选查找器 - 主程序
# 版本：v1.0
# 开发时间：2026-04-04

import sys
import customtkinter as ctk
from tkinter import filedialog, messagebox
import pandas as pd
from pathlib import Path
import json
from datetime import datetime

# 导入自定义模块
from .models import Student, School, Major, MatchResult
from .services import DataService, FilterService
from .ui.main_window import MainWindow


class ExcelFilterApp:
    """Excel 筛选查找器主应用类"""
    
    def __init__(self):
        """初始化应用"""
        self.root = ctk.CTk()
        self.root.title("Excel 筛选查找器 v1.0")
        self.root.geometry("1200x800")
        
        # 设置主题
        ctk.set_appearance_mode("system")
        ctk.set_default_color_theme("blue")
        
        # 初始化服务
        self.data_service = DataService()
        self.filter_service = FilterService(self.data_service)
        
        # 当前学生
        self.current_student = None
        
        # 创建主窗口
        self.main_window = MainWindow(
            self.root, 
            self.data_service, 
            self.filter_service,
            self
        )
        
    def run(self):
        """运行应用"""
        self.root.mainloop()
    
    def load_student(self, student: Student):
        """加载学生信息"""
        self.current_student = student
        self.main_window.update_student_info(student)
    
    def refresh_results(self, results):
        """刷新结果列表"""
        self.main_window.update_results(results)


def main():
    """主函数"""
    app = ExcelFilterApp()
    app.run()


if __name__ == "__main__":
    main()
