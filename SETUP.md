# HR Project - Installation Guide

## Requirements
- Node.js (v18 or higher)
- npm
- MySQL Database

## Installation Steps

### 1. Clone Repository
```bash
git clone <repository-url>
cd HrProject
```

### 2. Backend Setup
```bash
cd hr-backend-api

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your database credentials
# Update: DB_HOST, DB_USER, DB_PASS, DB_NAME

# Start backend server (development mode with nodemon)
npm run dev
```

### 3. Frontend Setup (in a new terminal)
```bash
cd hr-frontend

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env if needed (default should work if backend is on localhost:5000)

# Start frontend server
npm run dev
```

## Running the Project

**Terminal 1 - Backend:**
```bash
cd hr-backend-api
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd hr-frontend
npm run dev
```

Frontend will open at: `http://localhost:3000`  
Backend API: `http://localhost:5000`

## Database Setup
- Create MySQL database: `hrdata`
- Update connection credentials in `hr-backend-api/.env`

## Troubleshooting

### Port already in use
- Change `PORT` in `.env` (backend)
- Use `lsof -i :3000` (frontend) or `fuser 5000/tcp` (backend) to find process

### Missing dependencies
```bash
npm install
```

### Database connection error
- Check MySQL is running
- Verify credentials in `.env`
- Ensure database `hrdata` exists

## Environment Variables

### Backend (.env)
```
PORT=5000                    # Backend server port
DB_HOST=localhost            # MySQL host
DB_USER=root                 # MySQL user
DB_PASS=                     # MySQL password
DB_NAME=hrdata              # Database name
JWT_SECRET=mysecretkey1234  # JWT secret key
```

### Frontend (.env)
```
NEXT_PUBLIC_API_URL=http://localhost:5000  # Backend API URL
```
