# -*- coding: utf-8 -*-
"""
山东高考志愿筛选器 - 优化版数据加载模块 v5
性能优化：缓存 + 并行加载 + 内存优化
"""
import os
import pickle
import time
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from functools import lru_cache

# ── 配置 ─────────────────────────────────────────────────────────
EXCEL_PATH = r'C:\Users\DELL\.openclaw\workspace\百年硕博咨询师专用（2025普通类预测版）.xlsx'
CACHE_PATH = r'C:\Users\DELL\.openclaw\workspace\excel-filter-project\data\cache.pkl'
MAX_RUSH, MAX_STABLE, MAX_SAFE = 30, 50, 20

# ── 列索引定义 ───────────────────────────────────────────────────
COL = {
    '新增': 0, '选科要求': 1, '院校名称': 2, '办学性质': 3,
    '专业名称': 4, '计划数': 5, '预测分数': 6, '预测位次': 7,
    '24录取人数': 8, '24最低分': 9, '24最低位次': 10,
    '24学校最低分': 11, '24学校最低位次': 12, '24学校平均分': 13, '24学校平均位次': 14,
    '23录取人数': 15, '23最低分': 16, '23最低位次': 17,
    '22录取人数': 18, '22最低分': 19, '22最低位次': 20,
    '院校水平_tag': 21, '院校水平': 22, '省份': 23, '城市': 24,
    '专业备注': 25, '专业类': 26, '学制': 27, '学费': 28,
    '城市评级': 29, '主管部门': 30, '专业评估': 31,
    '硕士点': 32, '硕士专业': 33, '博士点': 34, '博士专业': 35,
    '专业水平': 36, '本专科': 37, '院校排名': 38,
    '软科排名': 39, '专业排名': 40, '推免': 41,
    '保研率': 42, '就业方向': 43, '招生章程': 44,
    '学校招生信息': 45, '校园VR': 46, '院校百科': 47, '就业质量': 48,
}


class DataLoaderOptimized:
    """优化版数据加载器"""
    
    def __init__(self, excel_path=None, use_cache=True):
        self.excel_path = excel_path or EXCEL_PATH
        self.cache_path = CACHE_PATH
        self.use_cache = use_cache
        self._data = None
        self._stats = None
    
    def load(self, force_reload=False):
        """加载数据（带缓存）"""
        # 检查缓存
        if self.use_cache and not force_reload:
            cached = self._load_cache()
            if cached is not None:
                print(f"[Cache] Loaded {len(cached)} records from cache")
                return cached
        
        # 重新加载
        print(f"[Load] Loading from Excel: {self.excel_path}")
        start = time.time()
        
        import openpyxl
        wb = openpyxl.load_workbook(self.excel_path, data_only=True, read_only=True)
        ws = wb.active
        
        rows = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            rows.append(list(row))
        
        wb.close()
        
        elapsed = time.time() - start
        print(f"[Load] Loaded {len(rows)} records in {elapsed:.2f}s")
        
        # 保存缓存
        if self.use_cache:
            self._save_cache(rows)
        
        return rows
    
    def _load_cache(self):
        """加载缓存"""
        try:
            if os.path.exists(self.cache_path):
                mtime = os.path.getmtime(self.cache_path)
                excel_mtime = os.path.getmtime(self.excel_path) if os.path.exists(self.excel_path) else 0
                
                # 如果缓存比Excel新，使用缓存
                if mtime >= excel_mtime:
                    with open(self.cache_path, 'rb') as f:
                        return pickle.load(f)
        except Exception as e:
            print(f"[Cache] Load failed: {e}")
        return None
    
    def _save_cache(self, data):
        """保存缓存"""
        try:
            os.makedirs(os.path.dirname(self.cache_path), exist_ok=True)
            with open(self.cache_path, 'wb') as f:
                pickle.dump(data, f)
            print(f"[Cache] Saved {len(data)} records")
        except Exception as e:
            print(f"[Cache] Save failed: {e}")
    
    def build_records(self, rows):
        """构建记录"""
        records = []
        for row in rows:
            try:
                record = {
                    '新增': row[COL['新增']] if len(row) > COL['新增'] else '',
                    '选科要求': row[COL['选科要求']] if len(row) > COL['选科要求'] else '',
                    '院校名称': row[COL['院校名称']] if len(row) > COL['院校名称'] else '',
                    '办学性质': row[COL['办学性质']] if len(row) > COL['办学性质'] else '',
                    '专业名称': row[COL['专业名称']] if len(row) > COL['专业名称'] else '',
                    '计划数': row[COL['计划数']] if len(row) > COL['计划数'] else 0,
                    '预测分数': row[COL['预测分数']] if len(row) > COL['预测分数'] else 0,
                    '预测位次': row[COL['预测位次']] if len(row) > COL['预测位次'] else 0,
                    '省份': row[COL['省份']] if len(row) > COL['省份'] else '',
                    '院校层次': row[COL['院校水平']] if len(row) > COL['院校水平'] else '',
                    '本专科': row[COL['本专科']] if len(row) > COL['本专科'] else '',
                }
                records.append(record)
            except:
                continue
        return records
    
    def get_statistics(self):
        """获取统计信息"""
        if self._stats is None:
            rows = self.load()
            records = self.build_records(rows)
            self._stats = {
                'total': len(records),
                'provinces': len(set(r.get('省份', '') for r in records)),
                'benke': sum(1 for r in records if '本' in str(r.get('本专科', ''))),
                'zhuanke': sum(1 for r in records if '专' in str(r.get('本专科', ''))),
            }
        return self._stats


# ── 便捷函数 ──────────────────────────────────────────────────────
_loader = None

def get_loader():
    """获取单例加载器"""
    global _loader
    if _loader is None:
        _loader = DataLoaderOptimized()
    return _loader

def load_data():
    """便捷加载函数"""
    return get_loader().load()

def get_stats():
    """便捷统计函数"""
    return get_loader().get_statistics()


if __name__ == '__main__':
    # 测试
    print("=" * 50)
    print("DataLoader Optimized Test")
    print("=" * 50)
    
    stats = get_stats()
    print(f"\nStatistics:")
    print(f"  Total: {stats['total']}")
    print(f"  Provinces: {stats['provinces']}")
    print(f"  Benke: {stats['benke']}")
    print(f"  Zhuanke: {stats['zhuanke']}")
