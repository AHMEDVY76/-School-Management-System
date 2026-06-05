import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/middleware';
import { ApiResponse, AttendanceDTO } from '@/types';

/**
 * GET /api/attendance/today
 * Get today's attendance for a class
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
    const classId = searchParams.get('classId') || '';

    // Validate required parameter
    if (!classId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Class ID is required',
      }, { status: 400 });
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all students in the class
    const students = await db.student.findMany({
      where: { classId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    if (students.length === 0) {
      return NextResponse.json<ApiResponse<AttendanceDTO[]>>({
        success: true,
        data: [],
        message: 'No students found in this class',
      });
    }

    // Get existing attendance records for today
    const attendanceRecords = await db.attendance.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        studentId: {
          in: students.map(s => s.id),
        },
      },
    });

    // Create attendance DTOs, using existing records or marking as ABSENT
    const attendanceMap = new Map(attendanceRecords.map(a => [a.studentId, a]));

    const attendanceDTOs: AttendanceDTO[] = students.map(student => {
      const attendance = attendanceMap.get(student.id);

      return {
        id: attendance?.id || '',
        studentId: student.id,
        date: attendance?.date || startOfDay,
        status: (attendance?.status as any) || 'ABSENT',
        remarks: attendance?.remarks || null,
        createdAt: attendance?.createdAt || startOfDay,
        updatedAt: attendance?.updatedAt || startOfDay,
        student: {
          studentNumber: student.studentNumber,
          user: { name: student.user.name },
        },
      };
    });

    return NextResponse.json<ApiResponse<AttendanceDTO[]>>({
      success: true,
      data: attendanceDTOs,
    });
  } catch (error) {
    console.error('Get today\'s attendance error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}