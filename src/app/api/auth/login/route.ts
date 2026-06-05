import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuthService, getClientIP } from '@/lib/auth';
import { LoginDTO, AuthResponse, ApiResponse, UserDTO } from '@/types';

/**
 * POST /api/auth/login
 * Login user
 */
export async function POST(request: NextRequest) {
  try {
    const body: LoginDTO = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Email and password are required',
      }, { status: 400 });
    }

    // Find user
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid credentials',
      }, { status: 401 });
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Account is inactive',
      }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await AuthService.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid credentials',
      }, { status: 401 });
    }

    // Generate tokens
    const tokens = AuthService.generateTokens(user.id, user.email, user.role);

    // Create refresh token record
    await db.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ipAddress: getClientIP(request),
        details: 'User logged in',
      },
    });

    const userDTO: UserDTO = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const authResponse: AuthResponse = {
      user: userDTO,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

    return NextResponse.json<ApiResponse<AuthResponse>>({
      success: true,
      data: authResponse,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}