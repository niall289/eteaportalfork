# MailerSend Communication Setup

## Required Environment Variables

- `MAILERSEND_API_KEY`: Your MailerSend API key (required)
- `MAILERSEND_FROM`: Default sender email address (default: noreply@eteahealth.ie)
- `MAILERSEND_FROM_NAME`: Default sender name (default: ETEA Health)
- `MAILERSEND_REPLY_TO`: Default reply-to email (default: support@eteahealth.ie)

## DNS Setup Reminder

To ensure proper email deliverability for eteahealth.ie, configure the following DNS records:

### SPF Record
```
Type: TXT
Name: @
Value: "v=spf1 include:spf.mailersend.net ~all"
```

### DKIM Records
```
Type: CNAME
Name: ms1._domainkey
Value: ms1.domainkey.mailersend.net

Type: CNAME
Name: ms2._domainkey
Value: ms2.domainkey.mailersend.net
```

## Example JSON Payloads

### Template Email
```json
{
  "from": {
    "email": "noreply@eteahealth.ie",
    "name": "ETEA Health"
  },
  "to": [
    {
      "email": "recipient@example.com",
      "name": "Recipient Name"
    }
  ],
  "template_id": "your-template-id",
  "variables": [
    {
      "email": "recipient@example.com",
      "substitutions": {
        "name": "John Doe",
        "appointment_date": "2023-10-15"
      }
    }
  ]
}
```

### Raw Content Email
```json
{
  "from": {
    "email": "noreply@eteahealth.ie",
    "name": "ETEA Health"
  },
  "to": [
    {
      "email": "recipient@example.com",
      "name": "Recipient Name"
    }
  ],
  "subject": "Your Appointment Confirmation",
  "html": "<p>Dear {{name}},</p><p>Your appointment is confirmed for {{appointment_date}}.</p>",
  "text": "Dear {{name}}, Your appointment is confirmed for {{appointment_date}}."
}
```

## Notes

This implementation uses the MailerSend API exclusively. There is no SMTP fallback configured.