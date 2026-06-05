import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { RegisterDTO, LoginDTO, AuthResponse, ApiResponse, UserDTO } from '@/types';

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
  try {
    const body: RegisterDTO = await request.json();
    const { email, password, name, role } = body;

    // Validate input
    if (!email || !password || !name || !role) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'All fields are required',
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User already exists',
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await AuthService.hashPassword(password);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

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
        action: 'REGISTER',
        entity: 'User',
        entityId: user.id,
        details: `New user registered with role: ${role}`,
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
      message: 'User registered successfully',
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}