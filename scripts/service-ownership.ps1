# Shared checkout-bound service shutdown. Dot-source from the two entry points.
function Get-ServiceDirectoryIdentity([string]$Path) {
    $item = Get-Item -LiteralPath (Resolve-Path -LiteralPath $Path -ErrorAction Stop).ProviderPath -ErrorAction Stop
    if (-not $item.PSIsContainer) { throw 'Service working directory must be a filesystem directory.' }
    $resolved = $item.FullName.TrimEnd('\', '/')
    for ($part = $item; $null -ne $part; $part = $part.Parent) {
        if ($part.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Service ownership through a junction or symlink is not established.' }
    }
    return $resolved
}

function Get-ServicePorts([string]$ApiUrls, [int]$WebPort) {
    if ($WebPort -lt 1 -or $WebPort -gt 65535) { throw 'WebPort must be between 1 and 65535.' }
    $ports = @()
    foreach ($value in $ApiUrls.Split(';')) {
        $uri = $null
        if (-not [Uri]::TryCreate($value, [UriKind]::Absolute, [ref]$uri) -or
            $uri.Scheme -notin @('http', 'https') -or -not $uri.Host -or
            $uri.UserInfo -or $uri.Query -or $uri.Fragment -or $uri.AbsolutePath -ne '/' -or
            $uri.Port -lt 1 -or $uri.Port -gt 65535) { throw 'ApiUrls must contain valid HTTP(S) origin URLs separated by semicolons.' }
        $ports += $uri.Port
    }
    if ($WebPort -in $ports) { throw 'API and Web ports must be distinct.' }
    return @($ports + $WebPort | Select-Object -Unique)
}

function Get-ServiceLauncherKind($Process, [string]$Root) {
    if ($Process.Name -notin @('powershell.exe', 'pwsh.exe') -or -not $Process.CommandLine) { return $null }
    if ($Process.CommandLine -notmatch '(?is)^(?:"[^"\r\n]*[\\/](?:powershell|pwsh)\.exe"|(?:[^\s"]*[\\/])?(?:powershell|pwsh)\.exe)(?:\s+-(?:NoProfile|NoExit|NonInteractive))*\s+-Command\s+(.+)$') { return $null }
    $script = $Matches[1].Trim()
    if ($script.StartsWith('"') -and $script.EndsWith('"')) { $script = $script.Substring(1, $script.Length - 2) }
    $tokens = $null; $errors = $null
    $ast = [Management.Automation.Language.Parser]::ParseInput($script, [ref]$tokens, [ref]$errors)
    if ($errors.Count -or -not $ast.EndBlock -or $ast.BeginBlock -or $ast.ProcessBlock -or $ast.ParamBlock) { return $null }
    $statements = @($ast.EndBlock.Statements)
    if ($statements.Count -lt 2) { return $null }
    $first = $statements[0]
    if ($first -isnot [Management.Automation.Language.PipelineAst] -or $first.PipelineElements.Count -ne 1) { return $null }
    $command = $first.PipelineElements[0]
    if ($command -isnot [Management.Automation.Language.CommandAst] -or $command.InvocationOperator -ne 'Unknown' -or
        $command.GetCommandName() -notin @('cd', 'Set-Location', 'Microsoft.PowerShell.Management\Set-Location')) { return $null }
    $elements = @($command.CommandElements)
    $usesLiteralPath = $false
    if ($elements.Count -eq 3 -and $elements[1] -is [Management.Automation.Language.CommandParameterAst] -and $elements[1].ParameterName -eq 'LiteralPath') {
        $usesLiteralPath = $true
        $literal = $elements[2]
    } elseif ($elements.Count -eq 2) { $literal = $elements[1] } else { return $null }
    if ($literal -isnot [Management.Automation.Language.StringConstantExpressionAst]) { return $null }
    if (-not $usesLiteralPath -and [Management.Automation.WildcardPattern]::ContainsWildcardCharacters($literal.Value)) { return $null }
    if ($literal.Value -notmatch '^(?:[A-Za-z]:[\\/]|\\\\[^\\/]+[\\/][^\\/]+[\\/])') { return $null }
    try { $directory = Get-ServiceDirectoryIdentity $literal.Value } catch { return $null }
    $kind = $null
    foreach ($name in @('api', 'web')) {
        if ($directory -ieq (Get-ServiceDirectoryIdentity (Join-Path $Root "apps\$name"))) { $kind = $name }
    }
    if (-not $kind) { return $null }
    for ($i = 1; $i -lt $statements.Count - 1; $i++) {
        $statement = $statements[$i]
        if ($statement -is [Management.Automation.Language.AssignmentStatementAst] -and
            $statement.Left -is [Management.Automation.Language.VariableExpressionAst] -and
            $statement.Left.VariablePath.IsDriveQualified -and $statement.Left.VariablePath.DriveName -eq 'env' -and
            $statement.Right.Extent.Text -match "^'([^']|'')*'$" ) { continue }
        if ($kind -eq 'web' -and $statement.Extent.Text -match '^npm(?:\.cmd)?\s+install$') { continue }
        return $null
    }
    $last = $statements[-1].Extent.Text.Trim()
    if (($kind -eq 'web' -and $last -match '^npm(?:\.cmd)?\s+run\s+dev$') -or
        ($kind -eq 'api' -and $last -match '^dotnet(?:\.exe)?\s+watch\s+run$')) { return $kind }
    return $null
}

function Get-ServiceStopPlan([string]$Root, [int[]]$Ports, [object[]]$Processes, [object[]]$Listeners) {
    $Root = Get-ServiceDirectoryIdentity $Root
    $byId = @{}; $launchers = @{}
    foreach ($process in $Processes) {
        $byId[[int]$process.ProcessId] = $process
        if ($process.CreationDate -and (Get-ServiceLauncherKind $process $Root)) { $launchers[[int]$process.ProcessId] = $process }
    }
    function Find-Launcher($process) {
        $seen = @{}
        while ($process -and $process.CreationDate -and -not $seen.ContainsKey([int]$process.ProcessId)) {
            $seen[[int]$process.ProcessId] = $true
            if ($launchers.ContainsKey([int]$process.ProcessId)) { return [int]$process.ProcessId }
            $parent = $byId[[int]$process.ParentProcessId]
            if (-not $parent -or -not $parent.CreationDate -or $parent.CreationDate -gt $process.CreationDate) { return $null }
            $process = $parent
        }
        return $null
    }
    foreach ($listener in $Listeners) {
        if ($listener.LocalPort -in $Ports -and $null -eq (Find-Launcher $byId[[int]$listener.OwningProcess])) {
            throw "Refusing shutdown: port $($listener.LocalPort) PID $($listener.OwningProcess) has no verified launcher in this checkout."
        }
    }
    $targets = @()
    foreach ($process in $Processes) {
        $owner = Find-Launcher $process
        if ($null -ne $owner) {
            $depth = 0; $ancestor = $process
            while ($ancestor.ProcessId -ne $owner) { $depth++; $ancestor = $byId[[int]$ancestor.ParentProcessId] }
            $targets += [pscustomobject]@{ ProcessId=$process.ProcessId; ParentProcessId=$process.ParentProcessId; CreationDate=$process.CreationDate; Name=$process.Name; CommandLine=$process.CommandLine; Depth=$depth }
        }
    }
    # Stop supervisors before descendants so watchers cannot intentionally restart children.
    return @($targets | Sort-Object Depth, ProcessId)
}

function Get-ServiceSurvivors([string]$Root, [int[]]$Ports, [object[]]$Planned, [object[]]$After) {
    # Original identities must disappear even if a reused parent PID breaks ancestry.
    $original = @{}
    foreach ($process in $Planned) { $original["$($process.ProcessId):$($process.CreationDate.ToUniversalTime().Ticks)"] = $true }
    $found = @{}
    foreach ($process in $After) {
        if ($process.CreationDate -and $original.ContainsKey("$($process.ProcessId):$($process.CreationDate.ToUniversalTime().Ticks)")) {
            $found[[int]$process.ProcessId] = $process
        }
    }
    # Retain stopped ancestry to detect late children; live PID owners take precedence.
    $currentIds = @($After | ForEach-Object { [int]$_.ProcessId })
    $lineage = @($Planned | Where-Object { [int]$_.ProcessId -notin $currentIds }) + $After
    foreach ($process in @(Get-ServiceStopPlan $Root $Ports $lineage @())) {
        if ([int]$process.ProcessId -in $currentIds) { $found[[int]$process.ProcessId] = $process }
    }
    return @($found.Values)
}

function Stop-CheckoutServices {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][string]$Root, [Parameter(Mandatory)][int[]]$Ports)
    $snapshot = @(Get-CimInstance Win32_Process)
    $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop)
    $plan = @(Get-ServiceStopPlan $Root $Ports $snapshot $listeners)
    if (-not $plan.Count) { Write-Host 'No verified services are running for this checkout.'; return }
    if (-not $PSCmdlet.ShouldProcess($Root, "Stop $($plan.Count) verified service processes")) { return }
    $fresh = @(Get-ServiceStopPlan $Root $Ports @(Get-CimInstance Win32_Process) @(Get-NetTCPConnection -State Listen -ErrorAction Stop))
    $identities = @($plan | ForEach-Object { "$($_.ProcessId):$($_.CreationDate.ToUniversalTime().Ticks)" })
    foreach ($process in $fresh) {
        if ("$($process.ProcessId):$($process.CreationDate.ToUniversalTime().Ticks)" -notin $identities) { throw 'Service tree changed during preflight; no process was stopped. Retry after inspecting it.' }
    }
    foreach ($process in $fresh) {
        $current = Get-CimInstance Win32_Process -Filter "ProcessId=$($process.ProcessId)"
        if (-not $current) { continue }
        if ($current.CreationDate -ne $process.CreationDate) { throw 'Process identity changed; shutdown incomplete.' }
        Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
    }
    # Preserve stopped ancestry for detecting late children, while current identities
    # take precedence if Windows has reused a PID. Never kill a newly found process here.
    $after = @(Get-CimInstance Win32_Process)
    $survivors = @(Get-ServiceSurvivors $Root $Ports $fresh $after)
    if ($survivors.Count) { throw 'Verified service descendants survived or appeared during shutdown; shutdown incomplete. Inspect them before restarting.' }
    $remaining = @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object LocalPort -in $Ports)
    if ($remaining.Count) { throw 'A configured port is still occupied; shutdown incomplete. Inspect it before restarting.' }
    Write-Host 'Verified checkout service processes stopped.'
}
