import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/middleware';
import { ApiResponse, DashboardStatsDTO } from '@/types';
import { getMonthName } from '@/lib/helpers';

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || !hasRole(currentUser, ['ADMIN'])) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Get date ranges for last 6 months
    const monthlyTrends: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const [studentsCount, examsCount] = await Promise.all([
        db.student.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
            isActive: true,
          },
        }),
        db.exam.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }),
      ]);

      monthlyTrends.push({
        month: `${getMonthName(date.getMonth() + 1)} ${date.getFullYear()}`,
        students: studentsCount,
        exams: examsCount,
      });
    }

    // Get recent activities
    const recentActivities = await db.auditLog.findMany({
      take: 10,
      include: {
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get upcoming exams
    const upcomingExams = await db.exam.findMany({
      where: {
        isActive: true,
        startDate: {
          gte: today,
        },
      },
      take: 5,
      include: {
        subject: {
          select: {
            name: true,
          },
        },
        classes: {
          include: {
            class: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Get today's attendance
    const todayAttendanceRecords = await db.attendance.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const presentCount = todayAttendanceRecords.filter(a => a.status === 'PRESENT').length;
    const absentCount = todayAttendanceRecords.filter(a => a.status === 'ABSENT').length;
    const totalAttendance = todayAttendanceRecords.length;

    // Get total counts
    const [
      totalStudents,
      totalTeachers,
      totalParents,
      totalClasses,
      totalSubjects,
      totalExams,
      activeExams,
    ] = await Promise.all([
      db.student.count({ where: { isActive: true } }),
      db.teacher.count({ where: { isActive: true } }),
      db.parent.count({ where: { isActive: true } }),
      db.class.count({ where: { isActive: true } }),
      db.subject.count({ where: { isActive: true } }),
      db.exam.count(),
      db.exam.count({
        where: {
          isActive: true,
          startDate: {
            lte: today,
          },
          endDate: {
            gte: today,
          },
        },
      }),
    ]);

    // Build dashboard stats
    const dashboardStats: DashboardStatsDTO = {
      totalStudents,
      totalTeachers,
      totalParents,
      totalClasses,
      totalSubjects,
      totalExams,
      activeExams,
      todayAttendance: {
        present: presentCount,
        absent: absentCount,
        total: totalAttendance,
        percentage: totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0,
      },
      monthlyTrends,
      recentActivities: recentActivities.map(activity => ({
        id: activity.id,
        action: activity.action,
        entity: activity.entity,
        details: activity.details,
        createdAt: activity.createdAt,
        user: {
          name: activity.user.name,
          role: activity.user.role as any,
        },
      })),
      upcomingExams: upcomingExams.map(exam => ({
        id: exam.id,
        title: exam.title,
        subject: exam.subject.name,
        startDate: exam.startDate,
        classes: exam.classes.map(c => c.class.name),
      })),
    };

    return NextResponse.json<ApiResponse<DashboardStatsDTO>>({
      success: true,
      data: dashboardStats,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}