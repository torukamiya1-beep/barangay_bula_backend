# Test API endpoints that were failing
$baseUrl = "https://brgybulabackend-production.up.railway.app/api"
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    # Login to get token
    Write-Host "1. Testing login..."
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/unified/login" -Method Post -Headers @{"Content-Type"="application/json"} -Body $loginBody

    if ($loginResponse.success) {
        $token = $loginResponse.data.token
        Write-Host "   ✓ Login successful"

        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }

        # Test the endpoints that were failing
        $endpoints = @(
            @{ name = "Document Requests"; url = "$baseUrl/admin/documents/requests?page=1&limit=10" },
            @{ name = "Notifications"; url = "$baseUrl/notifications?page=1&limit=10" },
            @{ name = "Users"; url = "$baseUrl/users?page=1&limit=50" },
            @{ name = "Archived Users"; url = "$baseUrl/users/get-archived-users?page=1&limit=100" },
            @{ name = "Analytics"; url = "$baseUrl/admin/documents/analytics?period=month" }
        )

        foreach ($endpoint in $endpoints) {
            Write-Host "2. Testing $($endpoint.name)..."
            try {
                $response = Invoke-RestMethod -Uri $endpoint.url -Method Get -Headers $headers
                Write-Host "   ✓ $($endpoint.name) - SUCCESS"
            } catch {
                Write-Host "   ✗ $($endpoint.name) - FAILED: $($_.Exception.Message)"
            }
        }

    } else {
        Write-Host "   ✗ Login failed: $($loginResponse.error)"
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
