# TXPPS TX-8P — build the production bundle and preview it (Windows).
Write-Host "TXPPS TX-8P — building production bundle and starting preview..." -ForegroundColor Cyan
if (-Not (Test-Path "node_modules")) { Write-Host "Installing dependencies..."; npm install }
npm run preview
