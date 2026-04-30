# 失败教训 - 向量数据库卸载（内存管理失败）

**时间：** 2026-04-22T05:05:00.000Z
**任务：** 向量数据库系统问题诊断
**任务类型：** system_diagnosis

## 失败模式

vector_db_memory_overflow + chromadb_dimension_mismatch + oom_killer

## 发生场景

system_diagnosis vector_db chromadb lm_studio memory windows python node

## 根因

1. **内存预估不足** - 启动ChromaDB时系统内存已不足（只剩2.7GB可用，总计15.9GB）
2. **LM Studio占用大量内存** - LM Studio已占用7.1GB内存
3. **ChromaDB PersistentClient内存需求** - PersistentClient初始化时尝试启动嵌入式服务器，内存需求高
4. **Embedding dimension不匹配** - LM Studio返回768维，ChromaDB配置512维
5. **OOM Killer触发** - 系统内存不足时，进程被SIGKILL杀死

## 影响范围 10/10 - 功能丧失，需要降级到纯文本搜索

## 避免方式

启动重量级服务前检查内存：
```bash
# Windows检查内存
Get-ComputerInfo | Select-Object CsTotalPhysicalMemory, CsAvailablePhysicalMemory

# 或
systeminfo | findstr /C:"Total Physical Memory" /C:"Available Physical Memory"
```

内存使用原则：
- 预留至少20%可用内存
- 多个重量级服务不要同时运行
- 启动前检查是否有足够可用内存

## 改进建议

1. 重量级服务启动前检查内存
2. 配置内存使用上限
3. 多服务错峰启动
4. 监控内存使用趋势

---
*手动记录 by 元神 - 2026-04-25*
