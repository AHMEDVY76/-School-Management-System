import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { UpdateExamDTO, ExamDTO, ApiResponse } from '@/types';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/exams/[id]
 * Get a single exam by ID with all questions
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

    const exam = await db.exam.findUnique({
      where: { id },
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
        questions: {
          orderBy: { order: 'asc' },
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
    });

    if (!exam) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Exam not found',
      }, { status: 404 });
    }

    // Check authorization
    const isTeacherExam = exam.teacherId === currentUser.userId;
    const isAdminOrTeacher = hasRole(currentUser, ['ADMIN', 'TEACHER']);

    if (!isTeacherExam && !isAdminOrTeacher) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 403 });
    }

    const examDTO: ExamDTO = {
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
      questions: exam.questions.map(q => ({
        id: q.id,
        examId: q.examId,
        type: q.type as any,
        question: q.question,
        marks: q.marks,
        order: q.order,
        options: q.options,
        correctAnswer: q.correctAnswer,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
      _count: exam._count as any,
    };

    return NextResponse.json<ApiResponse<ExamDTO>>({
      success: true,
      data: examDTO,
    });
  } catch (error) {
    console.error('Get exam error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/exams/[id]
 * Update an exam
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

    const body: UpdateExamDTO = await request.json();

    // Check if exam exists
    const existingExam = await db.exam.findUnique({
      where: { id },
    });

    if (!existingExam) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Exam not found',
      }, { status: 404 });
    }

    // Check if teacher is the owner or admin
    if (currentUser.role === 'TEACHER' && existingExam.teacherId !== currentUser.userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'You can only update your own exams',
      }, { status: 403 });
    }

    // Validate dates if both provided
    if (body.startDate && body.endDate && new Date(body.endDate) <= new Date(body.startDate)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'End date must be after start date',
      }, { status: 400 });
    }

    // Update exam in transaction
    const updatedExam = await db.$transaction(async (tx) => {
      // Update exam
      const exam = await tx.exam.update({
        where: { id },
        data: {
          title: body.title,
          description: body.description,
          totalMarks: body.totalMarks,
          duration: body.duration,
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          isActive: body.isActive,
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

      // Update exam assignments if classIds provided
      if (body.classIds) {
        // Delete existing assignments
        await tx.examAssignment.deleteMany({
          where: { examId: id },
        });

        // Create new assignments
        for (const classId of body.classIds) {
          await tx.examAssignment.create({
            data: {
              examId: id,
              classId,
            },
          });
        }
      }

      return exam;
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'UPDATE',
        entity: 'Exam',
        entityId: id,
        details: `Updated exam: ${existingExam.title}`,
        ipAddress: getClientIP(request),
      },
    });

    const examDTO: ExamDTO = {
      id: updatedExam.id,
      title: updatedExam.title,
      description: updatedExam.description,
      subjectId: updatedExam.subjectId,
      teacherId: updatedExam.teacherId,
      totalMarks: updatedExam.totalMarks,
      duration: updatedExam.duration,
      startDate: updatedExam.startDate,
      endDate: updatedExam.endDate,
      isActive: updatedExam.isActive,
      createdAt: updatedExam.createdAt,
      updatedAt: updatedExam.updatedAt,
      subject: updatedExam.subject as any,
      teacher: updatedExam.teacher as any,
    };

    return NextResponse.json<ApiResponse<ExamDTO>>({
      success: true,
      data: examDTO,
      message: 'Exam updated successfully',
    });
  } catch (error) {
    console.error('Update exam error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/exams/[id]
 * Delete an exam (cascade deletes questions, answers, results, assignments)
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

    // Check if exam exists
    const exam = await db.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Exam not found',
      }, { status: 404 });
    }

    // Check if teacher is the owner or admin
    if (currentUser.role === 'TEACHER' && exam.teacherId !== currentUser.userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'You can only delete your own exams',
      }, { status: 403 });
    }

    // Delete exam (cascade deletes will handle related records)
    await db.exam.delete({
      where: { id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'DELETE',
        entity: 'Exam',
        entityId: id,
        details: `Deleted exam: ${exam.title}`,
        ipAddress: getClientIP(request),
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Exam deleted successfully',
    });
  } catch (error) {
    console.error('Delete exam error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}