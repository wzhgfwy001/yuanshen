"""
服务层：数据服务和筛选服务
"""
import pandas as pd
from pathlib import Path
from typing import List, Optional, Dict
import sqlite3
import json
from datetime import datetime

from .models import Student, School, Major, MatchResult, FilterConfig


class DataService:
    """数据服务类 - 处理 Excel 导入导出和数据库操作"""
    
    def __init__(self, db_path: str = "data/excel_filter.db"):
        """初始化数据服务"""
        self.db_path = db_path
        self.schools: List[Major] = []  # 学校专业数据
        self.students: List[Student] = []  # 学生数据
        self.results: List[MatchResult] = []  # 筛选结果
        
        # 确保数据目录存在
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        
        # 初始化数据库
        self._init_database()
    
    def _init_database(self):
        """初始化数据库表结构"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 创建学校表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schools (
                school_id TEXT PRIMARY KEY,
                school_name TEXT NOT NULL,
                province TEXT NOT NULL,
                city TEXT NOT NULL,
                level TEXT NOT NULL,
                type TEXT NOT NULL
            )
        ''')
        
        # 创建专业表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS majors (
                major_id TEXT PRIMARY KEY,
                school_id TEXT NOT NULL,
                school_name TEXT NOT NULL,
                major_name TEXT NOT NULL,
                major_category TEXT NOT NULL,
                subject_requirement TEXT NOT NULL,
                subject_required TEXT,
                subject_optional TEXT,
                year INTEGER NOT NULL,
                min_score REAL NOT NULL,
                min_rank INTEGER NOT NULL,
                avg_score REAL,
                enrollment_count INTEGER,
                tuition REAL,
                FOREIGN KEY (school_id) REFERENCES schools(school_id)
            )
        ''')
        
        # 创建学生表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS students (
                student_id TEXT PRIMARY KEY,
                student_name TEXT NOT NULL,
                category TEXT NOT NULL,
                subjects TEXT NOT NULL,
                total_score REAL NOT NULL,
                rank INTEGER NOT NULL,
                province TEXT NOT NULL,
                preference_province TEXT,
                preference_level TEXT,
                preference_major TEXT
            )
        ''')
        
        # 创建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_majors_school ON majors(school_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_majors_score ON majors(min_score)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_majors_rank ON majors(min_rank)')
        
        conn.commit()
        conn.close()
    
    def import_schools_excel(self, file_path: str) -> bool:
        """导入学校专业 Excel 文件"""
        try:
            df = pd.read_excel(file_path)
            
            # 清空现有数据
            self.schools = []
            
            # 解析每一行
            for _, row in df.iterrows():
                major = Major(
                    major_id=str(row.get('major_id', '')),
                    school_id=str(row.get('school_id', '')),
                    school_name=str(row.get('school_name', '')),
                    major_name=str(row.get('major_name', '')),
                    major_category=str(row.get('major_category', '')),
                    subject_requirement=str(row.get('subject_requirement', '')),
                    subject_required=self._parse_subjects(row.get('subject_required', '')),
                    subject_optional=self._parse_subjects(row.get('subject_optional', '')),
                    year=int(row.get('year', 2025)),
                    min_score=float(row.get('min_score', 0)),
                    min_rank=int(row.get('min_rank', 0)),
                    avg_score=float(row.get('avg_score', 0)) if pd.notna(row.get('avg_score')) else 0,
                    enrollment_count=int(row.get('enrollment_count', 0)) if pd.notna(row.get('enrollment_count')) else 0,
                    tuition=float(row.get('tuition', 0)) if pd.notna(row.get('tuition')) else 0
                )
                self.schools.append(major)
            
            # 保存到数据库
            self._save_schools_to_db()
            
            return True
        except Exception as e:
            print(f"导入学校数据失败：{e}")
            return False
    
    def import_students_excel(self, file_path: str) -> bool:
        """导入学生信息 Excel 文件"""
        try:
            df = pd.read_excel(file_path)
            
            # 清空现有数据
            self.students = []
            
            # 解析每一行
            for _, row in df.iterrows():
                student = Student(
                    student_id=str(row.get('student_id', '')),
                    student_name=str(row.get('student_name', '')),
                    category=str(row.get('category', '物理类')),
                    subjects=self._parse_subjects(row.get('subjects', '')),
                    total_score=float(row.get('total_score', 0)),
                    rank=int(row.get('rank', 0)),
                    province=str(row.get('province', '')),
                    preference_province=self._parse_subjects(row.get('preference_province', '')),
                    preference_level=self._parse_subjects(row.get('preference_level', '')),
                    preference_major=self._parse_subjects(row.get('preference_major', ''))
                )
                self.students.append(student)
            
            # 保存到数据库
            self._save_students_to_db()
            
            return True
        except Exception as e:
            print(f"导入学生数据失败：{e}")
            return False
    
    def _parse_subjects(self, value) -> List[str]:
        """解析科目字段"""
        if pd.isna(value) or value == '':
            return []
        if isinstance(value, list):
            return value
        return [s.strip() for s in str(value).split(',') if s.strip()]
    
    def _save_schools_to_db(self):
        """保存学校数据到数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 清空表
        cursor.execute('DELETE FROM majors')
        cursor.execute('DELETE FROM schools')
        
        # 插入学校数据
        schools_set = set()
        for major in self.schools:
            if major.school_id not in schools_set:
                cursor.execute('''
                    INSERT OR REPLACE INTO schools (school_id, school_name, province, city, level, type)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (major.school_id, major.school_name, '', '', major.level, ''))
                schools_set.add(major.school_id)
            
            # 插入专业数据
            cursor.execute('''
                INSERT OR REPLACE INTO majors 
                (major_id, school_id, school_name, major_name, major_category, 
                 subject_requirement, subject_required, subject_optional, 
                 year, min_score, min_rank, avg_score, enrollment_count, tuition)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                major.major_id, major.school_id, major.school_name, major.major_name,
                major.major_category, major.subject_requirement,
                ','.join(major.subject_required), ','.join(major.subject_optional),
                major.year, major.min_score, major.min_rank,
                major.avg_score, major.enrollment_count, major.tuition
            ))
        
        conn.commit()
        conn.close()
    
    def _save_students_to_db(self):
        """保存学生数据到数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 清空表
        cursor.execute('DELETE FROM students')
        
        # 插入学生数据
        for student in self.students:
            cursor.execute('''
                INSERT OR REPLACE INTO students 
                (student_id, student_name, category, subjects, total_score, rank, province,
                 preference_province, preference_level, preference_major)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                student.student_id, student.student_name, student.category,
                ','.join(student.subjects), student.total_score, student.rank, student.province,
                ','.join(student.preference_province), ','.join(student.preference_level),
                ','.join(student.preference_major)
            ))
        
        conn.commit()
        conn.close()
    
    def search_schools(self, keyword: str) -> List[Dict[str, str]]:
        """
        搜索学校
        
        Args:
            keyword: 搜索关键词
        
        Returns:
            匹配的学校列表 [{school_id, school_name, province, level}, ...]
        """
        if not keyword or len(keyword) < 1:
            return []
        
        keyword_lower = keyword.lower()
        seen = set()
        results = []
        
        for major in self.schools:
            school_key = (major.school_id, major.school_name)
            if school_key in seen:
                continue
            
            if (keyword_lower in major.school_name.lower() or 
                keyword_lower in major.school_id.lower()):
                results.append({
                    'school_id': major.school_id,
                    'school_name': major.school_name,
                    'province': getattr(major, 'province', ''),
                    'level': getattr(major, 'level', '')
                })
                seen.add(school_key)
                if len(results) >= 20:  # 限制返回数量
                    break
        
        return results

    def get_all_school_names(self) -> List[str]:
        """获取所有学校名称（去重）"""
        seen = set()
        result = []
        for major in self.schools:
            if major.school_name and major.school_name not in seen:
                result.append(major.school_name)
                seen.add(major.school_name)
        return sorted(result)

    def export_results(self, results: List[MatchResult], file_path: str) -> bool:
        """导出筛选结果到 Excel"""
        try:
            data = []
            for r in results:
                d = r.to_dict()
                d['学校名称'] = d.pop('school_name', '')
                d['专业名称'] = d.pop('major_name', '')
                d['匹配类型'] = d.pop('match_type', '')
                d['分数差'] = d.pop('score_gap', 0)
                d['往年最低分'] = d.pop('min_score', 0)
                d['往年最低排名'] = d.pop('min_rank', 0)
                d['学生姓名'] = d.pop('student_name', '')
                data.append(d)
            
            df = pd.DataFrame(data)
            # 重新排列列顺序
            columns = ['学生姓名', '学校名称', '专业名称', '匹配类型', '分数差', '往年最低分', '往年最低排名']
            df = df[[c for c in columns if c in df.columns]]
            df.to_excel(file_path, index=False, engine='openpyxl')
            return True
        except Exception as e:
            print(f"导出结果失败：{e}")
            return False

    def export_to_pdf(self, results: List[MatchResult], file_path: str, student_name: str = "") -> bool:
        """导出筛选结果到 PDF"""
        try:
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.lib import colors
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.units import cm
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            import os
            
            # 尝试注册中文字体
            font_paths = [
                "C:/Windows/Fonts/simhei.ttf",
                "C:/Windows/Fonts/msyh.ttc",
                "C:/Windows/Fonts/simsun.ttc",
                "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
                "/System/Library/Fonts/PingFang.ttc",
            ]
            
            font_registered = False
            for fp in font_paths:
                if os.path.exists(fp):
                    try:
                        pdfmetrics.registerFont(TTFont('ChineseFont', fp))
                        font_registered = True
                        break
                    except:
                        continue
            
            if not font_registered:
                print("警告：未找到中文字体，PDF中文可能显示异常")
            
            doc = SimpleDocTemplate(
                file_path,
                pagesize=landscape(A4),
                rightMargin=1*cm, leftMargin=1*cm,
                topMargin=1*cm, bottomMargin=1*cm
            )
            
            elements = []
            styles = getSampleStyleSheet()
            
            # 标题
            title_style = ParagraphStyle(
                'ChineseTitle',
                parent=styles['Title'],
                fontName='ChineseFont' if font_registered else 'Helvetica',
                fontSize=18,
                spaceAfter=20
            )
            
            header_style = ParagraphStyle(
                'ChineseHeader',
                parent=styles['Normal'],
                fontName='ChineseFont' if font_registered else 'Helvetica',
                fontSize=14,
                spaceAfter=10
            )
            
            title_text = f"高考志愿筛选结果"
            if student_name:
                title_text += f" - {student_name}"
            elements.append(Paragraph(title_text, title_style))
            
            # 统计信息
            chong = len([r for r in results if r.match_type == '冲'])
            wen = len([r for r in results if r.match_type == '稳'])
            bao = len([r for r in results if r.match_type == '保'])
            
            stats_text = f"共 {len(results)} 条结果 | 冲：{chong} | 稳：{wen} | 保：{bao}"
            elements.append(Paragraph(stats_text, header_style))
            elements.append(Spacer(1, 0.5*cm))
            
            # 表格数据
            table_data = [['序号', '学校名称', '专业名称', '类型', '分数差', '往年最低分', '往年最低排名']]
            
            for i, r in enumerate(results[:200], 1):  # PDF最多显示200条
                table_data.append([
                    str(i),
                    r.school_name[:20],
                    r.major_name[:15],
                    r.match_type,
                    f"{r.score_gap:+.1f}",
                    str(int(r.min_score)),
                    str(r.min_rank)
                ])
            
            col_widths = [1.5*cm, 5*cm, 4*cm, 1.5*cm, 2*cm, 2.5*cm, 2.5*cm]
            
            table = Table(table_data, colWidths=col_widths)
            
            style = TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, -1), 'ChineseFont' if font_registered else 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
            ])
            
            # 类型颜色
            type_colors = {'冲': colors.HexColor('#ef4444'), '稳': colors.HexColor('#16a34a'), '保': colors.HexColor('#2563eb')}
            for i, r in enumerate(results[:200], 1):
                if r.match_type in type_colors:
                    style.add('TEXTCOLOR', (3, i), (3, i), type_colors[r.match_type])
            
            table.setStyle(style)
            elements.append(table)
            
            # 页脚
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontName='ChineseFont' if font_registered else 'Helvetica',
                fontSize=8,
                textColor=colors.grey
            )
            elements.append(Spacer(1, 1*cm))
            from datetime import datetime
            footer_text = f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Excel筛选查找器 v1.3"
            elements.append(Paragraph(footer_text, footer_style))
            
            doc.build(elements)
            return True
        except ImportError:
            print(f"PDF导出需要 reportlab 库：pip install reportlab")
            return False
        except Exception as e:
            print(f"PDF导出失败：{e}")
            return False

    def save_history(self, student: Student, results: List[MatchResult], config: FilterConfig) -> bool:
        """保存筛选历史到数据库"""
        try:
            import sqlite3
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS filter_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT,
                    student_name TEXT,
                    student_score REAL,
                    student_rank INTEGER,
                    config_json TEXT,
                    results_count INTEGER,
                    created_at TEXT
                )
            ''')
            
            cursor.execute('''
                INSERT INTO filter_history 
                (student_id, student_name, student_score, student_rank, config_json, results_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                student.student_id,
                student.student_name,
                student.total_score,
                student.rank,
                json.dumps(config.to_dict(), ensure_ascii=False),
                len(results),
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"保存历史失败：{e}")
            return False

    def load_history(self, limit: int = 10) -> List[Dict]:
        """加载筛选历史"""
        try:
            import sqlite3
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, student_name, student_score, student_rank, results_count, created_at
                FROM filter_history
                ORDER BY id DESC
                LIMIT ?
            ''', (limit,))
            
            rows = cursor.fetchall()
            conn.close()
            
            return [
                {
                    'id': r[0],
                    'student_name': r[1],
                    'student_score': r[2],
                    'student_rank': r[3],
                    'results_count': r[4],
                    'created_at': r[5]
                }
                for r in rows
            ]
        except Exception as e:
            print(f"加载历史失败：{e}")
            return []
    
    def get_all_majors(self) -> List[Major]:
        """获取所有专业数据"""
        return self.schools
    
    def get_all_students(self) -> List[Student]:
        """获取所有学生数据"""
        return self.students
    
    def save_filter_template(self, name: str, config: FilterConfig) -> bool:
        """保存筛选模板"""
        try:
            template_file = Path("data/templates") / f"{name}.json"
            template_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(template_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'name': name,
                    'config': config.to_dict(),
                    'created_at': datetime.now().isoformat()
                }, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception as e:
            print(f"保存模板失败：{e}")
            return False
    
    def load_filter_template(self, name: str) -> Optional[FilterConfig]:
        """加载筛选模板"""
        try:
            template_file = Path("data/templates") / f"{name}.json"
            if not template_file.exists():
                return None
            
            with open(template_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return FilterConfig.from_dict(data['config'])
        except Exception as e:
            print(f"加载模板失败：{e}")
            return None


class FilterService:
    """筛选服务类 - 核心筛选逻辑"""
    
    def __init__(self, data_service: DataService):
        """初始化筛选服务"""
        self.data_service = data_service
    
    def filter(self, student: Student, config: FilterConfig) -> List[MatchResult]:
        """
        执行筛选
        
        Args:
            student: 学生信息
            config: 筛选配置
        
        Returns:
            匹配结果列表
        """
        results = []
        majors = self.data_service.get_all_majors()
        
        for major in majors:
            # 1. 选科匹配
            if not self._match_subjects(student.subjects, major.subject_required, major.subject_optional):
                continue
            
            # 2. 计算匹配类型
            tier, score_gap, rank_gap = self._calculate_tier(
                student.total_score, major.min_score,
                student.rank, major.min_rank
            )
            
            if tier == '不匹配':
                continue
            
            # 3. 应用筛选条件
            if not self._apply_filters(major, config, tier):
                continue
            
            # 4. 添加结果
            result = MatchResult(
                student_id=student.student_id,
                student_name=student.student_name,
                school_id=major.school_id,
                school_name=major.school_name,
                major_id=major.major_id,
                major_name=major.major_name,
                match_type=tier,
                score_gap=score_gap,
                rank_gap=rank_gap,
                min_score=major.min_score,
                min_rank=major.min_rank
            )
            results.append(result)
        
        # 5. 排序（冲稳保顺序，然后按分数差距）
        tier_order = {'冲': 0, '稳': 1, '保': 2}
        results.sort(key=lambda x: (tier_order.get(x.match_type, 3), -x.score_gap))
        
        return results
    
    def _match_subjects(self, student_subjects: List[str], 
                       required: List[str], 
                       optional: List[str]) -> bool:
        """
        选科匹配算法
        
        Args:
            student_subjects: 学生选科
            required: 必选科目
            optional: 可选科目
        
        Returns:
            是否匹配
        """
        # 必选科目必须全部满足
        if required:
            for subj in required:
                if subj not in student_subjects:
                    return False
        
        # 可选科目：至少选一科（如果有要求）
        if optional:
            has_optional = any(subj in student_subjects for subj in optional)
            if not has_optional:
                return False
        
        return True
    
    def _calculate_tier(self, student_score: float, admit_score: float,
                       student_rank: int, admit_rank: int):
        """
        冲稳保划分算法
        
        Returns:
            (tier, score_gap, rank_gap)
        """
        score_gap = student_score - admit_score
        rank_gap = admit_rank - student_rank  # 排名越小越好
        
        # 优先按排名判断（更准确）
        if rank_gap >= 1000:  # 排名领先 1000 名以上
            return '保', score_gap, rank_gap
        elif rank_gap >= 0:   # 排名领先
            return '稳', score_gap, rank_gap
        elif rank_gap >= -500:  # 排名落后 500 名以内
            return '冲', score_gap, rank_gap
        else:
            return '不匹配', score_gap, rank_gap
    
    def _apply_filters(self, major: Major, config: FilterConfig, tier: str) -> bool:
        """
        应用筛选条件
        
        Args:
            major: 专业信息
            config: 筛选配置
            tier: 匹配类型
        
        Returns:
            是否符合条件
        """
        # 检查匹配类型
        if tier == '冲' and not config.include_tier_chong:
            return False
        if tier == '稳' and not config.include_tier_wen:
            return False
        if tier == '保' and not config.include_tier_bao:
            return False
        
        # 检查分数范围
        if major.min_score < config.score_min or major.min_score > config.score_max:
            return False
        
        # 检查地域
        if config.provinces and major.school_name:  # 这里需要省份信息
            # TODO: 需要从学校表获取省份
            pass
        
        # 检查学校层次
        if config.levels and major.level not in config.levels:
            return False
        
        # 检查专业类别
        if config.categories and major.major_category not in config.categories:
            return False
        
        return True
    
    def batch_filter(self, students: List[Student], config: FilterConfig) -> Dict[str, List[MatchResult]]:
        """
        批量筛选
        
        Args:
            students: 学生列表
            config: 筛选配置
        
        Returns:
            {student_id: results}
        """
        results_dict = {}
        for student in students:
            results = self.filter(student, config)
            results_dict[student.student_id] = results
        return results_dict
