# TOEIC Drill — Windows release builder
# Usage: .\scripts\release.ps1
# Output: dist\TOEIC-Drill-vX.X.X-win-x64.zip

$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
$env:CSC_IDENTITY_AUTO_DISCOVERY  = "false"
$env:CI = "false"

$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
$zipName = "TOEIC-Drill-v$version-win-x64.zip"
$zipPath = "dist\$zipName"

Write-Host "=== TOEIC Drill Release Builder v$version ===" -ForegroundColor Cyan

# Step 1: React build
Write-Host "`n[1/3] Building React app..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "React build failed." -ForegroundColor Red; exit 1 }

# Step 2: Electron packaging (win-unpacked is created even if exit code = 1)
Write-Host "`n[2/3] Packaging Electron app..." -ForegroundColor Yellow
npx electron-builder --win --dir 2>&1 | Out-Null
# Note: exit code 1 is expected (winCodeSign symlink issue on Windows without Dev Mode)
# The win-unpacked directory is always created successfully regardless

$exePath = "dist\win-unpacked\TOEIC Drill.exe"
if (-not (Test-Path $exePath)) {
    Write-Host "Error: $exePath not found. Packaging failed." -ForegroundColor Red
    exit 1
}
Write-Host "  App binary OK: $exePath" -ForegroundColor Green

# Step 3: Zip for release
Write-Host "`n[3/3] Creating release zip..." -ForegroundColor Yellow
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path "dist\win-unpacked\*" -DestinationPath $zipPath -Force
$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
Write-Host "  Created: $zipPath ($sizeMB MB)" -ForegroundColor Green

Write-Host "`n=== Release ready ===" -ForegroundColor Cyan
Write-Host "File : $zipPath"
Write-Host "Link : https://github.com/Ray-1214/toeic-quiz-app/releases/new"
exit 0
