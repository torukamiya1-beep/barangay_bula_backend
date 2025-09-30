# 🚂 Railway Volumes Setup Guide

## Overview

This guide explains how to set up persistent storage for uploaded files on Railway using Volumes.

---

## ⚠️ Why You Need This

**Railway's Default Filesystem is Ephemeral**:
- Files uploaded during runtime are **lost on restart**
- Files are **not persisted** between deployments
- Each instance has its **own separate filesystem**

**Railway Volumes Solve This**:
- ✅ Files persist across restarts
- ✅ Files survive deployments
- ✅ Works like a regular filesystem
- ✅ No code changes needed

---

## 💰 Pricing

- **Cost**: ~$5-10/month depending on size
- **Free Tier**: Not included in free tier
- **Billing**: Charged per GB per month

---

## 🔧 Setup Instructions

### **Method 1: Railway Dashboard (Recommended)**

#### **Step 1: Access Your Project**
1. Go to: https://railway.app/dashboard
2. Select your backend project
3. Click on your backend service

#### **Step 2: Create Volume**
1. Click on the **"Volumes"** tab
2. Click **"+ New Volume"**
3. Configure:
   - **Mount Path**: `/app/uploads`
   - **Size**: Start with 1GB (can increase later)
   - **Name**: `uploads-storage` (optional)
4. Click **"Create Volume"**

#### **Step 3: Verify Configuration**
1. Go to **"Settings"** tab
2. Scroll to **"Volumes"** section
3. Verify mount path is `/app/uploads`

#### **Step 4: Redeploy**
1. Go to **"Deployments"** tab
2. Click **"Redeploy"** on latest deployment
3. Wait for deployment to complete

#### **Step 5: Test**
1. Upload a file via your frontend
2. Verify file is accessible
3. Restart the service
4. Verify file still exists ✅

---

### **Method 2: Railway CLI**

#### **Step 1: Install Railway CLI**
```bash
# Windows (PowerShell)
iwr https://railway.app/install.ps1 | iex

# Or download from: https://railway.app/cli
```

#### **Step 2: Login**
```bash
railway login
```

#### **Step 3: Link Project**
```bash
cd D:\brgy_docu_hub\rhai_backend
railway link
# Select your project from the list
```

#### **Step 4: Create Volume**
```bash
railway volume create uploads-storage
```

#### **Step 5: Attach Volume**
```bash
railway volume attach uploads-storage /app/uploads
```

#### **Step 6: Deploy**
```bash
railway up
```

---

## 📊 Monitoring Volume Usage

### **Via Dashboard**
1. Go to your Railway project
2. Click on backend service
3. Click **"Volumes"** tab
4. View usage statistics

### **Via CLI**
```bash
railway volume list
railway volume info uploads-storage
```

---

## 🔍 Verification Steps

### **1. Check Volume is Mounted**

After deployment, check the logs:
```
✅ All upload directories are ready!
```

### **2. Test File Upload**

```bash
# Upload a test file via frontend
# Then check if it's accessible
curl https://your-railway-url.up.railway.app/uploads/documents/test-file.jpg
```

### **3. Test Persistence**

```bash
# 1. Upload a file
# 2. Note the file URL
# 3. Restart the service (Railway Dashboard > Deployments > Restart)
# 4. Check if file still exists
curl https://your-railway-url.up.railway.app/uploads/documents/test-file.jpg
# Should return the file ✅
```

---

## 🎯 Alternative: Cloud Storage

If you prefer not to use Railway Volumes, consider cloud storage:

### **Option A: Cloudinary (Best for Images)**

**Pros**:
- ✅ Free tier: 25GB storage, 25GB bandwidth
- ✅ Automatic image optimization
- ✅ CDN included
- ✅ Easy to integrate

**Setup**:
1. Sign up: https://cloudinary.com
2. Get API credentials
3. Install: `npm install cloudinary multer-storage-cloudinary`
4. Update multer configuration

**Cost**: Free tier sufficient for most use cases

### **Option B: AWS S3**

**Pros**:
- ✅ Highly scalable
- ✅ Very cheap ($0.023/GB/month)
- ✅ Industry standard
- ✅ Reliable

**Setup**:
1. Create AWS account
2. Create S3 bucket
3. Get access keys
4. Install: `npm install aws-sdk multer-s3`
5. Update multer configuration

**Cost**: ~$0.50-2/month for typical usage

### **Option C: Google Cloud Storage**

**Pros**:
- ✅ Similar to S3
- ✅ Good pricing
- ✅ Reliable

**Setup**:
1. Create GCP account
2. Create storage bucket
3. Get service account key
4. Install: `npm install @google-cloud/storage`
5. Update multer configuration

**Cost**: Similar to S3

---

## 📝 Comparison

| Feature | Railway Volumes | Cloudinary | AWS S3 | Current (Ephemeral) |
|---------|----------------|------------|--------|---------------------|
| **Persistence** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **Setup Difficulty** | ⭐ Easy | ⭐⭐ Medium | ⭐⭐⭐ Hard | ✅ Done |
| **Code Changes** | ❌ None | ✅ Required | ✅ Required | ❌ None |
| **Cost (1GB)** | ~$5-10/mo | Free | ~$0.50/mo | Free |
| **CDN** | ❌ No | ✅ Yes | ⭐ Optional | ❌ No |
| **Image Optimization** | ❌ No | ✅ Yes | ❌ No | ❌ No |
| **Scalability** | ⭐⭐ Medium | ⭐⭐⭐ High | ⭐⭐⭐ High | ⭐ Low |
| **Best For** | MVP/Testing | Images | Everything | Development |

---

## 🎯 Recommendation

### **For MVP/Testing (Current Phase)**
✅ **Use Railway Volumes**
- Easiest to set up
- No code changes
- Works immediately
- Good enough for testing

### **For Production (Later)**
✅ **Use Cloudinary or S3**
- More scalable
- Better performance
- Lower cost at scale
- Industry standard

---

## 🚀 Quick Start (Railway Volumes)

**5-Minute Setup**:

1. **Go to Railway Dashboard**
   - https://railway.app/dashboard

2. **Select Backend Service**
   - Click on your backend project

3. **Create Volume**
   - Volumes tab → New Volume
   - Mount path: `/app/uploads`
   - Size: 1GB

4. **Redeploy**
   - Deployments tab → Redeploy

5. **Test**
   - Upload a file
   - Restart service
   - Verify file persists ✅

**Done!** Your uploads now persist across restarts.

---

## 🆘 Troubleshooting

### **Volume Not Mounting**

**Symptoms**:
- Files still disappear after restart
- Logs show directory creation errors

**Solution**:
1. Check mount path is exactly `/app/uploads`
2. Verify volume is attached to correct service
3. Redeploy the application
4. Check logs for errors

### **Permission Errors**

**Symptoms**:
- "EACCES: permission denied" errors
- Cannot write to uploads directory

**Solution**:
1. Volume should have correct permissions by default
2. Check Railway logs for specific errors
3. Contact Railway support if persists

### **Volume Full**

**Symptoms**:
- "ENOSPC: no space left on device"
- Upload failures

**Solution**:
1. Go to Volumes tab
2. Increase volume size
3. Redeploy application

---

## 📞 Support

- **Railway Docs**: https://docs.railway.app/reference/volumes
- **Railway Discord**: https://discord.gg/railway
- **Railway Support**: support@railway.app

---

## ✅ Summary

**Current Setup**:
- ✅ Directory structure preserved in Git
- ✅ Startup script ensures directories exist
- ✅ Server configured to serve files
- ⚠️ Files are temporary (ephemeral filesystem)

**To Make Files Persistent**:
1. **Option 1**: Set up Railway Volumes (5 minutes, ~$5-10/month)
2. **Option 2**: Use Cloudinary (30 minutes, free tier available)
3. **Option 3**: Use AWS S3 (1 hour, ~$0.50/month)

**Recommended for Now**:
- Use Railway Volumes for simplicity
- Migrate to cloud storage later if needed

**Everything is ready!** Just add a volume and your uploads will persist.

