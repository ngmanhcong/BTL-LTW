$ErrorActionPreference = 'Stop'
$ruleName = 'PTITSocial-LAN-3000-8000'
$existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if (-not $existing) {
  New-NetFirewallRule -Name $ruleName -DisplayName 'PTITSocial LAN web and gateway' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000,8000 -RemoteAddress LocalSubnet -Profile Any | Out-Null
} else {
  Set-NetFirewallRule -Name $ruleName -Enabled True -Direction Inbound -Action Allow -Profile Any
  Get-NetFirewallRule -Name $ruleName | Get-NetFirewallPortFilter | Set-NetFirewallPortFilter -Protocol TCP -LocalPort 3000,8000
  Get-NetFirewallRule -Name $ruleName | Get-NetFirewallAddressFilter | Set-NetFirewallAddressFilter -RemoteAddress LocalSubnet
}
