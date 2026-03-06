import { NextResponse } from 'next/server';

/**
 * Centralized API error/response helpers for structured JSON error handling.
 * All API routes should use these instead of raw NextResponse.json({ error }).
 */

export function userError(message, status = 400) {
  return NextResponse.json(
    { success: false, errorType: 'USER_ERROR', message, where: 'client_input' },
    { status }
  );
}

export function authError(message = 'Invalid or expired credentials', status = 401) {
  return NextResponse.json(
    { success: false, errorType: 'AUTH_ERROR', message, where: 'client_input' },
    { status }
  );
}

export function notFoundError(message = 'Resource not found') {
  return NextResponse.json(
    { success: false, errorType: 'USER_ERROR', message, where: 'client_input' },
    { status: 404 }
  );
}

export function serverError(error, context = '') {
  if (context) console.error(`${context}:`, error);
  return NextResponse.json(
    { success: false, errorType: 'SERVER_ERROR', message: 'Something went wrong. Please try again later.', where: 'server' },
    { status: 500 }
  );
}

/**
 * Extracts and verifies JWT from Authorization header.
 * Returns { decoded, errorResponse } — check errorResponse first.
 */
export function extractAuth(request, verifyToken) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return { decoded: null, errorResponse: authError('Authentication required') };
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return { decoded: null, errorResponse: authError('Invalid or expired token') };
  }
  return { decoded, errorResponse: null };
}
