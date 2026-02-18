# Check job 000d6d76 status and metrics

$jobId = "000d6d7609864a75a3c79c674c1f6030"
$adminKey = $env:FH_ADMIN_KEY
$baseUrl = "http://localhost:5000/api/jobs"

$headers = @{
    "X-Admin-Key" = $adminKey
}

# Get job details
Write-Host "`n=== Job Status ===" -ForegroundColor Cyan
$job = Invoke-RestMethod -Uri "$baseUrl/$jobId" -Headers $headers
Write-Host "Status: $($job.status)" -ForegroundColor $(if ($job.status -eq 'completed') { 'Green' } elseif ($job.status -eq 'failed') { 'Red' } else { 'Yellow' })
Write-Host "Progress: $($job.progress)%"
Write-Host "Variant: $($job.variant)"
Write-Host "Created: $($job.createdAt)"
Write-Host "Completed: $($job.completedAt)"
Write-Host "Input: $($job.input)"

# Get events
Write-Host "`n=== Phase Events ===" -ForegroundColor Cyan
$eventsResponse = Invoke-RestMethod -Uri "$baseUrl/$jobId/events" -Headers $headers
$phaseEvents = $eventsResponse.events | Where-Object { $_.eventType -like '*Phase*' -or $_.eventType -like '*Stage*' }

foreach ($event in $phaseEvents) {
    $details = if ($event.details) { $event.details | ConvertTo-Json -Compress } else { "" }
    Write-Host "$($event.timestamp) - $($event.eventType)" -ForegroundColor Gray
    if ($details) {
        Write-Host "  $details" -ForegroundColor DarkGray
    }
}

# Get results summary
if ($job.status -eq 'completed' -and $job.results) {
    Write-Host "`n=== Results Summary ===" -ForegroundColor Cyan
    $results = $job.results | ConvertFrom-Json

    if ($results.atomicClaims) {
        Write-Host "AtomicClaims extracted: $($results.atomicClaims.Count)"
    }

    if ($results.claimBoundaries) {
        Write-Host "ClaimBoundaries: $($results.claimBoundaries.Count)"
    }

    if ($results.finalVerdict) {
        Write-Host "Final Verdict confidence: $($results.finalVerdict.confidenceBand)"
    }
}

# Check for errors
$errors = $eventsResponse.events | Where-Object { $_.eventType -eq 'error' }
if ($errors) {
    Write-Host "`n=== Errors ===" -ForegroundColor Red
    foreach ($err in $errors) {
        Write-Host "$($err.timestamp) - $($err.message)"
    }
}
