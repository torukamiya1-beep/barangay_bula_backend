# Upload Local Database to Railway MySQL
# This script will upload your local barangay_management_system.sql to Railway

Write-Host "🚀 Starting database upload to Railway..." -ForegroundColor Green

# Railway MySQL connection details
$railwayHost = "caboose.proxy.rlwy.net"
$railwayPort = "10954"
$railwayUser = "root"
$railwayPassword = "ZJkBtQfhQyuHoYnezodhXGCUQZBnYcrN"
$railwayDatabase = "railway"
$localSqlFile = "barangay_management_system.sql"

# Check if SQL file exists
if (-not (Test-Path $localSqlFile)) {
    Write-Host "❌ Error: $localSqlFile not found!" -ForegroundColor Red
    Write-Host "Please make sure the SQL file is in the current directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found SQL file: $localSqlFile" -ForegroundColor Green

# Check if mysql command is available
try {
    $mysqlVersion = & mysql --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "MySQL not found"
    }
    Write-Host "✅ MySQL client found" -ForegroundColor Green
} catch {
    Write-Host "❌ MySQL client not found!" -ForegroundColor Red
    Write-Host "Please install MySQL client or use MySQL Workbench to import the database manually." -ForegroundColor Yellow
    Write-Host "" 
    Write-Host "Manual import instructions:" -ForegroundColor Cyan
    Write-Host "1. Open MySQL Workbench" -ForegroundColor White
    Write-Host "2. Connect to Railway database:" -ForegroundColor White
    Write-Host "   Host: $railwayHost" -ForegroundColor White
    Write-Host "   Port: $railwayPort" -ForegroundColor White
    Write-Host "   Username: $railwayUser" -ForegroundColor White
    Write-Host "   Password: $railwayPassword" -ForegroundColor White
    Write-Host "   Database: $railwayDatabase" -ForegroundColor White
    Write-Host "3. Go to Server > Data Import" -ForegroundColor White
    Write-Host "4. Select 'Import from Self-Contained File'" -ForegroundColor White
    Write-Host "5. Choose: $localSqlFile" -ForegroundColor White
    Write-Host "6. Select 'railway' as target schema" -ForegroundColor White
    Write-Host "7. Click 'Start Import'" -ForegroundColor White
    exit 1
}

# Test connection to Railway database
Write-Host "🔍 Testing connection to Railway database..." -ForegroundColor Yellow

try {
    $testConnection = & mysql -h $railwayHost -P $railwayPort -u $railwayUser -p$railwayPassword -e "SELECT 1;" $railwayDatabase 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Connection test failed"
    }
    Write-Host "✅ Successfully connected to Railway database" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to connect to Railway database!" -ForegroundColor Red
    Write-Host "Error: $testConnection" -ForegroundColor Red
    Write-Host "Please check your Railway database credentials." -ForegroundColor Yellow
    exit 1
}

# Import the database
Write-Host "📤 Uploading database to Railway..." -ForegroundColor Yellow
Write-Host "This may take a few minutes depending on the database size..." -ForegroundColor Cyan

try {
    $importResult = cmd /c "mysql -h $railwayHost -P $railwayPort -u $railwayUser -p$railwayPassword $railwayDatabase < $localSqlFile" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Import failed: $importResult"
    }
    Write-Host "✅ Database successfully uploaded to Railway!" -ForegroundColor Green
} catch {
    Write-Host "❌ Database import failed!" -ForegroundColor Red
    Write-Host "Error: $importResult" -ForegroundColor Red
    Write-Host "Please try the manual import method using MySQL Workbench." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎉 Database upload completed successfully!" -ForegroundColor Green
Write-Host "Your local database has been uploaded to Railway MySQL." -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait for Railway backend deployment to complete" -ForegroundColor White
Write-Host "2. Test your application at: https://barangay-bula-docu-hub.vercel.app" -ForegroundColor White
Write-Host "3. Verify all data is present and working correctly" -ForegroundColor White
