"""
筛选栏优化
支持地域、学校、专业多选，非必选条件
"""
import customtkinter as ctk
from tkinter import messagebox
from typing import Callable, List, Dict, Any


class FilterPanel(ctk.CTkFrame):
    """筛选条件面板"""
    
    def __init__(self, parent, on_filter: Callable, data_service=None):
        super().__init__(parent)
        self.on_filter = on_filter
        self.data_service = data_service
        
        self.region_vars = {}
        self.school_vars = {}
        self.major_vars = {}
        self.selected_schools = []  # 已选学校列表
        
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
        self.school_search.bind('<KeyRelease>', self._on_school_search_change)
        
        ctk.CTkButton(
            school_frame,
            text="🔍",
            command=self._search_school,
            width=40
        ).grid(row=0, column=2, padx=5)
        
        # 学校搜索结果下拉框
        self.school_results_frame = ctk.CTkFrame(school_frame, fg_color="white", height=100)
        self.school_results_frame.grid(row=1, column=0, columnspan=3, sticky="ew", padx=5, pady=(0, 5))
        self.school_results_frame.grid_remove()  # 初始隐藏
        
        # 已选学校显示
        self.selected_schools_frame = ctk.CTkFrame(school_frame)
        self.selected_schools_frame.grid(row=2, column=0, columnspan=3, sticky="ew", padx=5, pady=5)
        
        ctk.CTkLabel(
            self.selected_schools_frame,
            text="已选学校：",
            font=ctk.CTkFont(size=12)
        ).grid(row=0, column=0, padx=5, sticky="w")
        
        self.selected_schools_container = ctk.CTkFrame(self.selected_schools_frame, fg_color="transparent")
        self.selected_schools_container.grid(row=1, column=0, columnspan=3, sticky="w", padx=5, pady=5)
        
        self._update_selected_schools_display()
        
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
    
    def _on_school_search_change(self, event=None):
        """学校搜索框内容变化时触发"""
        keyword = self.school_search.get()
        if not keyword or len(keyword) < 1:
            self.school_results_frame.grid_remove()
            return
        
        if self.data_service:
            results = self.data_service.search_schools(keyword)
            self._show_school_results(results)
        else:
            # 如果没有数据服务，显示模拟结果
            mock_results = [
                {'school_id': '1', 'school_name': f'{keyword}大学', 'province': '北京', 'level': '985'},
                {'school_id': '2', 'school_name': f'{keyword}科技大学', 'province': '上海', 'level': '211'},
                {'school_id': '3', 'school_name': f'{keyword}师范大学', 'province': '江苏', 'level': '双一流'},
            ]
            self._show_school_results(mock_results)
    
    def _show_school_results(self, results):
        """显示学校搜索结果"""
        # 清空现有结果
        for widget in self.school_results_frame.winfo_children():
            widget.destroy()
        
        if not results:
            ctk.CTkLabel(
                self.school_results_frame,
                text="未找到匹配的学校",
                text_color="gray",
                font=ctk.CTkFont(size=12)
            ).pack(padx=10, pady=10)
            self.school_results_frame.grid()
            return
        
        # 显示结果
        for i, school in enumerate(results[:5]):  # 最多显示5个
            school_text = f"{school.get('school_name', '')}"
            if school.get('province') or school.get('level'):
                school_text += f" ({school.get('province', '')}·{school.get('level', '')})"
            
            btn = ctk.CTkButton(
                self.school_results_frame,
                text=school_text,
                command=lambda s=school: self._select_school(s),
                fg_color="transparent",
                hover_color="#f1f5f9",
                text_color="black",
                anchor="w",
                height=30
            )
            btn.pack(fill="x", padx=5, pady=2)
        
        self.school_results_frame.grid()
    
    def _select_school(self, school):
        """选择学校"""
        school_name = school.get('school_name', '')
        if school_name and school_name not in self.selected_schools:
            self.selected_schools.append(school_name)
            self._update_selected_schools_display()
        
        # 清空搜索框和结果
        self.school_search.delete(0, "end")
        self.school_results_frame.grid_remove()
    
    def _update_selected_schools_display(self):
        """更新已选学校显示"""
        # 清空现有显示
        for widget in self.selected_schools_container.winfo_children():
            widget.destroy()
        
        if not self.selected_schools:
            ctk.CTkLabel(
                self.selected_schools_container,
                text="无",
                text_color="gray",
                font=ctk.CTkFont(size=12)
            ).grid(row=0, column=0, padx=5, pady=5)
            return
        
        # 显示已选学校标签
        for i, school in enumerate(self.selected_schools):
            tag_frame = ctk.CTkFrame(self.selected_schools_container, fg_color="#dbeafe", corner_radius=10)
            tag_frame.grid(row=0, column=i, padx=5, pady=5)
            
            ctk.CTkLabel(
                tag_frame,
                text=school,
                font=ctk.CTkFont(size=11),
                text_color="#1e40af"
            ).pack(side="left", padx=8, pady=3)
            
            remove_btn = ctk.CTkButton(
                tag_frame,
                text="×",
                command=lambda s=school: self._remove_school(s),
                width=20,
                height=20,
                fg_color="transparent",
                hover_color="#93c5fd",
                text_color="#1e40af",
                font=ctk.CTkFont(size=14, weight="bold")
            )
            remove_btn.pack(side="left", padx=(0, 5))
    
    def _remove_school(self, school_name):
        """移除已选学校"""
        if school_name in self.selected_schools:
            self.selected_schools.remove(school_name)
            self._update_selected_schools_display()
    
    def _search_school(self):
        """搜索学校"""
        keyword = self.school_search.get()
        if keyword:
            self._on_school_search_change()
    
    def _apply_filter(self):
        """应用筛选"""
        # 收集筛选条件
        filter_config = {
            "regions": [r for r, var in self.region_vars.items() if var.get()],
            "schools": self.selected_schools,
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
        self.school_results_frame.grid_remove()
        self.selected_schools = []
        self._update_selected_schools_display()


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
