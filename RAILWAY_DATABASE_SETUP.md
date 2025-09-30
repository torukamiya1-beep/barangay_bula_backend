# Railway Database Setup Guide

This guide will help you set up the MySQL database on Railway for your Barangay Document Management System.

## Prerequisites

- Railway account (sign up at https://railway.app)
- Your backend code pushed to GitHub
- Access to your local MySQL database for export

---

## Step 1: Create MySQL Database on Railway

1. **Log in to Railway Dashboard**
   - Go to https://railway.app
   - Sign in with your GitHub account

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy MySQL"
   - Railway will automatically provision a MySQL database

3. **Get Database Credentials**
   - Click on your MySQL service
   - Go to "Variables" tab
   - You'll see these variables:
     - `MYSQLHOST`
     - `MYSQLPORT`
     - `MYSQLUSER`
     - `MYSQLDATABASE`
     - `MYSQLPASSWORD`
     - `DATABASE_URL` (complete connection string)

4. **Note Down Credentials**
   ```
   Host: [MYSQLHOST value]
   Port: [MYSQLPORT value]
   User: [MYSQLUSER value]
   Password: [MYSQLPASSWORD value]
   Database: [MYSQLDATABASE value]
   ```

---

## Step 2: Export Your Local Database

### Option A: Using MySQL Workbench (Recommended)

1. Open MySQL Workbench
2. Connect to your local database
3. Go to **Server** > **Data Export**
4. Select database: `barangay_management_system`
5. Select **Export to Self-Contained File**
6. Choose location: `D:\brgy_docu_hub\rhai_backend\database_export.sql`
7. Under **Object Selection**, select:
   - ✅ Dump Stored Procedures and Functions
   - ✅ Dump Events
   - ✅ Dump Triggers
8. Click **Start Export**

### Option B: Using Command Line

```bash
# Navigate to your backend directory
cd D:\brgy_docu_hub\rhai_backend

# Export database (replace with your local MySQL password)
mysqldump -u root -p barangay_management_system > database_export.sql
```

---

## Step 3: Connect to Railway MySQL

### Option A: Using MySQL Workbench

1. Open MySQL Workbench
2. Click **+** next to "MySQL Connections"
3. Enter connection details:
   - **Connection Name**: Railway Production DB
   - **Hostname**: [Your MYSQLHOST from Railway]
   - **Port**: [Your MYSQLPORT from Railway]
   - **Username**: [Your MYSQLUSER from Railway]
   - **Password**: Click "Store in Keychain" and enter [Your MYSQLPASSWORD]
4. Click **Test Connection**
5. If successful, click **OK**

### Option B: Using Command Line

```bash
# Connect to Railway MySQL
mysql -h [MYSQLHOST] -P [MYSQLPORT] -u [MYSQLUSER] -p[MYSQLPASSWORD] [MYSQLDATABASE]
```

---

## Step 4: Import Database to Railway

### Option A: Using MySQL Workbench

1. Connect to Railway database (from Step 3)
2. Go to **Server** > **Data Import**
3. Select **Import from Self-Contained File**
4. Browse to: `D:\brgy_docu_hub\rhai_backend\database_export.sql`
5. Under **Default Target Schema**, select your Railway database name
6. Click **Start Import**
7. Wait for completion (may take several minutes)

### Option B: Using Command Line

```bash
# Import to Railway MySQL
mysql -h [MYSQLHOST] -P [MYSQLPORT] -u [MYSQLUSER] -p[MYSQLPASSWORD] [MYSQLDATABASE] < database_export.sql
```

---

## Step 5: Verify Database Import

1. **Connect to Railway MySQL** (using Workbench or command line)

2. **Check Tables**
   ```sql
   SHOW TABLES;
   ```
   
   You should see tables like:
   - `client_accounts`
   - `admin_employee_accounts`
   - `document_requests`
   - `receipts`
   - `payment_webhooks`
   - etc.

3. **Check Data**
   ```sql
   -- Check client accounts
   SELECT COUNT(*) FROM client_accounts;
   
   -- Check admin accounts
   SELECT COUNT(*) FROM admin_employee_accounts;
   
   -- Check document requests
   SELECT COUNT(*) FROM document_requests;
   ```

4. **Verify Admin Account**
   ```sql
   SELECT id, username, email, role, status 
   FROM admin_employee_accounts 
   WHERE status = 'active';
   ```

---

## Step 6: Update Railway Environment Variables

1. Go to Railway Dashboard
2. Click on your **Backend Service** (not MySQL)
3. Go to **Variables** tab
4. Add these environment variables:

```env
NODE_ENV=production
PORT=7000

# Database - Use Railway MySQL credentials
DB_HOST=[Your MYSQLHOST]
DB_USER=[Your MYSQLUSER]
DB_PASSWORD=[Your MYSQLPASSWORD]
DB_NAME=[Your MYSQLDATABASE]
DB_PORT=[Your MYSQLPORT]

# JWT Secret - Generate new one for production
JWT_SECRET=[Generate using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"]
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
PAYMONGO_PUBLIC_KEY=pk_live_YOUR_LIVE_KEY
PAYMONGO_SECRET_KEY=sk_live_YOUR_LIVE_KEY
PAYMONGO_BASE_URL=https://api.paymongo.com/v1
ENABLE_ONLINE_PAYMENTS=true
PAYMENT_TIMEOUT_MINUTES=30

# Frontend URL - Will update after Vercel deployment
FRONTEND_URL=https://your-vercel-app.vercel.app

# Webhook URL - Will update after getting Railway domain
WEBHOOK_URL=https://your-railway-app.up.railway.app/api/webhooks/paymongo
PAYMONGO_WEBHOOK_SECRET=whsk_will_be_generated_later

# Other settings
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
```

---

## Step 7: Test Database Connection

After deploying your backend to Railway:

1. **Check Deployment Logs**
   - Go to Railway Dashboard > Your Backend Service
   - Click on "Deployments" tab
   - View latest deployment logs
   - Look for: `✅ Database connected successfully`

2. **Test Health Endpoint**
   ```bash
   curl https://your-railway-app.up.railway.app/health
   ```
   
   Should return:
   ```json
   {
     "status": "OK",
     "timestamp": "2025-09-30T...",
     "uptime": 123.456,
     "database": "connected"
   }
   ```

---

## Troubleshooting

### Connection Timeout
- Check if Railway MySQL is running
- Verify credentials are correct
- Check Railway service logs for errors

### Import Errors
- Make sure database export is complete
- Check for syntax errors in SQL file
- Try importing in smaller chunks if file is large

### Missing Tables
- Verify import completed successfully
- Check Railway MySQL logs
- Re-run import if necessary

### Authentication Errors
- Verify admin account exists
- Check password hashes are correct
- Test login with known credentials

---

## Important Notes

1. **Backup Regularly**: Railway databases should be backed up regularly
2. **Ephemeral Storage**: Railway uses ephemeral filesystem, so uploaded files will be lost on restart
3. **Database Persistence**: Database data is persistent and won't be lost on restart
4. **Connection Limits**: Railway MySQL has connection limits, monitor usage
5. **Security**: Never commit database credentials to Git

---

## Next Steps

After database setup:
1. ✅ Deploy backend to Railway
2. ✅ Deploy frontend to Vercel
3. ✅ Update FRONTEND_URL in Railway
4. ✅ Configure PayMongo webhook
5. ✅ Test complete system

---

For more help, see:
- Railway Documentation: https://docs.railway.app
- MySQL Documentation: https://dev.mysql.com/doc/

