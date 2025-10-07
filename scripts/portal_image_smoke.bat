@echo off
setlocal enabledelayedexpansion

echo Starting portal image smoke test...

REM Create a small test image using PowerShell
echo Creating test image...
powershell -command "Add-Type -AssemblyName System.Drawing; $bmp = New-Object System.Drawing.Bitmap(1,1); $bmp.SetPixel(0,0,[System.Drawing.Color]::Red); $bmp.Save('test.png',[System.Drawing.Imaging.ImageFormat]::Png)"
if %errorlevel% neq 0 (
    echo Failed to create test image
    exit /b 1
)
echo Test image created.

REM Health check
echo Performing health check...
curl -s http://localhost:5002/api/health
if %errorlevel% neq 0 (
    echo Health check failed
    exit /b 1
)
echo Health check passed.

REM Multipart POST to webhook
echo Posting to webhook with image...
curl -s -X POST ^
  -H "X-Footcare-Secret: test-secret" ^
  -F "name=Smoke Test User" ^
  -F "email=smoke@test.com" ^
  -F "issue_category=Test Issue" ^
  -F "symptom_description=Testing image upload" ^
  -F "image=@test.png" ^
  http://localhost:5002/api/webhooks/footcare > post_response.json
if %errorlevel% neq 0 (
    echo Webhook POST failed
    exit /b 1
)
echo Webhook POST completed.

REM List consultations
echo Fetching consultations...
curl -s http://localhost:5002/api/consultations > consultations.json
if %errorlevel% neq 0 (
    echo Failed to fetch consultations
    exit /b 1
)

REM Extract image_url from the last consultation using PowerShell
echo Extracting image_url...
for /f "delims=" %%i in ('powershell -command "try { $json = Get-Content 'consultations.json' | ConvertFrom-Json; if ($json -and $json.Count -gt 0) { $last = $json[-1]; if ($last.image_url) { $last.image_url } else { '' } } else { '' } } catch { '' }"') do set IMAGE_URL=%%i

if "%IMAGE_URL%"=="" (
    echo No image_url found in consultations
    REM Try CSV export
    echo Fetching CSV export...
    curl -s "http://localhost:5002/api/export/analytics?format=csv" > analytics.csv
    if %errorlevel% neq 0 (
        echo Failed to fetch CSV
        exit /b 1
    )
    REM Extract image_url from CSV (assuming it's the 12th column, image_url)
    for /f "tokens=12 delims=," %%i in ('findstr /v "ID," analytics.csv') do set IMAGE_URL=%%i
    REM Remove quotes
    set IMAGE_URL=!IMAGE_URL:"=!
)

if "%IMAGE_URL%"=="" (
    echo No image_url found
    exit /b 1
)

echo Image URL: %IMAGE_URL%

REM Curl the image_url to confirm reachable
echo Checking image URL reachability...
curl -s -I %IMAGE_URL% | findstr "200"
if %errorlevel% neq 0 (
    echo Image URL not reachable
    exit /b 1
)
echo Image URL is reachable.

REM Cleanup
del test.png post_response.json consultations.json analytics.csv 2>nul

echo Smoke test completed successfully.
endlocal