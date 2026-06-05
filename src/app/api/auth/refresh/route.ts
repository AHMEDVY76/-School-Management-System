import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { AuthResponse, ApiResponse, UserDTO } from '@/types';

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    // Validate input
    if (!refreshToken) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Refresh token is required',
      }, { status: 400 });
    }

    // Verify refresh token
    let payload;
    try {
      payload = AuthService.verifyRefreshToken(refreshToken);
    } catch (error) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid or expired refresh token',
      }, { status: 401 });
    }

    // Check if refresh token exists in database
    const tokenRecord = await db.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Refresh token not found',
      }, { status: 401 });
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      await db.refreshToken.delete({ where: { token: refreshToken } });
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Refresh token expired',
      }, { status: 401 });
    }

    // Check if user is still active
    if (!tokenRecord.user.isActive) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Account is inactive',
      }, { status: 401 });
    }

    // Generate new tokens
    const tokens = AuthService.generateTokens(
      tokenRecord.userId,
      tokenRecord.user.email,
      tokenRecord.user.role as any
    );

    // Delete old refresh token and create new one
    await db.refreshToken.delete({ where: { token: refreshToken } });
    await db.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: tokenRecord.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const userDTO: UserDTO = {
      id: tokenRecord.user.id,
      email: tokenRecord.user.email,
      name: tokenRecord.user.name,
      role: tokenRecord.user.role as any,
      isActive: tokenRecord.user.isActive,
      createdAt: tokenRecord.user.createdAt,
      updatedAt: tokenRecord.user.updatedAt,
    };

    const authResponse: AuthResponse = {
      user: userDTO,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

    return NextResponse.json<ApiResponse<AuthResponse>>({
      success: true,
      data: authResponse,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}