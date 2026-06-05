import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { BulkAttendanceDTO, ApiResponse } from '@/types';

/**
 * POST /api/attendance/bulk
 * Bulk create attendance for a class
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

    const body: BulkAttendanceDTO = await request.json();
    const { date, classId, attendance: attendanceData } = body;

    // Validate required fields
    if (!date || !classId || !attendanceData || attendanceData.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'All required fields must be provided',
      }, { status: 400 });
    }

    // Check if class exists
    const classInfo = await db.class.findUnique({
      where: { id: classId },
    });

    if (!classInfo) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Class not found',
      }, { status: 404 });
    }

    // Get all students in the class
    const students = await db.student.findMany({
      where: { classId },
      include: { user: true },
    });

    if (students.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No students found in this class',
      }, { status: 404 });
    }

    // Create attendance records in transaction
    const result = await db.$transaction(async (tx) => {
      const createdRecords: any[] = [];
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Delete existing attendance for this class on this date
      await tx.attendance.deleteMany({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          student: {
            classId,
          },
        },
      });

      // Create new attendance records
      for (const att of attendanceData) {
        const student = students.find(s => s.id === att.studentId);
        if (!student) continue;

        const record = await tx.attendance.create({
          data: {
            studentId: att.studentId,
            date: targetDate,
            status: att.status,
            remarks: att.remarks,
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

        createdRecords.push(record);
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'CREATE',
          entity: 'Attendance',
          entityId: classId,
          details: `Bulk attendance created for class ${classInfo.name} on ${date} (${attendanceData.length} records)`,
          ipAddress: getClientIP(request),
        },
      });

      return createdRecords;
    });

    return NextResponse.json<ApiResponse<{ count: number; date: string; classId: string }>>({
      success: true,
      data: {
        count: result.length,
        date,
        classId,
      },
      message: `Successfully created ${result.length} attendance records`,
    });
  } catch (error) {
    console.error('Bulk create attendance error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}