# Nail Surgery Webhook Implementation

## Overview
This document describes the nail surgery webhook receiver endpoint that has been implemented in the portal.

## Endpoint Details

### URL
```
POST /api/webhooks/nailsurgery
```

### Authentication
The endpoint requires authentication via a webhook secret header:
- Header name: `x-webhook-secret` (case-insensitive)
- The secret must match the value in environment variable `NAIL_WEBHOOK_SECRET`
- Returns `401 Unauthorized` if the secret is missing or incorrect

### Request Format
The endpoint accepts two formats:

#### 1. JSON Body Format
```bash
curl -X POST http://localhost:5002/api/webhooks/nailsurgery \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret-here" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "issue_category": "Ingrown toenail",
    "symptom_description": "Pain and swelling"
  }'
```

#### 2. FormData with 'data' Field
```bash
curl -X POST http://localhost:5002/api/webhooks/nailsurgery \
  -H "x-webhook-secret: your-secret-here" \
  -F 'data={"name":"John Doe","email":"john@example.com","phone":"555-1234"}'
```

### Field Normalization
The webhook automatically normalizes the following fields:
- `source` → set to `'nail_surgery_clinic'`
- `clinic_group` → set to `'The Nail Surgery Clinic'`
- `preferred_clinic` → set to `null`

### Patient Information Extraction
The webhook extracts patient information from multiple possible field names:
- **Name**: `name`, `patient_name` (default: 'Unknown Patient')
- **Email**: `email`, `patient_email` (default: 'no-email@provided.com')
- **Phone**: `phone`, `patient_phone` (default: 'no-phone-provided')

### Database Storage
The consultation is stored in the Supabase `consultations` table with these columns:
- `form_data` (JSON) - The complete normalized form data
- `source` (string) - Set to 'nail_surgery_clinic'
- `clinic_group` (string) - Set to 'The Nail Surgery Clinic'
- `patient_name` (string) - Extracted from form data
- `patient_email` (string) - Extracted from form data
- `patient_phone` (string) - Extracted from form data
- `status` (string) - Set to 'new'
- `created_at` (ISO timestamp) - Current timestamp

### Response Format

#### Success Response (201 Created)
```json
{
  "success": true,
  "id": 123
}
```

#### Error Responses

**Unauthorized (401)**
```json
{
  "error": "Unauthorized"
}
```

**Invalid JSON (400)**
```json
{
  "error": "Invalid JSON in data field"
}
```

**Database Error (500)**
```json
{
  "error": "Database insert failed",
  "details": "Error message from Supabase"
}
```

**Internal Server Error (500)**
```json
{
  "error": "Internal server error",
  "details": "Error message"
}
```

## Environment Configuration

Add the following to your `.env` file:
```bash
NAIL_WEBHOOK_SECRET=your-secret-here
```

See `server/.env.example` for a complete list of environment variables.

## File Uploads
The endpoint uses multer with `upload.any()` to accept file uploads. Files are received but not persisted to storage yet. This can be implemented in a future update if needed.

## Testing

### Using the Test Script
```bash
NAIL_WEBHOOK_SECRET=test-secret-123 node test-nailsurgery-webhook.js
```

### Manual Testing with curl
```bash
# Test with valid secret
curl -X POST http://localhost:5002/api/webhooks/nailsurgery \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: test-secret-123" \
  -d '{
    "name": "Test Patient",
    "email": "test@example.com",
    "phone": "555-1234",
    "issue_category": "Ingrown toenail"
  }'

# Test with missing secret (should return 401)
curl -X POST http://localhost:5002/api/webhooks/nailsurgery \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Patient",
    "email": "test@example.com"
  }'
```

## Implementation Details

### Middleware Chain
1. `skipAuthForWebhook` - Bypasses normal authentication
2. `upload.any()` - Multer middleware with memory storage for file uploads

### Security Features
- Case-insensitive header matching for webhook secret
- Environment variable validation
- Input sanitization
- Error logging with stack traces
- Secure error messages (no sensitive data in responses)

### Logging
The webhook includes comprehensive logging:
- Request headers and body
- Webhook secret validation status
- Data parsing and normalization
- Database insert operations
- Error details and stack traces

All logs are prefixed with emoji indicators for easy visual scanning:
- 🔔 Webhook start
- 🔍 Request inspection
- 🔑 Authentication
- 📋 Data parsing
- 💾 Database operations
- ✅ Success
- ❌ Errors
