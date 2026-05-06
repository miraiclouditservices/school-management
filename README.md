# School ERP - Backend API

Production-grade Node.js + Express + MongoDB backend for the School ERP system.

## Features

- **Authentication** – JWT-based with role-based access (Admin / Staff / Student)
- **Academic Year Management** – LKG, UKG, Classes 1-12 with sections, subjects, grading
- **Admissions & Inquiry** – Full inquiry pipeline with conversion to student admission
- **Student Profiles** – Complete student data (personal, academic, parent, medical, transport)
- **Staff Management** – Staff profiles, department-wise, designation tracking
- **Fee Management** – Fee structures, payment collection, receipts, balance tracking
- **Timetable** – Class-wise & teacher-wise timetable, period management
- **Attendance** – Daily/period-wise attendance, stats, low-attendance alerts
- **Accounts** – Income/Expense transactions, reports
- **Payroll** – Auto-generate, bulk process, salary breakdowns
- **Marks & Report Cards** – Mark entry, auto-grading, approval workflow, report cards
- **Events & Notices** – School events and notice board
- **File Uploads** – Cloudinary (production) / local disk (development)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env from example
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, Cloudinary keys

# 3. Seed database with dummy data
npm run seed

# 4. Start server
npm run dev   # development (with nodemon)
npm start     # production
```

## API Endpoints

| Module | Base URL | Methods |
|--------|----------|---------|
| Auth | `/api/auth` | POST /register, /login, GET /me, PUT /change-password |
| Academic Years | `/api/academic-years` | CRUD + GET /current |
| Inquiries | `/api/inquiries` | CRUD + GET /stats, POST /:id/convert |
| Students | `/api/students` | CRUD + POST /promote |
| Staff | `/api/staff` | CRUD + GET /stats |
| Fees | `/api/fees` | CRUD + GET /stats, POST /:id/pay |
| Timetable | `/api/timetable` | CRUD + GET /teacher/:id |
| Attendance | `/api/attendance` | CRUD + GET /stats, /student/:id |
| Accounts | `/api/accounts` | CRUD + GET /stats |
| Payroll | `/api/payroll` | CRUD + POST /generate, /run, GET /stats |
| Marks | `/api/marks` | CRUD + PUT /:id/approve, GET /stats, /report-card/:id |
| Events | `/api/events` | CRUD + GET /stats |
| Notices | `/api/notices` | CRUD + GET /stats |
| Dashboard | `/api/dashboard` | GET /admin, /staff, /student |
| Upload | `/api/upload` | POST /image, /document, /images |

## Login Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@school.edu | admin123 |
| Staff | singh@school.edu | staff123 |
| Student | adm2024-0001@school.edu | student123 |

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Configure MongoDB Atlas URI
3. Set Cloudinary credentials for file storage
4. Use PM2 or Docker for process management:
   ```bash
   pm2 start server.js --name school-erp
   ```

## Environment Variables

| Variable | Description |
|----------|-------------|
| PORT | Server port (default: 5000) |
| NODE_ENV | development / production |
| MONGODB_URI | MongoDB connection string |
| JWT_SECRET | Secret key for JWT tokens |
| JWT_EXPIRE | Token expiry (e.g., 7d) |
| CLOUDINARY_CLOUD_NAME | Cloudinary cloud name |
| CLOUDINARY_API_KEY | Cloudinary API key |
| CLOUDINARY_API_SECRET | Cloudinary API secret |
| FRONTEND_URL | Frontend URL for CORS |
