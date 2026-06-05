// ============================================
// SHARED TYPES
// ============================================

export type UserRole = 'ADMIN' | 'STUDENT' | 'TEACHER' | 'PARENT';
export type QuestionType = 'MCQ' | 'ESSAY';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type DayOfWeek = 'SATURDAY' | 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// AUTH DTOs
// ============================================

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserDTO;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenDTO {
  token: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

// ============================================
// USER DTOs
// ============================================

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
  isActive?: boolean;
}

// ============================================
// STUDENT DTOs
// ============================================

export interface StudentDTO {
  id: string;
  userId: string;
  studentNumber: string;
  dateOfBirth: Date;
  gender: string;
  address: string | null;
  phone: string | null;
  emergencyContact: string | null;
  enrollmentDate: Date;
  classId: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: UserDTO;
  class?: ClassDTO;
  parents?: ParentDTO[];
}

export interface CreateStudentDTO {
  email: string;
  password: string;
  name: string;
  studentNumber: string;
  dateOfBirth: string;
  gender: string;
  address?: string;
  phone?: string;
  emergencyContact?: string;
  classId?: string;
  parentIds?: string[];
}

export interface UpdateStudentDTO {
  name?: string;
  address?: string;
  phone?: string;
  emergencyContact?: string;
  classId?: string;
  photoUrl?: string;
  isActive?: boolean;
}

// ============================================
// TEACHER DTOs
// ============================================

export interface TeacherDTO {
  id: string;
  userId: string;
  teacherNumber: string;
  qualification: string | null;
  specialization: string | null;
  phone: string | null;
  address: string | null;
  hireDate: Date;
  salary: number | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: UserDTO;
  subjects?: SubjectDTO[];
}

export interface CreateTeacherDTO {
  email: string;
  password: string;
  name: string;
  teacherNumber: string;
  qualification?: string;
  specialization?: string;
  phone?: string;
  address?: string;
  salary?: number;
  subjectIds?: string[];
}

export interface UpdateTeacherDTO {
  name?: string;
  qualification?: string;
  specialization?: string;
  phone?: string;
  address?: string;
  salary?: number;
  photoUrl?: string;
  isActive?: boolean;
  subjectIds?: string[];
}

// ============================================
// PARENT DTOs
// ============================================

export interface ParentDTO {
  id: string;
  userId: string;
  phone: string | null;
  occupation: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: UserDTO;
  students?: StudentDTO[];
}

export interface CreateParentDTO {
  email: string;
  password: string;
  name: string;
  phone?: string;
  occupation?: string;
  address?: string;
  studentIds?: string[];
}

export interface UpdateParentDTO {
  name?: string;
  phone?: string;
  occupation?: string;
  address?: string;
  isActive?: boolean;
}

// ============================================
// CLASS DTOs
// ============================================

export interface ClassDTO {
  id: string;
  name: string;
  gradeLevel: number;
  section: string | null;
  description: string | null;
  capacity: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    students: number;
  };
}

export interface CreateClassDTO {
  name: string;
  gradeLevel: number;
  section?: string;
  description?: string;
  capacity?: number;
}

export interface UpdateClassDTO {
  name?: string;
  gradeLevel?: number;
  section?: string;
  description?: string;
  capacity?: number;
  isActive?: boolean;
}

// ============================================
// SUBJECT DTOs
// ============================================

export interface SubjectDTO {
  id: string;
  name: string;
  code: string;
  description: string | null;
  credits: number;
  color: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubjectDTO {
  name: string;
  code: string;
  description?: string;
  credits?: number;
  color?: string;
}

export interface UpdateSubjectDTO {
  name?: string;
  code?: string;
  description?: string;
  credits?: number;
  color?: string;
  isActive?: boolean;
}

// ============================================
// EXAM DTOs
// ============================================

export interface MCQOption {
  id: number;
  text: string;
}

export interface QuestionDTO {
  id: string;
  examId: string;
  type: QuestionType;
  question: string;
  marks: number;
  order: number;
  options: string | null; // JSON string of MCQOption[]
  correctAnswer: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamDTO {
  id: string;
  title: string;
  description: string | null;
  subjectId: string;
  teacherId: string;
  totalMarks: number;
  duration: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  subject?: SubjectDTO;
  teacher?: {
    id: string;
    user: { name: string };
  };
  questions?: QuestionDTO[];
  _count?: {
    questions: number;
    results: number;
  };
}

export interface CreateExamDTO {
  title: string;
  description?: string;
  subjectId: string;
  teacherId: string;
  totalMarks?: number;
  duration: number;
  startDate: string;
  endDate: string;
  classIds: string[];
  questions: CreateQuestionDTO[];
}

export interface UpdateExamDTO {
  title?: string;
  description?: string;
  totalMarks?: number;
  duration?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  classIds?: string[];
}

export interface CreateQuestionDTO {
  type: QuestionType;
  question: string;
  marks: number;
  order: number;
  options?: MCQOption[];
  correctAnswer?: string; // For MCQ: option index as string, For Essay: null
}

export interface UpdateQuestionDTO {
  question?: string;
  marks?: number;
  order?: number;
  options?: MCQOption[];
  correctAnswer?: string;
}

export interface SubmitExamDTO {
  examId: string;
  studentId: string;
  answers: {
    questionId: string;
    answer: string;
  }[];
}

export interface ExamAnswerDTO {
  id: string;
  examId: string;
  questionId: string;
  studentId: string;
  answer: string;
  marks: number | null;
  feedback: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamResultDTO {
  id: string;
  examId: string;
  studentId: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string | null;
  remarks: string | null;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  exam?: {
    title: string;
    subject: { name: string };
  };
  student?: {
    studentNumber: string;
    user: { name: string };
  };
}

export interface GradeExamDTO {
  examId: string;
  studentId: string;
  grades: {
    questionId: string;
    marks: number;
    feedback?: string;
  }[];
}

// ============================================
// SCHEDULE DTOs
// ============================================

export interface ScheduleDTO {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
  term: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  class?: ClassDTO;
  subject?: SubjectDTO;
  teacher?: {
    id: string;
    user: { name: string };
  };
}

export interface CreateScheduleDTO {
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  term?: string;
}

export interface UpdateScheduleDTO {
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  roomNumber?: string;
  term?: string;
  isActive?: boolean;
}

// ============================================
// ATTENDANCE DTOs
// ============================================

export interface AttendanceDTO {
  id: string;
  studentId: string;
  date: Date;
  status: AttendanceStatus;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
  student?: {
    studentNumber: string;
    user: { name: string };
    class?: { name: string };
  };
}

export interface CreateAttendanceDTO {
  studentId: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface BulkAttendanceDTO {
  date: string;
  classId: string;
  attendance: {
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }[];
}

export interface UpdateAttendanceDTO {
  status?: AttendanceStatus;
  remarks?: string;
}

export interface AttendanceReportDTO {
  studentId: string;
  studentName: string;
  studentNumber: string;
  className: string;
  month: string;
  year: number;
  stats: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    attendancePercentage: number;
  };
  details: AttendanceDTO[];
}

// ============================================
// DASHBOARD DTOs
// ============================================

export interface DashboardStatsDTO {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalClasses: number;
  totalSubjects: number;
  totalExams: number;
  activeExams: number;
  todayAttendance: {
    present: number;
    absent: number;
    total: number;
    percentage: number;
  };
  monthlyTrends: {
    month: string;
    students: number;
    exams: number;
  }[];
  recentActivities: {
    id: string;
    action: string;
    entity: string | null;
    details: string | null;
    createdAt: Date;
    user: {
      name: string;
      role: UserRole;
    };
  }[];
  upcomingExams: {
    id: string;
    title: string;
    subject: string;
    startDate: Date;
    classes: string[];
  }[];
}

// ============================================
// FILTER & QUERY DTOs
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  search?: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}