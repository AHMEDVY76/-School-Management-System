import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/middleware';
import { ApiResponse, AttendanceReportDTO } from '@/types';
import { getMonthName } from '@/lib/helpers';

/**
 * GET /api/attendance/report
 * Generate monthly attendance report
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
    const studentId = searchParams.get('studentId') || '';
    const classId = searchParams.get('classId') || '';
    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';

    // Validate required parameters
    if (!month || !year) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Month and year are required',
      }, { status: 400 });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid month',
      }, { status: 400 });
    }

    // Build date range for the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // Build where clause
    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (studentId) {
      // Students can only view their own reports
      if (currentUser.role === 'STUDENT' && studentId !== currentUser.userId) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Unauthorized',
        }, { status: 403 });
      }
      where.studentId = studentId;
    } else if (currentUser.role === 'STUDENT') {
      where.studentId = currentUser.userId;
    }

    if (classId) {
      where.student = {
        classId,
      };
    }

    // Get attendance records
    const attendanceRecords = await db.attendance.findMany({
      where,
      include: {
        student: {
          include: {
            user: true,
            class: true,
          },
        },
      },
      orderBy: [
        { student: { user: { name: 'asc' } } },
        { date: 'asc' },
      ],
    });

    if (attendanceRecords.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No attendance records found for the specified period',
      }, { status: 404 });
    }

    // Group attendance by student
    const studentMap = new Map<string, AttendanceReportDTO>();

    for (const record of attendanceRecords) {
      const studentId = record.studentId;

      if (!studentMap.has(studentId)) {
        const studentName = record.student.user.name;
        const studentNumber = record.student.studentNumber;
        const className = record.student.class?.name || 'N/A';

        studentMap.set(studentId, {
          studentId,
          studentName,
          studentNumber,
          className,
          month: getMonthName(monthNum),
          year: yearNum,
          stats: {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            total: 0,
            attendancePercentage: 0,
          },
          details: [],
        });
      }

      const report = studentMap.get(studentId)!;
      report.stats.total++;
      report.stats[record.status.toLowerCase() as keyof typeof report.stats]++;

      report.details.push({
        id: record.id,
        studentId: record.studentId,
        date: record.date,
        status: record.status as any,
        remarks: record.remarks,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    // Calculate attendance percentages
    for (const [studentId, report] of studentMap) {
      const presentDays = report.stats.present + report.stats.late;
      report.stats.attendancePercentage = report.stats.total > 0
        ? Math.round((presentDays / report.stats.total) * 100)
        : 0;
    }

    // Convert to array and return first report if single student, or all if class
    const reports = Array.from(studentMap.values());

    // If specific studentId requested, return single report
    if (studentId) {
      return NextResponse.json<ApiResponse<AttendanceReportDTO>>({
        success: true,
        data: reports[0],
      });
    }

    // Otherwise return all reports for the class
    return NextResponse.json<ApiResponse<AttendanceReportDTO[]>>({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Generate attendance report error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}