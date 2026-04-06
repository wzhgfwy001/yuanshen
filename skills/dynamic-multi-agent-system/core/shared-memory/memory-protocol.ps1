# Shared Memory Protocol v1.1 - Enhanced Implementation
# 共享记忆层协议 v1.1 - 增强实现
# 
# Features:
# - Version control with history tracking
# - Full permission system (read/write/delete/admin)
# - Atomic operations with file locking
# - Rollback functionality
# - Comprehensive error handling

$script:MEMORY_BASE_PATH = $null
$script:LOCK_TIMEOUT_MINUTES = 5
$script:MAX_HISTORY_VERSIONS = 10

function Initialize-MemoryBasePath {
    if ($null -eq $script:MEMORY_BASE_PATH) {
        $script:MEMORY_BASE_PATH = Join-Path $PSScriptRoot "..\..\state\shared-memories"
        if (!(Test-Path $script:MEMORY_BASE_PATH)) {
            New-Item -ItemType Directory -Force -Path $script:MEMORY_BASE_PATH | Out-Null
        }
    }
    return $script:MEMORY_BASE_PATH
}

function Get-MemoryFilePath {
    param([string]$taskId)
    $basePath = Initialize-MemoryBasePath
    return Join-Path $basePath "$taskId.json"
}

function Get-HistoryPath {
    param([string]$taskId, [string]$key)
    $basePath = Initialize-MemoryBasePath
    $historyDir = Join-Path $basePath "$taskId-history"
    if (!(Test-Path $historyDir)) {
        New-Item -ItemType Directory -Force -Path $historyDir | Out-Null
    }
    return Join-Path $historyDir "$key"
}

# ============================================================
# Error Codes
# ============================================================
$script:ERROR_CODES = @{
    TASK_NOT_FOUND = "TASK_NOT_FOUND"
    KEY_NOT_FOUND = "KEY_NOT_FOUND"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    VERSION_CONFLICT = "VERSION_CONFLICT"
    INVALID_JSON = "INVALID_JSON"
    DISK_FULL = "DISK_FULL"
    LOCK_TIMEOUT = "LOCK_TIMEOUT"
    INVALID_PARAMETER = "INVALID_PARAMETER"
}

function New-ErrorResult {
    param([string]$errorCode, [string]$message)
    return @{
        success = $false
        error = $errorCode
        message = $message
        timestamp = (Get-Date -Format "o")
    }
}

function New-SuccessResult {
    param($data = $null, [string]$message = "Success")
    $result = @{
        success = $true
        message = $message
        timestamp = (Get-Date -Format "o")
    }
    if ($null -ne $data) {
        foreach ($key in $data.Keys) {
            $result[$key] = $data[$key]
        }
    }
    return $result
}

# ============================================================
# Lock Management
# ============================================================
function Acquire-ProtocolLock {
    param(
        [string]$taskId,
        [string]$agentId,
        [int]$timeoutMs = 5000
    )
    
    $filePath = Get-MemoryFilePath $taskId
    $lockFile = "$filePath.lock"
    $startTime = Get-Date
    $retryInterval = 100  # ms
    
    while (((Get-Date) - $startTime).TotalMilliseconds -lt $timeoutMs) {
        # Try to create lock file atomically
        try {
            $lockInfo = @{
                holder = $agentId
                acquiredAt = (Get-Date -Format "o")
                expiresAt = (Get-Date).AddMinutes($script:LOCK_TIMEOUT_MINUTES).ToString("o")
            }
            
            $lockInfo | ConvertTo-Json -Depth 5 | Out-File -FilePath $lockFile -Encoding utf8 -NoClobber -ErrorAction Stop
            
            return @{
                success = $true
                lockFile = $lockFile
                holder = $agentId
            }
        }
        catch {
            # Lock file exists, check if expired
            if (Test-Path $lockFile) {
                $existingLock = Get-Content $lockFile -Raw | ConvertFrom-Json
                $expiresAt = [DateTime]::Parse($existingLock.expiresAt)
                
                if ((Get-Date) -gt $expiresAt) {
                    # Lock expired, force acquire
                    $lockInfo = @{
                        holder = $agentId
                        acquiredAt = (Get-Date -Format "o")
                        expiresAt = (Get-Date).AddMinutes($script:LOCK_TIMEOUT_MINUTES).ToString("o")
                    }
                    $lockInfo | ConvertTo-Json -Depth 5 | Out-File -FilePath $lockFile -Encoding utf8
                    return @{
                        success = $true
                        lockFile = $lockFile
                        holder = $agentId
                        forced = $true
                    }
                }
            }
        }
        
        Start-Sleep -Milliseconds $retryInterval
        $retryInterval = [Math]::Min($retryInterval * 1.5, 500)
    }
    
    return @{
        success = $false
        error = $script:ERROR_CODES.LOCK_TIMEOUT
        message = "Could not acquire lock within timeout period"
    }
}

function Release-ProtocolLock {
    param([string]$lockFile, [string]$agentId)
    
    if (!(Test-Path $lockFile)) {
        return $true
    }
    
    $lockInfo = Get-Content $lockFile -Raw | ConvertFrom-Json
    if ($lockInfo.holder -ne $agentId) {
        return $false
    }
    
    Remove-Item $lockFile -Force
    return $true
}

# ============================================================
# Memory Operations
# ============================================================

function Initialize-Memory {
    <#
    .SYNOPSIS
        Initialize a new memory store for a task
    .DESCRIPTION
        Creates a new memory file with the specified task ID and metadata.
        Returns error if memory already exists.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [hashtable]$metadata = @{},
        
        [string]$ownerAgent = "system"
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (Test-Path $filePath) {
        return New-ErrorResult "TASK_EXISTS" "Memory for task $taskId already exists"
    }
    
    $memory = @{
        taskId = $taskId
        createdAt = (Get-Date -Format "o")
        updatedAt = (Get-Date -Format "o")
        status = "running"
        data = @{}
        permissions = @{
            $ownerAgent = @("admin")
        }
        accessLog = @()
    }
    
    if ($metadata.Count -gt 0) {
        $memory.metadata = $metadata
    } else {
        $memory.metadata = @{
            taskType = "general"
            description = ""
        }
    }
    
    try {
        $memory | ConvertTo-Json -Depth 15 -Compress | Out-File -FilePath $filePath -Encoding utf8
        
        return New-SuccessResult @{
            taskId = $taskId
            createdAt = $memory.createdAt
        } "Memory initialized successfully"
    }
    catch {
        return New-ErrorResult "DISK_FULL" "Failed to create memory file: $_"
    }
}

function Write-Memory {
    <#
    .SYNOPSIS
        Write data to a specific key in the memory store
    .DESCRIPTION
        Creates or updates a key in the memory store with versioning.
        Automatically creates version history for each key.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [Parameter(Mandatory=$true)]
        [string]$key,
        
        [Parameter(Mandatory=$true)]
        $value,
        
        [Parameter(Mandatory=$true)]
        [string]$agentId,
        
        [int]$expectedVersion = -1  # -1 means no version check
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        return New-ErrorResult $script:ERROR_CODES.TASK_NOT_FOUND "Memory for task $taskId not found"
    }
    
    # Acquire lock
    $lock = Acquire-ProtocolLock -taskId $taskId -agentId $agentId
    if (!$lock.success) {
        return New-ErrorResult $lock.error $lock.message
    }
    
    try {
        $memory = Get-Content $filePath -Raw | ConvertFrom-Json
        
        # Check permissions
        $agentPerms = $memory.permissions.$agentId
        if ($null -eq $agentPerms -or (-not ($agentPerms -contains "write") -and -not ($agentPerms -contains "admin"))) {
            return New-ErrorResult $script:ERROR_CODES.PERMISSION_DENIED "Agent $agentId does not have write permission"
        }
        
        # Get current version info
        $currentVersion = 0
        $isNewKey = $false
        if ($memory.data.PSObject.Properties.Name -contains $key) {
            $currentVersion = $memory.data.$key.version
            $isNewKey = $false
        } else {
            $isNewKey = $true
        }
        
        # Version check (optimistic locking)
        if ($expectedVersion -ge 0 -and $currentVersion -ne $expectedVersion) {
            return New-ErrorResult $script:ERROR_CODES.VERSION_CONFLICT "Version conflict: expected $expectedVersion but current is $currentVersion"
        }
        
        # Save to history if key exists
        if (-not $isNewKey) {
            $historyPath = Get-HistoryPath -taskId $taskId -key $key
            $versionFile = Join-Path $historyPath "v$currentVersion.json"
            
            if (!(Test-Path $historyPath)) {
                New-Item -ItemType Directory -Force -Path $historyPath | Out-Null
            }
            
            $historyEntry = @{
                version = $currentVersion
                value = $memory.data.$key.value
                createdBy = $memory.data.$key.createdBy
                createdAt = $memory.data.$key.createdAt
                updatedBy = $memory.data.$key.updatedBy
                updatedAt = $memory.data.$key.updatedAt
            }
            $historyEntry | ConvertTo-Json -Depth 10 | Out-File -FilePath $versionFile -Encoding utf8
            
            # Cleanup old versions
            $newVersion = $currentVersion + 1
        } else {
            $newVersion = 1
        }
        
        # Update memory
        $memory.data | Add-Member -NotePropertyName $key -NotePropertyValue @{
            value = $value
            version = $newVersion
            createdBy = if ($isNewKey) { $agentId } else { $memory.data.$key.createdBy }
            createdAt = if ($isNewKey) { (Get-Date -Format "o") } else { $memory.data.$key.createdAt }
            updatedBy = $agentId
            updatedAt = (Get-Date -Format "o")
        } -Force
        
        $memory.updatedAt = (Get-Date -Format "o")
        
        # Log access
        $memory.accessLog += @{
            agent = $agentId
            action = "write"
            key = $key
            version = $newVersion
            timestamp = (Get-Date -Format "o")
        }
        
        # Write atomically
        $tempFile = "$filePath.tmp"
        $memory | ConvertTo-Json -Depth 15 | Out-File -FilePath $tempFile -Encoding utf8
        Move-Item -Path $tempFile -Destination $filePath -Force
        
        return New-SuccessResult @{
            key = $key
            version = $newVersion
            isNewKey = $isNewKey
        } "Write successful"
    }
    finally {
        Release-ProtocolLock -lockFile $lock.lockFile -agentId $agentId
    }
}

function Read-Memory {
    <#
    .SYNOPSIS
        Read data from a specific key in the memory store
    .DESCRIPTION
        Retrieves the value for a specific key. If no key is specified,
        returns all data. Optionally returns metadata.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [string]$key,
        
        [string]$agentId,
        
        [switch]$includeMetadata
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        return New-ErrorResult $script:ERROR_CODES.TASK_NOT_FOUND "Memory for task $taskId not found"
    }
    
    $memory = Get-Content $filePath -Raw | ConvertFrom-Json
    
    # Check permissions
    if ($agentId) {
        $agentPerms = $memory.permissions.$agentId
        if ($null -eq $agentPerms -or (-not ($agentPerms -contains "read") -and -not ($agentPerms -contains "write") -and -not ($agentPerms -contains "admin"))) {
            return New-ErrorResult $script:ERROR_CODES.PERMISSION_DENIED "Agent $agentId does not have read permission"
        }
        
        # Log access
        $memory.accessLog += @{
            agent = $agentId
            action = "read"
            key = $key
            timestamp = (Get-Date -Format "o")
        }
        $memory | ConvertTo-Json -Depth 10 | Out-File -FilePath $filePath -Encoding utf8
    }
    
    if ($key) {
        if ($memory.data.PSObject.Properties.Name -notcontains $key) {
            return New-ErrorResult $script:ERROR_CODES.KEY_NOT_FOUND "Key '$key' not found"
        }
        
        $result = @{
            success = $true
            key = $key
            value = $memory.data.$key.value
            version = $memory.data.$key.version
            createdBy = $memory.data.$key.createdBy
            createdAt = $memory.data.$key.createdAt
            updatedBy = $memory.data.$key.updatedBy
            updatedAt = $memory.data.$key.updatedAt
        }
        
        return $result
    }
    else {
        $allData = @{}
        foreach ($prop in $memory.data.PSObject.Properties) {
            $allData[$prop.Name] = @{
                value = $prop.Value.value
                version = $prop.Value.version
            }
        }
        
        $result = @{
            success = $true
            data = $allData
            updatedAt = $memory.updatedAt
        }
        
        if ($includeMetadata) {
            $result.metadata = $memory.metadata
            $result.status = $memory.status
        }
        
        return $result
    }
}

function List-MemoryKeys {
    <#
    .SYNOPSIS
        List all keys in the memory store
    .DESCRIPTION
        Returns a list of all keys with their version numbers and timestamps.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [string]$agentId
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        return New-ErrorResult $script:ERROR_CODES.TASK_NOT_FOUND "Memory for task $taskId not found"
    }
    
    $memory = Get-Content $filePath -Raw | ConvertFrom-Json
    
    # Check permissions
    if ($agentId) {
        $agentPerms = $memory.permissions.$agentId
        if ($null -eq $agentPerms -or -not ($agentPerms -contains "read")) {
            return New-ErrorResult $script:ERROR_CODES.PERMISSION_DENIED "Agent $agentId does not have read permission"
        }
    }
    
    $keys = @()
    foreach ($prop in $memory.data.PSObject.Properties) {
        $keys += @{
            key = $prop.Name
            version = $prop.Value.version
            updatedAt = $prop.Value.updatedAt
            updatedBy = $prop.Value.updatedBy
        }
    }
    
    return @{
        success = $true
        keys = $keys
        count = $keys.Count
    }
}

function Delete-MemoryKey {
    <#
    .SYNOPSIS
        Delete a specific key from the memory store
    .DESCRIPTION
        Removes a key from the memory store. Requires delete or admin permission.
        The key data is moved to archive before deletion.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [Parameter(Mandatory=$true)]
        [string]$key,
        
        [Parameter(Mandatory=$true)]
        [string]$agentId
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        return New-ErrorResult $script:ERROR_CODES.TASK_NOT_FOUND "Memory for task $taskId not found"
    }
    
    # Acquire lock
    $lock = Acquire-ProtocolLock -taskId $taskId -agentId $agentId
    if (!$lock.success) {
        return New-ErrorResult $lock.error $lock.message
    }
    
    try {
        $memory = Get-Content $filePath -Raw | ConvertFrom-Json
        
        # Check permissions
        $agentPerms = $memory.permissions.$agentId
        if ($null -eq $agentPerms -or (-not ($agentPerms -contains "delete") -and -not ($agentPerms -contains "admin"))) {
            return New-ErrorResult $script:ERROR_CODES.PERMISSION_DENIED "Agent $agentId does not have delete permission"
        }
        
        # Check if key exists
        if ($memory.data.PSObject.Properties.Name -notcontains $key) {
            return New-ErrorResult $script:ERROR_CODES.KEY_NOT_FOUND "Key '$key' not found"
        }
        
        # Archive before deletion
        $archiveDir = Join-Path (Initialize-MemoryBasePath) "archives"
        if (!(Test-Path $archiveDir)) {
            New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null
        }
        
        $archiveFile = Join-Path $archiveDir "$taskId-$key-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
        $memory.data.$key | ConvertTo-Json -Depth 10 | Out-File -FilePath $archiveFile -Encoding utf8
        
        # Remove from memory
        $memory.data.PSObject.Properties.Remove($key)
        $memory.updatedAt = (Get-Date -Format "o")
        
        # Log
        $memory.accessLog += @{
            agent = $agentId
            action = "delete"
            key = $key
            archivedTo = $archiveFile
            timestamp = (Get-Date -Format "o")
        }
        
        # Write atomically
        $tempFile = "$filePath.tmp"
        $memory | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempFile -Encoding utf8
        Move-Item -Path $tempFile -Destination $filePath -Force
        
        return New-SuccessResult @{
            key = $key
            archived = $true
        } "Key deleted and archived"
    }
    finally {
        Release-ProtocolLock -lockFile $lock.lockFile -agentId $agentId
    }
}

function Get-MemoryHistory {
    <#
    .SYNOPSIS
        Get version history for a specific key
    .DESCRIPTION
        Returns all historical versions of a key.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [Parameter(Mandatory=$true)]
        [string]$key,
        
        [string]$agentId
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        return New-ErrorResult $script:ERROR_CODES.TASK_NOT_FOUND "Memory for task $taskId not found"
    }
    
    $memory = Get-Content $filePath -Raw | ConvertFrom-Json
    
    # Check permissions
    if ($agentId) {
        $agentPerms = $memory.permissions.$agentId
        if ($null -eq $agentPerms -or -not ($agentPerms -contains "read")) {
            return New-ErrorResult $script:ERROR_CODES.PERMISSION_DENIED "Agent $agentId does not have read permission"
        }
    }
    
    # Check if key exists
    if ($memory.data.PSObject.Properties.Name -notcontains $key) {
        return New-ErrorResult $script:ERROR_CODES.KEY_NOT_FOUND "Key '$key' not found"
    }
    
    $historyPath = Get-HistoryPath -taskId $taskId -key $key
    $history = @()
    
    if (Test-Path $historyPath) {
        $versionFiles = Get-ChildItem -Path $historyPath -Filter "v*.json" | Sort-Object Name
        foreach ($vf in $versionFiles) {
            $versionData = Get-Content $vf.FullName -Raw | ConvertFrom-Json
            $history += $versionData
        }
    }
    
    # Add current version
    $history += @{
        version = $memory.data.$key.version
        value = $memory.data.$key.value
        createdBy = $memory.data.$key.createdBy
        createdAt = $memory.data.$key.createdAt
        isCurrent = $true
    }
    
    return @{
        success = $true
        key = $key
        history = $history
        totalVersions = $history.Count
    }
}

function Rollback-MemoryKey {
    <#
    .SYNOPSIS
        Rollback a key to a specific version
    .DESCRIPTION
        Restores a key to a previous version. Creates a new version with
        the old data (non-destructive).
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [Parameter(Mandatory=$true)]
        [string]$key,
        
        [Parameter(Mandatory=$true)]
        [int]$version,
        
        [Parameter(Mandatory=$true)]
        [string]$agentId
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        return New-ErrorResult $script:ERROR_CODES.TASK_NOT_FOUND "Memory for task $taskId not found"
    }
    
    # Acquire lock
    $lock = Acquire-ProtocolLock -taskId $taskId -agentId $agentId
    if (!$lock.success) {
        return New-ErrorResult $lock.error $lock.message
    }
    
    try {
        $memory = Get-Content $filePath -Raw | ConvertFrom-Json
        
        # Check permissions
        $agentPerms = $memory.permissions.$agentId
        if ($null -eq $agentPerms -or (-not ($agentPerms -contains "write") -and -not ($agentPerms -contains "admin"))) {
            return New-ErrorResult $script:ERROR_CODES.PERMISSION_DENIED "Agent $agentId does not have write permission"
        }
        
        # Check if key exists
        if ($memory.data.PSObject.Properties.Name -notcontains $key) {
            return New-ErrorResult $script:ERROR_CODES.KEY_NOT_FOUND "Key '$key' not found"
        }
        
        # Get history
        $historyPath = Get-HistoryPath -taskId $taskId -key $key
        $versionFile = Join-Path $historyPath "v$version.json"
        
        if (!(Test-Path $versionFile)) {
            return New-ErrorResult "VERSION_NOT_FOUND" "Version $version of key '$key' not found in history"
        }
        
        $historicalData = Get-Content $versionFile -Raw | ConvertFrom-Json
        
        # Save current as new history version
        $currentVersion = $memory.data.$key.version
        if (!(Test-Path $historyPath)) {
            New-Item -ItemType Directory -Force -Path $historyPath | Out-Null
        }
        $currentHistoryEntry = @{
            version = $currentVersion
            value = $memory.data.$key.value
            createdBy = $memory.data.$key.createdBy
            createdAt = $memory.data.$key.createdAt
            updatedBy = $memory.data.$key.updatedBy
            updatedAt = $memory.data.$key.updatedAt
        }
        $currentHistoryEntry | ConvertTo-Json -Depth 10 | Out-File -FilePath (Join-Path $historyPath "v$currentVersion.json") -Encoding utf8
        
        # Rollback - create new version with old data
        $newVersion = $currentVersion + 1
        $memory.data.$key = @{
            value = $historicalData.value
            version = $newVersion
            createdBy = $historicalData.createdBy
            createdAt = $historicalData.createdAt
            updatedBy = $agentId
            updatedAt = (Get-Date -Format "o")
        }
        
        $memory.updatedAt = (Get-Date -Format "o")
        
        # Log
        $memory.accessLog += @{
            agent = $agentId
            action = "rollback"
            key = $key
            fromVersion = $currentVersion
            toVersion = $version
            newVersion = $newVersion
            timestamp = (Get-Date -Format "o")
        }
        
        # Write atomically
        $tempFile = "$filePath.tmp"
        $memory | ConvertTo-Json -Depth 15 | Out-File -FilePath $tempFile -Encoding utf8
        Move-Item -Path $tempFile -Destination $filePath -Force
        
        return New-SuccessResult @{
            key = $key
            newVersion = $newVersion
            rolledBackTo = $version
        } "Rollback successful"
    }
    finally {
        Release-ProtocolLock -lockFile $lock.lockFile -agentId $agentId
    }
}

function Set-MemoryPermissions {
    <#
    .SYNOPSIS
        Set permissions for an agent on a task's memory
    .DESCRIPTION
        Grants or updates permissions for a specific agent.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [Parameter(Mandatory=$true)]
        [string]$targetAgentId,
        
        [Parameter(Mandatory=$true)]
        [string[]]$permissions,
        
        [Parameter(Mandatory=$true)]
        [string]$grantingAgentId
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        return New-ErrorResult $script:ERROR_CODES.TASK_NOT_FOUND "Memory for task $taskId not found"
    }
    
    # Acquire lock
    $lock = Acquire-ProtocolLock -taskId $taskId -agentId $grantingAgentId
    if (!$lock.success) {
        return New-ErrorResult $lock.error $lock.message
    }
    
    try {
        $memory = Get-Content $filePath -Raw | ConvertFrom-Json
        
        # Check granting agent has admin permission
        $grantorPerms = $memory.permissions.$grantingAgentId
        if ($null -eq $grantorPerms -or -not ($grantorPerms -contains "admin")) {
            return New-ErrorResult $script:ERROR_CODES.PERMISSION_DENIED "Only admin can grant permissions"
        }
        
        # Validate permissions
        $validPerms = @("read", "write", "delete", "admin")
        foreach ($perm in $permissions) {
            if ($validPerms -notcontains $perm) {
                return New-ErrorResult $script:ERROR_CODES.INVALID_PARAMETER "Invalid permission: $perm. Valid: $($validPerms -join ', ')"
            }
        }
        
        # Grant permissions
        $memory.permissions.$targetAgentId = $permissions
        $memory.updatedAt = (Get-Date -Format "o")
        
        # Log
        $memory.accessLog += @{
            agent = $grantingAgentId
            action = "grant-permissions"
            targetAgent = $targetAgentId
            permissions = $permissions
            timestamp = (Get-Date -Format "o")
        }
        
        # Write atomically
        $tempFile = "$filePath.tmp"
        $memory | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempFile -Encoding utf8
        Move-Item -Path $tempFile -Destination $filePath -Force
        
        return New-SuccessResult @{
            targetAgent = $targetAgentId
            permissions = $permissions
        } "Permissions granted"
    }
    finally {
        Release-ProtocolLock -lockFile $lock.lockFile -agentId $grantingAgentId
    }
}

function Get-MemoryPermissions {
    <#
    .SYNOPSIS
        Get permissions for all agents on a task's memory
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [string]$agentId
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        return New-ErrorResult $script:ERROR_CODES.TASK_NOT_FOUND "Memory for task $taskId not found"
    }
    
    $memory = Get-Content $filePath -Raw | ConvertFrom-Json
    
    # If querying agent is not admin, only return their own permissions
    if ($agentId) {
        $queryingPerms = $memory.permissions.$agentId
        if ($null -eq $queryingPerms -or -not ($queryingPerms -contains "admin")) {
            return @{
                success = $true
                permissions = @{
                    $agentId = $memory.permissions.$agentId
                }
            }
        }
    }
    
    return @{
        success = $true
        permissions = $memory.permissions
    }
}

function Remove-Memory {
    <#
    .SYNOPSIS
        Completely remove a task's memory store
    .DESCRIPTION
        Deletes the entire memory store for a task. Requires admin permission.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [Parameter(Mandatory=$true)]
        [string]$agentId
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        return New-ErrorResult $script:ERROR_CODES.TASK_NOT_FOUND "Memory for task $taskId not found"
    }
    
    # Acquire lock
    $lock = Acquire-ProtocolLock -taskId $taskId -agentId $agentId
    if (!$lock.success) {
        return New-ErrorResult $lock.error $lock.message
    }
    
    try {
        $memory = Get-Content $filePath -Raw | ConvertFrom-Json
        
        # Check permissions
        $agentPerms = $memory.permissions.$agentId
        if ($null -eq $agentPerms -or -not ($agentPerms -contains "admin")) {
            return New-ErrorResult $script:ERROR_CODES.PERMISSION_DENIED "Only admin can delete memory"
        }
        
        # Archive before deletion
        $archiveDir = Join-Path (Initialize-MemoryBasePath) "archives"
        if (!(Test-Path $archiveDir)) {
            New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null
        }
        
        $archiveFile = Join-Path $archiveDir "$taskId-full-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
        $memory | ConvertTo-Json -Depth 10 | Out-File -FilePath $archiveFile -Encoding utf8
        
        # Delete memory file
        Remove-Item $filePath -Force
        
        # Delete history
        $historyDir = Join-Path (Initialize-MemoryBasePath) "$taskId-history"
        if (Test-Path $historyDir) {
            Remove-Item $historyDir -Recurse -Force
        }
        
        return New-SuccessResult @{
            taskId = $taskId
            archivedTo = $archiveFile
        } "Memory removed and archived"
    }
    finally {
        Release-ProtocolLock -lockFile $lock.lockFile -agentId $agentId
    }
}

function Get-MemoryAccessLog {
    <#
    .SYNOPSIS
        Get access log for a task's memory
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [int]$limit = 50
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        return New-ErrorResult $script:ERROR_CODES.TASK_NOT_FOUND "Memory for task $taskId not found"
    }
    
    $memory = Get-Content $filePath -Raw | ConvertFrom-Json
    
    $logs = $memory.accessLog | Select-Object -Last $limit
    
    return @{
        success = $true
        logs = $logs
        totalCount = $memory.accessLog.Count
    }
}

# ============================================================
# Convenience Functions (Backward Compatible)
# ============================================================

function Initialize-MemoryStore {
    param(
        [string]$taskId,
        [hashtable]$metadata = @{}
    )
    return Initialize-Memory -taskId $taskId -metadata $metadata -ownerAgent "system"
}

function Write-SharedMemory {
    param(
        [string]$taskId,
        [string]$section,
        $data,
        [string]$agent
    )
    return Write-Memory -taskId $taskId -key $section -value $data -agentId $agent
}

function Read-SharedMemory {
    param(
        [string]$taskId,
        [string]$agent,
        [string]$section
    )
    
    if ($section) {
        return Read-Memory -taskId $taskId -key $section -agentId $agent
    } else {
        return Read-Memory -taskId $taskId -agentId $agent
    }
}

function Update-SharedMemory {
    param(
        [string]$taskId,
        [string]$section,
        $data,
        [string]$agent
    )
    return Write-Memory -taskId $taskId -key $section -value $data -agentId $agent
}

function Remove-SharedMemory {
    param([string]$taskId)
    # This removes the whole memory, use Delete-MemoryKey for partial
    $basePath = Initialize-MemoryBasePath
    $filePath = Join-Path $basePath "$taskId.json"
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
        $historyDir = Join-Path $basePath "$taskId-history"
        if (Test-Path $historyDir) {
            Remove-Item $historyDir -Recurse -Force
        }
        return $true
    }
    return $false
}

function Acquire-WriteLock {
    param([string]$taskId, [string]$agent)
    $lock = Acquire-ProtocolLock -taskId $taskId -agentId $agent
    return $lock.success
}

function Release-WriteLock {
    param([string]$taskId, [string]$agent)
    $filePath = Get-MemoryFilePath $taskId
    $lockFile = "$filePath.lock"
    return Release-ProtocolLock -lockFile $lockFile -agentId $agent
}

# ============================================================
# Test Function
# ============================================================

function Test-SharedMemoryProtocol {
    Write-Host "`n=== Shared Memory Protocol v1.1 Tests ===" -ForegroundColor Cyan
    
    $testTaskId = "test-protocol-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $testAgent = "test-agent"
    $adminAgent = "admin-agent"
    
    # Test 1: Initialize
    Write-Host "`n[Test 1] Initialize Memory" -ForegroundColor Yellow
    $result = Initialize-Memory -taskId $testTaskId -ownerAgent $adminAgent
    if ($result.success) { Write-Host "✅ PASS" -ForegroundColor Green } else { Write-Host "❌ FAIL: $($result.message)" -ForegroundColor Red }
    
    # Test 2: Grant Permissions
    Write-Host "`n[Test 2] Grant Permissions" -ForegroundColor Yellow
    $result = Set-MemoryPermissions -taskId $testTaskId -targetAgentId $testAgent -permissions @("read", "write") -grantingAgentId $adminAgent
    if ($result.success) { Write-Host "✅ PASS" -ForegroundColor Green } else { Write-Host "❌ FAIL: $($result.message)" -ForegroundColor Red }
    
    # Test 3: Write Memory
    Write-Host "`n[Test 3] Write Memory (v1)" -ForegroundColor Yellow
    $result = Write-Memory -taskId $testTaskId -key "settings" -value @{time="2077"; location="北京"} -agentId $testAgent
    if ($result.success -and $result.version -eq 1) { Write-Host "✅ PASS (v$($result.version))" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 4: Write Again (v2)
    Write-Host "`n[Test 4] Write Memory (v2)" -ForegroundColor Yellow
    $result = Write-Memory -taskId $testTaskId -key "settings" -value @{time="2088"; location="上海"} -agentId $testAgent
    if ($result.success -and $result.version -eq 2) { Write-Host "✅ PASS (v$($result.version))" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 5: Read Memory
    Write-Host "`n[Test 5] Read Memory" -ForegroundColor Yellow
    $result = Read-Memory -taskId $testTaskId -key "settings" -agentId $testAgent
    if ($result.success -and $result.value.time -eq "2088") { Write-Host "✅ PASS" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 6: List Keys
    Write-Host "`n[Test 6] List Keys" -ForegroundColor Yellow
    $result = List-MemoryKeys -taskId $testTaskId -agentId $testAgent
    if ($result.success -and $result.count -ge 1) { Write-Host "✅ PASS ($($result.count) keys)" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 7: Get History
    Write-Host "`n[Test 7] Get History" -ForegroundColor Yellow
    $result = Get-MemoryHistory -taskId $testTaskId -key "settings" -agentId $testAgent
    if ($result.success -and $result.totalVersions -eq 2) { Write-Host "✅ PASS ($($result.totalVersions) versions)" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 8: Rollback
    Write-Host "`n[Test 8] Rollback to v1" -ForegroundColor Yellow
    $result = Rollback-MemoryKey -taskId $testTaskId -key "settings" -version 1 -agentId $testAgent
    if ($result.success -and $result.newVersion -eq 3) { Write-Host "✅ PASS (now v$($result.newVersion))" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 9: Verify Rollback
    Write-Host "`n[Test 9] Verify Rollback" -ForegroundColor Yellow
    $result = Read-Memory -taskId $testTaskId -key "settings" -agentId $testAgent
    if ($result.success -and $result.value.time -eq "2077") { Write-Host "✅ PASS (value restored to 2077)" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 10: Permission Denied
    Write-Host "`n[Test 10] Permission Denied" -ForegroundColor Yellow
    $result = Set-MemoryPermissions -taskId $testTaskId -targetAgentId "other" -permissions @("admin") -grantingAgentId $testAgent
    if (-not $result.success -and $result.error -eq "PERMISSION_DENIED") { Write-Host "✅ PASS" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Cleanup
    Write-Host "`n[Cleanup] Remove Memory" -ForegroundColor Yellow
    $result = Remove-Memory -taskId $testTaskId -agentId $adminAgent
    if ($result.success) { Write-Host "✅ PASS" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
}

# Export functions
Export-ModuleMember -Function `
    Initialize-Memory, Write-Memory, Read-Memory, List-MemoryKeys, Delete-MemoryKey, `
    Get-MemoryHistory, Rollback-MemoryKey, Set-MemoryPermissions, Get-MemoryPermissions, `
    Remove-Memory, Get-MemoryAccessLog, `
    Initialize-MemoryStore, Write-SharedMemory, Read-SharedMemory, Update-SharedMemory, `
    Remove-SharedMemory, Acquire-WriteLock, Release-WriteLock, `
    Acquire-ProtocolLock, Release-ProtocolLock, `
    Test-SharedMemoryProtocol
