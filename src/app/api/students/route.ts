import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { CreateStudentDTO, UpdateStudentDTO, StudentDTO, ApiResponse, PaginatedResponse } from '@/types';

/**
 * GET /api/students
 * Get all students with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || !hasRole(currentUser, ['ADMIN', 'TEACHER'])) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const classId = searchParams.get('classId') || '';
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { studentNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (classId) {
      where.classId = classId;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Get students with pagination
    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              gradeLevel: true,
              section: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.student.count({ where }),
    ]);

    const studentDTOs: StudentDTO[] = students.map(student => ({
      id: student.id,
      userId: student.userId,
      studentNumber: student.studentNumber,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      address: student.address,
      phone: student.phone,
      emergencyContact: student.emergencyContact,
      enrollmentDate: student.enrollmentDate,
      classId: student.classId,
      photoUrl: student.photoUrl,
      isActive: student.isActive,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      user: student.user as any,
      class: student.class as any,
    }));

    const response: PaginatedResponse<StudentDTO> = {
      data: studentDTOs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<StudentDTO>>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * POST /api/students
 * Create a new student
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || !hasRole(currentUser, ['ADMIN'])) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const body: CreateStudentDTO = await request.json();
    const { email, password, name, studentNumber, dateOfBirth, gender, address, phone, emergencyContact, classId, parentIds } = body;

    // Validate required fields
    if (!email || !password || !name || !studentNumber || !dateOfBirth || !gender) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'All required fields must be provided',
      }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Email already exists',
      }, { status: 400 });
    }

    // Check if student number already exists
    const existingStudent = await db.student.findUnique({ where: { studentNumber } });
    if (existingStudent) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Student number already exists',
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await AuthService.hashPassword(password);

    // Create user and student in transaction
    const result = await db.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'STUDENT',
        },
      });

      // Create student
      const student = await tx.student.create({
        data: {
          userId: user.id,
          studentNumber,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          address,
          phone,
          emergencyContact,
          classId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          class: true,
        },
      });

      // Link parents if provided
      if (parentIds && parentIds.length > 0) {
        for (const parentId of parentIds) {
          await tx.parentStudent.create({
            data: {
              parentId,
              studentId: student.id,
              relation: 'GUARDIAN',
            },
          });
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'CREATE',
          entity: 'Student',
          entityId: student.id,
          details: `Created student: ${name} (${studentNumber})`,
          ipAddress: getClientIP(request),
        },
      });

      return student;
    });

    const studentDTO: StudentDTO = {
      id: result.id,
      userId: result.userId,
      studentNumber: result.studentNumber,
      dateOfBirth: result.dateOfBirth,
      gender: result.gender,
      address: result.address,
      phone: result.phone,
      emergencyContact: result.emergencyContact,
      enrollmentDate: result.enrollmentDate,
      classId: result.classId,
      photoUrl: result.photoUrl,
      isActive: result.isActive,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      user: result.user as any,
      class: result.class as any,
    };

    return NextResponse.json<ApiResponse<StudentDTO>>({
      success: true,
      data: studentDTO,
      message: 'Student created successfully',
    });
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}