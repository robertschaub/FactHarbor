# Submit 3 test analyses for performance validation

$adminKey = $env:FH_ADMIN_KEY
$baseUrl = "http://localhost:5000/api/fh/jobs"

$headers = @{
    "X-Admin-Key" = $adminKey
    "Content-Type" = "application/json"
}

# Test 1: Simple claim (CB pipeline)
Write-Host "`n=== Test 1: Simple Claim (CB Pipeline) ===" -ForegroundColor Cyan
$body1 = @{
    input = "The sky is blue"
    variant = "claimboundary"
    mode = "deep"
} | ConvertTo-Json
$job1 = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body1
Write-Host "Job ID: $($job1.jobId)" -ForegroundColor Green

# Test 2: Complex multi-aspect claim (CB pipeline)
Write-Host "`n=== Test 2: Complex Claim (CB Pipeline) ===" -ForegroundColor Cyan
$body2 = @{
    input = "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"
    variant = "claimboundary"
    mode = "deep"
} | ConvertTo-Json
$job2 = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body2
Write-Host "Job ID: $($job2.jobId)" -ForegroundColor Green

# Test 3: Technical claim (Dynamic pipeline)
Write-Host "`n=== Test 3: Technical Claim (Dynamic Pipeline) ===" -ForegroundColor Cyan
$body3 = @{
    input = "Using hydrogen for cars is more efficient than using electricity"
    variant = "monolithic_dynamic"
    mode = "deep"
} | ConvertTo-Json
$job3 = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body3
Write-Host "Job ID: $($job3.jobId)" -ForegroundColor Green

Write-Host "`n=== All tests submitted ===" -ForegroundColor Yellow
Write-Host "Monitor progress at: http://localhost:3000/jobs"
Write-Host "`nJob IDs:"
Write-Host "  Test 1 (Simple, CB):    $($job1.jobId)"
Write-Host "  Test 2 (Complex, CB):   $($job2.jobId)"
Write-Host "  Test 3 (Technical, Dyn): $($job3.jobId)"
