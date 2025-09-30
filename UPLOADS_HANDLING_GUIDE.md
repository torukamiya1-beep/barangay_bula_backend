# 📁 Uploads Handling Guide

## Overview

This guide explains how file uploads are handled in development, GitHub, and production (Railway) environments.

---

## 🎯 Current Configuration

### **Directory Structure**

```
rhai_backend/
├── uploads/
│   ├── .gitkeep                    ← Tracked in Git
│   ├── documents/
│   │   ├── .gitkeep                ← Tracked in Git
│   │   └── [user-uploaded-files]   ← NOT tracked in Git
│   ├── residency/
│   │   ├── .gitkeep                ← Tracked in Git
│   │   └── [user-uploaded-files]   ← NOT tracked in Git
│   ├── verification/
│   │   ├── .gitkeep                ← Tracked in Git
│   │   └── [user-uploaded-files]   ← NOT tracked in Git
│   └── temp/
│       ├── .gitkeep                ← Tracked in Git
│       └── [temporary-files]       ← NOT tracked in Git
```

### **What's in GitHub**

✅ **Tracked (Visible in GitHub)**:
- `uploads/` directory structure
- `.gitkeep` files in each subdirectory
- This ensures the folder structure exists when cloned

❌ **NOT Tracked (Hidden from GitHub)**:
- Actual user-uploaded images/documents
- Any files except `.gitkeep`
- This prevents repository bloat and protects user privacy

---

## 🔧 How It Works

### **1. Git Configuration (`.gitignore`)**

```gitignore
# Keep directory structure but ignore uploaded files
uploads/*
!uploads/.gitkeep
!uploads/documents/
!uploads/documents/.gitkeep
!uploads/residency/
!uploads/residency/.gitkeep
!uploads/verification/
!uploads/verification/.gitkeep
!uploads/temp/
!uploads/temp/.gitkeep

# Ignore all files within subdirectories
uploads/documents/*
!uploads/documents/.gitkeep
uploads/residency/*
!uploads/residency/.gitkeep
uploads/verification/*
!uploads/verification/.gitkeep
uploads/temp/*
!uploads/temp/.gitkeep
```

**What this does**:
- ✅ Commits the directory structure
- ✅ Commits `.gitkeep` placeholder files
- ❌ Excludes all actual uploaded files
- ❌ Prevents sensitive user data in Git

### **2. Server Configuration (`server.js`)**

```javascript
// Serve uploads with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}, express.static('uploads'));
```

**What this does**:
- ✅ Serves files from `/uploads` directory
- ✅ Adds CORS headers for frontend access
- ✅ Handles OPTIONS preflight requests
- ✅ Makes uploaded files accessible via HTTP

### **3. Startup Script (`scripts/ensure-upload-directories.js`)**

Automatically runs on server startup to:
- ✅ Create all required directories if missing
- ✅ Verify directories are writable
- ✅ Create `.gitkeep` files if needed
- ✅ Display directory statistics

---

## 🚀 Railway Deployment Considerations

### **⚠️ IMPORTANT: Railway Uses Ephemeral Filesystem**

Railway's filesystem is **ephemeral**, meaning:
- ❌ Files uploaded during runtime are **lost on restart**
- ❌ Files are **not persisted** between deployments
- ❌ Each instance has its **own separate filesystem**

### **What This Means**

1. **Development (Local)**:
   - ✅ Files persist between restarts
   - ✅ Files are stored on your local disk
   - ✅ Perfect for testing

2. **Production (Railway)**:
   - ⚠️ Files are lost when:
     - Application restarts
     - New deployment is pushed
     - Railway scales/moves the instance
   - ⚠️ Files are NOT shared between instances
   - ⚠️ Not suitable for permanent file storage

### **Current Behavior on Railway**

✅ **What Works**:
- Directory structure is created on startup
- Files can be uploaded during runtime
- Files can be accessed while instance is running
- Temporary file storage works fine

❌ **What Doesn't Work**:
- Files don't persist after restart
- Files are lost on new deployment
- No file sharing between instances

---

## 💡 Solutions for Production

### **Option 1: Cloud Storage (Recommended)**

Use a cloud storage service for permanent file storage:

#### **A. AWS S3**
```bash
npm install aws-sdk multer-s3
```

#### **B. Cloudinary (Image-focused)**
```bash
npm install cloudinary multer-storage-cloudinary
```

#### **C. Google Cloud Storage**
```bash
npm install @google-cloud/storage multer-cloud-storage
```

#### **D. Railway Volumes (Persistent Storage)**
```bash
# Railway CLI
railway volume create uploads-volume
railway volume attach uploads-volume /app/uploads
```

### **Option 2: Database Storage**

Store files as BLOB in MySQL:
- ✅ Files persist with database
- ❌ Increases database size
- ❌ Slower than filesystem
- ❌ Not recommended for large files

### **Option 3: Railway Volumes (Simplest)**

Railway offers persistent volumes:

**Pros**:
- ✅ Simple to set up
- ✅ Files persist across restarts
- ✅ No code changes needed
- ✅ Works like local filesystem

**Cons**:
- ❌ Costs extra ($5-10/month)
- ❌ Limited to single region
- ❌ Not shared across instances

**Setup**:
1. Go to Railway project
2. Click "Volumes" tab
3. Create new volume: `/app/uploads`
4. Redeploy application

---

## 🔍 Verification Steps

### **1. Check GitHub Repository**

Visit: https://github.com/torukamiya1-beep/barangay_bula_backend/tree/main/uploads

You should see:
```
uploads/
├── .gitkeep
├── documents/
│   └── .gitkeep
├── residency/
│   └── .gitkeep
├── verification/
│   └── .gitkeep
└── temp/
    └── .gitkeep
```

### **2. Test Locally**

```bash
# Run the directory check script
cd D:\brgy_docu_hub\rhai_backend
node scripts/ensure-upload-directories.js

# Start the server
npm start

# Upload a test file
# Check if file appears in uploads/documents/
```

### **3. Test on Railway**

```bash
# After deployment, check health endpoint
curl https://your-railway-url.up.railway.app/health

# Upload a test file via frontend
# Check if file is accessible
curl https://your-railway-url.up.railway.app/uploads/documents/test-file.jpg

# Restart the application
# Check if file still exists (it won't - this is expected)
```

---

## 📊 Current Status

### **✅ What's Working**

1. **Git Configuration**:
   - ✅ Directory structure tracked in Git
   - ✅ `.gitkeep` files present
   - ✅ Actual files excluded from Git
   - ✅ No repository bloat

2. **Server Configuration**:
   - ✅ Static file serving configured
   - ✅ CORS headers properly set
   - ✅ Startup script ensures directories exist
   - ✅ Files accessible via HTTP

3. **Development Environment**:
   - ✅ Files persist locally
   - ✅ Upload/download works
   - ✅ Directory structure maintained

### **⚠️ What Needs Attention**

1. **Production File Persistence**:
   - ⚠️ Files will be lost on Railway restart
   - ⚠️ Need to implement cloud storage or Railway volumes
   - ⚠️ Current setup is temporary storage only

2. **Recommended Actions**:
   - 📝 Decide on permanent storage solution
   - 📝 Implement cloud storage integration (S3/Cloudinary)
   - 📝 Or set up Railway volumes
   - 📝 Update documentation with chosen solution

---

## 🎯 Recommended Next Steps

### **For Testing/MVP (Current Setup)**
✅ Current configuration is fine
✅ Files work during runtime
⚠️ Accept that files are temporary

### **For Production (Choose One)**

#### **Option A: Railway Volumes (Easiest)**
1. Create Railway volume: `/app/uploads`
2. Attach to service
3. Redeploy
4. Done! Files now persist

#### **Option B: Cloudinary (Best for Images)**
1. Sign up: https://cloudinary.com
2. Install: `npm install cloudinary multer-storage-cloudinary`
3. Update multer configuration
4. Update image URLs in database
5. Deploy

#### **Option C: AWS S3 (Most Scalable)**
1. Create S3 bucket
2. Install: `npm install aws-sdk multer-s3`
3. Update multer configuration
4. Update file URLs in database
5. Deploy

---

## 📞 Support

If you need help implementing any of these solutions:
1. Check Railway documentation: https://docs.railway.app/reference/volumes
2. Check Cloudinary docs: https://cloudinary.com/documentation
3. Check AWS S3 docs: https://docs.aws.amazon.com/s3/

---

## ✅ Summary

**Current State**:
- ✅ Directory structure is in GitHub
- ✅ `.gitkeep` files preserve structure
- ✅ Actual files excluded from Git
- ✅ Server serves files correctly
- ✅ Startup script ensures directories exist
- ⚠️ Files are temporary on Railway

**For Production**:
- Choose a permanent storage solution
- Railway Volumes (simplest)
- Cloud storage (most scalable)
- Update configuration accordingly

**Everything is working as designed!** The current setup is perfect for development and testing. For production, you'll need to add persistent storage.

