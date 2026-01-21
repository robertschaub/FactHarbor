# Remove-FailedJobs.ps1
# Removes jobs with Status = 'FAILED' and stale 'RUNNING' jobs (>24 hours old) from the FactHarbor database

param(
    [switch]$FailedOnly,
    [switch]$StaleOnly,
    [int]$StaleHours = 24
)

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
    Write-Host "Or manually delete jobs:" -ForegroundColor White
    Write-Host "  1. Download DB Browser for SQLite: https://sqlitebrowser.org/" -ForegroundColor Gray
    Write-Host "  2. Open: $dbPath" -ForegroundColor Gray
    Write-Host "  3. Run SQL:" -ForegroundColor Gray
    Write-Host ""
    Write-Host "-- Delete failed jobs:" -ForegroundColor Gray
    Write-Host "DELETE FROM JobEvents WHERE JobId IN (SELECT JobId FROM Jobs WHERE Status = 'FAILED');" -ForegroundColor Cyan
    Write-Host "DELETE FROM Jobs WHERE Status = 'FAILED';" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "-- Delete stale running jobs (>24 hours):" -ForegroundColor Gray
    Write-Host "DELETE FROM JobEvents WHERE JobId IN (SELECT JobId FROM Jobs WHERE Status = 'RUNNING' AND datetime(CreatedUtc) < datetime('now', '-1 day'));" -ForegroundColor Cyan
    Write-Host "DELETE FROM Jobs WHERE Status = 'RUNNING' AND datetime(CreatedUtc) < datetime('now', '-1 day');" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

$totalDeleted = 0

# --- Handle FAILED jobs ---
if (-not $StaleOnly) {
    Write-Host "Checking for failed jobs..." -ForegroundColor Cyan
    $failedCount = & sqlite3 $dbPath "SELECT COUNT(*) FROM Jobs WHERE Status = 'FAILED';"

    if ($failedCount -eq "0" -or [string]::IsNullOrEmpty($failedCount)) {
        Write-Host "No failed jobs found." -ForegroundColor Green
    } else {
        Write-Host "Found $failedCount failed job(s):" -ForegroundColor Yellow
        Write-Host ""
        & sqlite3 -header -column $dbPath "SELECT substr(JobId,1,12) as JobId, substr(COALESCE(InputPreview,'(none)'),1,45) as InputPreview, CreatedUtc FROM Jobs WHERE Status = 'FAILED';"

        Write-Host ""
        $confirm = Read-Host "Delete these $failedCount failed job(s)? (y/N)"
        if ($confirm -eq 'y' -or $confirm -eq 'Y') {
            Write-Host "Deleting failed jobs..." -ForegroundColor Cyan
            & sqlite3 $dbPath "DELETE FROM JobEvents WHERE JobId IN (SELECT JobId FROM Jobs WHERE Status = 'FAILED'); DELETE FROM Jobs WHERE Status = 'FAILED';"
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Successfully deleted $failedCount failed job(s)." -ForegroundColor Green
                $totalDeleted += [int]$failedCount
            } else {
                Write-Host "Error deleting failed jobs." -ForegroundColor Red
            }
        } else {
            Write-Host "Skipped failed jobs." -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

# --- Handle STALE RUNNING jobs ---
if (-not $FailedOnly) {
    Write-Host "Checking for stale running jobs (>$StaleHours hours old)..." -ForegroundColor Cyan
    $staleQuery = "SELECT COUNT(*) FROM Jobs WHERE Status = 'RUNNING' AND datetime(CreatedUtc) < datetime('now', '-$StaleHours hours');"
    $staleCount = & sqlite3 $dbPath $staleQuery

    if ($staleCount -eq "0" -or [string]::IsNullOrEmpty($staleCount)) {
        Write-Host "No stale running jobs found." -ForegroundColor Green
    } else {
        Write-Host "Found $staleCount stale running job(s):" -ForegroundColor Yellow
        Write-Host ""
        $previewQuery = "SELECT substr(JobId,1,12) as JobId, substr(COALESCE(InputPreview,'(none)'),1,45) as InputPreview, CreatedUtc FROM Jobs WHERE Status = 'RUNNING' AND datetime(CreatedUtc) < datetime('now', '-$StaleHours hours');"
        & sqlite3 -header -column $dbPath $previewQuery

        Write-Host ""
        $confirm = Read-Host "Delete these $staleCount stale running job(s)? (y/N)"
        if ($confirm -eq 'y' -or $confirm -eq 'Y') {
            Write-Host "Deleting stale running jobs..." -ForegroundColor Cyan
            $deleteQuery = "DELETE FROM JobEvents WHERE JobId IN (SELECT JobId FROM Jobs WHERE Status = 'RUNNING' AND datetime(CreatedUtc) < datetime('now', '-$StaleHours hours')); DELETE FROM Jobs WHERE Status = 'RUNNING' AND datetime(CreatedUtc) < datetime('now', '-$StaleHours hours');"
            & sqlite3 $dbPath $deleteQuery
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Successfully deleted $staleCount stale running job(s)." -ForegroundColor Green
                $totalDeleted += [int]$staleCount
            } else {
                Write-Host "Error deleting stale running jobs." -ForegroundColor Red
            }
        } else {
            Write-Host "Skipped stale running jobs." -ForegroundColor Yellow
        }
    }
}

# Summary
Write-Host ""
if ($totalDeleted -gt 0) {
    Write-Host "Total jobs deleted: $totalDeleted" -ForegroundColor Green
} else {
    Write-Host "No jobs were deleted." -ForegroundColor Gray
}
