$body = @{
    inputType = "text"
    inputValue = "2+2=4"
    pipelineVariant = "claimboundary"
} | ConvertTo-Json

$job = Invoke-RestMethod -Uri "http://localhost:5000/v1/analyze" -Method Post -Body $body -ContentType "application/json"
Write-Host "Job ID: $($job.jobId)"
$job.jobId
