# 🚀 Complete Deployment Guide - Barangay Bula Document Management System

This comprehensive guide will walk you through deploying your barangay document management system to production using Railway (backend) and Vercel (frontend).

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Prepare Local Environment](#phase-1-prepare-local-environment)
3. [Phase 2: Deploy Backend to Railway](#phase-2-deploy-backend-to-railway)
4. [Phase 3: Setup Database on Railway](#phase-3-setup-database-on-railway)
5. [Phase 4: Deploy Frontend to Vercel](#phase-4-deploy-frontend-to-vercel)
6. [Phase 5: Configure PayMongo Webhook](#phase-5-configure-paymongo-webhook)
7. [Phase 6: Final Testing](#phase-6-final-testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- ✅ GitHub account (for code repositories)
- ✅ Railway account (https://railway.app - sign up with GitHub)
- ✅ Vercel account (https://vercel.com - sign up with GitHub)
- ✅ PayMongo account with API keys (https://dashboard.paymongo.com)
- ✅ Gmail account for SMTP (with App Password enabled)

### Required Tools
- ✅ Git installed on your computer
- ✅ Node.js v16+ installed
- ✅ MySQL Workbench or MySQL CLI
- ✅ Text editor (VS Code recommended)

### Required Information
- ✅ PayMongo API keys (test and live)
- ✅ Gmail SMTP credentials
- ✅ Local database backup

---

## Phase 1: Prepare Local Environment

### Step 1.1: Export Local Database

1. **Open MySQL Workbench**
2. **Connect to local database**
3. **Export database:**
   - Go to **Server** > **Data Export**
   - Select database: `barangay_management_system`
   - Export to: `D:\brgy_docu_hub\rhai_backend\database_export.sql`
   - Include: Stored Procedures, Functions, Events, Triggers
   - Click **Start Export**

### Step 1.2: Verify Code Changes

All necessary code changes have been made:
- ✅ Environment variables configured
- ✅ CORS settings updated for production
- ✅ Static file serving configured
- ✅ Deployment configuration files created

---

## Phase 2: Deploy Backend to Railway

### Step 2.1: Push Backend to GitHub

1. **Open PowerShell/Terminal**
2. **Navigate to backend directory:**
   ```powershell
   cd D:\brgy_docu_hub\rhai_backend
   ```

3. **Initialize Git repository:**
   ```powershell
   git init
   git add .
   git commit -m "Initial commit - Backend for production deployment"
   git branch -M main
   ```

4. **Push to GitHub:**
   ```powershell
   git remote add origin https://github.com/torukamiya1-beep/barangay_bula_backend.git
   git push -u origin main
   ```

### Step 2.2: Create Railway Project

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/dashboard
   - Click **"New Project"**

2. **Deploy from GitHub**
   - Select **"Deploy from GitHub repo"**
   - Authorize Railway to access your GitHub
   - Select repository: `torukamiya1-beep/barangay_bula_backend`
   - Click **"Deploy Now"**

3. **Wait for Initial Deployment**
   - Railway will automatically detect Node.js
   - Initial deployment will fail (expected - no database yet)
   - This is normal, we'll fix it in next steps

### Step 2.3: Add MySQL Database

1. **In Railway Project Dashboard**
   - Click **"New"** button
   - Select **"Database"**
   - Choose **"Add MySQL"**
   - Railway will provision MySQL database

2. **Note Database Credentials**
   - Click on MySQL service
   - Go to **"Variables"** tab
   - Copy these values:
     - `MYSQLHOST`
     - `MYSQLPORT`
     - `MYSQLUSER`
     - `MYSQLPASSWORD`
     - `MYSQLDATABASE`

### Step 2.4: Configure Backend Environment Variables

1. **Click on Backend Service** (not MySQL)
2. **Go to "Variables" tab**
3. **Click "Raw Editor"**
4. **Paste these variables** (update values in CAPS):

```env
NODE_ENV=production
PORT=7000

# Database Configuration
DB_HOST=YOUR_MYSQLHOST_FROM_RAILWAY
DB_USER=YOUR_MYSQLUSER_FROM_RAILWAY
DB_PASSWORD=YOUR_MYSQLPASSWORD_FROM_RAILWAY
DB_NAME=YOUR_MYSQLDATABASE_FROM_RAILWAY
DB_PORT=YOUR_MYSQLPORT_FROM_RAILWAY

# JWT Secret - Generate new one
JWT_SECRET=GENERATE_NEW_SECRET_USING_COMMAND_BELOW
JWT_EXPIRE=30d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=barangaybula45@gmail.com
EMAIL_PASS=nqagxakkhjxpisgl
EMAIL_FROM_NAME=Barangay Bula Management System
EMAIL_FROM_ADDRESS=barangaybula45@gmail.com

# PayMongo - Use LIVE keys for production
PAYMONGO_PUBLIC_KEY=pk_live_YOUR_LIVE_PUBLIC_KEY
PAYMONGO_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
PAYMONGO_BASE_URL=https://api.paymongo.com/v1
ENABLE_ONLINE_PAYMENTS=true
PAYMENT_TIMEOUT_MINUTES=30

# Frontend URL - Will update after Vercel deployment
FRONTEND_URL=http://localhost:8081

# Webhook - Will update after PayMongo webhook creation
WEBHOOK_URL=https://YOUR_RAILWAY_DOMAIN.up.railway.app/api/webhooks/paymongo
PAYMONGO_WEBHOOK_SECRET=whsk_will_update_later

# Other Settings
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
```

**To generate JWT_SECRET:**
```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

5. **Click "Save"**
6. **Railway will automatically redeploy**

### Step 2.5: Get Railway Backend URL

1. **In Backend Service**
2. **Go to "Settings" tab**
3. **Scroll to "Domains"**
4. **Click "Generate Domain"**
5. **Copy the generated URL** (e.g., `https://barangay-bula-backend-production.up.railway.app`)
6. **Save this URL** - you'll need it for:
   - Frontend configuration
   - PayMongo webhook
   - CORS settings

---

## Phase 3: Setup Database on Railway

Follow the detailed guide in `rhai_backend/RAILWAY_DATABASE_SETUP.md`

### Quick Steps:

1. **Connect to Railway MySQL** using MySQL Workbench
   - Host: [MYSQLHOST from Railway]
   - Port: [MYSQLPORT from Railway]
   - User: [MYSQLUSER from Railway]
   - Password: [MYSQLPASSWORD from Railway]

2. **Import Database**
   - Server > Data Import
   - Import from: `D:\brgy_docu_hub\rhai_backend\database_export.sql`
   - Start Import

3. **Verify Import**
   ```sql
   SHOW TABLES;
   SELECT COUNT(*) FROM client_accounts;
   SELECT COUNT(*) FROM admin_employee_accounts;
   ```

4. **Test Backend**
   - Visit: `https://your-railway-url.up.railway.app/health`
   - Should return: `{"status":"OK","database":"connected"}`

---

## Phase 4: Deploy Frontend to Vercel

### Step 4.1: Push Frontend to GitHub

1. **Open PowerShell/Terminal**
2. **Navigate to frontend directory:**
   ```powershell
   cd D:\brgy_docu_hub\BOSFDR
   ```

3. **Initialize Git repository:**
   ```powershell
   git init
   git add .
   git commit -m "Initial commit - Frontend for production deployment"
   git branch -M main
   ```

4. **Push to GitHub:**
   ```powershell
   git remote add origin https://github.com/torukamiya1-beep/barangay-bula-docu-hub.git
   git push -u origin main
   ```

### Step 4.2: Deploy to Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click **"Add New Project"**

2. **Import GitHub Repository**
   - Click **"Import"** next to `barangay-bula-docu-hub`
   - If not visible, click **"Adjust GitHub App Permissions"**

3. **Configure Project**
   - **Framework Preset**: Vue.js
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Add Environment Variables**
   - Click **"Environment Variables"**
   - Add these variables:

   ```
   VUE_APP_API_URL = https://YOUR_RAILWAY_URL.up.railway.app/api
   VUE_APP_APP_NAME = Barangay Bula Management System
   VUE_APP_VERSION = 1.0.0
   VUE_APP_ENV = production
   ```

   Replace `YOUR_RAILWAY_URL` with your actual Railway backend URL from Step 2.5

5. **Click "Deploy"**
   - Vercel will build and deploy your frontend
   - Wait for deployment to complete (2-5 minutes)

6. **Get Vercel Frontend URL**
   - After deployment, copy your Vercel URL
   - Example: `https://barangay-bula-docu-hub.vercel.app`

### Step 4.3: Update Backend CORS

1. **Go back to Railway Dashboard**
2. **Click on Backend Service**
3. **Go to "Variables" tab**
4. **Update FRONTEND_URL:**
   ```
   FRONTEND_URL=https://your-vercel-url.vercel.app
   ```
5. **Save** - Railway will redeploy automatically

---

## Phase 5: Configure PayMongo Webhook

### Step 5.1: Update Webhook URL in Railway

1. **In Railway Backend Variables**
2. **Update WEBHOOK_URL:**
   ```
   WEBHOOK_URL=https://your-railway-url.up.railway.app/api/webhooks/paymongo
   ```
3. **Save and wait for redeploy**

### Step 5.2: Create PayMongo Webhook

**Option A: Using the Script (Recommended)**

1. **Update `paymongo_webhook_manager.js`:**
   ```javascript
   const PAYMONGO_SECRET_KEY = 'sk_live_YOUR_LIVE_SECRET_KEY';
   const WEBHOOK_URL = 'https://your-railway-url.up.railway.app/api/webhooks/paymongo';
   ```

2. **Run the script:**
   ```powershell
   cd D:\brgy_docu_hub\rhai_backend
   node paymongo_webhook_manager.js create
   ```

3. **Copy the webhook secret** from output:
   ```
   PAYMONGO_WEBHOOK_SECRET=whsk_xxxxxxxxxxxxx
   ```

**Option B: Using PayMongo Dashboard**

1. Go to https://dashboard.paymongo.com/developers/webhooks
2. Click "Create Webhook"
3. Enter URL: `https://your-railway-url.up.railway.app/api/webhooks/paymongo`
4. Select events:
   - `payment.paid`
   - `payment.failed`
   - `link.payment.paid`
5. Click "Create"
6. Copy the webhook secret

### Step 5.3: Update Webhook Secret

1. **In Railway Backend Variables**
2. **Update PAYMONGO_WEBHOOK_SECRET:**
   ```
   PAYMONGO_WEBHOOK_SECRET=whsk_your_actual_secret_here
   ```
3. **Save and wait for redeploy**

---

## Phase 6: Final Testing

### Test 1: Frontend Access
- Visit your Vercel URL
- Should load the welcome page
- No console errors

### Test 2: User Login
- Click "Login"
- Try logging in with test account
- Should successfully authenticate

### Test 3: Backend API
- Visit: `https://your-railway-url.up.railway.app/health`
- Should return: `{"status":"OK","database":"connected"}`

### Test 4: Document Request
- Login as client
- Create a new document request
- Should save successfully

### Test 5: Payment Flow
- Create a document request
- Click "Pay Now"
- Should redirect to PayMongo
- Complete test payment
- Webhook should update status

### Test 6: File Uploads
- Upload verification documents
- Should upload successfully
- Check if files are accessible

---

## Troubleshooting

### Backend Issues

**Problem: Database connection failed**
- Check Railway MySQL is running
- Verify database credentials in environment variables
- Check Railway logs for specific error

**Problem: CORS errors**
- Verify FRONTEND_URL matches your Vercel URL exactly
- Check Railway logs for blocked origins
- Ensure no trailing slash in URLs

**Problem: PayMongo webhook not working**
- Verify WEBHOOK_URL is correct
- Check PAYMONGO_WEBHOOK_SECRET is set
- Test webhook endpoint: `curl https://your-railway-url.up.railway.app/api/webhooks/paymongo/test`

### Frontend Issues

**Problem: API calls failing**
- Check VUE_APP_API_URL in Vercel environment variables
- Verify Railway backend is running
- Check browser console for CORS errors

**Problem: Build fails on Vercel**
- Check build logs in Vercel dashboard
- Verify all dependencies are in package.json
- Try building locally: `npm run build`

**Problem: Images not loading**
- Check file paths are correct
- Verify uploads directory exists on Railway
- Consider using cloud storage (S3, Cloudinary) for production

### Database Issues

**Problem: Import failed**
- Check SQL file for syntax errors
- Try importing in smaller chunks
- Verify MySQL version compatibility

**Problem: Missing data**
- Verify import completed successfully
- Check table structure matches local
- Re-run import if necessary

---

## Important Production Notes

### 1. File Uploads
Railway uses **ephemeral filesystem** - uploaded files will be lost on restart. For production, consider:
- AWS S3
- Cloudinary
- Google Cloud Storage
- Railway Volumes (persistent storage)

### 2. Database Backups
- Set up automated backups in Railway
- Export database regularly
- Keep local backups

### 3. Environment Variables
- Never commit `.env` files to Git
- Use strong, unique secrets for production
- Rotate secrets periodically

### 4. PayMongo
- Use **LIVE keys** for production (pk_live_... and sk_live_...)
- Test thoroughly before going live
- Monitor webhook deliveries in PayMongo dashboard

### 5. Security
- Enable 2FA on all accounts
- Use strong passwords
- Monitor access logs
- Keep dependencies updated

---

## Next Steps After Deployment

1. ✅ Test all features thoroughly
2. ✅ Set up monitoring and alerts
3. ✅ Configure automated backups
4. ✅ Set up custom domain (optional)
5. ✅ Enable SSL/HTTPS (automatic on Railway/Vercel)
6. ✅ Train staff on new system
7. ✅ Prepare user documentation
8. ✅ Plan for ongoing maintenance

---

## Support Resources

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **PayMongo Docs**: https://developers.paymongo.com
- **Vue.js Docs**: https://vuejs.org
- **Express.js Docs**: https://expressjs.com

---

## Congratulations! 🎉

Your Barangay Document Management System is now live in production!

**Your URLs:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-app.up.railway.app`
- API: `https://your-app.up.railway.app/api`

Remember to:
- Monitor system performance
- Keep backups updated
- Update dependencies regularly
- Respond to user feedback

Good luck with your deployment! 🚀

