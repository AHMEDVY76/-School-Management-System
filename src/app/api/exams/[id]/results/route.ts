import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/middleware';
import { ExamResultDTO, ApiResponse, PaginatedResponse } from '@/types';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/exams/[id]/results
 * Get all results for an exam with student info
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const skip = (page - 1) * limit;

    // Check if exam exists
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Exam not found',
      }, { status: 404 });
    }

    // Check authorization for teachers
    if (currentUser.role === 'TEACHER' && exam.teacherId !== currentUser.userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'You can only view results for your own exams',
      }, { status: 403 });
    }

    // Get exam results with pagination
    const [results, total] = await Promise.all([
      db.examResult.findMany({
        where: { examId: id },
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
        orderBy: { percentage: 'desc' },
      }),
      db.examResult.count({ where: { examId: id } }),
    ]);

    const resultDTOs: ExamResultDTO[] = results.map(result => ({
      id: result.id,
      examId: result.examId,
      studentId: result.studentId,
      totalMarks: result.totalMarks,
      obtainedMarks: result.obtainedMarks,
      percentage: result.percentage,
      grade: result.grade,
      remarks: result.remarks,
      submittedAt: result.submittedAt,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      exam: {
        title: exam.title,
        subject: { name: exam.subject.name },
      },
      student: {
        studentNumber: result.student.studentNumber,
        user: { name: result.student.user.name },
      },
    }));

    const response: PaginatedResponse<ExamResultDTO> = {
      data: resultDTOs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<ExamResultDTO>>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Get exam results error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}