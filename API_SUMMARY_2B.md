# API Endpoints Created - Task 2-b

## 1. Exam System API

### `/api/exams/route.ts` (GET, POST)
- **GET**: List all exams with pagination
  - Filters: subjectId, teacherId, classId, isActive
  - Includes: questions, subject, teacher, _count
  - Authorization: ADMIN, TEACHER (teachers see only their exams)
  
- **POST**: Create a new exam
  - Creates exam with questions
  - Creates ExamAssignment for each class in classIds array
  - Authorization: ADMIN, TEACHER

### `/api/exams/[id]/route.ts` (GET, PUT, DELETE)
- **GET**: Get exam by ID with all questions
- **PUT**: Update exam (title, description, dates, classIds)
- **DELETE**: Delete exam (cascade deletes related records)
- Authorization: ADMIN, TEACHER (teachers can only update/delete their own)

### `/api/exams/[id]/submit/route.ts` (POST)
- **POST**: Submit exam answers
  - Auto-grades MCQ questions using correctAnswer field
  - Calculates total marks and percentage
  - Creates ExamResult record
  - Authorization: STUDENT

### `/api/exams/[id]/results/route.ts` (GET)
- **GET**: Get all results for an exam
  - Includes student info
  - Pagination support
  - Authorization: ADMIN, TEACHER (teachers see only their exams)

## 2. Schedule/Timetable API

### `/api/schedules/route.ts` (GET, POST)
- **GET**: List all schedules with pagination
  - Filters: classId, teacherId, subjectId, dayOfWeek, term
  - Includes: class, subject, teacher info
  - Authorization: All authenticated users
  - Teachers see only their own schedules
  
- **POST**: Create a new schedule
  - Conflict checking for same teacher or class at same time
  - Uses `hasTimeConflict` helper function
  - Authorization: ADMIN

### `/api/schedules/[id]/route.ts` (GET, PUT, DELETE)
- **GET**: Get schedule by ID
- **PUT**: Update schedule with conflict checking
- **DELETE**: Delete schedule
- Authorization: GET (all authenticated), PUT/DELETE (ADMIN)

### `/api/schedules/conflict-check/route.ts` (POST)
- **POST**: Check if a schedule would conflict with existing ones
  - Returns conflicts array or empty
  - Accepts CreateScheduleDTO or UpdateScheduleDTO with id
  - Authorization: ADMIN, TEACHER

## 3. Attendance API

### `/api/attendance/route.ts` (GET, POST)
- **GET**: List all attendance with pagination
  - Filters: studentId, date, classId, status, month, year
  - Includes: student info with user and class
  - Authorization: All authenticated users
  
- **POST**: Create attendance record
  - Validates student exists
  - Checks for duplicate attendance (student + date unique constraint)
  - Authorization: ADMIN, TEACHER

### `/api/attendance/bulk/route.ts` (POST)
- **POST**: Bulk create attendance for a class
  - Creates multiple attendance records in transaction
  - Deletes existing records for class on that date
  - Authorization: ADMIN, TEACHER

### `/api/attendance/[id]/route.ts` (GET, PUT, DELETE)
- **GET**: Get attendance by ID
  - Students can only view their own attendance
- **PUT**: Update attendance (status, remarks)
- **DELETE**: Delete attendance
- Authorization: GET (all), PUT/DELETE (ADMIN, TEACHER)

### `/api/attendance/report/route.ts` (GET)
- **GET**: Generate monthly attendance report
  - Query params: studentId, classId, month, year
  - Returns AttendanceReportDTO with stats and daily details
  - Calculates attendance percentage
  - Authorization: All authenticated (students only see own data)

### `/api/attendance/today/route.ts` (GET)
- **GET**: Get today's attendance for a class
  - Query param: classId (required)
  - Returns all students with their attendance status
  - Defaults to ABSENT for students without records
  - Authorization: All authenticated

## 4. Dashboard API

### `/api/dashboard/stats/route.ts` (GET)
- **GET**: Get dashboard statistics
  - Counts: totalStudents, totalTeachers, totalParents, totalClasses, totalSubjects
  - Exams: totalExams, activeExams
  - todayAttendance: present, absent, total, percentage
  - monthlyTrends: Last 6 months (students, exams)
  - recentActivities: Last 10 audit logs
  - upcomingExams: Next 5 exams with class info
  - Authorization: ADMIN only

## Common Features

All endpoints include:
- JWT authentication using `getCurrentUser` middleware
- Role-based authorization using `hasRole` helper
- Audit logging for create/update/delete operations
- Proper error handling with try-catch
- Consistent response format using `ApiResponse` and `PaginatedResponse`
- Transaction support for data consistency
- IP address logging using `getClientIP` helper

## Helper Functions Used

- `hasTimeConflict()`: Check for schedule conflicts
- `calculatePercentage()`: Calculate percentages with rounding
- `getGrade()`: Get letter grade from percentage
- `getMonthName()`: Get month name from number
- `safeParseJSON()`: Safely parse JSON strings
