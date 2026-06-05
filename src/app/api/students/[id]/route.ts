import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { UpdateStudentDTO, StudentDTO, ApiResponse } from '@/types';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/students/[id]
 * Get a single student by ID
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

    // Students can only view their own data
    const student = await db.student.findUnique({
      where: { id },
      include: {
        user: true,
        class: true,
        parents: {
          include: {
            parent: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Student not found',
      }, { status: 404 });
    }

    // Check authorization
    const isOwnData = student.userId === currentUser.userId;
    const isAdminOrTeacher = hasRole(currentUser, ['ADMIN', 'TEACHER']);
    const isParent = currentUser.role === 'PARENT';

    if (!isOwnData && !isAdminOrTeacher && !isParent) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 403 });
    }

    const studentDTO: StudentDTO = {
      id: student.id,
      userId: student.userId,
      studentNumber: student.studentNumber,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      address: student.address,
      phone: student.phone,
      emergencyContact: student.emergencyContact,
      enrollmentDate: student.enrollmentDate,
      classId: student.classId,
      photoUrl: student.photoUrl,
      isActive: student.isActive,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      user: student.user as any,
      class: student.class as any,
      parents: student.parents.map(p => ({
        id: p.parent.id,
        userId: p.parent.userId,
        phone: p.parent.phone,
        occupation: p.parent.occupation,
        address: p.parent.address,
        isActive: p.parent.isActive,
        createdAt: p.parent.createdAt,
        updatedAt: p.parent.updatedAt,
        user: p.parent.user as any,
      })),
    };

    return NextResponse.json<ApiResponse<StudentDTO>>({
      success: true,
      data: studentDTO,
    });
  } catch (error) {
    console.error('Get student error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/students/[id]
 * Update a student
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || !hasRole(currentUser, ['ADMIN'])) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const body: UpdateStudentDTO = await request.json();

    // Check if student exists
    const existingStudent = await db.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingStudent) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Student not found',
      }, { status: 404 });
    }

    // Update user and student
    const updatedStudent = await db.$transaction(async (tx) => {
      // Update user if name is provided
      if (body.name) {
        await tx.user.update({
          where: { id: existingStudent.userId },
          data: { name: body.name },
        });
      }

      // Update student
      return await tx.student.update({
        where: { id },
        data: {
          address: body.address,
          phone: body.phone,
          emergencyContact: body.emergencyContact,
          classId: body.classId,
          photoUrl: body.photoUrl,
          isActive: body.isActive,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          class: true,
        },
      });
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'UPDATE',
        entity: 'Student',
        entityId: id,
        details: `Updated student: ${existingStudent.user.name}`,
        ipAddress: getClientIP(request),
      },
    });

    const studentDTO: StudentDTO = {
      id: updatedStudent.id,
      userId: updatedStudent.userId,
      studentNumber: updatedStudent.studentNumber,
      dateOfBirth: updatedStudent.dateOfBirth,
      gender: updatedStudent.gender,
      address: updatedStudent.address,
      phone: updatedStudent.phone,
      emergencyContact: updatedStudent.emergencyContact,
      enrollmentDate: updatedStudent.enrollmentDate,
      classId: updatedStudent.classId,
      photoUrl: updatedStudent.photoUrl,
      isActive: updatedStudent.isActive,
      createdAt: updatedStudent.createdAt,
      updatedAt: updatedStudent.updatedAt,
      user: updatedStudent.user as any,
      class: updatedStudent.class as any,
    };

    return NextResponse.json<ApiResponse<StudentDTO>>({
      success: true,
      data: studentDTO,
      message: 'Student updated successfully',
    });
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/students/[id]
 * Delete a student
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || !hasRole(currentUser, ['ADMIN'])) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    // Check if student exists
    const student = await db.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Student not found',
      }, { status: 404 });
    }

    // Delete student and user in transaction
    await db.$transaction(async (tx) => {
      await tx.student.delete({ where: { id } });
      await tx.user.delete({ where: { id: student.userId } });
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'DELETE',
        entity: 'Student',
        entityId: id,
        details: `Deleted student: ${student.user.name} (${student.studentNumber})`,
        ipAddress: getClientIP(request),
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}