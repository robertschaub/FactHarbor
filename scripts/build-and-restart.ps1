param(
    [string]$ApiUrls = "https://localhost:5001;http://localhost:5000",
    [int]$WebPort = 3000,
    [string]$ApiDbPath = "",
    [string]$RunnerBaseUrl = "",
    [string]$ApiBaseUrl = ""
)

$ErrorActionPreference = "Stop"

Write-Host "== FactHarbor Build and Restart ==" -ForegroundColor Cyan
Write-Host ""

# Change to project root
Set-Location "$PSScriptRoot\.."

Write-Host "Building web app..." -ForegroundColor Yellow
try {
    npm run build --workspace @factharbor/web

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Services NOT restarted." -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Build succeeded!" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "Build failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Services NOT restarted." -ForegroundColor Red
    exit 1
}

# Build succeeded, restart services
Write-Host "Restarting services..." -ForegroundColor Yellow

$restartArgs = @(
    '-ExecutionPolicy', 'Bypass',
    '-File', "$PSScriptRoot\restart-clean.ps1"
)

# Pass through parameters to restart-clean.ps1
if ($ApiUrls) { $restartArgs += '-ApiUrls', $ApiUrls }
if ($WebPort) { $restartArgs += '-WebPort', $WebPort }
if ($ApiDbPath) { $restartArgs += '-ApiDbPath', $ApiDbPath }
if ($RunnerBaseUrl) { $restartArgs += '-RunnerBaseUrl', $RunnerBaseUrl }
if ($ApiBaseUrl) { $restartArgs += '-ApiBaseUrl', $ApiBaseUrl }

& powershell @restartArgs

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
