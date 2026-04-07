# -*- coding: utf-8 -*-
"""
山东高考志愿填报系统 - 专科版
硕博教育咨询师专用
"""
import os, sys, tkinter as tk
from tkinter import ttk, messagebox
import pandas as pd, threading

class App:
    def __init__(self, root):
        self.root = root
        self.root.title("山东专科志愿填报系统")
        self.root.geometry("1200x800")
        self.root.configure(bg='#f0f4f8')
        self.root.resizable(True, True)
        
        self.df = None
        self.filtered_df = None
        self.page_size = 20
        self.current_page = 1
        
        self.main_vars = {}
        self.ele_vars = {}
        self.ele_entries = {}
        self.subject_vars = {}  # 选科筛选
        
        self._create_ui()
        self._load_data()
    
    def _create_ui(self):
        title_frame = tk.Frame(self.root, bg='#e65100')
        title_frame.pack(fill='x')
        tk.Label(title_frame, text="山东专科志愿填报系统", font=("微软雅黑", 16, "bold"), bg='#e65100', fg='white', pady=8).pack()
        tk.Label(title_frame, text="✦ 硕博教育咨询师专用 ✦", font=("微软雅黑", 9), bg='#e65100', fg='#ffcc80', pady=3).pack()
        
        main = tk.Frame(self.root, bg='#f0f4f8')
        main.pack(fill='both', expand=True, padx=10, pady=8)
        
        # 左侧
        left = tk.Frame(main, bg='#f8f9fa', padx=12, pady=10)
        left.pack(side='left', fill='y', padx=(0, 10))
        
        tk.Label(left, text="📊 分数输入", font=("微软雅黑", 11, "bold"), bg='#f8f9fa', fg='#e65100').pack(anchor='w')
        
        # 主科
        m_f = tk.LabelFrame(left, text="语数外 (满分450)", font=("微软雅黑", 9), bg='white', padx=6, pady=4)
        m_f.pack(fill='x', pady=4)
        for subj in ["语文", "数学", "英语"]:
            f = tk.Frame(m_f, bg='white')
            f.pack(anchor='w', pady=1)
            tk.Label(f, text=f"{subj}:", font=("微软雅黑", 9), bg='white', width=3).pack(side='left')
            v = tk.StringVar(value="120")
            self.main_vars[subj] = v
            tk.Entry(f, textvariable=v, width=5, font=("微软雅黑", 10), justify='center', bg='#fff3e0').pack(side='left', padx=2)
            tk.Label(f, text="/150", font=("微软雅黑", 8), bg='white', fg='gray').pack(side='left')
        
        # 选科
        e_f = tk.LabelFrame(left, text="选考科目 (6选3,满分300)", font=("微软雅黑", 9), bg='white', padx=6, pady=4)
        e_f.pack(fill='x', pady=0)
        
        electives = ["物理", "历史", "化学", "生物", "政治", "地理"]
        for i, subj in enumerate(electives):
            f = tk.Frame(e_f, bg='white')
            f.pack(anchor='w', pady=1)
            v = tk.BooleanVar(value=False)
            self.ele_vars[subj] = v
            tk.Checkbutton(f, text=subj, variable=v, font=("微软雅黑", 9), bg='white').pack(side='left')
            ev = tk.StringVar(value="0")
            self.ele_entries[subj] = ev
            tk.Entry(f, textvariable=ev, width=4, font=("微软雅黑", 10), justify='center', bg='#fff8e1').pack(side='left', padx=2)
            tk.Label(f, text="/100", font=("微软雅黑", 7), bg='white', fg='gray').pack(side='left')
        
        self.hint = tk.Label(left, text="已选: 0/3科", font=("微软雅黑", 8), bg='white', fg='red')
        self.hint.pack(anchor='w', pady=2)
        
        # 总分
        t_f = tk.Frame(left, bg='#e65100', pady=6, padx=8)
        t_f.pack(fill='x', pady=6)
        self.total_l = tk.Label(t_f, text="总分: 0", font=("微软雅黑", 14, "bold"), bg='#e65100', fg='white', anchor='center')
        self.total_l.pack(fill='x')
        
        tk.Button(left, text="计算总分", font=("微软雅黑", 9, "bold"), bg='#4caf50', fg='white', pady=4, command=self._calc).pack(fill='x', pady=0)
        
        tk.Label(left, text="🔍 筛选条件", font=("微软雅黑", 11, "bold"), bg='#f8f9fa', fg='#e65100').pack(anchor='w', pady=6)
        
        # 选科筛选
        sf = tk.LabelFrame(left, text="选科要求", font=("微软雅黑", 9), bg='white', padx=6, pady=4)
        sf.pack(fill='x', pady=0)
        self.subject_vars = {}
        self.subject_cbs = {}
        for subj in ["不限", "物理", "化学", "生物", "政治", "历史", "地理"]:
            v = tk.BooleanVar(value=False)
            self.subject_vars[subj] = v
            cb = tk.Checkbutton(sf, text=subj, variable=v, font=("微软雅黑", 8), bg='white', command=lambda s=subj: self._on_subject_toggle(s))
            cb.pack(side='left', padx=2)
            self.subject_cbs[subj] = cb
        self.subject_vars["不限"].set(False)  # 默认不选中
        self.subject_hint = tk.Label(sf, text="", font=("微软雅黑", 8), bg='white', fg='gray')
        self.subject_hint.pack(anchor='w', pady=2)
        
        frm = tk.Frame(left, bg='white')
        frm.pack(fill='x')
        
        tk.Label(frm, text="省份:", font=("微软雅黑", 9), bg='#f8f9fa').grid(row=0, column=0, sticky='nw', pady=2)
        pf = tk.Frame(frm, bg='#f8f9fa')
        pf.grid(row=0, column=1, sticky='w', pady=2, padx=4)
        self.pv = {}
        pros = ["山东", "北京", "上海", "云南", "内蒙古", "吉林", "四川", "天津", "宁夏", "安徽", "山西", "广东", "广西", "新疆", "江苏", "江西", "河北", "河南", "浙江", "海南", "湖北", "湖南", "甘肃", "福建", "西藏", "贵州", "辽宁", "重庆", "陕西", "青海"]
        for i, p in enumerate(pros):
            v = tk.BooleanVar(value=False)
            self.pv[p] = v
            tk.Checkbutton(pf, text=p, variable=v, font=("微软雅黑", 8), bg='#f8f9fa').grid(row=i//6, column=i%6, sticky='w', padx=1, pady=1)
        
        tk.Label(frm, text="学校:", font=("微软雅黑", 9), bg='#f8f9fa').grid(row=1, column=0, sticky='nw', pady=2)
        self.sv = tk.StringVar()
        tk.Entry(frm, textvariable=self.sv, width=18, font=("微软雅黑", 9)).grid(row=1, column=1, sticky='w', pady=2, padx=4)
        
        tk.Label(frm, text="专业:", font=("微软雅黑", 9), bg='#f8f9fa').grid(row=2, column=0, sticky='nw', pady=2)
        self.mv = tk.StringVar()
        tk.Entry(frm, textvariable=self.mv, width=18, font=("微软雅黑", 9)).grid(row=2, column=1, sticky='w', pady=2, padx=4)
        
        bf = tk.Frame(left, bg='white')
        bf.pack(fill='x', pady=6)
        tk.Button(bf, text="开始筛选", font=("微软雅黑", 10, "bold"), bg='#e65100', fg='white', pady=4, command=self._filter).pack(fill='x', pady=1)
        tk.Button(bf, text="清空", font=("微软雅黑", 9), bg='#757575', fg='white', pady=3, command=self._clear).pack(fill='x', pady=1)
        tk.Button(bf, text="导出Excel", font=("微软雅黑", 9), bg='#43a047', fg='white', pady=3, command=self._export).pack(fill='x', pady=1)
        
        # 右侧
        right = tk.Frame(main, bg='white', padx=10, pady=10)
        right.pack(side='left', fill='both', expand=True)
        
        self.stats_l = tk.Label(right, text="等待筛选...", font=("微软雅黑", 12), bg='white', fg='#e65100', pady=6)
        self.stats_l.pack(fill='x')
        
        sc = tk.Frame(right, bg='#f5f5f5', pady=6, padx=8)
        sc.pack(fill='x', pady=0)
        self.cl = tk.Label(sc, text="冲刺: 0", font=("微软雅黑", 10), bg='#fff3e0', fg='#e65100', padx=8, pady=3)
        self.cl.pack(side='left', padx=3)
        self.wl = tk.Label(sc, text="稳妥: 0", font=("微软雅黑", 10), bg='#e3f2fd', fg='#0d47a1', padx=8, pady=3)
        self.wl.pack(side='left', padx=3)
        self.bl = tk.Label(sc, text="保底: 0", font=("微软雅黑", 10), bg='#e8f5e9', fg='#1b5e20', padx=8, pady=3)
        self.bl.pack(side='left', padx=3)
        
        tf = tk.Frame(right)
        tf.pack(fill='both', expand=True, pady=8)
        cols = ["类型", "概率", "院校名称", "办学性质", "专业名称", "计划数", "选科要求", "预测分数", "省份", "城市", "就业方向"]
        self.tree = ttk.Treeview(tf, columns=cols, show='headings', height=20)
        for col in cols:
            self.tree.heading(col, text=col)
            self.tree.column(col, width={"类型":45,"概率":45,"院校名称":95,"办学性质":55,"专业名称":120,"计划数":45,"选科要求":70,"预测分数":50,"省份":45,"城市":50,"就业方向":70}[col], anchor='center', minwidth=40)
        sy = ttk.Scrollbar(tf, orient='vertical', command=self.tree.yview)
        self.tree.configure(yscrollcommand=sy.set)
        self.tree.pack(side='left', fill='both', expand=True)
        sy.pack(side='right', fill='y')
        
        pf = tk.Frame(right, bg='white')
        pf.pack(fill='x', pady=4)
        self.prev = tk.Button(pf, text="上一页", font=("微软雅黑", 9), command=self._prev, state='disabled', bg='#9e9e9e', fg='white')
        self.prev.pack(side='left', padx=8)
        self.page_l = tk.Label(pf, text="0 / 0 页", font=("微软雅黑", 10), bg='white')
        self.page_l.pack(side='left', padx=8)
        self.next = tk.Button(pf, text="下一页", font=("微软雅黑", 9), command=self._next, state='disabled', bg='#e65100', fg='white')
        self.next.pack(side='left', padx=8)
        
        self.st = tk.Label(self.root, text="就绪", font=("微软雅黑", 8), bg='#f5f5f5', fg='gray', anchor='w')
        self.st.pack(fill='x', padx=10, pady=2)
    
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
            self.total_l.config(text=f"总分: {total}")
            self.hint.config(text=f"已选: 3/3科", fg='green')
            if hasattr(self, 'subject_cbs'):
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
    
    def _load_data(self):
        self.st.config(text="加载中...")
        def load():
            try:
                path = r'E:\硕博教育\数据库\2025年\百年硕博咨询师专用（山东专科）.xlsx'
                if not os.path.exists(path):
                    messagebox.showerror("错误", f"专科数据文件不存在!\n{path}"); return
                self.df = pd.read_excel(path, sheet_name=0)
                # 重命名列以统一处理
                self.df.rename(columns={
                    '25预测最低分': '预测分数',
                    '25选科': '选科要求',
                    '25计划数': '计划数'
                }, inplace=True)
                self.st.config(text=f"加载完成: {len(self.df)} 条")
                messagebox.showinfo("成功", f"专科数据加载完成\n{len(self.df)} 条")
            except Exception as e:
                self.st.config(text=f"加载失败: {str(e)[:50]}")
                messagebox.showerror("错误", f"加载失败!\n{str(e)}")
        threading.Thread(target=load, daemon=True).start()
    
    def _filter(self):
        if self.df is None: messagebox.showwarning("提示", "数据加载中..."); return
        try:
            total = sum(int(self.main_vars[s].get() or 0) for s in self.main_vars)
            selected = [s for s in self.ele_vars if self.ele_vars[s].get()]
            for s in selected: total += int(self.ele_entries[s].get() or 0)
            if len(selected) != 3: messagebox.showwarning("提示", f"选3科!"); return
            
            df = self.df.copy()
            pros = [k for k, v in self.pv.items() if v.get()]
            if pros: df = df[df['省份'].isin(pros)]
            if self.sv.get().strip(): df = df[df['院校名称'].fillna('').str.contains(self.sv.get(), case=False)]
            if self.mv.get().strip(): df = df[df['专业名称'].fillna('').str.contains(self.mv.get(), case=False)]
            
            # 选科筛选
            selected_subjects = [s for s in self.subject_vars if self.subject_vars[s].get() and s != "不限"]
            if selected_subjects:
                pattern = '|'.join(selected_subjects)
                df = df[df['选科要求'].fillna('').str.contains(pattern, regex=True)]
            else:
                if self.subject_vars["不限"].get():
                    df = df[df['选科要求'].isna() | (df['选科要求'].str.strip() == '') | (df['选科要求'] == '不限')]
            
            results = {'冲刺': [], '稳妥': [], '保底': []}
            for _, r in df.iterrows():
                p = r.get('预测分数', 0)
                if pd.isna(p) or p == 0: continue
                d = total - p
                
                if d < -30:
                    continue
                elif d < -10:
                    prob = 30 + (30 + d) * (20/20)
                    prob = max(30, min(50, prob))
                    req = r.get('选科要求', '')
                    nature = r.get('办学性质', '')
                    plan = r.get('计划数', '')
                    job = r.get('就业方向', '')
                    if pd.isna(req): req = ''
                    if pd.isna(nature): nature = ''
                    if pd.isna(plan): plan = ''
                    if pd.isna(job): job = ''
                    results['冲刺'].append({'类型':'冲刺','概率':f"{prob:.0f}%",'院校名称':str(r.get('院校名称',''))[:18],'办学性质':str(nature)[:10],'专业名称':str(r.get('专业名称',''))[:28],'计划数':str(plan),'选科要求':str(req)[:18],'预测分数':f"{p:.0f}",'省份':str(r.get('省份','')),'城市':str(r.get('城市','')),'就业方向':str(job)[:15]})
                elif d < 10:
                    if d <= 0:
                        prob = 50 + (d + 10) * (20/10)
                    else:
                        prob = 70 - d * (20/10)
                    prob = max(50, min(70, prob))
                    req = r.get('选科要求', '')
                    nature = r.get('办学性质', '')
                    plan = r.get('计划数', '')
                    job = r.get('就业方向', '')
                    if pd.isna(req): req = ''
                    if pd.isna(nature): nature = ''
                    if pd.isna(plan): plan = ''
                    if pd.isna(job): job = ''
                    results['稳妥'].append({'类型':'稳妥','概率':f"{prob:.0f}%",'院校名称':str(r.get('院校名称',''))[:18],'办学性质':str(nature)[:10],'专业名称':str(r.get('专业名称',''))[:28],'计划数':str(plan),'选科要求':str(req)[:18],'预测分数':f"{p:.0f}",'省份':str(r.get('省份','')),'城市':str(r.get('城市','')),'就业方向':str(job)[:15]})
                elif d <= 25:
                    prob = 70 + (d - 10) * (30/15)
                    prob = max(70, min(100, prob))
                    req = r.get('选科要求', '')
                    nature = r.get('办学性质', '')
                    plan = r.get('计划数', '')
                    job = r.get('就业方向', '')
                    if pd.isna(req): req = ''
                    if pd.isna(nature): nature = ''
                    if pd.isna(plan): plan = ''
                    if pd.isna(job): job = ''
                    results['保底'].append({'类型':'保底','概率':f"{prob:.0f}%",'院校名称':str(r.get('院校名称',''))[:18],'办学性质':str(nature)[:10],'专业名称':str(r.get('专业名称',''))[:28],'计划数':str(plan),'选科要求':str(req)[:18],'预测分数':f"{p:.0f}",'省份':str(r.get('省份','')),'城市':str(r.get('城市','')),'就业方向':str(job)[:15]})
            
            for cat in results:
                results[cat].sort(key=lambda x: int(x['概率'].replace('%','')))
            
            final = []
            for cat, target in [('冲刺', 30), ('稳妥', 50), ('保底', 20)]:
                school_count = {}
                count = 0
                for r in results[cat]:
                    if count >= target: break
                    school = r['院校名称']
                    if school_count.get(school, 0) < 3:
                        final.append(r)
                        school_count[school] = school_count.get(school, 0) + 1
                        count += 1
            
            self.filtered_df = final
            
            ch = len([r for r in self.filtered_df if r['类型']=='冲刺'])
            we = len([r for r in self.filtered_df if r['类型']=='稳妥'])
            ba = len([r for r in self.filtered_df if r['类型']=='保底'])
            self.stats_l.config(text=f"结果: {len(self.filtered_df)} 条 (总分:{total})")
            self.cl.config(text=f"冲刺: {ch}")
            self.wl.config(text=f"稳妥: {we}")
            self.bl.config(text=f"保底: {ba}")
            self.current_page = 1
            self._show_page()
        except Exception as e:
            messagebox.showerror("错误", str(e))
    
    def _show_page(self):
        for i in self.tree.get_children(): self.tree.delete(i)
        if not self.filtered_df: return
        s, e = (self.current_page-1)*self.page_size, self.current_page*self.page_size
        for r in self.filtered_df[s:e]:
            t = {'冲刺':'chong','稳妥':'wen','保底':'bao'}.get(r['类型'],'')
            self.tree.insert('', 'end', values=(r['类型'],r['概率'],r['院校名称'],r.get('办学性质',''),r['专业名称'],r.get('计划数',''),r.get('选科要求',''),r['预测分数'],r['省份'],r['城市'],r.get('就业方向','')), tags=t)
        self.tree.tag_configure('chong', background='#fff3e0')
        self.tree.tag_configure('wen', background='#e3f2fd')
        self.tree.tag_configure('bao', background='#e8f5e9')
        tp = max(1, (len(self.filtered_df)+self.page_size-1)//self.page_size)
        self.page_l.config(text=f"{self.current_page} / {tp} 页")
        self.prev.config(state='normal' if self.current_page>1 else 'disabled', bg='#9e9e9e' if self.current_page<=1 else '#e65100')
        self.next.config(state='normal' if self.current_page<tp else 'disabled', bg='#9e9e9e' if self.current_page>=tp else '#e65100')
    
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
        for v in self.pv.values(): v.set(False)
        self.sv.set(""); self.mv.set("")
        self.total_l.config(text="总分: 0")
        self.hint.config(text="已选: 0/3科", fg='red')
        for i in self.tree.get_children(): self.tree.delete(i)
        self.stats_l.config(text="等待筛选...")
        self.cl.config(text="冲刺: 0"); self.wl.config(text="稳妥: 0"); self.bl.config(text="保底: 0")
        self.page_l.config(text="0 / 0 页")
    
    def _export(self):
        if not self.filtered_df: messagebox.showwarning("提示", "无数据!"); return
        try:
            from tkinter import filedialog
            fp = filedialog.asksaveasfilename(defaultextension=".xlsx", filetypes=[("Excel", "*.xlsx")])
            if fp:
                pd.DataFrame(self.filtered_df).to_excel(fp, index=False)
                messagebox.showinfo("成功", "已导出")
        except Exception as e:
            messagebox.showerror("错误", str(e))

if __name__ == "__main__":
    root = tk.Tk()
    App(root)
    root.mainloop()
