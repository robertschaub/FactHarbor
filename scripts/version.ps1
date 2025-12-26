Write-Host "API version:"
Invoke-WebRequest http://localhost:5000/version -UseBasicParsing | Select-Object -ExpandProperty Content
Write-Host ""
Write-Host "Web version:"
Invoke-WebRequest http://localhost:3000/api/version -UseBasicParsing | Select-Object -ExpandProperty Content
