$ErrorActionPreference = "Stop"

Write-Host "== Testing Runner Connection =="
Write-Host ""

# Read API config
$configPath = Join-Path $PSScriptRoot "..\apps\api\appsettings.Development.json"
if (!(Test-Path $configPath)) {
    Write-Host "? Missing config: $configPath" -ForegroundColor Red
    exit 1
}

$apiConfig = Get-Content $configPath -Raw | ConvertFrom-Json
$runnerBaseUrl = $apiConfig.Runner.BaseUrl
$runnerKey = $apiConfig.Runner.RunnerKey

$runnerKeyDisplay = if ([string]::IsNullOrWhiteSpace($runnerKey)) {
    "(missing)"
} else {
    $tail = $runnerKey.Substring([Math]::Max(0, $runnerKey.Length - 4))
    "****$tail"
}

Write-Host "API Config:"
Write-Host "  Runner:BaseUrl = $runnerBaseUrl"
Write-Host "  Runner:RunnerKey = $runnerKeyDisplay"
Write-Host ""

# Test if Next.js endpoint is reachable
Write-Host "Testing Next.js runner endpoint..."
try {
    $url = "$runnerBaseUrl/api/internal/run-job"
    $body = @{ jobId = "test-job-id" } | ConvertTo-Json
    $headers = @{
        "Content-Type" = "application/json"
        "X-Runner-Key" = $runnerKey
    }

    $response = Invoke-WebRequest -Uri $url -Method POST -Body $body -Headers $headers -ErrorAction Stop
    Write-Host "V Endpoint is reachable (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    $statusCode = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $statusCode = $_.Exception.Response.StatusCode.value__
    }
    $errorMsg = $_.Exception.Message

    if ($null -ne $statusCode) {
        Write-Host "? Endpoint test failed (Status: $statusCode)" -ForegroundColor Red
    } else {
        Write-Host "? Endpoint test failed" -ForegroundColor Red
    }
    Write-Host "  Error: $errorMsg" -ForegroundColor Red

    if ($statusCode -eq 401) {
        Write-Host ""
        Write-Host "? Authorization failed! Check that:" -ForegroundColor Yellow
        Write-Host "  1. FH_INTERNAL_RUNNER_KEY in apps/web/.env.local matches Runner:RunnerKey"
        Write-Host "  2. Next.js app was restarted after creating .env.local"
    }
}

Write-Host ""