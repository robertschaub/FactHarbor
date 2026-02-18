# Quick metrics test with very simple input

$baseUrl = "http://localhost:5000/v1/analyze"

Write-Host "`n=== Quick Metrics Test ===" -ForegroundColor Cyan

# Submit a very simple ClaimBoundary test
Write-Host "Submitting test job..." -ForegroundColor Yellow
$body = @{
    inputType = "text"
    inputValue = "The sky is blue"
    pipelineVariant = "claimboundary"
} | ConvertTo-Json

$job = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $body -ContentType "application/json"
Write-Host "Job ID: $($job.jobId)" -ForegroundColor Green
Write-Host "Monitor: http://localhost:3000/jobs/$($job.jobId)"

Write-Host "`nWaiting 90 seconds for completion..." -ForegroundColor Cyan
Start-Sleep -Seconds 90

# Check metrics
Write-Host "`n=== Checking Metrics ===" -ForegroundColor Cyan
cd apps/api

$status = & sqlite3 factharbor.db "SELECT Status, Progress FROM Jobs WHERE JobId = '$($job.jobId)';"
Write-Host "Job Status: $status"

$metricsCount = & sqlite3 factharbor.db "SELECT COUNT(*) FROM AnalysisMetrics WHERE JobId = '$($job.jobId)';"
Write-Host "Metrics Records: $metricsCount" -ForegroundColor $(if ($metricsCount -gt 0) { 'Green' } else { 'Red' })

if ($metricsCount -gt 0) {
    Write-Host "`n=== SUCCESS! Metrics Collected ===" -ForegroundColor Green
    $metricsJson = & sqlite3 factharbor.db "SELECT MetricsJson FROM AnalysisMetrics WHERE JobId = '$($job.jobId)';"
    $metrics = $metricsJson | ConvertFrom-Json

    Write-Host "`nPipeline: $($metrics.pipelineVariant)"
    Write-Host "Duration: $([math]::Round($metrics.totalDurationMs / 1000, 1))s"
    Write-Host "LLM Calls: $($metrics.llmCalls.Count)"
    Write-Host "Total Tokens: $($metrics.tokenCounts.totalTokens)"
    Write-Host "Est. Cost: `$$([math]::Round($metrics.estimatedCostUSD, 3))"

    Write-Host "`nPhase Timings:"
    Write-Host "  Understand: $([math]::Round($metrics.phaseTimings.understand / 1000, 1))s"
    Write-Host "  Research:   $([math]::Round($metrics.phaseTimings.research / 1000, 1))s"
    Write-Host "  Verdict:    $([math]::Round($metrics.phaseTimings.verdict / 1000, 1))s" -ForegroundColor Cyan
    Write-Host "  Summary:    $([math]::Round($metrics.phaseTimings.summary / 1000, 1))s"
    Write-Host "  Report:     $([math]::Round($metrics.phaseTimings.report / 1000, 1))s"

    Write-Host "`nGate 1 Stats:"
    Write-Host "  Total Claims: $($metrics.gate1Stats.totalClaims)"
    Write-Host "  Passed: $($metrics.gate1Stats.passedClaims)"

    if ($metrics.gate4Stats) {
        Write-Host "`nGate 4 Stats:"
        Write-Host "  Total Verdicts: $($metrics.gate4Stats.totalVerdicts)"
        Write-Host "  High Confidence: $($metrics.gate4Stats.highConfidence)"
        Write-Host "  Medium Confidence: $($metrics.gate4Stats.mediumConfidence)"
    }
} else {
    Write-Host "`n=== FAILURE: No Metrics Found ===" -ForegroundColor Red

    # Check for errors
    $errors = & sqlite3 factharbor.db "SELECT Message FROM JobEvents WHERE JobId = '$($job.jobId)' AND Level = 'error' ORDER BY TsUtc DESC LIMIT 3;"
    if ($errors) {
        Write-Host "`nRecent Errors:" -ForegroundColor Red
        Write-Host $errors
    }
}
