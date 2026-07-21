# TXPPS TX-8P — start the local dev server (Windows).
# Double-click or run:  powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1
Write-Host "TXPPS TX-8P — starting dev server..." -ForegroundColor Cyan
if (-Not (Test-Path "node_modules")) { Write-Host "Installing dependencies..."; npm install }
Write-Host "The local URL and LAN URL will print below. Click/tap once to start audio."
npm run dev
