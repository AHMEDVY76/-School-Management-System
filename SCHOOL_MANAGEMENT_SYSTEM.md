# School Management System - Complete Documentation

## 📋 Project Overview

A comprehensive, enterprise-grade School Management System built with modern technologies, featuring role-based access control, exam management with auto-grading, schedule management with conflict detection, and detailed reporting.

---

## 🛠 Technology Stack

### Core Framework
- **Next.js 16** - React framework with App Router
- **TypeScript 5** - Type-safe development
- **Prisma ORM** - Database management with SQLite (easily scalable to PostgreSQL)

### Frontend
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - Professional UI component library
- **Zustand** - State management
- **React Hook Form + Zod** - Form validation
- **Sonner** - Toast notifications

### Backend & Security
- **JWT Authentication** - Secure token-based auth
- **bcrypt** - Password hashing
- **Role-Based Access Control** - Admin, Teacher, Student, Parent

---

## 🗄 Database Design (ERD)

### Core Entities

#### Users & Authentication
- **User** - Base user table with roles
- **RefreshToken** - Token management
- **AuditLog** - Activity tracking

#### Student Management
- **Student** - Student profiles linked to User
- **Class** - Classes/sections with capacity
- **Parent** - Parent/guardian profiles
- **ParentStudent** - Many-to-many relationship between parents and students

#### Teacher Management
- **Teacher** - Teacher profiles linked to User
- **TeacherSubject** - Subject assignments for teachers

#### Academic Structure
- **Subject** - Subjects with credits
- **SubjectClass** - Subject assignments to classes

#### Exam System
- **Exam** - Exam definitions with date range
- **ExamAssignment** - Assign exams to classes
- **Question** - MCQ and Essay questions
- **ExamAnswer** - Student answers
- **ExamResult** - Calculated results with grades

#### Schedule Management
- **Schedule** - Weekly timetables with conflict prevention

#### Attendance
- **Attendance** - Daily attendance records

---

## 🔐 Security Features

1. **JWT Authentication**
   - Access tokens (15 min expiry)
   - Refresh tokens (7 day expiry)
   - Automatic token refresh

2. **Role-Based Access Control**
   - ADMIN - Full access
   - TEACHER - Manage assigned subjects and exams
   - STUDENT - View and take assigned exams
   - PARENT - View children's data

3. **Audit Logging**
   - All create/update/delete actions logged
   - IP address tracking
   - User attribution

4. **Password Security**
   - bcrypt hashing with salt
   - Secure password requirements

---

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Students (`/api/students`)
- `GET /api/students` - List students (paginated, searchable)
- `POST /api/students` - Create student
- `GET /api/students/[id]` - Get student by ID
- `PUT /api/students/[id]` - Update student
- `DELETE /api/students/[id]` - Delete student

### Teachers (`/api/teachers`)
- `GET /api/teachers` - List teachers
- `POST /api/teachers` - Create teacher with subjects
- `GET /api/teachers/[id]` - Get teacher by ID
- `PUT /api/teachers/[id]` - Update teacher
- `DELETE /api/teachers/[id]` - Delete teacher

### Classes (`/api/classes`)
- `GET /api/classes` - List classes with student counts
- `POST /api/classes` - Create class
- `GET /api/classes/[id]` - Get class by ID
- `PUT /api/classes/[id]` - Update class
- `DELETE /api/classes/[id]` - Delete class

### Subjects (`/api/subjects`)
- `GET /api/subjects` - List subjects
- `POST /api/subjects` - Create subject
- `GET /api/subjects/[id]` - Get subject by ID
- `PUT /api/subjects/[id]` - Update subject
- `DELETE /api/subjects/[id]` - Delete subject

### Exams (`/api/exams`)
- `GET /api/exams` - List exams with filters
- `POST /api/exams` - Create exam with questions
- `GET /api/exams/[id]` - Get exam with questions
- `PUT /api/exams/[id]` - Update exam
- `DELETE /api/exams/[id]` - Delete exam
- `POST /api/exams/[id]/submit` - Submit exam answers (auto-grades MCQ)
- `GET /api/exams/[id]/results` - Get exam results

### Schedules (`/api/schedules`)
- `GET /api/schedules` - List schedules
- `POST /api/schedules` - Create schedule (checks conflicts)
- `GET /api/schedules/[id]` - Get schedule by ID
- `PUT /api/schedules/[id]` - Update schedule
- `DELETE /api/schedules/[id]` - Delete schedule
- `POST /api/schedules/conflict-check` - Check for conflicts

### Attendance (`/api/attendance`)
- `GET /api/attendance` - List attendance records
- `POST /api/attendance` - Create attendance record
- `POST /api/attendance/bulk` - Bulk create for class
- `GET /api/attendance/[id]` - Get attendance by ID
- `PUT /api/attendance/[id]` - Update attendance
- `DELETE /api/attendance/[id]` - Delete attendance
- `GET /api/attendance/report` - Monthly attendance report
- `GET /api/attendance/today` - Today's class attendance

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/stats` - Comprehensive statistics

---

## 🚀 How to Run the Project

### 1. Install Dependencies
```bash
bun install
```

### 2. Setup Database
```bash
# Push schema to database
bun run db:push

# This creates the SQLite database and all tables
```

### 3. Start Development Server
```bash
bun run dev
```

The application will be available at: **http://localhost:3000**

### 4. Create First Admin Account

Use the registration page to create your first admin user:
1. Navigate to `/register`
2. Fill in the form:
   - Email: admin@school.edu
   - Password: (your choice, min 6 chars)
   - Name: Administrator
   - Role: **ADMIN**
3. After registration, you'll be redirected to the dashboard

---

## 📊 Dashboard Features

- **Real-time Statistics**
  - Total students, teachers, classes
  - Active exams count
  - Today's attendance overview

- **Quick Actions**
  - Navigate to Students, Teachers, Exams, Attendance

- **Upcoming Exams**
  - View scheduled exams
  - Filter by subject and class

- **Recent Activity**
  - Track system changes
  - Audit log display

---

## 🎯 Key Features

### 1. User Management
- ✅ Role-based access (Admin, Teacher, Student, Parent)
- ✅ Secure authentication with JWT
- ✅ Token refresh mechanism
- ✅ Audit logging

### 2. Student Management
- ✅ Create/Edit/Delete students
- ✅ Assign to classes
- ✅ Link with parents
- ✅ Track enrollment date

### 3. Teacher Management
- ✅ Create/Edit/Delete teachers
- ✅ Assign subjects
- ✅ Track qualifications
- ✅ Manage schedule

### 4. Exam System
- ✅ Create exams with MCQ and Essay questions
- ✅ Auto-grade MCQ questions
- ✅ Manual grading for essays
- ✅ Assign exams to classes
- ✅ Calculate grades and percentages
- ✅ View detailed results

### 5. Schedule Management
- ✅ Create weekly schedules
- ✅ Conflict detection (time, teacher, class)
- ✅ Room assignments
- ✅ Term management

### 6. Attendance Tracking
- ✅ Individual attendance recording
- ✅ Bulk attendance for classes
- ✅ Monthly reports
- ✅ Status tracking (Present, Absent, Late, Excused)
- ✅ Attendance percentage calculation

### 7. Dashboard
- ✅ Real-time statistics
- ✅ Visual indicators
- ✅ Quick navigation
- ✅ Activity feed

---

## 📝 API Usage Examples (Postman)

### 1. Register a New User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "teacher@school.edu",
  "password": "securepass123",
  "name": "John Smith",
  "role": "TEACHER"
}
```

### 2. Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@school.edu",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "admin@school.edu",
      "name": "Administrator",
      "role": "ADMIN"
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### 3. Create a Class
```bash
POST /api/classes
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Grade 10-A",
  "gradeLevel": 10,
  "section": "A",
  "capacity": 30
}
```

### 4. Create a Subject
```bash
POST /api/subjects
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Mathematics",
  "code": "MATH101",
  "credits": 4
}
```

### 5. Create an Exam with Questions
```bash
POST /api/exams
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Mathematics Midterm",
  "subjectId": "<subject_id>",
  "teacherId": "<teacher_id>",
  "duration": 90,
  "startDate": "2024-03-15T09:00:00Z",
  "endDate": "2024-03-15T10:30:00Z",
  "classIds": ["<class_id>"],
  "questions": [
    {
      "type": "MCQ",
      "question": "What is 2 + 2?",
      "marks": 1,
      "order": 1,
      "options": [
        {"id": 1, "text": "3"},
        {"id": 2, "text": "4"},
        {"id": 3, "text": "5"},
        {"id": 4, "text": "6"}
      ],
      "correctAnswer": "2"
    },
    {
      "type": "ESSAY",
      "question": "Explain the importance of mathematics in daily life.",
      "marks": 5,
      "order": 2
    }
  ]
}
```

### 6. Submit Exam Answers
```bash
POST /api/exams/<exam_id>/submit
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "examId": "<exam_id>",
  "studentId": "<student_id>",
  "answers": [
    {
      "questionId": "<question_id>",
      "answer": "2"
    },
    {
      "questionId": "<essay_question_id>",
      "answer": "Mathematics is important because..."
    }
  ]
}
```

### 7. Record Attendance (Bulk)
```bash
POST /api/attendance/bulk
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "date": "2024-03-15",
  "classId": "<class_id>",
  "attendance": [
    {
      "studentId": "<student_id_1>",
      "status": "PRESENT"
    },
    {
      "studentId": "<student_id_2>",
      "status": "ABSENT",
      "remarks": "Sick leave"
    }
  ]
}
```

---

## 🏗 Architecture

### Clean Architecture
- **API Routes** - Request handling and authorization
- **Services** - Business logic (auth, helpers)
- **Database** - Prisma ORM with type-safe queries
- **Types** - TypeScript interfaces for all DTOs

### File Structure
```
src/
├── app/
│   ├── api/              # API endpoints
│   │   ├── auth/
│   │   ├── students/
│   │   ├── teachers/
│   │   ├── classes/
│   │   ├── subjects/
│   │   ├── exams/
│   │   ├── schedules/
│   │   ├── attendance/
│   │   └── dashboard/
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── dashboard/        # Dashboard page
│   └── page.tsx          # Landing page
├── components/ui/        # shadcn/ui components
├── lib/
│   ├── auth.ts           # JWT auth service
│   ├── middleware.ts     # Auth middleware
│   ├── helpers.ts        # Utility functions
│   ├── db.ts             # Prisma client
│   └── apiClient.ts      # API request helper
├── stores/
│   └── authStore.ts      # Zustand auth store
└── types/
    └── index.ts          # TypeScript types
```

---

## 🔐 Security Best Practices

1. **Password Protection**
   - bcrypt hashing with salt rounds
   - Minimum password length: 6 characters

2. **Token Management**
   - Short-lived access tokens (15 min)
   - Refresh tokens with expiry (7 days)
   - Automatic token refresh

3. **API Protection**
   - All endpoints require valid JWT
   - Role-based authorization checks
   - Audit logging for sensitive operations

4. **SQL Injection Prevention**
   - Prisma ORM prevents SQL injection
   - Parameterized queries

---

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-first approach
- Tailwind CSS breakpoints
- Touch-friendly UI (44px minimum touch targets)
- Sticky footer implementation
- Adaptive layouts

---

## 🚀 Deployment

### Environment Variables
```env
DATABASE_URL="file:./db/custom.db"
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production"
```

### Production Build
```bash
bun run build
bun start
```

---

## 📈 Scalability Considerations

### Database
- Current: SQLite (development/small scale)
- Ready for: PostgreSQL (production/enterprise)
- Prisma makes database switching seamless

### Features
- Modular architecture allows easy feature additions
- Clean separation of concerns
- Type-safe database queries

---

## 🎓 Summary

This School Management System provides:

✅ **Complete Backend** - All CRUD operations, authentication, authorization
✅ **Security** - JWT auth, RBAC, audit logging, password hashing
✅ **Exam System** - MCQ + Essay with auto-grading
✅ **Schedule Management** - With conflict detection
✅ **Attendance** - Individual, bulk, and monthly reporting
✅ **Dashboard** - Real-time statistics and insights
✅ **Responsive UI** - Professional, mobile-friendly design
✅ **Enterprise Ready** - Scalable architecture, clean code

The system is production-ready and can be deployed immediately for small to medium-sized educational institutions.