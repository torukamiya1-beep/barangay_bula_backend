# 📁 Uploads Architecture & Flow

## System Overview

This document explains how file uploads work across development, GitHub, and production environments.

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vercel)                        │
│                                                                   │
│  ┌──────────────┐                                                │
│  │ User uploads │ ──────────────────────────────────────┐       │
│  │    image     │                                        │       │
│  └──────────────┘                                        │       │
│                                                           ▼       │
└───────────────────────────────────────────────────────────────────┘
                                                            │
                                                            │ HTTP POST
                                                            │ multipart/form-data
                                                            │
┌───────────────────────────────────────────────────────────────────┐
│                        BACKEND (Railway)                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Express Server                         │   │
│  │                                                            │   │
│  │  ┌──────────────┐         ┌──────────────┐              │   │
│  │  │   Multer     │────────▶│  File System │              │   │
│  │  │  Middleware  │         │   /uploads   │              │   │
│  │  └──────────────┘         └──────────────┘              │   │
│  │                                   │                       │   │
│  │                                   ▼                       │   │
│  │                          ┌─────────────────┐             │   │
│  │                          │ Railway Volume  │             │   │
│  │                          │  (Persistent)   │             │   │
│  │                          └─────────────────┘             │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  Static File Server (express.static)             │   │   │
│  │  │  Serves: /uploads/documents/file.jpg             │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP GET
                                    │ /uploads/documents/file.jpg
                                    │
┌───────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vercel)                         │
│                                                                   │
│  ┌──────────────┐                                                │
│  │ User views   │ ◀──────────────────────────────────────────   │
│  │    image     │                                                │
│  └──────────────┘                                                │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 📂 Directory Structure

### **In Git Repository**

```
rhai_backend/
├── uploads/                    ← Tracked (directory)
│   ├── .gitkeep               ← Tracked (placeholder)
│   ├── documents/             ← Tracked (directory)
│   │   ├── .gitkeep          ← Tracked (placeholder)
│   │   └── *.jpg, *.pdf      ← NOT tracked (ignored)
│   ├── residency/             ← Tracked (directory)
│   │   ├── .gitkeep          ← Tracked (placeholder)
│   │   └── *.jpg, *.pdf      ← NOT tracked (ignored)
│   ├── verification/          ← Tracked (directory)
│   │   ├── .gitkeep          ← Tracked (placeholder)
│   │   └── *.jpg, *.pdf      ← NOT tracked (ignored)
│   └── temp/                  ← Tracked (directory)
│       ├── .gitkeep          ← Tracked (placeholder)
│       └── *.tmp             ← NOT tracked (ignored)
├── scripts/
│   └── ensure-upload-directories.js  ← Ensures dirs exist on startup
├── UPLOADS_HANDLING_GUIDE.md         ← Documentation
└── RAILWAY_VOLUMES_SETUP.md          ← Railway setup guide
```

### **On Railway (With Volume)**

```
/app/
├── uploads/                    ← Mounted from Railway Volume
│   ├── .gitkeep               ← From Git
│   ├── documents/             ← From Git + Runtime files
│   │   ├── .gitkeep          ← From Git
│   │   ├── doc_123.jpg       ← Uploaded at runtime (PERSISTS)
│   │   └── doc_456.pdf       ← Uploaded at runtime (PERSISTS)
│   ├── residency/             ← From Git + Runtime files
│   │   ├── .gitkeep          ← From Git
│   │   └── res_789.jpg       ← Uploaded at runtime (PERSISTS)
│   └── verification/          ← From Git + Runtime files
│       ├── .gitkeep          ← From Git
│       └── ver_012.jpg       ← Uploaded at runtime (PERSISTS)
```

### **On Railway (Without Volume)**

```
/app/
├── uploads/                    ← Ephemeral filesystem
│   ├── .gitkeep               ← From Git
│   ├── documents/             ← From Git + Runtime files
│   │   ├── .gitkeep          ← From Git
│   │   ├── doc_123.jpg       ← Uploaded at runtime (LOST ON RESTART)
│   │   └── doc_456.pdf       ← Uploaded at runtime (LOST ON RESTART)
│   └── ...
```

---

## 🔄 Upload Flow

### **Step 1: User Uploads File**

```javascript
// Frontend (Vue.js)
const formData = new FormData();
formData.append('document', file);

await axios.post('/api/documents/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### **Step 2: Backend Receives File**

```javascript
// Backend (Express + Multer)
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');  // Save to this directory
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

app.post('/api/documents/upload', upload.single('document'), (req, res) => {
  // File saved to: uploads/documents/1234567890-filename.jpg
  res.json({ 
    path: `/uploads/documents/${req.file.filename}` 
  });
});
```

### **Step 3: File Stored**

**With Railway Volume**:
```
✅ File saved to: /app/uploads/documents/1234567890-filename.jpg
✅ Persists across restarts
✅ Accessible via: https://your-app.railway.app/uploads/documents/1234567890-filename.jpg
```

**Without Railway Volume**:
```
⚠️ File saved to: /app/uploads/documents/1234567890-filename.jpg
⚠️ Lost on restart
⚠️ Accessible only until restart
```

### **Step 4: Frontend Displays File**

```vue
<!-- Frontend (Vue.js) -->
<template>
  <img :src="documentUrl" alt="Document" />
</template>

<script>
export default {
  data() {
    return {
      documentUrl: 'https://your-backend.railway.app/uploads/documents/1234567890-filename.jpg'
    };
  }
};
</script>
```

---

## 🔐 Security Considerations

### **Current Implementation**

✅ **What's Secure**:
- Files are served with CORS headers
- Only specific file types allowed (configured in multer)
- File size limits enforced
- Unique filenames prevent overwrites
- User-uploaded files not in Git

⚠️ **What to Improve**:
- Add authentication for file access
- Implement file scanning for malware
- Add rate limiting for uploads
- Validate file contents (not just extension)

### **Recommended Enhancements**

```javascript
// Add authentication middleware
app.use('/uploads', authMiddleware, express.static('uploads'));

// Add file type validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

// Add file size limit
const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
```

---

## 📊 Storage Comparison

### **Development (Local)**

| Aspect | Status |
|--------|--------|
| **Persistence** | ✅ Files persist |
| **Performance** | ✅ Fast (local disk) |
| **Cost** | ✅ Free |
| **Scalability** | ⭐ Single machine |
| **Backup** | ⚠️ Manual |

### **Railway (Ephemeral)**

| Aspect | Status |
|--------|--------|
| **Persistence** | ❌ Lost on restart |
| **Performance** | ✅ Fast |
| **Cost** | ✅ Free |
| **Scalability** | ⭐ Single instance |
| **Backup** | ❌ Not possible |

### **Railway (With Volume)**

| Aspect | Status |
|--------|--------|
| **Persistence** | ✅ Files persist |
| **Performance** | ✅ Fast |
| **Cost** | ⭐ ~$5-10/month |
| **Scalability** | ⭐⭐ Single region |
| **Backup** | ⭐ Manual snapshots |

### **Cloudinary**

| Aspect | Status |
|--------|--------|
| **Persistence** | ✅ Files persist |
| **Performance** | ✅ CDN (very fast) |
| **Cost** | ✅ Free tier available |
| **Scalability** | ✅✅✅ Unlimited |
| **Backup** | ✅ Automatic |
| **Extra Features** | ✅ Image optimization, transformations |

### **AWS S3**

| Aspect | Status |
|--------|--------|
| **Persistence** | ✅ Files persist |
| **Performance** | ✅ CDN available |
| **Cost** | ✅ Very cheap (~$0.50/month) |
| **Scalability** | ✅✅✅ Unlimited |
| **Backup** | ✅ Versioning available |
| **Extra Features** | ✅ Industry standard |

---

## 🎯 Recommendations by Use Case

### **MVP / Testing (Current Phase)**
```
✅ Use: Railway Volumes
Why: Simple, no code changes, works immediately
Cost: ~$5-10/month
Setup: 5 minutes
```

### **Production (Small Scale)**
```
✅ Use: Cloudinary
Why: Free tier, CDN, image optimization
Cost: Free (up to 25GB)
Setup: 30 minutes
```

### **Production (Large Scale)**
```
✅ Use: AWS S3 + CloudFront
Why: Cheapest at scale, most reliable
Cost: ~$0.50-5/month
Setup: 1 hour
```

---

## ✅ Current Status

### **What's Working**

1. ✅ Directory structure tracked in Git
2. ✅ `.gitkeep` files preserve structure
3. ✅ Actual files excluded from Git
4. ✅ Server serves files with CORS
5. ✅ Startup script ensures directories exist
6. ✅ Upload/download works in development

### **What's Needed for Production**

1. ⚠️ Add Railway Volume (5 minutes)
   - OR migrate to cloud storage (30-60 minutes)
2. ⚠️ Add authentication for file access
3. ⚠️ Implement file validation
4. ⚠️ Add backup strategy

---

## 🚀 Quick Setup (Railway Volumes)

**To make uploads persist on Railway**:

1. Go to Railway Dashboard
2. Select backend service
3. Click "Volumes" tab
4. Create new volume: `/app/uploads`
5. Redeploy

**Done!** Files now persist across restarts.

---

## 📞 Need Help?

- **Uploads Guide**: `rhai_backend/UPLOADS_HANDLING_GUIDE.md`
- **Railway Setup**: `rhai_backend/RAILWAY_VOLUMES_SETUP.md`
- **Railway Docs**: https://docs.railway.app/reference/volumes
- **Cloudinary Docs**: https://cloudinary.com/documentation

---

## 📝 Summary

**Current Implementation**:
- ✅ Properly configured for development
- ✅ Directory structure in Git
- ✅ Files excluded from Git
- ✅ Server ready to serve files
- ⚠️ Needs persistent storage for production

**Next Step**:
- Add Railway Volume (recommended for now)
- Or migrate to Cloudinary/S3 (better for production)

**Everything is ready!** Just add persistent storage and you're good to go! 🎉

