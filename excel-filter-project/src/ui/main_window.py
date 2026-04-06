"""
主窗口 UI
"""
import customtkinter as ctk
from tkinter import filedialog, messagebox
from typing import Optional
import tkinter as tk

from ..models import Student, MatchResult, FilterConfig
from ..services import DataService, FilterService


class MainWindow(ctk.CTkFrame):
    """主窗口类"""
    
    def __init__(self, parent, data_service: DataService, filter_service: FilterService, app):
        super().__init__(parent)
        self.pack(fill="both", expand=True)
        
        self.data_service = data_service
        self.filter_service = filter_service
        self.app = app
        
        self.current_student: Optional[Student] = None
        self.current_results = []
        
        self._create_ui()
    
    def _create_ui(self):
        """创建 UI 界面"""
        # 配置网格
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=2)
        self.grid_rowconfigure(1, weight=1)
        
        # 左侧面板（筛选条件）
        self.left_panel = ctk.CTkFrame(self)
        self.left_panel.grid(row=0, column=0, rowspan=2, padx=10, pady=10, sticky="ns")
        
        # 创建筛选面板
        self.filter_panel = None
        
        # 右侧面板（结果展示）
        self.right_panel = ctk.CTkFrame(self)
        self.right_panel.grid(row=0, column=1, rowspan=2, padx=10, pady=10, sticky="nsew")
        
        self._create_left_panel()
        self._create_right_panel()
        
        # 创建筛选面板
        self._create_filter_panel()
    
    def _create_left_panel(self):
        """创建左侧面板"""
        self.left_panel.grid_columnconfigure(0, weight=1)
        
        # 标题
        title = ctk.CTkLabel(
            self.left_panel, 
            text="筛选条件", 
            font=ctk.CTkFont(size=18, weight="bold")
        )
        title.grid(row=0, column=0, pady=10)
        
        # 学生信息区域
        student_frame = ctk.CTkFrame(self.left_panel)
        student_frame.grid(row=1, column=0, padx=10, pady=10, sticky="ew")
        student_frame.grid_columnconfigure(0, weight=1)
        
        ctk.CTkLabel(
            student_frame, 
            text="学生信息", 
            font=ctk.CTkFont(size=14, weight="bold")
        ).grid(row=0, column=0, pady=5)
        
        self.student_info_label = ctk.CTkLabel(
            student_frame, 
            text="未选择学生", 
            justify="left"
        )
        self.student_info_label.grid(row=1, column=0, pady=5)
        
        # 选择学生按钮
        btn_select_student = ctk.CTkButton(
            student_frame,
            text="选择学生",
            command=self._select_student
        )
        btn_select_student.grid(row=2, column=0, pady=5)
        
        # 导入学生按钮
        btn_import = ctk.CTkButton(
            student_frame,
            text="导入学生 Excel",
            command=self._import_students
        )
        btn_import.grid(row=3, column=0, pady=5)
        
        # 筛选条件区域
        filter_frame = ctk.CTkFrame(self.left_panel)
        filter_frame.grid(row=2, column=0, padx=10, pady=10, sticky="ew")
        filter_frame.grid_columnconfigure(0, weight=1)
        
        ctk.CTkLabel(
            filter_frame, 
            text="筛选条件", 
            font=ctk.CTkFont(size=14, weight="bold")
        ).grid(row=0, column=0, pady=5)
        
        # 开始筛选按钮
        btn_filter = ctk.CTkButton(
            filter_frame,
            text="开始筛选",
            command=self._do_filter,
            height=40,
            font=ctk.CTkFont(size=16, weight="bold")
        )
        btn_filter.grid(row=1, column=0, pady=20, sticky="ew")
        
        # 导出结果按钮
        btn_export = ctk.CTkButton(
            filter_frame,
            text="导出结果",
            command=self._export_results,
            state="disabled"
        )
        btn_export.grid(row=2, column=0, pady=5, sticky="ew")
        self.btn_export = btn_export
        
        # 导入学校数据按钮（顶部工具栏）
        toolbar_frame = ctk.CTkFrame(self.left_panel)
        toolbar_frame.grid(row=3, column=0, padx=10, pady=10, sticky="ew")
        toolbar_frame.grid_columnconfigure(0, weight=1)
        
        btn_import_schools = ctk.CTkButton(
            toolbar_frame,
            text="导入学校数据",
            command=self._import_schools
        )
        btn_import_schools.grid(row=0, column=0, pady=5, sticky="ew")
    
    def _create_right_panel(self):
        """创建右侧面板"""
        self.right_panel.grid_columnconfigure(0, weight=1)
        self.right_panel.grid_rowconfigure(1, weight=1)
        
        # 标题
        title = ctk.CTkLabel(
            self.right_panel, 
            text="筛选结果", 
            font=ctk.CTkFont(size=18, weight="bold")
        )
        title.grid(row=0, column=0, pady=10)
        
        # 结果统计
        self.stats_label = ctk.CTkLabel(
            self.right_panel,
            text="共 0 条结果 | 冲：0 | 稳：0 | 保：0",
            font=ctk.CTkFont(size=12)
        )
        self.stats_label.grid(row=1, column=0, pady=5)
        
        # 结果面板
        self.result_panel = None
    
    def _select_student(self):
        """选择学生"""
        students = self.data_service.get_all_students()
        
        if not students:
            messagebox.showwarning("提示", "请先导入学生数据")
            return
        
        # 创建选择对话框
        dialog = ctk.CTkToplevel(self)
        dialog.title("选择学生")
        dialog.geometry("400x300")
        
        ctk.CTkLabel(dialog, text="选择学生:", font=ctk.CTkFont(size=14)).pack(pady=10)
        
        student_var = tk.StringVar(value=students[0].student_name if students else "")
        student_names = [f"{s.student_name} ({s.total_score}分，{s.rank}名)" for s in students]
        
        combo = ctk.CTkComboBox(
            dialog,
            variable=student_var,
            values=student_names,
            width=300
        )
        combo.pack(pady=10)
        
        def on_select():
            selected_name = student_var.get().split(' ')[0]
            for student in students:
                if student.student_name == selected_name:
                    self.current_student = student
                    self.app.load_student(student)
                    dialog.destroy()
                    break
        
        btn = ctk.CTkButton(dialog, text="确定", command=on_select)
        btn.pack(pady=20)
    
    def _import_students(self):
        """导入学生 Excel"""
        file_path = filedialog.askopenfilename(
            title="选择学生 Excel 文件",
            filetypes=[("Excel 文件", "*.xlsx *.xls")]
        )
        
        if file_path:
            if self.data_service.import_students_excel(file_path):
                messagebox.showinfo("成功", f"成功导入 {len(self.data_service.students)} 个学生")
            else:
                messagebox.showerror("错误", "导入失败，请检查文件格式")
    
    def _import_schools(self):
        """导入学校 Excel"""
        file_path = filedialog.askopenfilename(
            title="选择学校专业 Excel 文件",
            filetypes=[("Excel 文件", "*.xlsx *.xls")]
        )
        
        if file_path:
            if self.data_service.import_schools_excel(file_path):
                messagebox.showinfo("成功", f"成功导入 {len(self.data_service.schools)} 条专业数据")
            else:
                messagebox.showerror("错误", "导入失败，请检查文件格式")
    
    def _create_filter_panel(self):
        """创建筛选面板"""
        from ui.filter_panel import FilterPanel
        
        # 移除旧的筛选区域
        for widget in self.left_panel.winfo_children():
            if widget.grid_info()['row'] == 2:
                widget.destroy()
                break
        
        # 创建新的筛选面板
        self.filter_panel = FilterPanel(
            self.left_panel,
            on_filter=self._apply_filter,
            data_service=self.data_service
        )
        self.filter_panel.grid(row=2, column=0, padx=10, pady=10, sticky="nsew")
    
    def _apply_filter(self, filter_config):
        """应用筛选条件"""
        if not self.current_student:
            messagebox.showwarning("提示", "请先选择学生")
            return
        
        # 构建筛选配置
        config = FilterConfig(
            provinces=filter_config.get("regions", []),
            levels=[filter_config.get("level", "全部")] if filter_config.get("level", "全部") != "全部" else [],
            categories=filter_config.get("majors", []),
            include_tier_chong="冲" in filter_config.get("match_types", []),
            include_tier_wen="稳" in filter_config.get("match_types", []),
            include_tier_bao="保" in filter_config.get("match_types", [])
        )
        
        # 执行筛选
        results = self.filter_service.filter(self.current_student, config)
        self.current_results = results
        
        # 保存筛选历史
        if self.data_service:
            self.data_service.save_history(self.current_student, results, config)
        
        # 更新显示
        self.update_results(results)
    
    def _do_filter(self):
        """执行筛选（使用筛选面板的配置）"""
        if not self.current_student:
            messagebox.showwarning("提示", "请先选择学生")
            return
        
        if self.filter_panel:
            # 手动触发筛选面板的筛选
            self.filter_panel._apply_filter()
        else:
            # 回退到简单筛选
            config = FilterConfig(
                include_tier_chong=True,
                include_tier_wen=True,
                include_tier_bao=True
            )
            results = self.filter_service.filter(self.current_student, config)
            self.current_results = results
            self.update_results(results)
    
    def _export_results(self):
        """导出结果"""
        if not self.current_results:
            messagebox.showwarning("提示", "没有可导出的结果")
            return
        
        file_path = filedialog.asksaveasfilename(
            title="保存结果文件",
            defaultextension=".xlsx",
            filetypes=[("Excel 文件", "*.xlsx")]
        )
        
        if file_path:
            if self.data_service.export_results(self.current_results, file_path):
                messagebox.showinfo("成功", "结果导出成功")
            else:
                messagebox.showerror("错误", "导出失败")
    
    def update_student_info(self, student: Student):
        """更新学生信息显示"""
        info_text = f"""姓名：{student.student_name}
类别：{student.category}
选科：{', '.join(student.subjects)}
分数：{student.total_score}
排名：{student.rank}"""
        self.student_info_label.configure(text=info_text)
    
    def update_results(self, results):
        """更新结果列表"""
        # 创建或更新结果面板
        if not self.result_panel:
            from ui.result_panel import ResultPanel
            
            # 移除旧的表格
            for widget in self.right_panel.winfo_children():
                if widget.grid_info()['row'] == 2:
                    widget.destroy()
                    break
            
            # 创建新的结果面板
            self.result_panel = ResultPanel(
                self.right_panel,
                data_service=self.data_service,
                student_name=self.current_student.student_name if self.current_student else ""
            )
            self.result_panel.grid(row=2, column=0, padx=10, pady=10, sticky="nsew")
        
        # 转换结果为字典格式
        results_dict = []
        for r in results:
            results_dict.append({
                'student_id': r.student_id,
                'student_name': r.student_name,
                'school_id': r.school_id,
                'school': r.school_name,
                'major_id': r.major_id,
                'major': r.major_name,
                'type': r.match_type,
                'score_diff': r.score_gap,
                'rank_gap': r.rank_gap,
                'prev_score': r.min_score,
                'prev_rank': r.min_rank
            })
        
        # 加载结果到面板
        student_name = self.current_student.student_name if self.current_student else ""
        self.result_panel.load_results(results_dict, student_name)
        
        # 统计
        chong_count = sum(1 for r in results if r.match_type == '冲')
        wen_count = sum(1 for r in results if r.match_type == '稳')
        bao_count = sum(1 for r in results if r.match_type == '保')
        
        self.stats_label.configure(
            text=f"共 {len(results)} 条结果 | 冲：{chong_count} | 稳：{wen_count} | 保：{bao_count}"
        )
        
        # 启用导出按钮
        if results:
            self.btn_export.configure(state="normal")
