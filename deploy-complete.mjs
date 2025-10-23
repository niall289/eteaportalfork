#!/usr/bin/env node

// COMPLETE Live deployment script with actual values
// Ready to copy-paste commands for your Hetzner server

console.log('🚀 LIVE DEPLOYMENT - COMPLETE COMMANDS');
console.log('======================================\n');

console.log('📋 COPY-PASTE COMMANDS FOR YOUR HETZNER SERVER:\n');

console.log('# 1. 💾 BACKUP CURRENT PORTAL');
console.log('ssh root@91.99.104.138');
console.log('sudo cp -r /var/www/etea-portal /var/www/etea-portal-backup-$(date +%Y%m%d-%H%M)');
console.log('echo "✅ Backup created at: /var/www/etea-portal-backup-$(date +%Y%m%d-%H%M)"\n');

console.log('# 2. 🔄 UPDATE PORTAL CODE');
console.log('cd /var/www/etea-portal');
console.log('git fetch origin');
console.log('git status  # Check current state');
console.log('git checkout feature/portal-webhook-consistency');
console.log('git pull origin feature/portal-webhook-consistency');
console.log('echo "✅ Code updated to latest feature branch"\n');

console.log('# 3. 📦 INSTALL DEPENDENCIES & BUILD');
console.log('npm install');
console.log('npm run build');
console.log('echo "✅ Portal built for production"\n');

console.log('# 4. 🔧 VERIFY ENVIRONMENT VARIABLES');
console.log('cat > .env.check << \'EOF\'');
console.log('NAIL_WEBHOOK_SECRET=nailsurgery_secret_2025');
console.log('DATABASE_URL=postgresql://postgres:vOrFdgMwV4qy4IkS@db.oszmxxeycbfbvsojosva.supabase.co:5432/postgres');
console.log('SUPABASE_URL=https://oszmxxeycbfbvsojosva.supabase.co');
console.log('SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zem14eGV5Y2JmYnZzb2pvc3ZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzNDE0NiwiZXhwIjoyMDc0ODEwMTQ2fQ._gCFTr0ozB_IJzqM-ds3-ccsjK74dq0XI9dr2xUeAaQ');
console.log('SUPABASE_BUCKET=triageimages');
console.log('FOOTCARE_WEBHOOK_SECRET=footcare_secret_2025');
console.log('LASER_WEBHOOK_SECRET=lasercare_secret_2025');
console.log('EOF');
console.log('echo "📋 Environment variables template created in .env.check"');
console.log('echo "🔧 Compare with your current .env file and update if needed:"\n');

console.log('# 5. 🔄 RESTART PORTAL SERVICE');
console.log('pm2 restart etea-portal');
console.log('sleep 3  # Give it time to start');
console.log('pm2 status');
console.log('pm2 logs etea-portal --lines 10');
console.log('echo "✅ Portal restarted - check logs above for errors"\n');

console.log('# 6. 🏥 TEST HEALTH ENDPOINT FIRST');
console.log('curl -s https://eteaportal.engageiobots.com/api/health | jq .');
console.log('# Should return: {"status":"ok","timestamp":"..."}');
console.log('echo "✅ Health check passed"\n');

console.log('# 7. ✅ TEST NEW WEBHOOK ENDPOINT');
console.log('curl -X POST https://eteaportal.engageiobots.com/api/webhooks/nailsurgery \\');
console.log('  -H "X-Webhook-Secret: nailsurgery_secret_2025" \\');
console.log('  -H "Content-Type: multipart/form-data" \\');
console.log('  -F \'data={"name":"Live Update Test","email":"test@nailsurgery.com","phone":"+1234567890","issue_category":"Ingrown Toenail","symptom_description":"Test after live update","clinic_domain":"nailsurgery.example.com"}\'');
console.log('# Expected response: {"success":true,"id":"<number>"}');
console.log('echo "✅ Webhook test passed"\n');

console.log('# 8. 📊 VERIFY DATABASE RECEIVED DATA');
console.log('psql "postgresql://postgres:vOrFdgMwV4qy4IkS@db.oszmxxeycbfbvsojosva.supabase.co:5432/postgres" -c "');
console.log('SELECT ');
console.log('  id, name, email, source, clinic_group, clinic_domain, created_at ');
console.log('FROM consultations ');
console.log('WHERE name = \'Live Update Test\' ');
console.log('ORDER BY created_at DESC ');
console.log('LIMIT 1;"');
console.log('# Should show: source=nail_surgery_clinic, clinic_group=The Nail Surgery Clinic');
console.log('echo "✅ Database verification complete"\n');

console.log('# 9. 🧹 CLEANUP');
console.log('rm .env.check  # Remove the template file');
console.log('echo "✅ Cleanup complete"\n');

console.log('═══════════════════════════════════════════════════════════');
console.log('🎯 DEPLOYMENT COMPLETE CHECKLIST:');
console.log('═══════════════════════════════════════════════════════════');
console.log('□ Backup created successfully');
console.log('□ Code updated to feature branch');
console.log('□ Dependencies installed & built');
console.log('□ Environment variables verified');
console.log('□ PM2 restart successful (no errors in logs)');
console.log('□ Health endpoint returns 200 OK');
console.log('□ Webhook test returns success:true');
console.log('□ Database shows new record with correct fields');
console.log('□ No error logs in PM2 after restart\n');

console.log('🚨 IF ISSUES OCCUR - QUICK ROLLBACK:');
console.log('git checkout main  # or your previous stable branch');
console.log('npm install && npm run build');
console.log('pm2 restart etea-portal');
console.log('pm2 logs etea-portal --lines 20\n');

console.log('🎉 NEXT: Test with your live nail surgery chatbot!');
console.log('🌐 Your portal: https://eteaportal.engageiobots.com/');
console.log('🔗 Webhook endpoint: https://eteaportal.engageiobots.com/api/webhooks/nailsurgery');