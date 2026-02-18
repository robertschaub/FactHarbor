# Test metrics collection in both pipelines

$adminKey = $env:FH_ADMIN_KEY
$baseUrl = "http://localhost:5000/api/fh/jobs"

$headers = @{
    "X-Admin-Key" = $adminKey
    "Content-Type" = "application/json"
}

Write-Host "`n=== Testing Metrics Collection ===" -ForegroundColor Cyan

# Test 1: ClaimBoundary pipeline with simple input
Write-Host "`n[1/2] Submitting ClaimBoundary test..." -ForegroundColor Yellow
$cb_body = @{
    input = "Water freezes at 0 degrees Celsius"
    variant = "claimboundary"
    mode = "deep"
} | ConvertTo-Json

$cb_job = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $cb_body
Write-Host "  Job ID: $($cb_job.jobId)" -ForegroundColor Green

# Test 2: Monolithic Dynamic pipeline with simple input
Write-Host "`n[2/2] Submitting Monolithic Dynamic test..." -ForegroundColor Yellow
$md_body = @{
    input = "The Earth orbits the Sun"
    variant = "monolithic_dynamic"
    mode = "deep"
} | ConvertTo-Json

$md_job = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $md_body
Write-Host "  Job ID: $($md_job.jobId)" -ForegroundColor Green

Write-Host "`n=== Waiting for jobs to complete (30s) ===" -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Check job statuses
Write-Host "`n=== Checking Job Status ===" -ForegroundColor Cyan

$cb_status = Invoke-RestMethod -Uri "$baseUrl/$($cb_job.jobId)" -Headers $headers
Write-Host "`nClaimBoundary job: $($cb_status.status) ($($cb_status.progress)%)"

$md_status = Invoke-RestMethod -Uri "$baseUrl/$($md_job.jobId)" -Headers $headers
Write-Host "Monolithic Dynamic job: $($md_status.status) ($($md_status.progress)%)"

# Check if metrics were collected
Write-Host "`n=== Checking Metrics Collection ===" -ForegroundColor Cyan

cd apps/api
$cb_metrics = & sqlite3 factharbor.db "SELECT COUNT(*) FROM AnalysisMetrics WHERE JobId = '$($cb_job.jobId)';"
$md_metrics = & sqlite3 factharbor.db "SELECT COUNT(*) FROM AnalysisMetrics WHERE JobId = '$($md_job.jobId)';"

Write-Host "`nClaimBoundary metrics records: $cb_metrics" -ForegroundColor $(if ($cb_metrics -gt 0) { 'Green' } else { 'Red' })
Write-Host "Monolithic Dynamic metrics records: $md_metrics" -ForegroundColor $(if ($md_metrics -gt 0) { 'Green' } else { 'Red' })

if ($cb_metrics -gt 0) {
    Write-Host "`n--- ClaimBoundary Metrics ---" -ForegroundColor Yellow
    $cb_metrics_json = & sqlite3 factharbor.db "SELECT MetricsJson FROM AnalysisMetrics WHERE JobId = '$($cb_job.jobId)';"
    $cb_parsed = $cb_metrics_json | ConvertFrom-Json
    Write-Host "  Pipeline Variant: $($cb_parsed.pipelineVariant)"
    Write-Host "  Total Duration: $([math]::Round($cb_parsed.totalDurationMs / 1000, 1))s"
    Write-Host "  LLM Calls: $($cb_parsed.llmCalls.Count)"
    Write-Host "  Phase Timings:" -ForegroundColor Gray
    Write-Host "    - Understand: $([math]::Round($cb_parsed.phaseTimings.understand / 1000, 1))s"
    Write-Host "    - Research: $([math]::Round($cb_parsed.phaseTimings.research / 1000, 1))s"
    Write-Host "    - Verdict: $([math]::Round($cb_parsed.phaseTimings.verdict / 1000, 1))s"
    Write-Host "    - Summary: $([math]::Round($cb_parsed.phaseTimings.summary / 1000, 1))s"
    Write-Host "    - Report: $([math]::Round($cb_parsed.phaseTimings.report / 1000, 1))s"
}

if ($md_metrics -gt 0) {
    Write-Host "`n--- Monolithic Dynamic Metrics ---" -ForegroundColor Yellow
    $md_metrics_json = & sqlite3 factharbor.db "SELECT MetricsJson FROM AnalysisMetrics WHERE JobId = '$($md_job.jobId)';"
    $md_parsed = $md_metrics_json | ConvertFrom-Json
    Write-Host "  Pipeline Variant: $($md_parsed.pipelineVariant)"
    Write-Host "  Total Duration: $([math]::Round($md_parsed.totalDurationMs / 1000, 1))s"
    Write-Host "  LLM Calls: $($md_parsed.llmCalls.Count)"
    Write-Host "  Phase Timings:" -ForegroundColor Gray
    Write-Host "    - Understand: $([math]::Round($md_parsed.phaseTimings.understand / 1000, 1))s"
    Write-Host "    - Research: $([math]::Round($md_parsed.phaseTimings.research / 1000, 1))s"
    Write-Host "    - Verdict: $([math]::Round($md_parsed.phaseTimings.verdict / 1000, 1))s"
    Write-Host "    - Report: $([math]::Round($md_parsed.phaseTimings.report / 1000, 1))s"
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green
Write-Host "Job URLs:"
Write-Host "  CB: http://localhost:3000/jobs/$($cb_job.jobId)"
Write-Host "  MD: http://localhost:3000/jobs/$($md_job.jobId)"
