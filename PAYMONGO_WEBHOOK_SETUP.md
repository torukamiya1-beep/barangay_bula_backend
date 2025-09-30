# 💳 PayMongo Webhook Configuration Guide

This guide explains how to configure PayMongo webhooks for your production deployment on Railway.

---

## 🎯 Why PayMongo Webhook is Critical

PayMongo webhooks are **ESSENTIAL** for your payment system to work correctly. Without proper webhook configuration:
- ❌ Payment status won't update automatically
- ❌ Users won't receive payment confirmations
- ❌ Document requests will remain in "pending payment" status
- ❌ Receipts won't be generated

**The webhook MUST point to your production Railway domain, not localhost!**

---

## 📋 Prerequisites

Before configuring webhooks, ensure:
1. ✅ Backend is deployed to Railway
2. ✅ You have your Railway backend URL (e.g., `https://xxx.up.railway.app`)
3. ✅ You have PayMongo API keys (live keys for production)
4. ✅ Backend is running and accessible

---

## 🔧 Method 1: Using the Webhook Manager Script (Recommended)

### Step 1: Update the Script

1. **Open `paymongo_webhook_manager.js`** in your backend directory
2. **Update these lines** (lines 5-6):

```javascript
const PAYMONGO_SECRET_KEY = 'sk_live_YOUR_LIVE_SECRET_KEY_HERE';
const WEBHOOK_URL = 'https://your-railway-app.up.railway.app/api/webhooks/paymongo';
```

**Important:**
- Use **LIVE** secret key (`sk_live_...`) for production
- Use your actual Railway URL (not localhost!)
- Include the full path: `/api/webhooks/paymongo`

### Step 2: Run the Script

```powershell
# Navigate to backend directory
cd D:\brgy_docu_hub\rhai_backend

# Create the webhook
node paymongo_webhook_manager.js create
```

### Step 3: Save the Webhook Secret

The script will output something like:

```
✅ Webhook created successfully!
📋 Webhook Details:
   ID: hook_xxxxxxxxxxxxx
   URL: https://your-railway-app.up.railway.app/api/webhooks/paymongo
   Events: payment.paid, payment.failed, link.payment.paid
   Secret: whsk_xxxxxxxxxxxxxxxxxxxxx
   Status: enabled

🔧 IMPORTANT: Add this to your .env file:
PAYMONGO_WEBHOOK_SECRET=whsk_xxxxxxxxxxxxxxxxxxxxx
```

**Copy the webhook secret** (starts with `whsk_`)

### Step 4: Update Railway Environment Variables

1. Go to Railway Dashboard
2. Click on your Backend Service
3. Go to "Variables" tab
4. Update or add:
   ```
   PAYMONGO_WEBHOOK_SECRET=whsk_xxxxxxxxxxxxxxxxxxxxx
   ```
5. Click "Save"
6. Railway will automatically redeploy

---

## 🌐 Method 2: Using PayMongo Dashboard

### Step 1: Access PayMongo Dashboard

1. Go to https://dashboard.paymongo.com
2. Login to your account
3. Navigate to **Developers** > **Webhooks**

### Step 2: Create New Webhook

1. Click **"Create Webhook"** button
2. Fill in the form:

   **Webhook URL:**
   ```
   https://your-railway-app.up.railway.app/api/webhooks/paymongo
   ```

   **Events to listen to:**
   - ✅ `payment.paid` - When payment is successful
   - ✅ `payment.failed` - When payment fails
   - ✅ `link.payment.paid` - When payment link is paid (MAIN ONE)

3. Click **"Create Webhook"**

### Step 3: Get Webhook Secret

1. After creation, PayMongo will show the webhook details
2. **Copy the Signing Secret** (starts with `whsk_`)
3. **IMPORTANT**: Save this secret - you can't view it again!

### Step 4: Update Railway Environment Variables

Same as Method 1, Step 4 above.

---

## ✅ Verify Webhook Configuration

### Test 1: Check Webhook Endpoint

```powershell
# Test if webhook endpoint is accessible
curl https://your-railway-app.up.railway.app/api/webhooks/paymongo/test
```

Should return:
```json
{
  "message": "PayMongo webhook endpoint is active",
  "timestamp": "2025-09-30T..."
}
```

### Test 2: List Webhooks

```powershell
# Navigate to backend directory
cd D:\brgy_docu_hub\rhai_backend

# List all webhooks
node paymongo_webhook_manager.js list
```

Should show your webhook with status "enabled"

### Test 3: Check Railway Logs

1. Go to Railway Dashboard
2. Click on Backend Service
3. Go to "Deployments" tab
4. View latest deployment logs
5. Look for:
   ```
   ✅ Database connected successfully
   🚀 Server is running on port 7000
   ```

### Test 4: Make a Test Payment

1. Login to your frontend
2. Create a document request
3. Click "Pay Now"
4. Complete payment on PayMongo
5. Check if status updates automatically
6. Verify receipt is generated

---

## 🔍 Troubleshooting

### Problem: Webhook creation fails

**Error: "Invalid URL"**
- ✅ Check URL format: `https://domain.com/api/webhooks/paymongo`
- ✅ Ensure Railway backend is deployed and running
- ✅ Test URL in browser first

**Error: "Authentication failed"**
- ✅ Verify you're using correct PayMongo secret key
- ✅ Use LIVE key for production (`sk_live_...`)
- ✅ Check key hasn't expired

### Problem: Webhook not receiving events

**Check 1: Verify webhook is enabled**
```powershell
node paymongo_webhook_manager.js list
```
Status should be "enabled"

**Check 2: Check Railway logs**
- Go to Railway Dashboard > Backend Service > Logs
- Look for webhook-related messages
- Check for errors

**Check 3: Verify webhook secret**
- Ensure `PAYMONGO_WEBHOOK_SECRET` is set in Railway
- Secret should start with `whsk_`
- No extra spaces or quotes

**Check 4: Test webhook endpoint**
```powershell
curl -X POST https://your-railway-app.up.railway.app/api/webhooks/paymongo \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Problem: Payment status not updating

**Check 1: Verify webhook events**
- Go to PayMongo Dashboard > Webhooks
- Click on your webhook
- Check "Recent Deliveries"
- Look for failed deliveries

**Check 2: Check database**
```sql
-- Check payment_webhooks table
SELECT * FROM payment_webhooks 
ORDER BY created_at DESC 
LIMIT 10;

-- Check document_requests payment status
SELECT id, request_number, payment_status, payment_method 
FROM document_requests 
WHERE payment_method = 'online' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Check 3: Verify CORS settings**
- Ensure `FRONTEND_URL` is set correctly in Railway
- Check Railway logs for CORS errors

---

## 🔄 Managing Webhooks

### List All Webhooks
```powershell
node paymongo_webhook_manager.js list
```

### Retrieve Specific Webhook
```powershell
node paymongo_webhook_manager.js retrieve hook_xxxxxxxxxxxxx
```

### Delete Webhook
```powershell
node paymongo_webhook_manager.js delete hook_xxxxxxxxxxxxx
```

### Update Webhook URL

If you need to change the webhook URL:

1. **Delete old webhook:**
   ```powershell
   node paymongo_webhook_manager.js delete hook_xxxxxxxxxxxxx
   ```

2. **Update script with new URL**

3. **Create new webhook:**
   ```powershell
   node paymongo_webhook_manager.js create
   ```

4. **Update Railway environment variables** with new secret

---

## 📊 Monitoring Webhooks

### In PayMongo Dashboard

1. Go to **Developers** > **Webhooks**
2. Click on your webhook
3. View **Recent Deliveries**
4. Check for:
   - ✅ Successful deliveries (200 status)
   - ❌ Failed deliveries (4xx, 5xx status)

### In Railway Logs

1. Go to Railway Dashboard
2. Click on Backend Service
3. View real-time logs
4. Look for webhook-related messages:
   ```
   🔗 Received PayMongo webhook
   ✅ Webhook processed successfully
   ```

---

## 🚨 Important Production Notes

### 1. Use LIVE Keys
- **Test keys** (`pk_test_...`, `sk_test_...`) - For development only
- **Live keys** (`pk_live_...`, `sk_live_...`) - For production
- Never mix test and live keys!

### 2. Webhook Security
- Webhook secret is used to verify authenticity
- Never share webhook secret publicly
- Rotate secrets periodically

### 3. Webhook Retries
- PayMongo retries failed webhooks automatically
- Up to 3 retries over 24 hours
- Always respond with 200 status

### 4. Testing
- Test thoroughly in development first
- Use PayMongo test mode before going live
- Monitor webhook deliveries closely after launch

---

## 📝 Webhook Event Types

Your system listens to these events:

### `payment.paid`
- Triggered when a payment is successful
- Updates payment status to "paid"
- Generates receipt

### `payment.failed`
- Triggered when a payment fails
- Updates payment status to "failed"
- Sends notification to user

### `link.payment.paid`
- Triggered when payment link is paid
- **Most important event** for your system
- Updates document request status
- Generates receipt
- Sends confirmation email

---

## ✅ Checklist

Before going live, ensure:

- [ ] Webhook created with production Railway URL
- [ ] Webhook secret saved in Railway environment variables
- [ ] Using LIVE PayMongo keys (not test keys)
- [ ] Webhook endpoint is accessible
- [ ] Test payment completed successfully
- [ ] Payment status updates automatically
- [ ] Receipt generated correctly
- [ ] Email notifications sent
- [ ] Webhook deliveries monitored in PayMongo dashboard

---

## 🆘 Need Help?

If you encounter issues:

1. **Check Railway logs** for error messages
2. **Check PayMongo webhook deliveries** for failed attempts
3. **Test webhook endpoint** manually
4. **Verify environment variables** are set correctly
5. **Review this guide** step by step

**Common Issues:**
- Wrong webhook URL (using localhost instead of Railway URL)
- Missing webhook secret in environment variables
- Using test keys instead of live keys
- CORS configuration issues
- Database connection problems

---

## 🎉 Success!

Once configured correctly, your webhook will:
- ✅ Automatically update payment status
- ✅ Generate receipts instantly
- ✅ Send confirmation emails
- ✅ Update document request status
- ✅ Provide seamless payment experience

Your PayMongo integration is now production-ready! 🚀

