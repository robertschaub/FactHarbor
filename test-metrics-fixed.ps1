# Test metrics collection in both pipelines (CORRECTED)

$baseUrl = "http://localhost:5000/v1/analyze"  # FIXED: Correct endpoint

Write-Host "`n=== Testing Metrics Collection ===" -ForegroundColor Cyan

# Test 1: ClaimBoundary pipeline with simple input
Write-Host "`n[1/2] Submitting ClaimBoundary test..." -ForegroundColor Yellow
$cb_body = @{
    inputType = "text"
    inputValue = "Water freezes at 0 degrees Celsius"
    pipelineVariant = "claimboundary"
} | ConvertTo-Json

$cb_job = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $cb_body -ContentType "application/json"
Write-Host "  Job ID: $($cb_job.jobId)" -ForegroundColor Green

# Test 2: Monolithic Dynamic pipeline with simple input
Write-Host "`n[2/2] Submitting Monolithic Dynamic test..." -ForegroundColor Yellow
$md_body = @{
    inputType = "text"
    inputValue = "The Earth orbits the Sun"
    pipelineVariant = "monolithic_dynamic"
} | ConvertTo-Json

$md_job = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $md_body -ContentType "application/json"
Write-Host "  Job ID: $($md_job.jobId)" -ForegroundColor Green

Write-Host "`n=== Jobs submitted successfully ===" -ForegroundColor Green
Write-Host "CB Job: http://localhost:3000/jobs/$($cb_job.jobId)"
Write-Host "MD Job: http://localhost:3000/jobs/$($md_job.jobId)"

Write-Host "`n=== Waiting for jobs to complete (60s) ===" -ForegroundColor Cyan
Start-Sleep -Seconds 60

# Check if metrics were collected
Write-Host "`n=== Checking Metrics Collection ===" -ForegroundColor Cyan

cd apps/api
$cb_metrics = & sqlite3 factharbor.db "SELECT COUNT(*) FROM AnalysisMetrics WHERE JobId = '$($cb_job.jobId)';"
$md_metrics = & sqlite3 factharbor.db "SELECT COUNT(*) FROM AnalysisMetrics WHERE JobId = '$($md_job.jobId)';"

Write-Host "`nClaimBoundary metrics records: $cb_metrics" -ForegroundColor $(if ($cb_metrics -gt 0) { 'Green' } else { 'Red' })
Write-Host "Monolithic Dynamic metrics records: $md_metrics" -ForegroundColor $(if ($md_metrics -gt 0) { 'Green' } else { 'Red' })

if ($cb_metrics -gt 0) {
    Write-Host "`n=== ClaimBoundary Metrics ===" -ForegroundColor Yellow
    $cb_metrics_json = & sqlite3 factharbor.db "SELECT MetricsJson FROM AnalysisMetrics WHERE JobId = '$($cb_job.jobId)';"
    $cb_parsed = $cb_metrics_json | ConvertFrom-Json
    Write-Host "Pipeline Variant: $($cb_parsed.pipelineVariant)"
    Write-Host "Total Duration: $([math]::Round($cb_parsed.totalDurationMs / 1000, 1))s"
    Write-Host "LLM Calls: $($cb_parsed.llmCalls.Count)"
    Write-Host "Total Tokens: $($cb_parsed.tokenCounts.totalTokens)"
    Write-Host "Estimated Cost: `$$([math]::Round($cb_parsed.estimatedCostUSD, 3))"
    Write-Host "`nPhase Timings:"
    Write-Host "  Understand: $([math]::Round($cb_parsed.phaseTimings.understand / 1000, 1))s"
    Write-Host "  Research:   $([math]::Round($cb_parsed.phaseTimings.research / 1000, 1))s"
    Write-Host "  Verdict:    $([math]::Round($cb_parsed.phaseTimings.verdict / 1000, 1))s" -ForegroundColor Cyan
    Write-Host "  Summary:    $([math]::Round($cb_parsed.phaseTimings.summary / 1000, 1))s"
    Write-Host "  Report:     $([math]::Round($cb_parsed.phaseTimings.report / 1000, 1))s"
}

if ($md_metrics -gt 0) {
    Write-Host "`n=== Monolithic Dynamic Metrics ===" -ForegroundColor Yellow
    $md_metrics_json = & sqlite3 factharbor.db "SELECT MetricsJson FROM AnalysisMetrics WHERE JobId = '$($md_job.jobId)';"
    $md_parsed = $md_metrics_json | ConvertFrom-Json
    Write-Host "Pipeline Variant: $($md_parsed.pipelineVariant)"
    Write-Host "Total Duration: $([math]::Round($md_parsed.totalDurationMs / 1000, 1))s"
    Write-Host "LLM Calls: $($md_parsed.llmCalls.Count)"
    Write-Host "Total Tokens: $($md_parsed.tokenCounts.totalTokens)"
    Write-Host "Estimated Cost: `$$([math]::Round($md_parsed.estimatedCostUSD, 3))"
    Write-Host "`nPhase Timings:"
    Write-Host "  Understand: $([math]::Round($md_parsed.phaseTimings.understand / 1000, 1))s"
    Write-Host "  Research:   $([math]::Round($md_parsed.phaseTimings.research / 1000, 1))s"
    Write-Host "  Verdict:    $([math]::Round($md_parsed.phaseTimings.verdict / 1000, 1))s" -ForegroundColor Cyan
    Write-Host "  Report:     $([math]::Round($md_parsed.phaseTimings.report / 1000, 1))s"
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green
