import { NextRequest } from 'next/server';
import { AuthService, TokenPayload } from './auth';

/**
 * Get current user from request
 */
export async function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = AuthService.extractTokenFromHeader(authHeader);

  if (!token) {
    return null;
  }

  try {
    const payload = AuthService.verifyAccessToken(token);
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: TokenPayload, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * Get IP address from request
 */
export function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIP || null;
}