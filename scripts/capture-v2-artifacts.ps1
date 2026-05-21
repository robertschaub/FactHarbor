param(
    [Parameter(Mandatory=$true)]
    [string]$JobId,
    [string]$AdminKey = "Tabea_Race",
    [string]$BaseUrl = "http://localhost:3000",
    [string]$OutDir = "Docs/WIP"
)

$ledgerId = "${JobId}:precutover-observability"
$encodedLedgerId = [System.Uri]::EscapeDataString($ledgerId)
$headers = @{ "x-admin-key" = $AdminKey }

$routes = @(
    @{ name = "el-sa-intake"; path = "evidence-lifecycle-source-acquisition-intake-artifacts" },
    @{ name = "el-sa-candidate-admission"; path = "evidence-lifecycle-source-acquisition-candidate-admission-artifacts" },
    @{ name = "el-sa-candidate-provider-network"; path = "evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts" },
    @{ name = "el-source-candidate-preview"; path = "evidence-lifecycle-source-candidate-preview-artifacts" },
    @{ name = "el-source-material-page-summary"; path = "evidence-lifecycle-source-material-page-summary-artifacts" },
    @{ name = "el-source-material-evidence-corpus-readiness"; path = "evidence-lifecycle-source-material-evidence-corpus-readiness-artifacts" },
    @{ name = "el-evidence-corpus-observability"; path = "evidence-lifecycle-evidence-corpus-observability-artifacts" },
    @{ name = "el-extraction-input"; path = "evidence-lifecycle-extraction-input-artifacts" },
    @{ name = "el-bounded-evidence-extraction"; path = "evidence-lifecycle-bounded-evidence-extraction-artifacts" },
    @{ name = "el-internal-alpha-report-result"; path = "evidence-lifecycle-internal-alpha-report-result-artifacts" }
)

foreach ($route in $routes) {
    $url = "${BaseUrl}/api/internal/analyzer-v2/$($route.path)?ledgerId=${encodedLedgerId}"
    $outFile = Join-Path $OutDir "v2fixed_$($route.name)-artifacts.json"
    try {
        $response = Invoke-WebRequest -Uri $url -Headers $headers -TimeoutSec 10 -SkipHttpErrorCheck
        if ($response.StatusCode -eq 200) {
            $response.Content | Set-Content -Path $outFile -Encoding UTF8
            Write-Host "OK  $($route.name) -> $outFile"
        } else {
            Write-Host "SKIP $($route.name) -> HTTP $($response.StatusCode)"
        }
    } catch {
        Write-Host "ERR  $($route.name) -> $($_.Exception.Message)"
    }
}
Write-Host "`nDone. Artifacts captured to $OutDir"
