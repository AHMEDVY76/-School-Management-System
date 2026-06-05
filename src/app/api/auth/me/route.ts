import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { db } from '@/lib/db';
import { ApiResponse, UserDTO } from '@/types';

/**
 * GET /api/auth/me
 * Get current user info
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    const userDTO: UserDTO = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return NextResponse.json<ApiResponse<UserDTO>>({
      success: true,
      data: userDTO,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}