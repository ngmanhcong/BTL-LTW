$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
docker compose up -d
if ($LASTEXITCODE -ne 0) { throw 'Start Docker Desktop first.' }
node scripts/configure-local.cjs
if ($LASTEXITCODE -ne 0) { throw 'Local configuration failed.' }
$logDir = Join-Path $projectRoot '.local-logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$components = @(
  @{Name='accounts'; Port=8001; Directory='services\accounts'; Entry='src\server.js'},
  @{Name='content'; Port=8002; Directory='services\content'; Entry='src\server.js'},
  @{Name='messaging'; Port=8003; Directory='services\messaging'; Entry='src\server.js'},
  @{Name='learning'; Port=8004; Directory='services\learning'; Entry='src\server.js'},
  @{Name='gateway'; Port=8000; Directory='services\gateway'; Entry='src\server.js'},
  @{Name='frontend'; Port=3000; Directory='apps\web'; Entry='node_modules\react-scripts\bin\react-scripts.js'; Extra='start'}
)
foreach ($component in $components) {
  $directory = Join-Path $projectRoot $component.Directory
  $entry = Join-Path $directory $component.Entry
  $listener = Get-NetTCPConnection -State Listen -LocalPort $component.Port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    $existingProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    if ($existingProcess.Name -ne 'node.exe' -or -not $existingProcess.CommandLine.Contains($directory)) { throw "Port $($component.Port) is occupied by another application." }
    continue
  }
  $arguments = '"' + $entry + '"'
  if ($component.Extra) { $arguments += ' ' + $component.Extra }
  $ownedProcess = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList $arguments -WorkingDirectory $directory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir ($component.Name + '.log')) -RedirectStandardError (Join-Path $logDir ($component.Name + '-error.log')) -PassThru
  $ownedProcess.Id | Set-Content (Join-Path $logDir ($component.Name + '.pid'))
}
Write-Host 'Waiting for services and frontend...'
$ready = $false
$startupDeadline = (Get-Date).AddMinutes(5)
while ((Get-Date) -lt $startupDeadline) {
  try {
    $health = Invoke-RestMethod 'http://localhost:8000/health' -TimeoutSec 4
    $web = Invoke-WebRequest 'http://localhost:3000' -UseBasicParsing -TimeoutSec 4
    if ($health.status -eq 'ok' -and $web.StatusCode -eq 200) { $ready = $true; break }
  } catch { }
  Start-Sleep -Seconds 1
}
if (-not $ready) { throw "Startup failed. Inspect $logDir" }
Write-Host 'PTITSocial: http://localhost:3000'
Write-Host 'Gateway health: http://localhost:8000/health'
Write-Host 'Local email: http://localhost:8025'
Write-Host "Logs: $logDir"
