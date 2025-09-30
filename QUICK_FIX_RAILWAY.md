# ⚡ QUICK FIX - Railway Backend Crash

## 🚨 **THE PROBLEM**
Your Railway backend is crashing because of **WRONG DATABASE CREDENTIALS**.

---

## ✅ **THE FIX (5 MINUTES)**

### **1. Go to Railway Dashboard**
https://railway.app/dashboard → Click your backend service

### **2. Click "Variables" → "Raw Editor"**

### **3. Delete ALL and paste this:**

```env
NODE_ENV=production
PORT=7000
DB_HOST=caboose.proxy.rlwy.net
DB_USER=root
DB_PASSWORD=ZJkBtQfhQyuHoYnezodhXGCUQZBnYcrN
DB_NAME=railway
DB_PORT=10954
JWT_SECRET=330c18150401b9b496b0abfdb687f10811b33b5556ce6514f00bbdb63704f8e59f7cb07aa977eda16eb9deb0de8d639d75aa08f702710835f882c6cfbf60490e
JWT_EXPIRE=30d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=barangaybula45@gmail.com
EMAIL_PASS=nqagxakkhjxpisgl
EMAIL_FROM_NAME=Barangay Bula Management System
EMAIL_FROM_ADDRESS=barangaybula45@gmail.com
PAYMONGO_PUBLIC_KEY=pk_test_VhW6ygvK4x3JCnRmfsPBFxyh
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
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

### **4. Click "Update Variables"**

### **5. Wait 2-3 minutes for redeploy**

### **6. Check logs should show:**
```
✅ Database connected successfully
🚀 Server is running on port 7000
```

---

## 🔍 **WHAT WAS WRONG?**

| Variable | ❌ Old (Wrong) | ✅ New (Correct) |
|----------|---------------|------------------|
| `DB_HOST` | `mysql.railway.internal` | `caboose.proxy.rlwy.net` |
| `DB_PORT` | `3306` | `10954` |
| `PAYMONGO_SECRET_KEY` | `sk_test_YOUR_TEST_KEY...` | `sk_test_xxxxxxxxxxxxxxxxxxxxx` |
| `FRONTEND_URL` | `http://localhost:8081` | `https://barangay-bula-docu-hub.vercel.app` |

---

## 🧪 **TEST IT WORKS**

Open in browser:
```
https://brgybulabackend-production.up.railway.app/health
```

Should return:
```json
{"status":"OK","database":"connected"}
```

---

## 📱 **NEXT: Fix Vercel Frontend**

After Railway backend is running:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add/Update:
   - **Name:** `VUE_APP_API_URL`
   - **Value:** `https://brgybulabackend-production.up.railway.app/api`
   - **Environment:** ☑ Production
3. Click "Save"
4. Go to Deployments → Click "..." → "Redeploy"
5. Wait 2-3 minutes
6. Test login at: https://barangay-bula-docu-hub.vercel.app

---

## 🆘 **STILL NOT WORKING?**

See detailed guide: `RAILWAY_TROUBLESHOOTING_GUIDE.md`

