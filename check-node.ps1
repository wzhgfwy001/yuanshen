$procs = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($procs) {
    Write-Host "Node processes found:"
    $procs | ForEach-Object { Write-Host $_.Id $_.Path }
} else {
    Write-Host "No node processes running"
}