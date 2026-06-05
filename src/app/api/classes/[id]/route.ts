import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { UpdateClassDTO, ClassDTO, ApiResponse } from '@/types';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/classes/[id]
 * Get a single class by ID
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

    const cls = await db.class.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!cls) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Class not found',
      }, { status: 404 });
    }

    // Students can view their own class, teachers and admins can view any
    const isAuthorized = hasRole(currentUser, ['ADMIN', 'TEACHER']);
    if (!isAuthorized) {
      // Check if student is in this class
      const student = await db.student.findUnique({
        where: { userId: currentUser.userId },
      });
      if (student?.classId !== id) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Unauthorized',
        }, { status: 403 });
      }
    }

    const classDTO: ClassDTO = {
      id: cls.id,
      name: cls.name,
      gradeLevel: cls.gradeLevel,
      section: cls.section,
      description: cls.description,
      capacity: cls.capacity,
      isActive: cls.isActive,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
      _count: {
        students: cls._count.students,
      },
    };

    return NextResponse.json<ApiResponse<ClassDTO>>({
      success: true,
      data: classDTO,
    });
  } catch (error) {
    console.error('Get class error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/classes/[id]
 * Update a class
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

    const body: UpdateClassDTO = await request.json();

    // Check if class exists
    const existingClass = await db.class.findUnique({
      where: { id },
    });

    if (!existingClass) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Class not found',
      }, { status: 404 });
    }

    // Check if new gradeLevel and section combination already exists
    if (body.gradeLevel !== undefined || body.section !== undefined) {
      const newGradeLevel = body.gradeLevel ?? existingClass.gradeLevel;
      const newSection = body.section ?? existingClass.section;

      const duplicateClass = await db.class.findFirst({
        where: {
          gradeLevel: newGradeLevel,
          section: newSection || null,
          id: { not: id },
        },
      });

      if (duplicateClass) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Class already exists with this grade level and section',
        }, { status: 400 });
      }
    }

    // Update class
    const updatedClass = await db.$transaction(async (tx) => {
      const cls = await tx.class.update({
        where: { id },
        data: {
          name: body.name,
          gradeLevel: body.gradeLevel,
          section: body.section,
          description: body.description,
          capacity: body.capacity,
          isActive: body.isActive,
        },
        include: {
          _count: {
            select: {
              students: true,
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'UPDATE',
          entity: 'Class',
          entityId: id,
          details: `Updated class: ${cls.name}`,
          ipAddress: getClientIP(request),
        },
      });

      return cls;
    });

    const classDTO: ClassDTO = {
      id: updatedClass.id,
      name: updatedClass.name,
      gradeLevel: updatedClass.gradeLevel,
      section: updatedClass.section,
      description: updatedClass.description,
      capacity: updatedClass.capacity,
      isActive: updatedClass.isActive,
      createdAt: updatedClass.createdAt,
      updatedAt: updatedClass.updatedAt,
      _count: {
        students: updatedClass._count.students,
      },
    };

    return NextResponse.json<ApiResponse<ClassDTO>>({
      success: true,
      data: classDTO,
      message: 'Class updated successfully',
    });
  } catch (error) {
    console.error('Update class error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/classes/[id]
 * Delete a class
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

    // Check if class exists
    const cls = await db.class.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!cls) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Class not found',
      }, { status: 404 });
    }

    // Check if class has students
    if (cls._count.students > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cannot delete class with enrolled students. Please reassign or remove students first.',
      }, { status: 400 });
    }

    // Delete class
    await db.$transaction(async (tx) => {
      await tx.class.delete({ where: { id } });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'DELETE',
          entity: 'Class',
          entityId: id,
          details: `Deleted class: ${cls.name}`,
          ipAddress: getClientIP(request),
        },
      });
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Class deleted successfully',
    });
  } catch (error) {
    console.error('Delete class error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}