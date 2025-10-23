# Deploy fixed frontend to server
Write-Host "🚀 Deploying fixed frontend to server..." -ForegroundColor Green

# Copy the built files to the server
Write-Host "📦 Copying dist folder to server..." -ForegroundColor Yellow
scp -r dist root@91.99.104.138:/srv/etea-portal/

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
    Write-Host "🌐 Portal should now be accessible at: http://91.99.104.138:5002" -ForegroundColor Cyan
    Write-Host "🔑 Use password: footcare2025" -ForegroundColor Cyan
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
}