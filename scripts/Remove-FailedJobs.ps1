# Remove-FailedJobs.ps1
# Removes all jobs with Status = 'FAILED' from the FactHarbor database

$dbPath = Join-Path $PSScriptRoot "..\apps\api\factharbor.db"

if (-not (Test-Path $dbPath)) {
    Write-Host "Database not found at: $dbPath" -ForegroundColor Red
    exit 1
}

$dbPath = (Resolve-Path $dbPath).Path

# Check if sqlite3 is available
$sqlite3 = Get-Command sqlite3 -ErrorAction SilentlyContinue

if (-not $sqlite3) {
    Write-Host "sqlite3 CLI not found." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To install sqlite3, run one of:" -ForegroundColor White
    Write-Host "  winget install SQLite.SQLite" -ForegroundColor Cyan
    Write-Host "  choco install sqlite" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or manually delete failed jobs:" -ForegroundColor White
    Write-Host "  1. Download DB Browser for SQLite: https://sqlitebrowser.org/" -ForegroundColor Gray
    Write-Host "  2. Open: $dbPath" -ForegroundColor Gray
    Write-Host "  3. Run SQL:" -ForegroundColor Gray
    Write-Host ""
    Write-Host "DELETE FROM JobEvents WHERE JobId IN (SELECT JobId FROM Jobs WHERE Status = 'FAILED');" -ForegroundColor Cyan
    Write-Host "DELETE FROM Jobs WHERE Status = 'FAILED';" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Preview failed jobs first
Write-Host "Checking for failed jobs..." -ForegroundColor Cyan
$count = & sqlite3 $dbPath "SELECT COUNT(*) FROM Jobs WHERE Status = 'FAILED';"

if ($count -eq "0" -or [string]::IsNullOrEmpty($count)) {
    Write-Host "No failed jobs found." -ForegroundColor Green
    exit 0
}

Write-Host "Found $count failed job(s):" -ForegroundColor Yellow
Write-Host ""
& sqlite3 -header -column $dbPath "SELECT substr(JobId,1,12) as JobId, substr(COALESCE(InputPreview,'(none)'),1,45) as InputPreview, CreatedUtc FROM Jobs WHERE Status = 'FAILED';"

# Confirm deletion
Write-Host ""
$confirm = Read-Host "Delete these $count failed job(s)? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Aborted." -ForegroundColor Yellow
    exit 0
}

# Delete related events and jobs
Write-Host "Deleting failed jobs..." -ForegroundColor Cyan
& sqlite3 $dbPath "DELETE FROM JobEvents WHERE JobId IN (SELECT JobId FROM Jobs WHERE Status = 'FAILED'); DELETE FROM Jobs WHERE Status = 'FAILED';"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully deleted $count failed job(s)." -ForegroundColor Green
} else {
    Write-Host "Error deleting jobs." -ForegroundColor Red
    exit 1
}
