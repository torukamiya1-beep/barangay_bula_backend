# 🚂 Railway Deployment Instructions - Gmail Fix Applied

## ✅ Changes Made to Fix Gmail Issue

### 1. Email Service Configuration (`src/services/emailService.js`)
- **Changed default port from 587 to 465** (SSL instead of TLS)
- **Added secure:true by default** for better Railway compatibility
- **Increased timeouts to 30 seconds** (connection, greeting, socket)
- **Added connection pooling** for better performance
- **Implemented retry logic** (3 attempts with exponential backoff)
- **Enhanced error logging** with full error details

### 2. Server Startup (`server.js`)
- **Added 15-second timeout** for email verification
- **Made email verification non-blocking** - server starts even if email fails
- **Better error messages** for troubleshooting

### 3. Environment Configuration (`.env.production`)
- **Updated EMAIL_PORT to 465**
- **Updated EMAIL_SECURE to true**

## 📋 Railway Environment Variables

**CRITICAL**: Update these in your Railway dashboard:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=torukamiya1@gmail.com
EMAIL_PASS=vhilhuluogotyknn
EMAIL_FROM_NAME=Barangay Bula Management System
EMAIL_FROM_ADDRESS=torukamiya1@gmail.com
```

### How to Update Railway Variables:

1. Go to your Railway project: https://railway.app/project/[your-project-id]
2. Click on your backend service
3. Go to **Variables** tab
4. Update or add these variables:
   - `EMAIL_PORT` → `465` (change from 587)
   - `EMAIL_HOST` → `smtp.gmail.com`
   - `EMAIL_USER` → `torukamiya1@gmail.com`
   - `EMAIL_PASS` → `vhilhuluogotyknn`
   - `EMAIL_FROM_NAME` → `Barangay Bula Management System`
   - `EMAIL_FROM_ADDRESS` → `torukamiya1@gmail.com`

5. **Important**: Don't use quotes around values in Railway dashboard
6. Click **Deploy** or wait for auto-deploy

## 🔍 What to Check After Deployment

### 1. Check Railway Logs

Look for these success messages:
```
✅ Email transporter initialized successfully
✅ Email service configured and ready
```

Or detailed error messages if it still fails:
```
❌ Email connection verification failed:
   Error Message: [specific error]
   Error Code: [error code]
   Error Command: [SMTP command]
```

### 2. Test Email Sending

1. Register a new account on your frontend
2. Check Railway logs for:
   ```
   ℹ️  Email sent successfully
   ```
   Or:
   ```
   ❌ Failed to send email (attempt 1/3):
   ```

### 3. Common Error Codes

- **ETIMEDOUT**: Connection timeout - Railway may be blocking SMTP
- **ECONNREFUSED**: Connection refused - Wrong port or host
- **EAUTH**: Authentication failed - Wrong credentials
- **ESOCKET**: Socket error - Network issue

## 🔧 If Emails Still Don't Work

### Option 1: Verify Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Generate a new 16-character app password
3. Update `EMAIL_PASS` in Railway with the new password
4. Redeploy

### Option 2: Check Railway Network

Railway might be blocking SMTP ports. Try:

1. **Use Railway's IP whitelist** (if Gmail requires it)
2. **Contact Railway support** about SMTP port access
3. **Consider alternative email services**:
   - SendGrid (API-based, no SMTP)
   - Mailgun (API-based, no SMTP)
   - AWS SES (API-based, no SMTP)

### Option 3: Test with Different Port

If 465 doesn't work, try port 587 with STARTTLS:
```
EMAIL_PORT=587
EMAIL_SECURE=false
```

## 📊 Monitoring

### Check Email Service Status

The server logs will show:
- Email configuration on startup
- Connection verification results
- Each email send attempt with retry count
- Detailed error information

### Example Success Log:
```
🔍 EMAIL_PASS raw value: "vhilhuluogotyknn"
🔍 EMAIL_PASS length: 16
ℹ️  Email transporter initialized successfully
📧 Verifying Email Service...
✅ Email service configured and ready
```

### Example Failure Log:
```
❌ Email connection verification failed:
   Error Message: connect ETIMEDOUT 142.250.185.109:465
   Error Code: ETIMEDOUT
   Error Command: CONN
⚠️  Email service verification failed: Email verification timeout after 15 seconds
⚠️  Server will continue to start, but emails will fail to send
```

## 🚀 Deployment Steps

1. **Commit and push changes** (already done):
   ```bash
   git add .
   git commit -m "Fix Railway Gmail SMTP issue"
   git push origin main
   ```

2. **Update Railway environment variables** (see above)

3. **Trigger deployment**:
   - Railway auto-deploys on push
   - Or manually click "Deploy" in Railway dashboard

4. **Monitor logs** in Railway dashboard

5. **Test email functionality** by registering a new account

## 📝 Additional Notes

- The code now defaults to port 465 if `EMAIL_PORT` is not set
- Server will start even if email verification fails (non-blocking)
- Email sending has 3 retry attempts with exponential backoff
- All SMTP errors are logged with full details for debugging
- Connection pooling is enabled for better performance

## 🆘 Support

If issues persist after following these steps:

1. Check Railway logs for specific error codes
2. Verify Gmail App Password is correct and active
3. Ensure 2-Step Verification is enabled on Gmail account
4. Consider using an API-based email service instead of SMTP
5. Contact Railway support about SMTP port access

## ✨ Expected Behavior

After successful deployment:
- Server starts successfully ✅
- Email verification completes within 15 seconds ✅
- Registration emails are sent successfully ✅
- OTP emails are delivered ✅
- Retry logic handles temporary failures ✅
