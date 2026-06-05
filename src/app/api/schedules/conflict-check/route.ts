import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/middleware';
import { ApiResponse, CreateScheduleDTO } from '@/types';
import { hasTimeConflict } from '@/lib/helpers';

interface ConflictCheckRequest {
  schedule: CreateScheduleDTO & { id?: string };
}

/**
 * POST /api/schedules/conflict-check
 * Check if a schedule would conflict with existing ones
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

    const body: ConflictCheckRequest = await request.json();
    const { schedule } = body;

    if (!schedule) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Schedule data is required',
      }, { status: 400 });
    }

    const { id, classId, subjectId, teacherId, dayOfWeek, startTime, endTime } = schedule;

    // Validate required fields
    if (!classId || !teacherId || !dayOfWeek || !startTime || !endTime) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'All required fields must be provided',
      }, { status: 400 });
    }

    // Validate end time is after start time
    if (startTime >= endTime) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'End time must be after start time',
      }, { status: 400 });
    }

    // Check for conflicts
    const whereClause: any = {
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
    };

    // Exclude current schedule if updating
    if (id) {
      whereClause.NOT = {
        id,
      };
    }

    const conflictingSchedules = await db.schedule.findMany({
      where: whereClause,
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const conflicts: any[] = [];

    for (const conflict of conflictingSchedules) {
      if (hasTimeConflict(startTime, endTime, conflict.startTime, conflict.endTime)) {
        if (conflict.classId === classId) {
          conflicts.push({
            type: 'CLASS',
            message: `Class ${conflict.class.name} already has a class at this time`,
            conflictSchedule: {
              id: conflict.id,
              subject: conflict.subject.name,
              dayOfWeek: conflict.dayOfWeek,
              startTime: conflict.startTime,
              endTime: conflict.endTime,
            },
          });
        }
        if (conflict.teacherId === teacherId) {
          conflicts.push({
            type: 'TEACHER',
            message: `Teacher ${conflict.teacher.user.name} already has a class at this time`,
            conflictSchedule: {
              id: conflict.id,
              class: conflict.class.name,
              subject: conflict.subject.name,
              dayOfWeek: conflict.dayOfWeek,
              startTime: conflict.startTime,
              endTime: conflict.endTime,
            },
          });
        }
      }
    }

    return NextResponse.json<ApiResponse<{ conflicts: any[]; hasConflicts: boolean }>>({
      success: true,
      data: {
        conflicts,
        hasConflicts: conflicts.length > 0,
      },
    });
  } catch (error) {
    console.error('Conflict check error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}