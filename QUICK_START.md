# ⚡ Quick Start - Deployment in 30 Minutes

This is a condensed guide for experienced developers. For detailed instructions, see `DEPLOYMENT_GUIDE.md`.

---

## 📋 Prerequisites Checklist

- [ ] Git installed
- [ ] Node.js v16+ installed
- [ ] MySQL Workbench installed
- [ ] GitHub account
- [ ] Railway account (sign up with GitHub)
- [ ] Vercel account (sign up with GitHub)
- [ ] PayMongo live API keys
- [ ] Gmail app password

---

## 🚀 Deployment Steps

### 1️⃣ Export Database (5 min)

```bash
# Using MySQL Workbench
Server > Data Export > Select barangay_management_system
Export to: D:\brgy_docu_hub\rhai_backend\database_export.sql
```

### 2️⃣ Push Backend to GitHub (5 min)

```powershell
cd D:\brgy_docu_hub\rhai_backend
git init
git add .
git commit -m "Initial commit - Backend"
git branch -M main
git remote add origin https://github.com/torukamiya1-beep/barangay_bula_backend.git
git push -u origin main
```

### 3️⃣ Deploy Backend to Railway (10 min)

1. **Create Project**: https://railway.app/dashboard → New Project → Deploy from GitHub
2. **Add MySQL**: New → Database → MySQL
3. **Configure Variables**: Backend Service → Variables → Raw Editor

```env
NODE_ENV=production
PORT=7000
DB_HOST=[from Railway MySQL]
DB_USER=[from Railway MySQL]
DB_PASSWORD=[from Railway MySQL]
DB_NAME=[from Railway MySQL]
DB_PORT=[from Railway MySQL]
JWT_SECRET=[generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"]
JWT_EXPIRE=30d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=barangaybula45@gmail.com
EMAIL_PASS=nqagxakkhjxpisgl
EMAIL_FROM_NAME=Barangay Bula Management System
EMAIL_FROM_ADDRESS=barangaybula45@gmail.com
PAYMONGO_PUBLIC_KEY=pk_live_YOUR_KEY
PAYMONGO_SECRET_KEY=sk_live_YOUR_KEY
PAYMONGO_BASE_URL=https://api.paymongo.com/v1
ENABLE_ONLINE_PAYMENTS=true
PAYMENT_TIMEOUT_MINUTES=30
FRONTEND_URL=http://localhost:8081
WEBHOOK_URL=https://YOUR_RAILWAY_URL.up.railway.app/api/webhooks/paymongo
PAYMONGO_WEBHOOK_SECRET=whsk_will_update_later
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
```

4. **Generate Domain**: Settings → Domains → Generate Domain
5. **Copy Railway URL**: Save for later

### 4️⃣ Import Database (5 min)

```bash
# Using MySQL Workbench
# Connect to Railway MySQL (use credentials from Railway)
Server > Data Import > Import from Self-Contained File
Select: D:\brgy_docu_hub\rhai_backend\database_export.sql
Start Import
```

**Verify**:
```bash
curl https://your-railway-url.up.railway.app/health
# Should return: {"status":"OK","database":"connected"}
```

### 5️⃣ Push Frontend to GitHub (5 min)

```powershell
cd D:\brgy_docu_hub\BOSFDR
git init
git add .
git commit -m "Initial commit - Frontend"
git branch -M main
git remote add origin https://github.com/torukamiya1-beep/barangay-bula-docu-hub.git
git push -u origin main
```

### 6️⃣ Deploy Frontend to Vercel (5 min)

1. **Import Project**: https://vercel.com/dashboard → Add New → Import
2. **Select Repo**: barangay-bula-docu-hub
3. **Configure**:
   - Framework: Vue.js
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Environment Variables**:
```env
VUE_APP_API_URL=https://your-railway-url.up.railway.app/api
VUE_APP_APP_NAME=Barangay Bula Management System
VUE_APP_VERSION=1.0.0
VUE_APP_ENV=production
```

5. **Deploy** → Copy Vercel URL

### 7️⃣ Update Backend CORS (2 min)

Railway → Backend Service → Variables:
```env
FRONTEND_URL=https://your-vercel-url.vercel.app
```

### 8️⃣ Configure PayMongo Webhook (3 min)

**Update script**:
```javascript
// Edit: D:\brgy_docu_hub\rhai_backend\paymongo_webhook_manager.js
const PAYMONGO_SECRET_KEY = 'sk_live_YOUR_KEY';
const WEBHOOK_URL = 'https://your-railway-url.up.railway.app/api/webhooks/paymongo';
```

**Create webhook**:
```powershell
cd D:\brgy_docu_hub\rhai_backend
node paymongo_webhook_manager.js create
```

**Copy webhook secret** (starts with `whsk_`)

**Update Railway**:
```env
WEBHOOK_URL=https://your-railway-url.up.railway.app/api/webhooks/paymongo
PAYMONGO_WEBHOOK_SECRET=whsk_YOUR_SECRET
```

### 9️⃣ Test Everything (5 min)

- [ ] Visit Vercel URL → Should load
- [ ] Login → Should work
- [ ] Create document request → Should save
- [ ] Pay online → Should redirect to PayMongo
- [ ] Complete payment → Status should update

---

## 🎯 URLs to Save

```
Frontend: https://your-app.vercel.app
Backend: https://your-app.up.railway.app
API: https://your-app.up.railway.app/api
Health: https://your-app.up.railway.app/health
```

---

## 🆘 Quick Troubleshooting

**Database connection failed**
```bash
# Check Railway MySQL is running
# Verify credentials in environment variables
```

**CORS errors**
```bash
# Verify FRONTEND_URL matches Vercel URL exactly
# No trailing slash
```

**Payment not working**
```bash
# Check webhook URL is correct
# Verify webhook secret is set
# Test: curl https://your-railway-url.up.railway.app/api/webhooks/paymongo/test
```

**Build failed**
```bash
# Check Vercel build logs
# Verify all dependencies in package.json
# Try: npm run build locally
```

---

## 📚 Full Documentation

For detailed instructions, see:
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[GIT_SETUP_COMMANDS.md](GIT_SETUP_COMMANDS.md)** - Git commands
- **[PAYMONGO_WEBHOOK_SETUP.md](PAYMONGO_WEBHOOK_SETUP.md)** - PayMongo setup
- **[DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)** - What was changed

---

## ✅ Done!

Your system is now live! 🎉

**Next steps**:
1. Test all features thoroughly
2. Set up monitoring
3. Configure backups
4. Train staff
5. Go live!

---

**Time to deploy**: ~30 minutes
**Difficulty**: Intermediate
**Status**: Production Ready ✅

