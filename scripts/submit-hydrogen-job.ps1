# Hydrogen Job Submission Script (User Specific)

param([string]$ApiBase = "http://localhost:5000")

$endpoint = "$($ApiBase.TrimEnd('/'))/v1/analyze"
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
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        # PowerShell 7 puts the response body in ErrorDetails; Windows PowerShell 5.1 only exposes it as a stream.
        $errorBody = $_.ErrorDetails.Message
        if (-not $errorBody -and $errorResponse.PSObject.Methods['GetResponseStream']) {
            $errorBody = (New-Object System.IO.StreamReader($errorResponse.GetResponseStream())).ReadToEnd()
        }
        Write-Host "Server Response: $errorBody"
    } else {
        Write-Host "Error: $($_.Exception.Message)"
    }
    exit 1
}
