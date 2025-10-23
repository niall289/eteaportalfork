# LIVE PRODUCTION UPDATE GUIDE
# Updating Portal + Nail Surgery Chatbot with Webhook Consistency Changes

## 🎯 OVERVIEW
Both apps are live on Hetzner. We need to update them with:
- Portal: New database columns + webhook normalization
- Chatbot: Updated webhook payload format (if needed)

## 1. PORTAL UPDATE (Zero-Downtime)

### A) Backup First
```bash
# SSH to your Hetzner server
ssh your-server

# Backup current portal
sudo cp -r /var/www/etea-portal /var/www/etea-portal-backup-$(date +%Y%m%d)

# Backup database (if using local postgres)
pg_dump your_db > portal_backup_$(date +%Y%m%d).sql
```

### B) Database Migration (Safe)
```bash
# Connect to your production database
# Use the connection string from your live .env file

# Option 1: Use our migration script
cd /var/www/etea-portal
export DATABASE_URL="your-production-db-url"
node run-migrations.mjs

# Option 2: Manual SQL (if needed)
psql $DATABASE_URL -c "
ALTER TABLE consultations 
  ADD COLUMN IF NOT EXISTS clinic_domain text,
  ADD COLUMN IF NOT EXISTS clinic_source text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS clinic_group text;
"
```

### C) Deploy Portal Updates
```bash
cd /var/www/etea-portal

# Pull latest changes
git fetch origin
git checkout feature/portal-webhook-consistency
git pull origin feature/portal-webhook-consistency

# Install any new dependencies
npm install

# Build for production
npm run build

# Update environment with new webhook secret (if changed)
sudo nano .env
# Add/verify: NAIL_WEBHOOK_SECRET=your-production-secret

# Restart portal (zero downtime with PM2)
pm2 restart etea-portal
pm2 status

# Verify it's running
curl https://your-domain.com/api/health
```

### D) Test Portal Webhook
```bash
# Test the updated webhook endpoint
curl -X POST https://your-domain.com/api/webhooks/nailsurgery \
  -H "X-Webhook-Secret: your-production-secret" \
  -H "Content-Type: multipart/form-data" \
  -F 'data={"name":"Update Test","email":"test@example.com","source":"nail_surgery_clinic","clinic_domain":"test.com"}'

# Should return: {"success":true,"id":"123"}
```

## 2. CHATBOT UPDATE

### A) Environment Variables
```bash
# Update chatbot environment
cd /path/to/nail-surgery-chatbot

# Update .env with any new fields
PORTAL_WEBHOOK_URL=https://your-domain.com/api/webhooks/nailsurgery
WEBHOOK_SECRET=your-production-secret  # Match portal secret

# If chatbot needs to send new fields:
CLINIC_DOMAIN=your-nail-surgery-domain.com
CLINIC_SOURCE=chatbot_widget
```

### B) Code Updates (if needed)
```javascript
// If chatbot needs to send the new optional fields:
const webhookPayload = {
  // Existing fields
  name: patientName,
  email: patientEmail,
  phone: patientPhone,
  issue_category: issueCategory,
  symptom_description: symptoms,
  
  // NEW optional fields (portal will handle defaults)
  clinic_domain: process.env.CLINIC_DOMAIN,
  clinic_source: process.env.CLINIC_SOURCE,
  preferred_clinic: userSelectedClinic, // or leave undefined for null
  
  // Portal will auto-add:
  // source: 'nail_surgery_clinic'
  // clinic_group: 'The Nail Surgery Clinic'
};
```

### C) Deploy Chatbot
```bash
# Restart chatbot service
pm2 restart nail-surgery-chatbot
pm2 status
```

## 3. VERIFICATION & TESTING

### A) End-to-End Test
```bash
# 1. Have someone use the live nail surgery chatbot
# 2. Complete a consultation submission
# 3. Check portal database for new record with correct fields

# OR manual webhook test:
curl -X POST https://your-domain.com/api/webhooks/nailsurgery \
  -H "X-Webhook-Secret: your-production-secret" \
  -F 'data={
    "name": "Live Test Patient",
    "email": "test@example.com", 
    "phone": "+1234567890",
    "issue_category": "Ingrown Toenail",
    "symptom_description": "Test from live system",
    "clinic_domain": "nailsurgery.test.com",
    "clinic_source": "widget_test",
    "preferred_clinic": "Main Office"
  }'
```

### B) Database Verification
```sql
-- Check recent consultation has new fields
SELECT 
  id, name, email, source, clinic_group, 
  clinic_domain, clinic_source, preferred_clinic,
  created_at
FROM consultations 
ORDER BY created_at DESC 
LIMIT 5;

-- Should see:
-- source: 'nail_surgery_clinic'
-- clinic_group: 'The Nail Surgery Clinic' 
-- clinic_domain: 'nailsurgery.test.com' (if sent)
-- clinic_source: 'widget_test' (if sent)
-- preferred_clinic: 'Main Office' (if sent) or null
```

### C) Monitor Logs
```bash
# Portal logs
pm2 logs etea-portal

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Look for:
# ✅ "NAIL SURGERY WEBHOOK" entries
# ✅ "Created consultation via storage: ID"
# ❌ Any 500 errors or "column does not exist"
```

## 4. ROLLBACK PLAN (If Issues)

### Database Rollback
```sql
-- If needed, remove columns (CAREFUL!)
ALTER TABLE consultations 
  DROP COLUMN IF EXISTS clinic_domain,
  DROP COLUMN IF EXISTS clinic_source,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS clinic_group;
```

### Code Rollback
```bash
# Revert portal code
cd /var/www/etea-portal
git checkout main  # or previous stable branch
npm install
npm run build
pm2 restart etea-portal
```

## 5. SUCCESS CRITERIA

✅ Portal starts without errors
✅ Database migration successful (4 new columns)
✅ Webhook accepts test requests (200 response)
✅ New consultations have proper field values
✅ No 500 errors in logs
✅ Chatbot can successfully submit consultations
✅ All existing functionality still works

## 6. MONITORING POST-UPDATE

```bash
# Set up alerts for webhook failures
# Monitor webhook endpoint health
curl https://your-domain.com/api/health

# Check webhook debug (if enabled in dev)
curl https://your-domain.com/api/debug/webhook-test

# Monitor consultation creation rate
# Should be same as before update
```

## 🚀 UPDATE TIMELINE

**Estimated downtime: ~5 minutes**
1. Database migration: 30 seconds
2. Portal code update: 2 minutes  
3. Service restart: 30 seconds
4. Verification: 2 minutes

**Best time to update:** During low-traffic hours