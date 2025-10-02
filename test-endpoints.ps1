# Test Railway Backend Endpoints
Write-Host "🧪 Testing Railway Backend Endpoints..." -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "https://brgybulabackend-production.up.railway.app/health" -Method GET
    Write-Host "✅ Health Check: $($health.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Login and Get Token
Write-Host "`n2. Testing Login..." -ForegroundColor Yellow
try {
    $loginBody = '{"username":"admin12345","password":"12345QWERTqwert"}'
    $loginResponse = Invoke-WebRequest -Uri "https://brgybulabackend-production.up.railway.app/api/auth/unified/login" -Method POST -Body $loginBody -ContentType "application/json"
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.data.token
    Write-Host "✅ Login: $($loginResponse.StatusCode) - Token: $($token.Substring(0,20))..." -ForegroundColor Green
    
    # Test 3: Document Requests (Previously failing with 500)
    Write-Host "`n3. Testing Document Requests..." -ForegroundColor Yellow
    try {
        $headers = @{ "Authorization" = "Bearer $token" }
        $docRequests = Invoke-WebRequest -Uri "https://brgybulabackend-production.up.railway.app/api/admin/documents/requests?page=1&limit=10" -Method GET -Headers $headers
        Write-Host "✅ Document Requests: $($docRequests.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Document Requests Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test 4: Notifications (Previously failing with 500)
    Write-Host "`n4. Testing Notifications..." -ForegroundColor Yellow
    try {
        $notifications = Invoke-WebRequest -Uri "https://brgybulabackend-production.up.railway.app/api/notifications?page=1&limit=10" -Method GET -Headers $headers
        Write-Host "✅ Notifications: $($notifications.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Notifications Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test 5: Users (Previously failing with 500)
    Write-Host "`n5. Testing Users..." -ForegroundColor Yellow
    try {
        $users = Invoke-WebRequest -Uri "https://brgybulabackend-production.up.railway.app/api/users?page=1&limit=50" -Method GET -Headers $headers
        Write-Host "✅ Users: $($users.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Users Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test 6: Analytics (Previously failing with 500)
    Write-Host "`n6. Testing Analytics..." -ForegroundColor Yellow
    try {
        $analytics = Invoke-WebRequest -Uri "https://brgybulabackend-production.up.railway.app/api/admin/documents/analytics?period=month" -Method GET -Headers $headers
        Write-Host "✅ Analytics: $($analytics.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Analytics Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test 7: Activity Logs (Previously failing with 500)
    Write-Host "`n7. Testing Activity Logs..." -ForegroundColor Yellow
    try {
        $activityLogs = Invoke-WebRequest -Uri "https://brgybulabackend-production.up.railway.app/api/admin/activity-logs/comprehensive?page=1&limit=100" -Method GET -Headers $headers
        Write-Host "✅ Activity Logs: $($activityLogs.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Activity Logs Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Login Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Backend Testing Complete!" -ForegroundColor Cyan
