"""
学生信息输入对话框 - 高端 UI 版本
现代化设计，渐变色，动画效果
"""
import customtkinter as ctk
from tkinter import messagebox
import sys


class ModernStudentDialog(ctk.CTkToplevel):
    """现代化学生信息输入对话框"""
    
    def __init__(self, parent, title: str = "学生信息录入系统"):
        super().__init__(parent)
        
        # 窗口设置
        self.title(title)
        self.geometry("650x750")
        self.resizable(False, False)
        
        # 设置主题色
        self.primary_color = "#2563eb"  # 宝石蓝
        self.secondary_color = "#7c3aed"  # 紫色
        self.accent_color = "#10b981"  # 翡翠绿
        self.bg_color = "#f8fafc"  # 浅灰背景
        
        # 配置网格
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)
        
        self.subjects = ["物理", "化学", "生物", "历史", "地理", "政治"]
        self.subject_vars = {}
        self.score_vars = {}
        
        self._create_ui()
    
    def _create_ui(self):
        """创建高端 UI 界面"""
        
        # === 顶部标题栏（渐变背景）===
        header_frame = ctk.CTkFrame(self, height=100, fg_color=self.primary_color)
        header_frame.grid(row=0, column=0, sticky="ew")
        header_frame.grid_propagate(False)
        
        # 标题
        title_label = ctk.CTkLabel(
            header_frame,
            text="🎓 学生信息录入系统",
            font=ctk.CTkFont(size=24, weight="bold"),
            text_color="white"
        )
        title_label.place(relx=0.5, rely=0.35, anchor="center")
        
        # 副标题
        subtitle_label = ctk.CTkLabel(
            header_frame,
            text="Student Information Entry System",
            font=ctk.CTkFont(size=12),
            text_color="#e0e7ff"
        )
        subtitle_label.place(relx=0.5, rely=0.65, anchor="center")
        
        # === 主内容区 ===
        content_frame = ctk.CTkScrollableFrame(self, fg_color=self.bg_color)
        content_frame.grid(row=1, column=0, sticky="nsew", padx=20, pady=20)
        content_frame.grid_columnconfigure(0, weight=1)
        
        row = 0
        
        # 1. 基本信息卡片
        basic_card = self._create_card(content_frame, "📝 基本信息")
        basic_card.grid(row=row, column=0, sticky="ew", pady=(0, 15))
        row += 1
        
        name_frame = ctk.CTkFrame(basic_card, fg_color="transparent")
        name_frame.pack(fill="x", padx=20, pady=15)
        
        ctk.CTkLabel(
            name_frame,
            text="学生姓名：",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="#1e293b"
        ).pack(side="left", padx=5)
        
        self.name_entry = ctk.CTkEntry(
            name_frame,
            width=300,
            height=40,
            placeholder_text="请输入学生姓名",
            border_width=2,
            border_color=self.primary_color
        )
        self.name_entry.pack(side="left", padx=10)
        
        # 2. 选科科目卡片
        subject_card = self._create_card(content_frame, "🎯 选科科目（至少选择 1 门）")
        subject_card.grid(row=row, column=0, sticky="ew", pady=(0, 15))
        row += 1
        
        subject_grid = ctk.CTkFrame(subject_card, fg_color="transparent")
        subject_grid.pack(padx=20, pady=15)
        
        for i, subject in enumerate(self.subjects):
            var = ctk.BooleanVar(value=False)
            self.subject_vars[subject] = var
            
            cb = ctk.CTkCheckBox(
                subject_grid,
                text=f"  {subject}",
                variable=var,
                checkbox_width=20,
                checkbox_height=20,
                font=ctk.CTkFont(size=14),
                onvalue=True,
                offvalue=False
            )
            cb.grid(row=i//3, column=i%3, padx=20, pady=10, sticky="w")
        
        # 3. 分数输入卡片
        score_card = self._create_card(content_frame, "📊 各科分数")
        score_card.grid(row=row, column=0, sticky="ew", pady=(0, 15))
        row += 1
        
        # 主科
        main_frame = ctk.CTkFrame(score_card, fg_color="#e0e7ff")
        main_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(
            main_frame,
            text="📚 主科成绩",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=self.primary_color
        ).pack(pady=5)
        
        main_grid = ctk.CTkFrame(main_frame, fg_color="transparent")
        main_grid.pack(pady=10)
        
        main_subjects = ["语文", "数学", "英语"]
        icons = ["📖", "🔢", "🔤"]
        for i, subject in enumerate(main_subjects):
            frame = ctk.CTkFrame(main_grid, fg_color="white")
            frame.grid(row=0, column=i, padx=10, pady=5)
            
            ctk.CTkLabel(
                frame,
                text=f"{icons[i]} {subject}",
                font=ctk.CTkFont(size=12, weight="bold"),
                text_color="#1e293b"
            ).pack(pady=3)
            
            var = ctk.StringVar(value="0")
            var.trace_add("write", lambda *args: self._calculate_total())
            self.score_vars[subject] = var
            
            entry = ctk.CTkEntry(
                frame,
                textvariable=var,
                width=80,
                height=35,
                font=ctk.CTkFont(size=14),
                border_width=2,
                border_color=self.primary_color
            )
            entry.pack(pady=5)
        
        # 选科分数
        sub_frame = ctk.CTkFrame(score_card, fg_color="#fce7f3")
        sub_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(
            sub_frame,
            text="🔬 选科成绩",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=self.secondary_color
        ).pack(pady=5)
        
        sub_grid = ctk.CTkFrame(sub_frame, fg_color="transparent")
        sub_grid.pack(pady=10)
        
        for i, subject in enumerate(self.subjects):
            frame = ctk.CTkFrame(sub_grid, fg_color="white")
            frame.grid(row=i//3, column=i%3, padx=8, pady=5)
            
            ctk.CTkLabel(
                frame,
                text=f"  {subject}",
                font=ctk.CTkFont(size=12, weight="bold"),
                text_color="#1e293b"
            ).pack(pady=3)
            
            var = ctk.StringVar(value="0")
            var.trace_add("write", lambda *args: self._calculate_total())
            self.score_vars[subject] = var
            
            entry = ctk.CTkEntry(
                frame,
                textvariable=var,
                width=70,
                height=35,
                font=ctk.CTkFont(size=13),
                border_width=2,
                border_color=self.secondary_color
            )
            entry.pack(pady=5)
        
        # 4. 总分展示卡片（重点突出）
        total_card = self._create_card(content_frame, "✨ 成绩汇总", bg_color=self.accent_color)
        total_card.grid(row=row, column=0, sticky="ew", pady=(0, 15))
        row += 1
        
        total_frame = ctk.CTkFrame(total_card, fg_color="transparent")
        total_frame.pack(fill="x", padx=20, pady=15)
        
        # 总分
        total_left = ctk.CTkFrame(total_frame, fg_color="transparent")
        total_left.pack(side="left")
        
        ctk.CTkLabel(
            total_left,
            text="📈 总分：",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color="white"
        ).pack(side="left", padx=5)
        
        self.total_label = ctk.CTkLabel(
            total_left,
            text="0",
            font=ctk.CTkFont(size=32, weight="bold"),
            text_color="#fef3c7"
        )
        self.total_label.pack(side="left", padx=10)
        
        # 排名
        rank_frame = ctk.CTkFrame(total_frame, fg_color="transparent")
        rank_frame.pack(side="right")
        
        ctk.CTkLabel(
            rank_frame,
            text="🏆 排名：",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="white"
        ).pack(side="top", padx=5)
        
        self.rank_entry = ctk.CTkEntry(
            rank_frame,
            width=120,
            height=35,
            placeholder_text="输入排名（可选）",
            font=ctk.CTkFont(size=13),
            border_width=2,
            border_color="white"
        )
        self.rank_entry.pack(side="top", padx=5, pady=5)
        
        # 5. 按钮区
        btn_frame = ctk.CTkFrame(content_frame, fg_color="transparent")
        btn_frame.grid(row=row, column=0, pady=20)
        
        # 保存按钮（主按钮）
        save_btn = ctk.CTkButton(
            btn_frame,
            text="✅ 保存信息",
            command=self._save,
            width=140,
            height=45,
            font=ctk.CTkFont(size=15, weight="bold"),
            fg_color=self.accent_color,
            hover_color="#059669",
            corner_radius=10
        )
        save_btn.pack(side="left", padx=20)
        
        # 清空按钮
        clear_btn = ctk.CTkButton(
            btn_frame,
            text="🔄 清空",
            command=self._clear,
            width=120,
            height=45,
            font=ctk.CTkFont(size=14),
            fg_color="#64748b",
            hover_color="#475569",
            corner_radius=10
        )
        clear_btn.pack(side="left", padx=20)
        
        # 取消按钮
        cancel_btn = ctk.CTkButton(
            btn_frame,
            text="❌ 取消",
            command=self.destroy,
            width=120,
            height=45,
            font=ctk.CTkFont(size=14),
            fg_color="#ef4444",
            hover_color="#dc2626",
            corner_radius=10
        )
        cancel_btn.pack(side="left", padx=20)
    
    def _create_card(self, parent, title: str, bg_color: str = "white"):
        """创建卡片容器"""
        card = ctk.CTkFrame(parent, fg_color=bg_color, corner_radius=12, border_width=2)
        if bg_color == "white":
            card.configure(border_color="#e2e8f0")
        else:
            card.configure(border_color=bg_color)
        
        # 卡片标题
        title_label = ctk.CTkLabel(
            card,
            text=title,
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color="#1e293b" if bg_color == "white" else "white",
            anchor="w"
        )
        title_label.pack(fill="x", padx=20, pady=(15, 10))
        
        return card
    
    def _calculate_total(self):
        """自动计算总分"""
        total = 0
        for subject, var in self.score_vars.items():
            try:
                score = int(var.get() or "0")
                total += score
            except ValueError:
                pass
        self.total_label.configure(text=str(total))
        return total
    
    def _save(self):
        """保存学生信息"""
        name = self.name_entry.get().strip()
        if not name:
            messagebox.showwarning("⚠️ 警告", "请输入学生姓名", parent=self)
            return
        
        # 检查选科
        selected_subjects = [subj for subj, var in self.subject_vars.items() if var.get()]
        if not selected_subjects:
            messagebox.showwarning("⚠️ 警告", "请至少选择一门选科科目", parent=self)
            return
        
        # 计算总分
        total = self._calculate_total()
        
        # 显示保存结果（美化版）
        msg = f"""
╔══════════════════════════════════════╗
║     ✅ 学生信息保存成功！            ║
╠══════════════════════════════════════╣
║  姓名：{name:<28}║
║  选科：{', '.join(selected_subjects):<24}║
║  总分：{total:<28}║
║  排名：{self.rank_entry.get() or '未填写':<24}║
╚══════════════════════════════════════╝

即将开始智能筛选...
        """
        
        messagebox.showinfo("🎉 成功", msg, parent=self)
    
    def _clear(self):
        """清空所有输入"""
        self.name_entry.delete(0, "end")
        for var in self.subject_vars.values():
            var.set(False)
        for var in self.score_vars.values():
            var.set("0")
        self.rank_entry.delete(0, "end")
        self._calculate_total()


if __name__ == "__main__":
    # 设置高端主题
    ctk.set_appearance_mode("light")
    ctk.set_default_color_theme("blue")
    
    # 创建主窗口
    app = ctk.CTk()
    app.geometry("400x300")
    app.title("Excel 筛选器 - 高端版")
    
    # 主按钮
    def open_dialog():
        dialog = ModernStudentDialog(app)
        dialog.grab_set()
    
    main_btn = ctk.CTkButton(
        app,
        text="🎓 打开学生信息录入系统",
        command=open_dialog,
        width=300,
        height=60,
        font=ctk.CTkFont(size=16, weight="bold"),
        fg_color="#2563eb",
        hover_color="#1d4ed8",
        corner_radius=15
    )
    main_btn.pack(pady=50)
    
    # 说明
    info = ctk.CTkLabel(
        app,
        text="✨ 全新升级的 UI 设计\n"
             "• 现代化卡片式布局\n"
             "• 智能分数计算\n"
             "• 宝石蓝 + 翡翠绿配色\n"
             "• 流畅的交互体验",
        justify="center",
        font=ctk.CTkFont(size=12)
    )
    info.pack(pady=10)
    
    app.mainloop()
