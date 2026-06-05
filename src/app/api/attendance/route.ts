import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { CreateAttendanceDTO, AttendanceDTO, ApiResponse, PaginatedResponse } from '@/types';
import { startOfDay, endOfDay } from '@/lib/helpers';

/**
 * GET /api/attendance
 * Get all attendance records with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const studentId = searchParams.get('studentId') || '';
    const date = searchParams.get('date') || '';
    const classId = searchParams.get('classId') || '';
    const status = searchParams.get('status') || '';
    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (date) {
      const targetDate = new Date(date);
      where.date = {
        gte: startOfDay(targetDate),
        lte: endOfDay(targetDate),
      };
    }

    if (classId) {
      where.student = {
        classId,
      };
    }

    if (status) {
      where.status = status;
    }

    // Filter by month and year
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get attendance with pagination
    const [attendance, total] = await Promise.all([
      db.attendance.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          { date: 'desc' },
          { student: { user: { name: 'asc' } } },
        ],
      }),
      db.attendance.count({ where }),
    ]);

    const attendanceDTOs: AttendanceDTO[] = attendance.map(att => ({
      id: att.id,
      studentId: att.studentId,
      date: att.date,
      status: att.status as any,
      remarks: att.remarks,
      createdAt: att.createdAt,
      updatedAt: att.updatedAt,
      student: {
        studentNumber: att.student.studentNumber,
        user: { name: att.student.user.name },
        class: att.student.class ? { name: att.student.class.name } : undefined,
      },
    }));

    const response: PaginatedResponse<AttendanceDTO> = {
      data: attendanceDTOs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<AttendanceDTO>>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * POST /api/attendance
 * Create a single attendance record
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || !hasRole(currentUser, ['ADMIN', 'TEACHER'])) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const body: CreateAttendanceDTO = await request.json();
    const { studentId, date, status, remarks } = body;

    // Validate required fields
    if (!studentId || !date || !status) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'All required fields must be provided',
      }, { status: 400 });
    }

    // Check if student exists
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
      },
    });

    if (!student) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Student not found',
      }, { status: 404 });
    }

    // Check if attendance already exists for this student on this date
    const existingAttendance = await db.attendance.findUnique({
      where: {
        studentId_date: {
          studentId,
          date: new Date(date),
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Attendance already exists for this student on this date',
      }, { status: 400 });
    }

    // Create attendance
    const attendance = await db.$transaction(async (tx) => {
      const newAttendance = await tx.attendance.create({
        data: {
          studentId,
          date: new Date(date),
          status,
          remarks,
        },
        include: {
          student: {
            include: {
              user: true,
              class: true,
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'CREATE',
          entity: 'Attendance',
          entityId: newAttendance.id,
          details: `Created attendance: ${status} for ${student.user.name} on ${date}`,
          ipAddress: getClientIP(request),
        },
      });

      return newAttendance;
    });

    const attendanceDTO: AttendanceDTO = {
      id: attendance.id,
      studentId: attendance.studentId,
      date: attendance.date,
      status: attendance.status as any,
      remarks: attendance.remarks,
      createdAt: attendance.createdAt,
      updatedAt: attendance.updatedAt,
      student: {
        studentNumber: attendance.student.studentNumber,
        user: { name: attendance.student.user.name },
        class: attendance.student.class ? { name: attendance.student.class.name } : undefined,
      },
    };

    return NextResponse.json<ApiResponse<AttendanceDTO>>({
      success: true,
      data: attendanceDTO,
      message: 'Attendance recorded successfully',
    });
  } catch (error) {
    console.error('Create attendance error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}