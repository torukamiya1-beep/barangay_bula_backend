# 🚨 RAILWAY BACKEND CRASH TROUBLESHOOTING GUIDE

## 📋 **CURRENT PROBLEM**

Your Railway backend is crashing with these errors:
```
⚠️  PAYMONGO_SECRET_KEY not found in environment variables
Database connection failed: 
❌ Failed to start server:
```

---

## 🎯 **ROOT CAUSES IDENTIFIED**

### **1. Wrong Database Host**
- ❌ **Current:** `mysql.railway.internal`
- ✅ **Correct:** `caboose.proxy.rlwy.net`

### **2. Wrong Database Port**
- ❌ **Current:** `3306`
- ✅ **Correct:** `10954`

### **3. Missing PayMongo Secret Key**
- ❌ **Current:** `sk_test_YOUR_TEST_KEY_UPDATE_TO_LIVE_LATER` (placeholder)
- ✅ **Correct:** `sk_test_xxxxxxxxxxxxxxxxxxxxx` (get from Railway MySQL env vars)

### **4. Wrong Frontend URL**
- ❌ **Current:** `http://localhost:8081`
- ✅ **Correct:** `https://barangay-bula-docu-hub.vercel.app`

---

## 🔧 **COMPLETE FIX - STEP BY STEP**

### **STEP 1: Update Railway Environment Variables**

#### **1.1 Navigate to Railway Dashboard**
1. Open: https://railway.app/dashboard
2. Click on your project: `brgy_bula_backend`
3. Click on the **backend service** (the one showing "Crashed" status)

#### **1.2 Access Variables Editor**
1. Click **"Variables"** tab (top navigation bar)
2. Click **"Raw Editor"** button (top right corner)

#### **1.3 Replace ALL Variables**
1. **Select all existing text** (Ctrl+A)
2. **Delete** (Delete key)
3. **Paste the corrected configuration below:**

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

4. **Click "Update Variables"** button (bottom right)

#### **1.4 Wait for Automatic Redeploy**
- Railway will automatically trigger a new deployment
- You'll see "Deploying..." status in the top right
- Wait 2-3 minutes for deployment to complete

---

### **STEP 2: Verify MySQL Database Credentials**

While waiting for deployment, verify your MySQL database is running:

#### **2.1 Check MySQL Service**
1. In Railway Dashboard, click on your **MySQL service** (separate card from backend)
2. Check the status indicator:
   - ✅ **Green dot** = Running
   - ❌ **Red dot** = Crashed (need to restart)

#### **2.2 Verify MySQL Variables**
1. Click on MySQL service
2. Click "Variables" tab
3. Verify these values match:
   - `MYSQLHOST` = `caboose.proxy.rlwy.net`
   - `MYSQLPORT` = `10954`
   - `MYSQLUSER` = `root`
   - `MYSQLPASSWORD` = `ZJkBtQfhQyuHoYnezodhXGCUQZBnYcrN`
   - `MYSQLDATABASE` = `railway`

#### **2.3 If MySQL Credentials Are Different**
If any of the above values are different:
1. Copy the ACTUAL values from Railway MySQL service
2. Go back to backend service → Variables → Raw Editor
3. Update `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` accordingly
4. Click "Update Variables"

---

### **STEP 3: Monitor Deployment Logs**

#### **3.1 Access Deployment Logs**
1. Click on your backend service
2. Click **"Deployments"** tab (top navigation)
3. Click on the **latest deployment** (top of the list)
4. Click **"View Logs"** button

#### **3.2 Watch for SUCCESS Messages**
You should see these logs in order:
```
✅ All upload directories are ready!
ℹ️  SMS Service initialized
ℹ️  Email transporter initialized successfully
✅ PayMongo service initialized successfully
✅ Database connected successfully
🎉 Database setup completed successfully
🚀 Server is running on port 7000
📊 Environment: production
🔗 Health check: http://localhost:7000/health
```

#### **3.3 If You See ERROR Messages**

**Error: "Database connection failed"**
- ❌ **Cause:** Wrong database credentials
- ✅ **Fix:** Go back to STEP 2 and verify MySQL credentials

**Error: "PAYMONGO_SECRET_KEY not found"**
- ❌ **Cause:** Environment variable not set
- ✅ **Fix:** Go back to STEP 1 and verify you pasted ALL variables

**Error: "ECONNREFUSED" or "ETIMEDOUT"**
- ❌ **Cause:** Database host/port incorrect
- ✅ **Fix:** Verify `DB_HOST` and `DB_PORT` match MySQL service

**Error: "Access denied for user"**
- ❌ **Cause:** Wrong database password
- ✅ **Fix:** Verify `DB_PASSWORD` matches MySQL service

---

### **STEP 4: Test Backend Health**

After deployment shows **"Active"** status (green checkmark):

#### **4.1 Test Health Endpoint**
Open in browser:
```
https://brgybulabackend-production.up.railway.app/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "database": "connected",
  "timestamp": "2025-09-30T..."
}
```

#### **4.2 Test API Endpoint**
Open in browser:
```
https://brgybulabackend-production.up.railway.app/api/auth/unified/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "message": "Unified auth service is running"
}
```

---

### **STEP 5: Update Vercel Environment Variable**

After backend is running successfully:

#### **5.1 Navigate to Vercel Dashboard**
1. Open: https://vercel.com/dashboard
2. Click on your project: `barangay-bula-docu-hub`
3. Click **"Settings"** (top navigation)
4. Click **"Environment Variables"** (left sidebar)

#### **5.2 Add/Update Environment Variable**
1. Look for existing `VUE_APP_API_URL` variable
   - If exists: Click "..." → "Edit"
   - If not exists: Click "Add New"

2. Set these values:
   - **Name:** `VUE_APP_API_URL`
   - **Value:** `https://brgybulabackend-production.up.railway.app/api`
   - **Environment:** Check ☑ **Production**

3. Click **"Save"**

#### **5.3 Redeploy Frontend**
1. Click **"Deployments"** (top navigation)
2. Click "..." on the latest deployment
3. Click **"Redeploy"**
4. Wait 2-3 minutes for deployment to complete

---

### **STEP 6: Test Login Functionality**

After both backend and frontend are deployed:

#### **6.1 Open Frontend**
```
https://barangay-bula-docu-hub.vercel.app
```

#### **6.2 Open Browser Console**
1. Press **F12** (open DevTools)
2. Click **"Console"** tab
3. Type: `console.log(process.env.VUE_APP_API_URL)`
4. Press Enter
5. Should show: `https://brgybulabackend-production.up.railway.app/api`

#### **6.3 Test Login**
1. Go to login page
2. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
3. Click "Login"

#### **6.4 Check Network Tab**
1. In DevTools, click **"Network"** tab
2. Look for the login request
3. Verify the URL is:
   - ✅ `https://brgybulabackend-production.up.railway.app/api/auth/unified/login`
   - ❌ NOT `https://barangay-bula-docu-hub.vercel.app/brgybulabackend...`

4. Check the response:
   - ✅ **Status 200** = Success
   - ❌ **Status 405** = Wrong URL (Vercel env var not set)
   - ❌ **Status 500** = Backend error (check Railway logs)

---

## 🔍 **ADDITIONAL TROUBLESHOOTING**

### **If Backend Still Crashes After Updating Variables**

#### **Check 1: Verify Variables Were Saved**
1. Railway Dashboard → Backend Service → Variables
2. Click "Raw Editor"
3. Verify ALL 30 lines are present
4. Verify NO placeholder values like "YOUR_TEST_KEY"

#### **Check 2: Check MySQL Service Status**
1. Railway Dashboard → MySQL Service
2. If status is "Crashed":
   - Click "..." → "Restart"
   - Wait 1 minute
   - Go back to backend service
   - Click "..." → "Restart"

#### **Check 3: Check Database Tables Exist**
The backend requires these tables to exist:
- `admin_accounts`
- `client_accounts`
- `document_requests`
- `notifications`
- `payments`
- `receipts`

If tables don't exist, you need to import the database schema:
1. Download: `rhai_backend/database_export_railway.sql`
2. Railway Dashboard → MySQL Service → "Data" tab
3. Click "Import" → Upload SQL file

#### **Check 4: Enable Better Error Logging**
To see the FULL database error (not just "Database connection failed:"):

1. Edit `rhai_backend/src/config/database.js` line 29:
   ```javascript
   // Change from:
   console.error('Database connection failed:', error.message);
   
   // To:
   console.error('Database connection failed:', error);
   ```

2. Commit and push to GitHub
3. Railway will auto-redeploy
4. Check logs for full error details

---

## 📊 **VERIFICATION CHECKLIST**

Use this checklist to verify everything is working:

### **Railway Backend**
- [ ] Environment variables are set (30 variables)
- [ ] MySQL service is running (green status)
- [ ] Backend service is running (green status)
- [ ] Deployment logs show "Server is running on port 7000"
- [ ] Health endpoint returns 200 OK
- [ ] No errors in deployment logs

### **Vercel Frontend**
- [ ] Environment variable `VUE_APP_API_URL` is set
- [ ] Frontend is deployed successfully
- [ ] Console shows correct API URL
- [ ] Login request goes to Railway backend URL
- [ ] No 405 errors in Network tab

### **Integration**
- [ ] Login works successfully
- [ ] User is redirected to dashboard
- [ ] No CORS errors in console
- [ ] API requests show 200 status codes

---

## 🆘 **STILL HAVING ISSUES?**

If you've followed all steps and still have issues:

1. **Copy the FULL error message** from Railway deployment logs
2. **Take a screenshot** of Railway Variables (Raw Editor)
3. **Take a screenshot** of Vercel Environment Variables
4. **Share the browser console errors** (F12 → Console tab)
5. **Share the Network tab** showing the failed request

This will help diagnose the exact issue!

---

## 📝 **SUMMARY OF CHANGES**

| Variable | Old Value | New Value |
|----------|-----------|-----------|
| `DB_HOST` | `mysql.railway.internal` | `caboose.proxy.rlwy.net` |
| `DB_PORT` | `3306` | `10954` |
| `PAYMONGO_SECRET_KEY` | `sk_test_YOUR_TEST_KEY...` | `sk_test_xxxxxxxxxxxxxxxxxxxxx` |
| `FRONTEND_URL` | `http://localhost:8081` | `https://barangay-bula-docu-hub.vercel.app` |
| `PAYMONGO_WEBHOOK_SECRET` | `whsk_will_update_later` | `whsk_bcUrWCxnFdULeBuDW6zfGe6Z` |

---

**Last Updated:** 2025-09-30
**Status:** Ready for deployment

