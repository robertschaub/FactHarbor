# Apply AnalysisMetrics Table Migration
# Run this script to add the metrics table to your database

param(
    [string]$DatabasePath = "$PSScriptRoot\..\apps\api\factharbor.db"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FactHarbor Database Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if database exists
if (-not (Test-Path $DatabasePath)) {
    Write-Host "✗ Database not found at: $DatabasePath" -ForegroundColor Red
    Write-Host "  The database will be created automatically when the API starts." -ForegroundColor Yellow
    Write-Host "  Please start the API server first, then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Database found: $DatabasePath" -ForegroundColor Green
Write-Host ""

# Check if sqlite3 is available
$sqlite = Get-Command sqlite3 -ErrorAction SilentlyContinue

if (-not $sqlite) {
    Write-Host "SQLite command-line tool not found." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Install SQLite" -ForegroundColor Cyan
    Write-Host "  Download from: https://www.sqlite.org/download.html" -ForegroundColor White
    Write-Host "  Or use: winget install SQLite.SQLite" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2: Manual SQL execution" -ForegroundColor Cyan
    Write-Host "  Use any SQLite browser tool to run:" -ForegroundColor White
    Write-Host "  $PSScriptRoot\..\apps\api\Migrations\20260119_AddAnalysisMetrics_Manual.sql" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 3: Let EF Core create it automatically" -ForegroundColor Cyan
    Write-Host "  The table will be created automatically when the API starts" -ForegroundColor White
    Write-Host "  if you add [Migration] attribute to DbContext or use code-first approach" -ForegroundColor White
    Write-Host ""
    exit 0
}

# Apply migration
Write-Host "Applying migration..." -ForegroundColor Yellow

$sqlFile = "$PSScriptRoot\..\apps\api\Migrations\20260119_AddAnalysisMetrics_Manual.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "✗ Migration SQL file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

try {
    # Run SQL migration
    $result = & sqlite3 $DatabasePath < $sqlFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Migration applied successfully" -ForegroundColor Green
        Write-Host ""
        
        # Verify table exists
        $tableCheck = & sqlite3 $DatabasePath "SELECT name FROM sqlite_master WHERE type='table' AND name='AnalysisMetrics';"
        
        if ($tableCheck -eq "AnalysisMetrics") {
            Write-Host "✓ AnalysisMetrics table verified" -ForegroundColor Green
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Cyan
            Write-Host "1. Restart the API server" -ForegroundColor White
            Write-Host "2. Visit http://localhost:3000/admin/metrics" -ForegroundColor White
            Write-Host "3. Check Swagger: http://localhost:5000/swagger" -ForegroundColor White
        } else {
            Write-Host "⚠ Table creation may have failed. Check manually." -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ Migration completed with warnings: $result" -ForegroundColor Yellow
        Write-Host "  This may be OK if the table already exists." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "✗ Error applying migration: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Migration complete!" -ForegroundColor Green
