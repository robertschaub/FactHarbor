# Hydrogen Job Submission Script (User Specific)

$endpoint = "http://localhost:5000/v1/analyze"
$inviteCode = "SELF-TEST"
$inputValue = "Using hydrogen for cars is more efficient than using electricity"

$body = @{
    inputType = "text"
    inputValue = $inputValue
    pipelineVariant = "claimboundary"
    inviteCode = $inviteCode
} | ConvertTo-Json

Write-Host "Submitting Job: '$inputValue' with code '$inviteCode'..."

try {
    $response = Invoke-RestMethod -Uri $endpoint `
        -Method Post `
        -Body $body `
        -ContentType "application/json"

    Write-Host "`n✅ Job Submitted Successfully!"
    Write-Host "Job ID: $($response.jobId)"
    Write-Host "Status: $($response.status)"
    Write-Host "View Analysis at: http://localhost:3000/analyze/$($response.jobId)"
} catch {
    Write-Host "`n❌ Failed to submit job."
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Server Response: $errorBody"
    }
}
