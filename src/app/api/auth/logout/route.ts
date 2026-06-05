import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, getClientIP } from '@/lib/middleware';
import { ApiResponse } from '@/types';

/**
 * POST /api/auth/logout
 * Logout user
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const body = await request.json();
    const { refreshToken } = body;

    // Delete refresh token if provided
    if (refreshToken) {
      await db.refreshToken.deleteMany({
        where: {
          token: refreshToken,
          userId: currentUser.userId,
        },
      });
    }

    // Delete all refresh tokens for this user
    await db.refreshToken.deleteMany({
      where: { userId: currentUser.userId },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: currentUser.userId,
        ipAddress: getClientIP(request),
        details: 'User logged out',
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}