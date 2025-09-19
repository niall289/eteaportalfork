# ETEA Healthcare Portal - Smoke Tests

This document outlines the smoke tests to verify that the ETEA Healthcare Portal is functioning correctly after deployment or major changes.

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database running
- Environment variables configured (see `.env.sample`)
- Application built and running

## Quick Start Tests

### 1. Application Startup
```bash
# Build the application
npm run build

# Start in development mode
npm run dev

# Or start in production mode
npm run start
```

**Expected Result**: Application starts without errors, listening on configured port.

### 2. Health Check
```bash
# Preferred simple health check
curl http://localhost:3001/api/healthz
```

**Expected Response**:
```json
{
  "ok": true
}
```

**Alternative**: For detailed health information, you can also use:
```bash
curl http://localhost:3001/api/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "env": "development",
  "port": 3001,
  "uptime": 123,
  "timestamp": "2025-09-08T22:30:00.000Z"
}
```

### 3. Database Connectivity
```bash
curl http://localhost:3001/api/db-ping
```

**Expected Response**:
```json
{
  "ok": true,
  "result": { "ok": 1 }
}
```

## API Endpoint Tests

### Authentication Tests

#### Login (if using simple auth)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

### Dashboard Tests

#### Get Dashboard Stats
```bash
curl http://localhost:3001/api/dashboard/stats
```

**Expected Response**: JSON with completedAssessments, weeklyAssessments, flaggedResponses, totalPatients

#### Get Dashboard Trends
```bash
curl http://localhost:3001/api/dashboard/trends?days=7
```

**Expected Response**: Array of date/count objects

### Consultation Tests

#### Get All Consultations
```bash
curl http://localhost:3001/api/consultations
```

**Expected Response**: Array of consultation objects

#### Test FootCare Webhook
```bash
curl -X POST http://localhost:3001/api/webhooks/footcare \
  -H "Content-Type: application/json" \
  -H "X-Footcare-Secret: your-webhook-secret" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+353123456789",
    "preferred_clinic": "FootCare Clinic Dublin",
    "issue_category": "Nail Problem",
    "issue_specifics": "Ingrown toenail",
    "symptom_description": "Redness and swelling around the big toe",
    "previous_treatment": "Over-the-counter cream",
    "has_image": "true",
    "image_path": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "image_analysis": "Possible fungal infection",
    "calendar_booking": "2025-09-10T14:00:00Z",
    "booking_confirmation": "yes",
    "final_question": "Do I need surgery?",
    "additional_help": "Looking for nearest clinic",
    "emoji_survey": "😊",
    "survey_response": "Very satisfied"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Consultation processed successfully",
  "consultationId": 123,
  "patientId": 456,
  "assessmentId": 789
}
```

### Chatbot Settings Tests

#### Get Chatbot Settings
```bash
curl http://localhost:3001/api/chatbot-settings
```

**Expected Response**: JSON with welcomeMessage, botDisplayName, ctaButtonLabel, chatbotTone

#### Update Chatbot Settings
```bash
curl -X PATCH http://localhost:3001/api/chatbot-settings \
  -H "Content-Type: application/json" \
  -d '{
    "welcomeMessage": "Welcome to FootCare Clinic! How can we help?",
    "botDisplayName": "Fiona",
    "ctaButtonLabel": "Chat with Fiona",
    "chatbotTone": "Friendly"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Settings updated successfully"
}
```

### File Upload Tests

#### Test Image Serving
```bash
# After uploading an image via webhook, test serving
curl http://localhost:3001/uploads/test-image.png
```

**Expected Result**: Image file served correctly

### Export Tests

#### CSV Export
```bash
curl "http://localhost:3001/api/export/analytics?format=csv"
```

**Expected Result**: CSV file downloaded with consultation data

#### JSON Export
```bash
curl "http://localhost:3001/api/export/analytics?format=json"
```

**Expected Result**: JSON file with consultation and image data

## Frontend Tests

### 1. Application Load
- Open browser to `http://localhost:3001`
- Verify React app loads without console errors
- Check that all navigation links work

### 2. Dashboard Page
- Navigate to `/dashboard`
- Verify stats cards display data
- Check charts render correctly

### 3. Consultations Page
- Navigate to `/consultations`
- Verify consultation list loads
- Check image thumbnails display
- Test filtering and search

### 4. Analytics Page
- Navigate to `/analytics`
- Verify charts and metrics display
- Test different time ranges

### 5. Chatbot Settings Page
- Navigate to `/settings`
- Verify form loads with current values
- Test updating settings

## Database Tests

### Migration Safety
```bash
# Migrations are safe to re-run multiple times
# The idempotent enum creation prevents 'type already exists' errors
npx drizzle-kit migrate

# Expected: No errors, even if run multiple times
```

**Note**: Use `drizzle-kit migrate` instead of `drizzle-kit push` for automated deployments. The `push` command is interactive and may prompt for confirmation, while `migrate` runs non-interactively and is suitable for CI/CD pipelines.

**Note**: The migration system has been updated to handle enum creation idempotently. Running `drizzle-kit migrate` multiple times will not produce errors, making it safe for deployment scripts and CI/CD pipelines.

### Check Database Tables
```sql
-- Connect to PostgreSQL and run:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Expected tables:
-- assessments, assessment_conditions, chatbot_settings, clinics,
-- communications, conditions, consultations, follow_ups, images, patients, questions, responses, users
```

### Verify Data Integrity
```sql
-- Check consultations table
SELECT COUNT(*) as total_consultations FROM consultations;

-- Check images table
SELECT COUNT(*) as total_images FROM images;

-- Check patients table
SELECT COUNT(*) as total_patients FROM patients;
```

## Performance Tests

### Response Time Tests
```bash
# Test API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/health

# curl-format.txt:
#      time_namelookup:  %{time_namelookup}\n
#         time_connect:  %{time_connect}\n
#      time_appconnect:  %{time_appconnect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                      ----------\n
#           time_total:  %{time_total}\n
```

**Expected Result**: API responses under 500ms

### Memory Usage
```bash
# Check PM2 process memory usage
pm2 monit
```

**Expected Result**: Memory usage stable, no memory leaks

## Error Handling Tests

### Invalid Webhook Secret
```bash
curl -X POST http://localhost:3001/api/webhooks/footcare \
  -H "Content-Type: application/json" \
  -H "X-Footcare-Secret: invalid-secret" \
  -d '{}'
```

**Expected Response**: 401 Unauthorized

### Invalid Chatbot Settings
```bash
curl -X PATCH http://localhost:3001/api/chatbot-settings \
  -H "Content-Type: application/json" \
  -d '{"chatbotTone": "InvalidTone"}'
```

**Expected Response**: 400 Bad Request with validation errors

## Automated Testing

### Using the HTTP Test File

Use the `api-tests/portal.http` file with VS Code REST Client extension or similar tools to run automated API tests.

### Continuous Integration

For CI/CD pipelines, consider adding these tests to your deployment pipeline:

```yaml
# Example GitHub Actions step
- name: Run Smoke Tests
  run: |
    npm run build
    npm run start &
    sleep 10
    npm run test:smoke
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL in .env
   - Verify PostgreSQL is running
   - Run migrations: `npx drizzle-kit migrate`

2. **Application Won't Start**
   - Check Node.js version: `node --version`
   - Verify dependencies: `npm ls`
   - Check environment variables

3. **Images Not Loading**
   - Verify uploads directory exists and is writable
   - Check file permissions
   - Verify NGINX configuration for /uploads route

4. **Webhook Not Working**
   - Check FOOTCARE_WEBHOOK_SECRET
   - Verify request headers and body format
   - Check server logs for errors

### Logs to Check

- Application logs: `./logs/app.log`
- PM2 logs: `pm2 logs etea-portal`
- NGINX logs: `/var/log/nginx/etea-portal.*.log`
- Database logs: Check PostgreSQL logs

## Success Criteria

✅ All API endpoints return expected responses
✅ Frontend loads without errors
✅ Database connections work
✅ File uploads and serving work
✅ Authentication functions correctly
✅ Webhook processes FootCare payload correctly
✅ Charts and analytics display data
✅ Export functionality works
✅ Response times are acceptable (<500ms for APIs)
✅ No console errors in browser
✅ All CRUD operations work for consultations and settings