$ErrorActionPreference = "Stop"

Write-Host "== FactHarbor POC1 Clean Restart =="
Write-Host ""

Write-Host "Validating configuration..."
powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\validate-config.ps1"
Write-Host ""

function Stop-Gracefully([string]$label, $cimProcesses) {
    if (!$cimProcesses) {
        Write-Host "No running $label processes found."
        return
    }

    foreach ($cim in $cimProcesses) {
        try {
            $proc = Get-Process -Id $cim.ProcessId -ErrorAction Stop
            Write-Host "Stopping $label PID $($proc.Id) ($($proc.ProcessName))..." -ForegroundColor Yellow
            $closed = $proc.CloseMainWindow()
            if (-not $closed) {
                Write-Host "  Could not signal graceful close for PID $($proc.Id). Close it manually if needed." -ForegroundColor Yellow
                continue
            }
            Wait-Process -Id $proc.Id -Timeout 10 -ErrorAction SilentlyContinue
            if (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue) {
                Write-Host "  PID $($proc.Id) is still running; force-killing." -ForegroundColor Yellow
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host "  Could not stop PID $($cim.ProcessId): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "Stopping existing services (graceful)..."
$apiShells = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "powershell.exe" -and $_.CommandLine -match "apps\\\\api" -and $_.CommandLine -match "dotnet watch run"
}
$webShells = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "powershell.exe" -and $_.CommandLine -match "apps\\\\web" -and $_.CommandLine -match "npm run dev"
}

Stop-Gracefully -label "API" -cimProcesses $apiShells
Stop-Gracefully -label "Web" -cimProcesses $webShells
Write-Host ""

Write-Host "Starting API and Web services..."

# Start API in new terminal (creates DB on startup if missing)
Write-Host "Starting API..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd `"$PSScriptRoot\..\apps\api`"; `$env:ASPNETCORE_ENVIRONMENT='Development'; dotnet watch run"
)

# Start Web in new terminal
Write-Host "Starting Web..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd `"$PSScriptRoot\..\apps\web`"; npm run dev"
)

Write-Host ""
Write-Host "Services started!"
Write-Host ""
Write-Host "Web:    http://localhost:3000  (use HTTP, not HTTPS)"
Write-Host "API:    http://localhost:5000"
Write-Host "Swagger:http://localhost:5000/swagger"
Write-Host ""
Write-Host "Note: Make sure apps/web/.env.local exists with required environment variables."
