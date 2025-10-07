@echo off
echo Starting FootCare chatbot server on port 5000...
cd /d "%~dp0..\..\..\..\FootcareClinic-Final"
start "Chatbot Server" tsx server/index.ts

echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo Sending multipart POST to chatbot /api/webhook-proxy with test data and image...
curl -X POST http://localhost:5000/api/webhook-proxy ^
  -F "name=Test Patient" ^
  -F "email=test@example.com" ^
  -F "phone=1234567890" ^
  -F "preferred_clinic=Test Clinic" ^
  -F "issueCategory=Nail Issue" ^
  -F "symptomDescription=Test symptoms" ^
  -F "hasImage=true" ^
  -F "image=@%~dp0..\test.png" ^
  -v

echo.
echo Checking portal /api/consultations for the new consultation...
curl -s http://localhost:5002/api/consultations | findstr "image_url"

echo.
echo Downloading and checking CSV export...
curl -s "http://localhost:5002/api/export/analytics?format=csv" > analytics_temp.csv
type analytics_temp.csv | findstr "image_url"
del analytics_temp.csv

echo.
echo Smoke test completed.
pause