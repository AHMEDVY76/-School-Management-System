import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { UpdateSubjectDTO, SubjectDTO, ApiResponse } from '@/types';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/subjects/[id]
 * Get a single subject by ID with teachers count
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

    const subject = await db.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teachers: true,
          },
        },
      },
    });

    if (!subject) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Subject not found',
      }, { status: 404 });
    }

    const subjectDTO: SubjectDTO = {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description,
      credits: subject.credits,
      color: subject.color,
      isActive: subject.isActive,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    };

    return NextResponse.json<ApiResponse<SubjectDTO>>({
      success: true,
      data: subjectDTO,
    });
  } catch (error) {
    console.error('Get subject error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/subjects/[id]
 * Update a subject
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

    const body: UpdateSubjectDTO = await request.json();

    // Check if subject exists
    const existingSubject = await db.subject.findUnique({
      where: { id },
    });

    if (!existingSubject) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Subject not found',
      }, { status: 404 });
    }

    // Check if new name already exists (if updating name)
    if (body.name && body.name !== existingSubject.name) {
      const duplicateName = await db.subject.findUnique({
        where: { name: body.name },
      });
      if (duplicateName) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Subject name already exists',
        }, { status: 400 });
      }
    }

    // Check if new code already exists (if updating code)
    if (body.code && body.code !== existingSubject.code) {
      const duplicateCode = await db.subject.findUnique({
        where: { code: body.code },
      });
      if (duplicateCode) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Subject code already exists',
        }, { status: 400 });
      }
    }

    // Update subject
    const updatedSubject = await db.$transaction(async (tx) => {
      const subject = await tx.subject.update({
        where: { id },
        data: {
          name: body.name,
          code: body.code,
          description: body.description,
          credits: body.credits,
          color: body.color,
          isActive: body.isActive,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'UPDATE',
          entity: 'Subject',
          entityId: id,
          details: `Updated subject: ${subject.name}`,
          ipAddress: getClientIP(request),
        },
      });

      return subject;
    });

    const subjectDTO: SubjectDTO = {
      id: updatedSubject.id,
      name: updatedSubject.name,
      code: updatedSubject.code,
      description: updatedSubject.description,
      credits: updatedSubject.credits,
      color: updatedSubject.color,
      isActive: updatedSubject.isActive,
      createdAt: updatedSubject.createdAt,
      updatedAt: updatedSubject.updatedAt,
    };

    return NextResponse.json<ApiResponse<SubjectDTO>>({
      success: true,
      data: subjectDTO,
      message: 'Subject updated successfully',
    });
  } catch (error) {
    console.error('Update subject error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/subjects/[id]
 * Delete a subject
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

    // Check if subject exists
    const subject = await db.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teachers: true,
          },
        },
      },
    });

    if (!subject) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Subject not found',
      }, { status: 404 });
    }

    // Check if subject has teachers assigned
    if (subject._count.teachers > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cannot delete subject with assigned teachers. Please reassign teachers first.',
      }, { status: 400 });
    }

    // Delete subject
    await db.$transaction(async (tx) => {
      await tx.subject.delete({ where: { id } });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'DELETE',
          entity: 'Subject',
          entityId: id,
          details: `Deleted subject: ${subject.name} (${subject.code})`,
          ipAddress: getClientIP(request),
        },
      });
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Subject deleted successfully',
    });
  } catch (error) {
    console.error('Delete subject error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}