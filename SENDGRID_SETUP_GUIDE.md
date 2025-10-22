# 📧 SendGrid Setup Guide for Railway

## Why SendGrid?

✅ **Railway blocks SMTP ports** (465, 587) - confirmed by testing  
✅ SendGrid uses **HTTP API** instead of SMTP  
✅ **Free tier**: 100 emails/day (enough for testing)  
✅ Better deliverability and email analytics  
✅ Works perfectly on Railway, Heroku, Vercel, etc.

## 🚀 Quick Setup (5 minutes)

### Step 1: Create SendGrid Account

1. Go to: https://sendgrid.com/
2. Click **"Start for Free"**
3. Sign up with your email
4. Verify your email address
5. Complete the onboarding (select "Web App" as integration)

### Step 2: Create API Key

1. Log in to SendGrid dashboard
2. Go to **Settings** → **API Keys** (https://app.sendgrid.com/settings/api_keys)
3. Click **"Create API Key"**
4. Name it: `Railway Production`
5. Select **"Full Access"** (or at minimum "Mail Send" permission)
6. Click **"Create & View"**
7. **COPY THE API KEY** (you won't see it again!)
   - Format: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 3: Verify Sender Identity

SendGrid requires sender verification to prevent spam:

**Option A: Single Sender Verification (Easiest)**
1. Go to **Settings** → **Sender Authentication** → **Single Sender Verification**
2. Click **"Create New Sender"**
3. Fill in:
   - **From Name**: `Barangay Bula Management System`
   - **From Email Address**: `torukamiya1@gmail.com`
   - **Reply To**: `torukamiya1@gmail.com`
   - **Company Address**: Your barangay address
4. Click **"Create"**
5. Check your email (`torukamiya1@gmail.com`) and click the verification link

**Option B: Domain Authentication (Better for production)**
- Requires DNS access to your domain
- More complex but better deliverability
- Follow: https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication

### Step 4: Update Railway Environment Variables

1. Go to your Railway project
2. Click on your backend service
3. Go to **Variables** tab
4. Add this new variable:
   ```
   SENDGRID_API_KEY=SG.your_actual_api_key_here
   ```
5. **Keep existing Gmail variables** (as fallback for local development):
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=465
   EMAIL_USER=torukamiya1@gmail.com
   EMAIL_PASS=vhilhuluogotyknn
   EMAIL_FROM_NAME=Barangay Bula Management System
   EMAIL_FROM_ADDRESS=torukamiya1@gmail.com
   ```

6. Railway will auto-deploy after saving

### Step 5: Update Code to Use Hybrid Service

The hybrid email service (`emailServiceHybrid.js`) automatically:
- ✅ Uses SendGrid if `SENDGRID_API_KEY` is set
- ✅ Falls back to SMTP if SendGrid is not configured
- ✅ Works locally (SMTP) and on Railway (SendGrid)

**Replace the email service import:**

In files that use email service, change:
```javascript
const emailService = require('./src/services/emailService');
```

To:
```javascript
const emailService = require('./src/services/emailServiceHybrid');
```

Or rename the hybrid file to replace the original.

## 📊 Testing SendGrid

### Test Locally First

```bash
# Set environment variable
set SENDGRID_API_KEY=SG.your_api_key_here

# Run the server
npm start
```

### Test on Railway

After deployment, check Railway logs for:
```
🔧 Using SendGrid API for email delivery
✅ SendGrid email service initialized successfully
```

Then test by registering a new account.

## 🔍 Monitoring

### SendGrid Dashboard

1. Go to **Activity** → **Email Activity**
2. See all sent emails, delivery status, opens, clicks
3. Debug any delivery issues

### Railway Logs

Look for:
```
✅ Email sent successfully via SendGrid
   statusCode: 202
```

Or errors:
```
❌ Failed to send email via SendGrid
   Error: [specific error]
```

## 💰 SendGrid Pricing

| Plan | Emails/Day | Emails/Month | Price |
|------|------------|--------------|-------|
| **Free** | 100 | ~3,000 | $0 |
| **Essentials** | Unlimited | 50,000 | $19.95/mo |
| **Pro** | Unlimited | 100,000+ | $89.95/mo |

**Free tier is perfect for:**
- Testing and development ✅
- Small barangay with <100 daily registrations ✅
- OTP emails, notifications ✅

## 🆘 Troubleshooting

### Error: "The from email does not match a verified Sender Identity"

**Solution**: Complete Step 3 (Verify Sender Identity)

### Error: "Unauthorized"

**Solution**: Check your API key is correct and has "Mail Send" permission

### Emails not arriving

1. Check SendGrid Activity dashboard
2. Look for "Delivered" status
3. Check spam folder
4. Verify sender email is verified

### Still using SMTP instead of SendGrid

**Check:**
1. `SENDGRID_API_KEY` is set in Railway
2. API key starts with `SG.`
3. Railway logs show "Using SendGrid API"

## 🎯 Expected Behavior

### With SendGrid Configured:
```
🔧 Using SendGrid API for email delivery
✅ SendGrid email service initialized successfully
📧 Verifying Email Service...
✅ SendGrid API key configured
✅ Email service configured and ready
```

### Without SendGrid (Fallback to SMTP):
```
🔧 Using SMTP for email delivery
⚠️  Email service verification failed: Email verification timeout
```

## 📝 Files Modified

1. **`src/services/emailServiceHybrid.js`** - New hybrid email service
2. **`package.json`** - Added `@sendgrid/mail` dependency

## ✨ Benefits of This Solution

✅ **Works on Railway** - No SMTP port blocking issues  
✅ **Works locally** - Falls back to Gmail SMTP  
✅ **Zero code changes** - Same API interface  
✅ **Better reliability** - SendGrid has 99.9% uptime  
✅ **Email analytics** - Track opens, clicks, bounces  
✅ **Free tier** - 100 emails/day  
✅ **Easy setup** - 5 minutes to configure  

## 🔄 Rollback Plan

If SendGrid doesn't work, simply:
1. Remove `SENDGRID_API_KEY` from Railway
2. System falls back to SMTP automatically
3. (But SMTP won't work on Railway due to port blocking)

## 🎉 Next Steps

1. ✅ Create SendGrid account
2. ✅ Get API key
3. ✅ Verify sender email
4. ✅ Add `SENDGRID_API_KEY` to Railway
5. ✅ Deploy and test

**Your Gmail credentials are valid** - they'll work for local development!  
**SendGrid will handle production emails** on Railway!
