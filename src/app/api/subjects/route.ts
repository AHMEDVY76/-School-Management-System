import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { CreateSubjectDTO, SubjectDTO, ApiResponse, PaginatedResponse } from '@/types';

/**
 * GET /api/subjects
 * Get all subjects with pagination and filters
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
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Get subjects with pagination
    const [subjects, total] = await Promise.all([
      db.subject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      db.subject.count({ where }),
    ]);

    const subjectDTOs: SubjectDTO[] = subjects.map(subject => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description,
      credits: subject.credits,
      color: subject.color,
      isActive: subject.isActive,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    }));

    const response: PaginatedResponse<SubjectDTO> = {
      data: subjectDTOs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<SubjectDTO>>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * POST /api/subjects
 * Create a new subject
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user and check authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || !hasRole(currentUser, ['ADMIN'])) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const body: CreateSubjectDTO = await request.json();
    const { name, code, description, credits, color } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Name and code are required',
      }, { status: 400 });
    }

    // Check if subject name already exists
    const existingSubjectByName = await db.subject.findUnique({ where: { name } });
    if (existingSubjectByName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Subject name already exists',
      }, { status: 400 });
    }

    // Check if subject code already exists
    const existingSubjectByCode = await db.subject.findUnique({ where: { code } });
    if (existingSubjectByCode) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Subject code already exists',
      }, { status: 400 });
    }

    // Create subject
    const newSubject = await db.$transaction(async (tx) => {
      const subject = await tx.subject.create({
        data: {
          name,
          code,
          description,
          credits: credits || 1,
          color,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'CREATE',
          entity: 'Subject',
          entityId: subject.id,
          details: `Created subject: ${name} (${code})`,
          ipAddress: getClientIP(request),
        },
      });

      return subject;
    });

    const subjectDTO: SubjectDTO = {
      id: newSubject.id,
      name: newSubject.name,
      code: newSubject.code,
      description: newSubject.description,
      credits: newSubject.credits,
      color: newSubject.color,
      isActive: newSubject.isActive,
      createdAt: newSubject.createdAt,
      updatedAt: newSubject.updatedAt,
    };

    return NextResponse.json<ApiResponse<SubjectDTO>>({
      success: true,
      data: subjectDTO,
      message: 'Subject created successfully',
    });
  } catch (error) {
    console.error('Create subject error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}