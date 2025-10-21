# Smoke tests for Nail Surgery Clinic scoping functionality
# Run these commands to verify the clinic scoping implementation works correctly

Write-Host "🧪 Testing Nail Surgery Clinic Scoping Implementation" -ForegroundColor Green

Write-Host "`n1. Testing clinic scoping debug endpoint..." -ForegroundColor Yellow
(Invoke-WebRequest -Uri "http://localhost:5002/api/debug/clinic-scope?clinic_group=The%20Nail%20Surgery%20Clinic").Content

Write-Host "`n2. Testing consultations API with clinic scoping..." -ForegroundColor Yellow  
(Invoke-WebRequest -Uri "http://localhost:5002/api/consultations?clinic_group=The%20Nail%20Surgery%20Clinic").Content

Write-Host "`n3. Testing patients API with clinic scoping..." -ForegroundColor Yellow
(Invoke-WebRequest -Uri "http://localhost:5002/api/patients?clinic_group=The%20Nail%20Surgery%20Clinic").Content

Write-Host "`n4. Testing dashboard KPIs with clinic scoping..." -ForegroundColor Yellow
(Invoke-WebRequest -Uri "http://localhost:5002/api/dashboard/stats?clinic_group=The%20Nail%20Surgery%20Clinic").Content

Write-Host "`n✅ Smoke tests completed!" -ForegroundColor Green
Write-Host "Expected results:" -ForegroundColor Cyan
Write-Host "- Debug endpoint should show clinicGroup: 'The Nail Surgery Clinic'" -ForegroundColor Gray
Write-Host "- Consultations should return nail surgery specific consultations" -ForegroundColor Gray  
Write-Host "- Patients should show aggregated patients from nail surgery consultations" -ForegroundColor Gray
Write-Host "- Dashboard stats should show KPIs for nail surgery clinic only" -ForegroundColor Gray