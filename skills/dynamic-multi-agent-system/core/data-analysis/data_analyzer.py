# 【探测宝石】Find Gems - 数据分析 v2.0
# 基于DeerFlow架构优化：结构化状态、分析管道、结果缓存

# -*- coding: utf-8 -*-
"""
Data Analyzer - 数据分析核心模块 v2.0
支持多格式文件分析、统计、可视化
基于DeerFlow优化：dataclass、结构化结果、管道钩子、缓存
"""

import os
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict
from functools import wraps

# 可选依赖
try:
    from docx import Document
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    import matplotlib.pyplot as plt
    import matplotlib
    matplotlib.use('Agg')  # 无头模式
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False


# ==================== DeerFlow借鉴: 结构化状态 ====================

@dataclass
class AnalysisMetadata:
    """分析元数据"""
    version: str = "2.0"
    analyzed_at: str = field(default_factory=lambda: datetime.now().isoformat())
    analyzer: str = "DataAnalyzer"
    duration_ms: float = 0
    cache_hit: bool = False


@dataclass
class FileAnalysisResult:
    """文件分析结果"""
    success: bool
    name: str = ""
    path: str = ""
    file_type: str = ""
    metadata: AnalysisMetadata = field(default_factory=AnalysisMetadata)
    
    # Excel/CSV specific
    rows: int = 0
    columns: int = 0
    column_names: List[str] = field(default_factory=list)
    numeric_columns: List[str] = field(default_factory=list)
    missing_values: Dict[str, int] = field(default_factory=dict)
    
    # Text specific
    lines: int = 0
    words: int = 0
    characters: int = 0
    text_preview: str = ""
    
    # PDF specific
    pages: int = 0
    
    # Word specific
    paragraphs: int = 0
    tables_count: int = 0
    
    # Error
    error: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        return result


# ==================== DeerFlow借鉴: 分析管道 ====================

class AnalysisMiddleware:
    """分析中间件基类"""
    def before_analyze(self, file_path: str, context: Dict) -> Dict:
        return context
    
    def after_analyze(self, result: FileAnalysisResult, context: Dict) -> FileAnalysisResult:
        return result


class AnalysisPipeline:
    """分析管道"""
    def __init__(self):
        self.middlewares: List[AnalysisMiddleware] = []
    
    def use(self, mw: AnalysisMiddleware) -> 'AnalysisPipeline':
        self.middlewares.append(mw)
        return self
    
    def execute(self, file_path: str, analyze_fn, *args, **kwargs) -> FileAnalysisResult:
        context = {'file_path': file_path}
        
        # BEFORE钩子
        for mw in self.middlewares:
            try:
                context = mw.before_analyze(file_path, context) or context
            except Exception as e:
                print(f"[Pipeline] before_analyze error: {e}")
        
        # 执行分析
        start_time = datetime.now()
        try:
            result = analyze_fn(file_path, *args, **kwargs)
        except Exception as e:
            result = FileAnalysisResult(success=False, error=str(e))
        
        # 计算耗时
        duration = (datetime.now() - start_time).total_seconds() * 1000
        if isinstance(result, FileAnalysisResult):
            result.metadata.duration_ms = duration
        
        # AFTER钩子
        for mw in self.middlewares:
            try:
                result = mw.after_analyze(result, context) or result
            except Exception as e:
                print(f"[Pipeline] after_analyze error: {e}")
        
        return result


# 具体中间件
class MetadataEnrichmentMiddleware(AnalysisMiddleware):
    """元数据丰富化中间件"""
    def after_analyze(self, result: FileAnalysisResult, context: Dict) -> FileAnalysisResult:
        result.metadata.analyzed_at = datetime.now().isoformat()
        result.metadata.version = "2.0"
        result.metadata.analyzer = "DataAnalyzer-v2"
        return result


class LoggingMiddleware(AnalysisMiddleware):
    """日志中间件"""
    def before_analyze(self, file_path: str, context: Dict) -> Dict:
        print(f"[DataAnalyzer] 分析文件: {file_path}")
        return context
    
    def after_analyze(self, result: FileAnalysisResult, context: Dict) -> FileAnalysisResult:
        status = "✅" if result.success else "❌"
        print(f"[DataAnalyzer] {status} {result.name}")
        return result


# ==================== DeerFlow借鉴: 结果缓存 ====================

class AnalysisCache:
    """分析结果缓存"""
    def __init__(self, ttl_seconds: int = 300):
        self._cache: Dict[str, Dict] = {}
        self._timestamps: Dict[str, float] = {}
        self.ttl = ttl_seconds
    
    def _make_key(self, file_path: str, mtime: float) -> str:
        return f"{file_path}:{mtime}"
    
    def get(self, file_path: str) -> Optional[FileAnalysisResult]:
        try:
            mtime = os.path.getmtime(file_path)
            key = self._make_key(file_path, mtime)
            
            if key in self._cache:
                import time
                if time.time() - self._timestamps[key] < self.ttl:
                    result = FileAnalysisResult(**self._cache[key])
                    result.metadata.cache_hit = True
                    return result
                else:
                    # 过期删除
                    del self._cache[key]
                    del self._timestamps[key]
        except:
            pass
        return None
    
    def set(self, file_path: str, result: FileAnalysisResult):
        try:
            mtime = os.path.getmtime(file_path)
            key = self._make_key(file_path, mtime)
            self._cache[key] = asdict(result)
            import time
            self._timestamps[key] = time.time()
        except:
            pass
    
    def clear(self):
        self._cache.clear()
        self._timestamps.clear()


# ==================== 数据分析器主类 ====================

class DataAnalyzer:
    """数据分析器主类 v2.0"""
    
    SUPPORTED_FORMATS = ['.xlsx', '.xls', '.csv', '.docx', '.pdf', '.txt', '.md', '.markdown']
    
    def __init__(self, folder_path: str = None, use_cache: bool = True):
        self.folder = Path(folder_path) if folder_path else None
        self.files = {'excel': [], 'csv': [], 'word': [], 'pdf': [], 'txt': [], 'markdown': []}
        self.analysis_results: List[FileAnalysisResult] = []
        
        # DeerFlow: 管道和缓存
        self.pipeline = AnalysisPipeline()
        self.pipeline.use(MetadataEnrichmentMiddleware())
        self.pipeline.use(LoggingMiddleware())
        
        self.cache = AnalysisCache() if use_cache else None
        
        if self.folder and self.folder.exists():
            self._scan_files()
    
    def _scan_files(self):
        """扫描文件夹中的支持的文件"""
        if not self.folder:
            return
            
        for f in self.folder.rglob('*'):
            if f.is_file():
                ext = f.suffix.lower()
                if ext in ['.xlsx', '.xls']:
                    self.files['excel'].append(str(f))
                elif ext == '.csv':
                    self.files['csv'].append(str(f))
                elif ext == '.docx':
                    self.files['word'].append(str(f))
                elif ext == '.pdf':
                    self.files['pdf'].append(str(f))
                elif ext == '.txt':
                    self.files['txt'].append(str(f))
                elif ext in ['.md', '.markdown']:
                    self.files['markdown'].append(str(f))
    
    def _create_result(self, **kwargs) -> FileAnalysisResult:
        """创建分析结果对象"""
        return FileAnalysisResult(**kwargs)
    
    def analyze_excel(self, file_path: str) -> FileAnalysisResult:
        """分析Excel文件"""
        try:
            import pandas as pd
            df = pd.read_excel(file_path)
            
            return self._create_result(
                success=True,
                name=os.path.basename(file_path),
                path=file_path,
                file_type='excel',
                rows=len(df),
                columns=len(df.columns),
                column_names=list(df.columns),
                numeric_columns=list(df.select_dtypes(include=['number']).columns),
                missing_values=df.isnull().sum().to_dict() if hasattr(df.isnull().sum(), 'to_dict') else {}
            )
        except Exception as e:
            return self._create_result(success=False, name=os.path.basename(file_path), path=file_path, file_type='excel', error=str(e))
    
    def analyze_csv(self, file_path: str, encoding: str = 'utf-8') -> FileAnalysisResult:
        """分析CSV文件"""
        try:
            import pandas as pd
            
            # 尝试不同编码
            for enc in [encoding, 'gbk', 'gb2312', 'latin1']:
                try:
                    df = pd.read_csv(file_path, encoding=enc)
                    break
                except:
                    continue
            
            return self._create_result(
                success=True,
                name=os.path.basename(file_path),
                path=file_path,
                file_type='csv',
                rows=len(df),
                columns=len(df.columns),
                column_names=list(df.columns),
                numeric_columns=list(df.select_dtypes(include=['number']).columns),
                missing_values=df.isnull().sum().to_dict() if hasattr(df.isnull().sum(), 'to_dict') else {}
            )
        except Exception as e:
            return self._create_result(success=False, name=os.path.basename(file_path), path=file_path, file_type='csv', error=str(e))
    
    def analyze_word(self, file_path: str) -> FileAnalysisResult:
        """分析Word文件"""
        if not HAS_DOCX:
            return self._create_result(success=False, name=os.path.basename(file_path), path=file_path, file_type='word', error='python-docx未安装')
        
        try:
            doc = Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            
            return self._create_result(
                success=True,
                name=os.path.basename(file_path),
                path=file_path,
                file_type='word',
                paragraphs=len(paragraphs),
                characters=sum(len(p) for p in paragraphs),
                text_preview='\n'.join(paragraphs[:10])
            )
        except Exception as e:
            return self._create_result(success=False, name=os.path.basename(file_path), path=file_path, file_type='word', error=str(e))
    
    def analyze_pdf(self, file_path: str) -> FileAnalysisResult:
        """分析PDF文件"""
        if not HAS_PYMUPDF:
            return self._create_result(success=False, name=os.path.basename(file_path), path=file_path, file_type='pdf', error='PyMuPDF未安装')
        
        try:
            doc = fitz.open(file_path)
            text = ''
            for page in doc:
                text += page.get_text()
            
            result = self._create_result(
                success=True,
                name=os.path.basename(file_path),
                path=file_path,
                file_type='pdf',
                pages=len(doc),
                characters=len(text),
                text_preview=text[:500] if text else ''
            )
            doc.close()
            return result
        except Exception as e:
            return self._create_result(success=False, name=os.path.basename(file_path), path=file_path, file_type='pdf', error=str(e))
    
    def analyze_txt(self, file_path: str, encoding: str = 'utf-8') -> FileAnalysisResult:
        """分析文本文件"""
        try:
            with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
                content = f.read()
            
            lines = content.split('\n')
            words = content.split()
            
            return self._create_result(
                success=True,
                name=os.path.basename(file_path),
                path=file_path,
                file_type='txt',
                lines=len(lines),
                words=len(words),
                characters=len(content),
                text_preview=content[:500] if content else ''
            )
        except Exception as e:
            return self._create_result(success=False, name=os.path.basename(file_path), path=file_path, file_type='txt', error=str(e))
    
    def analyze_markdown(self, file_path: str) -> FileAnalysisResult:
        """分析Markdown文件"""
        return self.analyze_txt(file_path)
    
    def analyze_file(self, file_path: str, encoding: str = 'utf-8') -> FileAnalysisResult:
        """自动检测并分析任何支持的文件（带管道和缓存）"""
        # 缓存检查
        if self.cache:
            cached = self.cache.get(file_path)
            if cached:
                return cached
        
        ext = Path(file_path).suffix.lower()
        
        # 使用管道执行分析
        if ext in ['.xlsx', '.xls']:
            result = self.pipeline.execute(file_path, self.analyze_excel)
        elif ext == '.csv':
            result = self.pipeline.execute(file_path, self.analyze_csv, encoding)
        elif ext == '.docx':
            result = self.pipeline.execute(file_path, self.analyze_word)
        elif ext == '.pdf':
            result = self.pipeline.execute(file_path, self.analyze_pdf)
        elif ext == '.txt':
            result = self.pipeline.execute(file_path, self.analyze_txt, encoding)
        elif ext in ['.md', '.markdown']:
            result = self.pipeline.execute(file_path, self.analyze_markdown)
        else:
            result = self._create_result(success=False, name=os.path.basename(file_path), path=file_path, error=f'不支持的格式: {ext}')
        
        # 缓存结果
        if self.cache and result.success:
            self.cache.set(file_path, result)
        
        return result
    
    def generate_summary(self) -> Dict[str, Any]:
        """生成分析摘要"""
        summary = {
            'total_files': 0,
            'file_count_by_type': {},
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        for ftype, flist in self.files.items():
            summary['file_count_by_type'][ftype] = len(flist)
            summary['total_files'] += len(flist)
            
            for fpath in flist:
                result = self.analyze_file(fpath)
                self.analysis_results.append(result)
                
                if result.success:
                    summary['successful'] += 1
                else:
                    summary['failed'] += 1
                    summary['errors'].append({'file': fpath, 'error': result.error})
        
        return summary
    
    def compare_files(self, file_paths: List[str]) -> Dict[str, Any]:
        """对比多个文件"""
        results = []
        for fpath in file_paths:
            result = self.analyze_file(fpath)
            results.append(result)
        
        return {
            'files_count': len(results),
            'successful': sum(1 for r in results if r.success),
            'failed': sum(1 for r in results if not r.success),
            'results': [r.to_dict() for r in results]
        }
    
    def merge_data(self, file_paths: List[str], output_path: str = None) -> Any:
        """合并多个数据文件"""
        import pandas as pd
        
        dfs = []
        for fpath in file_paths:
            ext = Path(fpath).suffix.lower()
            if ext in ['.xlsx', '.xls', '.csv']:
                try:
                    if ext == '.csv':
                        df = pd.read_csv(fpath, encoding='utf-8', errors='ignore')
                    else:
                        df = pd.read_excel(fpath)
                    df['_source_file'] = os.path.basename(fpath)
                    dfs.append(df)
                except:
                    continue
        
        if dfs:
            merged = pd.concat(dfs, ignore_index=True)
            if output_path:
                ext = Path(output_path).suffix.lower()
                if ext == '.csv':
                    merged.to_csv(output_path, index=False, encoding='utf-8-sig')
                else:
                    merged.to_excel(output_path, index=False)
            return merged
        
        return pd.DataFrame()
    
    def generate_statistics(self, df: Any) -> Dict[str, Any]:
        """生成数据统计"""
        stats = {
            'row_count': len(df) if hasattr(df, '__len__') else 0,
            'column_count': len(df.columns) if hasattr(df, 'columns') else 0,
            'numeric_columns': [],
            'categorical_columns': [],
            'missing_data': {}
        }
        
        if not hasattr(df, 'empty') or df.empty:
            return stats
        
        for col in df.columns:
            if df[col].dtype in ['int64', 'float64']:
                stats['numeric_columns'].append({
                    'name': col,
                    'mean': float(df[col].mean()) if not df[col].isnull().all() else 0,
                    'median': float(df[col].median()) if not df[col].isnull().all() else 0,
                    'std': float(df[col].std()) if not df[col].isnull().all() else 0,
                    'min': float(df[col].min()) if not df[col].isnull().all() else 0,
                    'max': float(df[col].max()) if not df[col].isnull().all() else 0
                })
            else:
                stats['categorical_columns'].append({
                    'name': col,
                    'unique_count': int(df[col].nunique()),
                    'top_values': df[col].value_counts().head(5).to_dict() if hasattr(df[col], 'value_counts') else {}
                })
        
        return stats
    
    def export_report(self, format: str = 'markdown', output_path: str = None, 
                     title: str = '数据分析报告') -> str:
        """导出分析报告"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        if format == 'markdown':
            content = f"""# {title}

**生成时间：** {timestamp}
**分析器版本：** v2.0

## 摘要统计

- **总文件数：** {len(self.analysis_results)}
- **成功：** {sum(1 for r in self.analysis_results if r.success)}
- **失败：** {sum(1 for r in self.analysis_results if not r.success)}

"""
            for result in self.analysis_results:
                content += f"""### {result.name}

- **类型：** {result.file_type}
- **状态：** {'成功' if result.success else '失败'}

"""
                if result.success:
                    if result.rows > 0:
                        content += f"- **行数：** {result.rows}\n"
                        content += f"- **列数：** {result.columns}\n"
                    if result.pages > 0:
                        content += f"- **页数：** {result.pages}\n"
                    if result.characters > 0:
                        content += f"- **字符数：** {result.characters}\n"
                
                content += "\n"
            
            if output_path:
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            
            return content
        
        elif format == 'json':
            data = {
                'title': title,
                'timestamp': timestamp,
                'version': '2.0',
                'summary': {
                    'total': len(self.analysis_results),
                    'successful': sum(1 for r in self.analysis_results if r.success),
                    'failed': sum(1 for r in self.analysis_results if not r.success)
                },
                'results': [r.to_dict() for r in self.analysis_results]
            }
            
            if output_path:
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            
            return json.dumps(data, ensure_ascii=False, indent=2)
        
        return "不支持的格式"
    
    @property
    def summary(self) -> Dict[str, Any]:
        """获取摘要（懒加载）"""
        if not self.analysis_results:
            return self.generate_summary()
        return {
            'total_files': len(self.analysis_results),
            'successful': sum(1 for r in self.analysis_results if r.success),
            'failed': sum(1 for r in self.analysis_results if not r.success)
        }


def analyze_folder(folder_path: str, output_path: str = None) -> Dict[str, Any]:
    """便捷函数：分析文件夹"""
    analyzer = DataAnalyzer(folder_path)
    return analyzer.generate_summary()


def analyze_file(file_path: str) -> FileAnalysisResult:
    """便捷函数：分析单个文件"""
    analyzer = DataAnalyzer()
    return analyzer.analyze_file(file_path)


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        path = sys.argv[1]
        analyzer = DataAnalyzer(path)
        result = analyzer.generate_summary()
        print(f"分析完成: {result['total_files']} 个文件")
    else:
        print("用法: python data_analyzer.py <文件夹路径>")
