@echo off
echo ========================================
echo   IMPORTING DATABASE TO RAILWAY MYSQL
echo ========================================
echo.

REM New Railway MySQL Database Credentials
set DB_HOST=hopper.proxy.rlwy.net
set DB_PORT=26646
set DB_USER=root
set DB_PASSWORD=dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh
set DB_NAME=railway
set SQL_FILE=D:\brgy_docu_hub\DB_oct2_fromsept30_brgy_docu_hub.sql

echo Database Host: %DB_HOST%
echo Database Port: %DB_PORT%
echo Database User: %DB_USER%
echo Database Name: %DB_NAME%
echo SQL File: %SQL_FILE%
echo.

REM Check if SQL file exists
if not exist "%SQL_FILE%" (
    echo ERROR: SQL file not found at %SQL_FILE%
    echo Please check the file path and try again.
    pause
    exit /b 1
)

echo SQL file found: %SQL_FILE%
echo File size: 
for %%A in ("%SQL_FILE%") do echo %%~zA bytes
echo.

echo ========================================
echo   STEP 1: TESTING CONNECTION
echo ========================================
echo Testing connection to Railway MySQL database...
echo.

REM Test connection first
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% -e "SELECT 'Connection successful!' as status;" %DB_NAME%

if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Failed to connect to Railway MySQL database.
    echo Please check your credentials and network connection.
    pause
    exit /b 1
)

echo.
echo ✅ Connection successful!
echo.

echo ========================================
echo   STEP 2: IMPORTING YOUR DATABASE
echo ========================================
echo Importing %SQL_FILE% to Railway MySQL database...
echo This may take a few minutes depending on the file size...
echo.

REM Import the database
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < "%SQL_FILE%"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ DATABASE IMPORT SUCCESSFUL!
    echo.
) else (
    echo.
    echo ❌ DATABASE IMPORT FAILED!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo ========================================
echo   STEP 3: VERIFYING IMPORT
echo ========================================
echo Verifying the imported data...
echo.

REM Check tables
echo Checking imported tables:
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% -e "SHOW TABLES;" %DB_NAME%

echo.
echo Checking some key data:
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% -e "SELECT COUNT(*) as admin_accounts FROM admin_employee_accounts;" %DB_NAME%
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% -e "SELECT COUNT(*) as client_accounts FROM client_accounts;" %DB_NAME%
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% -e "SELECT COUNT(*) as document_requests FROM document_requests;" %DB_NAME%
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% -e "SELECT COUNT(*) as notifications FROM notifications;" %DB_NAME%

echo.
echo ========================================
echo   🎉 IMPORT COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Your database has been imported to Railway MySQL!
echo.
echo Next steps:
echo 1. Update your Railway backend environment variables
echo 2. Wait 2-3 minutes for Railway to redeploy your backend
echo 3. Test your application: https://barangay-bula-docu-hub.vercel.app
echo.

pause
