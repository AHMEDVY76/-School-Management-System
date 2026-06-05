import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { CreateScheduleDTO, ScheduleDTO, ApiResponse, PaginatedResponse } from '@/types';
import { hasTimeConflict } from '@/lib/helpers';

/**
 * GET /api/schedules
 * Get all schedules with pagination and filters
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
    const classId = searchParams.get('classId') || '';
    const teacherId = searchParams.get('teacherId') || '';
    const subjectId = searchParams.get('subjectId') || '';
    const dayOfWeek = searchParams.get('dayOfWeek') || '';
    const term = searchParams.get('term') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (classId) {
      where.classId = classId;
    }

    if (teacherId) {
      where.teacherId = teacherId;
    } else if (currentUser.role === 'TEACHER') {
      // Teachers can only see their own schedules
      where.teacherId = currentUser.userId;
    }

    if (subjectId) {
      where.subjectId = subjectId;
    }

    if (dayOfWeek) {
      where.dayOfWeek = dayOfWeek;
    }

    if (term) {
      where.term = term;
    }

    // Get schedules with pagination
    const [schedules, total] = await Promise.all([
      db.schedule.findMany({
        where,
        skip,
        take: limit,
        include: {
          class: {
            select: {
              id: true,
              name: true,
              gradeLevel: true,
              section: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          teacher: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' },
        ],
      }),
      db.schedule.count({ where }),
    ]);

    const scheduleDTOs: ScheduleDTO[] = schedules.map(schedule => ({
      id: schedule.id,
      classId: schedule.classId,
      subjectId: schedule.subjectId,
      teacherId: schedule.teacherId,
      dayOfWeek: schedule.dayOfWeek as any,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      roomNumber: schedule.roomNumber,
      term: schedule.term,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      class: schedule.class as any,
      subject: schedule.subject as any,
      teacher: schedule.teacher as any,
    }));

    const response: PaginatedResponse<ScheduleDTO> = {
      data: scheduleDTOs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<ScheduleDTO>>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * POST /api/schedules
 * Create a new schedule with conflict checking
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

    const body: CreateScheduleDTO = await request.json();
    const {
      classId,
      subjectId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      roomNumber,
      term,
    } = body;

    // Validate required fields
    if (!classId || !subjectId || !teacherId || !dayOfWeek || !startTime || !endTime) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'All required fields must be provided',
      }, { status: 400 });
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Time must be in HH:MM format',
      }, { status: 400 });
    }

    // Validate end time is after start time
    if (startTime >= endTime) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'End time must be after start time',
      }, { status: 400 });
    }

    // Check if class exists
    const classExists = await db.class.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Class not found',
      }, { status: 404 });
    }

    // Check if subject exists
    const subjectExists = await db.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subjectExists) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Subject not found',
      }, { status: 404 });
    }

    // Check if teacher exists
    const teacherExists = await db.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacherExists) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Teacher not found',
      }, { status: 404 });
    }

    // Check for conflicts
    const conflictingSchedules = await db.schedule.findMany({
      where: {
        dayOfWeek,
        isActive: true,
        OR: [
          {
            classId,
          },
          {
            teacherId,
          },
        ],
      },
    });

    for (const conflict of conflictingSchedules) {
      if (hasTimeConflict(startTime, endTime, conflict.startTime, conflict.endTime)) {
        if (conflict.classId === classId) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: `Class ${classExists.name} already has a class at this time`,
          }, { status: 400 });
        }
        if (conflict.teacherId === teacherId) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: `Teacher already has a class at this time`,
          }, { status: 400 });
        }
      }
    }

    // Create schedule in transaction
    const schedule = await db.$transaction(async (tx) => {
      const newSchedule = await tx.schedule.create({
        data: {
          classId,
          subjectId,
          teacherId,
          dayOfWeek,
          startTime,
          endTime,
          roomNumber,
          term,
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              gradeLevel: true,
              section: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          teacher: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'CREATE',
          entity: 'Schedule',
          entityId: newSchedule.id,
          details: `Created schedule: ${subjectExists.name} for ${classExists.name} on ${dayOfWeek}`,
          ipAddress: getClientIP(request),
        },
      });

      return newSchedule;
    });

    const scheduleDTO: ScheduleDTO = {
      id: schedule.id,
      classId: schedule.classId,
      subjectId: schedule.subjectId,
      teacherId: schedule.teacherId,
      dayOfWeek: schedule.dayOfWeek as any,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      roomNumber: schedule.roomNumber,
      term: schedule.term,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      class: schedule.class as any,
      subject: schedule.subject as any,
      teacher: schedule.teacher as any,
    };

    return NextResponse.json<ApiResponse<ScheduleDTO>>({
      success: true,
      data: scheduleDTO,
      message: 'Schedule created successfully',
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}