$ErrorActionPreference = "Stop"
. "$PSScriptRoot\service-process-cleanup.ps1"

Write-Host "== FactHarbor Stop Services =="
Write-Host ""

Write-Host "Stopping existing services (graceful)..."
$apiShells = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "powershell.exe" -and $_.CommandLine -match "apps\\\\api" -and $_.CommandLine -match "dotnet watch run"
}
$webShells = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "powershell.exe" -and $_.CommandLine -match "apps\\\\web" -and $_.CommandLine -match "npm run dev"
}

Stop-Gracefully -label "API" -cimProcesses $apiShells
Stop-Gracefully -label "Web" -cimProcesses $webShells
Stop-FactHarborServiceProcesses
Stop-OrphanedDotnetWatchProcesses

# Kill any process still using the public dev ports.
foreach ($port in @(5000, 3000)) {
    Write-Host ""
    Write-Host "Checking for processes using port $port..."
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($listeners) {
        foreach ($conn in ($listeners | Select-Object -Unique OwningProcess)) {
            $procId = $conn.OwningProcess
            try {
                $proc = Get-Process -Id $procId -ErrorAction Stop
                Write-Host "Killing process on port ${port}: PID $procId ($($proc.ProcessName))" -ForegroundColor Yellow
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Host "  Could not kill PID $procId : $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "No process listening on port $port."
    }
}

Write-Host ""
Write-Host "All services stopped."
Write-Host ""
