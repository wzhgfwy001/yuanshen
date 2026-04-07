---
name: error-handler
description: 统一错误处理系统，提供200+错误码定义、自动诊断、恢复建议和用户友好提示
parent: dynamic-multi-agent-system
version: 1.0.0
---

# 统一错误处理系统 v1.0 (Error Handler)

## 功能概述

| 功能 | 说明 | 覆盖 |
|------|------|------|
| 200+错误码定义 | 完整错误分类体系 | 全场景 |
| 错误分类 | 重试/跳过/中止三类 | 自动判断 |
| 自动诊断 | 智能分析错误原因 | 即时 |
| 恢复建议 | 提供具体解决方案 | 每个错误 |
| 友好提示 | 用户可理解的错误信息 | 全部 |

---

## 错误码体系

### 格式规范

```
ERR-{Category}-{Code}
```

| 前缀 | 类别 | 范围 |
|------|------|------|
| ERR-SYS | 系统错误 | 0001-0099 |
| ERR-NET | 网络错误 | 0101-0199 |
| ERR-API | API错误 | 0201-0299 |
| ERR-AGT | Agent错误 | 0301-0399 |
| ERR-TASK | 任务错误 | 0401-0499 |
| ERR-AUTH | 认证错误 | 0501-0599 |
| ERR-DATA | 数据错误 | 0601-0699 |
| ERR-FILE | 文件错误 | 0701-0799 |
| ERR-CACHE | 缓存错误 | 0801-0899 |
| ERR-PERM | 权限错误 | 0901-0999 |
| ERR-VAL | 验证错误 | 1001-1099 |
| ERR-TIME | 超时错误 | 1101-1199 |
| ERR-MEM | 内存错误 | 1201-1299 |
| ERR-DISK | 磁盘错误 | 1301-1399 |
| ERR-MODEL | 模型错误 | 1401-1499 |
| ERR-PARSE | 解析错误 | 1501-1599 |
| ERR-FLOW | 流程错误 | 1601-1699 |
| ERR-INTEG | 集成错误 | 1701-1799 |
| ERR-SKILL | Skill错误 | 1801-1899 |
| ERR-BATCH | 批处理错误 | 1901-1999 |

---

## 详细错误码定义

### 系统错误 (ERR-SYS-0001-0099)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-SYS-0001 | SYSTEM_INIT_FAILED | 系统初始化失败 | ABORT | 检查配置文件，重新初始化 |
| ERR-SYS-0002 | SYSTEM_SHUTDOWN | 系统正常关闭 | SKIP | 无需处理 |
| ERR-SYS-0003 | SYSTEM_RESTART | 系统重启中 | SKIP | 等待重启完成 |
| ERR-SYS-0004 | CONFIG_INVALID | 配置文件无效 | ABORT | 检查配置JSON格式 |
| ERR-SYS-0005 | CONFIG_MISSING | 配置文件缺失 | ABORT | 创建或恢复配置文件 |
| ERR-SYS-0006 | STATE_CORRUPTED | 状态文件损坏 | RETRY | 删除后重新初始化 |
| ERR-SYS-0007 | UNKNOWN_ERROR | 未知错误 | RETRY | 查看详细日志，联系支持 |
| ERR-SYS-0008 | NOT_IMPLEMENTED | 功能未实现 | ABORT | 等待功能上线 |
| ERR-SYS-0009 | FEATURE_DISABLED | 功能已禁用 | SKIP | 启用功能或跳过 |
| ERR-SYS-0010 | VERSION_MISMATCH | 版本不匹配 | ABORT | 升级或降级组件 |

### 网络错误 (ERR-NET-0101-0199)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-NET-0101 | NETWORK_UNAVAILABLE | 网络不可达 | RETRY | 检查网络连接 |
| ERR-NET-0102 | CONNECTION_TIMEOUT | 连接超时 | RETRY | 增加超时时间重试 |
| ERR-NET-0103 | CONNECTION_REFUSED | 连接被拒绝 | RETRY | 检查目标服务状态 |
| ERR-NET-0104 | DNS_RESOLVE_FAILED | DNS解析失败 | RETRY | 检查DNS配置 |
| ERR-NET-0105 | SSL_CERT_ERROR | SSL证书错误 | RETRY | 更新证书或跳过验证 |
| ERR-NET-0106 | PROXY_ERROR | 代理错误 | RETRY | 检查代理设置 |
| ERR-NET-0107 | BANDWIDTH_LIMIT | 带宽限制 | RETRY | 等待限流恢复 |
| ERR-NET-0108 | HOST_UNREACHABLE | 主机不可达 | RETRY | 检查目标主机 |
| ERR-NET-0109 | CONNECTION_RESET | 连接重置 | RETRY | 网络波动，重试 |
| ERR-NET-0110 | SOCKET_ERROR | Socket错误 | RETRY | 重启网络组件 |
| ERR-NET-0111 | PACKET_LOSS | 数据包丢失 | RETRY | 检查网络质量 |
| ERR-NET-0112 | ROUTE_ERROR | 路由错误 | RETRY | 联系网络管理员 |
| ERR-NET-0113 | FIREWALL_BLOCK | 防火墙拦截 | ABORT | 配置防火墙规则 |
| ERR-NET-0114 | RATE_LIMIT | 请求频率超限 | RETRY | 降低请求频率 |
| ERR-NET-0115 | QUOTA_EXCEEDED | 配额用尽 | ABORT | 申请更多配额 |

### API错误 (ERR-API-0201-0299)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-API-0201 | API_KEY_INVALID | API Key无效 | ABORT | 检查API Key配置 |
| ERR-API-0202 | API_KEY_EXPIRED | API Key过期 | ABORT | 续期或更换API Key |
| ERR-API-0203 | API_QUOTA_EXCEED | API配额超限 | RETRY | 等待配额重置 |
| ERR-API-0204 | API_RATE_LIMIT | API频率限制 | RETRY | 降低调用频率 |
| ERR-API-0205 | API_TIMEOUT | API调用超时 | RETRY | 增加超时时间 |
| ERR-API-0206 | API_SERVER_ERROR | API服务器错误 | RETRY | 等待服务恢复 |
| ERR-API-0207 | API_CLIENT_ERROR | API客户端错误 | ABORT | 检查请求参数 |
| ERR-API-0208 | API_RESPONSE_INVALID | API响应无效 | RETRY | 重试或检查API |
| ERR-API-0209 | API_METHOD_NOT_ALLOWED | 方法不允许 | ABORT | 检查API调用方式 |
| ERR-API-0210 | API_ENDPOINT_NOT_FOUND | 端点不存在 | ABORT | 检查API URL |
| ERR-API-0211 | API_HEADER_MISSING | 请求头缺失 | ABORT | 添加必要的请求头 |
| ERR-API-0212 | API_BODY_INVALID | 请求体无效 | ABORT | 检查JSON格式 |
| ERR-API-0213 | API_AUTH_FAILED | 认证失败 | ABORT | 检查认证信息 |
| ERR-API-0214 | API_PERMISSION_DENIED | 权限不足 | ABORT | 申请更高权限 |
| ERR-API-0215 | API_RESOURCE_NOT_FOUND | 资源不存在 | SKIP | 检查资源ID |
| ERR-API-0216 | API_RESOURCE_CONFLICT | 资源冲突 | RETRY | 使用不同的标识 |
| ERR-API-0217 | API_DEPRECATED | API已弃用 | ABORT | 切换到新API |
| ERR-API-0218 | API_MAINTENANCE | API维护中 | RETRY | 等待维护结束 |
| ERR-API-0219 | API_INTERNAL_ERROR | API内部错误 | RETRY | 联系API提供商 |
| ERR-API-0220 | API_RESPONSE_TOO_LARGE | 响应过大 | RETRY | 分页或简化请求 |

### Agent错误 (ERR-AGT-0301-0399)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-AGT-0301 | AGENT_CREATE_FAILED | Agent创建失败 | RETRY | 重试或降级创建 |
| ERR-AGT-0302 | AGENT_NOT_FOUND | Agent不存在 | SKIP | 检查Agent ID |
| ERR-AGT-0303 | AGENT_TIMEOUT | Agent执行超时 | RETRY | 增加超时或简化任务 |
| ERR-AGT-0304 | AGENT_CRASHED | Agent崩溃 | RETRY | 重启Agent |
| ERR-AGT-0305 | AGENT_MEMORY_LIMIT | Agent内存超限 | RETRY | 减少任务规模 |
| ERR-AGT-0306 | AGENT_RESPONSE_INVALID | Agent响应无效 | RETRY | 重新请求 |
| ERR-AGT-0307 | AGENT_QUEUE_FULL | Agent队列满 | RETRY | 等待队列空闲 |
| ERR-AGT-0308 | AGENT_NOT_READY | Agent未就绪 | RETRY | 等待Agent初始化 |
| ERR-AGT-0309 | AGENT_DISCONNECTED | Agent断开连接 | RETRY | 重新连接 |
| ERR-AGT-0310 | AGENT_TASK_CONFLICT | 任务冲突 | RETRY | 等待当前任务完成 |
| ERR-AGT-0311 | AGENT_MAX_RETRIES | Agent重试次数超限 | ABORT | 简化任务或手动处理 |
| ERR-AGT-0312 | AGENT_STUCK | Agent卡死 | RETRY | 强制终止后重建 |
| ERR-AGT-0313 | AGENT_OUTPUT_TOO_LARGE | 输出过长 | SKIP | 裁剪输出 |
| ERR-AGT-0314 | AGENT_LOOP_DETECTED | 检测到死循环 | ABORT | 优化Prompt |
| ERR-AGT-0315 | AGENT_HALLUCINATION | Agent幻觉内容 | RETRY | 增强Prompt约束 |
| ERR-AGT-0316 | AGENT_CONTEXT_EXCEEDED | 上下文超限 | RETRY | 裁剪历史消息 |
| ERR-AGT-0317 | AGENT_ROLE_INVALID | Agent角色无效 | ABORT | 检查角色配置 |
| ERR-AGT-0318 | AGENT_MODEL_UNAVAILABLE | 模型不可用 | RETRY | 切换其他模型 |
| ERR-AGT-0319 | AGENT_CANCELLED | Agent任务取消 | SKIP | 任务已主动取消 |
| ERR-AGT-0320 | AGENT_RESULT_IGNORED | 结果被忽略 | SKIP | 检查任务状态 |

### 任务错误 (ERR-TASK-0401-0499)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-TASK-0401 | TASK_NOT_FOUND | 任务不存在 | SKIP | 检查任务ID |
| ERR-TASK-0402 | TASK_TIMEOUT | 任务超时 | RETRY | 增加超时时间 |
| ERR-TASK-0403 | TASK_CANCELLED | 任务已取消 | SKIP | 任务被主动取消 |
| ERR-TASK-0404 | TASK_PAUSED | 任务已暂停 | SKIP | 恢复任务执行 |
| ERR-TASK-0405 | TASK_FAILED | 任务执行失败 | RETRY | 分析失败原因重试 |
| ERR-TASK-0406 | TASK_DEPENDENCY | 任务依赖未满足 | SKIP | 先完成依赖任务 |
| ERR-TASK-0407 | TASK_CIRCULAR_DEP | 循环依赖检测 | ABORT | 修复任务依赖图 |
| ERR-TASK-0408 | TASK_INPUT_INVALID | 任务输入无效 | ABORT | 检查输入参数 |
| ERR-TASK-0409 | TASK_OUTPUT_INVALID | 任务输出无效 | RETRY | 检查处理逻辑 |
| ERR-TASK-0410 | TASK_PRIORITY_INVALID | 优先级无效 | SKIP | 使用有效优先级 |
| ERR-TASK-0411 | TASK_QUEUE_FULL | 任务队列满 | RETRY | 等待队列空闲 |
| ERR-TASK-0412 | TASK_DUPLICATE | 重复任务 | SKIP | 使用已有结果 |
| ERR-TASK-0413 | TASK_EXPIRED | 任务已过期 | SKIP | 重新创建任务 |
| ERR-TASK-0414 | TASK_CONFLICT | 任务冲突 | RETRY | 解决冲突后重试 |
| ERR-TASK-0415 | TASK_PARTIAL | 任务部分完成 | RETRY | 完成剩余部分 |
| ERR-TASK-0416 | TASK_ABORTED | 任务被中止 | ABORT | 检查中止原因 |
| ERR-TASK-0417 | TASK_BLOCKED | 任务被阻塞 | SKIP | 解除阻塞条件 |
| ERR-TASK-0418 | TASK_MAX_RETRIES | 重试次数超限 | ABORT | 手动处理 |
| ERR-TASK-0419 | TASK_RESOURCE_CONFLICT | 资源冲突 | RETRY | 等待资源释放 |
| ERR-TASK-0420 | TASK_OUTPUT_MISSING | 输出缺失 | RETRY | 重新执行任务 |

### 认证错误 (ERR-AUTH-0501-0599)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-AUTH-0501 | AUTH_FAILED | 认证失败 | ABORT | 检查凭证 |
| ERR-AUTH-0502 | AUTH_EXPIRED | 认证已过期 | RETRY | 重新认证 |
| ERR-AUTH-0503 | AUTH_INVALID_TOKEN | Token无效 | RETRY | 获取新Token |
| ERR-AUTH-0504 | AUTH_TOKEN_MISSING | Token缺失 | ABORT | 添加认证Token |
| ERR-AUTH-0505 | AUTH_PERMISSION_DENIED | 权限不足 | ABORT | 申请所需权限 |
| ERR-AUTH-0506 | AUTH_ACCOUNT_LOCKED | 账户被锁定 | ABORT | 联系管理员解锁 |
| ERR-AUTH-0507 | AUTH_ACCOUNT_DISABLED | 账户已禁用 | ABORT | 联系管理员启用 |
| ERR-AUTH-0508 | AUTH_MFA_REQUIRED | 需要多因素认证 | RETRY | 完成MFA验证 |
| ERR-AUTH-0509 | AUTH_CREDENTIALS_EXPIRED | 凭证过期 | RETRY | 更新凭证 |
| ERR-AUTH-0510 | AUTH_SESSION_EXPIRED | 会话过期 | RETRY | 重新建立会话 |
| ERR-AUTH-0511 | AUTH_SESSION_INVALID | 会话无效 | RETRY | 重新登录 |
| ERR-AUTH-0512 | AUTH_IP_BLOCKED | IP被封禁 | ABORT | 联系管理员解封 |
| ERR-AUTH-0513 | AUTH_METHOD_UNSUPPORTED | 认证方法不支持 | ABORT | 使用支持的认证方法 |
| ERR-AUTH-0514 | AUTH_PROVIDER_ERROR | 认证提供商错误 | RETRY | 稍后重试 |

### 数据错误 (ERR-DATA-0601-0699)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-DATA-0601 | DATA_NOT_FOUND | 数据不存在 | SKIP | 检查数据标识 |
| ERR-DATA-0602 | DATA_INVALID | 数据无效 | ABORT | 修复数据格式 |
| ERR-DATA-0603 | DATA_CORRUPTED | 数据损坏 | RETRY | 重新获取数据 |
| ERR-DATA-0604 | DATA_MISSING_FIELD | 必填字段缺失 | ABORT | 添加缺失字段 |
| ERR-DATA-0605 | DATA_TYPE_MISMATCH | 数据类型不匹配 | ABORT | 转换数据类型 |
| ERR-DATA-0606 | DATA_CONSTRAINT | 数据约束违反 | ABORT | 修复约束冲突 |
| ERR-DATA-0607 | DATA_TOO_LARGE | 数据过大 | RETRY | 分批处理或压缩 |
| ERR-DATA-0608 | DATA_EMPTY | 数据为空 | SKIP | 检查数据源 |
| ERR-DATA-0609 | DATA_DUPLICATE | 数据重复 | SKIP | 使用已有数据 |
| ERR-DATA-0610 | DATA_INCONSISTENT | 数据不一致 | RETRY | 同步或重新获取 |
| ERR-DATA-0611 | DATA_VERSION_MISMATCH | 版本不匹配 | RETRY | 更新或降级数据 |
| ERR-DATA-0612 | DATA_LOCKED | 数据被锁定 | RETRY | 等待解锁 |
| ERR-DATA-0613 | DATA_TRANSFORM_FAILED | 数据转换失败 | RETRY | 检查转换规则 |
| ERR-DATA-0614 | DATA_VALIDATION_FAILED | 数据验证失败 | ABORT | 修复数据内容 |
| ERR-DATA-0615 | DATA_SERIALIZE_FAILED | 数据序列化失败 | RETRY | 检查数据结构 |

### 文件错误 (ERR-FILE-0701-0799)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-FILE-0701 | FILE_NOT_FOUND | 文件不存在 | ABORT | 检查文件路径 |
| ERR-FILE-0702 | FILE_PERMISSION_DENIED | 文件权限不足 | ABORT | 修改文件权限 |
| ERR-FILE-0703 | FILE_TOO_LARGE | 文件过大 | ABORT | 分割或压缩文件 |
| ERR-FILE-0704 | FILE_READ_ERROR | 文件读取错误 | RETRY | 重新读取 |
| ERR-FILE-0705 | FILE_WRITE_ERROR | 文件写入错误 | RETRY | 检查磁盘空间 |
| ERR-FILE-0706 | FILE_DELETE_ERROR | 文件删除错误 | RETRY | 检查文件锁定 |
| ERR-FILE-0707 | FILE_RENAME_ERROR | 文件重命名错误 | RETRY | 检查目标名称 |
| ERR-FILE-0708 | FILE_MOVE_ERROR | 文件移动错误 | RETRY | 检查目标路径 |
| ERR-FILE-0709 | FILE_COPY_ERROR | 文件复制错误 | RETRY | 检查磁盘空间 |
| ERR-FILE-0710 | FILE_LOCKED | 文件被锁定 | RETRY | 等待文件释放 |
| ERR-FILE-0711 | FILE_INVALID_NAME | 文件名无效 | ABORT | 使用有效文件名 |
| ERR-FILE-0712 | FILE_INVALID_PATH | 路径无效 | ABORT | 检查路径格式 |
| ERR-FILE-0713 | FILE_DIRECTORY_NOT_EMPTY | 目录非空 | RETRY | 先删除目录内容 |
| ERR-FILE-0714 | FILE_IS_DIRECTORY | 路径是目录 | ABORT | 使用文件而非目录 |
| ERR-FILE-0715 | FILE_NOT_REGULAR | 非常规文件 | ABORT | 检查文件类型 |

### 缓存错误 (ERR-CACHE-0801-0899)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-CACHE-0801 | CACHE_NOT_FOUND | 缓存不存在 | SKIP | 正常，执行查询 |
| ERR-CACHE-0802 | CACHE_EXPIRED | 缓存已过期 | RETRY | 重新获取数据 |
| ERR-CACHE-0803 | CACHE_CORRUPTED | 缓存损坏 | SKIP | 删除后重新缓存 |
| ERR-CACHE-0804 | CACHE_FULL | 缓存已满 | SKIP | 清除旧缓存 |
| ERR-CACHE-0805 | CACHE_WRITE_ERROR | 缓存写入失败 | RETRY | 检查缓存服务 |
| ERR-CACHE-0806 | CACHE_READ_ERROR | 缓存读取失败 | SKIP | 绕过缓存直接查询 |
| ERR-CACHE-0807 | CACHE_INVALID_KEY | 缓存键无效 | ABORT | 使用有效的键 |
| ERR-CACHE-0808 | CACHE_SIZE_EXCEEDED | 单条缓存过大 | SKIP | 跳过该条缓存 |
| ERR-CACHE-0809 | CACHE_TTL_INVALID | TTL无效 | SKIP | 使用默认TTL |
| ERR-CACHE-0810 | CACHE_SERIALIZE_ERROR | 序列化失败 | SKIP | 使用原始数据 |

### 权限错误 (ERR-PERM-0901-0999)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-PERM-0901 | PERM_DENIED | 权限不足 | ABORT | 申请所需权限 |
| ERR-PERM-0902 | PERM_NOT_OWNER | 非文件所有者 | ABORT | 使用所有者账户 |
| ERR-PERM-0903 | PERM_READ_ONLY | 只读模式 | ABORT | 请求写权限 |
| ERR-PERM-0904 | PERM_EXECUTION_DENIED | 执行权限不足 | ABORT | 修改文件权限 |
| ERR-PERM-0905 | PERM_NETWORK_DENIED | 网络权限不足 | ABORT | 配置网络权限 |
| ERR-PERM-0906 | PERM_RESOURCE_LIMIT | 资源使用超限 | ABORT | 优化资源使用 |

### 验证错误 (ERR-VAL-1001-1099)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-VAL-1001 | VAL_REQUIRED_FIELD | 必填字段缺失 | ABORT | 填写必填字段 |
| ERR-VAL-1002 | VAL_FORMAT_INVALID | 格式无效 | ABORT | 使用正确格式 |
| ERR-VAL-1003 | VAL_RANGE_EXCEEDED | 范围超限 | ABORT | 调整到有效范围 |
| ERR-VAL-1004 | VAL_LENGTH_EXCEEDED | 长度超限 | ABORT | 缩短内容 |
| ERR-VAL-1005 | VAL_PATTERN_MISMATCH | 模式不匹配 | ABORT | 符合要求的格式 |
| ERR-VAL-1006 | VAL_TYPE_MISMATCH | 类型不匹配 | ABORT | 使用正确类型 |
| ERR-VAL-1007 | VAL_ENUM_INVALID | 枚举值无效 | ABORT | 使用有效枚举值 |
| ERR-VAL-1008 | VAL_JSON_INVALID | JSON无效 | ABORT | 修复JSON格式 |
| ERR-VAL-1009 | VAL_URL_INVALID | URL无效 | ABORT | 使用有效URL |
| ERR-VAL-1010 | VAL_EMAIL_INVALID | 邮箱无效 | ABORT | 使用有效邮箱 |

### 超时错误 (ERR-TIME-1101-1199)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-TIME-1101 | TIMEOUT_REQUEST | 请求超时 | RETRY | 增加超时时间 |
| ERR-TIME-1102 | TIMEOUT_RESPONSE | 响应超时 | RETRY | 优化处理逻辑 |
| ERR-TIME-1103 | TIMEOUT_CONNECTION | 连接超时 | RETRY | 检查网络状况 |
| ERR-TIME-1104 | TIMEOUT_IDLE | 空闲超时 | SKIP | 重新发起请求 |
| ERR-TIME-1105 | TIMEOUT_DEADLINE | 截止时间超时 | ABORT | 延长时间限制 |
| ERR-TIME-1106 | TIMEOUT_RETRY | 重试超时 | RETRY | 增加重试间隔 |

### 内存错误 (ERR-MEM-1201-1299)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-MEM-1201 | MEMORY_EXCEEDED | 内存超限 | RETRY | 减少内存使用 |
| ERR-MEM-1202 | MEMORY_ALLOCATION | 内存分配失败 | RETRY | 释放内存后重试 |
| ERR-MEM-1203 | MEMORY_LEAK | 内存泄漏 | ABORT | 重启服务 |
| ERR-MEM-1204 | MEMORY_FULL | 内存耗尽 | RETRY | 增加可用内存 |

### 磁盘错误 (ERR-DISK-1301-1399)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-DISK-1301 | DISK_FULL | 磁盘已满 | ABORT | 清理磁盘空间 |
| ERR-DISK-1302 | DISK_READ_ERROR | 磁盘读取错误 | RETRY | 检查磁盘健康 |
| ERR-DISK-1303 | DISK_WRITE_ERROR | 磁盘写入错误 | RETRY | 检查磁盘空间 |
| ERR-DISK-1304 | DISK_IO_ERROR | 磁盘IO错误 | RETRY | 检查磁盘连接 |
| ERR-DISK-1305 | DISK_QUOTA_EXCEED | 磁盘配额超限 | ABORT | 清理或扩容 |

### 模型错误 (ERR-MODEL-1401-1499)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-MODEL-1401 | MODEL_NOT_FOUND | 模型不存在 | ABORT | 检查模型名称 |
| ERR-MODEL-1402 | MODEL_UNAVAILABLE | 模型不可用 | RETRY | 等待服务恢复 |
| ERR-MODEL-1403 | MODEL_OVERLOADED | 模型过载 | RETRY | 降低请求频率 |
| ERR-MODEL-1404 | MODEL_TIMEOUT | 模型响应超时 | RETRY | 增加超时时间 |
| ERR-MODEL-1405 | MODEL_OUTPUT_TRUNCATED | 输出被截断 | SKIP | 请求缩短输出 |
| ERR-MODEL-1406 | MODEL_CONTENT_FILTER | 内容被过滤 | ABORT | 修改Prompt |
| ERR-MODEL-1407 | MODEL_INVALID_RESPONSE | 模型响应无效 | RETRY | 重新请求 |
| ERR-MODEL-1408 | MODEL_RATE_LIMIT | 模型限流 | RETRY | 降低请求频率 |
| ERR-MODEL-1409 | MODEL_CONTEXT_FULL | 上下文已满 | RETRY | 裁剪上下文 |
| ERR-MODEL-1410 | MODEL_TEMPERATURE_HIGH | 温度过高 | RETRY | 降低温度参数 |

### 解析错误 (ERR-PARSE-1501-1599)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-PARSE-1501 | PARSE_JSON_ERROR | JSON解析失败 | ABORT | 修复JSON格式 |
| ERR-PARSE-1502 | PARSE_XML_ERROR | XML解析失败 | ABORT | 修复XML格式 |
| ERR-PARSE-1503 | PARSE_CSV_ERROR | CSV解析失败 | ABORT | 修复CSV格式 |
| ERR-PARSE-1504 | PARSE_MARKDOWN_ERROR | Markdown解析失败 | ABORT | 修复Markdown |
| ERR-PARSE-1505 | PARSE_TEMPLATE_ERROR | 模板解析失败 | ABORT | 修复模板语法 |
| ERR-PARSE-1506 | PARSE_REGEX_ERROR | 正则表达式错误 | ABORT | 修复正则表达式 |

### 流程错误 (ERR-FLOW-1601-1699)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-FLOW-1601 | FLOW_NOT_FOUND | 流程不存在 | ABORT | 检查流程名称 |
| ERR-FLOW-1602 | FLOW_STEP_FAILED | 流程步骤失败 | RETRY | 修复步骤后重试 |
| ERR-FLOW-1603 | FLOW_STEP_TIMEOUT | 流程步骤超时 | RETRY | 增加步骤超时 |
| ERR-FLOW-1604 | FLOW_BRANCH_ERROR | 分支执行错误 | RETRY | 检查分支条件 |
| ERR-FLOW-1605 | FLOW_LOOP_DETECTED | 循环检测 | ABORT | 修复循环依赖 |
| ERR-FLOW-1606 | FLOW_DEADLOCK | 死锁检测 | ABORT | 解除死锁条件 |
| ERR-FLOW-1607 | FLOW_STATE_INVALID | 状态无效 | ABORT | 检查流程状态 |

### 集成错误 (ERR-INTEG-1701-1799)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-INTEG-1701 | INTEG_SERVICE_DOWN | 集成服务宕机 | RETRY | 等待服务恢复 |
| ERR-INTEG-1702 | INTEG_SYNC_FAILED | 同步失败 | RETRY | 重新同步 |
| ERR-INTEG-1703 | INTEG_CONFIG_ERROR | 集成配置错误 | ABORT | 检查集成配置 |
| ERR-INTEG-1704 | INTEG_AUTH_ERROR | 集成认证失败 | ABORT | 更新认证信息 |
| ERR-INTEG-1705 | INTEG_TIMEOUT | 集成超时 | RETRY | 增加超时时间 |
| ERR-INTEG-1706 | INTEG_DATA_MISMATCH | 数据不匹配 | RETRY | 同步数据格式 |

### Skill错误 (ERR-SKILL-1801-1899)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-SKILL-1801 | SKILL_NOT_FOUND | Skill不存在 | ABORT | 检查Skill名称 |
| ERR-SKILL-1802 | SKILL_LOAD_FAILED | Skill加载失败 | RETRY | 重新加载Skill |
| ERR-SKILL-1803 | SKILL_NOT_COMPATIBLE | Skill版本不兼容 | ABORT | 升级Skill版本 |
| ERR-SKILL-1804 | SKILL_DEPENDENCY_MISSING | 依赖Skill缺失 | ABORT | 安装依赖Skill |
| ERR-SKILL-1805 | SKILL_CONFIG_INVALID | Skill配置无效 | ABORT | 检查Skill配置 |
| ERR-SKILL-1806 | SKILL_EXEC_FAILED | Skill执行失败 | RETRY | 检查Skill代码 |

### 批处理错误 (ERR-BATCH-1901-1999)

| 错误码 | 名称 | 说明 | 分类 | 恢复建议 |
|--------|------|------|------|----------|
| ERR-BATCH-1901 | BATCH_ITEM_FAILED | 批处理项失败 | RETRY | 重试该单项 |
| ERR-BATCH-1902 | BATCH_PARTIAL_SUCCESS | 部分成功 | SKIP | 记录失败项 |
| ERR-BATCH-1903 | BATCH_ALL_FAILED | 全部失败 | ABORT | 检查整体输入 |
| ERR-BATCH-1904 | BATCH_SIZE_EXCEEDED | 批量大小超限 | RETRY | 减小批量大小 |
| ERR-BATCH-1905 | BATCH_CANCELLED | 批处理取消 | SKIP | 任务已取消 |
| ERR-BATCH-1906 | BATCH_TIMEOUT | 批处理超时 | RETRY | 增加超时时间 |

---

## 错误处理器

### 核心处理逻辑

```typescript
type ErrorCategory = 'RETRY' | 'SKIP' | 'ABORT';

interface ErrorDefinition {
  code: string;
  name: string;
  description: string;
  category: ErrorCategory;
  suggestion: string;
  userMessage: string;
  logLevel: 'debug' | 'info' | 'warning' | 'error' | 'critical';
}

interface ErrorContext {
  task?: string;
  agentId?: string;
  model?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface ErrorResult {
  action: ErrorCategory;
  recoverySuggestion: string;
  userFriendlyMessage: string;
  retryCount?: number;
  fallbackModel?: string;
}
```

### 自动诊断

```typescript
function diagnoseError(
  errorCode: string,
  context: ErrorContext
): ErrorResult {
  const errorDef = ERROR_DEFINITIONS[errorCode] || ERROR_DEFINITIONS['ERR-SYS-0007'];
  
  let action = errorDef.category;
  let retryCount: number | undefined;
  let fallbackModel: string | undefined;
  
  // 超时错误：根据上下文判断
  if (errorCode.startsWith('ERR-TIME-') || errorCode.startsWith('ERR-NET-0102')) {
    if (context.metadata?.retryCount >= 2) {
      action = 'SKIP';
    } else {
      retryCount = (context.metadata?.retryCount || 0) + 1;
    }
  }
  
  // Agent错误：根据模型判断是否切换
  if (errorCode.startsWith('ERR-AGT-') && context.model) {
    if (['ERR-AGT-0306', 'ERR-AGT-0318'].includes(errorCode)) {
      fallbackModel = suggestFallbackModel(context.model);
    }
  }
  
  return {
    action,
    recoverySuggestion: errorDef.suggestion,
    userFriendlyMessage: errorDef.userMessage,
    retryCount,
    fallbackModel
  };
}

function suggestFallbackModel(currentModel: string): string {
  const fallbackMap: Record<string, string> = {
    'qwen3.5-max': 'qwen3-max',
    'qwen3-max': 'qwen3.5-plus',
    'qwen3.5-plus': 'minimax-m2.7',
    'qwen3-coder-plus': 'qwen3.5-plus',
    'minimax-m2.7': 'minimax-m2.5',
  };
  return fallbackMap[currentModel] || 'minimax-m2.5';
}
```

---

## 用户友好错误提示

```typescript
const USER_MESSAGES: Record<string, string> = {
  'ERR-SYS-0001': '系统初始化失败，请稍后重试',
  'ERR-SYS-0006': '系统状态异常，正在尝试恢复',
  'ERR-NET-0101': '网络连接不稳定，请检查网络后重试',
  'ERR-NET-0102': '请求超时，请稍后重试',
  'ERR-NET-0114': '操作太频繁了，请稍后再试',
  'ERR-API-0201': '身份验证失败，请检查设置',
  'ERR-API-0203': '服务配额已用完，请稍后再试',
  'ERR-API-0206': '服务暂时不可用，请稍后重试',
  'ERR-AGT-0301': '智能助手启动失败，正在重试',
  'ERR-AGT-0303': '任务执行超时，正在重新处理',
  'ERR-AGT-0316': '对话太长了，正在精简内容',
  'ERR-TASK-0402': '任务执行超时，请重试',
  'ERR-MODEL-1402': 'AI模型正在休息，请稍后重试',
  'ERR-MODEL-1406': '内容审核未通过，请调整描述',
};

function getUserMessage(errorCode: string, context?: Record<string, string>): string {
  let message = USER_MESSAGES[errorCode] || '遇到了一点问题，请稍后重试';
  if (context) {
    Object.entries(context).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, value);
    });
  }
  return message;
}
```

---

## 最佳实践

### ✅ 推荐

1. **使用统一错误码** - 所有错误使用ERR-{Category}-{Code}格式
2. **记录完整上下文** - 错误发生时记录足够的调试信息
3. **用户友好提示** - 对外显示友好的错误消息
4. **分级处理** - RETRY/SKIP/ABORT要严格执行
5. **监控错误率** - 持续跟踪错误统计，及时发现系统问题

### ❌ 避免

1. **吞掉错误** - 不要忽略或隐藏错误
2. **无限重试** - 设置重试上限，避免死循环
3. **直接暴露内部错误** - 用户不应看到技术细节
4. **重复记录日志** - 同一个错误不要多次记录

---

*统一错误处理系统 v1.0*  
*创建时间：2026-04-07*  
*覆盖错误码：200+*
