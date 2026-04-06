# Browser Control Configuration - 浏览器控制配置指南

**版本：** v1.0  
**日期：** 2026-04-06  
**浏览器：** Microsoft Edge v146+

---

## 📋 配置目标

实现 OpenClaw 对 Edge 浏览器的控制，支持：
- ✅ 内网网页访问
- ✅ 自动登录（使用现有 Edge 会话）
- ✅ 网页截图
- ✅ 内容抓取
- ✅ 自动化操作（点击/输入/导航）

---

## 🔧 配置步骤

### 步骤 1：确认 Edge 安装路径

**默认路径：**
```
C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
```

**验证命令：**
```powershell
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (Test-Path $edgePath) {
    $version = (Get-Item $edgePath).VersionInfo.FileVersion
    Write-Host "Edge 版本：$version"
} else {
    Write-Host "未找到 Edge"
}
```

**当前状态：** ✅ Edge v146.0.3856.97 已确认

---

### 步骤 2：配置 OpenClaw Gateway

**编辑 Gateway 配置文件：**

```json
{
  "browser": {
    "enabled": true,
    "profile": "user",
    "target": "host",
    "edge": {
      "path": "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "userDataDir": "C:\\Users\\DELL\\AppData\\Local\\Microsoft\\Edge\\User Data"
    }
  }
}
```

**配置说明：**
- `enabled: true` - 启用浏览器控制
- `profile: "user"` - 使用用户已登录的 Edge（可访问已保存的会话）
- `target: "host"` - 控制本地浏览器
- `path` - Edge 可执行文件路径
- `userDataDir` - Edge 用户数据目录（保留登录状态）

---

### 步骤 3：重启 Gateway

```powershell
# 应用配置
openclaw gateway restart
```

**预计时间：** 10-20 秒

---

### 步骤 4：测试浏览器控制

**测试 1：检查浏览器状态**
```powershell
browser action=status target=host
```

**预期输出：**
```
Browser Status:
- Status: running
- Profile: user
- Target: host
- Version: 146.0.3856.97
```

**测试 2：打开网页**
```powershell
browser action=navigate url="http://localhost:5000/dashboard-simple.html" target=host
```

**预期：** 浏览器自动打开监控大屏

**测试 3：截图**
```powershell
browser action=screenshot fullPage=true target=host
```

**预期：** 保存网页截图

**测试 4：抓取内容**
```powershell
browser action=snapshot mode=efficient target=host
```

**预期：** 返回网页内容结构

---

## 🎯 使用场景

### 场景 1：SkillHub 审核状态检查

```powershell
# 访问 SkillHub
browser action=navigate url="https://clawhub.ai" target=host

# 等待加载
browser action=wait timeMs=3000 target=host

# 截图
browser action=screenshot fullPage=true target=host

# 抓取内容
browser action=snapshot mode=efficient target=host
```

### 场景 2：自动登录（使用现有会话）

由于使用 `profile: "user"`，Edge 会保持已登录状态，无需重新登录。

### 场景 3：内网监控大屏访问

```powershell
browser action=navigate url="http://localhost:5000/dashboard-simple.html" target=host
browser action=screenshot fullPage=true target=host
```

---

## ⚠️ 注意事项

### 1. Edge 必须运行

浏览器控制需要 Edge 正在运行，否则会尝试启动。

**解决方案：**
```powershell
# 确保 Edge 运行
Start-Process "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

### 2. 用户数据目录权限

确保 OpenClaw 有权限访问 Edge 用户数据目录。

**权限检查：**
```powershell
$acl = Get-Acl "C:\Users\DELL\AppData\Local\Microsoft\Edge\User Data"
$acl.Access
```

### 3. 内网访问

内网环境可能需要配置代理或防火墙规则。

**测试内网连通性：**
```powershell
Test-NetConnection -ComputerName "localhost" -Port 5000
```

### 4. 隐私保护

使用 `profile: "user"` 会访问用户的 Edge 会话，确保：
- ✅ 仅用于工作相关操作
- ✅ 不访问敏感网站
- ✅ 不保存敏感操作记录

---

## 🔍 故障排除

### 问题 1：浏览器无法启动

**可能原因：**
- Edge 路径错误
- 权限不足
- Edge 已损坏

**解决方案：**
```powershell
# 验证路径
Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# 以管理员身份运行 OpenClaw
# 重新安装 Edge
```

### 问题 2：无法访问内网

**可能原因：**
- 服务未启动
- 端口被占用
- 防火墙阻止

**解决方案：**
```powershell
# 检查服务
netstat -ano | findstr :5000

# 关闭防火墙（测试用）
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```

### 问题 3：截图失败

**可能原因：**
- 页面未完全加载
- 浏览器窗口最小化

**解决方案：**
```powershell
# 等待加载
browser action=wait timeMs=5000 target=host

# 确保窗口可见
browser action=resize width=1920 height=1080 target=host
```

---

## 📊 配置检查清单

- [ ] Edge 版本 ≥ 144 ✅ (当前 v146)
- [ ] Edge 路径正确 ✅
- [ ] Gateway 配置更新 ⬜
- [ ] Gateway 重启 ⬜
- [ ] 浏览器状态测试 ⬜
- [ ] 导航测试 ⬜
- [ ] 截图测试 ⬜
- [ ] 内网访问测试 ⬜

---

## 🎯 下一步

1. **更新 Gateway 配置** - 添加 browser 配置段
2. **重启 Gateway** - 应用配置
3. **执行测试** - 验证浏览器控制
4. **集成到运营流程** - 自动检查 SkillHub

---

**配置完成后，可以实现：**
- ✅ 自动访问 SkillHub 查看审核状态
- ✅ 自动截图监控大屏
- ✅ 内网网页自动化
- ✅ 网页内容抓取

**需要我帮你更新 Gateway 配置吗？** 🚀
