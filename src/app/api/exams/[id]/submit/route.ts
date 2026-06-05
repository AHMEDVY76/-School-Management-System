import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP } from '@/lib/middleware';
import { SubmitExamDTO, ApiResponse, ExamResultDTO, ExamAnswerDTO } from '@/types';
import { calculatePercentage, getGrade } from '@/lib/helpers';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * POST /api/exams/[id]/submit
 * Submit exam answers and auto-grade MCQ questions
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || currentUser.role !== 'STUDENT') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const body: SubmitExamDTO = await request.json();
    const { examId, studentId, answers } = body;

    // Validate exam ID matches route
    if (examId !== id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Exam ID mismatch',
      }, { status: 400 });
    }

    // Validate student ID
    if (studentId !== currentUser.userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'You can only submit your own exam',
      }, { status: 403 });
    }

    // Check if exam exists and is active
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!exam) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Exam not found',
      }, { status: 404 });
    }

    if (!exam.isActive) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Exam is not active',
      }, { status: 400 });
    }

    // Check if exam is within time window
    const now = new Date();
    if (now < exam.startDate || now > exam.endDate) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Exam is not currently open for submission',
      }, { status: 400 });
    }

    // Check if student has already submitted
    const existingResult = await db.examResult.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId,
        },
      },
    });

    if (existingResult) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'You have already submitted this exam',
      }, { status: 400 });
    }

    // Process answers and auto-grade MCQ questions
    let totalObtainedMarks = 0;

    const processedAnswers = await db.$transaction(async (tx) => {
      const answerResults: ExamAnswerDTO[] = [];

      for (const answer of answers) {
        const question = exam.questions.find(q => q.id === answer.questionId);

        if (!question) {
          continue; // Skip invalid question IDs
        }

        let marks = 0;

        // Auto-grade MCQ questions
        if (question.type === 'MCQ' && question.correctAnswer) {
          marks = answer.answer === question.correctAnswer ? question.marks : 0;
        }
        // Essay questions need manual grading, marks will be null initially

        totalObtainedMarks += marks;

        // Create exam answer record
        const examAnswer = await tx.examAnswer.create({
          data: {
            examId,
            questionId: answer.questionId,
            studentId,
            answer: answer.answer,
            marks: question.type === 'MCQ' ? marks : null,
          },
        });

        answerResults.push({
          id: examAnswer.id,
          examId: examAnswer.examId,
          questionId: examAnswer.questionId,
          studentId: examAnswer.studentId,
          answer: examAnswer.answer,
          marks: examAnswer.marks,
          feedback: examAnswer.feedback,
          createdAt: examAnswer.createdAt,
          updatedAt: examAnswer.updatedAt,
        });
      }

      // Calculate percentage and grade
      const percentage = calculatePercentage(totalObtainedMarks, exam.totalMarks);
      const grade = getGrade(percentage);

      // Create exam result
      const result = await tx.examResult.create({
        data: {
          examId,
          studentId,
          totalMarks: exam.totalMarks,
          obtainedMarks: totalObtainedMarks,
          percentage,
          grade,
          submittedAt: new Date(),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'CREATE',
          entity: 'ExamResult',
          entityId: result.id,
          details: `Submitted exam: ${exam.title} (${percentage}%)`,
          ipAddress: getClientIP(request),
        },
      });

      return answerResults;
    });

    const percentage = calculatePercentage(totalObtainedMarks, exam.totalMarks);
    const grade = getGrade(percentage);

    const resultDTO: ExamResultDTO = {
      id: '',
      examId,
      studentId,
      totalMarks: exam.totalMarks,
      obtainedMarks: totalObtainedMarks,
      percentage,
      grade,
      remarks: null,
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      exam: {
        title: exam.title,
        subject: { name: '' },
      },
      student: {
        studentNumber: '',
        user: { name: '' },
      },
    };

    // Get the created result
    const createdResult = await db.examResult.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId,
        },
      },
    });

    if (createdResult) {
      resultDTO.id = createdResult.id;
      resultDTO.createdAt = createdResult.createdAt;
      resultDTO.updatedAt = createdResult.updatedAt;
      resultDTO.remarks = createdResult.remarks;
    }

    return NextResponse.json<ApiResponse<ExamResultDTO>>({
      success: true,
      data: resultDTO,
      message: 'Exam submitted successfully',
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}