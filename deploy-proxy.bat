@echo off
echo =========================================
echo RC Proxy Server Deployment Script
echo =========================================

set /p IS_PROD="Are you deploying to production? (y/n): "

if "%IS_PROD%"=="y" (
    echo Setting up for production...
    
    REM Install PM2 globally if not present
    where pm2 >nul 2>&1
    if %errorlevel% neq 0 (
        echo Installing PM2...
        npm install -g pm2
        npm install -g pm2-windows-startup
        pm2-startup install
    )
    
    REM Install dependencies
    echo Installing dependencies...
    npm install express cors node-fetch dotenv
    
    REM Start with PM2
    echo Starting server with PM2...
    pm2 start rc-proxy-server.js --name rc-proxy
    pm2 save
    
    echo.
    echo =========================================
    echo Deployment Complete!
    echo =========================================
    echo.
    echo Your proxy endpoint:
    echo http://localhost:3001/api/fetch-rc-details
    echo.
    echo PM2 Commands:
    echo   pm2 logs rc-proxy    - View logs
    echo   pm2 restart rc-proxy - Restart server
    echo   pm2 stop rc-proxy    - Stop server
    echo =========================================
    
) else (
    echo Setting up for local development...
    
    REM Install dependencies
    echo Installing dependencies...
    npm install express cors node-fetch dotenv
    
    REM Start server
    echo Starting local server...
    node rc-proxy-server.js
)

pause
