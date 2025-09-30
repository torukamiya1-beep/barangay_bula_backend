# Rhai Backend - Node.js MVC API

A robust Node.js backend API built with Express.js following the MVC (Model-View-Controller) architecture pattern, designed for the 'barangay_management_system' MySQL database.

## 🚀 Features

- **MVC Architecture**: Clean separation of concerns with Models, Views (API responses), and Controllers
- **MySQL Database**: Full integration with MySQL using connection pooling
- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Input Validation**: Comprehensive request validation using express-validator
- **Security**: Helmet, CORS, rate limiting, and password hashing
- **Error Handling**: Centralized error handling with detailed logging
- **API Documentation**: RESTful API design with consistent response format
- **Environment Configuration**: Flexible configuration using environment variables
- **Logging System**: Comprehensive logging for debugging and monitoring

## 📁 Project Structure

```
rhai_backend/
├── src/
│   ├── controllers/        # Request handlers and business logic
│   │   ├── authController.js
│   │   └── userController.js
│   ├── models/            # Database models and data access layer
│   │   └── User.js
│   ├── routes/            # API route definitions
│   │   ├── authRoutes.js
│   │   └── userRoutes.js
│   ├── middleware/        # Custom middleware functions
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   └── validation.js
│   ├── services/          # Business logic and external integrations
│   │   ├── authService.js
│   │   └── userService.js
│   ├── config/            # Configuration files
│   │   └── database.js
│   └── utils/             # Helper utilities
│       ├── logger.js
│       └── response.js
├── tests/                 # Test files
├── public/                # Static files
├── logs/                  # Application logs
├── package.json
├── server.js              # Application entry point
├── .env.example           # Environment variables template
├── .gitignore
└── README.md
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rhai_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=7000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=barangay_management_system
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Set up MySQL database**
   - Create a MySQL database named `barangay_management_system`
   - The application will automatically create the required tables on startup

5. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/register` | Register new user | Public |
| POST | `/login` | User login | Public |
| GET | `/me` | Get current user profile | Private |
| PUT | `/profile` | Update user profile | Private |
| PUT | `/change-password` | Change password | Private |
| POST | `/logout` | User logout | Private |

### User Management Routes (`/api/users`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/` | Get all users (paginated) | Admin |
| POST | `/` | Create new user | Admin |
| GET | `/search` | Search users | Admin |
| GET | `/role/:role` | Get users by role | Admin |
| GET | `/:id` | Get user by ID | Admin |
| PUT | `/:id` | Update user | Admin |
| DELETE | `/:id` | Delete user (soft delete) | Admin |
| PATCH | `/:id/toggle-status` | Activate/Deactivate user | Admin |

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles
- **admin**: Full access to all endpoints
- **user**: Limited access to own profile
- **moderator**: Extended access (customizable)

## 📝 Request/Response Format

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🔧 Development

```bash
# Start development server with auto-restart
npm run dev

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'user', 'moderator') DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🚀 Deployment

1. Set environment variables for production
2. Ensure MySQL database is accessible
3. Run `npm start` to start the production server

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please create an issue in the repository.
