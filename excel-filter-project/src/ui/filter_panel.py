"""
筛选栏优化
支持地域、学校、专业多选，非必选条件
"""
import customtkinter as ctk
from tkinter import messagebox
from typing import Callable, List, Dict, Any


class FilterPanel(ctk.CTkFrame):
    """筛选条件面板"""
    
    def __init__(self, parent, on_filter: Callable):
        super().__init__(parent)
        self.on_filter = on_filter
        
        self.region_vars = {}
        self.school_vars = {}
        self.major_vars = {}
        
        self._create_ui()
    
    def _create_ui(self):
        """创建筛选 UI"""
        self.grid_columnconfigure(0, weight=1)
        
        # 标题
        title = ctk.CTkLabel(
            self,
            text="筛选条件（非必填）",
            font=ctk.CTkFont(size=16, weight="bold")
        )
        title.grid(row=0, column=0, pady=10)
        
        # 地域筛选
        region_frame = ctk.CTkFrame(self)
        region_frame.grid(row=1, column=0, padx=10, pady=5, sticky="ew")
        
        ctk.CTkLabel(
            region_frame,
            text="地域：",
            font=ctk.CTkFont(size=14, weight="bold")
        ).grid(row=0, column=0, padx=5, pady=5)
        
        # 地域复选框
        regions = ["北京", "上海", "江苏", "浙江", "广东", "湖北", "四川", "陕西"]
        region_grid = ctk.CTkFrame(region_frame)
        region_grid.grid(row=1, column=0, columnspan=2)
        
        for i, region in enumerate(regions):
            var = ctk.BooleanVar(value=False)
            self.region_vars[region] = var
            cb = ctk.CTkCheckBox(region_grid, text=region, variable=var)
            cb.grid(row=i//4, column=i%4, padx=5, pady=3)
        
        # 清空地域按钮
        ctk.CTkButton(
            region_frame,
            text="清空地域",
            command=self._clear_regions,
            width=80
        ).grid(row=0, column=1, padx=5)
        
        # 学校搜索
        school_frame = ctk.CTkFrame(self)
        school_frame.grid(row=2, column=0, padx=10, pady=5, sticky="ew")
        
        ctk.CTkLabel(
            school_frame,
            text="学校：",
            font=ctk.CTkFont(size=14, weight="bold")
        ).grid(row=0, column=0, padx=5, pady=5)
        
        self.school_search = ctk.CTkEntry(school_frame, placeholder_text="搜索学校...")
        self.school_search.grid(row=0, column=1, padx=5, pady=5)
        
        ctk.CTkButton(
            school_frame,
            text="🔍",
            command=self._search_school,
            width=40
        ).grid(row=0, column=2, padx=5)
        
        # 已选学校显示
        self.selected_schools_label = ctk.CTkLabel(school_frame, text="已选：无", justify="left")
        self.selected_schools_label.grid(row=1, column=0, columnspan=3, padx=5, pady=5)
        
        # 专业筛选
        major_frame = ctk.CTkFrame(self)
        major_frame.grid(row=3, column=0, padx=10, pady=5, sticky="ew")
        
        ctk.CTkLabel(
            major_frame,
            text="专业：",
            font=ctk.CTkFont(size=14, weight="bold")
        ).grid(row=0, column=0, padx=5, pady=5)
        
        # 专业复选框
        majors = ["计算机", "金融", "医学", "法学", "机械", "电子", "建筑", "文学"]
        major_grid = ctk.CTkFrame(major_frame)
        major_grid.grid(row=1, column=0, columnspan=2)
        
        for i, major in enumerate(majors):
            var = ctk.BooleanVar(value=False)
            self.major_vars[major] = var
            cb = ctk.CTkCheckBox(major_grid, text=major, variable=var)
            cb.grid(row=i//4, column=i%4, padx=5, pady=3)
        
        # 清空专业按钮
        ctk.CTkButton(
            major_frame,
            text="清空专业",
            command=self._clear_majors,
            width=80
        ).grid(row=0, column=1, padx=5)
        
        # 学校层次
        level_frame = ctk.CTkFrame(self)
        level_frame.grid(row=4, column=0, padx=10, pady=5, sticky="ew")
        
        ctk.CTkLabel(level_frame, text="学校层次：").grid(row=0, column=0, padx=5)
        self.level_var = ctk.StringVar(value="全部")
        level_menu = ctk.CTkOptionMenu(
            level_frame,
            variable=self.level_var,
            values=["全部", "985", "211", "双一流", "普通本科"],
            width=150
        )
        level_menu.grid(row=0, column=1, padx=5)
        
        # 匹配类型
        match_frame = ctk.CTkFrame(self)
        match_frame.grid(row=5, column=0, padx=10, pady=5, sticky="ew")
        
        ctk.CTkLabel(
            match_frame,
            text="匹配类型：",
            font=ctk.CTkFont(size=14, weight="bold")
        ).grid(row=0, column=0, padx=5, pady=5)
        
        self.match冲 = ctk.BooleanVar(value=True)
        self.match稳 = ctk.BooleanVar(value=True)
        self.match保 = ctk.BooleanVar(value=True)
        
        ctk.CTkCheckBox(match_frame, text="冲", variable=self.match冲).grid(row=0, column=1, padx=10)
        ctk.CTkCheckBox(match_frame, text="稳", variable=self.match稳).grid(row=0, column=2, padx=10)
        ctk.CTkCheckBox(match_frame, text="保", variable=self.match保).grid(row=0, column=3, padx=10)
        
        # 按钮
        btn_frame = ctk.CTkFrame(self)
        btn_frame.grid(row=6, column=0, padx=10, pady=20)
        
        ctk.CTkButton(
            btn_frame,
            text="开始筛选",
            command=self._apply_filter,
            width=120,
            fg_color="green"
        ).pack(side="left", padx=20)
        
        ctk.CTkButton(
            btn_frame,
            text="重置条件",
            command=self._reset,
            width=120
        ).pack(side="left", padx=20)
    
    def _clear_regions(self):
        """清空地域选择"""
        for var in self.region_vars.values():
            var.set(False)
    
    def _clear_majors(self):
        """清空专业选择"""
        for var in self.major_vars.values():
            var.set(False)
    
    def _search_school(self):
        """搜索学校（待实现）"""
        keyword = self.school_search.get()
        if keyword:
            messagebox.showinfo("搜索", f"搜索学校：{keyword}\n（功能开发中）")
    
    def _apply_filter(self):
        """应用筛选"""
        # 收集筛选条件
        filter_config = {
            "regions": [r for r, var in self.region_vars.items() if var.get()],
            "schools": [],  # 待实现
            "majors": [m for m, var in self.major_vars.items() if var.get()],
            "level": self.level_var.get(),
            "match_types": []
        }
        
        if self.match冲.get():
            filter_config["match_types"].append("冲")
        if self.match稳.get():
            filter_config["match_types"].append("稳")
        if self.match保.get():
            filter_config["match_types"].append("保")
        
        # 调用筛选回调
        if self.on_filter:
            self.on_filter(filter_config)
    
    def _reset(self):
        """重置所有条件"""
        self._clear_regions()
        self._clear_majors()
        self.level_var.set("全部")
        self.match冲.set(True)
        self.match稳.set(True)
        self.match保.set(True)
        self.school_search.delete(0, "end")
        self.selected_schools_label.configure(text="已选：无")


if __name__ == "__main__":
    # 测试
    app = ctk.CTk()
    app.geometry("400x600")
    
    def on_filter(config):
        print(f"筛选条件：{config}")
        messagebox.showinfo("筛选条件", str(config))
    
    panel = FilterPanel(app, on_filter=on_filter)
    panel.pack(fill="both", expand=True, padx=10, pady=10)
    
    app.mainloop()
