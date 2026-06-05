import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { CreateTeacherDTO, TeacherDTO, ApiResponse, PaginatedResponse } from '@/types';

/**
 * GET /api/teachers
 * Get all teachers with pagination and filters
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
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { teacherNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Get teachers with pagination
    const [teachers, total] = await Promise.all([
      db.teacher.findMany({
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
          subjects: {
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  description: true,
                  credits: true,
                  color: true,
                  isActive: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.teacher.count({ where }),
    ]);

    const teacherDTOs: TeacherDTO[] = teachers.map(teacher => ({
      id: teacher.id,
      userId: teacher.userId,
      teacherNumber: teacher.teacherNumber,
      qualification: teacher.qualification,
      specialization: teacher.specialization,
      phone: teacher.phone,
      address: teacher.address,
      hireDate: teacher.hireDate,
      salary: teacher.salary,
      photoUrl: teacher.photoUrl,
      isActive: teacher.isActive,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
      user: teacher.user as any,
      subjects: teacher.subjects.map(ts => ts.subject) as any,
    }));

    const response: PaginatedResponse<TeacherDTO> = {
      data: teacherDTOs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<TeacherDTO>>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * POST /api/teachers
 * Create a new teacher
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

    const body: CreateTeacherDTO = await request.json();
    const { email, password, name, teacherNumber, qualification, specialization, phone, address, salary, subjectIds } = body;

    // Validate required fields
    if (!email || !password || !name || !teacherNumber) {
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

    // Check if teacher number already exists
    const existingTeacher = await db.teacher.findUnique({ where: { teacherNumber } });
    if (existingTeacher) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Teacher number already exists',
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await AuthService.hashPassword(password);

    // Create user and teacher in transaction
    const result = await db.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'TEACHER',
        },
      });

      // Create teacher
      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          teacherNumber,
          qualification,
          specialization,
          phone,
          address,
          salary,
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
          subjects: {
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  description: true,
                  credits: true,
                  color: true,
                  isActive: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      });

      // Link subjects if provided
      if (subjectIds && subjectIds.length > 0) {
        for (const subjectId of subjectIds) {
          await tx.teacherSubject.create({
            data: {
              teacherId: teacher.id,
              subjectId,
            },
          });
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'CREATE',
          entity: 'Teacher',
          entityId: teacher.id,
          details: `Created teacher: ${name} (${teacherNumber})`,
          ipAddress: getClientIP(request),
        },
      });

      return teacher;
    });

    const teacherDTO: TeacherDTO = {
      id: result.id,
      userId: result.userId,
      teacherNumber: result.teacherNumber,
      qualification: result.qualification,
      specialization: result.specialization,
      phone: result.phone,
      address: result.address,
      hireDate: result.hireDate,
      salary: result.salary,
      photoUrl: result.photoUrl,
      isActive: result.isActive,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      user: result.user as any,
      subjects: result.subjects.map(ts => ts.subject) as any,
    };

    return NextResponse.json<ApiResponse<TeacherDTO>>({
      success: true,
      data: teacherDTO,
      message: 'Teacher created successfully',
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}