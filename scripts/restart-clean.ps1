param(
    [string]$ApiUrls = "http://localhost:5000",
    [int]$WebPort = 3000,
    [string]$ApiDbPath = "",
    [string]$RunnerBaseUrl = "",
    [string]$ApiBaseUrl = ""
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\service-process-cleanup.ps1"

Write-Host "== FactHarbor POC1 Clean Restart =="
Write-Host ""

Write-Host "Validating configuration..."
powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\validate-config.ps1"
Write-Host ""

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

function ConvertTo-PowerShellSingleQuotedLiteral([AllowNull()][string]$value) {
    if ($null -eq $value) {
        $value = ""
    }

    return "'" + ($value -replace "'", "''") + "'"
}

function New-EnvAssignment([string]$name, [AllowNull()][string]$value) {
    if ($name -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
        throw "Invalid environment variable name: $name"
    }

    return "`$env:$name = $(ConvertTo-PowerShellSingleQuotedLiteral $value); "
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
Stop-FactHarborServiceProcesses
Stop-OrphanedDotnetWatchProcesses
Write-Host ""

$apiPorts = Get-ConfiguredPorts -urls $ApiUrls -fallbackPorts @(5000)
Stop-ListeningProcesses -ports $apiPorts -label "API"
Stop-ListeningProcesses -ports @($WebPort) -label "Web"

Write-Host "Starting API and Web services..."

# Start API in new terminal (creates DB on startup if missing)
Write-Host "Starting API..."
$apiEnvPrefix = ""
$apiEnvPrefix += New-EnvAssignment "ASPNETCORE_ENVIRONMENT" "Development"
$apiEnvPrefix += New-EnvAssignment "ASPNETCORE_URLS" $ApiUrls
if (-not $RunnerBaseUrl) {
    $RunnerBaseUrl = "http://localhost:$WebPort"
}
$apiEnvPrefix += New-EnvAssignment "Runner__BaseUrl" $RunnerBaseUrl
if ($ApiDbPath) {
    $apiEnvPrefix += New-EnvAssignment "ConnectionStrings__FhDbSqlite" "Data Source=$ApiDbPath"
}
$apiWorkingDir = Join-Path $PSScriptRoot "..\apps\api"
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location -LiteralPath $(ConvertTo-PowerShellSingleQuotedLiteral $apiWorkingDir); $apiEnvPrefix dotnet watch run"
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
            $webEnvPrefix += New-EnvAssignment $key $val
        }
    }
}
# Allow explicit shell env to override .env.local
if ($env:FH_RUNNER_MAX_CONCURRENCY) {
    $webEnvPrefix += New-EnvAssignment "FH_RUNNER_MAX_CONCURRENCY" $env:FH_RUNNER_MAX_CONCURRENCY
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
$webEnvPrefix += New-EnvAssignment "FH_API_BASE_URL" $ApiBaseUrl
$webEnvPrefix += New-EnvAssignment "PORT" $WebPort

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
$webWorkingDir = Join-Path $PSScriptRoot "..\apps\web"
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location -LiteralPath $(ConvertTo-PowerShellSingleQuotedLiteral $webWorkingDir); $webEnvPrefix npm run dev"
)

Write-Host ""
Write-Host "Services started!"
Write-Host ""
Write-Host "Web:    http://localhost:$WebPort  (use HTTP, not HTTPS)"
Write-Host "API:    $ApiBaseUrl"
Write-Host "Swagger:$ApiBaseUrl/swagger"
Write-Host ""
Write-Host "Note: Make sure apps/web/.env.local exists with required environment variables."
