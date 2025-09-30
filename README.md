# 🏛️ Barangay Bula Document Management System

A comprehensive web-based document management system for Barangay Bula, enabling residents to request official documents online with integrated payment processing.

---

## 📋 System Overview

This system consists of two main components:

### 🎨 Frontend (Vue.js)
- **Location**: `BOSFDR/`
- **Technology**: Vue.js 3, Tailwind CSS, Axios
- **Deployment**: Vercel
- **Repository**: https://github.com/torukamiya1-beep/barangay-bula-docu-hub.git

### 🔙 Backend (Node.js/Express)
- **Location**: `rhai_backend/`
- **Technology**: Node.js, Express, MySQL
- **Deployment**: Railway
- **Repository**: https://github.com/torukamiya1-beep/barangay_bula_backend.git

---

## ✨ Features

### For Residents (Clients)
- 📝 Online document request submission
- 💳 Integrated online payment via PayMongo
- 📊 Real-time request tracking
- 📧 Email notifications
- 📱 SMS notifications (TextBee)
- 🧾 Digital receipts
- 📄 Document history
- 👤 Profile management

### For Barangay Staff (Admin)
- 📋 Document request management
- ✅ Request approval workflow
- 💰 Payment verification
- 📊 Analytics and reporting
- 👥 User management
- 📈 Activity logging
- 🗄️ Archive management

### Document Types Supported
- Barangay Clearance
- Certificate of Residency
- Certificate of Indigency
- Barangay ID
- Community Tax Certificate (Cedula)
- Business Permit

---

## 🚀 Quick Start

### For Development

1. **Clone the repositories**
2. **Setup Backend**:
   ```bash
   cd rhai_backend
   npm install
   cp .env.example .env
   # Configure .env with your settings
   npm start
   ```

3. **Setup Frontend**:
   ```bash
   cd BOSFDR
   npm install
   cp .env.example .env
   # Configure .env with backend URL
   npm run serve
   ```

### For Production Deployment

Follow these guides in order:

1. **📖 [GIT_SETUP_COMMANDS.md](GIT_SETUP_COMMANDS.md)**
   - Initialize Git repositories
   - Push code to GitHub

2. **📖 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**
   - Deploy backend to Railway
   - Setup MySQL database
   - Deploy frontend to Vercel
   - Configure environment variables

3. **📖 [PAYMONGO_WEBHOOK_SETUP.md](PAYMONGO_WEBHOOK_SETUP.md)**
   - Configure PayMongo webhooks
   - Test payment integration

4. **📖 [rhai_backend/RAILWAY_DATABASE_SETUP.md](rhai_backend/RAILWAY_DATABASE_SETUP.md)**
   - Detailed database migration guide
   - Database backup and restore

---

## 📁 Project Structure

```
brgy_docu_hub/
├── BOSFDR/                          # Frontend (Vue.js)
│   ├── src/
│   │   ├── components/              # Vue components
│   │   ├── services/                # API services
│   │   ├── router/                  # Vue Router
│   │   └── assets/                  # Static assets
│   ├── public/                      # Public files
│   ├── .env.production              # Production environment
│   ├── vercel.json                  # Vercel configuration
│   └── package.json
│
├── rhai_backend/                    # Backend (Node.js/Express)
│   ├── src/
│   │   ├── controllers/             # Request handlers
│   │   ├── models/                  # Database models
│   │   ├── routes/                  # API routes
│   │   ├── services/                # Business logic
│   │   ├── middleware/              # Custom middleware
│   │   └── config/                  # Configuration
│   ├── uploads/                     # File uploads
│   ├── migrations/                  # Database migrations
│   ├── .env.production.example      # Production env template
│   ├── railway.json                 # Railway configuration
│   ├── server.js                    # Entry point
│   └── package.json
│
├── DEPLOYMENT_GUIDE.md              # Main deployment guide
├── GIT_SETUP_COMMANDS.md            # Git setup instructions
├── PAYMONGO_WEBHOOK_SETUP.md        # PayMongo configuration
└── README.md                        # This file
```

---

## 🔧 Technology Stack

### Frontend
- **Framework**: Vue.js 3
- **Styling**: Tailwind CSS, Bootstrap 5
- **HTTP Client**: Axios
- **Routing**: Vue Router
- **Form Validation**: Vee-Validate
- **Charts**: Chart.js
- **PDF Generation**: jsPDF
- **Excel Export**: XLSX

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Authentication**: JWT
- **Password Hashing**: bcryptjs
- **File Upload**: Multer
- **Email**: Nodemailer (Gmail SMTP)
- **Payment**: PayMongo API
- **SMS**: TextBee API (optional)

### Deployment
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway
- **Database**: Railway MySQL
- **Version Control**: GitHub

---

## 🔐 Security Features

- 🔒 JWT-based authentication
- 🔑 Bcrypt password hashing
- 🛡️ Helmet.js security headers
- 🚦 Rate limiting
- 🔐 CORS configuration
- 📝 Activity logging
- 🔍 Input validation
- 🚫 SQL injection prevention

---

## 💳 Payment Integration

### PayMongo
- **Test Mode**: For development
- **Live Mode**: For production
- **Payment Methods**: 
  - Credit/Debit Cards
  - GCash
  - GrabPay
  - PayMaya
- **Webhook Integration**: Real-time payment status updates

---

## 📧 Notification System

### Email Notifications
- Account verification
- OTP codes
- Request status updates
- Payment confirmations
- Document ready notifications

### SMS Notifications (Optional)
- OTP verification
- Payment confirmations
- Quick status updates

---

## 🗄️ Database Schema

### Main Tables
- `client_accounts` - Resident accounts
- `admin_employee_accounts` - Staff accounts
- `document_requests` - Document requests
- `receipts` - Payment receipts
- `payment_webhooks` - PayMongo webhooks
- `residency_documents` - Uploaded documents
- `audit_logs` - System activity logs
- `notifications` - User notifications

---

## 🌐 Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=7000
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
JWT_SECRET=your-jwt-secret
FRONTEND_URL=https://your-frontend-url
PAYMONGO_SECRET_KEY=your-paymongo-key
WEBHOOK_URL=https://your-backend-url/api/webhooks/paymongo
EMAIL_USER=your-email
EMAIL_PASS=your-email-password
```

### Frontend (.env)
```env
VUE_APP_API_URL=https://your-backend-url/api
VUE_APP_APP_NAME=Barangay Bula Management System
VUE_APP_VERSION=1.0.0
```

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/unified/login` - Unified login
- `POST /api/auth/unified/register` - Client registration
- `POST /api/auth/unified/verify-otp` - OTP verification
- `POST /api/auth/unified/logout` - Logout

### Document Requests
- `GET /api/client/document-requests` - Get requests
- `POST /api/client/document-requests` - Create request
- `GET /api/client/document-requests/:id` - Get request details
- `PUT /api/client/document-requests/:id` - Update request

### Payments
- `POST /api/payments/initiate` - Initiate payment
- `POST /api/webhooks/paymongo` - PayMongo webhook

### Admin
- `GET /api/admin/documents` - Get all requests
- `PUT /api/admin/documents/:id/status` - Update status
- `GET /api/admin/activity-logs` - Get activity logs

---

## 🧪 Testing

### Backend Tests
```bash
cd rhai_backend
npm test
```

### Frontend Tests
```bash
cd BOSFDR
npm run test
```

---

## 📝 Development Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and test locally**

3. **Commit changes**
   ```bash
   git add .
   git commit -m "Add new feature"
   ```

4. **Push to GitHub**
   ```bash
   git push origin feature/new-feature
   ```

5. **Create Pull Request**

6. **Deploy to production** (after merge)

---

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
- Check database credentials
- Verify database is running
- Check network connectivity

**CORS Errors**
- Verify FRONTEND_URL in backend
- Check CORS configuration
- Ensure URLs match exactly

**Payment Not Working**
- Verify PayMongo keys
- Check webhook configuration
- Review PayMongo dashboard

**File Upload Issues**
- Check uploads directory exists
- Verify file size limits
- Check file permissions

---

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [Git Setup](GIT_SETUP_COMMANDS.md) - Git initialization and push
- [PayMongo Setup](PAYMONGO_WEBHOOK_SETUP.md) - Payment integration
- [Database Setup](rhai_backend/RAILWAY_DATABASE_SETUP.md) - Database migration

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

---

## 📄 License

This project is proprietary software developed for Barangay Bula.

---

## 👥 Team

- **Developer**: [Your Name]
- **Client**: Barangay Bula
- **Project**: Document Management System

---

## 📞 Support

For issues or questions:
- **Email**: barangaybula45@gmail.com
- **GitHub Issues**: Create issue in respective repository

---

## 🎉 Acknowledgments

- Vue.js team for the amazing framework
- Express.js community
- PayMongo for payment integration
- Railway and Vercel for hosting

---

## 🚀 Deployment Status

- **Frontend**: [![Vercel](https://img.shields.io/badge/Vercel-Deployed-success)](https://your-app.vercel.app)
- **Backend**: [![Railway](https://img.shields.io/badge/Railway-Deployed-success)](https://your-app.up.railway.app)
- **Database**: [![Railway MySQL](https://img.shields.io/badge/MySQL-Connected-success)](https://railway.app)

---

**Last Updated**: 2025-09-30
**Version**: 1.0.0
**Status**: Production Ready ✅

