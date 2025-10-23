# Test script for all three chatbot webhooks
# This will verify that FootCare, Lasercare, and Nail Surgery webhooks are properly standardized

Write-Host "🧪 Testing All Chatbot Webhook Standardization" -ForegroundColor Green

# Check environment variables first
Write-Host "`n🔑 Checking webhook secrets..." -ForegroundColor Yellow
$footcareSecret = $env:FOOTCARE_WEBHOOK_SECRET
$lasercareSecret = $env:LASERCARE_WEBHOOK_SECRET  
$nailSecret = $env:NAIL_WEBHOOK_SECRET

if (-not $footcareSecret) { Write-Host "❌ FOOTCARE_WEBHOOK_SECRET not set" -ForegroundColor Red } else { Write-Host "✅ FOOTCARE_WEBHOOK_SECRET configured" -ForegroundColor Green }
if (-not $lasercareSecret) { Write-Host "❌ LASERCARE_WEBHOOK_SECRET not set" -ForegroundColor Red } else { Write-Host "✅ LASERCARE_WEBHOOK_SECRET configured" -ForegroundColor Green }
if (-not $nailSecret) { Write-Host "❌ NAIL_WEBHOOK_SECRET not set" -ForegroundColor Red } else { Write-Host "✅ NAIL_WEBHOOK_SECRET configured" -ForegroundColor Green }

# Test data for each clinic
$testDataFootcare = @{
    name = "Test FootCare Patient"
    email = "test.footcare@example.com"
    phone = "555-0101"
    issue_category = "foot_pain"
    symptom_description = "Test FootCare consultation"
    source = "test"
} | ConvertTo-Json

$testDataLasercare = @{
    name = "Test Lasercare Patient"
    email = "test.lasercare@example.com"
    phone = "555-0102"
    issue_category = "laser_treatment"
    symptom_description = "Test Lasercare consultation"
    source = "test"
} | ConvertTo-Json

$testDataNailSurgery = @{
    name = "Test Nail Surgery Patient"
    email = "test.nailsurgery@example.com"
    phone = "555-0103"
    issue_category = "ingrown_nail"
    symptom_description = "Test Nail Surgery consultation"
    source = "test"
} | ConvertTo-Json

Write-Host "`n1. Testing FootCare Webhook..." -ForegroundColor Yellow
try {
    $footcareHeaders = @{
        'Content-Type' = 'application/json'
        'X-Webhook-Secret' = $footcareSecret
    }
    $footcareResponse = Invoke-WebRequest -Uri "http://localhost:5002/api/webhooks/footcare" -Method POST -Body $testDataFootcare -Headers $footcareHeaders
    Write-Host "✅ FootCare webhook: Status $($footcareResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($footcareResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FootCare webhook failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Testing Lasercare Webhook..." -ForegroundColor Yellow
try {
    $lasercareHeaders = @{
        'Content-Type' = 'application/json'
        'X-Webhook-Secret' = $lasercareSecret
    }
    $lasercareResponse = Invoke-WebRequest -Uri "http://localhost:5002/api/webhooks/lasercare" -Method POST -Body $testDataLasercare -Headers $lasercareHeaders
    Write-Host "✅ Lasercare webhook: Status $($lasercareResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($lasercareResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Lasercare webhook failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Testing Nail Surgery Webhook..." -ForegroundColor Yellow
try {
    $nailHeaders = @{
        'Content-Type' = 'application/json'
        'X-Webhook-Secret' = $nailSecret
    }
    $nailResponse = Invoke-WebRequest -Uri "http://localhost:5002/api/webhooks/nailsurgery" -Method POST -Body $testDataNailSurgery -Headers $nailHeaders
    Write-Host "✅ Nail Surgery webhook: Status $($nailResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($nailResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Nail Surgery webhook failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Verifying clinic scoping for each clinic..." -ForegroundColor Yellow

Write-Host "`n   FootCare Clinic data:" -ForegroundColor Cyan
try {
    $footcareData = (Invoke-WebRequest -Uri "http://localhost:5002/api/debug/clinic-scope?clinic_group=FootCare%20Clinic" -Method GET).Content | ConvertFrom-Json
    Write-Host "   Consultations: $($footcareData.sampleData.consultationCount), Patients: $($footcareData.sampleData.patientCount)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed to get FootCare data" -ForegroundColor Red
}

Write-Host "`n   Lasercare Clinic data:" -ForegroundColor Cyan
try {
    $lasercareData = (Invoke-WebRequest -Uri "http://localhost:5002/api/debug/clinic-scope?clinic_group=Lasercare%20Clinic" -Method GET).Content | ConvertFrom-Json
    Write-Host "   Consultations: $($lasercareData.sampleData.consultationCount), Patients: $($lasercareData.sampleData.patientCount)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed to get Lasercare data" -ForegroundColor Red
}

Write-Host "`n   The Nail Surgery Clinic data:" -ForegroundColor Cyan
try {
    $nailData = (Invoke-WebRequest -Uri "http://localhost:5002/api/debug/clinic-scope?clinic_group=The%20Nail%20Surgery%20Clinic" -Method GET).Content | ConvertFrom-Json
    Write-Host "   Consultations: $($nailData.sampleData.consultationCount), Patients: $($nailData.sampleData.patientCount)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed to get Nail Surgery data" -ForegroundColor Red
}

Write-Host "`n✅ Webhook standardization tests completed!" -ForegroundColor Green