param(
    [string]$ApiUrls = "http://localhost:5000",
    [int]$WebPort = 3000,
    [string]$ApiDbPath = "",
    [string]$RunnerBaseUrl = "",
    [string]$ApiBaseUrl = ""
)

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

function Get-ConfiguredPorts([string]$urls, [int[]]$fallbackPorts) {
    $ports = @()
    foreach ($rawUrl in ($urls -split ';' | Where-Object { $_ -match '^https?://' })) {
        try {
            $uri = [Uri]$rawUrl
            $port = if ($uri.IsDefaultPort) {
                if ($uri.Scheme -eq 'https') { 443 } else { 80 }
            } else {
                $uri.Port
            }
            if ($port -and $ports -notcontains $port) {
                $ports += $port
            }
        } catch {
            Write-Host "  Could not parse URL '$rawUrl' while determining listener ports." -ForegroundColor Yellow
        }
    }

    if ($ports.Count -gt 0) {
        return $ports
    }

    return $fallbackPorts
}

function Stop-ListeningProcesses([int[]]$ports, [string]$label) {
    foreach ($port in $ports) {
        Write-Host "Checking for processes using $label port $port..."
        $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in ($connections | Select-Object -Unique OwningProcess)) {
                $procId = $conn.OwningProcess
                try {
                    $proc = Get-Process -Id $procId -ErrorAction Stop
                    Write-Host ("Killing process on port {0}: PID {1} ({2})" -f $port, $procId, $proc.ProcessName) -ForegroundColor Yellow
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                } catch {
                    Write-Host "  Could not kill PID $procId : $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "No process listening on port $port."
        }
        Write-Host ""
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

$apiPorts = Get-ConfiguredPorts -urls $ApiUrls -fallbackPorts @(5000)
Stop-ListeningProcesses -ports $apiPorts -label "API"
Stop-ListeningProcesses -ports @($WebPort) -label "Web"

Write-Host "Starting API and Web services..."

# Start API in new terminal (creates DB on startup if missing)
Write-Host "Starting API..."
$apiEnvPrefix = "`$env:ASPNETCORE_ENVIRONMENT='Development'; `$env:ASPNETCORE_URLS='$ApiUrls'; "
if (-not $RunnerBaseUrl) {
    $RunnerBaseUrl = "http://localhost:$WebPort"
}
$apiEnvPrefix += "`$env:Runner__BaseUrl='$RunnerBaseUrl'; "
if ($ApiDbPath) {
    $apiEnvPrefix += "`$env:ConnectionStrings__FhDbSqlite='Data Source=$ApiDbPath'; "
}
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd `"$PSScriptRoot\..\apps\api`"; $apiEnvPrefix dotnet watch run"
)

# Propagate select env vars into the spawned Web dev-server shell explicitly.
# (On Windows, relying on inherited environment across Start-Process can be unreliable in some setups.)
# Also source apps/web/.env.local if present so settings are deterministic.
$webEnvPrefix = ""
$envLocalPath = Join-Path $PSScriptRoot "..\apps\web\.env.local"
if (Test-Path $envLocalPath) {
    Get-Content $envLocalPath | ForEach-Object {
        if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $key = $matches[1]
            $val = $matches[2].Trim('"', "'", ' ')
            $webEnvPrefix += "`$env:$key='$val'; "
        }
    }
}
# Allow explicit shell env to override .env.local
if ($env:FH_RUNNER_MAX_CONCURRENCY) {
    $webEnvPrefix += "`$env:FH_RUNNER_MAX_CONCURRENCY='$($env:FH_RUNNER_MAX_CONCURRENCY)'; "
}
$selectedApiUrl = ""
if ($ApiUrls) {
    $selectedApiUrl = $ApiUrls.Split(';') | Where-Object { $_ -match '^http://' } | Select-Object -First 1
    if (-not $selectedApiUrl) {
        $selectedApiUrl = $ApiUrls.Split(';') | Where-Object { $_ -match '^https?://' } | Select-Object -First 1
    }
}
if (-not $ApiBaseUrl) {
    $ApiBaseUrl = $selectedApiUrl
}
if (-not $ApiBaseUrl) {
    $ApiBaseUrl = "http://localhost:5000"
}
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')
$webEnvPrefix += "`$env:FH_API_BASE_URL='$ApiBaseUrl'; `$env:PORT='$WebPort'; "

# Reseed prompts and configs into config.db so the dev server picks up file changes
Write-Host "Reseeding prompts and configs..."
try {
    Push-Location "$PSScriptRoot\..\apps\web"
    & npx tsx scripts/reseed-all-prompts.ts --quiet 2>&1 | ForEach-Object { Write-Host "  $_" }
    Pop-Location
    Write-Host "Reseed complete." -ForegroundColor Green
} catch {
    Write-Host "  Reseed failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  Dev server will use existing config.db contents." -ForegroundColor Yellow
    Pop-Location
}
Write-Host ""

# Start Web in new terminal
Write-Host "Starting Web..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd `"$PSScriptRoot\..\apps\web`"; $webEnvPrefix npm run dev"
)

Write-Host ""
Write-Host "Services started!"
Write-Host ""
Write-Host "Web:    http://localhost:$WebPort  (use HTTP, not HTTPS)"
Write-Host "API:    $ApiBaseUrl"
Write-Host "Swagger:$ApiBaseUrl/swagger"
Write-Host ""
Write-Host "Note: Make sure apps/web/.env.local exists with required environment variables."
