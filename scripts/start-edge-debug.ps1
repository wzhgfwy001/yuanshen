$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
Start-Process $edgePath -ArgumentList "--remote-debugging-port=9222" -WindowStyle Hidden
Start-Sleep -Seconds 3
Write-Host "Edge started with debugging port 9222"
