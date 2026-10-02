$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\service-ownership.ps1"
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('fh-service-ownership-' + [Guid]::NewGuid().ToString('N'))
$root = Join-Path $fixture 'checkout'
$other = Join-Path $fixture 'checkout-other'
$odd = Join-Path $fixture "space ' dollar `$ [directory]"
$checks = 0
function Assert-True($Condition, [string]$Label) {
    if (-not $Condition) { throw "FAIL: $Label" }
    $script:checks++
}
function Assert-Refused([scriptblock]$Action, [string]$Label) {
    $refused = $false
    try { & $Action | Out-Null } catch { $refused = $true }
    Assert-True $refused $Label
}
function Fake-Process([int]$Id, [int]$Parent, [datetime]$Created, [string]$Command = '', [string]$Name = 'node.exe') {
    return [pscustomobject]@{ProcessId=$Id;ParentProcessId=$Parent;CreationDate=$Created;CommandLine=$Command;Name=$Name}
}
function Launcher([string]$At) { return "powershell.exe -NoProfile -NoExit -Command Set-Location -LiteralPath '" + (Join-Path $At 'apps\web').Replace("'", "''") + "'; npm run dev" }
try {
    foreach ($directory in @($root,$other,$odd)) {
        [IO.Directory]::CreateDirectory((Join-Path $directory 'apps\web')) | Out-Null
        [IO.Directory]::CreateDirectory((Join-Path $directory 'apps\api')) | Out-Null
    }
    $time = [datetime]::UtcNow
    $owner = Fake-Process 101 100 $time (Launcher $root) 'powershell.exe'
    Assert-True ((Get-ServiceLauncherKind $owner $root) -eq 'web') 'absolute launcher'
    $oddOwner = Fake-Process 111 100 $time (Launcher $odd) 'powershell.exe'
    Assert-True ((Get-ServiceLauncherKind $oddOwner $odd) -eq 'web') 'literal special path characters'
    $wildcardOwner = Fake-Process 111 100 $time ((Launcher $odd).Replace('Set-Location -LiteralPath', 'cd')) 'powershell.exe'
    Assert-True ($null -eq (Get-ServiceLauncherKind $wildcardOwner $odd)) 'positional wildcard path refused'
    Assert-True ($null -eq (Get-ServiceLauncherKind $owner $other)) 'different checkout'
    foreach ($command in @(
        "powershell.exe -Command cd 'apps\web'; npm run dev",
        "powershell.exe -Command cd 'C:apps\web'; npm run dev",
        "powershell.exe -Command cd '\apps\web'; npm run dev",
        ("powershell.exe -File unrelated.ps1 -Command cd '" + (Join-Path $root 'apps\web') + "'; npm run dev"),
        ("powershell.exe -Command Write-Host '" + (Join-Path $root 'apps\web') + "'; npm run dev"),
        'powershell.exe -Command cd $env:SOMEWHERE; npm run dev',
        'powershell.exe -EncodedCommand data -Command cd C:\DEV\FactHarbor\apps\web; npm run dev'
    )) { Assert-True ($null -eq (Get-ServiceLauncherKind (Fake-Process 101 100 $time $command 'powershell.exe') $root)) ('ambiguous launch refused: '+$command) }
    $child = Fake-Process 102 101 $time
    $grandchild = Fake-Process 103 102 $time
    $listen = [pscustomobject]@{LocalPort=49301;OwningProcess=103}
    $plan = @(Get-ServiceStopPlan $root @(49301,49302) @($owner,$child,$grandchild) @($listen,$listen))
    Assert-True (($plan.ProcessId -join ',') -eq '101,102,103') 'ancestry order with equal timestamps and duplicate listeners'
    $foreign = Fake-Process 201 200 $time
    $foreignListener = [pscustomobject]@{LocalPort=49302;OwningProcess=201}
    Assert-Refused { Get-ServiceStopPlan $root @(49301,49302) @($owner,$child,$grandchild,$foreign) @($listen,$foreignListener) } 'mixed owned and foreign listener'
    Assert-Refused { Get-ServiceStopPlan $root @(49301) @($grandchild) @($listen) } 'missing ancestor'
    $reused = Fake-Process 102 101 $time.AddSeconds(1)
    Assert-Refused { Get-ServiceStopPlan $root @(49301) @($owner,$reused,$grandchild) @($listen) } 'parent PID reuse'
    $unrelatedReused = Fake-Process 102 200 $time.AddSeconds(1)
    $survivors = @(Get-ServiceSurvivors $root @(49301) $plan @($unrelatedReused,$grandchild))
    Assert-True (($survivors.ProcessId -join ',') -eq '103') 'original child survives despite reused parent PID'
    $lateChild = Fake-Process 104 102 $time.AddMilliseconds(1)
    Assert-True ((@(Get-ServiceSurvivors $root @(49301) $plan @($lateChild))).Count -eq 1) 'late child detected through stopped ancestry'
    Assert-True ((@(Get-ServiceSurvivors $root @(49301) $plan @($unrelatedReused))).Count -eq 0) 'unrelated reused identity is not a survivor'
    $cycle = Fake-Process 102 103 $time
    Assert-Refused { Get-ServiceStopPlan $root @(49301) @($owner,$cycle,$grandchild) @($listen) } 'cyclic ancestry'
    foreach ($urls in @('', 'bad', 'http://localhost:49301;bad', 'ftp://localhost:49301', 'http://localhost:49301/path', 'http://user@localhost:49301')) {
        Assert-Refused { Get-ServicePorts $urls 49302 } ('invalid origin '+$urls)
    }
    Assert-Refused { Get-ServicePorts 'http://localhost:49301' 49301 } 'port collision'
    Assert-Refused { Get-ServicePorts 'http://localhost:49301' 0 } 'invalid Web port'
    Assert-True (((Get-ServicePorts 'http://localhost:49301;https://localhost:49303' 49302) -join ',') -eq '49301,49303,49302') 'valid configured ports'
    Write-Output "PASS: $checks pure service ownership checks"
} finally {
    $resolved = [IO.Path]::GetFullPath($fixture)
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if (-not $resolved.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -or (Split-Path $resolved -Leaf) -notlike 'fh-service-ownership-*') { throw 'Unsafe fixture cleanup path' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}
