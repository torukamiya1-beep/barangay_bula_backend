# 🔧 Git Setup and Push Commands

This guide provides the exact commands to initialize Git repositories and push your code to GitHub.

---

## 📋 Prerequisites

1. ✅ Git installed on your computer
2. ✅ GitHub account created
3. ✅ GitHub repositories created:
   - Frontend: https://github.com/torukamiya1-beep/barangay-bula-docu-hub.git
   - Backend: https://github.com/torukamiya1-beep/barangay_bula_backend.git

---

## 🔙 BACKEND: Push to GitHub

### Step 1: Open PowerShell

```powershell
# Open PowerShell as Administrator (optional but recommended)
# Press Windows + X, then select "Windows PowerShell (Admin)"
```

### Step 2: Navigate to Backend Directory

```powershell
cd D:\brgy_docu_hub\rhai_backend
```

### Step 3: Configure Git (First Time Only)

```powershell
# Set your Git username (use your GitHub username)
git config --global user.name "torukamiya1-beep"

# Set your Git email (use your GitHub email)
git config --global user.email "your-email@example.com"
```

### Step 4: Initialize Git Repository

```powershell
# Initialize Git repository
git init

# Check status (see what files will be committed)
git status
```

### Step 5: Add All Files

```powershell
# Add all files to staging
git add .

# Verify files are staged
git status
```

### Step 6: Create Initial Commit

```powershell
# Create first commit
git commit -m "Initial commit - Backend for production deployment"
```

### Step 7: Set Main Branch

```powershell
# Rename branch to main
git branch -M main
```

### Step 8: Add Remote Repository

```powershell
# Add GitHub repository as remote
git remote add origin https://github.com/torukamiya1-beep/barangay_bula_backend.git

# Verify remote was added
git remote -v
```

### Step 9: Push to GitHub

```powershell
# Push to GitHub
git push -u origin main
```

**Note:** You may be prompted to login to GitHub. Use your GitHub credentials.

### Step 10: Verify on GitHub

1. Go to https://github.com/torukamiya1-beep/barangay_bula_backend
2. Refresh the page
3. You should see all your backend files

---

## 🎨 FRONTEND: Push to GitHub

### Step 1: Navigate to Frontend Directory

```powershell
# In the same PowerShell window
cd D:\brgy_docu_hub\BOSFDR
```

### Step 2: Initialize Git Repository

```powershell
# Initialize Git repository
git init

# Check status
git status
```

### Step 3: Add All Files

```powershell
# Add all files to staging
git add .

# Verify files are staged
git status
```

### Step 4: Create Initial Commit

```powershell
# Create first commit
git commit -m "Initial commit - Frontend for production deployment"
```

### Step 5: Set Main Branch

```powershell
# Rename branch to main
git branch -M main
```

### Step 6: Add Remote Repository

```powershell
# Add GitHub repository as remote
git remote add origin https://github.com/torukamiya1-beep/barangay-bula-docu-hub.git

# Verify remote was added
git remote -v
```

### Step 7: Push to GitHub

```powershell
# Push to GitHub
git push -u origin main
```

### Step 8: Verify on GitHub

1. Go to https://github.com/torukamiya1-beep/barangay-bula-docu-hub
2. Refresh the page
3. You should see all your frontend files

---

## 🔍 Troubleshooting

### Problem: "git: command not found"

**Solution:** Install Git
1. Download from: https://git-scm.com/download/win
2. Run installer
3. Restart PowerShell
4. Try again

### Problem: "Permission denied (publickey)"

**Solution:** Use HTTPS instead of SSH (already using HTTPS in commands above)

If still having issues:
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo` (all)
4. Copy token
5. When pushing, use token as password

### Problem: "Repository not found"

**Solution:** Verify repository URL
```powershell
# Check remote URL
git remote -v

# If wrong, remove and re-add
git remote remove origin
git remote add origin https://github.com/torukamiya1-beep/barangay_bula_backend.git
```

### Problem: "fatal: not a git repository"

**Solution:** Make sure you're in the correct directory
```powershell
# Check current directory
pwd

# Navigate to correct directory
cd D:\brgy_docu_hub\rhai_backend
# or
cd D:\brgy_docu_hub\BOSFDR
```

### Problem: "Updates were rejected"

**Solution:** Force push (only for initial setup)
```powershell
git push -u origin main --force
```

**Warning:** Only use `--force` for initial setup. Never use it after others have cloned the repository!

### Problem: Large files causing issues

**Solution:** Check .gitignore
```powershell
# View .gitignore
cat .gitignore

# If node_modules is being tracked, remove it
git rm -r --cached node_modules
git commit -m "Remove node_modules from tracking"
git push
```

---

## 📝 Useful Git Commands

### Check Status
```powershell
git status
```

### View Commit History
```powershell
git log --oneline
```

### View Remote URL
```powershell
git remote -v
```

### View Branches
```powershell
git branch -a
```

### Undo Last Commit (Keep Changes)
```powershell
git reset --soft HEAD~1
```

### Undo All Changes (Dangerous!)
```powershell
git reset --hard HEAD
```

---

## 🔄 Making Updates After Initial Push

### When You Make Changes to Code

```powershell
# 1. Check what changed
git status

# 2. Add changed files
git add .

# 3. Commit changes
git commit -m "Description of changes"

# 4. Push to GitHub
git push
```

### Example: Update Environment Variables

```powershell
# Navigate to backend
cd D:\brgy_docu_hub\rhai_backend

# Make your changes to files...

# Add changes
git add .

# Commit
git commit -m "Update environment variables for production"

# Push
git push
```

---

## 🌿 Working with Branches (Optional)

### Create New Branch
```powershell
git checkout -b feature/new-feature
```

### Switch Branches
```powershell
git checkout main
```

### Merge Branch
```powershell
git checkout main
git merge feature/new-feature
```

### Delete Branch
```powershell
git branch -d feature/new-feature
```

---

## ✅ Verification Checklist

After pushing both repositories:

### Backend Repository
- [ ] Go to https://github.com/torukamiya1-beep/barangay_bula_backend
- [ ] Verify files are visible
- [ ] Check `package.json` exists
- [ ] Check `server.js` exists
- [ ] Check `.env.production.example` exists
- [ ] Check `railway.json` exists

### Frontend Repository
- [ ] Go to https://github.com/torukamiya1-beep/barangay-bula-docu-hub
- [ ] Verify files are visible
- [ ] Check `package.json` exists
- [ ] Check `src/` directory exists
- [ ] Check `.env.production` exists
- [ ] Check `vercel.json` exists

---

## 🎯 Next Steps

After successfully pushing to GitHub:

1. ✅ **Deploy Backend to Railway**
   - Follow `DEPLOYMENT_GUIDE.md` Phase 2

2. ✅ **Deploy Frontend to Vercel**
   - Follow `DEPLOYMENT_GUIDE.md` Phase 4

3. ✅ **Configure PayMongo Webhook**
   - Follow `PAYMONGO_WEBHOOK_SETUP.md`

---

## 📚 Additional Resources

- **Git Documentation**: https://git-scm.com/doc
- **GitHub Guides**: https://guides.github.com
- **Git Cheat Sheet**: https://education.github.com/git-cheat-sheet-education.pdf

---

## 🆘 Need Help?

If you encounter issues:

1. **Check Git version:**
   ```powershell
   git --version
   ```
   Should be 2.x or higher

2. **Check GitHub authentication:**
   ```powershell
   git config --list
   ```
   Verify user.name and user.email are set

3. **Clear Git cache:**
   ```powershell
   git rm -r --cached .
   git add .
   git commit -m "Clear cache"
   ```

4. **Start fresh (if needed):**
   ```powershell
   # Remove .git directory
   Remove-Item -Recurse -Force .git
   
   # Start over from Step 4
   git init
   ```

---

## ✨ Success!

Once both repositories are pushed to GitHub:
- ✅ Your code is safely backed up
- ✅ Ready for Railway deployment
- ✅ Ready for Vercel deployment
- ✅ Can collaborate with team members
- ✅ Version control enabled

Proceed to `DEPLOYMENT_GUIDE.md` for deployment instructions! 🚀

