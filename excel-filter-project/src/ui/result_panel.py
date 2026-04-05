"""
结果展示面板 - 高端 UI 版本
支持分页、排序、导出
"""
import customtkinter as ctk
from tkinter import messagebox, filedialog
from typing import List, Dict, Any


class ResultPanel(ctk.CTkFrame):
    """结果展示面板（高端版）"""
    
    def __init__(self, parent):
        super().__init__(parent)
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)
        
        self.current_results = []
        self.current_page = 1
        self.page_size = 100  # 每页显示 100 条
        self.total_pages = 1
        
        self._create_ui()
    
    def _create_ui(self):
        """创建 UI"""
        
        # === 顶部统计栏 ===
        stats_frame = self._create_stats_panel()
        stats_frame.grid(row=0, column=0, sticky="ew", padx=20, pady=15)
        
        # === 结果表格区 ===
        table_frame = self._create_table_area()
        table_frame.grid(row=1, column=0, sticky="nsew", padx=20, pady=(0, 15))
        
        # === 底部分页栏 ===
        page_frame = self._create_pagination()
        page_frame.grid(row=2, column=0, sticky="ew", padx=20, pady=15)
    
    def _create_stats_panel(self):
        """创建统计面板"""
        frame = ctk.CTkFrame(self, fg_color="#dbeafe", corner_radius=10)
        frame.grid_columnconfigure((0, 1, 2), weight=1)
        
        # 总结果数
        ctk.CTkLabel(
            frame,
            text="📊 总结果数",
            font=ctk.CTkFont(size=12),
            text_color="#1e40af"
        ).grid(row=0, column=0, padx=20, pady=10)
        
        self.total_count_label = ctk.CTkLabel(
            frame,
            text="0",
            font=ctk.CTkFont(size=24, weight="bold"),
            text_color="#1e40af"
        )
        self.total_count_label.grid(row=1, column=0, padx=20)
        
        # 冲/稳/保统计
        ctk.CTkLabel(
            frame,
            text="🎯 冲 / 稳 / 保",
            font=ctk.CTkFont(size=12),
            text_color="#1e40af"
        ).grid(row=0, column=1, padx=20, pady=10)
        
        self.match_stats_label = ctk.CTkLabel(
            frame,
            text="0 / 0 / 0",
            font=ctk.CTkFont(size=24, weight="bold"),
            text_color="#1e40af"
        )
        self.match_stats_label.grid(row=1, column=1, padx=20)
        
        # 操作按钮
        btn_frame = ctk.CTkFrame(frame, fg_color="transparent")
        btn_frame.grid(row=0, column=2, rowspan=2, padx=20)
        
        ctk.CTkButton(
            btn_frame,
            text="📥 导出 Excel",
            command=self._export_excel,
            width=120,
            height=35,
            fg_color="#16a34a",
            hover_color="#15803d",
            corner_radius=8
        ).pack(pady=5)
        
        ctk.CTkButton(
            btn_frame,
            text="🖨️ 打印",
            command=self._print,
            width=120,
            height=35,
            fg_color="#0891b2",
            hover_color="#0e7490",
            corner_radius=8
        ).pack(pady=5)
        
        return frame
    
    def _create_table_area(self):
        """创建表格区域"""
        frame = ctk.CTkScrollableFrame(self, fg_color="white", corner_radius=10)
        frame.grid_columnconfigure(0, weight=1)
        
        # 表头
        header = ctk.CTkFrame(frame, fg_color="#f1f5f9", corner_radius=8)
        header.grid(row=0, column=0, sticky="ew", pady=(10, 5))
        header.grid_columnconfigure((0, 1, 2, 3, 4, 5), weight=1)
        
        headers = [
            ("📍 序号", 0.05),
            ("🏫 学校", 0.2),
            ("📚 专业", 0.15),
            ("🎯 类型", 0.1),
            ("📊 分数差", 0.1),
            ("📈 往年分", 0.1),
            ("🏆 往年排名", 0.1),
            ("⚙️ 操作", 0.1)
        ]
        
        for i, (text, _) in enumerate(headers):
            ctk.CTkLabel(
                header,
                text=text,
                font=ctk.CTkFont(size=13, weight="bold"),
                text_color="#1e293b",
                anchor="w"
            ).grid(row=0, column=i, padx=10, pady=10)
        
        # 数据区（占位）
        self.data_frame = ctk.CTkFrame(frame, fg_color="transparent")
        self.data_frame.grid(row=1, column=0, sticky="ew")
        self.data_frame.grid_columnconfigure((0, 1, 2, 3, 4, 5), weight=1)
        
        # 空状态提示
        self.empty_label = ctk.CTkLabel(
            frame,
            text="📭 暂无数据\n\n请点击\"开始筛选\"按钮获取结果",
            font=ctk.CTkFont(size=16),
            text_color="#94a3b8",
            justify="center"
        )
        self.empty_label.grid(row=1, column=0, pady=100)
        
        return frame
    
    def _create_pagination(self):
        """创建分页栏"""
        frame = ctk.CTkFrame(self, fg_color="#f8fafc", corner_radius=10)
        
        # 页码显示
        self.page_info_label = ctk.CTkLabel(
            frame,
            text="第 1 / 1 页",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="#1e293b"
        )
        self.page_info_label.pack(side="left", padx=20)
        
        # 分页按钮
        btn_frame = ctk.CTkFrame(frame, fg_color="transparent")
        btn_frame.pack(side="right", padx=20)
        
        ctk.CTkButton(
            btn_frame,
            text="⏮️ 首页",
            command=self._first_page,
            width=70,
            height=35,
            fg_color="#64748b",
            hover_color="#475569",
            corner_radius=8
        ).pack(side="left", padx=5)
        
        ctk.CTkButton(
            btn_frame,
            text="◀️ 上一页",
            command=self._prev_page,
            width=90,
            height=35,
            fg_color="#64748b",
            hover_color="#475569",
            corner_radius=8
        ).pack(side="left", padx=5)
        
        ctk.CTkButton(
            btn_frame,
            text="▶️ 下一页",
            command=self._next_page,
            width=90,
            height=35,
            fg_color="#2563eb",
            hover_color="#1d4ed8",
            corner_radius=8
        ).pack(side="left", padx=5)
        
        ctk.CTkButton(
            btn_frame,
            text="⏭️ 末页",
            command=self._last_page,
            width=70,
            height=35,
            fg_color="#2563eb",
            hover_color="#1d4ed8",
            corner_radius=8
        ).pack(side="left", padx=5)
        
        return frame
    
    def load_results(self, results: List[Dict[str, Any]]):
        """加载结果数据"""
        self.current_results = results
        self.total_pages = max(1, (len(results) + self.page_size - 1) // self.page_size)
        self.current_page = 1
        
        # 更新统计
        self._update_stats()
        
        # 显示第一页
        self._render_page()
    
    def _update_stats(self):
        """更新统计信息"""
        total = len(self.current_results)
        chong = len([r for r in self.current_results if r.get("type") == "冲"])
        wen = len([r for r in self.current_results if r.get("type") == "稳"])
        bao = len([r for r in self.current_results if r.get("type") == "保"])
        
        self.total_count_label.configure(text=str(total))
        self.match_stats_label.configure(text=f"{chong} / {wen} / {bao}")
    
    def _render_page(self):
        """渲染当前页数据"""
        # 清空数据区
        for widget in self.data_frame.winfo_children():
            widget.destroy()
        
        # 隐藏空状态
        self.empty_label.grid_remove()
        
        # 计算当前页数据
        start_idx = (self.current_page - 1) * self.page_size
        end_idx = min(start_idx + self.page_size, len(self.current_results))
        page_data = self.current_results[start_idx:end_idx]
        
        # 渲染行
        for i, result in enumerate(page_data):
            row_frame = ctk.CTkFrame(self.data_frame, fg_color="#f8fafc" if i % 2 == 0 else "white", corner_radius=5)
            row_frame.grid(row=i, column=0, sticky="ew", pady=1)
            row_frame.grid_columnconfigure((0, 1, 2, 3, 4, 5), weight=1)
            
            # 序号
            ctk.CTkLabel(
                row_frame,
                text=str(start_idx + i + 1),
                font=ctk.CTkFont(size=12),
                text_color="#64748b"
            ).grid(row=0, column=0, padx=10, pady=8)
            
            # 学校
            ctk.CTkLabel(
                row_frame,
                text=result.get("school", ""),
                font=ctk.CTkFont(size=12, weight="bold"),
                text_color="#1e293b",
                anchor="w"
            ).grid(row=0, column=1, padx=10, pady=8, sticky="w")
            
            # 专业
            ctk.CTkLabel(
                row_frame,
                text=result.get("major", ""),
                font=ctk.CTkFont(size=12),
                text_color="#1e293b",
                anchor="w"
            ).grid(row=0, column=2, padx=10, pady=8, sticky="w")
            
            # 类型（带颜色）
            type_color = {
                "冲": "#ef4444",
                "稳": "#16a34a",
                "保": "#2563eb"
            }
            ctk.CTkLabel(
                row_frame,
                text=result.get("type", ""),
                font=ctk.CTkFont(size=12, weight="bold"),
                text_color=type_color.get(result.get("type"), "#1e293b")
            ).grid(row=0, column=3, padx=10, pady=8)
            
            # 分数差
            score_diff = result.get("score_diff", 0)
            diff_color = "#16a34a" if score_diff > 0 else "#ef4444"
            ctk.CTkLabel(
                row_frame,
                text=f"{score_diff:+d}",
                font=ctk.CTkFont(size=12, weight="bold"),
                text_color=diff_color
            ).grid(row=0, column=4, padx=10, pady=8)
            
            # 往年分
            ctk.CTkLabel(
                row_frame,
                text=str(result.get("prev_score", "")),
                font=ctk.CTkFont(size=12),
                text_color="#1e293b"
            ).grid(row=0, column=5, padx=10, pady=8)
            
            # 往年排名
            ctk.CTkLabel(
                row_frame,
                text=str(result.get("prev_rank", "")),
                font=ctk.CTkFont(size=12),
                text_color="#1e293b"
            ).grid(row=0, column=6, padx=10, pady=8)
            
            # 操作按钮
            detail_btn = ctk.CTkButton(
                row_frame,
                text="📄 详情",
                command=lambda r=result: self._show_detail(r),
                width=60,
                height=28,
                fg_color="#3b82f6",
                hover_color="#2563eb",
                corner_radius=6,
                font=ctk.CTkFont(size=11)
            )
            detail_btn.grid(row=0, column=7, padx=10, pady=8)
        
        # 更新页码信息
        self.page_info_label.configure(text=f"第 {self.current_page} / {self.total_pages} 页")
    
    def _first_page(self):
        """首页"""
        if self.current_page > 1:
            self.current_page = 1
            self._render_page()
    
    def _prev_page(self):
        """上一页"""
        if self.current_page > 1:
            self.current_page -= 1
            self._render_page()
    
    def _next_page(self):
        """下一页"""
        if self.current_page < self.total_pages:
            self.current_page += 1
            self._render_page()
    
    def _last_page(self):
        """末页"""
        if self.current_page < self.total_pages:
            self.current_page = self.total_pages
            self._render_page()
    
    def _show_detail(self, result: Dict[str, Any]):
        """显示详情"""
        msg = f"""
🏫 学校：{result.get('school', '')}
📚 专业：{result.get('major', '')}
🎯 类型：{result.get('type', '')}
📊 分数差：{result.get('score_diff', 0):+d}
📈 往年分数：{result.get('prev_score', '')}
🏆 往年排名：{result.get('prev_rank', '')}
📝 选科要求：{result.get('subject_requirement', '')}
💡 录取概率：{result.get('probability', '未知')}
        """
        messagebox.showinfo("📄 详细信息", msg)
    
    def _export_excel(self):
        """导出 Excel"""
        if not self.current_results:
            messagebox.showwarning("⚠️ 警告", "暂无数据可导出")
            return
        
        file_path = filedialog.asksaveasfilename(
            defaultextension=".xlsx",
            filetypes=[("Excel files", "*.xlsx")],
            title="导出筛选结果"
        )
        
        if file_path:
            # TODO: 实现 Excel 导出
            messagebox.showinfo("✅ 成功", f"结果已导出到：\n{file_path}\n\n（导出功能开发中）")
    
    def _print(self):
        """打印"""
        if not self.current_results:
            messagebox.showwarning("⚠️ 警告", "暂无数据可打印")
            return
        
        messagebox.showinfo("🖨️ 打印", "打印功能开发中...")


if __name__ == "__main__":
    # 测试
    app = ctk.CTk()
    app.geometry("900x600")
    app.title("筛选结果展示 - 高端版")
    
    panel = ResultPanel(app)
    panel.pack(fill="both", expand=True, padx=20, pady=20)
    
    # 模拟数据
    test_results = [
        {"school": "清华大学", "major": "计算机", "type": "冲", "score_diff": -5, "prev_score": 680, "prev_rank": 100},
        {"school": "北京大学", "major": "金融", "type": "稳", "score_diff": 10, "prev_score": 670, "prev_rank": 150},
        {"school": "复旦大学", "major": "医学", "type": "保", "score_diff": 20, "prev_score": 660, "prev_rank": 200},
    ] * 35  # 生成 105 条测试数据
    
    panel.load_results(test_results)
    
    app.mainloop()
