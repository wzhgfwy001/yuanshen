$os = Get-CimInstance Win32_OperatingSystem
$free = $os.FreePhysicalMemory / 1MB
$total = $os.TotalVisibleMemorySize / 1MB
$used = $total - $free
$pct = [math]::Round($used / $total * 100, 1)
Write-Host "RAM: ${pct}% used ($( [math]::Round($used, 1) )GB / $( [math]::Round($total, 1) )GB)"

$cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
Write-Host "CPU: ${cpu}%"

$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$diskFree = [math]::Round($disk.FreeSpace / 1GB, 1)
Write-Host "Disk C: ${diskFree}GB free"
