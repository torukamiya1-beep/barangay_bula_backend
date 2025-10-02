@echo off
echo 🚀 Uploading database to Railway...
echo.

REM Railway MySQL connection details
set RAILWAY_HOST=caboose.proxy.rlwy.net
set RAILWAY_PORT=10954
set RAILWAY_USER=root
set RAILWAY_PASSWORD=ZJkBtQfhQyuHoYnezodhXGCUQZBnYcrN
set RAILWAY_DATABASE=railway
set LOCAL_SQL_FILE=barangay_management_system.sql

REM Check if SQL file exists
if not exist "%LOCAL_SQL_FILE%" (
    echo ❌ Error: %LOCAL_SQL_FILE% not found!
    echo Please make sure the SQL file is in the current directory.
    pause
    exit /b 1
)

echo ✅ Found SQL file: %LOCAL_SQL_FILE%

REM Check if mysql command is available
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ❌ MySQL client not found!
    echo Please install MySQL client or use MySQL Workbench to import manually.
    echo.
    echo Manual import instructions:
    echo 1. Open MySQL Workbench
    echo 2. Connect to Railway database:
    echo    Host: %RAILWAY_HOST%
    echo    Port: %RAILWAY_PORT%
    echo    Username: %RAILWAY_USER%
    echo    Password: %RAILWAY_PASSWORD%
    echo    Database: %RAILWAY_DATABASE%
    echo 3. Go to Server ^> Data Import
    echo 4. Select 'Import from Self-Contained File'
    echo 5. Choose: %LOCAL_SQL_FILE%
    echo 6. Select 'railway' as target schema
    echo 7. Click 'Start Import'
    pause
    exit /b 1
)

echo ✅ MySQL client found

REM Test connection
echo 🔍 Testing connection to Railway database...
mysql -h %RAILWAY_HOST% -P %RAILWAY_PORT% -u %RAILWAY_USER% -p%RAILWAY_PASSWORD% -e "SELECT 1;" %RAILWAY_DATABASE% >nul 2>&1
if errorlevel 1 (
    echo ❌ Failed to connect to Railway database!
    echo Please check your Railway database credentials.
    pause
    exit /b 1
)

echo ✅ Successfully connected to Railway database

REM Import the database
echo 📤 Uploading database to Railway...
echo This may take a few minutes depending on the database size...

mysql -h %RAILWAY_HOST% -P %RAILWAY_PORT% -u %RAILWAY_USER% -p%RAILWAY_PASSWORD% %RAILWAY_DATABASE% < %LOCAL_SQL_FILE%
if errorlevel 1 (
    echo ❌ Database import failed!
    echo Please try the manual import method using MySQL Workbench.
    pause
    exit /b 1
)

echo.
echo 🎉 Database upload completed successfully!
echo Your local database has been uploaded to Railway MySQL.
echo.
echo Next steps:
echo 1. Wait for Railway backend deployment to complete
echo 2. Test your application at: https://barangay-bula-docu-hub.vercel.app
echo 3. Verify all data is present and working correctly
echo.
pause
