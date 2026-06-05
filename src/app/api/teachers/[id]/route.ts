import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { UpdateTeacherDTO, TeacherDTO, ApiResponse } from '@/types';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/teachers/[id]
 * Get a single teacher by ID
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

    // Teachers can only view their own data unless admin
    const teacher = await db.teacher.findUnique({
      where: { id },
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
        subjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
                description: true,
                credits: true,
                color: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Teacher not found',
      }, { status: 404 });
    }

    // Check authorization
    const isOwnData = teacher.userId === currentUser.userId;
    const isAdminOrTeacher = hasRole(currentUser, ['ADMIN', 'TEACHER']);

    if (!isOwnData && !isAdminOrTeacher) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 403 });
    }

    const teacherDTO: TeacherDTO = {
      id: teacher.id,
      userId: teacher.userId,
      teacherNumber: teacher.teacherNumber,
      qualification: teacher.qualification,
      specialization: teacher.specialization,
      phone: teacher.phone,
      address: teacher.address,
      hireDate: teacher.hireDate,
      salary: teacher.salary,
      photoUrl: teacher.photoUrl,
      isActive: teacher.isActive,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
      user: teacher.user as any,
      subjects: teacher.subjects.map(ts => ts.subject) as any,
    };

    return NextResponse.json<ApiResponse<TeacherDTO>>({
      success: true,
      data: teacherDTO,
    });
  } catch (error) {
    console.error('Get teacher error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/teachers/[id]
 * Update a teacher
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

    const body: UpdateTeacherDTO = await request.json();

    // Check if teacher exists
    const existingTeacher = await db.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingTeacher) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Teacher not found',
      }, { status: 404 });
    }

    // Update teacher and subjects
    const updatedTeacher = await db.$transaction(async (tx) => {
      // Update user if name is provided
      if (body.name) {
        await tx.user.update({
          where: { id: existingTeacher.userId },
          data: { name: body.name },
        });
      }

      // Update teacher
      const teacher = await tx.teacher.update({
        where: { id },
        data: {
          qualification: body.qualification,
          specialization: body.specialization,
          phone: body.phone,
          address: body.address,
          salary: body.salary,
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
          subjects: {
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  description: true,
                  credits: true,
                  color: true,
                  isActive: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      });

      // Update subjects if subjectIds is provided
      if (body.subjectIds !== undefined) {
        // Delete existing subject assignments
        await tx.teacherSubject.deleteMany({
          where: { teacherId: id },
        });

        // Create new subject assignments
        if (body.subjectIds.length > 0) {
          for (const subjectId of body.subjectIds) {
            await tx.teacherSubject.create({
              data: {
                teacherId: id,
                subjectId,
              },
            });
          }
        }
      }

      return teacher;
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'UPDATE',
        entity: 'Teacher',
        entityId: id,
        details: `Updated teacher: ${existingTeacher.user.name}`,
        ipAddress: getClientIP(request),
      },
    });

    const teacherDTO: TeacherDTO = {
      id: updatedTeacher.id,
      userId: updatedTeacher.userId,
      teacherNumber: updatedTeacher.teacherNumber,
      qualification: updatedTeacher.qualification,
      specialization: updatedTeacher.specialization,
      phone: updatedTeacher.phone,
      address: updatedTeacher.address,
      hireDate: updatedTeacher.hireDate,
      salary: updatedTeacher.salary,
      photoUrl: updatedTeacher.photoUrl,
      isActive: updatedTeacher.isActive,
      createdAt: updatedTeacher.createdAt,
      updatedAt: updatedTeacher.updatedAt,
      user: updatedTeacher.user as any,
      subjects: updatedTeacher.subjects.map(ts => ts.subject) as any,
    };

    return NextResponse.json<ApiResponse<TeacherDTO>>({
      success: true,
      data: teacherDTO,
      message: 'Teacher updated successfully',
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/teachers/[id]
 * Delete a teacher
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

    // Check if teacher exists
    const teacher = await db.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!teacher) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Teacher not found',
      }, { status: 404 });
    }

    // Delete teacher and user in transaction
    await db.$transaction(async (tx) => {
      await tx.teacher.delete({ where: { id } });
      await tx.user.delete({ where: { id: teacher.userId } });
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'DELETE',
        entity: 'Teacher',
        entityId: id,
        details: `Deleted teacher: ${teacher.user.name} (${teacher.teacherNumber})`,
        ipAddress: getClientIP(request),
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Teacher deleted successfully',
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}