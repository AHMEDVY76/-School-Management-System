import { useAuthStore } from '@/stores/authStore';
import { ApiResponse } from '@/types';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const authStore = useAuthStore.getState();
  
  // Get token and add to headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authStore.accessToken) {
    headers['Authorization'] = `Bearer ${authStore.accessToken}`;
  }

  // Make request
  let response = await fetch(endpoint, {
    ...options,
    headers,
  });

  // If 401, try to refresh token
  if (response.status === 401 && authStore.refreshToken) {
    const refreshed = await authStore.refreshTokens();
    
    if (refreshed) {
      // Retry request with new token
      const newHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      newHeaders['Authorization'] = `Bearer ${authStore.accessToken}`;
      
      response = await fetch(endpoint, {
        ...options,
        headers: newHeaders,
      });
    } else {
      // Refresh failed, logout
      await authStore.logout();
      return {
        success: false,
        error: 'Session expired. Please login again.',
      };
    }
  }

  const result: ApiResponse<T> = await response.json();
  return result;
}