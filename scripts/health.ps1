$ErrorActionPreference = "Continue"

Write-Host "API health:"
try {
    $response = Invoke-WebRequest http://localhost:5000/health -UseBasicParsing -ErrorAction Stop
    Write-Host $response.Content
} catch {
    Write-Host "✗ API is not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Web health:"
try {
    $response = Invoke-WebRequest http://localhost:3000/api/health -UseBasicParsing -ErrorAction Stop
    Write-Host $response.Content
} catch {
    Write-Host "✗ Web is not responding: $($_.Exception.Message)" -ForegroundColor Red
}
