#!/bin/bash

# Fleet Management System - Cleanup Script
# Frees up space by removing unnecessary files

echo "🧹 Starting cleanup..."

# 1. Remove node_modules (largest culprit)
echo "📦 Removing node_modules..."
rm -rf node_modules/

# 2. Remove build artifacts
echo "🏗️ Removing build artifacts..."
rm -rf dist/
rm -rf .vite/

# 3. Remove temp files
echo "🗑️ Removing temp files..."
rm -rf supabase/.temp/
rm -rf .cache/

# 4. Remove log files
echo "📝 Removing logs..."
find . -name "*.log" -type f -delete

# 5. Remove eslint report (can regenerate)
echo "🔍 Removing eslint reports..."
rm -f eslint-report.json

# 6. Clean package manager cache (if using npm)
echo "💾 Cleaning npm cache..."
npm cache clean --force

echo "✅ Cleanup complete!"
echo ""
echo "📊 Space freed. Run 'npm install' to reinstall dependencies."
echo "💡 Tip: Add these to .gitignore if not already there:"
echo "   - node_modules/"
echo "   - dist/"
echo "   - *.log"
echo "   - eslint-report.json"
