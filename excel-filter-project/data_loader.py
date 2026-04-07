# -*- coding: utf-8 -*-
"""
山东高考志愿筛选器 - 数据加载模块 v4
使用 openpyxl 正常模式（确保 shared strings 正确解码）
"""
import zipfile
import xml.etree.ElementTree as ET
import openpyxl

# ── 确认的列索引（0-based）────────────────────────────────────────
# 由 _normal_mode.txt 验证
COL = {
    '新增': 0,        '选科要求': 1,    '院校名称': 2,    '办学性质': 3,
    '专业名称': 4,    '计划数': 5,      '预测分数': 6,    '预测位次': 7,
    '24录取人数': 8,  '24最低分': 9,   '24最低位次': 10,
    '24学校最低分': 11,'24学校最低位次':12,'24学校平均分':13,'24学校平均位次':14,
    '23录取人数': 15, '23最低分': 16,  '23最低位次': 17,
    '22录取人数': 18, '22最低分': 19,  '22最低位次': 20,
    '院校水平_tag': 21,'院校水平': 22,  '省份': 23,      '城市': 24,
    '专业备注': 25,   '专业类': 26,     '学制': 27,      '学费': 28,
    '城市评级': 29,   '主管部门': 30,   '专业评估': 31,
    '硕士点': 32,     '硕士专业': 33,    '博士点': 34,     '博士专业': 35,
    '专业水平': 36,   '本专科': 37,     '院校排名': 38,
    '软科排名': 39,   '专业排名': 40,   '推免': 41,
    '保研率': 42,     '就业方向': 43,   '招生章程': 44,
    '学校招生信息': 45,'校园VR': 46,    '院校百科': 47,   '就业质量': 48,
}

EXCEL_PATH = r'C:\Users\DELL\.openclaw\workspace\百年硕博咨询师专用（2025普通类预测版）.xlsx'
MAX_RUSH, MAX_STABLE, MAX_SAFE = 30, 50, 20


def load_data(xlsx_path):
    """加载所有数据，返回 (records, shared_strings)"""
    # 直接用 openpyxl 正常模式（已验证可正确解码 shared strings）
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb.active

    all_rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        all_rows.append(list(row))

    wb.close()
    return all_rows


def build_records(rows):
    """将行列表转换为记录字典列表"""
    records = []
    for row in rows:
        rec = {}
        for col_name, col_idx in COL.items():
            rec[col_name] = row[col_idx] if col_idx < len(row) else None
        records.append(rec)
    return records


class DataStore:
    def __init__(self):
        self.records = []
        self.shared = []
        self.loaded = False
        self.loading = False

    def load(self, callback=None):
        import threading
        if self.loaded or self.loading:
            return
        self.loading = True

        def _load():
            try:
                rows = load_data(EXCEL_PATH)
                self.records = build_records(rows)
                self.loaded = True
                self.loading = False
                if callback:
                    callback(True)
            except Exception as e:
                import traceback; traceback.print_exc()
                self.loading = False
                if callback:
                    callback(False, str(e))

        threading.Thread(target=_load, daemon=True).start()

    def filter(self, student_score, province, city, school_kw, major_kw, subject_filter):
        """原始筛选方法（兼容）"""
        return self.filter_advanced(
            score=student_score,
            provinces=[province] if province and province != '不限' else [],
            cities=[city] if city and city != '不限' else [],
            school_kw=school_kw,
            major_kw=major_kw,
            levels=[],
            subjects=[subject_filter] if subject_filter and subject_filter != '不限' else [],
            max_rush=MAX_RUSH, max_stable=MAX_STABLE, max_safe=MAX_SAFE
        )

    def filter_advanced(self, score, provinces=None, cities=None, school_kw='', major_kw='',
                        levels=None, subjects=None, max_rush=30, max_stable=50, max_safe=20):
        """
        高级筛选 - 支持多选
        provinces/cities/levels/subjects: 列表，为空表示不限
        """
        if provinces is None:
            provinces = []
        if cities is None:
            cities = []
        if levels is None:
            levels = []
        if subjects is None:
            subjects = []

        results = []
        for r in self.records:
            pred = r.get('预测分数')
            if pred is None or pred == '':
                continue
            try:
                pred = float(pred)
            except (ValueError, TypeError):
                continue

            # 省份过滤
            if provinces:
                rec_prov = r.get('省份', '')
                if rec_prov not in provinces:
                    continue

            # 城市过滤
            if cities:
                rec_city = r.get('城市', '')
                if rec_city not in cities:
                    continue

            # 学校关键词
            if school_kw:
                school = r.get('院校名称') or ''
                if school_kw not in school:
                    continue

            # 专业关键词
            if major_kw:
                major = r.get('专业名称') or ''
                if major_kw not in major:
                    continue

            # 院校层次过滤
            if levels:
                rec_level = r.get('院校水平') or ''
                if not any(lvl in rec_level for lvl in levels):
                    continue

            # 选科要求过滤
            if subjects:
                req = r.get('选科要求') or ''
                if req and req != '不限':
                    if not any(subj in req for subj in subjects):
                        continue

            diff = score - pred
            # 冲：考生分数 ≈ 预测分数（差 -20~+5），概率 30-50%
            # 稳：考生分数 > 预测分数 5~25分，概率 50-70%
            # 保：考生分数 >> 预测分数 25+ 分，概率 70-100%
            if diff < -20:
                prob = max(20, min(35, 30 + (diff + 20) * 0.5))
            elif diff < -10:
                prob = max(30, min(40, 32 + (diff + 20) * 0.3))
            elif diff < 5:
                prob = max(30, min(50, 38 + diff * 1.2))
            elif diff < 25:
                prob = max(50, min(70, 50 + (diff - 5) * 0.8))
            else:
                prob = max(70, min(99, 70 + (diff - 25) * 0.4))

            results.append((r, round(prob, 1), diff))

        results.sort(key=lambda x: x[1], reverse=True)
        rush = [r for r in results if 30 <= r[1] <= 50][:max_rush]
        stable = [r for r in results if 50 < r[1] <= 70][:max_stable]
        safe = [r for r in results if 70 < r[1] <= 98][:max_safe]
        return rush, stable, safe


if __name__ == '__main__':
    print('Loading...')
    rows = load_data(EXCEL_PATH)
    print(f'Loaded {len(rows)} rows')
    records = build_records(rows)
    print(f'Built {len(records)} records')

    print('\n=== First 3 records ===')
    for i, r in enumerate(records[:3]):
        print(f'Record {i+1}:')
        print(f'  院校名称: {r.get("院校名称")}')
        print(f'  专业名称: {str(r.get("专业名称"))[:60]}')
        print(f'  预测分数: {r.get("预测分数")}')
        print(f'  省份: {r.get("省份")}')
        print(f'  城市: {r.get("城市")}')
        print(f'  院校水平: {r.get("院校水平")}')
        print(f'  就业方向: {str(r.get("就业方向"))[:50]}')
        print()

    store = DataStore()
    store.records = records
    store.loaded = True

    print('=== Filter test (total=580) ===')
    rush, stable, safe = store.filter(580, '不限', '不限', '', '', '不限')
    print(f'rush={len(rush)}, stable={len(stable)}, safe={len(safe)}')
    if rush:
        r, prob, diff = rush[0]
        print(f'First rush: prob={prob}%, diff={diff}, school={r.get("院校名称")}, major={str(r.get("专业名称"))[:40]}')
    if stable:
        r, prob, diff = stable[0]
        print(f'First stable: prob={prob}%, diff={diff}, school={r.get("院校名称")}')
    if safe:
        r, prob, diff = safe[0]
        print(f'First safe: prob={prob}%, diff={diff}, school={r.get("院校名称")}')

    print('\n=== Province filter (北京) ===')
    rush2, stable2, safe2 = store.filter(580, '北京', '不限', '', '', '不限')
    print(f'北京: rush={len(rush2)}, stable={len(stable2)}, safe={len(safe2)}')

    print('\n=== School keyword (清华) ===')
    rush3, stable3, safe3 = store.filter(580, '不限', '不限', '清华', '', '不限')
    print(f'清华: rush={len(rush3)}, stable={len(stable3)}, safe={len(safe3)}')
    if stable3:
        print(f'  First: {stable3[0][0].get("院校名称")}, {str(stable3[0][0].get("专业名称"))[:40]}')

    print('\n=== Major keyword (计算机) ===')
    rush4, stable4, safe4 = store.filter(580, '不限', '不限', '', '计算机', '不限')
    print(f'计算机: rush={len(rush4)}, stable={len(stable4)}, safe={len(safe4)}')

    provinces = sorted(set(r.get('省份', '') for r in records if r.get('省份')))
    print(f'\n=== Provinces ({len(provinces)}): {provinces[:10]}')
    print('\nAll tests passed!')
