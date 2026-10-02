[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$ApiUrls = 'http://localhost:5000',
    [ValidateRange(1, 65535)][int]$WebPort = 3000
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\service-ownership.ps1"
$root = Get-ServiceDirectoryIdentity (Join-Path $PSScriptRoot '..')
$ports = @(Get-ServicePorts $ApiUrls $WebPort)
Stop-CheckoutServices -Root $root -Ports $ports -WhatIf:$WhatIfPreference
