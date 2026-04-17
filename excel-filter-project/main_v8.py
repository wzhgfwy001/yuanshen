# -*- coding: utf-8 -*-
"""
山东高考志愿填报系统 v1.3
============================
功能：
  1. 学校搜索 - 输入学校名称关键字，筛选出开设相关专业的高校
  2. Excel导出 - 将当前筛选结果导出为.xlsx文件
  3. 打印功能 - 调用系统打印对话框打印筛选结果
============================
数据源：
  - benke_fixed.jsonl (本科数据，约21425条)
  - zhuanke_fixed.json (专科数据，约11912条)
============================
"""
import os, sys, tkinter as tk
from tkinter import ttk, messagebox
import pandas as pd
import threading
import tempfile
import webbrowser
import json
import platform

# ────────────────────────────────────────────────────────────────
# 数据路径
# ────────────────────────────────────────────────────────────────
BASE_DIR = r'C:\Users\DELL\.openclaw\workspace\cloudbase_data'
BENKE_FILE = os.path.join(BASE_DIR, 'benke_fixed.jsonl')
ZHUANKE_FILE = os.path.join(BASE_DIR, 'zhuanke_fixed.json')

# ────────────────────────────────────────────────────────────────
# 数据加载
# ────────────────────────────────────────────────────────────────
def load_jsonl(path, limit=None):
    """加载JSONL文件，返回字典列表"""
    records = []
    encodings = ['utf-8', 'gbk', 'gb2312', 'utf-8-sig']
    for enc in encodings:
        try:
            with open(path, 'r', encoding=enc) as f:
                for i, line in enumerate(f):
                    if limit and i >= limit:
                        break
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        records.append(json.loads(line))
                    except:
                        continue
            break
        except UnicodeDecodeError:
            continue
    return records

def load_json(path):
    """加载JSON文件，返回字典列表"""
    encodings = ['utf-8', 'gbk', 'gb2312', 'utf-8-sig']
    for enc in encodings:
        try:
            with open(path, 'r', encoding=enc) as f:
                return json.load(f)
        except UnicodeDecodeError:
            continue
    return []

def get_field(record, *keys, default=''):
    """安全获取字段"""
    for k in keys:
        v = record.get(k, None)
        if v is not None and v != '':
            return str(v)
    return default

# ────────────────────────────────────────────────────────────────
# 主应用类
# ────────────────────────────────────────────────────────────────
class App:
    def __init__(self, root):
        self.root = root
        self.root.title("山东高考志愿填报系统 v1.3")
        self.root.geometry("1300x850")
        self.root.configure(bg='#f0f4f8')
        self.root.resizable(True, True)

        self.df_benke = []    # 本科数据
        self.df_zhuanke = []  # 专科数据
        self.filtered_df = [] # 筛选结果
        self.page_size = 20
        self.current_page = 1
        self.total_score = 0

        # UI变量
        self.main_vars = {}
        self.ele_vars = {}
        self.ele_entries = {}
        self.subject_vars = {}
        self.pv = {}
        self.lv = {}
        self.school_sv = tk.StringVar()   # 学校搜索
        self.major_mv = tk.StringVar()    # 专业搜索

        self._create_ui()
        self._load_data()

    # ── UI布局 ──────────────────────────────────────────────────
    def _create_ui(self):
        # 标题栏
        title_frame = tk.Frame(self.root, bg='#1565c0')
        title_frame.pack(fill='x')
        tk.Label(title_frame, text="山东高考志愿填报系统 v1.3", font=("微软雅黑", 16, "bold"),
                 bg='#1565c0', fg='white', pady=8).pack()
        tk.Label(title_frame, text="✦ 硕博教育咨询师专用 ✦ | 本科+专科 联合筛选",
                 font=("微软雅黑", 9), bg='#1565c0', fg='#90caf9', pady=3).pack()

        # 版本说明
        ver_frame = tk.Frame(self.root, bg='#fff8e1', padx=10, pady=4)
        ver_frame.pack(fill='x')
        tk.Label(ver_frame, text="v1.3新增：🔍学校搜索 | 📊Excel导出 | 🖨️打印功能",
                 font=("微软雅黑", 9, "bold"), bg='#fff8e1', fg='#f57f17').pack(anchor='w')

        main = tk.Frame(self.root, bg='#f0f4f8')
        main.pack(fill='both', expand=True, padx=10, pady=8)

        # ── 左侧面板 ─────────────────────────────────────────
        left = tk.Frame(main, bg='#f8f9fa', padx=12, pady=10)
        left.pack(side='left', fill='y', padx=(0, 10))

        # 分数输入
        tk.Label(left, text="📊 分数输入", font=("微软雅黑", 11, "bold"),
                 bg='#f8f9fa', fg='#1565c0').pack(anchor='w')

        m_f = tk.LabelFrame(left, text="语数外 (满分450)", font=("微软雅黑", 9),
                            bg='white', padx=6, pady=4)
        m_f.pack(fill='x', pady=4)
        for subj in ["语文", "数学", "英语"]:
            f = tk.Frame(m_f, bg='white')
            f.pack(anchor='w', pady=1)
            tk.Label(f, text=f"{subj}:", font=("微软雅黑", 9), bg='white', width=3).pack(side='left')
            v = tk.StringVar(value="120")
            self.main_vars[subj] = v
            tk.Entry(f, textvariable=v, width=5, font=("微软雅黑", 10),
                     justify='center', bg='#e8f5e9', relief='flat').pack(side='left', padx=2)
            tk.Label(f, text="/150", font=("微软雅黑", 8), bg='white', fg='gray').pack(side='left')

        e_f = tk.LabelFrame(left, text="选考科目 (6选3,满分300)", font=("微软雅黑", 9),
                            bg='white', padx=6, pady=4)
        e_f.pack(fill='x', pady=0)
        electives = ["物理", "历史", "化学", "生物", "政治", "地理"]
        for subj in electives:
            f = tk.Frame(e_f, bg='white')
            f.pack(anchor='w', pady=1)
            v = tk.BooleanVar(value=False)
            self.ele_vars[subj] = v
            tk.Checkbutton(f, text=subj, variable=v, font=("微软雅黑", 9), bg='white').pack(side='left')
            ev = tk.StringVar(value="0")
            self.ele_entries[subj] = ev
            tk.Entry(f, textvariable=ev, width=4, font=("微软雅黑", 10),
                     justify='center', bg='#fff8e1').pack(side='left', padx=2)
            tk.Label(f, text="/100", font=("微软雅黑", 7), bg='white', fg='gray').pack(side='left')

        self.hint = tk.Label(left, text="已选: 0/3科", font=("微软雅黑", 8), bg='white', fg='red')
        self.hint.pack(anchor='w', pady=2)

        t_f = tk.Frame(left, bg='#1565c0', pady=6, padx=8)
        t_f.pack(fill='x', pady=6)
        self.total_l = tk.Label(t_f, text="总分: 0", font=("微软雅黑", 14, "bold"),
                                 bg='#1565c0', fg='white', anchor='center')
        self.total_l.pack(fill='x')
        tk.Button(t_f, text="计算总分", font=("微软雅黑", 9, "bold"), bg='#4caf50', fg='white',
                  pady=4, command=self._calc).pack(fill='x')

        tk.Label(left, text="🔍 筛选条件", font=("微软雅黑", 11, "bold"),
                 bg='#f8f9fa', fg='#1565c0').pack(anchor='w', pady=6)

        # 选科筛选
        sf = tk.LabelFrame(left, text="选科要求", font=("微软雅黑", 9), bg='white', padx=6, pady=4)
        sf.pack(fill='x', pady=0)
        self.subject_vars = {}
        self.subject_cbs = {}
        for subj in ["不限", "物理", "化学", "生物", "政治", "历史", "地理"]:
            v = tk.BooleanVar(value=False)
            self.subject_vars[subj] = v
            cb = tk.Checkbutton(sf, text=subj, variable=v, font=("微软雅黑", 8), bg='white',
                                command=lambda s=subj: self._on_subject_toggle(s))
            cb.pack(side='left', padx=2)
            self.subject_cbs[subj] = cb
        self.subject_vars["不限"].set(False)
        self.subject_hint = tk.Label(sf, text="", font=("微软雅黑", 8), bg='white', fg='gray')
        self.subject_hint.pack(anchor='w', pady=2)

        # 层次
        frm = tk.Frame(left, bg='white')
        frm.pack(fill='x')

        tk.Label(frm, text="层次:", font=("微软雅黑", 9), bg='#f8f9fa').grid(row=0, column=0, sticky='nw', pady=2)
        lf = tk.Frame(frm, bg='#f8f9fa')
        lf.grid(row=0, column=1, sticky='w', pady=2, padx=4)
        for i, l in enumerate(["985", "211", "双一流", "本科", "专科"]):
            var = tk.BooleanVar(value=False)
            self.lv[l] = var
            tk.Checkbutton(lf, text=l, variable=var, font=("微软雅黑", 8), bg='#f8f9fa').grid(
                row=0, column=i, sticky='w', padx=2)

        tk.Label(frm, text="专业:", font=("微软雅黑", 9), bg='#f8f9fa').grid(row=1, column=0, sticky='nw', pady=2)
        tk.Entry(frm, textvariable=self.major_mv, width=18, font=("微软雅黑", 9)).grid(
            row=1, column=1, sticky='w', pady=2, padx=4)

        # ── 按钮区 ─────────────────────────────────────────
        bf = tk.Frame(left, bg='white')
        bf.pack(fill='x', pady=6)
        tk.Button(bf, text="开始筛选", font=("微软雅黑", 10, "bold"), bg='#1565c0', fg='white',
                  pady=4, command=self._filter).pack(fill='x', pady=1)
        tk.Button(bf, text="清空", font=("微软雅黑", 9), bg='#757575', fg='white',
                  pady=3, command=self._clear).pack(fill='x', pady=1)

        # v1.3 新功能按钮
        btn_frame = tk.Frame(left, bg='#f8f9fa')
        btn_frame.pack(fill='x', pady=2)
        tk.Button(btn_frame, text="📥 导出Excel", font=("微软雅黑", 9, "bold"), bg='#43a047', fg='white',
                  pady=4, command=self._export_excel).pack(fill='x', pady=1)
        tk.Button(btn_frame, text="🖨️ 打印结果", font=("微软雅黑", 9, "bold"), bg='#ef6c00', fg='white',
                  pady=4, command=self._print_results).pack(fill='x', pady=1)

        # ── 右侧面板 ───────────────────────────────────────
        right = tk.Frame(main, bg='white', padx=10, pady=10)
        right.pack(side='left', fill='both', expand=True)

        # 学校搜索框（v1.3新功能）
        search_frame = tk.Frame(right, bg='#e3f2fd', padx=10, pady=8)
        search_frame.pack(fill='x', pady=(0, 6))
        tk.Label(search_frame, text="🔍 学校搜索：", font=("微软雅黑", 10, "bold"),
                 bg='#e3f2fd', fg='#0d47a1').pack(side='left')
        tk.Entry(search_frame, textvariable=self.school_sv, width=20,
                 font=("微软雅黑", 10)).pack(side='left', padx=5)
        tk.Button(search_frame, text="搜索学校", font=("微软雅黑", 9, "bold"),
                  bg='#1565c0', fg='white', command=self._search_school).pack(side='left', padx=5)
        tk.Button(search_frame, text="查看全部", font=("微软雅黑", 9),
                  bg='#9e9e9e', fg='white', command=self._show_all_schools).pack(side='left', padx=2)
        self.school_count_l = tk.Label(search_frame, text="", font=("微软雅黑", 9),
                                       bg='#e3f2fd', fg='#1565c0')
        self.school_count_l.pack(side='left', padx=5)

        self.stats_l = tk.Label(right, text="等待筛选...", font=("微软雅黑", 12),
                                bg='white', fg='#1565c0', pady=6)
        self.stats_l.pack(fill='x')

        sc = tk.Frame(right, bg='#f5f5f5', pady=6, padx=8)
        sc.pack(fill='x', pady=0)
        self.cl = tk.Label(sc, text="冲刺: 0", font=("微软雅黑", 10), bg='#fff3e0', fg='#e65100',
                           padx=8, pady=3)
        self.cl.pack(side='left', padx=3)
        self.wl = tk.Label(sc, text="稳妥: 0", font=("微软雅黑", 10), bg='#e3f2fd', fg='#0d47a1',
                           padx=8, pady=3)
        self.wl.pack(side='left', padx=3)
        self.bl = tk.Label(sc, text="保底: 0", font=("微软雅黑", 10), bg='#e8f5e9', fg='#1b5e20',
                           padx=8, pady=3)
        self.bl.pack(side='left', padx=3)

        # 学校信息面板（v1.3新功能）
        self.school_info_l = tk.Label(right, text="", font=("微软雅黑", 9),
                                      bg='#fffde7', fg='#f57f17', pady=4, anchor='w')
        self.school_info_l.pack(fill='x')

        tf = tk.Frame(right)
        tf.pack(fill='both', expand=True, pady=8)
        cols = ["类型", "概率", "院校名称", "办学性质", "专业名称", "计划数",
                "选科要求", "预测分数", "省份", "城市", "就业方向"]
        widths = {"类型":45,"概率":45,"院校名称":95,"办学性质":55,"专业名称":120,
                  "计划数":45,"选科要求":70,"预测分数":50,"省份":45,"城市":50,"就业方向":70}
        self.tree = ttk.Treeview(tf, columns=cols, show='headings', height=20)
        for col in cols:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=widths[col], anchor='center', minwidth=40)
        sy = ttk.Scrollbar(tf, orient='vertical', command=self.tree.yview)
        self.tree.configure(yscrollcommand=sy.set)
        self.tree.pack(side='left', fill='both', expand=True)
        sy.pack(side='right', fill='y')

        pf = tk.Frame(right, bg='white')
        pf.pack(fill='x', pady=4)
        self.prev = tk.Button(pf, text="上一页", font=("微软雅黑", 9), command=self._prev,
                              state='disabled', bg='#9e9e9e', fg='white')
        self.prev.pack(side='left', padx=8)
        self.page_l = tk.Label(pf, text="0 / 0 页", font=("微软雅黑", 10), bg='white')
        self.page_l.pack(side='left', padx=8)
        self.next = tk.Button(pf, text="下一页", font=("微软雅黑", 9), command=self._next,
                              state='disabled', bg='#1565c0', fg='white')
        self.next.pack(side='left', padx=8)

        self.st = tk.Label(self.root, text="就绪", font=("微软雅黑", 8),
                           bg='#f5f5f5', fg='gray', anchor='w')
        self.st.pack(fill='x', padx=10, pady=2)

    # ── 数据加载 ─────────────────────────────────────────────────
    def _load_data(self):
        self.st.config(text="加载中...")
        def load():
            try:
                self.df_benke = load_jsonl(BENKE_FILE)
                self.df_zhuanke = load_json(ZHUANKE_FILE)
                total = len(self.df_benke) + len(self.df_zhuanke)
                self.st.config(text=f"加载完成: 本科{len(self.df_benke)}条 + 专科{len(self.df_zhuanke)}条 = {total}条")
                self.root.after(0, lambda: messagebox.showinfo("成功",
                    f"数据加载完成\n本科: {len(self.df_benke)}条\n专科: {len(self.df_zhuanke)}条\n总计: {total}条"))
            except Exception as e:
                import traceback; traceback.print_exc()
                self.st.config(text=f"加载失败: {e}")
                self.root.after(0, lambda: messagebox.showerror("错误", str(e)))
        threading.Thread(target=load, daemon=True).start()

    # ── 分数计算 ──────────────────────────────────────────────────
    def _calc(self):
        try:
            total = sum(int(self.main_vars[s].get() or 0) for s in self.main_vars)
            selected = [s for s in self.ele_vars if self.ele_vars[s].get()]
            for s in selected:
                total += int(self.ele_entries[s].get() or 0)
            if len(selected) != 3:
                self.hint.config(text=f"请选3科(当前{len(selected)}科)", fg='red')
                messagebox.showwarning("提示", f"必须选3科，当前{len(selected)}科!")
                return
            self.total_score = total
            self.total_l.config(text=f"总分: {total}")
            self.hint.config(text=f"已选: 3/3科", fg='green')
            self._update_subject_filter_options()
        except Exception as e:
            self.total_l.config(text=f"总分: 错误")

    def _on_subject_toggle(self, subj):
        if subj == "不限":
            if self.subject_vars["不限"].get():
                for s in self.subject_vars:
                    if s != "不限":
                        self.subject_vars[s].set(False)
        else:
            self.subject_vars["不限"].set(False)
        self._update_subject_hint()

    def _update_subject_hint(self):
        selected = [s for s in self.subject_vars if self.subject_vars[s].get()]
        if "不限" in selected:
            self.subject_hint.config(text="选了: 不限")
        elif selected:
            self.subject_hint.config(text=f"选了: {','.join(selected)}")
        else:
            self.subject_hint.config(text="")

    def _update_subject_filter_options(self):
        if not hasattr(self, 'subject_cbs'):
            return
        scored_subjects = []
        for subj in ["物理", "化学", "生物", "政治", "历史", "地理"]:
            try:
                if int(self.ele_entries[subj].get() or 0) > 0:
                    scored_subjects.append(subj)
            except:
                pass
        for subj in ["物理", "化学", "生物", "政治", "历史", "地理"]:
            try:
                cb = self.subject_cbs[subj]
                if subj in scored_subjects:
                    cb.configure(state='normal')
                else:
                    cb.configure(state='disabled')
                    self.subject_vars[subj].set(False)
            except:
                pass
        self._update_subject_hint()

    # ── v1.3 新功能1: 学校搜索 ─────────────────────────────────
    def _search_school(self):
        """根据学校名称关键字搜索，显示该校所有相关专业"""
        keyword = self.school_sv.get().strip()
        if not keyword:
            messagebox.showwarning("提示", "请输入学校名称关键字！")
            return

        if not self.df_benke and not self.df_zhuanke:
            messagebox.showwarning("提示", "数据加载中，请稍候...")
            return

        all_records = []
        school_majors = {}  # 学校名称 -> 专业列表
        school_info = {}    # 学校名称 -> 基本信息

        # 搜索本科数据
        for r in self.df_benke:
            school_name = get_field(r, 'school_name', '院校名称')
            if keyword.lower() in school_name.lower():
                school_type = get_field(r, 'school_type', '办学性质', 'school_nature')
                province = get_field(r, 'province', '省份')
                city = get_field(r, 'city', '城市')
                major = get_field(r, 'major_name', '专业名称')
                pred = get_field(r, 'predicted_score_2025', 'predict_score', '预测分数')
                subject_req = get_field(r, 'subject_require', '选科要求')
                plan = get_field(r, 'plan_count', '计划数')

                if school_name not in school_majors:
                    school_majors[school_name] = []
                    school_info[school_name] = {
                        '类型': '本科', '办学性质': school_type,
                        '省份': province, '城市': city
                    }
                school_majors[school_name].append({
                    'major': major, 'pred': pred, 'subject': subject_req, 'plan': plan
                })

        # 搜索专科数据
        for r in self.df_zhuanke:
            school_name = get_field(r, 'school_name', 'school_name')
            if keyword.lower() in school_name.lower():
                school_type = get_field(r, 'school_type', '办学性质')
                province = get_field(r, 'province', '省份')
                city = get_field(r, 'city', '城市')
                major = get_field(r, 'major_name', 'major_name')
                pred = get_field(r, 'predicted_score_2025', 'predict_score')
                subject_req = get_field(r, 'subject_require', '选科要求')
                plan = get_field(r, 'plan_count', '计划数')

                if school_name not in school_majors:
                    school_majors[school_name] = []
                    school_info[school_name] = {
                        '类型': '专科', '办学性质': school_type,
                        '省份': province, '城市': city
                    }
                school_majors[school_name].append({
                    'major': major, 'pred': pred, 'subject': subject_req, 'plan': plan
                })

        if not school_majors:
            messagebox.showinfo("搜索结果", f"未找到包含「{keyword}」的学校！")
            self.school_count_l.config(text="未找到匹配学校")
            self.school_info_l.config(text="")
            return

        # 显示搜索结果
        results = []
        for school, majors in school_majors.items():
            info = school_info[school]
            # 取该校预测分数最低的专业作为代表分数
            scores = []
            for m in majors:
                try:
                    if m['pred']:
                        scores.append(float(m['pred']))
                except:
                    pass
            rep_score = min(scores) if scores else 0
            results.append({
                '类型': info['类型'],
                '概率': '',
                '院校名称': school,
                '办学性质': info['办学性质'][:10],
                '专业名称': f"共{len(majors)}个专业，点击查看详情",
                '计划数': '',
                '选科要求': '',
                '预测分数': f"{rep_score:.0f}" if rep_score else '',
                '省份': info['省份'],
                '城市': info['城市'],
                '就业方向': '',
                '_majors': majors,
                '_school': school
            })

        results.sort(key=lambda x: x['院校名称'])
        self.filtered_df = results
        self.current_page = 1

        # 显示学校信息
        self.school_info_l.config(
            text=f"🔍 搜索「{keyword}」: 找到 {len(school_majors)} 所高校，共 {sum(len(m) for m in school_majors.values())} 个专业"
        )
        self.school_count_l.config(text=f"共{len(school_majors)}所学校")

        self.stats_l.config(text=f"学校搜索结果: {len(results)} 所")
        self.cl.config(text="冲刺: -")
        self.wl.config(text="稳妥: -")
        self.bl.config(text="保底: -")
        self._show_page()

        # 绑定双击事件查看专业详情
        self.tree.bind('<Double-Button-1>', self._show_school_majors)

        messagebox.showinfo("搜索完成",
            f"找到 {len(school_majors)} 所学校\n共 {sum(len(m) for m in school_majors.values())} 个相关专业\n双击学校名称查看专业详情")

    def _show_school_majors(self, event):
        """双击学校行显示该校所有专业"""
        selection = self.tree.selection()
        if not selection:
            return
        item = self.tree.item(selection[0])
        values = item['values']
        if not values or '_school' not in item.get('tags', []):
            # 从filtered_df中查找
            idx = self.tree.index(selection[0])
            if idx >= len(self.filtered_df):
                return
            record = self.filtered_df[idx]
            if '_majors' in record:
                self._popup_majors(record['_school'], record['_majors'], record['类型'])

    def _popup_majors(self, school_name, majors, school_type):
        """弹出窗口显示学校所有专业"""
        popup = tk.Toplevel(self.root)
        popup.title(f"【{school_name}】专业详情 - {len(majors)}个专业")
        popup.geometry("900x500")

        tk.Label(popup, text=f"{school_name} - {len(majors)}个招生专业",
                 font=("微软雅黑", 12, "bold"), bg='#1565c0', fg='white', pady=8).pack(fill='x')

        frame = tk.Frame(popup)
        frame.pack(fill='both', expand=True, padx=10, pady=10)

        cols = ["专业名称", "选科要求", "预测分数", "计划数"]
        tree = ttk.Treeview(frame, columns=cols, show='headings', height=18)
        for col in cols:
            tree.heading(col, text=col)
            tree.column(col, width={"专业名称":400,"选科要求":200,"预测分数":120,"计划数":100}[col])
        tree.column("专业名称", width=400)
        tree.column("选科要求", width=200)
        tree.column("预测分数", width=120)
        tree.column("计划数", width=100)

        sy = ttk.Scrollbar(frame, orient='vertical', command=tree.yview)
        tree.configure(yscrollcommand=sy.set)
        tree.pack(side='left', fill='both', expand=True)
        sy.pack(side='right', fill='y')

        for m in majors:
            tree.insert('', 'end', values=(m['major'], m['subject'], m['pred'], m['plan']))

        tk.Button(popup, text="关闭", font=("微软雅黑", 10), command=popup.destroy,
                  bg='#9e9e9e', fg='white', pady=4, padx=20).pack(pady=8)

    def _show_all_schools(self):
        """显示所有学校列表"""
        if not self.df_benke and not self.df_zhuanke:
            messagebox.showwarning("提示", "数据加载中，请稍候...")
            return

        schools = {}
        for r in self.df_benke:
            sn = get_field(r, 'school_name', '院校名称')
            if sn and sn not in schools:
                schools[sn] = {'类型': '本科', '省份': get_field(r, 'province', '省份'),
                               '城市': get_field(r, 'city', '城市'),
                               '办学性质': get_field(r, 'school_type', '办学性质')}
        for r in self.df_zhuanke:
            sn = get_field(r, 'school_name', 'school_name')
            if sn and sn not in schools:
                schools[sn] = {'类型': '专科', '省份': get_field(r, 'province', '省份'),
                               '城市': get_field(r, 'city', '城市'),
                               '办学性质': get_field(r, 'school_type', '办学性质')}

        results = [{'类型': v['类型'], '概率': '', '院校名称': k,
                    '办学性质': v['办学性质'][:10], '专业名称': '查看全部',
                    '计划数': '', '选科要求': '', '预测分数': '',
                    '省份': v['省份'], '城市': v['城市'], '就业方向': ''}
                   for k, v in schools.items()]
        results.sort(key=lambda x: x['院校名称'])

        self.filtered_df = results
        self.current_page = 1
        self.school_info_l.config(text=f"📋 全部学校列表: 共 {len(schools)} 所")
        self.school_count_l.config(text=f"共{len(schools)}所学校")
        self.stats_l.config(text=f"学校列表: {len(results)} 所")
        self.cl.config(text="冲刺: -")
        self.wl.config(text="稳妥: -")
        self.bl.config(text="保底: -")
        self._show_page()

    # ── 筛选 ─────────────────────────────────────────────────────
    def _filter(self):
        if not self.df_benke and not self.df_zhuanke:
            messagebox.showwarning("提示", "数据加载中..."); return
        try:
            total = sum(int(self.main_vars[s].get() or 0) for s in self.main_vars)
            selected = [s for s in self.ele_vars if self.ele_vars[s].get()]
            for s in selected:
                total += int(self.ele_entries[s].get() or 0)
            if len(selected) != 3:
                messagebox.showwarning("提示", f"选3科!"); return
            self.total_score = total

            lvls = [k for k, v in self.lv.items() if v.get()]
            major_kw = self.major_mv.get().strip()

            results = {'冲刺': [], '稳妥': [], '保底': []}

            # 筛选本科数据
            for r in self.df_benke:
                school = get_field(r, 'school_name', '院校名称')
                major = get_field(r, 'major_name', '专业名称')
                pred_str = get_field(r, 'predicted_score_2025', 'predict_score', '预测分数')
                if not pred_str:
                    continue
                try:
                    pred = float(pred_str)
                except:
                    continue

                # 层次筛选
                if lvls:
                    if '本科' not in lvls and '985' not in lvls and '211' not in lvls and '双一流' not in lvls:
                        continue
                    if '本科' in lvls:
                        pass  # 本科数据全部包含
                # 专业关键词
                if major_kw and major_kw.lower() not in major.lower():
                    continue

                diff = total - pred
                if diff < -30:
                    continue
                elif diff < -10:
                    prob = max(30, min(50, 30 + (30 + diff)))
                    cat = '冲刺'
                elif diff < 10:
                    if diff <= 0:
                        prob = max(50, min(70, 50 + (diff + 10) * 2))
                    else:
                        prob = max(50, min(70, 70 - diff * 2))
                    cat = '稳妥'
                else:
                    prob = max(70, min(100, 70 + (diff - 10) * 1.2))
                    cat = '保底'

                results[cat].append({
                    '类型': cat, '概率': f"{prob:.0f}%",
                    '院校名称': school[:18], '办学性质': get_field(r, 'school_type', '办学性质')[:10],
                    '专业名称': major[:28], '计划数': get_field(r, 'plan_count', '计划数'),
                    '选科要求': get_field(r, 'subject_require', '选科要求')[:18],
                    '预测分数': f"{pred:.0f}", '省份': get_field(r, 'province', '省份'),
                    '城市': get_field(r, 'city', '城市'),
                    '就业方向': get_field(r, '就业方向', 'job_direction')[:15]
                })

            # 筛选专科数据
            for r in self.df_zhuanke:
                school = get_field(r, 'school_name', 'school_name')
                major = get_field(r, 'major_name', 'major_name')
                pred_str = get_field(r, 'predicted_score_2025', 'predict_score')
                if not pred_str:
                    continue
                try:
                    pred = float(pred_str)
                except:
                    continue

                if lvls and '专科' not in lvls:
                    continue
                if major_kw and major_kw.lower() not in major.lower():
                    continue

                diff = total - pred
                if diff < -30:
                    continue
                elif diff < -10:
                    prob = max(30, min(50, 30 + (30 + diff)))
                    cat = '冲刺'
                elif diff < 10:
                    if diff <= 0:
                        prob = max(50, min(70, 50 + (diff + 10) * 2))
                    else:
                        prob = max(50, min(70, 70 - diff * 2))
                    cat = '稳妥'
                else:
                    prob = max(70, min(100, 70 + (diff - 10) * 1.2))
                    cat = '保底'

                results[cat].append({
                    '类型': cat, '概率': f"{prob:.0f}%",
                    '院校名称': school[:18], '办学性质': get_field(r, 'school_type', '办学性质')[:10],
                    '专业名称': major[:28], '计划数': get_field(r, 'plan_count', '计划数'),
                    '选科要求': get_field(r, 'subject_require', '选科要求')[:18],
                    '预测分数': f"{pred:.0f}", '省份': get_field(r, 'province', '省份'),
                    '城市': get_field(r, 'city', '城市'),
                    '就业方向': get_field(r, '就业方向', 'job_direction')[:15]
                })

            for cat in results:
                results[cat].sort(key=lambda x: int(x['概率'].replace('%','')))

            # 合并并限制数量
            final = []
            school_count = {}
            for cat, target in [('冲刺', 30), ('稳妥', 50), ('保底', 20)]:
                count = 0
                for r in results[cat]:
                    if count >= target:
                        break
                    school = r['院校名称']
                    if school_count.get(school, 0) < 3:
                        final.append(r)
                        school_count[school] = school_count.get(school, 0) + 1
                        count += 1

            self.filtered_df = final
            self.school_info_l.config(text="")
            self.school_count_l.config(text="")

            ch = len([r for r in final if r['类型']=='冲刺'])
            we = len([r for r in final if r['类型']=='稳妥'])
            ba = len([r for r in final if r['类型']=='保底'])
            self.stats_l.config(text=f"结果: {len(final)} 条 (总分:{total})")
            self.cl.config(text=f"冲刺: {ch}")
            self.wl.config(text=f"稳妥: {we}")
            self.bl.config(text=f"保底: {ba}")
            self.current_page = 1
            self._show_page()

            self.tree.bind('<Double-Button-1>', None)  # 取消双击绑定

        except Exception as e:
            import traceback; traceback.print_exc()
            messagebox.showerror("错误", str(e))

    # ── 分页 ──────────────────────────────────────────────────────
    def _show_page(self):
        for i in self.tree.get_children():
            self.tree.delete(i)
        if not self.filtered_df:
            return
        s, e = (self.current_page-1)*self.page_size, self.current_page*self.page_size
        for r in self.filtered_df[s:e]:
            t = {'冲刺':'chong','稳妥':'wen','保底':'bao'}.get(r['类型'],'')
            tags = tuple(r.get('_majors', [])) if r.get('_majors') else (t,)
            self.tree.insert('', 'end',
                             values=(r['类型'],r['概率'],r['院校名称'],r.get('办学性质',''),
                                     r['专业名称'],r.get('计划数',''),r.get('选科要求',''),
                                     r['预测分数'],r['省份'],r['城市'],r.get('就业方向','')),
                             tags=(t,))
        self.tree.tag_configure('chong', background='#fff3e0')
        self.tree.tag_configure('wen', background='#e3f2fd')
        self.tree.tag_configure('bao', background='#e8f5e9')
        tp = max(1, (len(self.filtered_df)+self.page_size-1)//self.page_size)
        self.page_l.config(text=f"{self.current_page} / {tp} 页")
        self.prev.config(state='normal' if self.current_page>1 else 'disabled',
                         bg='#9e9e9e' if self.current_page<=1 else '#1565c0')
        self.next.config(state='normal' if self.current_page<tp else 'disabled',
                         bg='#9e9e9e' if self.current_page>=tp else '#1565c0')

    def _prev(self):
        if self.current_page > 1:
            self.current_page -= 1
            self._show_page()

    def _next(self):
        if self.filtered_df and self.current_page < max(1, (len(self.filtered_df)+self.page_size-1)//self.page_size):
            self.current_page += 1
            self._show_page()

    def _clear(self):
        for v in self.main_vars.values(): v.set("120")
        for v in self.ele_vars.values(): v.set(False)
        for v in self.ele_entries.values(): v.set("0")
        for cb in self.subject_cbs.values(): cb.configure(state='normal')
        self.subject_vars["不限"].set(False)
        for v in self.lv.values(): v.set(False)
        self.school_sv.set(""); self.major_mv.set("")
        self.total_l.config(text="总分: 0")
        self.hint.config(text="已选: 0/3科", fg='red')
        self.school_info_l.config(text="")
        self.school_count_l.config(text="")
        for i in self.tree.get_children(): self.tree.delete(i)
        self.stats_l.config(text="等待筛选...")
        self.cl.config(text="冲刺: 0"); self.wl.config(text="稳妥: 0"); self.bl.config(text="保底: 0")
        self.page_l.config(text="0 / 0 页")
        self.tree.bind('<Double-Button-1>', None)

    # ── v1.3 新功能2: Excel导出 ─────────────────────────────────
    def _export_excel(self):
        """导出筛选结果为Excel文件"""
        if not self.filtered_df:
            messagebox.showwarning("提示", "无筛选数据可导出！")
            return
        try:
            from tkinter import filedialog
            fp = filedialog.asksaveasfilename(
                defaultextension=".xlsx",
                filetypes=[("Excel文件", "*.xlsx"), ("所有文件", "*.*")],
                title="保存筛选结果"
            )
            if not fp:
                return

            # 准备导出数据（去掉内部字段）
            export_data = []
            for r in self.filtered_df:
                export_data.append({
                    '类型': r['类型'],
                    '概率': r['概率'],
                    '院校名称': r['院校名称'],
                    '办学性质': r.get('办学性质', ''),
                    '专业名称': r['专业名称'],
                    '计划数': r.get('计划数', ''),
                    '选科要求': r.get('选科要求', ''),
                    '预测分数': r['预测分数'],
                    '省份': r['省份'],
                    '城市': r['城市'],
                    '就业方向': r.get('就业方向', '')
                })

            df_export = pd.DataFrame(export_data)
            df_export.to_excel(fp, index=False, sheet_name='筛选结果')
            messagebox.showinfo("导出成功", f"已保存至:\n{fp}")
        except Exception as e:
            import traceback; traceback.print_exc()
            messagebox.showerror("导出失败", str(e))

    # ── v1.3 新功能3: 打印功能 ────────────────────────────────────
    def _print_results(self):
        """调用系统打印对话框打印筛选结果"""
        if not self.filtered_df:
            messagebox.showwarning("提示", "无数据可打印！")
            return
        try:
            from tkinter import filedialog

            # 生成打印内容（HTML格式）
            html_content = self._generate_print_html()

            # 创建临时HTML文件用于打印
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html',
                                             delete=False, encoding='utf-8') as f:
                f.write(html_content)
                temp_path = f.name

            # Windows: 使用默认浏览器打印
            if platform.system() == 'Windows':
                # 打开浏览器打印对话框
                webbrowser.open(temp_path)
                messagebox.showinfo("打印提示",
                    "浏览器已打开打印预览页面\n请在浏览器中使用 Ctrl+P 打印\n\n如需直接打印，请选择'另存为PDF'或使用系统打印")
            else:
                # 其他系统也用浏览器
                webbrowser.open(temp_path)
                messagebox.showinfo("打印提示", "浏览器已打开打印预览页面")

        except Exception as e:
            import traceback; traceback.print_exc()
            messagebox.showerror("打印失败", str(e))

    def _generate_print_html(self):
        """生成打印用的HTML内容"""
        total_count = len(self.filtered_df)
        ch_count = len([r for r in self.filtered_df if r['类型'] == '冲刺'])
        we_count = len([r for r in self.filtered_df if r['类型'] == '稳妥'])
        ba_count = len([r for r in self.filtered_df if r['类型'] == '保底'])

        rows_html = ""
        for r in self.filtered_df:
            bg = {'冲刺': '#fff3e0', '稳妥': '#e3f2fd', '保底': '#e8f5e9'}.get(r['类型'], '#ffffff')
            rows_html += f"""
            <tr style="background:{bg}">
                <td>{r['类型']}</td>
                <td>{r['概率']}</td>
                <td>{r['院校名称']}</td>
                <td>{r.get('办学性质', '')}</td>
                <td>{r['专业名称']}</td>
                <td>{r.get('计划数', '')}</td>
                <td>{r.get('选科要求', '')}</td>
                <td>{r['预测分数']}</td>
                <td>{r['省份']}</td>
                <td>{r['城市']}</td>
                <td>{r.get('就业方向', '')}</td>
            </tr>"""

        html = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>山东高考志愿筛选结果</title>
<style>
    @media print {{
        body {{ margin: 0; padding: 10px; }}
        .no-print {{ display: none; }}
    }}
    body {{ font-family: "微软雅黑", "SimHei", sans-serif; margin: 20px; font-size: 12px; }}
    h1 {{ color: #1565c0; text-align: center; margin-bottom: 5px; }}
    .subtitle {{ text-align: center; color: #666; margin-bottom: 15px; font-size: 11px; }}
    .stats {{ background: #f5f5f5; padding: 10px 15px; margin-bottom: 15px;
              border-radius: 5px; display: flex; justify-content: space-around; }}
    .stat {{ text-align: center; }}
    .stat-label {{ font-size: 12px; color: #666; }}
    .stat-value {{ font-size: 18px; font-weight: bold; }}
    .stat-ch {{ color: #e65100; }}
    .stat-we {{ color: #0d47a1; }}
    .stat-ba {{ color: #1b5e20; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
    th {{ background: #1565c0; color: white; padding: 6px 4px; font-size: 11px; }}
    td {{ padding: 5px 4px; border: 1px solid #ddd; font-size: 10px; text-align: center; }}
    .btn-print {{ background: #ef6c00; color: white; border: none; padding: 8px 20px;
                  font-size: 14px; cursor: pointer; margin: 15px auto; display: block;
                  border-radius: 4px; }}
    .footer {{ text-align: center; color: #999; font-size: 10px; margin-top: 15px;
               border-top: 1px solid #eee; padding-top: 10px; }}
</style>
</head>
<body>
<h1>山东高考志愿筛选结果</h1>
<div class="subtitle">
    总分: <strong>{self.total_score}</strong> |
    生成时间: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')} |
    版本: v1.3
</div>
<div class="stats">
    <div class="stat">
        <div class="stat-label">冲刺</div>
        <div class="stat-value stat-ch">{ch_count}</div>
    </div>
    <div class="stat">
        <div class="stat-label">稳妥</div>
        <div class="stat-value stat-we">{we_count}</div>
    </div>
    <div class="stat">
        <div class="stat-label">保底</div>
        <div class="stat-value stat-ba">{ba_count}</div>
    </div>
    <div class="stat">
        <div class="stat-label">合计</div>
        <div class="stat-value">{total_count}</div>
    </div>
</div>
<table>
<tr>
    <th>类型</th><th>概率</th><th>院校名称</th><th>办学性质</th>
    <th>专业名称</th><th>计划数</th><th>选科要求</th>
    <th>预测分数</th><th>省份</th><th>城市</th><th>就业方向</th>
</tr>
{rows_html}
</table>
<div class="footer">
    硕博教育咨询师专用系统 v1.3 | 山东高考志愿填报系统<br>
    本数据仅供参考，最终志愿填报请以官方公布信息为准
</div>
<button class="btn-print no-print" onclick="window.print()">🖨️ 打印</button>
</body>
</html>"""
        return html


# ────────────────────────────────────────────────────────────────
# 入口
# ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    root = tk.Tk()
    App(root)
    root.mainloop()
