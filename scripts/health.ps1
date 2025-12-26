Write-Host "API health:"
Invoke-WebRequest http://localhost:5000/health -UseBasicParsing | Select-Object -ExpandProperty Content
Write-Host ""
Write-Host "Web health:"
Invoke-WebRequest http://localhost:3000/api/health -UseBasicParsing | Select-Object -ExpandProperty Content
