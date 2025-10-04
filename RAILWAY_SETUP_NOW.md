# 🚨 RAILWAY BACKEND IS CRASHING - FIX NOW

## ✅ **CODE FIX DEPLOYED**

The code has been fixed and pushed to GitHub. Railway will automatically redeploy.

## ⚠️ **ISSUE: MISSING ENVIRONMENT VARIABLES**

Your Railway backend is crashing because the environment variables are not set in Railway.

**Error**: `PAYMONGO_SECRET_KEY not found in environment variables`

---

## 🔧 **FIX: ADD ENVIRONMENT VARIABLES TO RAILWAY**

### **Step 1: Go to Railway Dashboard**
1. Open: https://railway.app/dashboard
2. Click on your backend service: `brgy_bula_backend`
3. Click on the **"Variables"** tab

### **Step 2: Click "Raw Editor"**
- Look for the **"Raw Editor"** button (top right of Variables section)
- Click it

### **Step 3: Copy and Paste These Variables**

**IMPORTANT**: Copy this ENTIRE block and paste it into Railway Raw Editor:

```
NODE_ENV=production
PORT=7000
DB_HOST=caboose.proxy.rlwy.net
DB_USER=root
DB_PASSWORD=ZJkBtQfhQyuHoYnezodhXGCUQZBnYcrN
DB_NAME=railway
DB_PORT=10954
JWT_SECRET=14136f32cc242a536936c8dcd11785f997da218f2117b7c63fd0e405b1e0569fe4cb3d5be0cfcb6ea12e89561c6d72b10d7e059c796b20ac3c47f15f877f41d0
JWT_EXPIRE=30d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=barangaybula45@gmail.com
EMAIL_PASS=nqagxakkhjxpisgl
EMAIL_FROM_NAME=Barangay Bula Management System
EMAIL_FROM_ADDRESS=barangaybula45@gmail.com
PAYMONGO_PUBLIC_KEY=pk_test_VhW6ygvK4x3JCnRmfsPBFxyh
PAYMONGO_SECRET_KEY=sk_test_wi8qaYjt74YtvpUEeFKpZsg1
PAYMONGO_BASE_URL=https://api.paymongo.com/v1
ENABLE_ONLINE_PAYMENTS=true
PAYMENT_TIMEOUT_MINUTES=30
FRONTEND_URL=https://barangay-bula-docu-hub.vercel.app
WEBHOOK_URL=https://brgybulabackend-production.up.railway.app/api/webhooks/paymongo
PAYMONGO_WEBHOOK_SECRET=whsk_bcUrWCxnFdULeBuDW6zfGe6Z
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
```

### **Step 4: Save**
- Click **"Save"** or **"Update Variables"**
- Railway will automatically redeploy (takes 2-3 minutes)

---

## ✅ **WHAT WAS FIXED IN THE CODE**

1. **PayMongo Service** - Now gracefully handles missing environment variables
2. **Payment Fetch Service** - Won't crash if PayMongo keys are missing
3. **Better Error Messages** - Shows warnings instead of crashing

---

## 🎯 **AFTER ADDING VARIABLES**

### **Wait for Deployment** (2-3 minutes)
- Railway will automatically redeploy
- Watch the deployment logs

### **Expected Success Logs**:
```
✅ All upload directories are ready!
ℹ️  SMS Service initialized
ℹ️  Email transporter initialized successfully
✅ Database connected successfully
🚀 Server running on port 7000
```

### **Test Backend**:
```bash
curl https://brgybulabackend-production.up.railway.app/health
```

Expected response:
```json
{"status":"OK","database":"connected"}
```

---

## 📋 **IMPORTANT NOTES**

### **Database Host**
- Changed from `mysql.railway.internal` to `caboose.proxy.rlwy.net`
- Added port `10954` (from your MYSQL_PUBLIC_URL)
- This allows external connections

### **Frontend URL**
- Set to your Vercel domain: `https://barangay-bula-docu-hub.vercel.app`
- CORS will allow requests from your frontend

### **PayMongo Webhook**
- Webhook created: ✅
- Webhook secret: `whsk_bcUrWCxnFdULeBuDW6zfGe6Z`
- Webhook URL: `https://brgybulabackend-production.up.railway.app/api/webhooks/paymongo`

---

## 🚨 **DO THIS NOW**

1. ✅ Go to Railway Dashboard
2. ✅ Click "Variables" tab
3. ✅ Click "Raw Editor"
4. ✅ Copy the environment variables block above
5. ✅ Paste into Raw Editor
6. ✅ Click "Save"
7. ⏳ Wait 2-3 minutes for deployment
8. ✅ Test: `curl https://brgybulabackend-production.up.railway.app/health`

---

## 🎉 **AFTER THIS WORKS**

Next steps:
1. ✅ Import database to Railway MySQL
2. ✅ Test complete system
3. ✅ Go live!

---

## 📞 **NEED HELP?**

If you still see errors after adding variables:
1. Check Railway deployment logs
2. Verify all variables are set correctly
3. Make sure there are no typos
4. Restart the service manually if needed

**Your backend will work once you add these environment variables!** 🚀

