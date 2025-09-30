# 🚂 RAILWAY - STEP BY STEP GUIDE

## 🎯 **YOUR MISSION: ADD ENVIRONMENT VARIABLES**

This is the ONLY thing stopping your backend from working!

---

## 📋 **STEP-BY-STEP INSTRUCTIONS**

### **STEP 1: Open Railway Dashboard**

1. Open your browser
2. Go to: **https://railway.app/dashboard**
3. You should see your projects

---

### **STEP 2: Select Your Backend Service**

1. Look for your project (it might be called "brgybulabackend-production" or similar)
2. **Click on the backend service** (NOT the database)
3. You should see the service dashboard

---

### **STEP 3: Navigate to Variables**

1. Look at the **top navigation tabs**
2. You'll see: Overview | Deployments | **Variables** | Metrics | Settings
3. **Click on "Variables"**

---

### **STEP 4: Open Raw Editor**

1. On the Variables page, look for a button that says **"Raw Editor"**
2. It's usually in the **top right corner**
3. **Click "Raw Editor"**

---

### **STEP 5: Clear Existing Content (if any)**

1. If there's any existing text in the editor, **select all** (Ctrl+A)
2. **Delete it**
3. Make sure the editor is **completely empty**

---

### **STEP 6: Copy the Environment Variables**

**COPY THIS ENTIRE BLOCK** (all 30 lines):

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

**HOW TO COPY**:
1. Click at the start of `NODE_ENV`
2. Hold Shift and click at the end of `OTP_LENGTH=6`
3. Press Ctrl+C to copy

---

### **STEP 7: Paste into Raw Editor**

1. Click inside the Raw Editor
2. Press **Ctrl+V** to paste
3. Make sure all 30 lines are there
4. Check that there are **no extra spaces or blank lines**

---

### **STEP 8: Save the Variables**

1. Look for a button that says **"Save"** or **"Update Variables"**
2. It's usually at the **bottom** or **top right**
3. **Click "Save"**

---

### **STEP 9: Wait for Deployment**

1. Railway will automatically start redeploying your backend
2. You'll see a notification or the page will refresh
3. **Wait 2-3 minutes** for the deployment to complete

---

### **STEP 10: Check the Logs**

1. Click on the **"Deployments"** tab (top navigation)
2. Click on the **latest deployment** (should be at the top)
3. You'll see the deployment logs

**WHAT TO LOOK FOR**:

✅ **SUCCESS** - You should see:
```
✅ All upload directories are ready!
ℹ️  SMS Service initialized
ℹ️  Email transporter initialized successfully
✅ Database connected successfully
🚀 Server running on port 7000
```

❌ **FAILURE** - If you see:
```
Database connection failed
❌ Failed to start server
```
Then the environment variables weren't saved correctly. Go back to Step 5 and try again.

---

## 🎯 **VERIFICATION**

### **Test 1: Health Check**

Open PowerShell and run:
```powershell
curl https://brgybulabackend-production.up.railway.app/health
```

**Expected Response**:
```json
{
  "status": "OK",
  "database": "connected"
}
```

### **Test 2: Check Railway Dashboard**

1. Go back to Railway dashboard
2. Your backend service should show **"Running"** status (green)
3. No error messages

---

## 🔧 **TROUBLESHOOTING**

### **Problem: Can't find "Raw Editor" button**

**Solution**:
1. Make sure you're on the **Variables** tab
2. Look for a toggle or switch that says "Raw Editor" or "Bulk Edit"
3. Try clicking on "Add Variable" first, then look for "Raw Editor"

### **Problem: Variables not saving**

**Solution**:
1. Make sure you clicked "Save" or "Update Variables"
2. Check if there's a confirmation message
3. Refresh the page and check if variables are there

### **Problem: Backend still crashing after adding variables**

**Solution**:
1. Check the deployment logs for specific errors
2. Verify all 30 variables are present
3. Check for typos in variable names (they're case-sensitive!)
4. Make sure there are no extra spaces before or after the `=` sign

### **Problem: "Database connection failed"**

**Solution**:
1. Check these specific variables:
   - `DB_HOST=caboose.proxy.rlwy.net`
   - `DB_PORT=10954`
   - `DB_NAME=railway`
   - `DB_USER=root`
   - `DB_PASSWORD=ZJkBtQfhQyuHoYnezodhXGCUQZBnYcrN`
2. Make sure there are no typos
3. Make sure the password is exactly as shown (case-sensitive!)

---

## 📊 **WHAT EACH VARIABLE DOES**

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | Tells Node.js this is production |
| `PORT` | Port number for the server |
| `DB_HOST` | Railway MySQL server address |
| `DB_PORT` | Railway MySQL port |
| `DB_NAME` | Database name (railway) |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Secret key for authentication tokens |
| `JWT_EXPIRE` | How long tokens last |
| `EMAIL_*` | Gmail SMTP settings for sending emails |
| `PAYMONGO_*` | PayMongo payment gateway settings |
| `FRONTEND_URL` | Your Vercel frontend URL |
| `WEBHOOK_URL` | PayMongo webhook endpoint |
| `BCRYPT_ROUNDS` | Password hashing strength |
| `RATE_LIMIT_*` | API rate limiting settings |
| `LOG_LEVEL` | Logging verbosity |
| `OTP_*` | One-time password settings |

---

## 🎉 **AFTER SUCCESS**

Once you see the success logs:

1. ✅ Your backend is running
2. ✅ Database is connected
3. ✅ PayMongo is configured
4. ✅ Email service is ready
5. ✅ Your system is LIVE!

**Next**: Test your frontend at https://barangay-bula-docu-hub.vercel.app

---

## 📞 **NEED HELP?**

If you're stuck:

1. Take a screenshot of the Railway Variables page
2. Take a screenshot of the deployment logs
3. Check the error messages carefully
4. Make sure you copied ALL 30 lines

**Remember**: The environment variables are the ONLY thing missing. Everything else is ready!

---

## 🚀 **YOU CAN DO THIS!**

It's just:
1. Open Railway
2. Click Variables
3. Click Raw Editor
4. Paste the variables
5. Click Save
6. Wait 2-3 minutes

**That's it! Your system will be live!** 🎊

