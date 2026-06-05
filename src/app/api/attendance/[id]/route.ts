import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { UpdateAttendanceDTO, AttendanceDTO, ApiResponse } from '@/types';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/attendance/[id]
 * Get a single attendance record by ID
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

    const attendance = await db.attendance.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: true,
            class: true,
          },
        },
      },
    });

    if (!attendance) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Attendance record not found',
      }, { status: 404 });
    }

    // Check authorization for students and parents
    if (currentUser.role === 'STUDENT' && attendance.studentId !== currentUser.userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 403 });
    }

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
 * PUT /api/attendance/[id]
 * Update an attendance record
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || !hasRole(currentUser, ['ADMIN', 'TEACHER'])) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const body: UpdateAttendanceDTO = await request.json();

    // Check if attendance exists
    const existingAttendance = await db.attendance.findUnique({
      where: { id },
      include: {
        student: {
          include: { user: true },
        },
      },
    });

    if (!existingAttendance) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Attendance record not found',
      }, { status: 404 });
    }

    // Update attendance
    const updatedAttendance = await db.attendance.update({
      where: { id },
      data: {
        status: body.status,
        remarks: body.remarks,
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
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'UPDATE',
        entity: 'Attendance',
        entityId: id,
        details: `Updated attendance for ${existingAttendance.student.user.name} to ${body.status || existingAttendance.status}`,
        ipAddress: getClientIP(request),
      },
    });

    const attendanceDTO: AttendanceDTO = {
      id: updatedAttendance.id,
      studentId: updatedAttendance.studentId,
      date: updatedAttendance.date,
      status: updatedAttendance.status as any,
      remarks: updatedAttendance.remarks,
      createdAt: updatedAttendance.createdAt,
      updatedAt: updatedAttendance.updatedAt,
      student: {
        studentNumber: updatedAttendance.student.studentNumber,
        user: { name: updatedAttendance.student.user.name },
        class: updatedAttendance.student.class ? { name: updatedAttendance.student.class.name } : undefined,
      },
    };

    return NextResponse.json<ApiResponse<AttendanceDTO>>({
      success: true,
      data: attendanceDTO,
      message: 'Attendance updated successfully',
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/attendance/[id]
 * Delete an attendance record
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || !hasRole(currentUser, ['ADMIN', 'TEACHER'])) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    // Check if attendance exists
    const attendance = await db.attendance.findUnique({
      where: { id },
      include: {
        student: {
          include: { user: true },
        },
      },
    });

    if (!attendance) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Attendance record not found',
      }, { status: 404 });
    }

    // Delete attendance
    await db.attendance.delete({
      where: { id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'DELETE',
        entity: 'Attendance',
        entityId: id,
        details: `Deleted attendance for ${attendance.student.user.name} on ${attendance.date.toISOString().split('T')[0]}`,
        ipAddress: getClientIP(request),
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Attendance deleted successfully',
    });
  } catch (error) {
    console.error('Delete attendance error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}