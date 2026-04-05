"""
学生信息输入对话框
支持手动输入选科、分数，自动合计总分
"""
import customtkinter as ctk
from tkinter import messagebox
from typing import Callable, Optional
from models import Student


class StudentInputDialog(ctk.CTkToplevel):
    """学生信息输入对话框"""
    
    def __init__(self, parent, title: str = "学生信息输入", on_save: Optional[Callable] = None):
        super().__init__(parent)
        
        self.title(title)
        self.geometry("500x600")
        self.resizable(False, False)
        
        self.on_save = on_save
        self.subjects = ["物理", "化学", "生物", "历史", "地理", "政治"]
        self.subject_vars = {}
        self.score_vars = {}
        
        self._create_ui()
    
    def _create_ui(self):
        """创建 UI 界面"""
        # 姓名
        name_frame = ctk.CTkFrame(self)
        name_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(name_frame, text="姓名：").pack(side="left", padx=5)
        self.name_entry = ctk.CTkEntry(name_frame, width=200)
        self.name_entry.pack(side="left", padx=5)
        
        # 选科科目
        subject_frame = ctk.CTkFrame(self)
        subject_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(subject_frame, text="选科科目：", font=ctk.CTkFont(size=14, weight="bold")).pack(pady=5)
        
        subject_grid = ctk.CTkFrame(subject_frame)
        subject_grid.pack()
        
        for i, subject in enumerate(self.subjects):
            var = ctk.BooleanVar(value=False)
            self.subject_vars[subject] = var
            cb = ctk.CTkCheckBox(subject_grid, text=subject, variable=var)
            cb.grid(row=i//3, column=i%3, padx=10, pady=5)
        
        # 分数输入
        score_frame = ctk.CTkFrame(self)
        score_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(score_frame, text="各科分数：", font=ctk.CTkFont(size=14, weight="bold")).pack(pady=5)
        
        score_grid = ctk.CTkFrame(score_frame)
        score_grid.pack()
        
        # 主科
        main_subjects = ["语文", "数学", "英语"]
        for i, subject in enumerate(main_subjects):
            ctk.CTkLabel(score_grid, text=f"{subject}：").grid(row=0, column=i*2, padx=5, pady=5)
            var = ctk.StringVar(value="0")
            var.trace_add("write", lambda *args: self._calculate_total())
            self.score_vars[subject] = var
            ctk.CTkEntry(score_grid, textvariable=var, width=60).grid(row=0, column=i*2+1, padx=5, pady=5)
        
        # 选科分数
        for i, subject in enumerate(self.subjects):
            ctk.CTkLabel(score_grid, text=f"{subject}：").grid(row=1+i//3, column=(i%3)*2, padx=5, pady=5)
            var = ctk.StringVar(value="0")
            var.trace_add("write", lambda *args: self._calculate_total())
            self.score_vars[subject] = var
            ctk.CTkEntry(score_grid, textvariable=var, width=60).grid(row=1+i//3, column=(i%3)*2+1, padx=5, pady=5)
        
        # 总分显示
        total_frame = ctk.CTkFrame(self)
        total_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(total_frame, text="总分：", font=ctk.CTkFont(size=16, weight="bold")).pack(side="left", padx=5)
        self.total_label = ctk.CTkLabel(total_frame, text="0", font=ctk.CTkFont(size=16, weight="bold"), text_color="green")
        self.total_label.pack(side="left", padx=5)
        
        ctk.CTkLabel(total_frame, text="排名：").pack(side="right", padx=5)
        self.rank_entry = ctk.CTkEntry(total_frame, width=100)
        self.rank_entry.pack(side="right", padx=5)
        
        # 按钮
        btn_frame = ctk.CTkFrame(self)
        btn_frame.pack(fill="x", padx=20, pady=20)
        
        ctk.CTkButton(btn_frame, text="保存", command=self._save, width=100).pack(side="left", padx=20)
        ctk.CTkButton(btn_frame, text="清空", command=self._clear, width=100).pack(side="left", padx=20)
        ctk.CTkButton(btn_frame, text="取消", command=self.destroy, width=100).pack(side="right", padx=20)
    
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
            messagebox.showwarning("警告", "请输入学生姓名")
            return
        
        # 检查选科
        selected_subjects = [subj for subj, var in self.subject_vars.items() if var.get()]
        if not selected_subjects:
            messagebox.showwarning("警告", "请至少选择一门选科科目")
            return
        
        # 创建学生对象
        scores = {}
        for subject, var in self.score_vars.items():
            try:
                scores[subject] = int(var.get() or "0")
            except ValueError:
                scores[subject] = 0
        
        total = self._calculate_total()
        
        try:
            rank = int(self.rank_entry.get() or "0")
        except ValueError:
            rank = 0
        
        student = Student(
            name=name,
            selected_subjects=selected_subjects,
            scores=scores,
            total_score=total,
            rank=rank
        )
        
        if self.on_save:
            self.on_save(student)
        
        messagebox.showinfo("成功", f"学生信息已保存\n总分：{total}")
        self.destroy()
    
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
    # 测试
    app = ctk.CTk()
    
    def on_save(student: Student):
        print(f"保存学生：{student.name}")
        print(f"选科：{student.selected_subjects}")
        print(f"总分：{student.total_score}")
    
    btn = ctk.CTkButton(app, text="打开学生输入对话框", command=lambda: StudentInputDialog(app, on_save=on_save))
    btn.pack(pady=50)
    
    app.mainloop()
