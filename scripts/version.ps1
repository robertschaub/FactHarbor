$ErrorActionPreference = "Continue"

Write-Host "API version:"
try {
    $response = Invoke-WebRequest http://localhost:5000/version -UseBasicParsing -ErrorAction Stop
    Write-Host $response.Content
} catch {
    Write-Host "✗ API is not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Web version:"
try {
    $response = Invoke-WebRequest http://localhost:3000/api/version -UseBasicParsing -ErrorAction Stop
    Write-Host $response.Content
} catch {
    Write-Host "✗ Web is not responding: $($_.Exception.Message)" -ForegroundColor Red
}
