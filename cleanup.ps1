# Fleet Management System - Cleanup Script
# Frees up space by removing unnecessary files

Write-Host "Starting cleanup..." -ForegroundColor Green

# 1. Remove node_modules (largest culprit)
Write-Host "Removing node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
    Write-Host "node_modules removed" -ForegroundColor Green
} else {
    Write-Host "node_modules not found" -ForegroundColor Blue
}

# 2. Remove build artifacts
Write-Host "Removing build artifacts..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "dist folder removed" -ForegroundColor Green
} else {
    Write-Host "dist folder not found" -ForegroundColor Blue
}

if (Test-Path ".vite") {
    Remove-Item -Recurse -Force ".vite"
    Write-Host ".vite folder removed" -ForegroundColor Green
} else {
    Write-Host ".vite folder not found" -ForegroundColor Blue
}

# 3. Remove temp files
Write-Host "Removing temp files..." -ForegroundColor Yellow
if (Test-Path "supabase\.temp") {
    Remove-Item -Recurse -Force "supabase\.temp"
    Write-Host "supabase/.temp removed" -ForegroundColor Green
} else {
    Write-Host "supabase/.temp not found" -ForegroundColor Blue
}

if (Test-Path ".cache") {
    Remove-Item -Recurse -Force ".cache"
    Write-Host ".cache folder removed" -ForegroundColor Green
} else {
    Write-Host ".cache folder not found" -ForegroundColor Blue
}

# 4. Remove log files
Write-Host "Removing logs..." -ForegroundColor Yellow
$logFiles = Get-ChildItem -Recurse -Name "*.log" -File
if ($logFiles) {
    $logFiles | ForEach-Object { Remove-Item -Force $_ }
    Write-Host "Log files removed" -ForegroundColor Green
} else {
    Write-Host "No log files found" -ForegroundColor Blue
}

# 5. Remove eslint report (can regenerate)
Write-Host "Removing eslint reports..." -ForegroundColor Yellow
if (Test-Path "eslint-report.json") {
    Remove-Item -Force "eslint-report.json"
    Write-Host "eslint-report.json removed" -ForegroundColor Green
} else {
    Write-Host "eslint-report.json not found" -ForegroundColor Blue
}

# 6. Clean package manager cache (if using npm)
Write-Host "Cleaning npm cache..." -ForegroundColor Yellow
try {
    npm cache clean --force
    Write-Host "npm cache cleaned" -ForegroundColor Green
} catch {
    Write-Host "npm cache clean failed or npm not available" -ForegroundColor Red
}

Write-Host ""
Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Space freed. Run 'npm install' to reinstall dependencies." -ForegroundColor Cyan
Write-Host "Tip: Add these to .gitignore if not already there:" -ForegroundColor Cyan
Write-Host "   - node_modules/" -ForegroundColor Gray
Write-Host "   - dist/" -ForegroundColor Gray
Write-Host "   - *.log" -ForegroundColor Gray
Write-Host "   - eslint-report.json" -ForegroundColor Gray