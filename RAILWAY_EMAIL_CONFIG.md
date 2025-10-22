# Railway Email Configuration Guide

## Gmail SMTP Settings for Railway

### Required Environment Variables

Set these in your Railway project environment variables:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=torukamiya1@gmail.com
EMAIL_PASS=vhilhuluogotyknn
EMAIL_FROM_NAME=Barangay Bula Management System
EMAIL_FROM_ADDRESS=torukamiya1@gmail.com
```

### Important Notes

1. **Port 465 with SSL**: Railway works better with port 465 (SSL) instead of port 587 (TLS/STARTTLS)
   - Port 465 uses implicit SSL/TLS from the start
   - Port 587 uses STARTTLS which can have issues with Railway's network

2. **App Password**: The `EMAIL_PASS` must be a Gmail App Password, not your regular Gmail password
   - Generate at: https://myaccount.google.com/apppasswords
   - 16 characters, no spaces

3. **No Quotes Needed**: Railway automatically handles environment variables correctly
   - Don't wrap values in quotes in Railway dashboard
   - The code strips quotes automatically if present

4. **Timeout Settings**: The email service now has:
   - 30-second connection timeout
   - 30-second greeting timeout
   - 30-second socket timeout
   - 3 retry attempts with exponential backoff

5. **Non-blocking Verification**: Server will start even if email verification fails
   - 15-second timeout on verification
   - Emails will still be attempted when needed

## Troubleshooting

### If emails still don't send:

1. **Check Railway Logs** for detailed error messages:
   ```
   ❌ Email connection verification failed:
      Error Message: [actual error]
      Error Code: [error code]
   ```

2. **Verify Gmail Settings**:
   - 2-Step Verification must be enabled
   - App Password must be generated
   - Less secure app access is NOT needed with App Passwords

3. **Test Locally First**:
   ```bash
   npm start
   ```
   If it works locally but not on Railway, it's a Railway network issue

4. **Alternative: Use SendGrid or Mailgun**:
   - Railway may block SMTP ports
   - Consider using API-based email services

## Code Changes Made

1. **emailService.js**:
   - Default port changed to 465
   - Added `secure: true` for SSL
   - Increased timeouts to 30 seconds
   - Added connection pooling
   - Added retry logic (3 attempts)
   - Enhanced error logging

2. **server.js**:
   - Added 15-second timeout for email verification
   - Made verification non-blocking
   - Server starts even if email fails

## Testing Email

After deployment, test by:
1. Registering a new account
2. Check Railway logs for email sending attempts
3. Look for detailed error messages if it fails
