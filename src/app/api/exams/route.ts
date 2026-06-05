import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { CreateExamDTO, ExamDTO, ApiResponse, PaginatedResponse, CreateQuestionDTO } from '@/types';
import { calculatePercentage, getGrade, safeParseJSON } from '@/lib/helpers';

/**
 * GET /api/exams
 * Get all exams with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const subjectId = searchParams.get('subjectId') || '';
    const teacherId = searchParams.get('teacherId') || '';
    const classId = searchParams.get('classId') || '';
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (subjectId) {
      where.subjectId = subjectId;
    }

    if (teacherId) {
      where.teacherId = teacherId;
    }

    // Teachers can only see their own exams
    if (currentUser.role === 'TEACHER') {
      where.teacherId = currentUser.userId;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Filter by class through assignments
    if (classId) {
      where.classes = {
        some: {
          classId,
        },
      };
    }

    // Get exams with pagination
    const [exams, total] = await Promise.all([
      db.exam.findMany({
        where,
        skip,
        take: limit,
        include: {
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
          _count: {
            select: {
              questions: true,
              results: true,
            },
          },
          classes: {
            include: {
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { startDate: 'desc' },
      }),
      db.exam.count({ where }),
    ]);

    const examDTOs: ExamDTO[] = exams.map(exam => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      subjectId: exam.subjectId,
      teacherId: exam.teacherId,
      totalMarks: exam.totalMarks,
      duration: exam.duration,
      startDate: exam.startDate,
      endDate: exam.endDate,
      isActive: exam.isActive,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      subject: exam.subject as any,
      teacher: exam.teacher as any,
      _count: exam._count as any,
    }));

    const response: PaginatedResponse<ExamDTO> = {
      data: examDTOs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<ExamDTO>>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Get exams error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * POST /api/exams
 * Create a new exam with questions
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

    const body: CreateExamDTO = await request.json();
    const {
      title,
      description,
      subjectId,
      teacherId,
      totalMarks,
      duration,
      startDate,
      endDate,
      classIds,
      questions,
    } = body;

    // Validate required fields
    if (!title || !subjectId || !teacherId || !duration || !startDate || !endDate || !classIds || !questions) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'All required fields must be provided',
      }, { status: 400 });
    }

    // Validate dates
    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'End date must be after start date',
      }, { status: 400 });
    }

    // Check if teacher exists
    const teacher = await db.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Teacher not found',
      }, { status: 404 });
    }

    // Check if subject exists
    const subject = await db.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Subject not found',
      }, { status: 404 });
    }

    // Verify classes exist
    const classes = await db.class.findMany({
      where: { id: { in: classIds } },
    });

    if (classes.length !== classIds.length) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'One or more classes not found',
      }, { status: 404 });
    }

    // Calculate total marks from questions if not provided
    const calculatedTotalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const finalTotalMarks = totalMarks || calculatedTotalMarks;

    // Create exam with questions and assignments in transaction
    const result = await db.$transaction(async (tx) => {
      // Create exam
      const exam = await tx.exam.create({
        data: {
          title,
          description,
          subjectId,
          teacherId,
          totalMarks: finalTotalMarks,
          duration,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
        include: {
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

      // Create questions
      for (const question of questions) {
        await tx.question.create({
          data: {
            examId: exam.id,
            type: question.type,
            question: question.question,
            marks: question.marks,
            order: question.order,
            options: question.options ? JSON.stringify(question.options) : null,
            correctAnswer: question.correctAnswer || null,
          },
        });
      }

      // Create exam assignments for each class
      for (const classId of classIds) {
        await tx.examAssignment.create({
          data: {
            examId: exam.id,
            classId,
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'CREATE',
          entity: 'Exam',
          entityId: exam.id,
          details: `Created exam: ${title}`,
          ipAddress: getClientIP(request),
        },
      });

      return exam;
    });

    const examDTO: ExamDTO = {
      id: result.id,
      title: result.title,
      description: result.description,
      subjectId: result.subjectId,
      teacherId: result.teacherId,
      totalMarks: result.totalMarks,
      duration: result.duration,
      startDate: result.startDate,
      endDate: result.endDate,
      isActive: result.isActive,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      subject: result.subject as any,
      teacher: result.teacher as any,
      _count: {
        questions: questions.length,
        results: 0,
      },
    };

    return NextResponse.json<ApiResponse<ExamDTO>>({
      success: true,
      data: examDTO,
      message: 'Exam created successfully',
    });
  } catch (error) {
    console.error('Create exam error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}