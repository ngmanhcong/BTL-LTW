$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
foreach ($name in @('frontend','gateway','learning','content','messaging','accounts')) {
  $pidFile = Join-Path $projectRoot ".local-logs/$name.pid"
  if (-not (Test-Path -LiteralPath $pidFile)) { continue }
  $ownedProcessId = [int](Get-Content -LiteralPath $pidFile)
  $ownedProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$ownedProcessId" -ErrorAction SilentlyContinue
  if ($ownedProcess -and $ownedProcess.Name -eq 'node.exe' -and $ownedProcess.CommandLine.Contains($projectRoot)) { taskkill.exe /PID $ownedProcessId /T /F | Out-Null }
}
docker compose stop
Write-Host 'PTITSocial stopped. Databases and uploads are preserved.'
