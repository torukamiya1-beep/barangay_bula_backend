# 🏗️ Deployment Architecture & Issue Analysis

## 📊 **CURRENT ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│                  https://barangay-bula-docu-hub                 │
│                        .vercel.app                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ API Requests
                             │ (Should go to Railway)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL (Frontend)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Vue.js Application (BOSFDR)                              │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Environment Variable:                              │  │  │
│  │  │  VUE_APP_API_URL = ???                              │  │  │
│  │  │                                                      │  │  │
│  │  │  ❌ PROBLEM: Not set in Vercel dashboard           │  │  │
│  │  │  ✅ SOLUTION: Set to Railway backend URL           │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  src/services/unifiedAuthService.js                        │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  const API_BASE_URL =                               │  │  │
│  │  │    process.env.VUE_APP_API_URL ||                   │  │  │
│  │  │    'http://localhost:7000/api'                      │  │  │
│  │  │                                                      │  │  │
│  │  │  baseURL: `${API_BASE_URL}/auth/unified`           │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ POST /api/auth/unified/login
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RAILWAY (Backend)                           │
│  https://brgybulabackend-production.up.railway.app              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Node.js Express Server (rhai_backend)                    │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Environment Variables:                             │  │  │
│  │  │  ❌ DB_HOST = mysql.railway.internal (WRONG!)      │  │  │
│  │  │  ❌ DB_PORT = 3306 (WRONG!)                        │  │  │
│  │  │  ❌ PAYMONGO_SECRET_KEY = placeholder (WRONG!)     │  │  │
│  │  │                                                      │  │  │
│  │  │  ✅ DB_HOST = caboose.proxy.rlwy.net (CORRECT)    │  │  │
│  │  │  ✅ DB_PORT = 10954 (CORRECT)                      │  │  │
│  │  │  ✅ PAYMONGO_SECRET_KEY = sk_test_... (CORRECT)   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  server.js → connectDatabase()                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  ❌ CURRENT STATE: Crashes on startup              │  │  │
│  │  │     Error: Database connection failed               │  │  │
│  │  │     Reason: Wrong DB_HOST and DB_PORT              │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ MySQL Connection
                             │ (Trying wrong host/port)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RAILWAY MYSQL DATABASE                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Actual Connection Details:                               │  │
│  │  ✅ Host: caboose.proxy.rlwy.net                         │  │
│  │  ✅ Port: 10954                                           │  │
│  │  ✅ User: root                                            │  │
│  │  ✅ Password: ZJkBtQfhQyuHoYnezodhXGCUQZBnYcrN           │  │
│  │  ✅ Database: railway                                     │  │
│  │                                                            │  │
│  │  ❌ Backend is trying to connect to:                     │  │
│  │     mysql.railway.internal:3306 (DOESN'T EXIST!)         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔴 **ERROR FLOW (Current State)**

### **1. User tries to login on Vercel frontend**
```
User clicks "Login" button
  ↓
Frontend calls: unifiedAuthService.login()
  ↓
Axios makes POST request to: ${API_BASE_URL}/auth/unified/login
  ↓
API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:7000/api'
  ↓
❌ VUE_APP_API_URL is NOT SET in Vercel
  ↓
Falls back to: 'http://localhost:7000/api'
  ↓
But localhost doesn't exist in browser context!
  ↓
Browser tries relative URL: /brgybulabackend-production.up.railway.app/...
  ↓
Results in malformed URL:
https://barangay-bula-docu-hub.vercel.app/brgybulabackend-production.up.railway.app/auth/unified/login
  ↓
❌ 405 Method Not Allowed (Vercel doesn't have this route)
```

### **2. Railway backend crashes on startup**
```
Railway starts backend service
  ↓
Runs: npm start → node server.js
  ↓
server.js loads environment variables with dotenv.config()
  ↓
Calls: connectDatabase()
  ↓
Creates MySQL connection pool with:
  - host: process.env.DB_HOST = 'mysql.railway.internal' ❌
  - port: process.env.DB_PORT = 3306 ❌
  ↓
Tries to connect to: mysql.railway.internal:3306
  ↓
❌ This host doesn't exist! (Should be caboose.proxy.rlwy.net:10954)
  ↓
Connection fails with: ENOTFOUND or ECONNREFUSED
  ↓
Error caught in connectDatabase():
  console.error('Database connection failed:', error.message)
  ↓
Throws error
  ↓
server.js catches error in startServer():
  console.error('❌ Failed to start server:', error.message)
  ↓
process.exit(1) → Backend crashes
  ↓
Railway shows: "Crashed" status
```

---

## ✅ **CORRECT FLOW (After Fix)**

### **1. User login flow (after fixing Vercel env var)**
```
User clicks "Login" button
  ↓
Frontend calls: unifiedAuthService.login()
  ↓
Axios makes POST request to: ${API_BASE_URL}/auth/unified/login
  ↓
API_BASE_URL = process.env.VUE_APP_API_URL
  ↓
✅ VUE_APP_API_URL = 'https://brgybulabackend-production.up.railway.app/api'
  ↓
Full URL: https://brgybulabackend-production.up.railway.app/api/auth/unified/login
  ↓
✅ Request goes to Railway backend
  ↓
Backend processes login
  ↓
✅ Returns JWT token
  ↓
Frontend stores token and redirects to dashboard
```

### **2. Railway backend startup (after fixing env vars)**
```
Railway starts backend service
  ↓
Runs: npm start → node server.js
  ↓
server.js loads environment variables
  ↓
Calls: connectDatabase()
  ↓
Creates MySQL connection pool with:
  - host: process.env.DB_HOST = 'caboose.proxy.rlwy.net' ✅
  - port: process.env.DB_PORT = 10954 ✅
  ↓
Tries to connect to: caboose.proxy.rlwy.net:10954
  ↓
✅ Connection successful!
  ↓
console.log('✅ Database connected successfully')
  ↓
Calls: DatabaseUtils.setupDatabase()
  ↓
✅ Initializes tables and default data
  ↓
app.listen(PORT)
  ↓
console.log('🚀 Server is running on port 7000')
  ↓
Railway shows: "Active" status ✅
```

---

## 🔧 **FIXES REQUIRED**

### **Fix 1: Railway Backend Environment Variables**

**Location:** Railway Dashboard → Backend Service → Variables → Raw Editor

**What to change:**
```diff
- DB_HOST=mysql.railway.internal
+ DB_HOST=caboose.proxy.rlwy.net

- DB_PORT=3306
+ DB_PORT=10954

- PAYMONGO_SECRET_KEY=sk_test_YOUR_TEST_KEY_UPDATE_TO_LIVE_LATER
+ PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx

- FRONTEND_URL=http://localhost:8081
+ FRONTEND_URL=https://barangay-bula-docu-hub.vercel.app

- PAYMONGO_WEBHOOK_SECRET=whsk_will_update_later
+ PAYMONGO_WEBHOOK_SECRET=whsk_bcUrWCxnFdULeBuDW6zfGe6Z
```

**Impact:**
- ✅ Backend will connect to correct MySQL database
- ✅ Backend will start successfully
- ✅ PayMongo payments will work
- ✅ CORS will allow Vercel frontend

---

### **Fix 2: Vercel Frontend Environment Variable**

**Location:** Vercel Dashboard → Project → Settings → Environment Variables

**What to add:**
```
Name: VUE_APP_API_URL
Value: https://brgybulabackend-production.up.railway.app/api
Environment: ☑ Production
```

**Impact:**
- ✅ Frontend will make API requests to Railway backend
- ✅ Login will work correctly
- ✅ No more 405 errors
- ✅ No more malformed URLs

---

## 📋 **VERIFICATION STEPS**

### **After Railway Fix:**
1. ✅ Railway backend shows "Active" status (green)
2. ✅ Deployment logs show: "🚀 Server is running on port 7000"
3. ✅ Health endpoint works: https://brgybulabackend-production.up.railway.app/health
4. ✅ Returns: `{"status":"OK","database":"connected"}`

### **After Vercel Fix:**
1. ✅ Vercel frontend shows "Ready" status
2. ✅ Browser console shows: `VUE_APP_API_URL = https://brgybulabackend-production.up.railway.app/api`
3. ✅ Network tab shows login request to Railway URL
4. ✅ Login returns 200 status code
5. ✅ User is redirected to dashboard

---

## 🎯 **ROOT CAUSE SUMMARY**

| Issue | Root Cause | Impact | Fix |
|-------|------------|--------|-----|
| Backend Crash | Wrong `DB_HOST` and `DB_PORT` | Backend can't connect to MySQL | Update Railway env vars |
| PayMongo Error | Placeholder `PAYMONGO_SECRET_KEY` | Payment service fails to initialize | Update Railway env vars |
| Frontend 405 Error | Missing `VUE_APP_API_URL` in Vercel | Frontend uses wrong/relative URL | Add Vercel env var |
| CORS Issues | Wrong `FRONTEND_URL` in backend | Backend blocks Vercel requests | Update Railway env vars |

---

## 📚 **RELATED FILES**

- **Quick Fix Guide:** `QUICK_FIX_RAILWAY.md`
- **Detailed Troubleshooting:** `RAILWAY_TROUBLESHOOTING_GUIDE.md`
- **Correct Environment Variables:** `RAILWAY_RAW_EDITOR_PASTE.txt` (updated)
- **Database Config:** `src/config/database.js` (improved error logging)

---

**Last Updated:** 2025-09-30
**Status:** Ready for deployment

