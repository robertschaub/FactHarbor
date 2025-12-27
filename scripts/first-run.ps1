$ErrorActionPreference = "Stop"

Write-Host "== FactHarbor POC1 first run =="
Write-Host ""
Write-Host "Validating configuration..."
powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\validate-config.ps1"
Write-Host ""

# Start API in new terminal (creates DB on startup if missing)
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd `"$PSScriptRoot\..\apps\api`"; `$env:ASPNETCORE_ENVIRONMENT='Development'; dotnet watch run"
)

# Start Web in new terminal
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd `"$PSScriptRoot\..\apps\web`"; npm install; npm run dev"
)

Write-Host ""
Write-Host "Web:    http://localhost:3000"
Write-Host "API:    http://localhost:5000"
Write-Host "Swagger:http://localhost:5000/swagger"
