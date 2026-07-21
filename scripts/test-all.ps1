# TXPPS TX-8P — run all tests (Windows).
Write-Host "TXPPS TX-8P — running logic + audio tests..." -ForegroundColor Cyan
if (-Not (Test-Path "node_modules")) { Write-Host "Installing dependencies..."; npm install }
npm run test
npm run test:audio
