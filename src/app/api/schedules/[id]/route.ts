import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { UpdateScheduleDTO, ScheduleDTO, ApiResponse } from '@/types';
import { hasTimeConflict } from '@/lib/helpers';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/schedules/[id]
 * Get a single schedule by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const schedule = await db.schedule.findUnique({
      where: { id },
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

    if (!schedule) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Schedule not found',
      }, { status: 404 });
    }

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
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/schedules/[id]
 * Update a schedule with conflict checking
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || !hasRole(currentUser, ['ADMIN'])) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const body: UpdateScheduleDTO = await request.json();

    // Check if schedule exists
    const existingSchedule = await db.schedule.findUnique({
      where: { id },
    });

    if (!existingSchedule) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Schedule not found',
      }, { status: 404 });
    }

    // Validate time format if provided
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const startTime = body.startTime || existingSchedule.startTime;
    const endTime = body.endTime || existingSchedule.endTime;

    if (body.startTime && !timeRegex.test(body.startTime)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Time must be in HH:MM format',
      }, { status: 400 });
    }

    if (body.endTime && !timeRegex.test(body.endTime)) {
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

    // Check for conflicts (excluding current schedule)
    const classId = body.classId || existingSchedule.classId;
    const teacherId = body.teacherId || existingSchedule.teacherId;
    const dayOfWeek = body.dayOfWeek || existingSchedule.dayOfWeek;

    const conflictingSchedules = await db.schedule.findMany({
      where: {
        dayOfWeek,
        isActive: true,
        NOT: {
          id,
        },
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
          const classInfo = await db.class.findUnique({
            where: { id: classId },
            select: { name: true },
          });
          return NextResponse.json<ApiResponse>({
            success: false,
            error: `Class ${classInfo?.name} already has a class at this time`,
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

    // Update schedule
    const updatedSchedule = await db.schedule.update({
      where: { id },
      data: {
        classId: body.classId,
        subjectId: body.subjectId,
        teacherId: body.teacherId,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        roomNumber: body.roomNumber,
        term: body.term,
        isActive: body.isActive,
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
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'UPDATE',
        entity: 'Schedule',
        entityId: id,
        details: `Updated schedule: ${updatedSchedule.subject.name} on ${updatedSchedule.dayOfWeek}`,
        ipAddress: getClientIP(request),
      },
    });

    const scheduleDTO: ScheduleDTO = {
      id: updatedSchedule.id,
      classId: updatedSchedule.classId,
      subjectId: updatedSchedule.subjectId,
      teacherId: updatedSchedule.teacherId,
      dayOfWeek: updatedSchedule.dayOfWeek as any,
      startTime: updatedSchedule.startTime,
      endTime: updatedSchedule.endTime,
      roomNumber: updatedSchedule.roomNumber,
      term: updatedSchedule.term,
      isActive: updatedSchedule.isActive,
      createdAt: updatedSchedule.createdAt,
      updatedAt: updatedSchedule.updatedAt,
      class: updatedSchedule.class as any,
      subject: updatedSchedule.subject as any,
      teacher: updatedSchedule.teacher as any,
    };

    return NextResponse.json<ApiResponse<ScheduleDTO>>({
      success: true,
      data: scheduleDTO,
      message: 'Schedule updated successfully',
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/schedules/[id]
 * Delete a schedule
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || !hasRole(currentUser, ['ADMIN'])) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    // Check if schedule exists
    const schedule = await db.schedule.findUnique({
      where: { id },
      include: {
        subject: true,
        class: true,
      },
    });

    if (!schedule) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Schedule not found',
      }, { status: 404 });
    }

    // Delete schedule
    await db.schedule.delete({
      where: { id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'DELETE',
        entity: 'Schedule',
        entityId: id,
        details: `Deleted schedule: ${schedule.subject.name} for ${schedule.class?.name} on ${schedule.dayOfWeek}`,
        ipAddress: getClientIP(request),
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Schedule deleted successfully',
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}