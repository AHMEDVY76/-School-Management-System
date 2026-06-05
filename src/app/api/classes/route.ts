import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP, hasRole } from '@/lib/middleware';
import { CreateClassDTO, ClassDTO, ApiResponse, PaginatedResponse } from '@/types';

/**
 * GET /api/classes
 * Get all classes with pagination and filters
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
    const gradeLevel = searchParams.get('gradeLevel');
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { section: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (gradeLevel) {
      where.gradeLevel = parseInt(gradeLevel);
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Get classes with pagination
    const [classes, total] = await Promise.all([
      db.class.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              students: true,
            },
          },
        },
        orderBy: { gradeLevel: 'asc' },
      }),
      db.class.count({ where }),
    ]);

    const classDTOs: ClassDTO[] = classes.map(cls => ({
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
    }));

    const response: PaginatedResponse<ClassDTO> = {
      data: classDTOs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<ClassDTO>>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Get classes error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * POST /api/classes
 * Create a new class
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

    const body: CreateClassDTO = await request.json();
    const { name, gradeLevel, section, description, capacity } = body;

    // Validate required fields
    if (!name || !gradeLevel) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Name and grade level are required',
      }, { status: 400 });
    }

    // Check if class already exists with same gradeLevel and section
    const existingClass = await db.class.findFirst({
      where: {
        gradeLevel,
        section: section || null,
      },
    });

    if (existingClass) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Class already exists with this grade level and section',
      }, { status: 400 });
    }

    // Create class
    const newClass = await db.$transaction(async (tx) => {
      const cls = await tx.class.create({
        data: {
          name,
          gradeLevel,
          section,
          description,
          capacity,
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
          action: 'CREATE',
          entity: 'Class',
          entityId: cls.id,
          details: `Created class: ${name}`,
          ipAddress: getClientIP(request),
        },
      });

      return cls;
    });

    const classDTO: ClassDTO = {
      id: newClass.id,
      name: newClass.name,
      gradeLevel: newClass.gradeLevel,
      section: newClass.section,
      description: newClass.description,
      capacity: newClass.capacity,
      isActive: newClass.isActive,
      createdAt: newClass.createdAt,
      updatedAt: newClass.updatedAt,
      _count: {
        students: newClass._count.students,
      },
    };

    return NextResponse.json<ApiResponse<ClassDTO>>({
      success: true,
      data: classDTO,
      message: 'Class created successfully',
    });
  } catch (error) {
    console.error('Create class error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}