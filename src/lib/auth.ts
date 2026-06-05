import jwt from 'jsonwebtoken';
import { UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

export class AuthService {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: Omit<TokenPayload, 'type'>): string {
    return jwt.sign(
      { ...payload, type: 'access' },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
    return jwt.sign(
      { ...payload, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokens(userId: string, email: string, role: UserRole) {
    const accessToken = this.generateAccessToken({ userId, email, role });
    const refreshToken = this.generateRefreshToken({ userId, email, role });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    };
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verify password
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, hash);
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
  }
}